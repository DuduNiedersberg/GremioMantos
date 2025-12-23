import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { executeQuery } from '../lib/database';
import { handleError, successResponse } from '../middleware/errorHandler';
import { handlePreflight } from '../lib/cors';
import { vendaSchema } from '../lib/utils';
import { Venda } from '../lib/types';

async function vendasHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin') || undefined;

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return handlePreflight(origin);
  }

  try {
    const method = request.method;
    const id = request.params.id;

    // GET /api/vendas - List all sales
    if (method === 'GET' && !id) {
      const page = parseInt(request.query.get('page') || '1');
      const perPage = parseInt(request.query.get('perPage') || '30');
      const offset = (page - 1) * perPage;

      const countQuery = 'SELECT COUNT(*) as total FROM vendas';
      const countResult = await executeQuery<{ total: number }>(countQuery);
      const total = countResult.recordset[0].total;

      const query = `
        SELECT v.*, i.nome as item_nome, c.nome as cliente_nome
        FROM vendas v
        LEFT JOIN itens i ON v.item_id = i.id
        LEFT JOIN clientes c ON v.cliente_id = c.id
        ORDER BY v.data_venda DESC
        OFFSET ${offset} ROWS FETCH NEXT ${perPage} ROWS ONLY
      `;

      const result = await executeQuery(query);

      return successResponse({
        data: result.recordset,
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      }, 200, origin);
    }

    // GET /api/vendas/{id} - Get single sale
    if (method === 'GET' && id) {
      const query = `
        SELECT v.*, i.nome as item_nome, c.nome as cliente_nome
        FROM vendas v
        LEFT JOIN itens i ON v.item_id = i.id
        LEFT JOIN clientes c ON v.cliente_id = c.id
        WHERE v.id = @id
      `;
      const result = await executeQuery(query, { id });

      if (result.recordset.length === 0) {
        return successResponse({ error: 'Venda não encontrada' }, 404, origin);
      }

      return successResponse(result.recordset[0], 200, origin);
    }

    // POST /api/vendas - Create new sale
    if (method === 'POST') {
      const body = await request.json();
      const validated = vendaSchema.parse(body);

      // Update item status to 'vendido'
      await executeQuery('UPDATE itens SET situacao = @situacao WHERE id = @id', {
        situacao: 'vendido',
        id: validated.item_id,
      });

      const query = `
        INSERT INTO vendas (
          item_id, cliente_id, valor_venda, valor_compra, 
          data_venda, forma_pagamento, observacoes
        )
        OUTPUT INSERTED.*
        VALUES (
          @item_id, @cliente_id, @valor_venda, @valor_compra,
          @data_venda, @forma_pagamento, @observacoes
        )
      `;

      const result = await executeQuery<Venda>(query, {
        ...validated,
        data_venda: validated.data_venda || new Date().toISOString().split('T')[0],
      });

      return successResponse(result.recordset[0], 201, origin);
    }

    return successResponse({ error: 'Método não permitido' }, 405, origin);
  } catch (error) {
    return handleError(error, context, origin);
  }
}

app.http('vendas', {
  methods: ['GET', 'POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'vendas/{id?}',
  handler: vendasHandler,
});
