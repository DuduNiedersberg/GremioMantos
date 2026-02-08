import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { executeQuery } from '../lib/database';
import { handleError, successResponse } from '../middleware/errorHandler';
import { handlePreflight } from '../lib/cors';
import { protectedRoute, JWTPayload } from '../middleware/auth';
import { hashPassword, safeParseJson } from '../lib/utils';
import { z } from 'zod';

// Schema for password update
const updatePasswordSchema = z.object({
  usuario_id: z.number().int().positive().optional(), // Only platform_admin can specify
  senha: z.string().min(1, 'Senha é obrigatória'),
});

async function updatePasswordHandlerWrapper(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin') || undefined;

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return handlePreflight(origin);
  }

  // Delegate to protected handler
  return protectedRoute(updatePasswordHandler)(request, context);
}

async function updatePasswordHandler(request: HttpRequest, context: InvocationContext, user: JWTPayload): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin') || undefined;

  try {
    const method = request.method;

    // POST /api/update-password - Update password
    if (method === 'POST') {
      const body = await safeParseJson(request);
      const validated = updatePasswordSchema.parse(body);

      // Determine which user to update
      let targetUserId: number;
      
      if (validated.usuario_id && user.tipo === 'platform_admin') {
        // Platform admin can update any user's password
        targetUserId = validated.usuario_id;
      } else {
        // Regular users can only update their own password
        targetUserId = user.userId;
      }

      // Hash the password
      const senhaHash = await hashPassword(validated.senha);

      // Update the password
      const updateQuery = `
        UPDATE usuarios
        SET senha_hash = @senha_hash
        OUTPUT INSERTED.id, INSERTED.nome, INSERTED.email, INSERTED.tipo
        WHERE id = @id
      `;

      const result = await executeQuery(updateQuery, {
        id: targetUserId,
        senha_hash: senhaHash,
      });

      if (result.recordset.length === 0) {
        return successResponse({ error: 'Usuário não encontrado' }, 404, origin);
      }

      return successResponse({
        message: 'Senha atualizada com sucesso',
        usuario: result.recordset[0],
      }, 200, origin);
    }

    // PUT /api/update-password/all - Update all users' passwords (platform_admin only)
    if (method === 'PUT') {
      // Only platform_admin can use this endpoint
      if (user.tipo !== 'platform_admin') {
        return successResponse({
          error: 'Acesso negado',
          message: 'Apenas administradores da plataforma podem usar este endpoint',
        }, 403, origin);
      }

      const body: any = await safeParseJson(request);
      
      // Expect an array of { usuario_id, senha } objects
      const updates = z.array(z.object({
        usuario_id: z.number().int().positive(),
        senha: z.string().min(1),
      })).parse(body.usuarios || []);

      if (updates.length === 0) {
        return successResponse({
          error: 'Nenhum usuário para atualizar',
          message: 'Forneça um array de usuários com { usuario_id, senha }',
        }, 400, origin);
      }

      const results = [];
      for (const update of updates) {
        const senhaHash = await hashPassword(update.senha);
        
        const updateQuery = `
          UPDATE usuarios
          SET senha_hash = @senha_hash
          OUTPUT INSERTED.id, INSERTED.nome, INSERTED.email
          WHERE id = @id
        `;

        const result = await executeQuery(updateQuery, {
          id: update.usuario_id,
          senha_hash: senhaHash,
        });

        if (result.recordset.length > 0) {
          results.push({
            usuario_id: update.usuario_id,
            status: 'atualizado',
            usuario: result.recordset[0],
          });
        } else {
          results.push({
            usuario_id: update.usuario_id,
            status: 'não encontrado',
          });
        }
      }

      return successResponse({
        message: `${results.filter(r => r.status === 'atualizado').length} senha(s) atualizada(s) com sucesso`,
        results,
      }, 200, origin);
    }

    return successResponse({ error: 'Método não permitido' }, 405, origin);
  } catch (error) {
    return handleError(error, context, origin);
  }
}

app.http('updatePassword', {
  methods: ['POST', 'PUT', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'update-password',
  handler: updatePasswordHandlerWrapper,
});
