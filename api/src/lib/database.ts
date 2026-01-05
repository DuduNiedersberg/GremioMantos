import sql from 'mssql';

/**
 * Parse SQL connection string to extract credentials
 * Supports common formats for Server, Database, User Id/ID, and Password
 */
function parseConnectionString(connStr: string): {
  server: string;
  database: string;
  user: string;
  password: string;
} | null {
  try {
    // Parse connection string parts (case-insensitive)
    const parts: Record<string, string> = {};
    const pairs = connStr.split(';').filter(p => p.trim());
    
    for (const pair of pairs) {
      const equalIndex = pair.indexOf('=');
      if (equalIndex > 0) {
        const key = pair.substring(0, equalIndex).trim().toLowerCase();
        const value = pair.substring(equalIndex + 1).trim();
        parts[key] = value;
      }
    }
    
    // Extract server (may be 'server' or 'data source')
    const server = parts['server'] || parts['data source'];
    // Extract database (may be 'database' or 'initial catalog')
    const database = parts['database'] || parts['initial catalog'];
    // Extract user (may be 'user id' or 'uid')
    const user = parts['user id'] || parts['uid'];
    // Extract password (may be 'password' or 'pwd')
    const password = parts['password'] || parts['pwd'];
    
    if (!server || !database || !user || !password) {
      return null;
    }
    
    return { server, database, user, password };
  } catch (error) {
    return null;
  }
}

/**
 * Database configuration with SQL Authentication support
 * Prioritizes SQL_CONNECTION_STRING if available, otherwise builds from individual env vars
 */
function getDatabaseConfig(): sql.config {
  // Option 1: Use full connection string if provided
  if (process.env.SQL_CONNECTION_STRING) {
    const parsed = parseConnectionString(process.env.SQL_CONNECTION_STRING);
    
    if (!parsed) {
      throw new Error('Invalid SQL_CONNECTION_STRING format. Expected format: Server=<server>;Database=<database>;User Id=<user>;Password=<password>');
    }
    
    return {
      server: parsed.server,
      database: parsed.database,
      user: parsed.user,
      password: parsed.password,
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
