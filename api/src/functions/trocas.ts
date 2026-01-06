import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { executeQuery } from '../lib/database';
import { handleError, successResponse } from '../middleware/errorHandler';
import { handlePreflight } from '../lib/cors';
import { trocaSchema, safeParseJson, clampPagination } from '../lib/utils';
import { Troca } from '../lib/types';

async function trocasHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin') || undefined;

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return handlePreflight(origin);
  }

  try {
    const method = request.method;
    const id = request.params.id;
    const action = request.params.action; // For /api/trocas/{id}/cancelar

    // POST /api/trocas/{id}/cancelar - Cancel a trade
    if (method === 'POST' && id && action === 'cancelar') {
      // Get the trade
      const getQuery = 'SELECT * FROM trocas WHERE id = @id';
      const getResult = await executeQuery<Troca>(getQuery, { id });

      if (getResult.recordset.length === 0) {
        return successResponse({ error: 'Troca não encontrada' }, 404, origin);
      }

      const trade = getResult.recordset[0];

      if (trade.status === 'cancelada') {
        return successResponse({ error: 'Troca já está cancelada' }, 400, origin);
      }

      // Cancel the trade
      const cancelQuery = `
        UPDATE trocas
        SET status = 'cancelada', cancelada_em = GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @id
      `;
      const cancelResult = await executeQuery<Troca>(cancelQuery, { id });

      // Revert item statuses
      // item_dado_id: restore to disponivel (since it was given away)
      await executeQuery(`
        UPDATE itens
        SET situacao = 'disponivel',
            destino = NULL,
            data_saida = NULL
        WHERE id = @id
      `, { id: trade.item_dado_id });

      // item_recebido_id: mark as trocado/indisponivel (since it was received but trade is now canceled)
      // Note: Business logic may vary here - keeping it simple by marking as disponivel
      await executeQuery(`
        UPDATE itens
        SET situacao = 'disponivel',
            destino = NULL
        WHERE id = @id
      `, { id: trade.item_recebido_id });

      return successResponse({
        ...cancelResult.recordset[0],
        message: 'Troca cancelada com sucesso',
      }, 200, origin);
    }

    // GET /api/trocas - List all trades
    if (method === 'GET' && !id) {
      const rawPage = parseInt(request.query.get('page') || '1');
      const rawPerPage = parseInt(request.query.get('perPage') || '30');
      const { page, perPage } = clampPagination(rawPage, rawPerPage);
      const status = request.query.get('status');
      const offset = (page - 1) * perPage;

      let whereClause = 'WHERE 1=1';
      const params: Record<string, any> = {};

      if (status) {
        whereClause += ' AND t.status = @status';
        params.status = status;
      }

      const countQuery = `SELECT COUNT(*) as total FROM trocas t ${whereClause}`;
      const countResult = await executeQuery<{ total: number }>(countQuery, params);
      const total = countResult.recordset[0].total;

      const query = `
        SELECT t.*, 
          id.nome as item_dado_nome,
          ir.nome as item_recebido_nome
        FROM trocas t
        LEFT JOIN itens id ON t.item_dado_id = id.id
        LEFT JOIN itens ir ON t.item_recebido_id = ir.id
        ${whereClause}
        ORDER BY t.data_troca DESC
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
        return successResponse({ error: 'Troca não encontrada' }, 404, origin);
      }

      return successResponse(result.recordset[0], 200, origin);
    }

    // POST /api/trocas - Create new trade
    if (method === 'POST' && !action) {
      const body = await safeParseJson(request);
      const validated = trocaSchema.parse(body);

      const datatroca = validated.data_troca || new Date().toISOString().split('T')[0];

      // Update item_dado_id status
      await executeQuery(`
        UPDATE itens 
        SET situacao = 'trocado', 
            destino = 'troca', 
            data_saida = @data_saida 
        WHERE id = @id
      `, {
        id: validated.item_dado_id,
        data_saida: datatroca,
      });

      // Update item_recebido_id status
      await executeQuery(`
        UPDATE itens 
        SET situacao = 'disponivel', 
            destino = NULL, 
            data_saida = NULL,
            data_aquisicao = @data_aquisicao
        WHERE id = @id
      `, {
        id: validated.item_recebido_id,
        data_aquisicao: datatroca,
      });

      const query = `
        INSERT INTO trocas (
          item_dado_id, item_recebido_id, valor_adicional, quem_pagou,
          data_troca, observacoes, status
        )
        OUTPUT INSERTED.*
        VALUES (
          @item_dado_id, @item_recebido_id, @valor_adicional, @quem_pagou,
          @data_troca, @observacoes, 'ativa'
        )
      `;

      const result = await executeQuery<Troca>(query, {
        ...validated,
        data_troca: datatroca,
      });

      return successResponse(result.recordset[0], 201, origin);
    }

    // PUT /api/trocas/{id} - Update trade or cancel
    if (method === 'PUT' && id) {
      const body = await safeParseJson(request);
      const validated = trocaSchema.partial().parse(body);

      // If status is being set to 'cancelada', use cancel logic
      if (validated.status === 'cancelada') {
        const getQuery = 'SELECT * FROM trocas WHERE id = @id';
        const getResult = await executeQuery<Troca>(getQuery, { id });

        if (getResult.recordset.length === 0) {
          return successResponse({ error: 'Troca não encontrada' }, 404, origin);
        }

        const trade = getResult.recordset[0];

        // Cancel the trade
        const cancelQuery = `
          UPDATE trocas
          SET status = 'cancelada', cancelada_em = GETDATE()
          OUTPUT INSERTED.*
          WHERE id = @id
        `;
        const cancelResult = await executeQuery<Troca>(cancelQuery, { id });

        // Revert item statuses
        await executeQuery(`
          UPDATE itens
          SET situacao = 'disponivel',
              destino = NULL,
              data_saida = NULL
          WHERE id = @id
        `, { id: trade.item_dado_id });

        await executeQuery(`
          UPDATE itens
          SET situacao = 'disponivel',
              destino = NULL
          WHERE id = @id
        `, { id: trade.item_recebido_id });

        return successResponse({
          ...cancelResult.recordset[0],
          message: 'Troca cancelada com sucesso',
        }, 200, origin);
      }

      // Regular update (non-cancel)
      const setClauses = Object.keys(validated)
        .map(key => `${key} = @${key}`)
        .join(', ');

      if (setClauses) {
        const query = `
          UPDATE trocas 
          SET ${setClauses}
          OUTPUT INSERTED.*
          WHERE id = @id
        `;

        const result = await executeQuery<Troca>(query, { ...validated, id });

        if (result.recordset.length === 0) {
          return successResponse({ error: 'Troca não encontrada' }, 404, origin);
        }

        return successResponse(result.recordset[0], 200, origin);
      }

      // No fields to update
      const getQuery = 'SELECT * FROM trocas WHERE id = @id';
      const getResult = await executeQuery<Troca>(getQuery, { id });
      
      if (getResult.recordset.length === 0) {
        return successResponse({ error: 'Troca não encontrada' }, 404, origin);
      }

      return successResponse(getResult.recordset[0], 200, origin);
    }

    // DELETE /api/trocas/{id} - Blocked, must use cancel
    if (method === 'DELETE' && id) {
      return successResponse({
        error: 'Operação não permitida',
        message: 'Não é possível excluir trocas. Use POST /api/trocas/{id}/cancelar para cancelar uma troca.',
      }, 409, origin);
    }

    return successResponse({ error: 'Método não permitido' }, 405, origin);
  } catch (error) {
    return handleError(error, context, origin);
  }
}

app.http('trocas', {
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'trocas/{id?}/{action?}',
  handler: trocasHandler,
});
