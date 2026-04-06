import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import sql from 'mssql'
import { getConnection } from '../lib/database'

// ============================================================================
// Types
// ============================================================================

interface AsaasWebhookPayload {
  event: string
  payment?: {
    id: string
    customer: string
    status: string
    value: number
    netValue: number
    billingType: string
    externalReference: string
    confirmedDate?: string
    paymentDate?: string
  }
  transfer?: {
    id: string
    status: string
    value: number
    externalReference?: string
  }
}

// ============================================================================
// POST /api/webhooks/asaas — Recebe eventos do Asaas
// ============================================================================

async function webhooksAsaasHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  // 1. Validar token de autenticação
  const token = request.headers.get('asaas-access-token')
  const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN

  if (!expectedToken || token !== expectedToken) {
    context.warn('Webhook Asaas: token inválido ou ausente')
    return { status: 401, jsonBody: { error: 'Não autorizado' } }
  }

  // 2. Parse payload
  let payload: AsaasWebhookPayload
  try {
    payload = await request.json() as AsaasWebhookPayload
  } catch {
    return { status: 400, jsonBody: { error: 'JSON inválido' } }
  }

  const { event } = payload
  context.log(`📨 Webhook Asaas: ${event}`)

  const pool = await getConnection()

  // 3. Registrar log do webhook
  let logId: number
  try {
    const logResult = await pool.request()
      .input('event', sql.VarChar, event)
      .input('payment_id', sql.VarChar, payload.payment?.id || null)
      .input('transfer_id', sql.VarChar, payload.transfer?.id || null)
      .input('payload', sql.NVarChar, JSON.stringify(payload))
      .input('status', sql.VarChar, 'recebido')
      .query(`
        INSERT INTO webhook_logs (event, payment_id, transfer_id, payload, status)
        OUTPUT INSERTED.id
        VALUES (@event, @payment_id, @transfer_id, @payload, @status)
      `)
    logId = logResult.recordset[0].id
  } catch (err: any) {
    context.error('Erro ao salvar webhook log:', err)
    return { status: 500, jsonBody: { error: 'Erro interno ao registrar webhook' } }
  }

  // 4. Processar evento
  try {
    if (event.startsWith('PAYMENT_') && payload.payment) {
      await handlePaymentEvent(pool, event, payload.payment, context)
    } else if (event.startsWith('TRANSFER_') && payload.transfer) {
      await handleTransferEvent(pool, event, payload.transfer, context)
    } else {
      context.warn(`Evento não tratado: ${event}`)
    }

    // Marcar log como processado
    await pool.request()
      .input('id', sql.Int, logId)
      .query("UPDATE webhook_logs SET status = 'processado' WHERE id = @id")

  } catch (err: any) {
    context.error(`Erro processando evento ${event}:`, err)

    // Marcar log como erro
    await pool.request()
      .input('id', sql.Int, logId)
      .input('erro_msg', sql.NVarChar, (err.message || 'Erro desconhecido').substring(0, 500))
      .query("UPDATE webhook_logs SET status = 'erro', erro_msg = @erro_msg WHERE id = @id")
  }

  // Sempre retorna 200 para o Asaas não reenviar (evento já foi logado)
  return { status: 200, jsonBody: { received: true } }
}

// ============================================================================
// Payment Events
// ============================================================================

