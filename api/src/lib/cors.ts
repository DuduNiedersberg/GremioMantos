import { HttpResponseInit } from '@azure/functions';

/**
 * Origens permitidas para CORS
 */
const ALLOWED_ORIGINS = [
  'https://duduniedersberg.github.io',
  'http://localhost:5173',
  'http://localhost:3000',
];

/**
 * Headers CORS padrão
 */
export const CORS_HEADERS = {
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
};

/**
 * Adiciona headers CORS à resposta HTTP
 * Valida a origem contra lista de permitidas
 */
export function addCorsHeaders(
  response: HttpResponseInit,
  origin?: string
): HttpResponseInit {
  // Only add CORS headers if origin is valid and in allowed list
  // Otherwise, default to first allowed origin (GitHub Pages) for server-to-server calls
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) 
    ? origin 
    : ALLOWED_ORIGINS[0];

  return {
    ...response,
    headers: {
      ...response.headers,
      'Access-Control-Allow-Origin': allowedOrigin,
      ...CORS_HEADERS,
    },
  };
}

/**
 * Manipula requisições OPTIONS (preflight)
 */
export function handlePreflight(origin?: string): HttpResponseInit {
  // Only add CORS headers if origin is valid and in allowed list
  // Otherwise, default to first allowed origin (GitHub Pages) for server-to-server calls
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) 
    ? origin 
    : ALLOWED_ORIGINS[0];

  return {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin,
      ...CORS_HEADERS,
    },
  };
}
