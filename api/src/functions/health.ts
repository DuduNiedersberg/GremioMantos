import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { addCorsHeaders } from '../middleware/cors';
import { getConnection } from '../lib/database';

async function healthHandler(_request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('Health check requested');

  try {
    // Test database connection
    const pool = await getConnection();
    const result = await pool.request().query('SELECT 1 as test');
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: result.recordset.length > 0 ? 'connected' : 'disconnected',
      version: '1.0.0',
      service: 'Bolicho do Grêmio - Vale dos Sinos API',
    };

    return addCorsHeaders({
      status: 200,
      jsonBody: health,
    });
  } catch (error) {
    context.error('Health check failed:', error);
    return addCorsHeaders({
      status: 503,
      jsonBody: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}

app.http('health', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'health',
  handler: healthHandler,
});
