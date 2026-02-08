import { z } from 'zod';
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

// ============================================================================
// AUTHENTICATION & SECURITY
// ============================================================================

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable must be set')
}

const JWT_SECRET = process.env.JWT_SECRET
const JWT_EXPIRES_IN = "7d"
const BCRYPT_ROUNDS = 12

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export interface JWTPayload {
  userId: number
  email: string
  tipo: UsuarioTipo
  tenantId: number | null
  nome: string
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch {
    return null
  }
}

export function getTenantIdFromRequest(authHeader?: string, xTenantId?: string): number {
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7)
    const payload = verifyToken(token)
    if (payload?.tenantId) return payload.tenantId
  }
  
  if (xTenantId) {
    const parsed = parseInt(xTenantId)
    if (!isNaN(parsed)) return parsed
  }
  
  return 1 // Tenant padrão
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

export const clienteSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  apelido: z.string().optional(),
  telefone: z.string().optional(),
  instagram: z.string().optional(),
  cidade: z.string().optional(),
  tipo: z.enum(['vendedor', 'comprador', 'ambos']).default('comprador'),
  observacoes: z.string().optional(),
  tipo_cliente: z.enum(['usuario', 'externo', 'parceiro']).optional(),
  tenant_id: z.number().int().positive().optional(),
});

export const itemSchema = z.object({
  tipo: z.enum(['camiseta', 'jaqueta', 'colete', 'treino', 'livro', 'outro']).default('camiseta').nullish(),
  nome: z.string().nullish(), // Deixando nullish para máxima flexibilidade
  ano: z.number().int().min(1900).max(2100).nullish(),
  modelo: z.string().nullish(),
  marca: z.string().nullish(),
  jogador: z.string().nullish(),
  numero: z.number().int().min(0).max(99).nullish(), // Mapeado para numero_camisa
  tamanho: z.string().nullish(),
  cor_principal: z.string().nullish(),
  condicao: z.enum(['nova', 'seminova', 'usada', 'vintage']).nullish(),
  autografada: z.boolean().nullish(),
  autografo_descricao: z.string().nullish(),
  valor_compra: z.number().min(0).default(0).nullish(),
  valor_venda: z.number().min(0).nullish(),
  situacao: z.enum(['estoque', 'vendida', 'trocada', 'baixada_colecao']).default('estoque').nullish(),
  destino: z.string().nullish(),
  data_aquisicao: z.string().nullish(),
  data_saida: z.string().nullish(),
  observacoes: z.string().nullish(),
  lote_id: z.number().int().nullish(),
  valor_mercado: z.number().min(0).nullish(),
  tenant_id: z.number().int().positive().optional(),
});

export const vendaSchema = z.object({
  item_id: z.number().int().positive(),
  cliente_id: z.number().int().positive().optional(),
  valor_venda: z.number().min(0),
  valor_compra: z.number().min(0).optional(),
  data_venda: z.string().optional(),
  observacoes: z.string().optional(),
  tenant_id: z.number().int().positive().optional(),
});

export const trocaSchema = z.object({
  item_dado_id: z.number().int().positive(),
  // Aceitar ID existente OU dados para criar novo item
  item_recebido_id: z.number().int().positive().optional(),
  item_recebido_nome: z.string().min(1).optional(),
  item_recebido_valor: z.number().min(0).optional(),
  valor_adicional: z.number().optional(),
  quem_pagou: z.enum(['nos', 'cliente']).optional(),
  data_troca: z.string().optional(),
  observacoes: z.string().optional(),
  status: z.enum(['ativa', 'cancelada']).optional(),
  tenant_id: z.number().int().positive().optional(),
}).refine(
  (data) => data.item_recebido_id || data.item_recebido_nome,
  { message: 'Informe item_recebido_id ou item_recebido_nome', path: ['item_recebido_id'] }
);

// Schema base para updates (sem a validação de refine)
const trocaBaseSchema = z.object({
  item_dado_id: z.number().int().positive(),
  item_recebido_id: z.number().int().positive().optional(),
  item_recebido_nome: z.string().min(1).optional(),
  item_recebido_valor: z.number().min(0).optional(),
  valor_adicional: z.number().optional(),
  quem_pagou: z.enum(['nos', 'cliente']).optional(),
  data_troca: z.string().optional(),
  observacoes: z.string().optional(),
  status: z.enum(['ativa', 'cancelada']).optional(),
});

