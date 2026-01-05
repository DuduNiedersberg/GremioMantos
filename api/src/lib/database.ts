import sql from 'mssql';

/**
 * Database configuration with SQL Authentication support
 * Prioritizes SQL_CONNECTION_STRING if available, otherwise builds from individual env vars
 */
function getDatabaseConfig(): sql.config {
  // Option 1: Use full connection string if provided
  // Parse it to extract components since mssql doesn't accept connectionString directly
  if (process.env.SQL_CONNECTION_STRING) {
    const connStr = process.env.SQL_CONNECTION_STRING;
    
    // Extract server, database, user, password from connection string
    const serverMatch = connStr.match(/Server=([^;]+)/i);
    const databaseMatch = connStr.match(/Database=([^;]+)/i);
    const userMatch = connStr.match(/User Id=([^;]+)/i);
    const passwordMatch = connStr.match(/Password=([^;]+)/i);
    
    if (!serverMatch || !databaseMatch || !userMatch || !passwordMatch) {
      throw new Error('Invalid SQL_CONNECTION_STRING format');
    }
    
    return {
      server: serverMatch[1],
      database: databaseMatch[1],
      user: userMatch[1],
      password: passwordMatch[1],
      options: {
        encrypt: true,
        trustServerCertificate: false,
        enableArithAbort: true,
        connectTimeout: 30000,
        requestTimeout: 30000,
      },
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
      },
    };
  }

  // Option 2: Build config from individual environment variables
  const server = process.env.SQL_SERVER || 'gremio.database.windows.net';
  const database = process.env.SQL_DATABASE || 'bolicho_gremio_camisetas';
  const user = process.env.SQL_USER;
  const password = process.env.SQL_PASSWORD;

  if (!user || !password) {
    throw new Error('SQL authentication requires SQL_USER and SQL_PASSWORD environment variables, or SQL_CONNECTION_STRING');
  }

  return {
    server,
    database,
    user,
    password,
    options: {
      encrypt: true,
      trustServerCertificate: false,
      enableArithAbort: true,
      connectTimeout: 30000,
      requestTimeout: 30000,
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  };
}

const config = getDatabaseConfig();

let pool: sql.ConnectionPool | null = null;

export async function getConnection(): Promise<sql.ConnectionPool> {
  if (pool && pool.connected) {
    return pool;
  }

  try {
    pool = await sql.connect(config);
    console.log('✅ Conectado ao Azure SQL');
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
