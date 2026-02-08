import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { executeQuery } from '../lib/database';
import { handleError, successResponse } from '../middleware/errorHandler';
import { handlePreflight } from '../lib/cors';
import { protectedRoute, JWTPayload } from '../middleware/auth';

async function dashboardHandler(request: HttpRequest, context: InvocationContext, user: JWTPayload): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin') || undefined;

  try {
    const isPlatformAdmin = user.tipo === 'platform_admin';
    const tenantFilter = isPlatformAdmin ? '' : `WHERE tenant_id = '${user.tenantId}'`;
    
    // Calculate metrics from direct queries on itens table
    const metricsQuery = `
      SELECT 
        COUNT(*) as total_itens,
        SUM(CASE WHEN situacao = 'disponivel' THEN 1 ELSE 0 END) as itens_estoque,
        SUM(CASE WHEN situacao = 'vendida' AND destino = 'venda' THEN 1 ELSE 0 END) as itens_vendidos,
        SUM(CASE WHEN destino = 'troca' THEN 1 ELSE 0 END) as itens_trocados,
        SUM(CASE WHEN situacao = 'disponivel' THEN COALESCE(valor_compra, 0) ELSE 0 END) as capital_estoque,
        SUM(CASE WHEN situacao = 'vendida' AND destino = 'venda' THEN COALESCE(valor_compra, 0) ELSE 0 END) as total_investido_vendas,
        SUM(CASE WHEN situacao = 'vendida' AND destino = 'venda' THEN COALESCE(valor_venda, 0) ELSE 0 END) as total_vendas
      FROM dbo.itens
      ${tenantFilter}
    `;
    const metricsResult = await executeQuery(metricsQuery);
    
    const viewData = metricsResult.recordset[0];

    if (!viewData) {
      const metrics = {
        total_itens: 0,
        total_disponiveis: 0,
        itens_estoque: 0,
        total_vendidos: 0,
        itens_trocados: 0,
        capital_estoque: 0,
        total_investido_vendas: 0,
        valor_total_investido: 0,
        total_vendas: 0,
        valor_total_vendas: 0,
        lucro_total:  0,
        margem_media: 0,
        valor_acervo_atual:  0,
      };

      return successResponse({ metrics }, 200, origin);
    }

    const totalInvestidoVendas = Number(viewData.total_investido_vendas) || 0;
    const totalVendas = Number(viewData.total_vendas) || 0;
    const lucroTotal = totalVendas - totalInvestidoVendas;
    const margemMedia = totalInvestidoVendas > 0 ? (lucroTotal / totalInvestidoVendas) * 100 : 0;

    const metrics = {
      total_itens: Number(viewData.total_itens) || 0,
      total_disponiveis: Number(viewData.itens_estoque) || 0,
      itens_estoque: Number(viewData.itens_estoque) || 0,
      total_vendidos: Number(viewData.itens_vendidos) || 0,
      itens_vendidos: Number(viewData.itens_vendidos) || 0,
      itens_trocados:  Number(viewData.itens_trocados) || 0,
      capital_estoque: Number(viewData.capital_estoque) || 0,
      valor_acervo_atual: Number(viewData.capital_estoque) || 0,
      total_investido_vendas: totalInvestidoVendas,
      valor_total_investido: totalInvestidoVendas,
      total_vendas: totalVendas,
      valor_total_vendas:  totalVendas,
      lucro_total: lucroTotal,
      margem_media:  margemMedia,
    };

    // Recent items from itens table
    const recentQuery = `
      SELECT TOP 5 id, nome, ano, marca, valor_compra, data_aquisicao
      FROM dbo.itens
      WHERE situacao = 'disponivel' ${isPlatformAdmin ? '' : `AND tenant_id = '${user.tenantId}'`}
      ORDER BY data_aquisicao DESC
    `;
    const recentResult = await executeQuery(recentQuery);

    // Top value items from itens table
    const topValueQuery = `
      SELECT TOP 5 id, nome, ano, jogador, valor_compra
      FROM dbo.itens
      WHERE situacao = 'disponivel' ${isPlatformAdmin ? '' : `AND tenant_id = '${user.tenantId}'`}
      ORDER BY valor_compra DESC
    `;
    const topValueResult = await executeQuery(topValueQuery);

    // Sales by month from itens table
    const salesByMonthQuery = `
      SELECT 
        FORMAT(CAST(data_saida AS DATE), 'yyyy-MM') as mes,
        COUNT(*) as quantidade,
        SUM(COALESCE(valor_venda, 0)) as total_vendas,
        SUM(COALESCE(valor_venda, 0) - COALESCE(valor_compra, 0)) as total_lucro
      FROM dbo.itens
      WHERE situacao = 'vendida' AND destino = 'venda' AND data_saida IS NOT NULL ${isPlatformAdmin ? '' : `AND tenant_id = '${user.tenantId}'`}
      GROUP BY FORMAT(CAST(data_saida AS DATE), 'yyyy-MM')
      ORDER BY mes DESC
    `;
    const salesByMonthResult = await executeQuery(salesByMonthQuery);

    return successResponse({
      metrics,
      recent_items: recentResult.recordset,
      top_value_items: topValueResult.recordset,
      sales_by_month:  salesByMonthResult.recordset,
    }, 200, origin);
  } catch (error) {
    return handleError(error, context, origin);
  }
}

async function dashboardHandlerWrapper(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin') || undefined;

  if (request.method === 'OPTIONS') {
    return handlePreflight(origin);
  }

  return protectedRoute(dashboardHandler)(request, context);
}

app.http('dashboard', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'dashboard',
  handler: dashboardHandlerWrapper,
});
