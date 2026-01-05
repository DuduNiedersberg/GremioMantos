import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { executeQuery } from '../lib/database';
import { handleError, successResponse } from '../middleware/errorHandler';
import { handlePreflight } from '../lib/cors';
import { itemSchema, safeParseJson, clampPagination } from '../lib/utils';

async function itensHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin') || undefined;

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return handlePreflight(origin);
  }

  try {
    const method = request.method;
    const id = request.params.id;

    // GET /api/itens - List all items
    if (method === 'GET' && !id) {
      const rawPage = parseInt(request.query.get('page') || '1');
      const rawPerPage = parseInt(request.query.get('perPage') || '30');
      const { page, perPage } = clampPagination(rawPage, rawPerPage);
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
        SELECT 
          id, tipo, nome, ano, modelo, marca, jogador, 
          numero_camisa, tamanho, cor_principal, condicao, 
          autografada, autografo_descricao, valor_compra, valor_venda, 
          lucro_calculado, situacao, destino, data_aquisicao, data_saida, 
          observacoes, criado_em, atualizado_em, lote_id, valor_mercado
        FROM itens 
        ${whereClause}
        ORDER BY criado_em DESC
        OFFSET ${offset} ROWS FETCH NEXT ${perPage} ROWS ONLY
      `;
      
      const result = await executeQuery<any>(query, params);
      
      // Map numero_camisa to numero for API compatibility
      const mappedData = result.recordset.map((item: any) => ({
        ...item,
        numero: item.numero_camisa,
      }));

      return successResponse({
        data: mappedData,
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      }, 200, origin);
    }

    // GET /api/itens/{id} - Get single item
    if (method === 'GET' && id) {
      const query = `
        SELECT 
          id, tipo, nome, ano, modelo, marca, jogador, 
          numero_camisa, tamanho, cor_principal, condicao, 
          autografada, autografo_descricao, valor_compra, valor_venda, 
          lucro_calculado, situacao, destino, data_aquisicao, data_saida, 
          observacoes, criado_em, atualizado_em, lote_id, valor_mercado
        FROM itens 
        WHERE id = @id
      `;
      const result = await executeQuery<any>(query, { id });

      if (result.recordset.length === 0) {
        return successResponse({ error: 'Item não encontrado' }, 404, origin);
      }

      // Map numero_camisa to numero for API compatibility
      const item = {
        ...result.recordset[0],
        numero: result.recordset[0].numero_camisa,
      };

      return successResponse(item, 200, origin);
    }

    // POST /api/itens - Create new item
    if (method === 'POST') {
      const body = await safeParseJson(request);
      const validated = itemSchema.parse(body);
      
      // Map 'numero' from API to 'numero_camisa' for DB
      const dbParams: any = {
        tipo: validated.tipo,
        nome: validated.nome,
        ano: validated.ano,
        modelo: validated.modelo,
        marca: validated.marca,
        jogador: validated.jogador,
        numero_camisa: (validated as any).numero,
        tamanho: validated.tamanho,
        cor_principal: (validated as any).cor_principal,
        condicao: (validated as any).condicao,
        autografada: (validated as any).autografada,
        autografo_descricao: (validated as any).autografo_descricao,
        valor_compra: validated.valor_compra,
        valor_venda: validated.valor_venda,
        lucro_calculado: (validated as any).lucro_calculado,
        situacao: validated.situacao,
        destino: (validated as any).destino,
        data_aquisicao: validated.data_aquisicao,
        data_saida: (validated as any).data_saida,
        observacoes: validated.observacoes,
        lote_id: validated.lote_id,
        valor_mercado: validated.valor_mercado,
      };

      const query = `
        INSERT INTO itens (
          tipo, nome, ano, modelo, marca, jogador, numero_camisa, tamanho,
          cor_principal, condicao, autografada, autografo_descricao,
          valor_compra, valor_venda, lucro_calculado, situacao, destino,
          data_aquisicao, data_saida, observacoes, lote_id, valor_mercado
        ) 
        OUTPUT INSERTED.*
        VALUES (
          @tipo, @nome, @ano, @modelo, @marca, @jogador, @numero_camisa, @tamanho,
          @cor_principal, @condicao, @autografada, @autografo_descricao,
          @valor_compra, @valor_venda, @lucro_calculado, @situacao, @destino,
          @data_aquisicao, @data_saida, @observacoes, @lote_id, @valor_mercado
        )
      `;

      const result = await executeQuery<any>(query, dbParams);
      
      // Map numero_camisa to numero for API response
      const responseItem = {
        ...result.recordset[0],
        numero: result.recordset[0].numero_camisa,
      };
      
      return successResponse(responseItem, 201, origin);
    }

    // PUT /api/itens/{id} - Update item
    if (method === 'PUT' && id) {
      const body = await safeParseJson(request);
      const validated = itemSchema.partial().parse(body);

      // Map 'numero' from API to 'numero_camisa' for DB
      const dbParams: any = { ...validated };
      if ('numero' in validated) {
        dbParams.numero_camisa = (validated as any).numero;
        delete dbParams.numero;
      }

      const setClauses = Object.keys(dbParams)
        .map(key => `${key} = @${key}`)
        .join(', ');

      const query = `
        UPDATE itens 
        SET ${setClauses}
        OUTPUT INSERTED.*
        WHERE id = @id
      `;

      const result = await executeQuery<any>(query, { ...dbParams, id });

      if (result.recordset.length === 0) {
        return successResponse({ error: 'Item não encontrado' }, 404, origin);
      }

      // Map numero_camisa to numero for API response
      const responseItem = {
        ...result.recordset[0],
        numero: result.recordset[0].numero_camisa,
      };

      return successResponse(responseItem, 200, origin);
    }

    // DELETE /api/itens/{id} - Delete item
    if (method === 'DELETE' && id) {
      const query = 'DELETE FROM itens WHERE id = @id';
      await executeQuery(query, { id });
      return successResponse({ message: 'Item excluído com sucesso' }, 200, origin);
    }

    return successResponse({ error: 'Método não permitido' }, 405, origin);
  } catch (error) {
    return handleError(error, context, origin);
  }
}

app.http('itens', {
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'itens/{id?}',
  handler: itensHandler,
});
