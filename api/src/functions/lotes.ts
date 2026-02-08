import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { executeQuery } from '../lib/database';
import { handleError, successResponse } from '../middleware/errorHandler';
import { handlePreflight } from '../lib/cors';
import { loteSchema, safeParseJson, clampPagination } from '../lib/utils';
import { Lote } from '../lib/types';
import { protectedRoute, JWTPayload } from '../middleware/auth';

async function lotesHandler(request: HttpRequest, context: InvocationContext, user: JWTPayload): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin') || undefined;

  try {
    const method = request.method;
    const id = request.params.id;

    // GET /api/lotes - List all batches
    if (method === 'GET' && !id) {
      const rawPage = parseInt(request.query.get('page') || '1');
      const rawPerPage = parseInt(request.query.get('perPage') || '30');
      const { page, perPage } = clampPagination(rawPage, rawPerPage);
      const offset = (page - 1) * perPage;

      const isPlatformAdmin = user.tipo === 'platform_admin';
      const tenantFilter = isPlatformAdmin ? '' : ' WHERE tenant_id = @tenant_id';
      const countQuery = `SELECT COUNT(*) as total FROM lotes${tenantFilter}`;
      const countParams = isPlatformAdmin ? {} : { tenant_id: user.tenantId };
      const countResult = await executeQuery<{ total: number }>(countQuery, countParams);
      const total = countResult.recordset[0].total;

      const query = `
        SELECT * FROM lotes${tenantFilter}
        ORDER BY data_aquisicao DESC
        OFFSET ${offset} ROWS FETCH NEXT ${perPage} ROWS ONLY
      `;

      const result = await executeQuery<Lote>(query, countParams);

      return successResponse({
        data: result.recordset,
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      }, 200, origin);
    }

    // GET /api/lotes/{id} - Get single batch with items
    if (method === 'GET' && id) {
      const isPlatformAdmin = user.tipo === 'platform_admin';
      const tenantFilter = isPlatformAdmin ? '' : ' AND tenant_id = @tenant_id';
      const loteQuery = `SELECT * FROM lotes WHERE id = @id${tenantFilter}`;
      const params = isPlatformAdmin ? { id } : { id, tenant_id: user.tenantId };
      const loteResult = await executeQuery<Lote>(loteQuery, params);

      if (loteResult.recordset.length === 0) {
        return successResponse({ error: 'Lote não encontrado' }, 404, origin);
      }

      const itensQuery = 'SELECT * FROM itens WHERE lote_id = @id';
      const itensResult = await executeQuery(itensQuery, { id });

      return successResponse({
        ...loteResult.recordset[0],
        itens: itensResult.recordset,
      }, 200, origin);
    }

    // POST /api/lotes - Create new batch
    if (method === 'POST') {
      const body = await safeParseJson(request);
      const validated = loteSchema.parse(body);

      const tenantId = user.tipo === 'platform_admin' && (validated as any).tenant_id 
        ? (validated as any).tenant_id 
        : user.tenantId;

      const query = `
        INSERT INTO lotes (
          nome, quantidade_total, quantidade_disponivel, 
          valor_unitario_compra, data_aquisicao, observacoes, tenant_id
        )
        OUTPUT INSERTED.*
        VALUES (
          @nome, @quantidade_total, @quantidade_disponivel,
          @valor_unitario_compra, @data_aquisicao, @observacoes, @tenant_id
        )
      `;

      const result = await executeQuery<Lote>(query, {
        ...validated,
        data_aquisicao: validated.data_aquisicao || new Date().toISOString().split('T')[0],
        tenant_id: tenantId,
      });

      return successResponse(result.recordset[0], 201, origin);
    }

    // PUT /api/lotes/{id} - Update batch
    if (method === 'PUT' && id) {
      const body = await safeParseJson(request) as Record<string, unknown>;
      
      // Manual validation for partial updates (can't use partial() with refined schemas)
      type PartialLote = Partial<{
        nome: string;
        quantidade_total: number;
        quantidade_disponivel: number;
        valor_unitario_compra: number;
        data_aquisicao: string;
        observacoes: string;
      }>;
      
      const allowedFields: (keyof PartialLote)[] = ['nome', 'quantidade_total', 'quantidade_disponivel', 'valor_unitario_compra', 'data_aquisicao', 'observacoes'];
      const validated: PartialLote = {};
      
      for (const key of allowedFields) {
        if (key in body) {
          validated[key] = body[key] as any;
        }
      }
      
      // Validate quantity constraint if both fields are present or being updated
      const isPlatformAdmin = user.tipo === 'platform_admin';
      const tenantFilter = isPlatformAdmin ? '' : ' AND tenant_id = @tenant_id';
      const existingQuery = `SELECT quantidade_total, quantidade_disponivel FROM lotes WHERE id = @id${tenantFilter}`;
      const params = isPlatformAdmin ? { id } : { id, tenant_id: user.tenantId };
      const existingResult = await executeQuery<Lote>(existingQuery, params);
      
      if (existingResult.recordset.length === 0) {
        return successResponse({ error: 'Lote não encontrado' }, 404, origin);
      }
      
      const existing = existingResult.recordset[0];
      const finalQuantidadeTotal = validated.quantidade_total !== undefined ? validated.quantidade_total : existing.quantidade_total;
      const finalQuantidadeDisponivel = validated.quantidade_disponivel !== undefined ? validated.quantidade_disponivel : existing.quantidade_disponivel;
      
      if (finalQuantidadeDisponivel !== undefined && 
          finalQuantidadeTotal !== undefined && 
          finalQuantidadeDisponivel > finalQuantidadeTotal) {
        return successResponse({
          error: 'Validação falhou',
          message: 'quantidade_disponivel não pode ser maior que quantidade_total',
        }, 400, origin);
      }

      const setClauses = Object.keys(validated)
        .map(key => `${key} = @${key}`)
        .join(', ');

      if (setClauses) {
        const query = `
          UPDATE lotes 
          SET ${setClauses}
          OUTPUT INSERTED.*
          WHERE id = @id${tenantFilter}
        `;

        const result = await executeQuery<Lote>(query, { ...validated, ...params });

        if (result.recordset.length === 0) {
          return successResponse({ error: 'Lote não encontrado' }, 404, origin);
        }

        return successResponse(result.recordset[0], 200, origin);
      }

      // If no fields to update, fetch and return current record
      const getQuery = `SELECT * FROM lotes WHERE id = @id${tenantFilter}`;
      const getResult = await executeQuery<Lote>(getQuery, params);
      
      if (getResult.recordset.length === 0) {
        return successResponse({ error: 'Lote não encontrado' }, 404, origin);
      }

      return successResponse(getResult.recordset[0], 200, origin);
    }

    // DELETE /api/lotes/{id} - Delete batch
    if (method === 'DELETE' && id) {
      const isPlatformAdmin = user.tipo === 'platform_admin';
      const tenantFilter = isPlatformAdmin ? '' : ' AND tenant_id = @tenant_id';
      const params = isPlatformAdmin ? { id } : { id, tenant_id: user.tenantId };
      
      // First, unlink items from this batch
      await executeQuery('UPDATE itens SET lote_id = NULL WHERE lote_id = @id', { id });
      
      const query = `DELETE FROM lotes WHERE id = @id${tenantFilter}`;
      await executeQuery(query, params);
      
      return successResponse({ message: 'Lote excluído com sucesso' }, 200, origin);
    }

    return successResponse({ error: 'Método não permitido' }, 405, origin);
  } catch (error) {
    return handleError(error, context, origin);
  }
}

async function lotesHandlerWrapper(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin') || undefined;
  
  if (request.method === 'OPTIONS') {
    return handlePreflight(origin);
  }
  
  return protectedRoute(lotesHandler)(request, context);
}

app.http('lotes', {
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'lotes/{id?}',
  handler: lotesHandlerWrapper,
});
