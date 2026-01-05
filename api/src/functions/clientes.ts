import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { executeQuery } from '../lib/database';
import { handleError, successResponse } from '../middleware/errorHandler';
import { handlePreflight } from '../lib/cors';
import { Cliente } from '../lib/types';
import { z } from 'zod';
import { safeParseJson, clampPagination } from '../lib/utils';

const clienteSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email().optional(),
  telefone: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().length(2).optional(),
  observacoes: z.string().optional(),
});

async function clientesHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin') || undefined;

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return handlePreflight(origin);
  }

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

      if (search) {
        whereClause += ' AND (nome LIKE @search OR email LIKE @search OR cidade LIKE @search)';
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
      const clienteQuery = 'SELECT * FROM clientes WHERE id = @id';
      const clienteResult = await executeQuery<Cliente>(clienteQuery, { id });

      if (clienteResult.recordset.length === 0) {
        return successResponse({ error: 'Cliente não encontrado' }, 404, origin);
      }

      const vendasQuery = `
        SELECT v.*, i.nome as item_nome
        FROM vendas v
        LEFT JOIN itens i ON v.item_id = i.id
        WHERE v.cliente_id = @id
        ORDER BY v.data_venda DESC
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

      const query = `
        INSERT INTO clientes (
          nome, email, telefone, cidade, estado, observacoes
        )
        OUTPUT INSERTED.*
        VALUES (
          @nome, @email, @telefone, @cidade, @estado, @observacoes
        )
      `;

      const result = await executeQuery<Cliente>(query, validated);
      return successResponse(result.recordset[0], 201, origin);
    }

    // PUT /api/clientes/{id} - Update customer
    if (method === 'PUT' && id) {
      const body = await safeParseJson(request);
      const validated = clienteSchema.partial().parse(body);

      const setClauses = Object.keys(validated)
        .map(key => `${key} = @${key}`)
        .join(', ');

      const query = `
        UPDATE clientes 
        SET ${setClauses}
        OUTPUT INSERTED.*
        WHERE id = @id
      `;

      const result = await executeQuery<Cliente>(query, { ...validated, id });

      if (result.recordset.length === 0) {
        return successResponse({ error: 'Cliente não encontrado' }, 404, origin);
      }

      return successResponse(result.recordset[0], 200, origin);
    }

    // DELETE /api/clientes/{id} - Delete customer
    if (method === 'DELETE' && id) {
      const query = 'DELETE FROM clientes WHERE id = @id';
      await executeQuery(query, { id });
      return successResponse({ message: 'Cliente excluído com sucesso' }, 200, origin);
    }

    return successResponse({ error: 'Método não permitido' }, 405, origin);
  } catch (error) {
    return handleError(error, context, origin);
  }
}

app.http('clientes', {
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'clientes/{id?}',
  handler: clientesHandler,
});
