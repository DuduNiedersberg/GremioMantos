import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { executeQuery } from '../lib/database';
import { handleError, successResponse } from '../middleware/errorHandler';
import { handlePreflight } from '../lib/cors';
import { protectedRoute, JWTPayload, requireRole } from '../middleware/auth';

async function adminMetricasHandler(request: HttpRequest, context: InvocationContext, user: JWTPayload): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin') || undefined;

  try {
    // Only platform_admin can access platform metrics
    const roleError = requireRole('platform_admin')(user);
    if (roleError) return roleError;

    const method = request.method;

    // GET /api/admin/metricas - Platform-wide metrics
    if (method === 'GET') {
      // Tenant metrics
      const tenantsQuery = `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN ativo = 1 THEN 1 ELSE 0 END) as ativos,
          SUM(CASE WHEN suspenso = 1 THEN 1 ELSE 0 END) as suspensos,
          SUM(CASE WHEN DATEDIFF(day, criado_em, GETDATE()) <= 30 THEN 1 ELSE 0 END) as novos_30d
        FROM tenants
      `;
      const tenantsResult = await executeQuery(tenantsQuery);
      const tenantsMetrics = tenantsResult.recordset[0];

      // Users metrics
      const usuariosQuery = `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN ativo = 1 THEN 1 ELSE 0 END) as ativos,
          SUM(CASE WHEN DATEDIFF(day, criado_em, GETDATE()) <= 7 THEN 1 ELSE 0 END) as novos_7d,
          SUM(CASE WHEN DATEDIFF(day, criado_em, GETDATE()) <= 30 THEN 1 ELSE 0 END) as novos_30d
        FROM usuarios
      `;
      const usuariosResult = await executeQuery(usuariosQuery);
      const usuariosMetrics = usuariosResult.recordset[0];

      // Users by type
      const usuariosPorTipoQuery = `
        SELECT 
          tipo,
          COUNT(*) as count
        FROM usuarios
        WHERE ativo = 1
        GROUP BY tipo
      `;
      const usuariosPorTipoResult = await executeQuery(usuariosPorTipoQuery);
      const usuariosPorTipo: Record<string, number> = {
        platform_admin: 0,
        tenant_admin: 0,
        tenant_member: 0,
        colecionador: 0,
      };
      usuariosPorTipoResult.recordset.forEach((row: any) => {
        usuariosPorTipo[row.tipo] = row.count;
      });

      // Items metrics
      const itensQuery = `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN situacao = 'estoque' THEN 1 ELSE 0 END) as estoque,
          SUM(CASE WHEN situacao = 'vendida' THEN 1 ELSE 0 END) as vendidos,
          SUM(CASE WHEN situacao = 'trocada' THEN 1 ELSE 0 END) as trocados
        FROM itens
      `;
      const itensResult = await executeQuery(itensQuery);
      const itensMetrics = itensResult.recordset[0];

      // Financial metrics
      const financeiroQuery = `
        SELECT 
          COUNT(CASE WHEN situacao = 'vendida' AND destino = 'venda' THEN 1 END) as total_vendas_count,
          SUM(CASE WHEN situacao = 'vendida' AND destino = 'venda' THEN COALESCE(valor_venda, 0) ELSE 0 END) as total_vendas,
          SUM(CASE WHEN situacao = 'vendida' AND destino = 'venda' THEN COALESCE(valor_compra, 0) ELSE 0 END) as total_custo,
          SUM(CASE WHEN situacao = 'vendida' AND destino = 'venda' THEN COALESCE(valor_venda, 0) - COALESCE(valor_compra, 0) ELSE 0 END) as lucro_total
        FROM itens
      `;
      const financeiroResult = await executeQuery(financeiroQuery);
      const financeiroMetrics = financeiroResult.recordset[0];
      
      const totalVendas = Number(financeiroMetrics.total_vendas) || 0;
      const totalCusto = Number(financeiroMetrics.total_custo) || 0;
      const lucroTotal = Number(financeiroMetrics.lucro_total) || 0;
      const margemMedia = totalCusto > 0 ? (lucroTotal / totalCusto) * 100 : 0;

      // Top tenants
      const topTenantsQuery = `
        SELECT TOP 10
          t.id,
          t.nome,
          t.slug,
          COUNT(i.id) as total_itens,
          SUM(CASE WHEN i.situacao = 'vendida' AND i.destino = 'venda' THEN COALESCE(i.valor_venda, 0) ELSE 0 END) as total_vendas
        FROM tenants t
        LEFT JOIN itens i ON i.tenant_id = t.id
        WHERE t.ativo = 1
        GROUP BY t.id, t.nome, t.slug
        ORDER BY total_vendas DESC
      `;
      const topTenantsResult = await executeQuery(topTenantsQuery);

      // Tenants by plan
      const tenantsPorPlanoQuery = `
        SELECT 
          COALESCE(p.codigo, t.plano, 'sem_plano') as plano,
          COUNT(t.id) as count
        FROM tenants t
        LEFT JOIN planos p ON t.plano_id = p.id
        WHERE t.ativo = 1
        GROUP BY COALESCE(p.codigo, t.plano, 'sem_plano')
        ORDER BY count DESC
      `;
      const tenantsPorPlanoResult = await executeQuery(tenantsPorPlanoQuery);

      return successResponse({
        tenants: {
          total: Number(tenantsMetrics.total) || 0,
          ativos: Number(tenantsMetrics.ativos) || 0,
          suspensos: Number(tenantsMetrics.suspensos) || 0,
          novos_30d: Number(tenantsMetrics.novos_30d) || 0,
        },
        usuarios: {
          total: Number(usuariosMetrics.total) || 0,
          ativos: Number(usuariosMetrics.ativos) || 0,
          novos_7d: Number(usuariosMetrics.novos_7d) || 0,
          novos_30d: Number(usuariosMetrics.novos_30d) || 0,
          por_tipo: usuariosPorTipo,
        },
        itens: {
          total: Number(itensMetrics.total) || 0,
          estoque: Number(itensMetrics.estoque) || 0,
          vendidos: Number(itensMetrics.vendidos) || 0,
          trocados: Number(itensMetrics.trocados) || 0,
        },
        financeiro: {
          total_vendas: totalVendas,
          lucro_total: lucroTotal,
          margem_media: margemMedia,
        },
        top_tenants: topTenantsResult.recordset,
        tenants_por_plano: tenantsPorPlanoResult.recordset,
      }, 200, origin);
    }

    return successResponse({ error: 'Método não permitido' }, 405, origin);
  } catch (error) {
    return handleError(error, context, origin);
  }
}

async function adminMetricasHandlerWrapper(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin') || undefined;

  if (request.method === 'OPTIONS') {
    return handlePreflight(origin);
  }

  return protectedRoute(adminMetricasHandler)(request, context);
}

app.http('admin-metricas', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'admin/metricas',
  handler: adminMetricasHandlerWrapper,
});
