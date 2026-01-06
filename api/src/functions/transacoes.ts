import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { executeQuery } from '../lib/database';
import { handleError, successResponse } from '../middleware/errorHandler';
import { handlePreflight } from '../lib/cors';
import { transacaoSchema, safeParseJson, clampPagination } from '../lib/utils';
import { Transacao } from '../lib/types';

async function transacoesHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin') || undefined;

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return handlePreflight(origin);
  }

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

      if (tipo) {
        whereClause += ' AND tipo_transacao = @tipo';
        params.tipo = tipo;
      }

      const countQuery = `SELECT COUNT(*) as total FROM transacoes ${whereClause}`;
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
      const query = `
        SELECT t.*, i.nome as item_nome, c.nome as cliente_nome
        FROM transacoes t
        LEFT JOIN itens i ON t.item_id = i.id
        LEFT JOIN clientes c ON t.cliente_id = c.id
        WHERE t.id = @id
      `;
      const result = await executeQuery<Transacao>(query, { id });

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

      // Start transaction
      const insertQuery = `
        INSERT INTO transacoes (
          tipo_transacao, item_id, cliente_id, valor, data_transacao,
          forma_pagamento, observacoes
        )
        OUTPUT INSERTED.*
        VALUES (
          @tipo_transacao, @item_id, @cliente_id, @valor, @data_transacao,
          @forma_pagamento, @observacoes
        )
      `;

      const result = await executeQuery<Transacao>(insertQuery, {
        tipo_transacao: validated.tipo_transacao,
        item_id: validated.item_id,
        cliente_id: validated.cliente_id,
        valor: validated.valor,
        data_transacao: dataTransacao,
        forma_pagamento: validated.forma_pagamento,
        observacoes: validated.observacoes,
      });

      // If this is a sale, update the item status
      if (validated.tipo_transacao === 'venda') {
        // Get current valor_compra for lucro calculation
        const itemQuery = 'SELECT valor_compra FROM itens WHERE id = @item_id';
        const itemResult = await executeQuery<{ valor_compra: number }>(itemQuery, { item_id: validated.item_id });
        const valorCompra = itemResult.recordset[0]?.valor_compra || 0;

        const updateItemQuery = `
          UPDATE itens
          SET situacao = 'vendido',
              destino = 'venda',
              data_saida = @data_saida,
              valor_venda = @valor_venda,
              lucro_calculado = @lucro_calculado
          WHERE id = @item_id
        `;

        await executeQuery(updateItemQuery, {
          item_id: validated.item_id,
          data_saida: dataTransacao,
          valor_venda: validated.valor,
          lucro_calculado: validated.valor - valorCompra,
        });
      }

      return successResponse(result.recordset[0], 201, origin);
    }

    // PUT /api/transacoes/{id} - Update transaction
    if (method === 'PUT' && id) {
      const body: any = await safeParseJson(request);
      
      // Manual validation for partial updates (can't use partial() with refined schemas)
      type PartialTransacao = Partial<{
        tipo_transacao: 'venda' | 'compra' | 'avaliacao';
        item_id: number;
        cliente_id: number;
        valor: number;
        data_transacao: string;
        forma_pagamento: string;
        observacoes: string;
      }>;
      
      const allowedFields = ['tipo_transacao', 'item_id', 'cliente_id', 'valor', 'data_transacao', 'forma_pagamento', 'observacoes'];
      const validated: PartialTransacao = {};
      
      for (const key of allowedFields) {
        if (key in body) {
          validated[key as keyof PartialTransacao] = body[key];
        }
      }

      // Get the existing transaction to check tipo_transacao
      const existingQuery = 'SELECT * FROM transacoes WHERE id = @id';
      const existingResult = await executeQuery<Transacao>(existingQuery, { id });

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
          SET ${setClauses}, atualizado_em = GETDATE()
          OUTPUT INSERTED.*
          WHERE id = @id
        `;

        const result = await executeQuery<Transacao>(updateQuery, { ...validated, id });

        // If this is a sale and valor changed, update item
        if (existingTransaction.tipo_transacao === 'venda' && validated.valor !== undefined) {
          const itemQuery = 'SELECT valor_compra FROM itens WHERE id = @item_id';
          const itemResult = await executeQuery<{ valor_compra: number }>(itemQuery, { item_id: existingTransaction.item_id });
          const valorCompra = itemResult.recordset[0]?.valor_compra || 0;

          const updateItemQuery = `
            UPDATE itens
            SET valor_venda = @valor_venda,
                lucro_calculado = @lucro_calculado
            WHERE id = @item_id
          `;

          await executeQuery(updateItemQuery, {
            item_id: existingTransaction.item_id,
            valor_venda: validated.valor,
            lucro_calculado: validated.valor - valorCompra,
          });
        }

        return successResponse(result.recordset[0], 200, origin);
      }

      return successResponse(existingTransaction, 200, origin);
    }

    // DELETE /api/transacoes/{id} - Delete transaction
    if (method === 'DELETE' && id) {
      // Get the transaction before deleting
      const getQuery = 'SELECT * FROM transacoes WHERE id = @id';
      const getResult = await executeQuery<Transacao>(getQuery, { id });

      if (getResult.recordset.length === 0) {
        return successResponse({ error: 'Transação não encontrada' }, 404, origin);
      }

      const transaction = getResult.recordset[0];

      // Delete the transaction
      const deleteQuery = 'DELETE FROM transacoes WHERE id = @id';
      await executeQuery(deleteQuery, { id });

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
            SET situacao = 'disponivel',
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
  handler: transacoesHandler,
});
