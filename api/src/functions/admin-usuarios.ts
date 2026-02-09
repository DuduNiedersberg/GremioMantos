import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { executeQuery } from '../lib/database';
import { handleError, successResponse } from '../middleware/errorHandler';
import { handlePreflight } from '../lib/cors';
import { protectedRoute, JWTPayload, requireRole } from '../middleware/auth';
import { safeParseJson, clampPagination, hashPassword, senhaSchema } from '../lib/utils';

async function adminUsuariosHandler(request: HttpRequest, context: InvocationContext, user: JWTPayload): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin') || undefined;

  try {
    // Role check: platform_admin or tenant_admin
    const roleError = requireRole('platform_admin', 'tenant_admin')(user);
    if (roleError) return roleError;

    const method = request.method;
    const id = request.params.id;
    const action = request.params.action;

    const isPlatformAdmin = user.tipo === 'platform_admin';

    // GET /api/admin/usuarios - List all users
    if (method === 'GET' && !id) {
      const rawPage = parseInt(request.query.get('page') || '1');
      const rawPerPage = parseInt(request.query.get('perPage') || '30');
      const { page, perPage } = clampPagination(rawPage, rawPerPage);
      const search = request.query.get('search');
      const tenantIdFilter = request.query.get('tenant_id');
      const tipoFilter = request.query.get('tipo');
      const ativoFilter = request.query.get('ativo');
      const offset = (page - 1) * perPage;

      let whereClause = 'WHERE 1=1';
      const params: Record<string, any> = {};

      // Tenant isolation
      if (!isPlatformAdmin) {
        whereClause += ' AND u.tenant_id = @user_tenant_id';
        params.user_tenant_id = user.tenantId;
      } else if (tenantIdFilter) {
        whereClause += ' AND u.tenant_id = @tenant_id';
        params.tenant_id = parseInt(tenantIdFilter);
      }

      if (search) {
        whereClause += ' AND (u.nome LIKE @search OR u.email LIKE @search)';
        params.search = `%${search}%`;
      }

      if (tipoFilter) {
        whereClause += ' AND u.tipo = @tipo';
        params.tipo = tipoFilter;
      }

      if (ativoFilter !== null && ativoFilter !== undefined) {
        whereClause += ' AND u.ativo = @ativo';
        params.ativo = ativoFilter === '1' || ativoFilter === 'true' ? 1 : 0;
      }

      const countQuery = `SELECT COUNT(*) as total FROM usuarios u ${whereClause}`;
      const countResult = await executeQuery<{ total: number }>(countQuery, params);
      const total = countResult.recordset[0].total;

      const query = `
        SELECT 
          u.id, u.nome, u.email, u.telefone, u.tipo, u.tenant_id, u.ativo,
          u.email_verificado, u.criado_em, u.ultimo_login, u.avatar_url,
          t.nome as tenant_nome, t.slug as tenant_slug
        FROM usuarios u
        LEFT JOIN tenants t ON u.tenant_id = t.id
        ${whereClause}
        ORDER BY u.criado_em DESC
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

    // GET /api/admin/usuarios/:id - Get single user
    if (method === 'GET' && id && !action) {
      let whereClause = 'WHERE u.id = @id';
      const params: Record<string, any> = { id };

      if (!isPlatformAdmin) {
        whereClause += ' AND u.tenant_id = @user_tenant_id';
        params.user_tenant_id = user.tenantId;
      }

      const query = `
        SELECT 
          u.id, u.nome, u.email, u.telefone, u.tipo, u.tenant_id, u.ativo,
          u.email_verificado, u.criado_em, u.atualizado_em, u.ultimo_login,
          u.avatar_url, u.bio, u.permissoes,
          t.nome as tenant_nome, t.slug as tenant_slug
        FROM usuarios u
        LEFT JOIN tenants t ON u.tenant_id = t.id
        ${whereClause}
      `;

      const result = await executeQuery(query, params);

      if (result.recordset.length === 0) {
        return successResponse({ error: 'Usuário não encontrado' }, 404, origin);
      }

      return successResponse(result.recordset[0], 200, origin);
    }

    // POST /api/admin/usuarios - Create user
    if (method === 'POST') {
      const body = await safeParseJson<any>(request);

      if (!body.nome || !body.email || !body.senha) {
        return successResponse({
          error: 'Campos obrigatórios faltando',
          message: 'nome, email e senha são obrigatórios',
        }, 400, origin);
      }

      // Tenant admin can only create users in their tenant
      let tenantId = body.tenant_id;
      if (!isPlatformAdmin) {
        tenantId = user.tenantId;
        // Tenant admin can only create tenant_member or colecionador
        if (body.tipo && !['tenant_member', 'colecionador'].includes(body.tipo)) {
          return successResponse({
            error: 'Permissão negada',
            message: 'Você só pode criar usuários do tipo tenant_member ou colecionador',
          }, 403, origin);
        }
      }

      // Check if email already exists
      const checkEmailQuery = 'SELECT id FROM usuarios WHERE email = @email';
      const checkResult = await executeQuery(checkEmailQuery, { email: body.email });
      if (checkResult.recordset.length > 0) {
        return successResponse({
          error: 'Email já existe',
          message: 'Este email já está cadastrado',
        }, 409, origin);
      }

      // Validate password
      const senhaValidation = senhaSchema.safeParse(body.senha);
      if (!senhaValidation.success) {
        return successResponse({
          error: 'Senha inválida',
          message: senhaValidation.error.errors[0].message,
        }, 400, origin);
      }

      // Hash password
      const senhaHash = await hashPassword(body.senha);

      const insertQuery = `
        INSERT INTO usuarios (
          nome, email, senha_hash, telefone, tipo, tenant_id, ativo
        )
        OUTPUT INSERTED.id, INSERTED.nome, INSERTED.email, INSERTED.telefone, 
               INSERTED.tipo, INSERTED.tenant_id, INSERTED.ativo, INSERTED.criado_em
        VALUES (
          @nome, @email, @senha_hash, @telefone, @tipo, @tenant_id, 1
        )
      `;

      const result = await executeQuery(insertQuery, {
        nome: body.nome,
        email: body.email,
        senha_hash: senhaHash,
        telefone: body.telefone || null,
        tipo: body.tipo || 'colecionador',
        tenant_id: tenantId,
      });

      return successResponse(result.recordset[0], 201, origin);
    }

    // PUT /api/admin/usuarios/:id - Update user
    if (method === 'PUT' && id) {
      const body = await safeParseJson<any>(request);

      let whereClause = 'WHERE id = @id';
      const updateParams: Record<string, any> = { id };

      if (!isPlatformAdmin) {
        whereClause += ' AND tenant_id = @user_tenant_id';
        updateParams.user_tenant_id = user.tenantId;
        
        // Tenant admin cannot change tipo to admin roles
        if (body.tipo && !['tenant_member', 'colecionador'].includes(body.tipo)) {
          return successResponse({
            error: 'Permissão negada',
            message: 'Você não pode alterar para este tipo de usuário',
          }, 403, origin);
        }
      }

      // Build SET clause dynamically
      const allowedFields = ['nome', 'telefone', 'tipo', 'tenant_id', 'ativo', 'bio', 'avatar_url'];
      const updates: string[] = [];
      
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
        UPDATE usuarios
        SET ${updates.join(', ')}
        OUTPUT INSERTED.id, INSERTED.nome, INSERTED.email, INSERTED.telefone,
               INSERTED.tipo, INSERTED.tenant_id, INSERTED.ativo, INSERTED.atualizado_em
        ${whereClause}
      `;

      const result = await executeQuery(query, updateParams);

      if (result.recordset.length === 0) {
        return successResponse({ error: 'Usuário não encontrado' }, 404, origin);
      }

      return successResponse(result.recordset[0], 200, origin);
    }

    // PATCH /api/admin/usuarios/:id/toggle-active - Toggle active status
    if (method === 'PATCH' && id && action === 'toggle-active') {
      let whereClause = 'WHERE id = @id';
      const params: Record<string, any> = { id };

      if (!isPlatformAdmin) {
        whereClause += ' AND tenant_id = @user_tenant_id';
        params.user_tenant_id = user.tenantId;
      }

      const query = `
        UPDATE usuarios
        SET ativo = CASE WHEN ativo = 1 THEN 0 ELSE 1 END,
            atualizado_em = GETDATE()
        OUTPUT INSERTED.id, INSERTED.ativo
        ${whereClause}
      `;

      const result = await executeQuery(query, params);

      if (result.recordset.length === 0) {
        return successResponse({ error: 'Usuário não encontrado' }, 404, origin);
      }

      return successResponse({
        message: 'Status atualizado com sucesso',
        ...result.recordset[0],
      }, 200, origin);
    }

    // PATCH /api/admin/usuarios/:id/reset-password - Reset password
    if (method === 'PATCH' && id && action === 'reset-password') {
      const body = await safeParseJson<any>(request);

      if (!body.nova_senha) {
        return successResponse({
          error: 'Campo obrigatório faltando',
          message: 'nova_senha é obrigatória',
        }, 400, origin);
      }

      // Validate new password
      const senhaValidation = senhaSchema.safeParse(body.nova_senha);
      if (!senhaValidation.success) {
        return successResponse({
          error: 'Senha inválida',
          message: senhaValidation.error.errors[0].message,
        }, 400, origin);
      }

      let whereClause = 'WHERE id = @id';
      const params: Record<string, any> = { id };

      if (!isPlatformAdmin) {
        whereClause += ' AND tenant_id = @user_tenant_id';
        params.user_tenant_id = user.tenantId;
      }

      // Hash new password
      const novaSenhaHash = await hashPassword(body.nova_senha);
      params.senha_hash = novaSenhaHash;

      const query = `
        UPDATE usuarios
        SET senha_hash = @senha_hash,
            atualizado_em = GETDATE()
        OUTPUT INSERTED.id
        ${whereClause}
      `;

      const result = await executeQuery(query, params);

      if (result.recordset.length === 0) {
        return successResponse({ error: 'Usuário não encontrado' }, 404, origin);
      }

      return successResponse({
        message: 'Senha redefinida com sucesso',
        id: result.recordset[0].id,
      }, 200, origin);
    }

    return successResponse({ error: 'Método não permitido' }, 405, origin);
  } catch (error) {
    return handleError(error, context, origin);
  }
}

async function adminUsuariosHandlerWrapper(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin') || undefined;

  if (request.method === 'OPTIONS') {
    return handlePreflight(origin);
  }

  return protectedRoute(adminUsuariosHandler)(request, context);
}

app.http('admin-usuarios', {
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'admin/usuarios/{id?}/{action?}',
  handler: adminUsuariosHandlerWrapper,
});
