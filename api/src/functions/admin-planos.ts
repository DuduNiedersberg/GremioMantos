import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { executeQuery } from '../lib/database';
import { handleError, successResponse } from '../middleware/errorHandler';
import { handlePreflight } from '../lib/cors';
import { protectedRoute, JWTPayload, requireRole } from '../middleware/auth';

async function adminPlanosHandler(request: HttpRequest, context: InvocationContext, user: JWTPayload): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin') || undefined;

  try {
    // Only platform_admin can access plans management
    const roleError = requireRole('platform_admin')(user);
    if (roleError) return roleError;

    const method = request.method;
    const id = request.params.id;

    // GET /api/admin/planos - List all plans
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

    // GET /api/admin/planos/:id - Get single plan with tenant count
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
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'admin/planos/{id?}',
  handler: adminPlanosHandlerWrapper,
});
