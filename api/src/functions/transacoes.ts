import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { executeQuery } from '../lib/database';
import { handleError, successResponse } from '../middleware/errorHandler';
import { handlePreflight } from '../lib/cors';
import { transacaoSchema, safeParseJson, clampPagination, JWTPayload } from '../lib/utils';
import { Transacao } from '../lib/types';
import { protectedRoute } from '../middleware/auth';

async function transacoesHandlerWrapper(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin') || undefined;

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return handlePreflight(origin);
  }

  // Delegate to protected handler
  return protectedRoute(transacoesHandler)(request, context);
}

async function transacoesHandler(request: HttpRequest, context: InvocationContext, user: JWTPayload): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin') || undefined;

  try {
    const method = request.method;
    const id = request.params.id;

    // GET /api/transacoes - List all transactions
    if (method === 'GET' && !id) {
      const rawPage = parseInt(request.query.get('page') || '1');
      const rawPerPage = parseInt(request.query.get('perPage') || '30');
      const { page, perPage } = clampPagination(rawPage, rawPerPage);
      const tipo = request.query.get('tipo');
      const offset = (page - 1) * perPage;

      let whereClause = 'WHERE 1=1';
      const params: Record<string, any> = {};

      // Tenant isolation
      if (user.tipo !== 'platform_admin') {
        whereClause += ' AND t.tenant_id = @tenant_id';
        params.tenant_id = user.tenantId;
      }

      if (tipo) {
        whereClause += ' AND tipo_transacao = @tipo';
        params.tipo = tipo;
      }

      const countQuery = `SELECT COUNT(*) as total FROM transacoes t ${whereClause}`;
      const countResult = await executeQuery<{ total: number }>(countQuery, params);
      const total = countResult.recordset[0].total;

      const query = `
        SELECT t.*, i.nome as item_nome, c.nome as cliente_nome
        FROM transacoes t
        LEFT JOIN itens i ON t.item_id = i.id
        LEFT JOIN clientes c ON t.cliente_id = c.id
        ${whereClause}
        ORDER BY t.data_transacao DESC, t.criado_em DESC
        OFFSET ${offset} ROWS FETCH NEXT ${perPage} ROWS ONLY
      `;

      const result = await executeQuery<Transacao>(query, params);

      return successResponse({
        data: result.recordset,
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      }, 200, origin);
    }

    // GET /api/transacoes/{id} - Get single transaction
    if (method === 'GET' && id) {
      let whereClause = 'WHERE t.id = @id';
      const params: Record<string, any> = { id };

      // Tenant isolation
      if (user.tipo !== 'platform_admin') {
        whereClause += ' AND t.tenant_id = @tenant_id';
        params.tenant_id = user.tenantId;
      }

      const query = `
        SELECT t.*, i.nome as item_nome, c.nome as cliente_nome
        FROM transacoes t
        LEFT JOIN itens i ON t.item_id = i.id
        LEFT JOIN clientes c ON t.cliente_id = c.id
        ${whereClause}
      `;
      const result = await executeQuery<Transacao>(query, params);

      if (result.recordset.length === 0) {
        return successResponse({ error: 'Transação não encontrada' }, 404, origin);
      }

      return successResponse(result.recordset[0], 200, origin);
    }

    // POST /api/transacoes - Create new transaction
    if (method === 'POST') {
      const body = await safeParseJson(request);
      const validated = transacaoSchema.parse(body);

      const dataTransacao = validated.data_transacao || new Date().toISOString().split('T')[0];
      
      // Determine tenant_id: use from body if platform_admin, otherwise use user's tenant
      const tenantId = user.tipo === 'platform_admin' && validated.tenant_id ? validated.tenant_id : user.tenantId;

      // Start transaction
      const insertQuery = `
        INSERT INTO transacoes (
          tipo_transacao, item_id, cliente_id, valor, data_transacao,
          observacoes, tenant_id, status
        )
        OUTPUT INSERTED.*
        VALUES (
          @tipo_transacao, @item_id, @cliente_id, @valor, @data_transacao,
          @observacoes, @tenant_id, @status
        )
      `;

      const result = await executeQuery<Transacao>(insertQuery, {
        tipo_transacao: validated.tipo_transacao,
        item_id: validated.item_id,
        cliente_id: validated.cliente_id,
        valor: validated.valor,
        data_transacao: dataTransacao,
        observacoes: validated.observacoes,
        tenant_id: tenantId,
        status: validated.status || 'concluida',
      });

      // If this is a sale, update the item status
      if (validated.tipo_transacao === 'venda') {
        const updateItemQuery = `
          UPDATE itens
          SET situacao = 'vendida',
              destino = 'venda',
              data_saida = @data_saida,
              valor_venda = @valor_venda
          WHERE id = @item_id
        `;

        await executeQuery(updateItemQuery, {
          item_id: validated.item_id,
          data_saida: dataTransacao,
          valor_venda: validated.valor,
        });
      }

      return successResponse(result.recordset[0], 201, origin);
    }

    // PUT /api/transacoes/{id} - Update transaction
    if (method === 'PUT' && id) {
      const body: any = await safeParseJson(request);
      
      // Manual validation for partial updates (can't use partial() with refined schemas)
      type PartialTransacao = Partial<{
        tipo_transacao: 'venda' | 'compra' | 'troca';
        item_id: number;
        cliente_id: number;
        valor: number;
        data_transacao: string;
        observacoes: string;
        status: 'pendente' | 'concluida' | 'cancelada' | 'estornada';
      }>;
      
      const allowedFields = ['tipo_transacao', 'item_id', 'cliente_id', 'valor', 'data_transacao', 'observacoes', 'status'];
      const validated: PartialTransacao = {};
      
      for (const key of allowedFields) {
        if (key in body) {
          validated[key as keyof PartialTransacao] = body[key];
        }
      }

      // Get the existing transaction to check tipo_transacao and tenant
      let whereClause = 'WHERE id = @id';
      const params: Record<string, any> = { id };

      // Tenant isolation
      if (user.tipo !== 'platform_admin') {
        whereClause += ' AND tenant_id = @tenant_id';
        params.tenant_id = user.tenantId;
      }

      const existingQuery = `SELECT * FROM transacoes ${whereClause}`;
      const existingResult = await executeQuery<Transacao>(existingQuery, params);

      if (existingResult.recordset.length === 0) {
        return successResponse({ error: 'Transação não encontrada' }, 404, origin);
      }

      const existingTransaction = existingResult.recordset[0];

      // Build update query
      const setClauses = Object.keys(validated)
        .map(key => `${key} = @${key}`)
        .join(', ');

      if (setClauses) {
        const updateQuery = `
          UPDATE transacoes
          SET ${setClauses}
          OUTPUT INSERTED.*
          ${whereClause}
        `;

        const result = await executeQuery<Transacao>(updateQuery, { ...validated, ...params });

        // If this is a sale and valor changed, update item
        if (existingTransaction.tipo_transacao === 'venda' && validated.valor !== undefined) {
          const updateItemQuery = `
            UPDATE itens
            SET valor_venda = @valor_venda
            WHERE id = @item_id
          `;

          await executeQuery(updateItemQuery, {
            item_id: existingTransaction.item_id,
            valor_venda: validated.valor,
          });
        }

        return successResponse(result.recordset[0], 200, origin);
      }

      return successResponse(existingTransaction, 200, origin);
    }

    // DELETE /api/transacoes/{id} - Delete transaction
    if (method === 'DELETE' && id) {
      // Get the transaction before deleting with tenant check
      let whereClause = 'WHERE id = @id';
      const params: Record<string, any> = { id };

      // Tenant isolation
      if (user.tipo !== 'platform_admin') {
        whereClause += ' AND tenant_id = @tenant_id';
        params.tenant_id = user.tenantId;
      }

      const getQuery = `SELECT * FROM transacoes ${whereClause}`;
      const getResult = await executeQuery<Transacao>(getQuery, params);

      if (getResult.recordset.length === 0) {
        return successResponse({ error: 'Transação não encontrada' }, 404, origin);
      }

      const transaction = getResult.recordset[0];

      // Delete the transaction
      const deleteQuery = `DELETE FROM transacoes ${whereClause}`;
      await executeQuery(deleteQuery, params);

      // If this was a sale, check if there are other sales for this item
      if (transaction.tipo_transacao === 'venda') {
        const otherSalesQuery = `
          SELECT COUNT(*) as count
          FROM transacoes
          WHERE item_id = @item_id AND tipo_transacao = 'venda'
        `;
        const otherSalesResult = await executeQuery<{ count: number }>(otherSalesQuery, { item_id: transaction.item_id });

        // If no other sales, revert item to available
        if (otherSalesResult.recordset[0].count === 0) {
          const revertItemQuery = `
            UPDATE itens
            SET situacao = 'estoque',
                destino = NULL,
                data_saida = NULL,
                valor_venda = NULL,
                lucro_calculado = NULL
            WHERE id = @item_id
          `;
          await executeQuery(revertItemQuery, { item_id: transaction.item_id });
        }
      }

      return successResponse({ message: 'Transação excluída com sucesso' }, 200, origin);
    }

    return successResponse({ error: 'Método não permitido' }, 405, origin);
  } catch (error) {
    return handleError(error, context, origin);
  }
}

app.http('transacoes', {
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'transacoes/{id?}',
  handler: transacoesHandlerWrapper,
});
