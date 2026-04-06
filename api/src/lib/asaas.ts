/**
 * Asaas Payment API — Service Layer
 * Integração com a API de pagamentos Asaas (sandbox + produção)
 * Env vars: ASAAS_API_KEY, ASAAS_ENVIRONMENT (sandbox|production)
 */

// ============================================================================
// Types
// ============================================================================

export interface AsaasCustomerInput {
  name: string
  cpfCnpj: string
  email?: string
  phone?: string
  mobilePhone?: string
  postalCode?: string
  address?: string
  addressNumber?: string
  complement?: string
  province?: string
  externalReference?: string
  notificationDisabled?: boolean
}

export interface AsaasPaymentInput {
  customer: string
  billingType: 'PIX' | 'CREDIT_CARD'
  value: number
  dueDate: string
  description?: string
  externalReference?: string
  creditCard?: {
    holderName: string
    number: string
    expiryMonth: string
    expiryYear: string
    ccv: string
  }
  creditCardHolderInfo?: {
    name: string
    email: string
    cpfCnpj: string
    postalCode: string
    addressNumber: string
    phone: string
  }
  remoteIp?: string
}

export interface AsaasTransferInput {
  value: number
  pixAddressKey?: string
  pixAddressKeyType?: 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'EVP'
  description?: string
  operationType: 'PIX' | 'TED'
}

export interface AsaasResponse<T = any> {
  ok: boolean
  status: number
  data: T
}

// ============================================================================
// Internal helpers
// ============================================================================

function getBaseUrl(): string {
  const env = process.env.ASAAS_ENVIRONMENT || 'sandbox'
  return env === 'production'
    ? 'https://api.asaas.com/v3'
    : 'https://sandbox.asaas.com/api/v3'
}

function getApiKey(): string {
  const key = process.env.ASAAS_API_KEY
  if (!key) throw new Error('ASAAS_API_KEY não configurada')
  return key
}

async function asaasFetch<T = any>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: any
): Promise<AsaasResponse<T>> {
  const url = `${getBaseUrl()}${path}`

  const options: RequestInit = {
    method,
    headers: {
      'access_token': getApiKey(),
      'Content-Type': 'application/json',
    },
  }

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body)
  }

  const res = await fetch(url, options)

  let data: any
  try {
    data = await res.json()
  } catch {
    data = null
  }

  return { ok: res.ok, status: res.status, data }
}

// ============================================================================
// Customers
// ============================================================================

export const customers = {
  create: (input: AsaasCustomerInput): Promise<AsaasResponse> =>
    asaasFetch('POST', '/customers', input),

  get: (id: string): Promise<AsaasResponse> =>
    asaasFetch('GET', `/customers/${id}`),

  findByCpf: (cpfCnpj: string): Promise<AsaasResponse> =>
    asaasFetch('GET', `/customers?cpfCnpj=${encodeURIComponent(cpfCnpj)}`),
}

// ============================================================================
// Payments
// ============================================================================

export const payments = {
  create: (input: AsaasPaymentInput): Promise<AsaasResponse> =>
    asaasFetch('POST', '/payments', input),

  get: (id: string): Promise<AsaasResponse> =>
    asaasFetch('GET', `/payments/${id}`),

  getPixQrCode: (paymentId: string): Promise<AsaasResponse> =>
    asaasFetch('GET', `/payments/${paymentId}/pixQrCode`),

  refund: (id: string): Promise<AsaasResponse> =>
    asaasFetch('POST', `/payments/${id}/refund`),
}

// ============================================================================
// Transfers
// ============================================================================

export const transfers = {
  create: (input: AsaasTransferInput): Promise<AsaasResponse> =>
    asaasFetch('POST', '/transfers', input),

  get: (id: string): Promise<AsaasResponse> =>
    asaasFetch('GET', `/transfers/${id}`),
}

// ============================================================================
// Finance
// ============================================================================

export const finance = {
  getBalance: (): Promise<AsaasResponse> =>
    asaasFetch('GET', '/finance/balance'),

  getStatement: (startDate?: string, endDate?: string): Promise<AsaasResponse> => {
    const params = new URLSearchParams()
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)
    const qs = params.toString()
    return asaasFetch('GET', `/finance/statement${qs ? '?' + qs : ''}`)
  },
}
