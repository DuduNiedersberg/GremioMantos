import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { executeQuery } from '../lib/database';
import { handleError, addCorsHeaders } from '../middleware/errorHandler';
import { handlePreflight } from '../lib/cors';
import { protectedRoute, JWTPayload } from '../middleware/auth';
import * as QRCode from 'qrcode';

async function qrcodeHandler(request: HttpRequest, context: InvocationContext, user: JWTPayload): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin') || undefined;

  try {
    const itemId = request.params.itemId;

    if (!itemId) {
      return addCorsHeaders({
        status: 400,
        jsonBody: { error: 'Item ID é obrigatório' },
      }, origin);
    }

    // Get item details with tenant isolation
    let query = 'SELECT * FROM itens WHERE id = @itemId';
    const params: any = { itemId };
    
    if (user.tipo !== 'platform_admin') {
      query += ' AND tenant_id = @tenant_id';
      params.tenant_id = user.tenantId;
    }
    
    const result = await executeQuery(query, params);

    if (result.recordset.length === 0) {
      return addCorsHeaders({
        status: 404,
        jsonBody: { error: 'Item não encontrado' },
      }, origin);
    }

    const item = result.recordset[0];

    // Create QR code data
    const qrData = {
      id: item.id,
      nome: item.nome,
      ano: item.ano,
      marca: item.marca,
      modelo: item.modelo,
      jogador: item.jogador,
      url: `https://duduniedersberg.github.io/GremioMantos/itens/${item.id}`,
    };

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    return addCorsHeaders({
      status: 200,
      jsonBody: {
        success: true,
        data: {
          qrCode: qrCodeDataUrl,
          item: qrData,
        },
      },
    }, origin);
  } catch (error) {
    return handleError(error, context, origin);
  }
}

async function qrcodeHandlerWrapper(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin') || undefined;

  if (request.method === 'OPTIONS') {
    return handlePreflight(origin);
  }

  return protectedRoute(qrcodeHandler)(request, context);
}

app.http('qrcode', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'itens/{itemId}/qrcode',
  handler: qrcodeHandlerWrapper,
});
