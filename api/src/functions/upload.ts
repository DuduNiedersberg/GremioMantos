import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { protectedRoute, JWTPayload } from '../middleware/auth';
import { handleError, addCorsHeaders } from '../middleware/errorHandler';
import { handlePreflight } from '../lib/cors';
import { executeQuery } from '../lib/database';
import {
  uploadImage,
  deleteImage,
  isValidMimeType,
  getTenantIdFromFilename,
  MAX_FILE_SIZE,
} from '../lib/storage';

/**
 * Parse multipart/form-data from Azure Functions request
 * Azure Functions v4 provides the form data through request.formData()
 */
async function parseMultipartForm(request: HttpRequest): Promise<{
  file?: { buffer: Buffer; filename: string; contentType: string };
  fields: Record<string, string>;
}> {
  try {
    const formData = await request.formData();
    const fields: Record<string, string> = {};
    let file: { buffer: Buffer; filename: string; contentType: string } | undefined;

    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        // Handle file upload
        const arrayBuffer = await value.arrayBuffer();
        file = {
          buffer: Buffer.from(arrayBuffer),
          filename: value.name,
          contentType: value.type || 'application/octet-stream',
        };
      } else {
        // Handle text field
        fields[key] = value.toString();
      }
    }

    return { file, fields };
  } catch (error) {
    throw new Error('Failed to parse multipart form data');
  }
}

/**
 * POST /api/upload - Upload image with JWT authentication
 * 
 * Accepts multipart/form-data with:
 * - file (File) - required
 * - item_id (string) - optional
 * - tipo (string) - optional: 'item', 'logo_tenant', 'avatar_usuario'
 */
