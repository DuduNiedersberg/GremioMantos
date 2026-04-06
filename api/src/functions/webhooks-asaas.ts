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
  // 1. Validar token — diferenciar missing (misconfiguration) vs invalid (unauthorized)
  const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN

  if (!expectedToken) {
    context.error('Webhook Asaas: ASAAS_WEBHOOK_TOKEN não está configurado')
    return { status: 500, jsonBody: { error: 'Erro interno do servidor' } }
  }

  const token = request.headers.get('asaas-access-token')
  if (token !== expectedToken) {
    context.warn('Webhook Asaas: token inválido')
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
  // DB real: webhook_logs (id bigint, event, asaas_payment_id, asaas_transfer_id,
  //          payload NVARCHAR(MAX), processed bit, error_message, idempotency_key,
  //          received_at, processed_at)
  const idempotencyKey = `${event}_${payload.payment?.id || payload.transfer?.id || 'unknown'}`

  let logId: number
  try {
    // Check idempotency — skip if already processed
    const existingLog = await pool.request()
      .input('idempotency_key', sql.VarChar, idempotencyKey)
      .query('SELECT id, processed FROM webhook_logs WHERE idempotency_key = @idempotency_key')

    if (existingLog.recordset.length > 0 && existingLog.recordset[0].processed === true) {
      context.log(`⏭️ Webhook já processado (idempotency): ${idempotencyKey}`)
      return { status: 200, jsonBody: { received: true, duplicate: true } }
    }

    if (existingLog.recordset.length > 0) {
      // Retry de um evento que falhou antes
      logId = existingLog.recordset[0].id
    } else {
      const logResult = await pool.request()
        .input('event', sql.VarChar, event)
        .input('asaas_payment_id', sql.VarChar, payload.payment?.id || null)
        .input('asaas_transfer_id', sql.VarChar, payload.transfer?.id || null)
        .input('payload', sql.NVarChar(sql.MAX), JSON.stringify(payload))
        .input('idempotency_key', sql.VarChar, idempotencyKey)
        .query(`
          INSERT INTO webhook_logs (event, asaas_payment_id, asaas_transfer_id, payload, idempotency_key)
          OUTPUT INSERTED.id
          VALUES (@event, @asaas_payment_id, @asaas_transfer_id, @payload, @idempotency_key)
        `)
      logId = Number(logResult.recordset[0].id)
    }
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
      .input('id', sql.BigInt, logId)
      .query('UPDATE webhook_logs SET processed = 1, processed_at = GETDATE() WHERE id = @id')

    return { status: 200, jsonBody: { received: true } }

  } catch (err: any) {
    context.error(`Erro processando evento ${event}:`, err)

    // Marcar log com erro
    await pool.request()
      .input('id', sql.BigInt, logId)
      .input('error_message', sql.NVarChar, (err.message || 'Erro desconhecido').substring(0, 500))
      .query('UPDATE webhook_logs SET error_message = @error_message WHERE id = @id')

    // Retornar 500 para Asaas reenviar (falha transitória)
    return { status: 500, jsonBody: { error: 'Erro ao processar evento' } }
  }
}

