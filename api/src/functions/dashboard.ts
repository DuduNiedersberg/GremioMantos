import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { executeQuery } from '../lib/database';
import { handleError, successResponse } from '../middleware/errorHandler';
import { handlePreflight } from '../lib/cors';
import { DashboardMetrics } from '../lib/types';

async function dashboardHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin') || undefined;

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return handlePreflight(origin);
  }

  try {
    // Get total items by situation
    const itensQuery = `
      SELECT 
        COUNT(*) as total_itens,
        SUM(CASE WHEN situacao = 'disponivel' THEN 1 ELSE 0 END) as total_disponiveis,
        SUM(CASE WHEN situacao = 'vendido' THEN 1 ELSE 0 END) as total_vendidos,
        SUM(COALESCE(valor_compra, 0)) as valor_total_investido,
        SUM(CASE WHEN situacao = 'disponivel' THEN COALESCE(valor_mercado, valor_venda, 0) ELSE 0 END) as valor_acervo_atual
      FROM itens
    `;

    const itensResult = await executeQuery(itensQuery);
    const itensData = itensResult.recordset[0];

    // Get total sales from view
    const vendasQuery = `
      SELECT 
        SUM(COALESCE(valor_venda, 0)) as valor_total_vendas,
        SUM(COALESCE(lucro_calculado, 0)) as lucro_total
      FROM dbo.vw_historico_vendas
    `;

    const vendasResult = await executeQuery(vendasQuery);
    const vendasData = vendasResult.recordset[0];

    // Get recent items
    const recentQuery = `
      SELECT TOP 5 id, nome, ano, marca, COALESCE(valor_mercado, valor_venda, 0) as valor_mercado, criado_em
      FROM itens
      ORDER BY criado_em DESC
    `;
    const recentResult = await executeQuery(recentQuery);

    // Get top value items
    const topValueQuery = `
      SELECT TOP 5 id, nome, ano, jogador, COALESCE(valor_mercado, valor_venda, 0) as valor_mercado
      FROM itens
      WHERE situacao = 'disponivel'
      ORDER BY COALESCE(valor_mercado, valor_venda, 0) DESC
    `;
    const topValueResult = await executeQuery(topValueQuery);

    // Get sales by month (last 6 months) from view
    const salesByMonthQuery = `
      SELECT 
        FORMAT(data_saida, 'yyyy-MM') as mes,
        COUNT(*) as quantidade,
        SUM(COALESCE(valor_venda, 0)) as total_vendas,
        SUM(COALESCE(lucro_calculado, 0)) as total_lucro
      FROM dbo.vw_historico_vendas
      WHERE data_saida >= DATEADD(MONTH, -6, GETDATE())
      GROUP BY FORMAT(data_saida, 'yyyy-MM')
      ORDER BY mes DESC
    `;
    const salesByMonthResult = await executeQuery(salesByMonthQuery);

    const metrics: DashboardMetrics = {
      total_itens: itensData.total_itens || 0,
      total_disponiveis: itensData.total_disponiveis || 0,
      total_vendidos: itensData.total_vendidos || 0,
      valor_total_investido: itensData.valor_total_investido || 0,
      valor_total_vendas: vendasData.valor_total_vendas || 0,
      lucro_total: vendasData.lucro_total || 0,
      valor_acervo_atual: itensData.valor_acervo_atual || 0,
    };

    return successResponse({
      metrics,
      recent_items: recentResult.recordset,
      top_value_items: topValueResult.recordset,
      sales_by_month: salesByMonthResult.recordset,
    }, 200, origin);
  } catch (error) {
    return handleError(error, context, origin);
  }
}

app.http('dashboard', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'dashboard',
  handler: dashboardHandler,
});
