import { z } from 'zod';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

export const itemSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  ano: z.number().int().min(1900).max(2100).optional(),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  jogador: z.string().optional(),
  numero: z.number().int().min(1).max(99).optional(),
  tamanho: z.string().optional(),
  situacao: z.enum(['disponivel', 'vendido', 'trocado', 'reservado']).default('disponivel'),
  valor_compra: z.number().min(0).optional(),
  valor_venda: z.number().min(0).optional(),
  valor_mercado: z.number().min(0).optional(),
  lote_id: z.number().int().optional(),
  data_aquisicao: z.string().optional(),
  origem: z.string().optional(),
  observacoes: z.string().optional(),
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
  valor_item_dado: z.number().min(0).optional(),
  valor_item_recebido: z.number().min(0).optional(),
  data_troca: z.string().optional(),
  observacoes: z.string().optional(),
});

export const loteSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  descricao: z.string().optional(),
  data_compra: z.string().optional(),
  valor_total: z.number().min(0).optional(),
  fornecedor: z.string().optional(),
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
export async function safeParseJson<T = any>(request: any): Promise<T> {
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
  const clampedPage = Math.max(1, Math.floor(page)) || 1;
  const clampedPerPage = Math.max(1, Math.min(maxPerPage, Math.floor(perPage))) || 30;
  return { page: clampedPage, perPage: clampedPerPage };
}
