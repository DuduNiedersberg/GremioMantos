import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { executeQuery } from '../lib/database';
import { handleError, successResponse } from '../middleware/errorHandler';
import { handlePreflight } from '../lib/cors';
import { trocaSchema, trocaUpdateSchema, safeParseJson, clampPagination } from '../lib/utils';
import { Troca } from '../lib/types';
import { protectedRoute, JWTPayload } from '../middleware/auth';

async function trocasHandler(request: HttpRequest, context: InvocationContext, user: JWTPayload): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin') || undefined;

  try {
    const method = request.method;
    const id = request.params.id;
    const action = request.params.action; // For /api/trocas/{id}/cancelar

    // POST /api/trocas/{id}/cancelar - Cancel a trade
    if (method === 'POST' && id && action === 'cancelar') {
      // Get the trade
      const getQuery = user.tipo === 'platform_admin' 
        ? 'SELECT * FROM trocas WHERE id = @id'
        : 'SELECT * FROM trocas WHERE id = @id AND tenant_id = @tenant_id';
      const getParams = user.tipo === 'platform_admin' ? { id } : { id, tenant_id: user.tenantId };
      const getResult = await executeQuery<Troca>(getQuery, getParams);

      if (getResult.recordset.length === 0) {
        return successResponse({ error: 'Troca não encontrada' }, 404, origin);
      }

      const trade = getResult.recordset[0];

      if (trade.status === 'cancelada') {
        return successResponse({ error: 'Troca já está cancelada' }, 400, origin);
      }

      // Cancel the trade
      const cancelQuery = user.tipo === 'platform_admin'
        ? `UPDATE trocas
           SET status = 'cancelada', cancelada_em = GETDATE()
           OUTPUT INSERTED.*
           WHERE id = @id`
        : `UPDATE trocas
           SET status = 'cancelada', cancelada_em = GETDATE()
           OUTPUT INSERTED.*
           WHERE id = @id AND tenant_id = @tenant_id`;
      const cancelParams = user.tipo === 'platform_admin' ? { id } : { id, tenant_id: user.tenantId };
      const cancelResult = await executeQuery<Troca>(cancelQuery, cancelParams);

      // Revert item statuses to consistent state
      // For canceled trades, both items should return to 'estoque' state
      // item_dado_id: Was given away, restore to estoque
      await executeQuery(`
        UPDATE itens
        SET situacao = 'estoque',
            destino = NULL,
            data_saida = NULL
        WHERE id = @id
      `, { id: trade.item_dado_id });

      // item_recebido_id: Was received, restore to estoque
      await executeQuery(`
        UPDATE itens
        SET situacao = 'estoque',
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

      if (user.tipo !== 'platform_admin') {
        whereClause += ' AND t.tenant_id = @tenant_id';
        params.tenant_id = user.tenantId;
      }

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
      const query = user.tipo === 'platform_admin'
        ? `SELECT t.*, 
             id.nome as item_dado_nome,
             ir.nome as item_recebido_nome
           FROM trocas t
           LEFT JOIN itens id ON t.item_dado_id = id.id
           LEFT JOIN itens ir ON t.item_recebido_id = ir.id
           WHERE t.id = @id`
        : `SELECT t.*, 
             id.nome as item_dado_nome,
             ir.nome as item_recebido_nome
           FROM trocas t
           LEFT JOIN itens id ON t.item_dado_id = id.id
           LEFT JOIN itens ir ON t.item_recebido_id = ir.id
           WHERE t.id = @id AND t.tenant_id = @tenant_id`;
      const queryParams = user.tipo === 'platform_admin' ? { id } : { id, tenant_id: user.tenantId };
      const result = await executeQuery(query, queryParams);

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

      let itemRecebidoId = validated.item_recebido_id;

      // Se não tem item_recebido_id, criar o item a partir do nome/valor
      if (!itemRecebidoId && validated.item_recebido_nome) {
        // Get the type of the item being given away to use as default for received item
        const itemDadoQuery = 'SELECT tipo FROM itens WHERE id = @id';
        const itemDadoResult = await executeQuery<{ tipo: string }>(itemDadoQuery, { id: validated.item_dado_id });
        const tipoItem = itemDadoResult.recordset[0]?.tipo || 'camiseta';
        
        const createItemQuery = `
          INSERT INTO itens (
            tipo, nome, valor_compra, situacao, data_aquisicao, observacoes
          )
          OUTPUT INSERTED.id
          VALUES (
            @tipo, @nome, @valor_compra, 'estoque', @data_aquisicao, @observacoes
          )
        `;
        
        const itemResult = await executeQuery<{ id: number }>(createItemQuery, {
          tipo: tipoItem,
          nome: validated.item_recebido_nome,
          valor_compra: validated.item_recebido_valor || 0,
          data_aquisicao: datatroca,
          observacoes: `Item recebido em troca em ${datatroca}`,
        });
        
        itemRecebidoId = itemResult.recordset[0].id;
      }

      // Update item_dado_id status (marcar como trocada)
      await executeQuery(`
        UPDATE itens 
        SET situacao = 'trocada', 
            destino = 'troca', 
            data_saida = @data_saida 
        WHERE id = @id
      `, {
        id: validated.item_dado_id,
        data_saida: datatroca,
      });

      // O item recebido já foi criado com situacao='estoque', não precisa atualizar
      // Mas se foi passado um item_recebido_id existente, atualizar sua data
      if (validated.item_recebido_id) {
        await executeQuery(`
          UPDATE itens 
          SET situacao = 'estoque', 
              destino = NULL, 
              data_saida = NULL,
              data_aquisicao = @data_aquisicao
          WHERE id = @id
        `, {
          id: validated.item_recebido_id,
          data_aquisicao: datatroca,
        });
      }

      // Inserir na tabela trocas
      const tenantId = user.tipo === 'platform_admin' && validated.tenant_id ? validated.tenant_id : user.tenantId;
      const query = `
        INSERT INTO trocas (
          item_dado_id, item_recebido_id, valor_adicional, quem_pagou,
          data_troca, observacoes, status, tenant_id
        )
        OUTPUT INSERTED.*
        VALUES (
          @item_dado_id, @item_recebido_id, @valor_adicional, @quem_pagou,
          @data_troca, @observacoes, 'ativa', @tenant_id
        )
      `;

      const result = await executeQuery<Troca>(query, {
        item_dado_id: validated.item_dado_id,
        item_recebido_id: itemRecebidoId,
        valor_adicional: validated.valor_adicional,
        quem_pagou: validated.quem_pagou,
        data_troca: datatroca,
        observacoes: validated.observacoes,
        tenant_id: tenantId,
      });

      return successResponse({
        ...result.recordset[0],
        item_recebido_criado: !validated.item_recebido_id, // Flag indicando se criou novo item
      }, 201, origin);
    }

    // PUT /api/trocas/{id} - Update trade or cancel
    if (method === 'PUT' && id) {
      const body = await safeParseJson(request);
      const validated = trocaUpdateSchema.parse(body);

      // If status is being set to 'cancelada', use cancel logic
      if (validated.status === 'cancelada') {
        const getQuery = user.tipo === 'platform_admin'
          ? 'SELECT * FROM trocas WHERE id = @id'
          : 'SELECT * FROM trocas WHERE id = @id AND tenant_id = @tenant_id';
        const getParams = user.tipo === 'platform_admin' ? { id } : { id, tenant_id: user.tenantId };
        const getResult = await executeQuery<Troca>(getQuery, getParams);

        if (getResult.recordset.length === 0) {
          return successResponse({ error: 'Troca não encontrada' }, 404, origin);
        }

        const trade = getResult.recordset[0];

        // Cancel the trade
        const cancelQuery = user.tipo === 'platform_admin'
          ? `UPDATE trocas
             SET status = 'cancelada', cancelada_em = GETDATE()
             OUTPUT INSERTED.*
             WHERE id = @id`
          : `UPDATE trocas
             SET status = 'cancelada', cancelada_em = GETDATE()
             OUTPUT INSERTED.*
             WHERE id = @id AND tenant_id = @tenant_id`;
        const cancelParams = user.tipo === 'platform_admin' ? { id } : { id, tenant_id: user.tenantId };
        const cancelResult = await executeQuery<Troca>(cancelQuery, cancelParams);

        // Revert item statuses
        await executeQuery(`
          UPDATE itens
          SET situacao = 'estoque',
              destino = NULL,
              data_saida = NULL
          WHERE id = @id
        `, { id: trade.item_dado_id });

        await executeQuery(`
          UPDATE itens
          SET situacao = 'estoque',
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
        const whereClause = user.tipo === 'platform_admin' 
          ? 'WHERE id = @id'
          : 'WHERE id = @id AND tenant_id = @tenant_id';
        const query = `
          UPDATE trocas 
          SET ${setClauses}
          OUTPUT INSERTED.*
          ${whereClause}
        `;

        const updateParams = user.tipo === 'platform_admin' 
          ? { ...validated, id }
          : { ...validated, id, tenant_id: user.tenantId };
        const result = await executeQuery<Troca>(query, updateParams);

        if (result.recordset.length === 0) {
          return successResponse({ error: 'Troca não encontrada' }, 404, origin);
        }

        return successResponse(result.recordset[0], 200, origin);
      }

      // No fields to update
      const getQuery = user.tipo === 'platform_admin'
        ? 'SELECT * FROM trocas WHERE id = @id'
        : 'SELECT * FROM trocas WHERE id = @id AND tenant_id = @tenant_id';
      const getParams = user.tipo === 'platform_admin' ? { id } : { id, tenant_id: user.tenantId };
      const getResult = await executeQuery<Troca>(getQuery, getParams);
      
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

async function trocasHandlerWrapper(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin') || undefined;
  
  if (request.method === 'OPTIONS') {
    return handlePreflight(origin);
  }
  
  return protectedRoute(trocasHandler)(request, context);
}

app.http('trocas', {
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'trocas/{id?}/{action?}',
  handler: trocasHandlerWrapper,
});
