import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { executeQuery } from '../lib/database';
import { handleError, successResponse } from '../middleware/errorHandler';
import { handlePreflight } from '../lib/cors';
import { protectedRoute, JWTPayload, requireRole } from '../middleware/auth';
import { safeParseJson, clampPagination } from '../lib/utils';

async function adminTenantsHandler(request: HttpRequest, context: InvocationContext, user: JWTPayload): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin') || undefined;

  try {
    // Only platform_admin can access tenant management
    const roleError = requireRole('platform_admin')(user, origin);
    if (roleError) return roleError;

    const method = request.method;
    const id = request.params.id;
    const action = request.params.action;

    // GET /api/admin/tenants - List all tenants
    if (method === 'GET' && !id) {
      const rawPage = parseInt(request.query.get('page') || '1');
      const rawPerPage = parseInt(request.query.get('perPage') || '30');
      const { page, perPage } = clampPagination(rawPage, rawPerPage);
      const search = request.query.get('search');
      const ativoFilter = request.query.get('ativo');
      const planoFilter = request.query.get('plano');
      const offset = (page - 1) * perPage;

      let whereClause = 'WHERE 1=1';
      const params: Record<string, any> = {};

      if (search) {
        whereClause += ' AND (t.nome LIKE @search OR t.slug LIKE @search OR t.cidade LIKE @search)';
        params.search = `%${search}%`;
      }

      if (ativoFilter !== null && ativoFilter !== undefined) {
        whereClause += ' AND t.ativo = @ativo';
        params.ativo = ativoFilter === '1' || ativoFilter === 'true' ? 1 : 0;
      }

      if (planoFilter) {
        whereClause += ' AND p.codigo = @plano';
        params.plano = planoFilter;
      }

      const countQuery = `SELECT COUNT(*) as total FROM tenants t ${whereClause}`;
      const countResult = await executeQuery<{ total: number }>(countQuery, params);
      const total = countResult.recordset[0].total;

      const query = `
        SELECT 
          t.*,
          p.nome as plano_nome,
          p.codigo as plano_codigo,
          (SELECT COUNT(*) FROM usuarios WHERE tenant_id = t.id) as total_usuarios,
          (SELECT COUNT(*) FROM itens WHERE tenant_id = t.id) as total_itens
        FROM tenants t
        LEFT JOIN planos p ON t.plano_id = p.id
        ${whereClause}
        ORDER BY t.criado_em DESC
        OFFSET ${offset} ROWS FETCH NEXT ${perPage} ROWS ONLY
      `;

      const result = await executeQuery(query, params);

      return successResponse({
        data: result.recordset,
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      }, 200, origin);
    }

    // GET /api/admin/tenants/:id - Get single tenant with metrics
    if (method === 'GET' && id && !action) {
      const query = `
        SELECT 
          t.*,
          p.nome as plano_nome,
          p.codigo as plano_codigo,
          p.preco_mensal,
          p.taxa_comissao,
          (SELECT COUNT(*) FROM usuarios WHERE tenant_id = t.id) as total_usuarios,
          (SELECT COUNT(*) FROM itens WHERE tenant_id = t.id) as total_itens,
          (SELECT COUNT(*) FROM transacoes WHERE tenant_id = t.id) as total_transacoes,
          (SELECT COUNT(*) FROM clientes WHERE tenant_id = t.id) as total_clientes
        FROM tenants t
        LEFT JOIN planos p ON t.plano_id = p.id
        WHERE t.id = @id
      `;

      const result = await executeQuery(query, { id });

      if (result.recordset.length === 0) {
        return successResponse({ error: 'Tenant não encontrado' }, 404, origin);
      }

      // Get recent activity
      const activityQuery = `
        SELECT TOP 10 * FROM (
          SELECT 
            'item' as tipo,
            i.nome as descricao,
            i.criado_em as data
          FROM itens i
          WHERE i.tenant_id = @id
          UNION ALL
          SELECT 
            'transacao' as tipo,
            t.tipo_transacao as descricao,
            t.criado_em as data
          FROM transacoes t
          WHERE t.tenant_id = @id
        ) combined
        ORDER BY data DESC
      `;

      const activityResult = await executeQuery(activityQuery, { id });

      return successResponse({
        ...result.recordset[0],
        recent_activity: activityResult.recordset,
      }, 200, origin);
    }

    // POST /api/admin/tenants - Create new tenant
    if (method === 'POST') {
      const body = await safeParseJson<any>(request);

      if (!body.nome || !body.slug) {
        return successResponse({
          error: 'Campos obrigatórios faltando',
          message: 'nome e slug são obrigatórios',
        }, 400, origin);
      }

      // Check if slug already exists
      const checkSlugQuery = 'SELECT id FROM tenants WHERE slug = @slug';
      const checkResult = await executeQuery(checkSlugQuery, { slug: body.slug });
      if (checkResult.recordset.length > 0) {
        return successResponse({
          error: 'Slug já existe',
          message: 'Este slug já está em uso',
        }, 409, origin);
      }

      const insertQuery = `
        INSERT INTO tenants (
          nome, slug, descricao, email, telefone, cidade, estado, 
          plano_id, cep, instagram, whatsapp, ativo
        )
        OUTPUT INSERTED.*
        VALUES (
          @nome, @slug, @descricao, @email, @telefone, @cidade, @estado,
          @plano_id, @cep, @instagram, @whatsapp, 1
        )
      `;

      const result = await executeQuery(insertQuery, {
        nome: body.nome,
        slug: body.slug,
        descricao: body.descricao || null,
        email: body.email || null,
        telefone: body.telefone || null,
        cidade: body.cidade || null,
        estado: body.estado || null,
        plano_id: body.plano_id || null,
        cep: body.cep || null,
        instagram: body.instagram || null,
        whatsapp: body.whatsapp || null,
      });

      return successResponse(result.recordset[0], 201, origin);
    }

    // PUT /api/admin/tenants/:id - Update tenant
    if (method === 'PUT' && id) {
      const body = await safeParseJson<any>(request);

      // Build SET clause dynamically
      const allowedFields = [
        'nome', 'slug', 'descricao', 'email', 'telefone', 'instagram', 'whatsapp',
        'cep', 'cidade', 'estado', 'plano_id', 'plano_customizado', 'taxa_comissao_custom',
        'ativo', 'logo_url', 'limite_usuarios', 'limite_itens'
      ];
      const updates: string[] = [];
      const updateParams: Record<string, any> = { id };

      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          updates.push(`${field} = @${field}`);
          updateParams[field] = body[field];
        }
      }

      if (updates.length === 0) {
        return successResponse({ error: 'Nenhum campo para atualizar' }, 400, origin);
      }

      updates.push('atualizado_em = GETDATE()');

      const query = `
        UPDATE tenants
        SET ${updates.join(', ')}
        OUTPUT INSERTED.*
        WHERE id = @id
      `;

      const result = await executeQuery(query, updateParams);

      if (result.recordset.length === 0) {
        return successResponse({ error: 'Tenant não encontrado' }, 404, origin);
      }

      return successResponse(result.recordset[0], 200, origin);
    }

    // PATCH /api/admin/tenants/:id/toggle-active - Toggle active status
    if (method === 'PATCH' && id && action === 'toggle-active') {
      const query = `
        UPDATE tenants
        SET ativo = CASE WHEN ativo = 1 THEN 0 ELSE 1 END,
            atualizado_em = GETDATE()
        OUTPUT INSERTED.id, INSERTED.nome, INSERTED.ativo
        WHERE id = @id
      `;

      const result = await executeQuery(query, { id });

      if (result.recordset.length === 0) {
        return successResponse({ error: 'Tenant não encontrado' }, 404, origin);
      }

      return successResponse({
        message: 'Status atualizado com sucesso',
        ...result.recordset[0],
      }, 200, origin);
    }

    // PATCH /api/admin/tenants/:id/suspend - Suspend/unsuspend tenant
    if (method === 'PATCH' && id && action === 'suspend') {
      const body = await safeParseJson<any>(request);

      if (body.suspenso === undefined) {
        return successResponse({
          error: 'Campo obrigatório faltando',
          message: 'suspenso é obrigatório',
        }, 400, origin);
      }

      const query = `
        UPDATE tenants
        SET suspenso = @suspenso,
            motivo_suspensao = @motivo_suspensao,
            atualizado_em = GETDATE()
        OUTPUT INSERTED.id, INSERTED.nome, INSERTED.suspenso, INSERTED.motivo_suspensao
        WHERE id = @id
      `;

      const result = await executeQuery(query, {
        id,
        suspenso: body.suspenso ? 1 : 0,
        motivo_suspensao: body.motivo_suspensao || null,
      });

      if (result.recordset.length === 0) {
        return successResponse({ error: 'Tenant não encontrado' }, 404, origin);
      }

      return successResponse({
        message: body.suspenso ? 'Tenant suspenso' : 'Tenant reativado',
        ...result.recordset[0],
      }, 200, origin);
    }

    return successResponse({ error: 'Método não permitido' }, 405, origin);
  } catch (error) {
    return handleError(error, context, origin);
  }
}

async function adminTenantsHandlerWrapper(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin') || undefined;

  if (request.method === 'OPTIONS') {
    return handlePreflight(origin);
  }

  return protectedRoute(adminTenantsHandler)(request, context);
}

app.http('admin-tenants', {
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'admin/tenants/{id?}/{action?}',
  handler: adminTenantsHandlerWrapper,
});
