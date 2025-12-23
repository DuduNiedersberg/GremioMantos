import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { executeQuery } from '../lib/database';
import { handleError, successResponse } from '../middleware/errorHandler';
import { handlePreflight } from '../lib/cors';
import { wishlistSchema } from '../lib/utils';
import { WishlistItem } from '../lib/types';

async function wishlistHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin') || undefined;

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return handlePreflight(origin);
  }

  try {
    const method = request.method;
    const id = request.params.id;

    // GET /api/wishlist - List all wishlist items
    if (method === 'GET' && !id) {
      const page = parseInt(request.query.get('page') || '1');
      const perPage = parseInt(request.query.get('perPage') || '30');
      const status = request.query.get('status');
      const prioridade = request.query.get('prioridade');
      const offset = (page - 1) * perPage;

      let whereClause = 'WHERE 1=1';
      const params: Record<string, any> = {};

      if (status) {
        whereClause += ' AND status = @status';
        params.status = status;
      }

      if (prioridade) {
        whereClause += ' AND prioridade = @prioridade';
        params.prioridade = prioridade;
      }

      const countQuery = `SELECT COUNT(*) as total FROM wishlist ${whereClause}`;
      const countResult = await executeQuery<{ total: number }>(countQuery, params);
      const total = countResult.recordset[0].total;

      const query = `
        SELECT * FROM wishlist
        ${whereClause}
        ORDER BY 
          CASE prioridade
            WHEN 'urgente' THEN 1
            WHEN 'alta' THEN 2
            WHEN 'media' THEN 3
            WHEN 'baixa' THEN 4
          END,
          criado_em DESC
        OFFSET ${offset} ROWS FETCH NEXT ${perPage} ROWS ONLY
      `;

      const result = await executeQuery<WishlistItem>(query, params);

      return successResponse({
        data: result.recordset,
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      }, 200, origin);
    }

    // GET /api/wishlist/{id} - Get single wishlist item
    if (method === 'GET' && id) {
      const query = 'SELECT * FROM wishlist WHERE id = @id';
      const result = await executeQuery<WishlistItem>(query, { id });

      if (result.recordset.length === 0) {
        return successResponse({ error: 'Item não encontrado na wishlist' }, 404, origin);
      }

      return successResponse(result.recordset[0], 200, origin);
    }

    // POST /api/wishlist - Create new wishlist item
    if (method === 'POST') {
      const body = await request.json();
      const validated = wishlistSchema.parse(body);

      const query = `
        INSERT INTO wishlist (
          nome, ano, marca, modelo, jogador, tamanho, valor_estimado,
          prioridade, observacoes, status
        )
        OUTPUT INSERTED.*
        VALUES (
          @nome, @ano, @marca, @modelo, @jogador, @tamanho, @valor_estimado,
          @prioridade, @observacoes, @status
        )
      `;

      const result = await executeQuery<WishlistItem>(query, validated);
      return successResponse(result.recordset[0], 201, origin);
    }

    // PUT /api/wishlist/{id} - Update wishlist item
    if (method === 'PUT' && id) {
      const body = await request.json();
      const validated = wishlistSchema.partial().parse(body);

      const setClauses = Object.keys(validated)
        .map(key => `${key} = @${key}`)
        .join(', ');

      const query = `
        UPDATE wishlist 
        SET ${setClauses}
        OUTPUT INSERTED.*
        WHERE id = @id
      `;

      const result = await executeQuery<WishlistItem>(query, { ...validated, id });

      if (result.recordset.length === 0) {
        return successResponse({ error: 'Item não encontrado na wishlist' }, 404, origin);
      }

      return successResponse(result.recordset[0], 200, origin);
    }

    // DELETE /api/wishlist/{id} - Delete wishlist item
    if (method === 'DELETE' && id) {
      const query = 'DELETE FROM wishlist WHERE id = @id';
      await executeQuery(query, { id });
      return successResponse({ message: 'Item removido da wishlist' }, 200, origin);
    }

    return successResponse({ error: 'Método não permitido' }, 405, origin);
  } catch (error) {
    return handleError(error, context, origin);
  }
}

app.http('wishlist', {
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'wishlist/{id?}',
  handler: wishlistHandler,
});
