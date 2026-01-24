import { z } from 'zod';

export const itemSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  ano: z.number().int().min(1900).max(2100).optional().or(z.string().transform(val => val ? parseInt(val, 10) : undefined)),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  jogador: z.string().optional(),
  numero: z.number().int().min(0).max(99).optional().or(z.string().transform(val => val ? parseInt(val, 10) : undefined)),
  tamanho: z.string().optional(),
  situacao: z.enum(['estoque', 'vendida', 'trocada', 'baixada_colecao']).default('estoque'),
  valor_compra: z.number().min(0).optional().or(z.string().transform(val => val ? parseFloat(val) : undefined).refine(val => val === undefined || !isNaN(val), 'Valor inválido')),
  valor_venda: z.number().min(0).optional().or(z.string().transform(val => val ? parseFloat(val) : undefined).refine(val => val === undefined || !isNaN(val), 'Valor inválido')),
  valor_mercado: z.number().min(0).optional().or(z.string().transform(val => val ? parseFloat(val) : undefined).refine(val => val === undefined || !isNaN(val), 'Valor inválido')),
  lote_id: z.number().int().optional().or(z.string().transform(val => val ? parseInt(val, 10) : undefined)),
  data_aquisicao: z.string().optional(),
  origem: z.string().optional(),
  observacoes: z.string().optional(),
});

export const vendaSchema = z.object({
  item_id: z.number().int().positive('Selecione um item'),
  cliente_id: z.number().int().positive().optional().or(z.string().transform(val => val ? parseInt(val, 10) : undefined)),
  valor_venda: z.number().min(0, 'Valor deve ser maior que zero'),
  valor_compra: z.number().min(0).optional().or(z.string().transform(val => val ? parseFloat(val) : undefined).refine(val => val === undefined || !isNaN(val), 'Valor inválido')),
  data_venda: z.string().optional(),
  forma_pagamento: z.string().optional(),
  observacoes: z.string().optional(),
});

export const trocaSchema = z.object({
  item_dado_id: z.number().int().positive('Selecione o item dado'),
  item_recebido_id: z.number().int().positive('Selecione o item recebido'),
  valor_adicional: z.number().optional().or(z.string().transform(val => val ? parseFloat(val) : undefined)),
  quem_pagou: z.enum(['nos', 'cliente']).optional(),
  data_troca: z.string().optional(),
  observacoes: z.string().optional(),
  status: z.enum(['ativa', 'cancelada']).optional(),
});

export const loteSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  quantidade_total: z.number().int().min(0).optional().or(z.string().transform(val => val ? parseInt(val, 10) : undefined)),
  quantidade_disponivel: z.number().int().min(0).optional().or(z.string().transform(val => val ? parseInt(val, 10) : undefined)),
  valor_unitario_compra: z.number().min(0).optional().or(z.string().transform(val => val ? parseFloat(val) : undefined)),
  data_aquisicao: z.string().optional(),
  observacoes: z.string().optional(),
});

export const wishlistSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  ano: z.number().int().min(1900).max(2100).optional().or(z.string().transform(val => val ? parseInt(val, 10) : undefined)),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  jogador: z.string().optional(),
  tamanho: z.string().optional(),
  valor_estimado: z.number().min(0).optional().or(z.string().transform(val => val ? parseFloat(val) : undefined).refine(val => val === undefined || !isNaN(val), 'Valor inválido')),
  prioridade: z.enum(['baixa', 'media', 'alta', 'urgente']).default('media'),
  observacoes: z.string().optional(),
  status: z.enum(['ativo', 'encontrado', 'desistido']).default('ativo'),
});

export const clienteSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  apelido: z.string().optional(),
  telefone: z.string().optional(),
  instagram: z.string().optional(),
  cidade: z.string().optional(),
  tipo: z.enum(['cliente', 'fornecedor', 'colecionador', 'ambos']).default('cliente'),
  observacoes: z.string().optional(),
});
