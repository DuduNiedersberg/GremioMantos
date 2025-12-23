import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { executeQuery } from '../lib/database';
import { handleError, addCorsHeaders } from '../middleware/errorHandler';
import * as QRCode from 'qrcode';

async function qrcodeHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const itemId = request.params.itemId;

    if (!itemId) {
      return addCorsHeaders({
        status: 400,
        jsonBody: { error: 'Item ID é obrigatório' },
      });
    }

    // Get item details
    const query = 'SELECT * FROM itens WHERE id = @itemId';
    const result = await executeQuery(query, { itemId });

    if (result.recordset.length === 0) {
      return addCorsHeaders({
        status: 404,
        jsonBody: { error: 'Item não encontrado' },
      });
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
      url: `https://dudniedersberg.github.io/GremioMantos/itens/${item.id}`,
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
    });
  } catch (error) {
    return handleError(error, context);
  }
}

app.http('qrcode', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'itens/{itemId}/qrcode',
  handler: qrcodeHandler,
});
