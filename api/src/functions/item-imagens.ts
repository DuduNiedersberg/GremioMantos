import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { executeQuery } from '../lib/database';
import { handleError, successResponse } from '../middleware/errorHandler';
import { handlePreflight } from '../lib/cors';
import { protectedRoute, JWTPayload } from '../middleware/auth';

async function itemImagensHandler(request: HttpRequest, context: InvocationContext, user: JWTPayload): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin') || undefined;

  try {
    const method = request.method;
    const itemId = request.params.itemId;
    const imagemId = request.params.imagemId;

    if (!itemId) {
      return successResponse({ error: 'Item ID é obrigatório' }, 400, origin);
    }

    // Verify item exists and user has access
    let itemWhereClause = 'WHERE id = @item_id';
    const itemParams: Record<string, any> = { item_id: itemId };

    if (user.tipo !== 'platform_admin') {
      itemWhereClause += ' AND tenant_id = @tenant_id';
      itemParams.tenant_id = user.tenantId;
    }

    const itemCheck = await executeQuery<any>(
      `SELECT id FROM itens ${itemWhereClause}`,
      itemParams
    );

    if (itemCheck.recordset.length === 0) {
      return successResponse({ error: 'Item não encontrado' }, 404, origin);
    }

    // GET /api/itens/{itemId}/imagens - List all images for item
    if (method === 'GET' && !imagemId) {
      const query = `
        SELECT id, item_id, url_blob, thumbnail_url, nome_arquivo, 
               tamanho_bytes, tipo_mime, e_principal, uploaded_em
        FROM imagens
        WHERE item_id = @item_id
        ORDER BY e_principal DESC, uploaded_em DESC
      `;
      const result = await executeQuery<any>(query, { item_id: itemId });
      
      return successResponse({ data: result.recordset }, 200, origin);
    }

    // PATCH /api/itens/{itemId}/imagens/{imagemId}/principal - Set main image
    if (method === 'PATCH' && imagemId && request.url.includes('/principal')) {
      // First, remove e_principal from all images of this item
      await executeQuery(
        'UPDATE imagens SET e_principal = 0 WHERE item_id = @item_id',
        { item_id: itemId }
      );

      // Set the selected image as principal
      const updateResult = await executeQuery(
        'UPDATE imagens SET e_principal = 1 WHERE id = @imagem_id AND item_id = @item_id',
        { imagem_id: imagemId, item_id: itemId }
      );

      if (updateResult.rowsAffected[0] === 0) {
        return successResponse({ error: 'Imagem não encontrada' }, 404, origin);
      }

      return successResponse({ 
        message: 'Imagem definida como principal',
        imagem_id: parseInt(imagemId, 10)
      }, 200, origin);
    }

    // DELETE /api/itens/{itemId}/imagens/{imagemId} - Delete image
    if (method === 'DELETE' && imagemId) {
      const deleteResult = await executeQuery(
        'DELETE FROM imagens WHERE id = @imagem_id AND item_id = @item_id',
        { imagem_id: imagemId, item_id: itemId }
      );

      if (deleteResult.rowsAffected[0] === 0) {
        return successResponse({ error: 'Imagem não encontrada' }, 404, origin);
      }

      return successResponse({ message: 'Imagem removida com sucesso' }, 200, origin);
    }

    return successResponse({ error: 'Método não permitido' }, 405, origin);
  } catch (error) {
    return handleError(error, context, origin);
  }
}

async function itemImagensHandlerWrapper(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin') || undefined;

  if (request.method === 'OPTIONS') {
    return handlePreflight(origin);
  }

  return protectedRoute(itemImagensHandler)(request, context);
}

app.http('item-imagens', {
  methods: ['GET', 'PATCH', 'DELETE', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'itens/{itemId}/imagens/{imagemId?}/principal?',
  handler: itemImagensHandlerWrapper,
});
