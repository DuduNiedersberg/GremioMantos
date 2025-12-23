import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { executeQuery } from '../lib/database';
import { handleError, successResponse } from '../middleware/errorHandler';
import { trocaSchema } from '../lib/utils';
import { Troca } from '../lib/types';

async function trocasHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const method = request.method;
    const id = request.params.id;

    // GET /api/trocas - List all trades
    if (method === 'GET' && !id) {
      const page = parseInt(request.query.get('page') || '1');
      const perPage = parseInt(request.query.get('perPage') || '30');
      const offset = (page - 1) * perPage;

      const countQuery = 'SELECT COUNT(*) as total FROM trocas';
      const countResult = await executeQuery<{ total: number }>(countQuery);
      const total = countResult.recordset[0].total;

      const query = `
        SELECT t.*, 
          id.nome as item_dado_nome,
          ir.nome as item_recebido_nome
        FROM trocas t
        LEFT JOIN itens id ON t.item_dado_id = id.id
        LEFT JOIN itens ir ON t.item_recebido_id = ir.id
        ORDER BY t.data_troca DESC
        OFFSET ${offset} ROWS FETCH NEXT ${perPage} ROWS ONLY
      `;

      const result = await executeQuery(query);

      return successResponse({
        data: result.recordset,
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      });
    }

    // GET /api/trocas/{id} - Get single trade
    if (method === 'GET' && id) {
      const query = `
        SELECT t.*, 
          id.nome as item_dado_nome,
          ir.nome as item_recebido_nome
        FROM trocas t
        LEFT JOIN itens id ON t.item_dado_id = id.id
        LEFT JOIN itens ir ON t.item_recebido_id = ir.id
        WHERE t.id = @id
      `;
      const result = await executeQuery(query, { id });

      if (result.recordset.length === 0) {
        return successResponse({ error: 'Troca não encontrada' }, 404);
      }

      return successResponse(result.recordset[0]);
    }

    // POST /api/trocas - Create new trade
    if (method === 'POST') {
      const body = await request.json();
      const validated = trocaSchema.parse(body);

      // Update item statuses
      await executeQuery('UPDATE itens SET situacao = @situacao WHERE id = @id', {
        situacao: 'trocado',
        id: validated.item_dado_id,
      });

      const query = `
        INSERT INTO trocas (
          item_dado_id, item_recebido_id, valor_item_dado, valor_item_recebido,
          data_troca, observacoes
        )
        OUTPUT INSERTED.*
        VALUES (
          @item_dado_id, @item_recebido_id, @valor_item_dado, @valor_item_recebido,
          @data_troca, @observacoes
        )
      `;

      const result = await executeQuery<Troca>(query, {
        ...validated,
        data_troca: validated.data_troca || new Date().toISOString().split('T')[0],
      });

      return successResponse(result.recordset[0], 201);
    }

    return successResponse({ error: 'Método não permitido' }, 405);
  } catch (error) {
    return handleError(error, context);
  }
}

app.http('trocas', {
  methods: ['GET', 'POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'trocas/{id?}',
  handler: trocasHandler,
});