// ============================================================================
// Payment Events — COM transações SQL
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
      // pagamentos.status CHECK usa valores Asaas: CONFIRMED, RECEIVED, etc.
      const asaasStatus = event === 'PAYMENT_RECEIVED' ? 'RECEIVED' : 'CONFIRMED'
      const dataPagamento = payment.paymentDate || payment.confirmedDate || todayStr()

      const transaction = pool.transaction()
      try {
        await transaction.begin()

        await transaction.request()
          .input('id', sql.Int, pag.id)
          .input('status', sql.VarChar, asaasStatus)
          .input('valor_liquido', sql.Decimal(10, 2), payment.netValue || null)
          .input('data_pagamento', sql.Date, dataPagamento)
          .query(`
            UPDATE pagamentos
            SET status = @status, valor_liquido = @valor_liquido,
                data_pagamento = @data_pagamento, atualizado_em = GETDATE()
            WHERE id = @id
          `)

        // pedidos.status CHECK: pendente/pago/enviado/entregue/cancelado/estornado
        await transaction.request()
          .input('id', sql.Int, pag.pedido_id)
          .input('pago_em', sql.DateTime2, new Date())
          .query(`
            UPDATE pedidos
            SET status = 'pago', pago_em = @pago_em, atualizado_em = GETDATE()
            WHERE id = @id
          `)

        // Itens reservados → vendida
        await transaction.request()
          .input('pedido_id', sql.Int, pag.pedido_id)
          .query(`
            UPDATE itens SET situacao = 'vendida'
            WHERE id IN (SELECT item_id FROM pedido_itens WHERE pedido_id = @pedido_id)
              AND situacao = 'reservada'
          `)

        await transaction.commit()
      } catch (error) {
        await transaction.rollback()
        throw error
      }

      context.log(`✅ Pagamento ${asaasPaymentId} ${asaasStatus} — pedido ${pag.pedido_id}`)
      break
    }

    // ---- Pagamento expirado ----
    case 'PAYMENT_OVERDUE': {
      const transaction = pool.transaction()
      try {
        await transaction.begin()

        await transaction.request()
          .input('id', sql.Int, pag.id)
          .query("UPDATE pagamentos SET status = 'OVERDUE', atualizado_em = GETDATE() WHERE id = @id")

        // pedidos CHECK não tem 'expirado' → usar 'cancelado'
        await transaction.request()
          .input('id', sql.Int, pag.pedido_id)
          .query("UPDATE pedidos SET status = 'cancelado', atualizado_em = GETDATE() WHERE id = @id")

        // Liberar reserva → estoque
        await transaction.request()
          .input('pedido_id', sql.Int, pag.pedido_id)
          .query(`
            UPDATE itens SET situacao = 'estoque'
            WHERE id IN (SELECT item_id FROM pedido_itens WHERE pedido_id = @pedido_id)
              AND situacao = 'reservada'
          `)

        await transaction.commit()
      } catch (error) {
        await transaction.rollback()
        throw error
      }

      context.log(`⏰ Pagamento ${asaasPaymentId} OVERDUE — itens liberados`)
      break
    }

    // ---- Pagamento estornado ----
    case 'PAYMENT_REFUNDED': {
      const transaction = pool.transaction()
      try {
        await transaction.begin()

        await transaction.request()
          .input('id', sql.Int, pag.id)
          .query("UPDATE pagamentos SET status = 'REFUNDED', atualizado_em = GETDATE() WHERE id = @id")

        await transaction.request()
          .input('id', sql.Int, pag.pedido_id)
          .query("UPDATE pedidos SET status = 'estornado', atualizado_em = GETDATE() WHERE id = @id")

        // Itens vendidos voltam ao estoque
        await transaction.request()
          .input('pedido_id', sql.Int, pag.pedido_id)
          .query(`
            UPDATE itens SET situacao = 'estoque'
            WHERE id IN (SELECT item_id FROM pedido_itens WHERE pedido_id = @pedido_id)
              AND situacao = 'vendida'
          `)

        await transaction.commit()
      } catch (error) {
        await transaction.rollback()
        throw error
      }

      context.log(`↩️ Pagamento ${asaasPaymentId} REFUNDED — itens devolvidos ao estoque`)
      break
    }

    // ---- Pagamento deletado/cancelado ----
    case 'PAYMENT_DELETED': {
      const transaction = pool.transaction()
      try {
        await transaction.begin()

        await transaction.request()
          .input('id', sql.Int, pag.id)
          .query("UPDATE pagamentos SET status = 'REFUNDED', atualizado_em = GETDATE() WHERE id = @id")

        await transaction.request()
          .input('id', sql.Int, pag.pedido_id)
          .query("UPDATE pedidos SET status = 'cancelado', atualizado_em = GETDATE() WHERE id = @id")

        await transaction.request()
          .input('pedido_id', sql.Int, pag.pedido_id)
          .query(`
            UPDATE itens SET situacao = 'estoque'
            WHERE id IN (SELECT item_id FROM pedido_itens WHERE pedido_id = @pedido_id)
              AND situacao = 'reservada'
          `)

        await transaction.commit()
      } catch (error) {
        await transaction.rollback()
        throw error
      }

      context.log(`🗑️ Pagamento ${asaasPaymentId} DELETED — itens liberados`)
      break
    }

    default:
      context.log(`ℹ️ Evento de pagamento não tratado: ${event}`)
  }
}

// ============================================================================
// Transfer Events — COM transações SQL
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

  // repasses.status CHECK: agendado/pendente/processando/pago/erro/cancelado
  switch (event) {
    case 'TRANSFER_DONE': {
      await pool.request()
        .input('id', sql.Int, repasse.id)
        .query("UPDATE repasses SET status = 'pago', data_repasse = GETDATE(), atualizado_em = GETDATE() WHERE id = @id")
      context.log(`✅ Repasse ${asaasTransferId} concluído (status: pago)`)
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
        .input('erro_mensagem', sql.NVarChar, `Evento: ${event}`)
        .query("UPDATE repasses SET status = 'erro', erro_mensagem = @erro_mensagem, atualizado_em = GETDATE() WHERE id = @id")
      context.log(`❌ Repasse ${asaasTransferId}: ${event}`)
      break
    }

    default:
      context.log(`ℹ️ Evento de transferência não tratado: ${event}`)
  }
}

// ============================================================================
// Helpers
// ============================================================================

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
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
