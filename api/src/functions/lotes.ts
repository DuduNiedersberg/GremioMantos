import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { executeQuery } from '../lib/database';
import { handleError, successResponse } from '../middleware/errorHandler';
import { handlePreflight } from '../lib/cors';
import { loteSchema, safeParseJson, clampPagination } from '../lib/utils';
import { Lote } from '../lib/types';

async function lotesHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin') || undefined;

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return handlePreflight(origin);
  }

  try {
    const method = request.method;
    const id = request.params.id;

    // GET /api/lotes - List all batches
    if (method === 'GET' && !id) {
      const rawPage = parseInt(request.query.get('page') || '1');
      const rawPerPage = parseInt(request.query.get('perPage') || '30');
      const { page, perPage } = clampPagination(rawPage, rawPerPage);
      const offset = (page - 1) * perPage;

      const countQuery = 'SELECT COUNT(*) as total FROM lotes';
      const countResult = await executeQuery<{ total: number }>(countQuery);
      const total = countResult.recordset[0].total;

      const query = `
        SELECT * FROM lotes
        ORDER BY data_compra DESC
        OFFSET ${offset} ROWS FETCH NEXT ${perPage} ROWS ONLY
      `;

      const result = await executeQuery<Lote>(query);

      return successResponse({
        data: result.recordset,
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      }, 200, origin);
    }

    // GET /api/lotes/{id} - Get single batch with items
    if (method === 'GET' && id) {
      const loteQuery = 'SELECT * FROM lotes WHERE id = @id';
      const loteResult = await executeQuery<Lote>(loteQuery, { id });

      if (loteResult.recordset.length === 0) {
        return successResponse({ error: 'Lote não encontrado' }, 404, origin);
      }

      const itensQuery = 'SELECT * FROM itens WHERE lote_id = @id';
      const itensResult = await executeQuery(itensQuery, { id });

      return successResponse({
        ...loteResult.recordset[0],
        itens: itensResult.recordset,
      }, 200, origin);
    }

    // POST /api/lotes - Create new batch
    if (method === 'POST') {
      const body = await safeParseJson(request);
      const validated = loteSchema.parse(body);

      const query = `
        INSERT INTO lotes (
          nome, descricao, data_compra, valor_total, fornecedor
        )
        OUTPUT INSERTED.*
        VALUES (
          @nome, @descricao, @data_compra, @valor_total, @fornecedor
        )
      `;

      const result = await executeQuery<Lote>(query, {
        ...validated,
        data_compra: validated.data_compra || new Date().toISOString().split('T')[0],
      });

      return successResponse(result.recordset[0], 201, origin);
    }

    // PUT /api/lotes/{id} - Update batch
    if (method === 'PUT' && id) {
      const body = await safeParseJson(request);
      const validated = loteSchema.partial().parse(body);

      const setClauses = Object.keys(validated)
        .map(key => `${key} = @${key}`)
        .join(', ');

      const query = `
        UPDATE lotes 
        SET ${setClauses}
        OUTPUT INSERTED.*
        WHERE id = @id
      `;

      const result = await executeQuery<Lote>(query, { ...validated, id });

      if (result.recordset.length === 0) {
        return successResponse({ error: 'Lote não encontrado' }, 404, origin);
      }

      return successResponse(result.recordset[0], 200, origin);
    }

    // DELETE /api/lotes/{id} - Delete batch
    if (method === 'DELETE' && id) {
      // First, unlink items from this batch
      await executeQuery('UPDATE itens SET lote_id = NULL WHERE lote_id = @id', { id });
      
      const query = 'DELETE FROM lotes WHERE id = @id';
      await executeQuery(query, { id });
      
      return successResponse({ message: 'Lote excluído com sucesso' }, 200, origin);
    }

    return successResponse({ error: 'Método não permitido' }, 405, origin);
  } catch (error) {
    return handleError(error, context, origin);
  }
}

app.http('lotes', {
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'lotes/{id?}',
  handler: lotesHandler,
});
