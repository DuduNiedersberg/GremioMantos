// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface Item {
  id: number;
  tipo: string; // NOT NULL in DB
  nome: string;
  ano?: number;
  modelo?: string;
  marca?: string;
  jogador?: string;
  numero_camisa?: number;
  tamanho?: string;
  cor_principal?: string;
  condicao?: string;
  autografada?: boolean;
  autografo_descricao?: string;
  valor_compra: number; // NOT NULL in DB
  valor_venda?: number;
  lucro_calculado?: number;
  situacao: string; // NOT NULL in DB
  destino?: string;
  data_aquisicao?: string;
  data_saida?: string;
  observacoes?: string;
  criado_em: string;
  atualizado_em: string;
  lote_id?: number;
  valor_mercado?: number;
  // For API compatibility with frontend, we also expose 'numero'
  numero?: number;
}

export interface Lote {
  id: number;
  nome: string;
  quantidade_total?: number;
  quantidade_disponivel?: number;
  valor_unitario_compra?: number;
  data_aquisicao?: string;
  observacoes?: string;
  criado_em: string;
}

export interface Cliente {
  id: number;
  nome: string;
  apelido?: string;
  telefone?: string;
  instagram?: string;
  cidade?: string;
  tipo?: string;
  observacoes?: string;
  criado_em: string;
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
}

export interface Troca {
  id: number;
  item_dado_id: number;
  item_recebido_id: number;
  valor_adicional?: number;
  quem_pagou?: string;
  data_troca: string;
  observacoes?: string;
  criado_em: string;
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

export interface Imagem {
  id: number;
  item_id: number;
  url_blob: string;
  thumbnail_url?: string;
  nome_arquivo?: string;
  tamanho_bytes?: number;
  tipo_mime?: string;
  e_principal: boolean;
  uploaded_em: string;
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