async function handlePaymentEvent(
  pool: sql.ConnectionPool,
  event: string,
  payment: NonNullable<AsaasWebhookPayload['payment']>,
  context: InvocationContext
): Promise<void> {
  const asaasPaymentId = payment.id

  // Buscar pagamento local
  const pagResult = await pool.request()
    .input('asaas_payment_id', sql.VarChar, asaasPaymentId)
    .query('SELECT id, pedido_id, tenant_id, status FROM pagamentos WHERE asaas_payment_id = @asaas_payment_id')

  if (pagResult.recordset.length === 0) {
    context.warn(`Pagamento local não encontrado para asaas_id: ${asaasPaymentId}`)
    return
  }

  const pag = pagResult.recordset[0]

  switch (event) {
    // ---- Pagamento confirmado/recebido ----
    case 'PAYMENT_CONFIRMED':
    case 'PAYMENT_RECEIVED': {
      const novoStatus = event === 'PAYMENT_RECEIVED' ? 'recebido' : 'confirmado'

      await pool.request()
        .input('id', sql.Int, pag.id)
        .input('status', sql.VarChar, novoStatus)
        .input('valor_liquido', sql.Decimal(10, 2), payment.netValue || null)
        .input('pago_em', sql.DateTime2, payment.paymentDate || payment.confirmedDate || new Date())
        .query(`
          UPDATE pagamentos
          SET status = @status, valor_liquido = @valor_liquido, pago_em = @pago_em, atualizado_em = GETDATE()
          WHERE id = @id
        `)

      await pool.request()
        .input('id', sql.Int, pag.pedido_id)
        .input('pago_em', sql.DateTime2, payment.paymentDate || payment.confirmedDate || new Date())
        .query(`
          UPDATE pedidos
          SET status = 'pago', pago_em = @pago_em, atualizado_em = GETDATE()
          WHERE id = @id
        `)

      // Itens reservados → vendida
      await pool.request()
        .input('pedido_id', sql.Int, pag.pedido_id)
        .query(`
          UPDATE itens SET situacao = 'vendida'
          WHERE id IN (SELECT item_id FROM pedido_itens WHERE pedido_id = @pedido_id)
            AND situacao = 'reservada'
        `)

      context.log(`✅ Pagamento ${asaasPaymentId} ${novoStatus} — pedido ${pag.pedido_id}`)
      break
    }

    // ---- Pagamento expirado ----
    case 'PAYMENT_OVERDUE': {
      await pool.request()
        .input('id', sql.Int, pag.id)
        .query("UPDATE pagamentos SET status = 'expirado', atualizado_em = GETDATE() WHERE id = @id")

      await pool.request()
        .input('id', sql.Int, pag.pedido_id)
        .query("UPDATE pedidos SET status = 'expirado', atualizado_em = GETDATE() WHERE id = @id")

      // Liberar reserva → estoque
      await pool.request()
        .input('pedido_id', sql.Int, pag.pedido_id)
        .query(`
          UPDATE itens SET situacao = 'estoque'
          WHERE id IN (SELECT item_id FROM pedido_itens WHERE pedido_id = @pedido_id)
            AND situacao = 'reservada'
        `)

      context.log(`⏰ Pagamento ${asaasPaymentId} expirado — itens liberados`)
      break
    }

    // ---- Pagamento estornado ----
    case 'PAYMENT_REFUNDED': {
      await pool.request()
        .input('id', sql.Int, pag.id)
        .query("UPDATE pagamentos SET status = 'estornado', atualizado_em = GETDATE() WHERE id = @id")

      await pool.request()
        .input('id', sql.Int, pag.pedido_id)
        .query("UPDATE pedidos SET status = 'estornado', atualizado_em = GETDATE() WHERE id = @id")

      // Itens vendidos voltam ao estoque
      await pool.request()
        .input('pedido_id', sql.Int, pag.pedido_id)
        .query(`
          UPDATE itens SET situacao = 'estoque'
          WHERE id IN (SELECT item_id FROM pedido_itens WHERE pedido_id = @pedido_id)
            AND situacao = 'vendida'
        `)

      context.log(`↩️ Pagamento ${asaasPaymentId} estornado — itens devolvidos ao estoque`)
      break
    }

    // ---- Pagamento deletado/cancelado ----
    case 'PAYMENT_DELETED': {
      await pool.request()
        .input('id', sql.Int, pag.id)
        .query("UPDATE pagamentos SET status = 'cancelado', atualizado_em = GETDATE() WHERE id = @id")

      await pool.request()
        .input('id', sql.Int, pag.pedido_id)
        .query("UPDATE pedidos SET status = 'cancelado', atualizado_em = GETDATE() WHERE id = @id")

      await pool.request()
        .input('pedido_id', sql.Int, pag.pedido_id)
        .query(`
          UPDATE itens SET situacao = 'estoque'
          WHERE id IN (SELECT item_id FROM pedido_itens WHERE pedido_id = @pedido_id)
            AND situacao = 'reservada'
        `)

      context.log(`🗑️ Pagamento ${asaasPaymentId} cancelado — itens liberados`)
      break
    }

    default:
      context.log(`ℹ️ Evento de pagamento não tratado: ${event}`)
  }
}

// ============================================================================
// Transfer Events
// ============================================================================

async function handleTransferEvent(
  pool: sql.ConnectionPool,
  event: string,
  transfer: NonNullable<AsaasWebhookPayload['transfer']>,
  context: InvocationContext
): Promise<void> {
  const asaasTransferId = transfer.id

  const repResult = await pool.request()
    .input('asaas_transfer_id', sql.VarChar, asaasTransferId)
    .query('SELECT id, pagamento_id FROM repasses WHERE asaas_transfer_id = @asaas_transfer_id')

  if (repResult.recordset.length === 0) {
    context.warn(`Repasse local não encontrado para transfer_id: ${asaasTransferId}`)
    return
  }

  const repasse = repResult.recordset[0]

  switch (event) {
    case 'TRANSFER_DONE': {
      await pool.request()
        .input('id', sql.Int, repasse.id)
        .query("UPDATE repasses SET status = 'concluido', transferido_em = GETDATE(), atualizado_em = GETDATE() WHERE id = @id")
      context.log(`✅ Repasse ${asaasTransferId} concluído`)
      break
    }

    case 'TRANSFER_PENDING':
    case 'TRANSFER_IN_BANK_PROCESSING': {
      await pool.request()
        .input('id', sql.Int, repasse.id)
        .query("UPDATE repasses SET status = 'processando', atualizado_em = GETDATE() WHERE id = @id")
      context.log(`⏳ Repasse ${asaasTransferId} em processamento`)
      break
    }

    case 'TRANSFER_FAILED':
    case 'TRANSFER_CANCELLED':
    case 'TRANSFER_BLOCKED': {
      await pool.request()
        .input('id', sql.Int, repasse.id)
        .query("UPDATE repasses SET status = 'falhou', atualizado_em = GETDATE() WHERE id = @id")
      context.log(`❌ Repasse ${asaasTransferId} falhou: ${event}`)
      break
    }

    default:
      context.log(`ℹ️ Evento de transferência não tratado: ${event}`)
  }
}

// ============================================================================
// Route Registration — Webhook é público (sem auth JWT, validado por token Asaas)
// ============================================================================

app.http('webhooksAsaas', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'webhooks/asaas',
  handler: webhooksAsaasHandler,
})
