import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { executeQuery } from '../lib/database';
import { handleError, successResponse } from '../middleware/errorHandler';
import { handlePreflight } from '../lib/cors';
import { historicoPrecoSchema } from '../lib/utils';
import { HistoricoPreco } from '../lib/types';

async function historicoHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin') || undefined;

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return handlePreflight(origin);
  }

  try {
    const method = request.method;
    const itemId = request.params.itemId;

    if (!itemId) {
      return successResponse({ error: 'Item ID é obrigatório' }, 400, origin);
    }

    // GET /api/itens/{itemId}/historico-precos - Get price history for item
    if (method === 'GET') {
      const query = `
        SELECT * FROM historico_precos
        WHERE item_id = @itemId
        ORDER BY data_registro DESC
      `;

      const result = await executeQuery<HistoricoPreco>(query, { itemId });
      return successResponse(result.recordset, 200, origin);
    }

    // POST /api/itens/{itemId}/historico-precos - Add price history entry
    if (method === 'POST') {
      const body = await request.json() as any;
      const validated = historicoPrecoSchema.parse({
        ...body,
        item_id: parseInt(itemId),
      });

      const query = `
        INSERT INTO historico_precos (
          item_id, valor, tipo_valor, fonte, data_registro, observacoes
        )
        OUTPUT INSERTED.*
        VALUES (
          @item_id, @valor, @tipo_valor, @fonte, @data_registro, @observacoes
        )
      `;

      const result = await executeQuery<HistoricoPreco>(query, {
        ...validated,
        data_registro: validated.data_registro || new Date().toISOString().split('T')[0],
      });

      return successResponse(result.recordset[0], 201, origin);
    }

    return successResponse({ error: 'Método não permitido' }, 405, origin);
  } catch (error) {
    return handleError(error, context, origin);
  }
}

app.http('historico-precos', {
  methods: ['GET', 'POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'itens/{itemId}/historico-precos',
  handler: historicoHandler,
});
