import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { executeQuery } from '../lib/database';
import { handleError, successResponse } from '../middleware/errorHandler';
import { handlePreflight } from '../lib/cors';
import { itemSchema, safeParseJson, clampPagination } from '../lib/utils';
import { protectedRoute, JWTPayload } from '../middleware/auth';

async function itensHandler(request: HttpRequest, context: InvocationContext, user: JWTPayload): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin') || undefined;

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

      if (user.tipo !== 'platform_admin') {
        whereClause += ' AND tenant_id = @tenant_id';
        params.tenant_id = user.tenantId;
      }

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
          i.id, i.tipo, i.nome, i.ano, i.modelo, i.marca, i.jogador, 
          i.numero_camisa, i.tamanho, i.cor_principal, i.condicao, 
          i.autografada, i.autografo_descricao, i.valor_compra, i.valor_venda, 
          i.lucro_calculado, i.situacao, i.destino, i.data_aquisicao, i.data_saida, 
          i.observacoes, i.criado_em, i.atualizado_em, i.lote_id, i.valor_mercado,
          img.url_blob as imagem_principal_url,
          img.thumbnail_url as imagem_principal_thumbnail
        FROM itens i
        LEFT JOIN imagens img ON img.item_id = i.id AND img.e_principal = 1
        ${whereClause}
        ORDER BY i.criado_em DESC
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
      let whereClause = 'WHERE id = @id';
      const params: Record<string, any> = { id };

      if (user.tipo !== 'platform_admin') {
        whereClause += ' AND tenant_id = @tenant_id';
        params.tenant_id = user.tenantId;
      }

      const query = `
        SELECT 
          i.id, i.tipo, i.nome, i.ano, i.modelo, i.marca, i.jogador, 
          i.numero_camisa, i.tamanho, i.cor_principal, i.condicao, 
          i.autografada, i.autografo_descricao, i.valor_compra, i.valor_venda, 
          i.lucro_calculado, i.situacao, i.destino, i.data_aquisicao, i.data_saida, 
          i.observacoes, i.criado_em, i.atualizado_em, i.lote_id, i.valor_mercado,
          img.url_blob as imagem_principal_url,
          img.thumbnail_url as imagem_principal_thumbnail
        FROM itens i
        LEFT JOIN imagens img ON img.item_id = i.id AND img.e_principal = 1
        ${whereClause}
      `;
      const result = await executeQuery<any>(query, params);

      if (result.recordset.length === 0) {
        return successResponse({ error: 'Item não encontrado' }, 404, origin);
      }

      // Get all images for the item
      const imagensQuery = `
        SELECT id, item_id, url_blob, thumbnail_url, nome_arquivo, 
               tamanho_bytes, tipo_mime, e_principal, uploaded_em
        FROM imagens
        WHERE item_id = @id
        ORDER BY e_principal DESC, uploaded_em DESC
      `;
      const imagensResult = await executeQuery<any>(imagensQuery, { id });

      // Map numero_camisa to numero for API compatibility
      const item = {
        ...result.recordset[0],
        numero: result.recordset[0].numero_camisa,
        imagens: imagensResult.recordset,
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
        // lucro_calculado is a computed column (valor_venda - valor_compra) and should not be set explicitly
        situacao: validated.situacao,
        destino: (validated as any).destino,
        data_aquisicao: validated.data_aquisicao,
        data_saida: (validated as any).data_saida,
        observacoes: validated.observacoes,
        lote_id: validated.lote_id,
        valor_mercado: validated.valor_mercado,
        tenant_id: user.tipo === 'platform_admin' && (validated as any).tenant_id ? (validated as any).tenant_id : user.tenantId,
      };

      const query = `
        INSERT INTO itens (
          tipo, nome, ano, modelo, marca, jogador, numero_camisa, tamanho,
          cor_principal, condicao, autografada, autografo_descricao,
          valor_compra, valor_venda, situacao, destino,
          data_aquisicao, data_saida, observacoes, lote_id, valor_mercado, tenant_id
        ) 
        OUTPUT INSERTED.*
        VALUES (
          @tipo, @nome, @ano, @modelo, @marca, @jogador, @numero_camisa, @tamanho,
          @cor_principal, @condicao, @autografada, @autografo_descricao,
          @valor_compra, @valor_venda, @situacao, @destino,
          @data_aquisicao, @data_saida, @observacoes, @lote_id, @valor_mercado, @tenant_id
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
      
      // Remove lucro_calculado as it's a computed column
      delete dbParams.lucro_calculado;

      const setClauses = Object.keys(dbParams)
        .map(key => `${key} = @${key}`)
        .join(', ');

      let updateWhereClause = 'WHERE id = @id';
      const updateParams: Record<string, any> = { ...dbParams, id };

      if (user.tipo !== 'platform_admin') {
        updateWhereClause += ' AND tenant_id = @tenant_id';
        updateParams.tenant_id = user.tenantId;
      }

      const updateQuery = `
        UPDATE itens 
        SET ${setClauses}
        ${updateWhereClause}
      `;
      await executeQuery(updateQuery, updateParams);

      // Buscar o item atualizado
      let selectWhereClause = 'WHERE id = @id';
      const selectParams: Record<string, any> = { id };

      if (user.tipo !== 'platform_admin') {
        selectWhereClause += ' AND tenant_id = @tenant_id';
        selectParams.tenant_id = user.tenantId;
      }

      const selectQuery = `
        SELECT 
          id, tipo, nome, ano, modelo, marca, jogador, 
          numero_camisa, tamanho, cor_principal, condicao, 
          autografada, autografo_descricao, valor_compra, valor_venda, 
          lucro_calculado, situacao, destino, data_aquisicao, data_saida, 
          observacoes, criado_em, atualizado_em, lote_id, valor_mercado
        FROM itens 
        ${selectWhereClause}
      `;
      const result = await executeQuery<any>(selectQuery, selectParams);
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
      // Check FK: transacoes
      const checkTransacoes = await executeQuery<{ count: number }>(
        'SELECT COUNT(*) as count FROM transacoes WHERE item_id = @id',
        { id }
      );
      
      // Check FK: trocas
      const checkTrocas = await executeQuery<{ count: number }>(
        'SELECT COUNT(*) as count FROM trocas WHERE item_dado_id = @id OR item_recebido_id = @id',
        { id }
      );
      
      const totalRefs = checkTransacoes.recordset[0].count + checkTrocas.recordset[0].count;
      
      if (totalRefs > 0) {
        return successResponse({
          error: 'Não é possível excluir',
          message: `Este item possui ${checkTransacoes.recordset[0].count} transação(ões) e ${checkTrocas.recordset[0].count} troca(s). Remova as referências primeiro.`,
        }, 409, origin);
      }
      
      // historico_precos and imagens will CASCADE delete automatically
      let deleteWhereClause = 'WHERE id = @id';
      const deleteParams: Record<string, any> = { id };

      if (user.tipo !== 'platform_admin') {
        deleteWhereClause += ' AND tenant_id = @tenant_id';
        deleteParams.tenant_id = user.tenantId;
      }

      const query = `DELETE FROM itens ${deleteWhereClause}`;
      await executeQuery(query, deleteParams);
      return successResponse({ message: 'Item excluído com sucesso' }, 200, origin);
    }

    return successResponse({ error: 'Método não permitido' }, 405, origin);
  } catch (error) {
    return handleError(error, context, origin);
  }
}

async function itensHandlerWrapper(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin') || undefined;

  if (request.method === 'OPTIONS') {
    return handlePreflight(origin);
  }

  return protectedRoute(itensHandler)(request, context);
}

app.http('itens', {
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'itens/{id?}',
  handler: itensHandlerWrapper,
});
