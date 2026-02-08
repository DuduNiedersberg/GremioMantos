import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { executeQuery, getConnection } from '../lib/database';
import { handleError, successResponse } from '../middleware/errorHandler';
import { handlePreflight } from '../lib/cors';
import { clampPagination, safeParseJson } from '../lib/utils';
import { protectedRoute, JWTPayload } from '../middleware/auth';

async function vendasHandler(request: HttpRequest, context: InvocationContext, user: JWTPayload): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin') || undefined;

  try {
    const method = request.method;
    const id = request.params.id;

    // GET /api/vendas - List all sales from itens table
    if (method === 'GET' && !id) {
      const rawPage = parseInt(request.query.get('page') || '1');
      const rawPerPage = parseInt(request.query.get('perPage') || '30');
      const { page, perPage } = clampPagination(rawPage, rawPerPage);
      const search = request.query.get('search');
      const offset = (page - 1) * perPage;

      let whereClause = 'WHERE i.situacao = @situacao AND i.destino = @destino';
      const params: Record<string, any> = {
        situacao: 'vendida',
        destino: 'venda',
      };

      // Tenant isolation
      if (user.tipo !== 'platform_admin') {
        whereClause += ' AND i.tenant_id = @tenant_id';
        params.tenant_id = user.tenantId;
      }

      if (search) {
        whereClause += ' AND (i.nome LIKE @search OR i.jogador LIKE @search OR i.marca LIKE @search OR c.nome LIKE @search)';
        params.search = `%${search}%`;
      }

      const countQuery = `SELECT COUNT(*) as total FROM dbo.itens i
LEFT JOIN dbo.transacoes t ON t.item_id = i.id AND t.tipo_transacao = 'venda'
LEFT JOIN dbo.clientes c ON t.cliente_id = c.id
${whereClause}`;
      const countResult = await executeQuery<{ total: number }>(countQuery, params);
      const total = countResult.recordset[0].total;

      const query = `
  SELECT 
    i.id,
    i.id as item_id,
    i.nome as item_nome,
    i.ano, i.tipo, i.marca, i.jogador,
    i.valor_compra,
    i.valor_venda,
    (i.valor_venda - i.valor_compra) as lucro,
    i.data_saida as data_venda,
    i.destino,
    t.id as transacao_id,
    t.cliente_id,
    c.nome as cliente_nome,
    vd.forma_pagamento,
    vd.codigo_rastreio,
    vd.transportadora
  FROM dbo.itens i
  LEFT JOIN dbo.transacoes t ON t.item_id = i.id AND t.tipo_transacao = 'venda'
  LEFT JOIN dbo.clientes c ON t.cliente_id = c.id
  LEFT JOIN dbo.venda_detalhes vd ON vd.transacao_id = t.id
  ${whereClause}
  ORDER BY i.data_saida DESC
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

    // GET /api/vendas/{id} - Get single sale from itens table
    if (method === 'GET' && id) {
      let whereClause = 'WHERE i.situacao = @situacao AND i.destino = @destino AND i.id = @id';
      const params: Record<string, any> = {
        situacao: 'vendida',
        destino: 'venda',
        id: id,
      };

      // Tenant isolation
      if (user.tipo !== 'platform_admin') {
        whereClause += ' AND i.tenant_id = @tenant_id';
        params.tenant_id = user.tenantId;
      }

      const query = `
        SELECT 
          i.id, i.nome, i.ano, i.tipo, i.marca, i.jogador, 
          i.valor_compra, i.valor_venda, 
          (i.valor_venda - i.valor_compra) as lucro_calculado, 
          i.data_saida, i.destino,
          t.id as transacao_id,
          t.cliente_id,
          c.nome as cliente_nome,
          vd.forma_pagamento,
          vd.endereco_entrega,
          vd.valor_frete,
          vd.codigo_rastreio,
          vd.transportadora,
          vd.data_envio,
          vd.data_entrega_prevista,
          vd.data_entrega_real,
          vd.observacoes as venda_observacoes
        FROM dbo.itens i
        LEFT JOIN dbo.transacoes t ON t.item_id = i.id AND t.tipo_transacao = 'venda'
        LEFT JOIN dbo.clientes c ON t.cliente_id = c.id
        LEFT JOIN dbo.venda_detalhes vd ON vd.transacao_id = t.id
        ${whereClause}
      `;
      const result = await executeQuery(query, params);

      if (result.recordset.length === 0) {
        return successResponse({ error: 'Venda não encontrada' }, 404, origin);
      }

      return successResponse(result.recordset[0], 200, origin);
    }

    // POST /api/vendas - Create atomic sale with transacao + venda_detalhes + item update
    if (method === 'POST') {
      const body: any = await safeParseJson(request);
      
      // Validate required fields for a sale
      if (!body.item_id || !(body.valor || body.valor_venda)) {
        return successResponse({
          error: 'Campos obrigatórios faltando',
          message: 'item_id e valor são obrigatórios para criar uma venda',
        }, 400, origin);
      }

      const tenantId = user.tipo === 'platform_admin' && body.tenant_id ? body.tenant_id : user.tenantId;
      const dataTransacao = body.data_venda || new Date().toISOString().split('T')[0];
      const valorVenda = body.valor || body.valor_venda;

      // Use getConnection for transaction support
      const connection = await getConnection();
      const transaction = connection.transaction();
      
      try {
        await transaction.begin();

        // Step 1: Create transacao
        const insertTransacaoQuery = `
          INSERT INTO transacoes (
            tipo_transacao, item_id, cliente_id, valor, data_transacao, observacoes, tenant_id, status
          )
          OUTPUT INSERTED.id
          VALUES (
            'venda', @item_id, @cliente_id, @valor, @data_transacao, @observacoes, @tenant_id, 'concluida'
          )
        `;

        const transacaoRequest = transaction.request();
        transacaoRequest.input('item_id', body.item_id);
        transacaoRequest.input('cliente_id', body.cliente_id || null);
        transacaoRequest.input('valor', valorVenda);
        transacaoRequest.input('data_transacao', dataTransacao);
        transacaoRequest.input('observacoes', body.observacoes || null);
        transacaoRequest.input('tenant_id', tenantId);

        const transacaoResult = await transacaoRequest.query(insertTransacaoQuery);
        const transacaoId = transacaoResult.recordset[0].id;

        // Step 2: Create venda_detalhes
        if (body.forma_pagamento || body.valor_frete || body.endereco_entrega || body.codigo_rastreio || body.transportadora || body.endereco_id) {
          const insertVendaDetalhesQuery = `
            INSERT INTO venda_detalhes (
              transacao_id, forma_pagamento, endereco_entrega, valor_frete, 
              codigo_rastreio, transportadora, data_envio, data_entrega_prevista, 
              data_entrega_real, observacoes, endereco_id
            )
            VALUES (
              @transacao_id, @forma_pagamento, @endereco_entrega, @valor_frete,
              @codigo_rastreio, @transportadora, @data_envio, @data_entrega_prevista,
              @data_entrega_real, @observacoes_venda, @endereco_id
            )
          `;

          const vendaDetalhesRequest = transaction.request();
          vendaDetalhesRequest.input('transacao_id', transacaoId);
          vendaDetalhesRequest.input('forma_pagamento', body.forma_pagamento || null);
          vendaDetalhesRequest.input('endereco_entrega', body.endereco_entrega || null);
          vendaDetalhesRequest.input('valor_frete', body.valor_frete || 0);
          vendaDetalhesRequest.input('codigo_rastreio', body.codigo_rastreio || null);
          vendaDetalhesRequest.input('transportadora', body.transportadora || null);
          vendaDetalhesRequest.input('data_envio', body.data_envio || null);
          vendaDetalhesRequest.input('data_entrega_prevista', body.data_entrega_prevista || null);
          vendaDetalhesRequest.input('data_entrega_real', body.data_entrega_real || null);
          vendaDetalhesRequest.input('observacoes_venda', body.observacoes_venda || null);
          vendaDetalhesRequest.input('endereco_id', body.endereco_id || null);

          await vendaDetalhesRequest.query(insertVendaDetalhesQuery);
        }

        // Step 3: Update item status
        const updateItemQuery = `
          UPDATE itens
          SET situacao = 'vendida',
              destino = 'venda',
              data_saida = @data_saida,
              valor_venda = @valor_venda,
              lucro_calculado = @valor_venda - COALESCE(valor_compra, 0)
          WHERE id = @item_id AND tenant_id = @tenant_id
        `;

        const updateItemRequest = transaction.request();
        updateItemRequest.input('item_id', body.item_id);
        updateItemRequest.input('data_saida', dataTransacao);
        updateItemRequest.input('valor_venda', valorVenda);
        updateItemRequest.input('tenant_id', tenantId);

        await updateItemRequest.query(updateItemQuery);

        // Commit transaction
        await transaction.commit();

        return successResponse({
          id: transacaoId,
          message: 'Venda criada com sucesso',
          item_id: body.item_id,
          cliente_id: body.cliente_id,
          valor: valorVenda,
          data_transacao: dataTransacao,
        }, 201, origin);
      } catch (error) {
        // Rollback on error
        await transaction.rollback();
        throw error;
      }
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

async function vendasHandlerWrapper(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin') || undefined;

  if (request.method === 'OPTIONS') {
    return handlePreflight(origin);
  }

  return protectedRoute(vendasHandler)(request, context);
}

app.http('vendas', {
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'vendas/{id?}',
  handler: vendasHandlerWrapper,
});
