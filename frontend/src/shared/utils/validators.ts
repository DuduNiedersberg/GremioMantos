import { z } from 'zod';

export const itemSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  ano: z.number().int().min(1900).max(2100).optional().or(z.string().transform(val => val ? parseInt(val) : undefined)),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  jogador: z.string().optional(),
  numero: z.number().int().min(1).max(99).optional().or(z.string().transform(val => val ? parseInt(val) : undefined)),
  tamanho: z.string().optional(),
  situacao: z.enum(['disponivel', 'vendido', 'trocado', 'reservado']).default('disponivel'),
  valor_compra: z.number().min(0).optional().or(z.string().transform(val => val ? parseFloat(val) : undefined)),
  valor_venda: z.number().min(0).optional().or(z.string().transform(val => val ? parseFloat(val) : undefined)),
  valor_mercado: z.number().min(0).optional().or(z.string().transform(val => val ? parseFloat(val) : undefined)),
  lote_id: z.number().int().optional().or(z.string().transform(val => val ? parseInt(val) : undefined)),
  data_aquisicao: z.string().optional(),
  origem: z.string().optional(),
  observacoes: z.string().optional(),
});

export const vendaSchema = z.object({
  item_id: z.number().int().positive('Selecione um item'),
  cliente_id: z.number().int().positive().optional().or(z.string().transform(val => val ? parseInt(val) : undefined)),
  valor_venda: z.number().min(0, 'Valor deve ser maior que zero'),
  valor_compra: z.number().min(0).optional().or(z.string().transform(val => val ? parseFloat(val) : undefined)),
  data_venda: z.string().optional(),
  forma_pagamento: z.string().optional(),
  observacoes: z.string().optional(),
});

export const trocaSchema = z.object({
  item_dado_id: z.number().int().positive('Selecione o item dado'),
  item_recebido_id: z.number().int().positive('Selecione o item recebido'),
  valor_item_dado: z.number().min(0).optional().or(z.string().transform(val => val ? parseFloat(val) : undefined)),
  valor_item_recebido: z.number().min(0).optional().or(z.string().transform(val => val ? parseFloat(val) : undefined)),
  data_troca: z.string().optional(),
  observacoes: z.string().optional(),
});

export const loteSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  descricao: z.string().optional(),
  data_compra: z.string().optional(),
  valor_total: z.number().min(0).optional().or(z.string().transform(val => val ? parseFloat(val) : undefined)),
  fornecedor: z.string().optional(),
});

export const wishlistSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  ano: z.number().int().min(1900).max(2100).optional().or(z.string().transform(val => val ? parseInt(val) : undefined)),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  jogador: z.string().optional(),
  tamanho: z.string().optional(),
  valor_estimado: z.number().min(0).optional().or(z.string().transform(val => val ? parseFloat(val) : undefined)),
  prioridade: z.enum(['baixa', 'media', 'alta', 'urgente']).default('media'),
  observacoes: z.string().optional(),
  status: z.enum(['ativo', 'encontrado', 'desistido']).default('ativo'),
});

export const clienteSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefone: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().length(2, 'Use a sigla do estado (2 letras)').optional().or(z.literal('')),
  observacoes: z.string().optional(),
});