export const trocaUpdateSchema = trocaBaseSchema.partial();

export const transacaoSchema = z.object({
  tipo_transacao: z.enum(['venda', 'compra', 'troca']),
  item_id: z.number().int().positive().optional(),
  cliente_id: z.number().int().positive().optional(),
  valor: z.number().min(0).optional(),
  data_transacao: z.string().optional(),
  observacoes: z.string().optional(),
  status: z.enum(['pendente', 'concluida', 'cancelada', 'estornada']).optional(),
  tenant_id: z.number().int().positive().optional(),
}).refine(
  (data) => {
    // Sale transactions require cliente_id
    if (data.tipo_transacao === 'venda' && !data.cliente_id) {
      return false;
    }
    return true;
  },
  {
    message: 'cliente_id é obrigatório para transações de venda',
    path: ['cliente_id'],
  }
);

export const loteSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  quantidade_total: z.number().int().min(0),
  quantidade_disponivel: z.number().int().min(0),
  valor_unitario_compra: z.number().min(0).optional(),
  data_aquisicao: z.string().optional(),
  observacoes: z.string().optional(),
  tenant_id: z.number().int().positive().optional(),
}).refine(
  (data) => {
    if (data.quantidade_disponivel > data.quantidade_total) {
      return false;
    }
    return true;
  },
  {
    message: 'quantidade_disponivel não pode ser maior que quantidade_total',
    path: ['quantidade_disponivel'],
  }
);

export const wishlistSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  ano: z.number().int().min(1900).max(2100).nullish(),
  marca: z.string().nullish(),
  modelo: z.string().nullish(),
  jogador: z.string().nullish(),
  tamanho: z.string().nullish(),
  valor_estimado: z.number().min(0).nullish(),
  prioridade: z.enum(['baixa', 'media', 'alta', 'urgente']).default('media'),
  observacoes: z.string().nullish(),
  status: z.enum(['ativo', 'encontrado', 'desistido']).default('ativo'),
  tenant_id: z.number().int().positive().optional(),
});

export const historicoPrecoSchema = z.object({
  item_id: z.number().int().positive(),
  valor: z.number().min(0),
  tipo_valor: z.enum(['compra', 'venda', 'mercado', 'avaliacao']),
  fonte: z.string().optional(),
  data_registro: z.string().optional(),
  observacoes: z.string().optional(),
  tenant_id: z.number().int().positive().optional(),
});

// --- MULTITENANCY ---
export const PlanoTipoEnum = z.enum(['free', 'starter', 'pro', 'custom'])
export type PlanoTipo = z.infer<typeof PlanoTipoEnum>

export const UsuarioTipoEnum = z.enum([
  'platform_admin',
  'tenant_admin',
  'tenant_member',
  'colecionador'
])
export type UsuarioTipo = z.infer<typeof UsuarioTipoEnum>

export const AuthProviderEnum = z.enum(['local', 'google', 'facebook', 'instagram'])
export type AuthProvider = z.infer<typeof AuthProviderEnum>

export const ProvaOriginalidadeEnum = z.enum([
  'etiqueta',
  'nota_fiscal',
  'certificado',
  'aspecto_visual',
  'nenhuma'
])
export type ProvaOriginalidade = z.infer<typeof ProvaOriginalidadeEnum>

export const TransacaoStatusEnum = z.enum(['pendente', 'concluida', 'cancelada', 'estornada'])
export type TransacaoStatus = z.infer<typeof TransacaoStatusEnum>

export const PedidoStatusEnum = z.enum([
  'pendente',
  'pago',
  'enviado',
  'entregue',
  'cancelado',
  'estornado'
])
export type PedidoStatus = z.infer<typeof PedidoStatusEnum>

export const OfertaStatusEnum = z.enum(['pendente', 'aceita', 'recusada', 'expirada'])
export type OfertaStatus = z.infer<typeof OfertaStatusEnum>