async function uploadHandler(
  request: HttpRequest,
  context: InvocationContext,
  user: JWTPayload
): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin') || undefined;

  try {
    context.log('Upload request from user:', user.userId);

    // Parse multipart form data
    const { file, fields } = await parseMultipartForm(request);

    if (!file) {
      return addCorsHeaders(
        {
          status: 400,
          jsonBody: {
            error: 'File is required',
            message: 'Please provide a file to upload',
          },
        },
        origin
      );
    }

    // Validate file type
    if (!isValidMimeType(file.contentType)) {
      return addCorsHeaders(
        {
          status: 400,
          jsonBody: {
            error: 'Invalid file type',
            message: 'Only JPEG, PNG, and WebP images are allowed',
          },
        },
        origin
      );
    }

    // Validate file size (5MB max)
    if (file.buffer.length > MAX_FILE_SIZE) {
      return addCorsHeaders(
        {
          status: 400,
          jsonBody: {
            error: 'File too large',
            message: `Maximum file size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
          },
        },
        origin
      );
    }

    // Extract fields
    const itemId = fields.item_id ? parseInt(fields.item_id, 10) : null;
    const tipo = fields.tipo || 'item';

    // Use tenant ID from JWT
    const tenantId = user.tenantId;
    if (!tenantId) {
      return addCorsHeaders(
        {
          status: 403,
          jsonBody: {
            error: 'Access denied',
            message: 'You must belong to a tenant to upload images',
          },
        },
        origin
      );
    }

    // Upload to Azure Blob Storage
    const uploadResult = await uploadImage(
      file.buffer,
      file.filename,
      file.contentType,
      tenantId,
      itemId,
      {
        uploadedBy: user.userId.toString(),
        tipo,
      }
    );

    // Handle different upload types
    if (tipo === 'item' && itemId) {
      // Save reference in imagens table
      await executeQuery(
        `INSERT INTO imagens (item_id, url_blob, nome_arquivo, tamanho_bytes, tipo_mime, uploaded_em)
         VALUES (@item_id, @url, @filename, @size, @contentType, GETDATE())`,
        {
          item_id: itemId,
          url: uploadResult.url,
          filename: uploadResult.filename,
          size: uploadResult.size,
          contentType: uploadResult.contentType,
        }
      );
    } else if (tipo === 'logo_tenant') {
      // Update tenant logo_url (if column exists)
      try {
        const result = await executeQuery(
          `UPDATE tenants SET logo_url = @url WHERE id = @tenant_id`,
          {
            url: uploadResult.url,
            tenant_id: tenantId,
          }
        );

        if (result.rowsAffected[0] === 0) {
          context.warn('Tenant not found for logo update:', tenantId);
        }
      } catch (error: any) {
        // Handle missing column gracefully (SQL Server error 207: Invalid column name)
        const isColumnMissing = error.number === 207 || 
                               (error.message && error.message.includes('Invalid column name'));
        if (isColumnMissing) {
          context.warn('logo_url column does not exist in tenants table');
        } else {
          throw error;
        }
      }
    } else if (tipo === 'avatar_usuario') {
      // Update user avatar_url (if column exists)
      try {
        const result = await executeQuery(
          `UPDATE usuarios SET avatar_url = @url WHERE id = @user_id`,
          {
            url: uploadResult.url,
            user_id: user.userId,
          }
        );

        if (result.rowsAffected[0] === 0) {
          context.warn('User not found for avatar update:', user.userId);
        }
      } catch (error: any) {
        // Handle missing column gracefully (SQL Server error 207: Invalid column name)
        const isColumnMissing = error.number === 207 || 
                               (error.message && error.message.includes('Invalid column name'));
        if (isColumnMissing) {
          context.warn('avatar_url column does not exist in usuarios table');
        } else {
          throw error;
        }
      }
    }

    context.log('Image uploaded successfully:', uploadResult.filename);

    return addCorsHeaders(
      {
        status: 201,
        jsonBody: {
          message: 'Imagem enviada com sucesso',
          url: uploadResult.url,
          filename: uploadResult.filename,
          size: uploadResult.size,
          contentType: uploadResult.contentType,
        },
      },
      origin
    );
  } catch (error) {
    context.error('Upload error:', error);
    return handleError(error, context, origin);
  }
}

/**
 * DELETE /api/upload - Delete image with JWT authentication and tenant isolation
 * 
 * Body: { "filename": "tenant_id/item_id/uuid.ext" }
 */
async function deleteHandler(
  request: HttpRequest,
  context: InvocationContext,
  user: JWTPayload
): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin') || undefined;

  try {
    const body = await request.json() as { filename?: string };
    const filename = body.filename;

    if (!filename || typeof filename !== 'string') {
      return addCorsHeaders(
        {
          status: 400,
          jsonBody: {
            error: 'Invalid request',
            message: 'Filename is required',
          },
        },
        origin
      );
    }

    // Extract tenant ID from filename
    const filenameTenantId = getTenantIdFromFilename(filename);

    if (!filenameTenantId) {
      return addCorsHeaders(
        {
          status: 400,
          jsonBody: {
            error: 'Invalid filename',
            message: 'Could not extract tenant ID from filename',
          },
        },
        origin
      );
    }

    // Tenant isolation: verify user belongs to the same tenant or is platform_admin
    if (user.tipo !== 'platform_admin' && user.tenantId !== filenameTenantId) {
      return addCorsHeaders(
        {
          status: 403,
          jsonBody: {
            error: 'Access denied',
            message: 'You do not have permission to delete this image',
          },
        },
        origin
      );
    }

    // Delete from blob storage
    const deleted = await deleteImage(filename);

    if (!deleted) {
      return addCorsHeaders(
        {
          status: 404,
          jsonBody: {
            error: 'Not found',
            message: 'Image not found in blob storage',
          },
        },
        origin
      );
    }

    // Remove reference from database (imagens table)
    await executeQuery(
      `DELETE FROM imagens WHERE nome_arquivo = @filename`,
      {
        filename,
      }
    );

    context.log('Image deleted successfully:', filename);

    return addCorsHeaders(
      {
        status: 200,
        jsonBody: {
          message: 'Imagem deletada com sucesso',
        },
      },
      origin
    );
  } catch (error) {
    context.error('Delete error:', error);
    return handleError(error, context, origin);
  }
}

/**
 * Main handler for upload endpoint
 * Handles POST (upload), DELETE (delete), and OPTIONS (preflight)
 */
async function uploadMainHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin') || undefined;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return handlePreflight(origin);
  }

  // Use protectedRoute for authenticated endpoints
  if (request.method === 'POST') {
    return protectedRoute(uploadHandler)(request, context);
  }

  if (request.method === 'DELETE') {
    return protectedRoute(deleteHandler)(request, context);
  }

  // Method not allowed
  return addCorsHeaders(
    {
      status: 405,
      jsonBody: {
        error: 'Method not allowed',
        message: 'Allowed methods: POST, DELETE, OPTIONS',
      },
    },
    origin
  );
}

// Register the upload endpoint
app.http('upload', {
  methods: ['POST', 'DELETE', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'upload',
  handler: uploadMainHandler,
});
