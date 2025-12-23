import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { executeQuery } from '../lib/database';
import { handleError, successResponse } from '../middleware/errorHandler';
import { itemSchema } from '../lib/utils';
import { Item } from '../lib/types';

async function itensHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const method = request.method;
    const id = request.params.id;

    // GET /api/itens - List all items
    if (method === 'GET' && !id) {
      const page = parseInt(request.query.get('page') || '1');
      const perPage = parseInt(request.query.get('perPage') || '30');
      const situacao = request.query.get('situacao');
      const search = request.query.get('search');
      
      let whereClause = 'WHERE 1=1';
      const params: Record<string, any> = {};

      if (situacao) {
        whereClause += ' AND situacao = @situacao';
        params.situacao = situacao;
      }

      if (search) {
        whereClause += ' AND (nome LIKE @search OR jogador LIKE @search OR marca LIKE @search)';
        params.search = `%${search}%`;
      }

      const offset = (page - 1) * perPage;
      
      const countQuery = `SELECT COUNT(*) as total FROM itens ${whereClause}`;
      const countResult = await executeQuery<{ total: number }>(countQuery, params);
      const total = countResult.recordset[0].total;

      const query = `
        SELECT * FROM itens 
        ${whereClause}
        ORDER BY criado_em DESC
        OFFSET ${offset} ROWS FETCH NEXT ${perPage} ROWS ONLY
      `;
      
      const result = await executeQuery<Item>(query, params);

      return successResponse({
        data: result.recordset,
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      });
    }

    // GET /api/itens/{id} - Get single item
    if (method === 'GET' && id) {
      const query = 'SELECT * FROM itens WHERE id = @id';
      const result = await executeQuery<Item>(query, { id });

      if (result.recordset.length === 0) {
        return successResponse({ error: 'Item não encontrado' }, 404);
      }

      return successResponse(result.recordset[0]);
    }

    // POST /api/itens - Create new item
    if (method === 'POST') {
      const body = await request.json();
      const validated = itemSchema.parse(body);

      const query = `
        INSERT INTO itens (
          nome, ano, marca, modelo, jogador, numero, tamanho, situacao,
          valor_compra, valor_venda, valor_mercado, lote_id, data_aquisicao, origem, observacoes
        ) 
        OUTPUT INSERTED.*
        VALUES (
          @nome, @ano, @marca, @modelo, @jogador, @numero, @tamanho, @situacao,
          @valor_compra, @valor_venda, @valor_mercado, @lote_id, @data_aquisicao, @origem, @observacoes
        )
      `;

      const result = await executeQuery<Item>(query, validated);
      return successResponse(result.recordset[0], 201);
    }

    // PUT /api/itens/{id} - Update item
    if (method === 'PUT' && id) {
      const body = await request.json();
      const validated = itemSchema.partial().parse(body);

      const setClauses = Object.keys(validated)
        .map(key => `${key} = @${key}`)
        .join(', ');

      const query = `
        UPDATE itens 
        SET ${setClauses}
        OUTPUT INSERTED.*
        WHERE id = @id
      `;

      const result = await executeQuery<Item>(query, { ...validated, id });

      if (result.recordset.length === 0) {
        return successResponse({ error: 'Item não encontrado' }, 404);
      }

      return successResponse(result.recordset[0]);
    }

    // DELETE /api/itens/{id} - Delete item
    if (method === 'DELETE' && id) {
      const query = 'DELETE FROM itens WHERE id = @id';
      await executeQuery(query, { id });
      return successResponse({ message: 'Item excluído com sucesso' });
    }

    return successResponse({ error: 'Método não permitido' }, 405);
  } catch (error) {
    return handleError(error, context);
  }
}

app.http('itens', {
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'itens/{id?}',
  handler: itensHandler,
});
