import { HttpResponseInit, InvocationContext } from '@azure/functions';
import { ZodError } from 'zod';
import { addCorsHeaders } from '../lib/cors';

export { addCorsHeaders };

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function handleError(error: unknown, context: InvocationContext, origin?: string): HttpResponseInit {
  context.error('Error occurred:', error);

  // Handle JSON parse errors
  if (error instanceof Error && error.message === 'Invalid JSON in request body') {
    return addCorsHeaders({
      status: 400,
      jsonBody: {
        success: false,
        error: 'Invalid JSON',
        message: 'Request body must be valid JSON',
      },
    }, origin);
  }

  if (error instanceof ZodError) {
    return addCorsHeaders({
      status: 400,
      jsonBody: {
        success: false,
        error: 'Validation error',
        details: error.errors,
      },
    }, origin);
  }

  if (error instanceof ApiError) {
    return addCorsHeaders({
      status: error.statusCode,
      jsonBody: {
        success: false,
        error: error.message,
        details: error.details,
      },
    }, origin);
  }

  if (error instanceof Error) {
    return addCorsHeaders({
      status: 500,
      jsonBody: {
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
    }, origin);
  }

  return addCorsHeaders({
    status: 500,
    jsonBody: {
      success: false,
      error: 'Unknown error occurred',
    },
  }, origin);
}

export function successResponse<T>(data: T, status: number = 200, origin?: string): HttpResponseInit {
  return addCorsHeaders({
    status,
    jsonBody: {
      success: true,
      data,
    },
  }, origin);
}
