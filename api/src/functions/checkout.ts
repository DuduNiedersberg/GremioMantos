import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import sql from 'mssql'
import { z } from 'zod'
import { getConnection } from '../lib/database'
import { handleError, successResponse } from '../middleware/errorHandler'
import { handlePreflight } from '../lib/cors'
import { protectedRoute, JWTPayload } from '../middleware/auth'
import * as asaas from '../lib/asaas'

// ============================================================================
// Zod Schemas
// ============================================================================

const checkoutSchema = z.object({
  item_ids: z.array(z.number().int().positive()).min(1).max(20),
  forma_pagamento: z.enum(['PIX', 'CREDIT_CARD']),
  endereco_id: z.number().int().positive().optional(),
  creditCard: z.object({
    holderName: z.string(),
    number: z.string(),
    expiryMonth: z.string(),
    expiryYear: z.string(),
    ccv: z.string(),
  }).optional(),
  creditCardHolderInfo: z.object({
    name: z.string(),
    email: z.string().email(),
    cpfCnpj: z.string(),
    postalCode: z.string(),
    addressNumber: z.string(),
    phone: z.string(),
  }).optional(),
})

// ============================================================================
// Helpers
// ============================================================================

/**
 * Garante que o comprador tem um customer no Asaas.
 * Cria se não existir, retorna o asaas_id.
 */
