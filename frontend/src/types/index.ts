// =============================================================================
// TYPE DEFINITIONS - Frontend
// =============================================================================

export interface ImagemItem {
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

export interface Item {
  id: number;
  tipo?: string;
  nome: string;
  ano?: number;
  marca?: string;
  modelo?: string;
  jogador?: string;
  numero?: number; // API field (backend maps to numero_camisa)
  tamanho?: string;
  cor_principal?: string;
  condicao?: string;
  autografada?: boolean;
  autografo_descricao?: string;
  situacao: 'estoque' | 'vendida' | 'trocada' | 'baixada_colecao';
  destino?: string;
  valor_compra?: number;
  valor_venda?: number;
  lucro_calculado?: number;
  valor_mercado?: number;
  lote_id?: number;
  data_aquisicao?: string;
  data_saida?: string;
  origem?: string;
  observacoes?: string;
  criado_em: string;
  atualizado_em: string;
  imagem_principal_url?: string;
  imagem_principal_thumbnail?: string;
  imagens?: ImagemItem[];
}

export interface Lote {
  id: number;
  nome: string;
  quantidade_total: number;
  quantidade_disponivel: number;
  valor_unitario_compra?: number;
  data_aquisicao?: string;
  observacoes?: string;
  criado_em: string;
  atualizado_em?: string;
  itens?: Item[];
}

export interface Cliente {
  id: number;
  nome: string;
  apelido?: string;
  telefone?: string;
  instagram?: string;
  cidade?: string;
  tipo?: 'vendedor' | 'comprador' | 'ambos';
  observacoes?: string;
  criado_em: string;
  atualizado_em?: string;
  vendas?: Venda[];
}

export interface Transacao {
  id: number;
  tipo_transacao: 'venda' | 'compra' | 'troca';
  item_id: number;
  cliente_id?: number;
  valor: number;
  data_transacao: string;
  observacoes?: string;
  criado_em: string;
  item_nome?: string;
  cliente_nome?: string;
  status?: 'pendente' | 'concluida' | 'cancelada' | 'estornada';
}

export interface Venda {
  id: number;
  item_id: number;
  cliente_id?: number;
  valor_venda: number;
  valor_compra?: number;
  lucro?: number;
  data_venda: string;
  observacoes?: string;
  criado_em: string;
  item_nome?: string;
  cliente_nome?: string;
}

export interface Troca {
  id: number;
  item_dado_id: number;
  item_recebido_id: number;
  valor_adicional?: number;
  quem_pagou?: 'nos' | 'cliente';
  data_troca: string;
  observacoes?: string;
  status: 'ativa' | 'cancelada';
  cancelada_em?: string;
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
  itens_estoque?: number;
  total_vendidos: number;
  itens_vendidos?: number;
  itens_trocados?: number;
  capital_estoque?: number;
  valor_acervo_atual: number;
  total_investido_vendas?: number;
  valor_total_investido: number;
  total_vendas?: number;
  valor_total_vendas: number;
  lucro_total: number;
  margem_media?: number;
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
