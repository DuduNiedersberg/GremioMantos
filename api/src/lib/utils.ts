import { z } from 'zod';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

export const itemSchema = z.object({
  tipo: z.string().default('camiseta'), // NOT NULL in DB, default to 'camiseta'
  nome: z.string().min(1, 'Nome é obrigatório'),
  ano: z.number().int().min(1900).max(2100).optional(),
  modelo: z.string().optional(),
  marca: z.string().optional(),
  jogador: z.string().optional(),
  numero: z.number().int().min(1).max(99).optional(), // API field, will be mapped to numero_camisa
  tamanho: z.string().optional(),
  cor_principal: z.string().optional(),
  condicao: z.string().optional(),
  autografada: z.boolean().optional(),
  autografo_descricao: z.string().optional(),
  valor_compra: z.number().min(0).default(0), // NOT NULL in DB
  valor_venda: z.number().min(0).optional(),
  lucro_calculado: z.number().optional(),
  situacao: z.string().default('disponivel'), // NOT NULL in DB
  destino: z.string().optional(),
  data_aquisicao: z.string().optional(),
  data_saida: z.string().optional(),
  observacoes: z.string().optional(),
  lote_id: z.number().int().optional(),
  valor_mercado: z.number().min(0).optional(),
});

export const vendaSchema = z.object({
  item_id: z.number().int().positive(),
  cliente_id: z.number().int().positive().optional(),
  valor_venda: z.number().min(0),
  valor_compra: z.number().min(0).optional(),
  data_venda: z.string().optional(),
  forma_pagamento: z.string().optional(),
  observacoes: z.string().optional(),
});

export const trocaSchema = z.object({
  item_dado_id: z.number().int().positive(),
  item_recebido_id: z.number().int().positive(),
  valor_adicional: z.number().optional(),
  quem_pagou: z.string().optional(),
  data_troca: z.string().optional(),
  observacoes: z.string().optional(),
  status: z.enum(['ativa', 'cancelada']).optional(),
});

export const transacaoSchema = z.object({
  tipo_transacao: z.enum(['venda', 'compra', 'avaliacao']),
  item_id: z.number().int().positive(),
  cliente_id: z.number().int().positive().optional(),
  valor: z.number().min(0),
  data_transacao: z.string().optional(),
  forma_pagamento: z.string().optional(),
  observacoes: z.string().optional(),
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
  quantidade_total: z.number().int().min(0).optional(),
  quantidade_disponivel: z.number().int().min(0).optional(),
  valor_unitario_compra: z.number().min(0).optional(),
  data_aquisicao: z.string().optional(),
  observacoes: z.string().optional(),
});

export const wishlistSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  ano: z.number().int().min(1900).max(2100).optional(),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  jogador: z.string().optional(),
  tamanho: z.string().optional(),
  valor_estimado: z.number().min(0).optional(),
  prioridade: z.enum(['baixa', 'media', 'alta', 'urgente']).default('media'),
  observacoes: z.string().optional(),
  status: z.enum(['ativo', 'encontrado', 'desistido']).default('ativo'),
});

export const historicoPrecoSchema = z.object({
  item_id: z.number().int().positive(),
  valor: z.number().min(0),
  tipo_valor: z.enum(['compra', 'venda', 'mercado', 'avaliacao']),
  fonte: z.string().optional(),
  data_registro: z.string().optional(),
  observacoes: z.string().optional(),
});

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
