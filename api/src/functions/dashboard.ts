import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { executeQuery } from '../lib/database';
import { handleError, successResponse } from '../middleware/errorHandler';
import { handlePreflight } from '../lib/cors';

async function dashboardHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin') || undefined;

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return handlePreflight(origin);
  }

  try {
    // Get metrics from view
    const metricsQuery = 'SELECT TOP 1 * FROM dbo.vw_dashboard_metricas';
    const metricsResult = await executeQuery(metricsQuery);
    
    const viewData = metricsResult.recordset[0];

    if (!viewData) {
      // If view returns no data, return zeros
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

    // Map view column names to frontend-expected names
    // View columns: total_itens, itens_estoque, itens_vendidos, itens_trocados, capital_estoque, total_investido_vendas, total_vendas, lucro_total, margem_media
    const metrics = {
      // Core counts
      total_itens: Number(viewData.total_itens) || 0,
      total_disponiveis: Number(viewData.itens_estoque) || 0, // Map itens_estoque → total_disponiveis
      itens_estoque: Number(viewData.itens_estoque) || 0,     // Also keep original name
      total_vendidos: Number(viewData.itens_vendidos) || 0,   // Map itens_vendidos → total_vendidos
      itens_vendidos: Number(viewData.itens_vendidos) || 0,   // Also keep original
      itens_trocados:  Number(viewData.itens_trocados) || 0,
      
      // Values
      capital_estoque: Number(viewData.capital_estoque) || 0,
      valor_acervo_atual: Number(viewData.capital_estoque) || 0, // Map capital_estoque → valor_acervo_atual
      
      total_investido_vendas: Number(viewData.total_investido_vendas) || 0,
      valor_total_investido: Number(viewData.total_investido_vendas) || 0, // Map for compatibility
      
      total_vendas: Number(viewData.total_vendas) || 0,
      valor_total_vendas:  Number(viewData.total_vendas) || 0, // Map for compatibility
      
      lucro_total: Number(viewData. lucro_total) || 0,
      margem_media:  Number(viewData.margem_media) || 0,
    };

    // Optional: Get recent items, top value, sales by month (frontend doesn't use them yet)
    // Keeping these for future use or if you want to add charts/lists later
    const recentQuery = `
      SELECT TOP 5 id, nome, ano, marca, valor_compra, data_aquisicao
      FROM dbo.vw_inventario_disponivel
      ORDER BY data_aquisicao DESC
    `;
    const recentResult = await executeQuery(recentQuery);

    const topValueQuery = `
      SELECT TOP 5 id, nome, ano, jogador, valor_compra
      FROM dbo.vw_inventario_disponivel
      ORDER BY valor_compra DESC
    `;
    const topValueResult = await executeQuery(topValueQuery);

    const salesByMonthQuery = `
      SELECT 
        FORMAT(CAST(data_saida AS DATE), 'yyyy-MM') as mes,
        COUNT(*) as quantidade,
        SUM(COALESCE(valor_venda, 0)) as total_vendas,
        SUM(COALESCE(lucro_calculado, 0)) as total_lucro
      FROM dbo.vw_historico_vendas
      WHERE data_saida IS NOT NULL
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

app.http('dashboard', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'dashboard',
  handler: dashboardHandler,
});
