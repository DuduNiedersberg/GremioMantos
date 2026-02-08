import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { executeQuery } from '../lib/database';
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

      const countQuery = `SELECT COUNT(*) as total FROM dbo.itens i ${whereClause}`;
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
    i.cliente_id,
    c.nome as cliente_nome
  FROM dbo.itens i
  LEFT JOIN dbo.clientes c ON i.cliente_id = c.id
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
          i.data_saida, i.destino, i.cliente_id, c.nome as cliente_nome
        FROM dbo.itens i
        LEFT JOIN dbo.clientes c ON i.cliente_id = c.id
        ${whereClause}
      `;
      const result = await executeQuery(query, params);

      if (result.recordset.length === 0) {
        return successResponse({ error: 'Venda não encontrada' }, 404, origin);
      }

      return successResponse(result.recordset[0], 200, origin);
    }

    // POST /api/vendas - Backward compatible: create sale via transacoes
    if (method === 'POST') {
      const body: any = await safeParseJson(request);
      
      // Validate required fields for a sale
     if (!body.item_id || !(body.valor || body.valor_venda)) {
        return successResponse({
          error: 'Campos obrigatórios faltando',
          message: 'item_id, cliente_id e valor são obrigatórios para criar uma venda',
        }, 400, origin);
      }

      const tenantId = user.tipo === 'platform_admin' && body.tenant_id ? body.tenant_id : user.tenantId;
      const dataTransacao = body.data_venda || new Date().toISOString().split('T')[0];

      // Create transaction
      const insertQuery = `
        INSERT INTO transacoes (
          tipo_transacao, item_id, cliente_id, valor, data_transacao, observacoes, tenant_id
        )
        OUTPUT INSERTED.*
        VALUES (
          'venda', @item_id, @cliente_id, @valor, @data_transacao, @observacoes, @tenant_id
        )
      `;

      const result = await executeQuery(insertQuery, {
        item_id: body.item_id,
        cliente_id: body.cliente_id,
        valor: body.valor || body.valor_venda,
        data_transacao: dataTransacao,
        observacoes: body.observacoes,
        tenant_id: tenantId,
      });

      // Update item status
      const updateItemQuery = `
        UPDATE itens
        SET situacao = 'vendida',
            destino = 'venda',
            data_saida = @data_saida,
            valor_venda = @valor_venda
        WHERE id = @item_id AND tenant_id = @tenant_id
      `;

      await executeQuery(updateItemQuery, {
        item_id: body.item_id,
        data_saida: dataTransacao,
        valor_venda: body.valor || body.valor_venda,
        tenant_id: tenantId,
      });

      return successResponse({
        ...result.recordset[0],
        message: 'Venda criada com sucesso via transações',
      }, 201, origin);
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