export const ConexaoStatusEnum = z.enum(['pendente', 'aceita', 'bloqueada'])
export type ConexaoStatus = z.infer<typeof ConexaoStatusEnum>

export const EnderecoTipoEnum = z.enum(['entrega', 'cobranca', 'loja'])
export type EnderecoTipo = z.infer<typeof EnderecoTipoEnum>

export const ClienteTipoEnum = z.enum(['usuario', 'externo', 'parceiro'])
export type ClienteTipo = z.infer<typeof ClienteTipoEnum>

export const NotificacaoTipoEnum = z.enum([
  'wishlist_match_exato',
  'wishlist_match_parcial',
  'oferta_recebida',
  'oferta_aceita',
  'mensagem_recebida',
  'pedido_novo',
  'pedido_atualizado',
  'pedido_enviado',
  'pedido_entregue',
  'sistema',
  'conexao_solicitada',
  'conexao_aceita'
])
export type NotificacaoTipo = z.infer<typeof NotificacaoTipoEnum>

export const BillingTipoEnum = z.enum(['comissao_venda', 'assinatura', 'servico', 'reembolso'])
export type BillingTipo = z.infer<typeof BillingTipoEnum>

// --- VALIDADORES BASE ---
export const emailSchema = z.string().email('Email inválido')
export const telefoneSchema = z.string().regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos')
export const senhaSchema = z.string()
  .min(8, 'Senha deve ter no mínimo 8 caracteres')
  .regex(/[A-Z]/, 'Deve ter ao menos 1 letra maiúscula')
  .regex(/[a-z]/, 'Deve ter ao menos 1 letra minúscula')
  .regex(/[0-9]/, 'Deve ter ao menos 1 número')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Deve ter ao menos 1 caractere especial')

// --- USUARIOS ---
export const usuarioCreateSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  email: emailSchema,
  telefone: telefoneSchema.optional(),
  senha: senhaSchema.optional(),
  provider: AuthProviderEnum.default('local'),
  provider_id: z.string().optional(),
  tipo: UsuarioTipoEnum.default('colecionador'),
  tenant_id: z.number().int().positive().nullable().optional()
}).refine(
  (data) => data.provider !== 'local' || data.senha,
  { message: 'Senha é obrigatória para autenticação local', path: ['senha'] }
)

export const usuarioLoginSchema = z.object({
  email: emailSchema,
  senha: z.string().min(1, 'Senha é obrigatória')
})

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR');
}

export function calculateProfit(valorVenda: number, valorCompra: number): number {
  return valorVenda - valorCompra;
}

export function calculateMargin(valorVenda: number, valorCompra: number): number {
  if (valorCompra === 0) return 0;
  return ((valorVenda - valorCompra) / valorCompra) * 100;
}

export function buildPaginationQuery(page: number = 1, perPage: number = 30): string {
  const offset = (page - 1) * perPage;
  return `OFFSET ${offset} ROWS FETCH NEXT ${perPage} ROWS ONLY`;
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

export function generateWhatsAppLink(
  phone: string,
  message: string
): string {
  const cleanPhone = phone.replace(/\D/g, '');
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

export function parseQueryParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const urlObj = new URL(url);
  urlObj.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

/**
 * Safely parse JSON from request body
 * Returns parsed JSON or throws an error with proper message
 */
export async function safeParseJson<T = any>(request: { json(): Promise<T> }): Promise<T> {
  try {
    return await request.json();
  } catch (error) {
    throw new Error('Invalid JSON in request body');
  }
}

/**
 * Clamp pagination parameters to safe values
 * - page must be >= 1
 * - perPage must be between 1 and maxPerPage (default 100)
 */
export function clampPagination(
  page: number,
  perPage: number,
  maxPerPage: number = 100
): { page: number; perPage: number } {
  // Handle NaN by defaulting to 1 for page and 30 for perPage
  const clampedPage = isNaN(page) ? 1 : Math.max(1, Math.floor(page));
  const clampedPerPage = isNaN(perPage) ? 30 : Math.max(1, Math.min(maxPerPage, Math.floor(perPage)));
  return { page: clampedPage, perPage: clampedPerPage };
}
