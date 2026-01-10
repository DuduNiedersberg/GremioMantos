import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { executeQuery } from '../lib/database';
import { handleError, successResponse } from '../middleware/errorHandler';
import { handlePreflight } from '../lib/cors';

async function dashboardHandler(request:  HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const origin = request. headers.get('origin') || undefined;

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return handlePreflight(origin);
  }

  try {
    // Get metrics from view
    const metricsQuery = 'SELECT TOP 1 * FROM dbo. vw_dashboard_metricas';
    const metricsResult = await executeQuery(metricsQuery);
    
    const metricsData = metricsResult.recordset[0] || {
      total_itens: 0,
      itens_estoque: 0,
      itens_vendidos: 0,
      itens_trocados: 0,
      capital_estoque: 0,
      total_investido_vendas:  0,
      total_vendas: 0,
      lucro_total: 0,
      margem_media: 0,
    };

    // Get recent items from available inventory view
    // Note: vw_inventario_disponivel only has:  id, nome, ano, tipo, marca, jogador, valor_compra, condicao, autografada, data_aquisicao, lote_id
    const recentQuery = `
      SELECT TOP 5 id, nome, ano, marca, valor_compra, data_aquisicao
      FROM dbo.vw_inventario_disponivel
      ORDER BY data_aquisicao DESC
    `;
    const recentResult = await executeQuery(recentQuery);

    // Get top value items from available inventory view
    // Use valor_compra as proxy for value (since valor_mercado/valor_venda not in view)
    const topValueQuery = `
      SELECT TOP 5 id, nome, ano, jogador, valor_compra
      FROM dbo.vw_inventario_disponivel
      ORDER BY valor_compra DESC
    `;
    const topValueResult = await executeQuery(topValueQuery);

    // Get sales by month (last 6 months) from view
    // vw_historico_vendas has: id, nome, ano, tipo, marca, jogador, valor_compra, valor_venda, lucro_calculado, data_saida, destino, cliente_id, cliente_nome
    const salesByMonthQuery = `
      SELECT 
        FORMAT(data_saida, 'yyyy-MM') as mes,
        COUNT(*) as quantidade,
        SUM(COALESCE(valor_venda, 0)) as total_vendas,
        SUM(COALESCE(lucro_calculado, 0)) as total_lucro
      FROM dbo. vw_historico_vendas
      WHERE data_saida >= DATEADD(MONTH, -6, GETDATE())
      GROUP BY FORMAT(data_saida, 'yyyy-MM')
      ORDER BY mes DESC
    `;
    const salesByMonthResult = await executeQuery(salesByMonthQuery);

    const metrics = {
      total_itens: metricsData.total_itens || 0,
      itens_estoque: metricsData.itens_estoque || 0,
      itens_vendidos: metricsData.itens_vendidos || 0,
      itens_trocados: metricsData.itens_trocados || 0,
      capital_estoque: metricsData.capital_estoque || 0,
      total_investido_vendas: metricsData.total_investido_vendas || 0,
      total_vendas:  metricsData.total_vendas || 0,
      lucro_total: metricsData.lucro_total || 0,
      margem_media:  metricsData.margem_media || 0,
    };

    return successResponse({
      metrics,
      recent_items:  recentResult.recordset,
      top_value_items: topValueResult.recordset,
      sales_by_month: salesByMonthResult.recordset,
    }, 200, origin);
  } catch (error) {
    return handleError(error, context, origin);
  }
}

app.http('dashboard', {
  methods: ['GET', 'OPTIONS'],
  authLevel:  'anonymous',
  route:  'dashboard',
  handler:  dashboardHandler,
});
