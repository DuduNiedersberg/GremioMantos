import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { executeQuery } from '../lib/database';
import { handleError, successResponse } from '../middleware/errorHandler';
import { handlePreflight } from '../lib/cors';
import { historicoPrecoSchema, safeParseJson } from '../lib/utils';
import { HistoricoPreco } from '../lib/types';
import { protectedRoute, JWTPayload } from '../middleware/auth';

async function historicoPrecosHandler(request: HttpRequest, context: InvocationContext, user: JWTPayload): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin') || undefined;

  try {
    const method = request.method;
    const itemId = request.params.itemId;

    if (!itemId) {
      return successResponse({ error: 'Item ID é obrigatório' }, 400, origin);
    }

    // GET /api/itens/{itemId}/historico-precos - Get price history for item
    if (method === 'GET') {
      let query: string;
      let params: any;

      if (user.tipo === 'platform_admin') {
        query = `
          SELECT hp.* FROM historico_precos hp
          WHERE hp.item_id = @itemId
          ORDER BY hp.data_registro DESC
        `;
        params = { itemId };
      } else {
        query = `
          SELECT hp.* FROM historico_precos hp
          INNER JOIN itens i ON hp.item_id = i.id
          WHERE hp.item_id = @itemId AND i.tenant_id = @tenantId
          ORDER BY hp.data_registro DESC
        `;
        params = { itemId, tenantId: user.tenantId };
      }

      const result = await executeQuery<HistoricoPreco>(query, params);
      return successResponse(result.recordset, 200, origin);
    }

    // POST /api/itens/{itemId}/historico-precos - Add price history entry
    if (method === 'POST') {
      const body = await safeParseJson(request) as any;
      const validated = historicoPrecoSchema.parse({
        ...body,
        item_id: parseInt(itemId),
      });

      const tenantId = user.tipo === 'platform_admin' && validated.tenant_id ? validated.tenant_id : user.tenantId;

      const query = `
        INSERT INTO historico_precos (
          item_id, valor, tipo_valor, fonte, data_registro, observacoes, tenant_id
        )
        OUTPUT INSERTED.*
        VALUES (
          @item_id, @valor, @tipo_valor, @fonte, @data_registro, @observacoes, @tenant_id
        )
      `;

      const result = await executeQuery<HistoricoPreco>(query, {
        ...validated,
        data_registro: validated.data_registro || new Date().toISOString().split('T')[0],
        tenant_id: tenantId,
      });

      return successResponse(result.recordset[0], 201, origin);
    }

    return successResponse({ error: 'Método não permitido' }, 405, origin);
  } catch (error) {
    return handleError(error, context, origin);
  }
}

async function historicoPrecosHandlerWrapper(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin') || undefined;

  if (request.method === 'OPTIONS') {
    return handlePreflight(origin);
  }

  return protectedRoute(historicoPrecosHandler)(request, context);
}

app.http('historico-precos', {
  methods: ['GET', 'POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'itens/{itemId}/historico-precos',
  handler: historicoPrecosHandlerWrapper,
});
