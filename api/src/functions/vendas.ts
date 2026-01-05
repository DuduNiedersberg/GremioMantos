import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { executeQuery } from '../lib/database';
import { handleError, successResponse } from '../middleware/errorHandler';
import { handlePreflight } from '../lib/cors';
import { clampPagination } from '../lib/utils';

async function vendasHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin') || undefined;

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return handlePreflight(origin);
  }

  try {
    const method = request.method;
    const id = request.params.id;

    // GET /api/vendas - List all sales from view
    if (method === 'GET' && !id) {
      const rawPage = parseInt(request.query.get('page') || '1');
      const rawPerPage = parseInt(request.query.get('perPage') || '30');
      const { page, perPage } = clampPagination(rawPage, rawPerPage);
      const search = request.query.get('search');
      const offset = (page - 1) * perPage;

      let whereClause = 'WHERE 1=1';
      const params: Record<string, any> = {};

      if (search) {
        whereClause += ' AND (nome LIKE @search OR jogador LIKE @search OR marca LIKE @search OR cliente_nome LIKE @search)';
        params.search = `%${search}%`;
      }

      const countQuery = `SELECT COUNT(*) as total FROM dbo.vw_historico_vendas ${whereClause}`;
      const countResult = await executeQuery<{ total: number }>(countQuery, params);
      const total = countResult.recordset[0].total;

      const query = `
        SELECT 
          id, nome, ano, tipo, marca, jogador, 
          valor_compra, valor_venda, lucro_calculado, 
          data_saida, destino, cliente_id, cliente_nome
        FROM dbo.vw_historico_vendas
        ${whereClause}
        ORDER BY data_saida DESC
        OFFSET ${offset} ROWS FETCH NEXT ${perPage} ROWS ONLY
      `;

      const result = await executeQuery(query, params);

      return successResponse({
        data: result.recordset,
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      }, 200, origin);
    }

    // GET /api/vendas/{id} - Get single sale from view
    if (method === 'GET' && id) {
      const query = `
        SELECT 
          id, nome, ano, tipo, marca, jogador, 
          valor_compra, valor_venda, lucro_calculado, 
          data_saida, destino, cliente_id, cliente_nome
        FROM dbo.vw_historico_vendas
        WHERE id = @id
      `;
      const result = await executeQuery(query, { id });

      if (result.recordset.length === 0) {
        return successResponse({ error: 'Venda não encontrada' }, 404, origin);
      }

      return successResponse(result.recordset[0], 200, origin);
    }

    // POST /api/vendas - Not implemented (no vendas table in production)
    if (method === 'POST') {
      return successResponse({
        error: 'Not Implemented',
        message: 'Creating sales via this endpoint is not supported. Sales are tracked through the itens table (situacao=vendido).',
      }, 501, origin);
    }

    // PUT /api/vendas/{id} - Not implemented
    if (method === 'PUT' && id) {
      return successResponse({
        error: 'Not Implemented',
        message: 'Updating sales via this endpoint is not supported. Modify the corresponding item in the itens table.',
      }, 501, origin);
    }

    // DELETE /api/vendas/{id} - Not implemented
    if (method === 'DELETE' && id) {
      return successResponse({
        error: 'Not Implemented',
        message: 'Deleting sales via this endpoint is not supported. Modify the corresponding item in the itens table.',
      }, 501, origin);
    }

    return successResponse({ error: 'Método não permitido' }, 405, origin);
  } catch (error) {
    return handleError(error, context, origin);
  }
}

app.http('vendas', {
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'vendas/{id?}',
  handler: vendasHandler,
});
