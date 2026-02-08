import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions"
import { verifyToken, JWTPayload } from '../lib/utils'

export type { JWTPayload }

export function requireAuth(request: HttpRequest): HttpResponseInit | null {
  const authHeader = request.headers.get('authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      status: 401,
      jsonBody: {
        error: 'Token não fornecido',
        message: 'Você precisa estar autenticado para acessar este recurso'
      }
    }
  }

  const token = authHeader.substring(7)
  const payload = verifyToken(token)

  if (!payload) {
    return {
      status: 401,
      jsonBody: {
        error: 'Token inválido ou expirado',
        message: 'Faça login novamente'
      }
    }
  }

  return null // Sucesso
}

export function extractUser(request: HttpRequest): JWTPayload | null {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  
  const token = authHeader.substring(7)
  return verifyToken(token)
}

export function protectedRoute(
  handler: (request: HttpRequest, context: InvocationContext, user: JWTPayload) => Promise<HttpResponseInit>
) {
  return async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    const authError = requireAuth(request)
    if (authError) return authError

    // At this point, token is valid, so extractUser will return the user
    const user = extractUser(request)!

    return handler(request, context, user)
  }
}

export function requireRole(...allowedRoles: string[]) {
  return (user: JWTPayload): HttpResponseInit | null => {
    if (!allowedRoles.includes(user.tipo)) {
      return {
        status: 403,
        jsonBody: { error: 'Acesso negado', message: 'Você não tem permissão para este recurso' }
      }
    }
    return null
  }
}
