import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions"
import sql from 'mssql'
import { getConnection } from '../lib/database'
import { protectedRoute } from '../middleware/auth'
import { handlePreflight, addCorsHeaders } from '../lib/cors'
import { JWTPayload } from '../lib/utils'

// ============================================================================
// PATCH /api/itens/{itemId}/publicar — Publicar/despublicar item na vitrine
// ============================================================================
async function publicarItem(request: HttpRequest, context: InvocationContext, user: JWTPayload): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin') || undefined

  const itemId = parseInt(request.params.itemId)
  if (isNaN(itemId)) {
    return addCorsHeaders({
      status: 400,
      jsonBody: { success: false, error: 'ID do item inválido' }
    }, origin)
  }

  try {
    const body = await request.json() as { publicado: boolean; ordem?: number }

    if (typeof body.publicado !== 'boolean') {
      return addCorsHeaders({
        status: 400,
        jsonBody: { success: false, error: 'Campo publicado é obrigatório (boolean)' }
      }, origin)
    }

    const pool = await getConnection()

    // Verificar se o item existe e respeitar tenant isolation
    const checkReq = pool.request().input('item_id', sql.Int, itemId)
    let whereClause = 'WHERE id = @item_id'
    
    // tenant_admin só pode alterar seus próprios itens
    if (user.tipo === 'tenant_admin' || user.tipo === 'tenant_member') {
      if (!user.tenantId) {
        return addCorsHeaders({
          status: 403,
          jsonBody: { success: false, error: 'Usuário sem tenant associado' }
        }, origin)
      }
      checkReq.input('tenant_id', sql.Int, user.tenantId)
      whereClause += ' AND tenant_id = @tenant_id'
    }

    const itemCheck = await checkReq.query(`SELECT id FROM itens ${whereClause}`)

    if (itemCheck.recordset.length === 0) {
      return addCorsHeaders({
        status: 404,
        jsonBody: { success: false, error: 'Item não encontrado' }
      }, origin)
    }

    // Atualizar publicado_vitrine, data_publicacao e ordem_vitrine
    const updateReq = pool.request()
      .input('item_id', sql.Int, itemId)
      .input('publicado', sql.Bit, body.publicado ? 1 : 0)

    let ordemClause = ''
    if (body.ordem !== undefined) {
      updateReq.input('ordem', sql.Int, body.ordem)
      ordemClause = ', ordem_vitrine = @ordem'
    }

    const dataPublicacaoClause = body.publicado
      ? ', data_publicacao = CASE WHEN data_publicacao IS NULL THEN GETDATE() ELSE data_publicacao END'
      : ''

    await updateReq.query(`
      UPDATE itens
      SET publicado_vitrine = @publicado${dataPublicacaoClause}${ordemClause}
      WHERE id = @item_id
    `)

    return addCorsHeaders({
      status: 200,
      jsonBody: {
        success: true,
        data: {
          id: itemId,
          publicado_vitrine: body.publicado
        }
      }
    }, origin)
  } catch (error: any) {
    context.error('Erro ao publicar item:', error)
    return addCorsHeaders({
      status: 500,
      jsonBody: { success: false, error: 'Erro ao publicar item' }
    }, origin)
  }
}

// Handler com preflight support
async function publicarItemHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin') || undefined
  if (request.method === 'OPTIONS') {
    return handlePreflight(origin)
  }
  return protectedRoute(publicarItem)(request, context)
}

// ============================================================================
// REGISTRAR ROTAS NO AZURE FUNCTIONS
// ============================================================================
app.http('vitrineAdminPublicar', {
  methods: ['PATCH', 'OPTIONS'],
  route: 'itens/{itemId}/publicar',
  authLevel: 'anonymous',
  handler: publicarItemHandler
})
