import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions"
import sql from 'mssql'
import {
  usuarioCreateSchema,
  usuarioLoginSchema,
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken
} from '../lib/utils'

const config: sql.config = {
  server: process.env.DB_SERVER || '',
  database: process.env.DB_NAME || '',
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  options: {
    encrypt: true,
    trustServerCertificate: false
  }
}

// ============================================================================
// POST /api/auth/register — Registrar novo usuário
// ============================================================================
async function register(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const body = await request.json() as any
    const validation = usuarioCreateSchema.safeParse(body)
    
    if (!validation.success) {
      return {
        status: 400,
        jsonBody: { error: 'Dados inválidos', details: validation.error.errors }
      }
    }

    const data = validation.data
    const pool = await sql.connect(config)

    // Verificar se email já existe
    const existing = await pool
      .request()
      .input('email', sql.NVarChar, data.email)
      .query('SELECT id FROM usuarios WHERE email = @email')

    if (existing.recordset.length > 0) {
      return { status: 409, jsonBody: { error: 'Email já cadastrado' } }
    }

    // Hash da senha
    let senhaHash: string | null = null
    if (data.provider === 'local') {
      if (!data.senha) {
        return { status: 400, jsonBody: { error: 'Senha é obrigatória para autenticação local' } }
      }
      senhaHash = await hashPassword(data.senha)
    }

    // Inserir usuário
    const result = await pool
      .request()
      .input('nome', sql.NVarChar, data.nome)
      .input('email', sql.NVarChar, data.email)
      .input('telefone', sql.VarChar, data.telefone || null)
      .input('senha_hash', sql.NVarChar, senhaHash)
      .input('provider', sql.VarChar, data.provider)
      .input('provider_id', sql.NVarChar, data.provider_id || null)
      .input('tipo', sql.VarChar, data.tipo)
      .input('tenant_id', sql.Int, data.tenant_id || null)
      .query(`
        INSERT INTO usuarios (nome, email, telefone, senha_hash, provider, provider_id, tipo, tenant_id, ativo, email_verificado)
        OUTPUT INSERTED.id, INSERTED.nome, INSERTED.email, INSERTED.tipo, INSERTED.tenant_id
        VALUES (@nome, @email, @telefone, @senha_hash, @provider, @provider_id, @tipo, @tenant_id, 1, 0)
      `)

    const usuario = result.recordset[0]
    const token = generateToken({
      userId: usuario.id,
      email: usuario.email,
      tipo: usuario.tipo,
      tenantId: usuario.tenant_id,
      nome: usuario.nome
    })

    return {
      status: 201,
      jsonBody: {
        message: 'Usuário criado com sucesso',
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          tipo: usuario.tipo,
          tenant_id: usuario.tenant_id
        },
        token
      }
    }
  } catch (error: any) {
    context.error('Erro no registro:', error)
    return { status: 500, jsonBody: { error: 'Erro ao registrar usuário', details: error.message } }
  }
}

// ============================================================================
// POST /api/auth/login — Login (retorna JWT)
// ============================================================================
async function login(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const body = await request.json() as any
    const validation = usuarioLoginSchema.safeParse(body)
    
    if (!validation.success) {
      return { status: 400, jsonBody: { error: 'Dados inválidos', details: validation.error.errors } }
    }

    const { email, senha } = validation.data
    const pool = await sql.connect(config)

    const result = await pool
      .request()
      .input('email', sql.NVarChar, email)
      .query('SELECT id, nome, email, senha_hash, tipo, tenant_id, ativo, provider FROM usuarios WHERE email = @email')

    if (result.recordset.length === 0) {
      return { status: 401, jsonBody: { error: 'Email ou senha incorretos' } }
    }

    const usuario = result.recordset[0]

    if (!usuario.ativo) {
      return { status: 403, jsonBody: { error: 'Usuário desativado' } }
    }

    if (usuario.provider !== 'local') {
      return { status: 400, jsonBody: { error: `Este email está vinculado a ${usuario.provider}. Use login social.` } }
    }

    const senhaValida = await verifyPassword(senha, usuario.senha_hash)
    if (!senhaValida) {
      return { status: 401, jsonBody: { error: 'Email ou senha incorretos' } }
    }

    await pool.request().input('id', sql.Int, usuario.id).query('UPDATE usuarios SET ultimo_login = GETDATE() WHERE id = @id')

    const token = generateToken({
      userId: usuario.id,
      email: usuario.email,
      tipo: usuario.tipo,
      tenantId: usuario.tenant_id,
      nome: usuario.nome
    })

    return {
      status: 200,
      jsonBody: {
        message: 'Login realizado com sucesso',
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          tipo: usuario.tipo,
          tenant_id: usuario.tenant_id
        },
        token
      }
    }
  } catch (error: any) {
    context.error('Erro no login:', error)
    return { status: 500, jsonBody: { error: 'Erro ao fazer login', details: error.message } }
  }
}

// ============================================================================
// GET /api/auth/me — Buscar usuário logado
// ============================================================================
async function me(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { status: 401, jsonBody: { error: 'Token não fornecido' } }
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    if (!payload) {
      return { status: 401, jsonBody: { error: 'Token inválido ou expirado' } }
    }

    const pool = await sql.connect(config)
    const result = await pool
      .request()
      .input('id', sql.Int, payload.userId)
      .query(`
        SELECT u.id, u.nome, u.email, u.telefone, u.tipo, u.tenant_id, u.ativo,
               t.nome as tenant_nome, t.slug as tenant_slug
        FROM usuarios u
        LEFT JOIN tenants t ON u.tenant_id = t.id
        WHERE u.id = @id
      `)

    if (result.recordset.length === 0) {
      return { status: 404, jsonBody: { error: 'Usuário não encontrado' } }
    }

    return { status: 200, jsonBody: result.recordset[0] }
  } catch (error: any) {
    context.error('Erro ao buscar usuário:', error)
    return { status: 500, jsonBody: { error: 'Erro ao buscar usuário', details: error.message } }
  }
}

// ============================================================================
// REGISTRAR ROTAS NO AZURE FUNCTIONS
// ============================================================================
app.http('authRegister', {
  methods: ['POST'],
  route: 'auth/register',
  authLevel: 'anonymous',
  handler: register
})

app.http('authLogin', {
  methods: ['POST'],
  route: 'auth/login',
  authLevel: 'anonymous',
  handler: login
})

app.http('authMe', {
  methods: ['GET'],
  route: 'auth/me',
  authLevel: 'anonymous',
  handler: me
})
