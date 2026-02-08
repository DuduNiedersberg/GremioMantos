import { HttpRequest, HttpResponseInit } from "@azure/functions"
import { verifyToken, JWTPayload } from '../lib/utils'

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
