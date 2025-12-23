import sql from 'mssql';

const config: sql.config = {
  server: process.env.SQL_SERVER || 'gremio.database.windows.net',
  database: process.env.SQL_DATABASE || 'bolicho_gremio_camisetas',
  authentication: {
    type: 'azure-active-directory-default',
  },
  options: {
    encrypt: true,
    trustServerCertificate: false,
    enableArithAbort: true,
    connectionTimeout: 30000,
    requestTimeout: 30000,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let pool: sql.ConnectionPool | null = null;

export async function getConnection(): Promise<sql.ConnectionPool> {
  if (pool && pool.connected) {
    return pool;
  }

  try {
    pool = await sql.connect(config);
    console.log('✅ Conectado ao Azure SQL com Managed Identity');
    return pool;
  } catch (error) {
    console.error('❌ Erro ao conectar ao banco:', error);
    throw new Error('Falha na conexão com o banco de dados');
  }
}

export async function closeConnection(): Promise<void> {
  if (pool) {
    await pool.close();
    pool = null;
    console.log('🔌 Conexão fechada');
  }
}

export async function executeQuery<T = any>(
  query: string,
  params?: Record<string, any>
): Promise<sql.IResult<T>> {
  const connection = await getConnection();
  const request = connection.request();

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      request.input(key, value);
    });
  }

  return await request.query<T>(query);
}
