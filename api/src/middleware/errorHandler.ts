import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { ZodError } from 'zod';
import { addCorsHeaders } from './cors';

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

export function handleError(error: unknown, context: InvocationContext): HttpResponseInit {
  context.error('Error occurred:', error);

  if (error instanceof ZodError) {
    return addCorsHeaders({
      status: 400,
      jsonBody: {
        success: false,
        error: 'Validation error',
        details: error.errors,
      },
    });
  }

  if (error instanceof ApiError) {
    return addCorsHeaders({
      status: error.statusCode,
      jsonBody: {
        success: false,
        error: error.message,
        details: error.details,
      },
    });
  }

  if (error instanceof Error) {
    return addCorsHeaders({
      status: 500,
      jsonBody: {
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
    });
  }

  return addCorsHeaders({
    status: 500,
    jsonBody: {
      success: false,
      error: 'Unknown error occurred',
    },
  });
}

export function successResponse<T>(data: T, status: number = 200): HttpResponseInit {
  return addCorsHeaders({
    status,
    jsonBody: {
      success: true,
      data,
    },
  });
}