async function ensureAsaasCustomer(
  pool: sql.ConnectionPool,
  userId: number,
  nome: string,
  cpf: string,
  email: string
): Promise<string> {
  // Check local cache
  const existing = await pool.request()
    .input('usuario_id', sql.Int, userId)
    .query('SELECT asaas_id FROM asaas_clientes WHERE usuario_id = @usuario_id')

  if (existing.recordset.length > 0) {
    return existing.recordset[0].asaas_id
  }

  // Create in Asaas
  const res = await asaas.customers.create({
    name: nome,
    cpfCnpj: cpf,
    email,
    externalReference: String(userId),
  })

  if (!res.ok) {
    throw new Error(`Erro ao criar cliente Asaas: ${JSON.stringify(res.data)}`)
  }

  const asaasId: string = res.data.id

  // Persist locally
  await pool.request()
    .input('usuario_id', sql.Int, userId)
    .input('asaas_id', sql.VarChar, asaasId)
    .input('cpf_cnpj', sql.VarChar, cpf)
    .query(`
      INSERT INTO asaas_clientes (usuario_id, asaas_id, cpf_cnpj)
      VALUES (@usuario_id, @asaas_id, @cpf_cnpj)
    `)

  return asaasId
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

// ============================================================================
// POST /api/checkout — Criar checkout (carrinho multi-item, cross-tenant split)
// ============================================================================

async function handlePostCheckout(
  request: HttpRequest,
  context: InvocationContext,
  user: JWTPayload,
  origin?: string
): Promise<HttpResponseInit> {
  const body = await request.json() as any
  const validation = checkoutSchema.safeParse(body)

  if (!validation.success) {
    return successResponse(
      { error: 'Dados inválidos', details: validation.error.errors },
      400, origin
    )
  }

  const { item_ids, forma_pagamento, endereco_id, creditCard, creditCardHolderInfo } = validation.data

  // Cartão exige dados completos
  if (forma_pagamento === 'CREDIT_CARD' && (!creditCard || !creditCardHolderInfo)) {
    return successResponse(
      { error: 'Dados do cartão são obrigatórios para pagamento com cartão de crédito' },
      400, origin
    )
  }

  const pool = await getConnection()

  // ---- 1. Validar CPF do comprador (D2) ----
  const userResult = await pool.request()
    .input('id', sql.Int, user.userId)
    .query('SELECT id, nome, email, cpf FROM usuarios WHERE id = @id')

  if (userResult.recordset.length === 0) {
    return successResponse({ error: 'Usuário não encontrado' }, 404, origin)
  }

  const buyer = userResult.recordset[0]

  if (!buyer.cpf) {
    return successResponse(
      { error: 'CPF é obrigatório para realizar compras. Atualize seu perfil.' },
      422, origin
    )
  }

  // ---- 2. Carregar e validar itens ----
  const placeholders = item_ids.map((_, i) => `@item_${i}`).join(', ')
  const itemReq = pool.request()
  item_ids.forEach((id, i) => itemReq.input(`item_${i}`, sql.Int, id))

  const itemsResult = await itemReq.query(`
    SELECT i.id, i.nome, i.valor_venda, i.situacao, i.tenant_id,
           t.nome AS tenant_nome, t.status AS tenant_status
    FROM itens i
    INNER JOIN tenants t ON i.tenant_id = t.id
    WHERE i.id IN (${placeholders})
  `)

  const items = itemsResult.recordset

  // Todos encontrados?
  if (items.length !== item_ids.length) {
    const foundIds = items.map((i: any) => i.id)
    const missing = item_ids.filter(id => !foundIds.includes(id))
    return successResponse({ error: 'Itens não encontrados', missing_ids: missing }, 404, origin)
  }

  // Todos disponíveis?
  const unavailable = items.filter((i: any) => !['estoque', 'disponivel'].includes(i.situacao))
  if (unavailable.length > 0) {
    return successResponse({
      error: 'Itens não disponíveis para compra',
      itens: unavailable.map((i: any) => ({ id: i.id, nome: i.nome, situacao: i.situacao })),
    }, 409, origin)
  }

  // Todos com preço?
  const noPrice = items.filter((i: any) => !i.valor_venda || i.valor_venda <= 0)
  if (noPrice.length > 0) {
    return successResponse({
      error: 'Itens sem preço de venda definido',
      itens: noPrice.map((i: any) => ({ id: i.id, nome: i.nome })),
    }, 400, origin)
  }

  // Vendedores ativos? (D4)
  const inactiveVendors = items.filter((i: any) => i.tenant_status !== 'ativo')
  if (inactiveVendors.length > 0) {
    return successResponse({
      error: 'Vendedor inativo ou pendente de aprovação',
      itens: inactiveVendors.map((i: any) => ({ id: i.id, tenant: i.tenant_nome })),
    }, 403, origin)
  }

  // ---- 3. Agrupar por tenant (cross-tenant split — D1) ----
  const groups = new Map<number, any[]>()
  for (const item of items) {
    const list = groups.get(item.tenant_id) || []
    list.push(item)
    groups.set(item.tenant_id, list)
  }

  // ---- 4. Garantir Asaas customer ----
  const asaasCustomerId = await ensureAsaasCustomer(
    pool, user.userId, buyer.nome, buyer.cpf, buyer.email
  )

  // ---- 5. DB Transaction: criar pedidos + reservar itens ----
  const transaction = pool.transaction()
  await transaction.begin()

  const pedidos: Array<{
    id: number
    tenant_id: number
    tenant_nome: string
    valor_itens: number
    itens: Array<{ id: number; nome: string; valor: number }>
  }> = []

  try {
    for (const [tenantId, tenantItems] of groups) {
      const valorItens = tenantItems.reduce((sum: number, i: any) => sum + Number(i.valor_venda), 0)

      // Criar pedido
      const pedidoResult = await transaction.request()
        .input('tenant_id', sql.Int, tenantId)
        .input('comprador_id', sql.Int, user.userId)
        .input('valor_itens', sql.Decimal(10, 2), valorItens)
        .input('valor_total', sql.Decimal(10, 2), valorItens)
        .input('forma_pagamento', sql.VarChar, forma_pagamento)
        .input('endereco_id', sql.Int, endereco_id || null)
        .input('status', sql.VarChar, 'pendente')
        .query(`
          INSERT INTO pedidos (tenant_id, comprador_id, status, valor_itens, valor_total, forma_pagamento, endereco_id)
          OUTPUT INSERTED.id
          VALUES (@tenant_id, @comprador_id, @status, @valor_itens, @valor_total, @forma_pagamento, @endereco_id)
        `)

      const pedidoId = pedidoResult.recordset[0].id

      // Criar pedido_itens
      for (const item of tenantItems) {
        await transaction.request()
          .input('pedido_id', sql.Int, pedidoId)
          .input('item_id', sql.Int, item.id)
          .input('preco_unitario', sql.Decimal(10, 2), item.valor_venda)
          .query(`
            INSERT INTO pedido_itens (pedido_id, item_id, preco_unitario)
            VALUES (@pedido_id, @item_id, @preco_unitario)
          `)
      }

      // Reservar itens (D1 — timeout 30min via Asaas dueDate ou cron futuro)
      for (const item of tenantItems) {
        await transaction.request()
          .input('id', sql.Int, item.id)
          .query("UPDATE itens SET situacao = 'reservada' WHERE id = @id")
      }

      pedidos.push({
        id: pedidoId,
        tenant_id: tenantId,
        tenant_nome: tenantItems[0].tenant_nome,
        valor_itens: valorItens,
        itens: tenantItems.map((i: any) => ({ id: i.id, nome: i.nome, valor: Number(i.valor_venda) })),
      })
    }

    await transaction.commit()
  } catch (err) {
    await transaction.rollback()
    throw err
  }

  // ---- 6. Criar pagamentos no Asaas (fora da DB transaction) ----
  const results: any[] = []

  for (const pedido of pedidos) {
    try {
      const paymentInput: asaas.AsaasPaymentInput = {
        customer: asaasCustomerId,
        billingType: forma_pagamento,
        value: pedido.valor_itens,
        dueDate: todayISO(),
        description: `Pedido #${pedido.id} — ${pedido.tenant_nome}`,
        externalReference: String(pedido.id),
      }

      if (forma_pagamento === 'CREDIT_CARD' && creditCard && creditCardHolderInfo) {
        paymentInput.creditCard = creditCard
        paymentInput.creditCardHolderInfo = creditCardHolderInfo
        paymentInput.remoteIp = request.headers.get('x-forwarded-for') || '0.0.0.0'
      }

      const paymentRes = await asaas.payments.create(paymentInput)

      if (!paymentRes.ok) {
        await pool.request()
          .input('id', sql.Int, pedido.id)
          .query("UPDATE pedidos SET status = 'erro_pagamento' WHERE id = @id")

        // Liberar itens reservados
        await pool.request()
          .input('pedido_id', sql.Int, pedido.id)
          .query(`
            UPDATE itens SET situacao = 'estoque'
            WHERE id IN (SELECT item_id FROM pedido_itens WHERE pedido_id = @pedido_id)
              AND situacao = 'reservada'
          `)

        results.push({
          pedido_id: pedido.id,
          error: true,
          message: 'Erro ao criar pagamento no Asaas',
          details: paymentRes.data,
        })
        continue
      }

      const payment = paymentRes.data

      // PIX → obter QR code
      let dadosPix: any = null
      if (forma_pagamento === 'PIX') {
        const pixRes = await asaas.payments.getPixQrCode(payment.id)
        if (pixRes.ok) {
          dadosPix = pixRes.data
        }
      }

      // Salvar pagamento no DB
      await pool.request()
        .input('pedido_id', sql.Int, pedido.id)
        .input('tenant_id', sql.Int, pedido.tenant_id)
        .input('asaas_payment_id', sql.VarChar, payment.id)
        .input('asaas_customer_id', sql.VarChar, asaasCustomerId)
        .input('tipo', sql.VarChar, forma_pagamento)
        .input('valor', sql.Decimal(10, 2), pedido.valor_itens)
        .input('status', sql.VarChar, payment.status || 'PENDING')
        .input('dados_pix', sql.NVarChar, dadosPix ? JSON.stringify(dadosPix) : null)
        .query(`
          INSERT INTO pagamentos (pedido_id, tenant_id, asaas_payment_id, asaas_customer_id, tipo, valor, status, dados_pix)
          VALUES (@pedido_id, @tenant_id, @asaas_payment_id, @asaas_customer_id, @tipo, @valor, @status, @dados_pix)
        `)

      results.push({
        pedido_id: pedido.id,
        tenant_nome: pedido.tenant_nome,
        valor: pedido.valor_itens,
        itens: pedido.itens,
        pagamento: {
          asaas_id: payment.id,
          status: payment.status,
          billing_type: forma_pagamento,
          ...(forma_pagamento === 'PIX' && dadosPix ? {
            pix: {
              qr_code_base64: dadosPix.encodedImage,
              copia_cola: dadosPix.payload,
              expiration_date: dadosPix.expirationDate,
            },
          } : {}),
          ...(forma_pagamento === 'CREDIT_CARD' ? {
            cartao: { status: payment.status },
          } : {}),
        },
      })
    } catch (err: any) {
      context.error(`Erro no pagamento do pedido ${pedido.id}:`, err)

      await pool.request()
        .input('id', sql.Int, pedido.id)
        .query("UPDATE pedidos SET status = 'erro_pagamento' WHERE id = @id")

      await pool.request()
        .input('pedido_id', sql.Int, pedido.id)
        .query(`
          UPDATE itens SET situacao = 'estoque'
          WHERE id IN (SELECT item_id FROM pedido_itens WHERE pedido_id = @pedido_id)
            AND situacao = 'reservada'
        `)

      results.push({
        pedido_id: pedido.id,
        error: true,
        message: err.message,
      })
    }
  }

  return successResponse({
    checkout: {
      total_pedidos: pedidos.length,
      forma_pagamento,
      pedidos: results,
    },
  }, 201, origin)
}

// ============================================================================
// GET /api/checkout/{id} — Status do pedido + pagamento
// ============================================================================

async function handleGetCheckout(
  request: HttpRequest,
  context: InvocationContext,
  user: JWTPayload,
  pedidoId: string,
  origin?: string
): Promise<HttpResponseInit> {
  const pool = await getConnection()

  const result = await pool.request()
    .input('id', sql.Int, parseInt(pedidoId))
    .input('comprador_id', sql.Int, user.userId)
    .query(`
      SELECT p.id, p.tenant_id, p.comprador_id, p.status, p.valor_itens,
             p.valor_frete, p.valor_total, p.forma_pagamento, p.pago_em,
             p.endereco_id, p.codigo_rastreio, p.transportadora,
             p.enviado_em, p.entregue_em, p.criado_em,
             pg.asaas_payment_id, pg.tipo AS pagamento_tipo,
             pg.valor AS pagamento_valor, pg.status AS pagamento_status,
             pg.dados_pix, pg.pago_em AS pagamento_pago_em
      FROM pedidos p
      LEFT JOIN pagamentos pg ON pg.pedido_id = p.id
      WHERE p.id = @id AND p.comprador_id = @comprador_id
    `)

  if (result.recordset.length === 0) {
    return successResponse({ error: 'Pedido não encontrado' }, 404, origin)
  }

  const pedido = result.recordset[0]

  // Buscar itens do pedido
  const itensResult = await pool.request()
    .input('pedido_id', sql.Int, parseInt(pedidoId))
    .query(`
      SELECT pi.item_id, pi.preco_unitario, i.nome, i.marca, i.tamanho, i.situacao,
             (SELECT TOP 1 url_blob FROM imagens WHERE item_id = pi.item_id AND e_principal = 1) AS imagem
      FROM pedido_itens pi
      INNER JOIN itens i ON pi.item_id = i.id
      WHERE pi.pedido_id = @pedido_id
    `)

  return successResponse({
    pedido: {
      ...pedido,
      dados_pix: pedido.dados_pix ? JSON.parse(pedido.dados_pix) : null,
    },
    itens: itensResult.recordset,
  }, 200, origin)
}

// ============================================================================
// Router
// ============================================================================

async function checkoutHandler(
  request: HttpRequest,
  context: InvocationContext,
  user: JWTPayload
): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin') || undefined
  const method = request.method
  const id = request.params.id

  try {
    if (method === 'GET' && id) {
      return await handleGetCheckout(request, context, user, id, origin)
    }

    if (method === 'POST' && !id) {
      return await handlePostCheckout(request, context, user, origin)
    }

    return successResponse({ error: 'Método não permitido' }, 405, origin)
  } catch (error) {
    return handleError(error, context, origin)
  }
}

// ============================================================================
// Wrapper + Route Registration
// ============================================================================

async function checkoutWrapper(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin') || undefined
  if (request.method === 'OPTIONS') return handlePreflight(origin)
  return protectedRoute(checkoutHandler)(request, context)
}

app.http('checkout', {
  methods: ['GET', 'POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'checkout/{id?}',
  handler: checkoutWrapper,
})
