import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { executeQuery } from '../lib/database';
import { handleError, successResponse } from '../middleware/errorHandler';
import { handlePreflight } from '../lib/cors';
import { Cliente } from '../lib/types';
import { clienteSchema, safeParseJson, clampPagination } from '../lib/utils';
import { protectedRoute, JWTPayload } from '../middleware/auth';

async function clientesHandler(request: HttpRequest, context: InvocationContext, user: JWTPayload): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin') || undefined;

  try {
    const method = request.method;
    const id = request.params.id;

    // GET /api/clientes - List all customers
    if (method === 'GET' && !id) {
      const rawPage = parseInt(request.query.get('page') || '1');
      const rawPerPage = parseInt(request.query.get('perPage') || '30');
      const { page, perPage } = clampPagination(rawPage, rawPerPage);
      const search = request.query.get('search');
      const offset = (page - 1) * perPage;

      let whereClause = 'WHERE 1=1';
      const params: Record<string, any> = {};

      if (user.tipo !== 'platform_admin') {
        whereClause += ' AND tenant_id = @tenant_id';
        params.tenant_id = user.tenantId;
      }

      if (search) {
        whereClause += ' AND (nome LIKE @search OR apelido LIKE @search OR instagram LIKE @search OR cidade LIKE @search)';
        params.search = `%${search}%`;
      }

      const countQuery = `SELECT COUNT(*) as total FROM clientes ${whereClause}`;
      const countResult = await executeQuery<{ total: number }>(countQuery, params);
      const total = countResult.recordset[0].total;

      const query = `
        SELECT * FROM clientes
        ${whereClause}
        ORDER BY nome
        OFFSET ${offset} ROWS FETCH NEXT ${perPage} ROWS ONLY
      `;

      const result = await executeQuery<Cliente>(query, params);

      return successResponse({
        data: result.recordset,
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      }, 200, origin);
    }

    // GET /api/clientes/{id} - Get single customer with purchase history
    if (method === 'GET' && id) {
      let clienteQuery = 'SELECT * FROM clientes WHERE id = @id';
      const clienteParams: Record<string, any> = { id };
      
      if (user.tipo !== 'platform_admin') {
        clienteQuery += ' AND tenant_id = @tenant_id';
        clienteParams.tenant_id = user.tenantId;
      }
      
      const clienteResult = await executeQuery<Cliente>(clienteQuery, clienteParams);

      if (clienteResult.recordset.length === 0) {
        return successResponse({ error: 'Cliente não encontrado' }, 404, origin);
      }

      const vendasQuery = `
        SELECT id, nome, ano, tipo, marca, jogador, 
               valor_compra, valor_venda, lucro_calculado, 
               data_saida, destino
        FROM dbo.vw_historico_vendas
        WHERE cliente_id = @id
        ORDER BY data_saida DESC
      `;
      const vendasResult = await executeQuery(vendasQuery, { id });

      return successResponse({
        ...clienteResult.recordset[0],
        vendas: vendasResult.recordset,
      }, 200, origin);
    }

    // POST /api/clientes - Create new customer
    if (method === 'POST') {
      const body = await safeParseJson(request);
      const validated = clienteSchema.parse(body);

      const tenant_id = user.tipo === 'platform_admin' && validated.tenant_id ? validated.tenant_id : user.tenantId;

      const query = `
        INSERT INTO clientes (
          nome, apelido, telefone, instagram, cidade, tipo, observacoes, tenant_id
        )
        OUTPUT INSERTED.*
        VALUES (
          @nome, @apelido, @telefone, @instagram, @cidade, @tipo, @observacoes, @tenant_id
        )
      `;

      const result = await executeQuery<Cliente>(query, { ...validated, tenant_id });
      return successResponse(result.recordset[0], 201, origin);
    }

    // PUT /api/clientes/{id} - Update customer
    if (method === 'PUT' && id) {
      const body = await safeParseJson(request);
      const validated = clienteSchema.partial().parse(body);

      const setClauses = Object.keys(validated)
        .map(key => `${key} = @${key}`)
        .join(', ');

      let whereClause = 'WHERE id = @id';
      const updateParams: Record<string, any> = { ...validated, id };
      
      if (user.tipo !== 'platform_admin') {
        whereClause += ' AND tenant_id = @tenant_id';
        updateParams.tenant_id = user.tenantId;
      }

      const query = `
        UPDATE clientes 
        SET ${setClauses}
        OUTPUT INSERTED.*
        ${whereClause}
      `;

      const result = await executeQuery<Cliente>(query, updateParams);

      if (result.recordset.length === 0) {
        return successResponse({ error: 'Cliente não encontrado' }, 404, origin);
      }

      return successResponse(result.recordset[0], 200, origin);
    }

    // DELETE /api/clientes/{id} - Delete customer
    if (method === 'DELETE' && id) {
      // Check FK: transacoes
      let checkQuery = 'SELECT COUNT(*) as count FROM transacoes WHERE cliente_id = @id';
      const checkParams: Record<string, any> = { id };
      
      if (user.tipo !== 'platform_admin') {
        checkQuery += ' AND tenant_id = @tenant_id';
        checkParams.tenant_id = user.tenantId;
      }
      
      const checkTransacoes = await executeQuery<{ count: number }>(checkQuery, checkParams);
      
      if (checkTransacoes.recordset[0].count > 0) {
        return successResponse({
          error: 'Não é possível excluir',
          message: `Este cliente possui ${checkTransacoes.recordset[0].count} transação(ões). Remova as transações primeiro.`,
        }, 409, origin);
      }
      
      let deleteQuery = 'DELETE FROM clientes WHERE id = @id';
      const deleteParams: Record<string, any> = { id };
      
      if (user.tipo !== 'platform_admin') {
        deleteQuery += ' AND tenant_id = @tenant_id';
        deleteParams.tenant_id = user.tenantId;
      }
      
      await executeQuery(deleteQuery, deleteParams);
      return successResponse({ message: 'Cliente excluído com sucesso' }, 200, origin);
    }

    return successResponse({ error: 'Método não permitido' }, 405, origin);
  } catch (error) {
    return handleError(error, context, origin);
  }
}

async function clientesHandlerWrapper(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin') || undefined;
  
  if (request.method === 'OPTIONS') {
    return handlePreflight(origin);
  }
  
  return protectedRoute(clientesHandler)(request, context);
}

app.http('clientes', {
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'clientes/{id?}',
  handler: clientesHandlerWrapper,
});
