import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { executeQuery } from '../lib/database';
import { handleError, successResponse } from '../middleware/errorHandler';
import { handlePreflight } from '../lib/cors';
import { protectedRoute, JWTPayload, requireRole } from '../middleware/auth';
import { safeParseJson } from '../lib/utils';

async function adminPlanosHandler(request: HttpRequest, context: InvocationContext, user: JWTPayload): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin') || undefined;

  try {
    // Only platform_admin can access plans management
    const roleError = requireRole('platform_admin')(user, origin);
    if (roleError) return roleError;

    const method = request.method;
    const id = request.params.id;
    const action = request.params.action;

    // GET /api/platform/planos - List all plans
    if (method === 'GET' && !id) {
      const query = `
        SELECT 
          p.*,
          (SELECT COUNT(*) FROM tenants WHERE plano_id = p.id) as total_tenants
        FROM planos p
        WHERE p.ativo = 1
        ORDER BY p.preco_mensal
      `;

      const result = await executeQuery(query);

      return successResponse({
        data: result.recordset,
      }, 200, origin);
    }

    // GET /api/platform/planos/:id - Get single plan with tenant count
    if (method === 'GET' && id) {
      const query = `
        SELECT 
          p.*,
          (SELECT COUNT(*) FROM tenants WHERE plano_id = p.id) as total_tenants
        FROM planos p
        WHERE p.id = @id
      `;

      const result = await executeQuery(query, { id });

      if (result.recordset.length === 0) {
        return successResponse({ error: 'Plano não encontrado' }, 404, origin);
      }

      // Get tenants using this plan
      const tenantsQuery = `
        SELECT 
          id, nome, slug, cidade, estado, ativo, criado_em
        FROM tenants
        WHERE plano_id = @id
        ORDER BY nome
      `;

      const tenantsResult = await executeQuery(tenantsQuery, { id });

      return successResponse({
        ...result.recordset[0],
        tenants: tenantsResult.recordset,
      }, 200, origin);
    }

    // POST /api/platform/planos - Create new plan
    if (method === 'POST') {
      const body = await safeParseJson<any>(request);

      if (!body.codigo || !body.nome) {
        return successResponse({
          error: 'Campos obrigatórios faltando',
          message: 'codigo e nome são obrigatórios',
        }, 400, origin);
      }

      // Check if codigo already exists
      const checkCodigoQuery = 'SELECT id FROM planos WHERE codigo = @codigo';
      const checkResult = await executeQuery(checkCodigoQuery, { codigo: body.codigo });
      if (checkResult.recordset.length > 0) {
        return successResponse({
          error: 'Código já existe',
          message: 'Este código de plano já está em uso',
        }, 409, origin);
      }

      const insertQuery = `
        INSERT INTO planos (
          codigo, nome, descricao, preco_mensal, taxa_comissao,
          limite_itens, limite_imagens_por_item, permite_automacoes, permite_api, ativo
        )
        OUTPUT INSERTED.*
        VALUES (
          @codigo, @nome, @descricao, @preco_mensal, @taxa_comissao,
          @limite_itens, @limite_imagens_por_item, @permite_automacoes, @permite_api, 1
        )
      `;

      const result = await executeQuery(insertQuery, {
        codigo: body.codigo,
        nome: body.nome,
        descricao: body.descricao || null,
        preco_mensal: body.preco_mensal || 0,
        taxa_comissao: body.taxa_comissao || 0,
        limite_itens: body.limite_itens || null,
        limite_imagens_por_item: body.limite_imagens_por_item || null,
        permite_automacoes: body.permite_automacoes ? 1 : 0,
        permite_api: body.permite_api ? 1 : 0,
      });

      return successResponse(result.recordset[0], 201, origin);
    }

    // PUT /api/platform/planos/:id - Update plan
    if (method === 'PUT' && id) {
      const body = await safeParseJson<any>(request);

      // Build SET clause dynamically
      const allowedFields = [
        'nome', 'descricao', 'preco_mensal', 'taxa_comissao',
        'limite_itens', 'limite_imagens_por_item', 'permite_automacoes', 'permite_api', 'ativo'
      ];
      const updates: string[] = [];
      const updateParams: Record<string, any> = { id };

      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          // Handle boolean fields
          if (field === 'permite_automacoes' || field === 'permite_api' || field === 'ativo') {
            updates.push(`${field} = @${field}`);
            updateParams[field] = body[field] ? 1 : 0;
          } else {
            updates.push(`${field} = @${field}`);
            updateParams[field] = body[field];
          }
        }
      }

      if (updates.length === 0) {
        return successResponse({ error: 'Nenhum campo para atualizar' }, 400, origin);
      }

      updates.push('atualizado_em = GETDATE()');

      const query = `
        UPDATE planos
        SET ${updates.join(', ')}
        OUTPUT INSERTED.*
        WHERE id = @id
      `;

      const result = await executeQuery(query, updateParams);

      if (result.recordset.length === 0) {
        return successResponse({ error: 'Plano não encontrado' }, 404, origin);
      }

      return successResponse(result.recordset[0], 200, origin);
    }

    // PATCH /api/platform/planos/:id/toggle-active - Toggle active status
    if (method === 'PATCH' && id && action === 'toggle-active') {
      const query = `
        UPDATE planos
        SET ativo = CASE WHEN ativo = 1 THEN 0 ELSE 1 END,
            atualizado_em = GETDATE()
        OUTPUT INSERTED.id, INSERTED.nome, INSERTED.ativo
        WHERE id = @id
      `;

      const result = await executeQuery(query, { id });

      if (result.recordset.length === 0) {
        return successResponse({ error: 'Plano não encontrado' }, 404, origin);
      }

      return successResponse({
        message: 'Status atualizado com sucesso',
        ...result.recordset[0],
      }, 200, origin);
    }

    return successResponse({ error: 'Método não permitido' }, 405, origin);
  } catch (error) {
    return handleError(error, context, origin);
  }
}

async function adminPlanosHandlerWrapper(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin') || undefined;

  if (request.method === 'OPTIONS') {
    return handlePreflight(origin);
  }

  return protectedRoute(adminPlanosHandler)(request, context);
}

app.http('admin-planos', {
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'platform/planos/{id?}/{action?}',
  handler: adminPlanosHandlerWrapper,
});
