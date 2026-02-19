import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions"
import { getConnection } from '../lib/database'
import { handlePreflight, addCorsHeaders } from '../lib/cors'
import { clampPagination } from '../lib/utils'
import sql from 'mssql'

// ============================================================================
// GET /api/vitrine/preview — 8 itens mais recentes publicados (público)
// ============================================================================
async function vitrinePreview(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin') || undefined

  if (request.method === 'OPTIONS') {
    return handlePreflight(origin)
  }

  try {
    const pool = await getConnection()
    const result = await pool
      .request()
      .query(`
        SELECT TOP 8
          v.id, v.nome, v.ano, v.marca, v.modelo, v.jogador,
          v.tamanho, v.valor_venda, v.imagem_url, v.thumbnail_url,
          v.tenant_slug, v.tenant_nome, v.data_publicacao
        FROM vw_vitrine_publica v
        ORDER BY v.data_publicacao DESC, v.id DESC
      `)

    return addCorsHeaders({
      status: 200,
      jsonBody: {
        success: true,
        data: result.recordset
      }
    }, origin)
  } catch (error: any) {
    context.error('Erro ao buscar preview da vitrine:', error)
    return addCorsHeaders({
      status: 500,
      jsonBody: { success: false, error: 'Erro ao buscar itens da vitrine' }
    }, origin)
  }
}

// ============================================================================
// GET /api/vitrine/{slug} — Info tenant + itens paginados com filtros (público)
// ============================================================================
async function vitrinePorSlug(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin') || undefined

  if (request.method === 'OPTIONS') {
    return handlePreflight(origin)
  }

  const slug = request.params.slug
  if (!slug) {
    return addCorsHeaders({
      status: 400,
      jsonBody: { success: false, error: 'Slug é obrigatório' }
    }, origin)
  }

  try {
    const pool = await getConnection()

    // Buscar tenant pelo slug
    const tenantResult = await pool
      .request()
      .input('slug', sql.VarChar, slug)
      .query(`
        SELECT id, nome, slug, vitrine_titulo, vitrine_descricao, vitrine_banner_url, vitrine_ativa
        FROM tenants
        WHERE slug = @slug AND ativo = 1
      `)

    if (tenantResult.recordset.length === 0) {
      return addCorsHeaders({
        status: 404,
        jsonBody: { success: false, error: 'Vitrine não encontrada' }
      }, origin)
    }

    const tenant = tenantResult.recordset[0]

    if (!tenant.vitrine_ativa) {
      return addCorsHeaders({
        status: 404,
        jsonBody: { success: false, error: 'Vitrine não está ativa' }
      }, origin)
    }

    // Parâmetros de paginação e filtros
    const url = new URL(request.url)
    const pageParam = parseInt(url.searchParams.get('page') || '1')
    const perPageParam = parseInt(url.searchParams.get('perPage') || '20')
    const { page, perPage } = clampPagination(pageParam, perPageParam, 100)
    const offset = (page - 1) * perPage

    const marca = url.searchParams.get('marca') || null
    const ano = url.searchParams.get('ano') ? parseInt(url.searchParams.get('ano')!) : null
    const tamanho = url.searchParams.get('tamanho') || null
    const precoMin = url.searchParams.get('preco_min') ? parseFloat(url.searchParams.get('preco_min')!) : null
    const precoMax = url.searchParams.get('preco_max') ? parseFloat(url.searchParams.get('preco_max')!) : null

    // Construir query com filtros
    const req = pool.request()
      .input('tenant_id', sql.Int, tenant.id)
      .input('offset', sql.Int, offset)
      .input('perPage', sql.Int, perPage)

    let whereExtra = ''
    if (marca) {
      req.input('marca', sql.NVarChar, marca)
      whereExtra += ' AND v.marca = @marca'
    }
    if (ano) {
      req.input('ano', sql.Int, ano)
      whereExtra += ' AND v.ano = @ano'
    }
    if (tamanho) {
      req.input('tamanho', sql.NVarChar, tamanho)
      whereExtra += ' AND v.tamanho = @tamanho'
    }
    if (precoMin !== null && !isNaN(precoMin)) {
      req.input('preco_min', sql.Decimal(10, 2), precoMin)
      whereExtra += ' AND v.valor_venda >= @preco_min'
    }
    if (precoMax !== null && !isNaN(precoMax)) {
      req.input('preco_max', sql.Decimal(10, 2), precoMax)
      whereExtra += ' AND v.valor_venda <= @preco_max'
    }

    const itensResult = await req.query(`
      SELECT
        v.id, v.nome, v.ano, v.marca, v.modelo, v.jogador,
        v.tamanho, v.valor_venda, v.imagem_url, v.thumbnail_url,
        v.data_publicacao, v.ordem_vitrine
      FROM vw_vitrine_publica v
      WHERE v.tenant_id = @tenant_id${whereExtra}
      ORDER BY v.ordem_vitrine ASC, v.data_publicacao DESC, v.id DESC
      OFFSET @offset ROWS FETCH NEXT @perPage ROWS ONLY
    `)

    // Contar total
    const countReq = pool.request().input('tenant_id', sql.Int, tenant.id)
    let whereCount = ''
    if (marca) { countReq.input('marca_c', sql.NVarChar, marca); whereCount += ' AND v.marca = @marca_c' }
    if (ano) { countReq.input('ano_c', sql.Int, ano); whereCount += ' AND v.ano = @ano_c' }
    if (tamanho) { countReq.input('tamanho_c', sql.NVarChar, tamanho); whereCount += ' AND v.tamanho = @tamanho_c' }
    if (precoMin !== null && !isNaN(precoMin)) { countReq.input('preco_min_c', sql.Decimal(10, 2), precoMin); whereCount += ' AND v.valor_venda >= @preco_min_c' }
    if (precoMax !== null && !isNaN(precoMax)) { countReq.input('preco_max_c', sql.Decimal(10, 2), precoMax); whereCount += ' AND v.valor_venda <= @preco_max_c' }

    const countResult = await countReq.query(`
      SELECT COUNT(*) as total FROM vw_vitrine_publica v
      WHERE v.tenant_id = @tenant_id${whereCount}
    `)
    const total = countResult.recordset[0].total

    return addCorsHeaders({
      status: 200,
      jsonBody: {
        success: true,
        data: {
          tenant: {
            nome: tenant.nome,
            slug: tenant.slug,
            vitrine_titulo: tenant.vitrine_titulo,
            vitrine_descricao: tenant.vitrine_descricao,
            vitrine_banner_url: tenant.vitrine_banner_url,
          },
          itens: itensResult.recordset,
          pagination: {
            page,
            perPage,
            total,
            totalPages: Math.ceil(total / perPage)
          }
        }
      }
    }, origin)
  } catch (error: any) {
    context.error('Erro ao buscar vitrine:', error)
    return addCorsHeaders({
      status: 500,
      jsonBody: { success: false, error: 'Erro ao buscar vitrine' }
    }, origin)
  }
}

// ============================================================================
// REGISTRAR ROTAS NO AZURE FUNCTIONS
// ============================================================================
app.http('vitrinePublica', {
  methods: ['GET', 'OPTIONS'],
  route: 'vitrine/{slug}',
  authLevel: 'anonymous',
  handler: async (request, context) => {
    const slug = request.params.slug;
    
    if (slug === 'preview') {
      return vitrinePreview(request, context);   // ← despacha pro handler certo
    }
    
    return vitrinePorSlug(request, context);     // ← slug real de tenant
  }
})
