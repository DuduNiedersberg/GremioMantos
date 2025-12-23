// =============================================================================
// TYPE DEFINITIONS - Frontend
// =============================================================================

export interface Item {
  id: number;
  nome: string;
  ano?: number;
  marca?: string;
  modelo?: string;
  jogador?: string;
  numero?: number;
  tamanho?: string;
  situacao: 'disponivel' | 'vendido' | 'trocado' | 'reservado';
  valor_compra?: number;
  valor_venda?: number;
  valor_mercado?: number;
  lote_id?: number;
  data_aquisicao?: string;
  origem?: string;
  observacoes?: string;
  criado_em: string;
  atualizado_em: string;
}

export interface Lote {
  id: number;
  nome: string;
  descricao?: string;
  data_compra?: string;
  valor_total?: number;
  fornecedor?: string;
  quantidade_itens: number;
  criado_em: string;
  atualizado_em: string;
  itens?: Item[];
}

export interface Cliente {
  id: number;
  nome: string;
  email?: string;
  telefone?: string;
  cidade?: string;
  estado?: string;
  observacoes?: string;
  criado_em: string;
  atualizado_em: string;
  vendas?: Venda[];
}

export interface Venda {
  id: number;
  item_id: number;
  cliente_id?: number;
  valor_venda: number;
  valor_compra?: number;
  lucro?: number;
  data_venda: string;
  forma_pagamento?: string;
  observacoes?: string;
  criado_em: string;
  item_nome?: string;
  cliente_nome?: string;
}

export interface Troca {
  id: number;
  item_dado_id: number;
  item_recebido_id: number;
  valor_item_dado?: number;
  valor_item_recebido?: number;
  diferenca?: number;
  data_troca: string;
  observacoes?: string;
  criado_em: string;
  item_dado_nome?: string;
  item_recebido_nome?: string;
}

export interface WishlistItem {
  id: number;
  nome: string;
  ano?: number;
  marca?: string;
  modelo?: string;
  jogador?: string;
  tamanho?: string;
  valor_estimado?: number;
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  observacoes?: string;
  status: 'ativo' | 'encontrado' | 'desistido';
  criado_em: string;
  atualizado_em: string;
}

export interface HistoricoPreco {
  id: number;
  item_id: number;
  valor: number;
  tipo_valor: 'compra' | 'venda' | 'mercado' | 'avaliacao';
  fonte?: string;
  data_registro: string;
  observacoes?: string;
  criado_em: string;
}

export interface DashboardMetrics {
  total_itens: number;
  total_disponiveis: number;
  total_vendidos: number;
  valor_total_investido: number;
  valor_total_vendas: number;
  lucro_total: number;
  valor_acervo_atual: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}
