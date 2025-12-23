export const SITUACOES = [
  { value: 'disponivel', label: 'Disponível' },
  { value: 'vendido', label: 'Vendido' },
  { value: 'trocado', label: 'Trocado' },
  { value: 'reservado', label: 'Reservado' },
] as const;

export const PRIORIDADES = [
  { value: 'baixa', label: 'Baixa', color: 'bg-neutral-500' },
  { value: 'media', label: 'Média', color: 'bg-blue-500' },
  { value: 'alta', label: 'Alta', color: 'bg-warning' },
  { value: 'urgente', label: 'Urgente', color: 'bg-error' },
] as const;

export const WISHLIST_STATUS = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'encontrado', label: 'Encontrado' },
  { value: 'desistido', label: 'Desistido' },
] as const;

export const TAMANHOS = ['PP', 'P', 'M', 'G', 'GG', 'XGG', 'Infantil', 'Juvenil'] as const;

export const MARCAS = [
  'Umbro',
  'Topper',
  'Penalty',
  'Olympikus',
  'Nike',
  'Adidas',
  'Reebok',
  'Kanxa',
  'Super Bolla',
  'Outra',
] as const;

export const MODELOS = [
  'Home',
  'Away',
  'Third',
  'Goleiro',
  'Treino',
  'Especial',
  'Comemorativa',
  'Libertadores',
  'Copa do Brasil',
  'Brasileirão',
] as const;

export const FORMAS_PAGAMENTO = [
  'PIX',
  'Dinheiro',
  'Transferência',
  'Cartão Crédito',
  'Cartão Débito',
  'Boleto',
  'Outro',
] as const;

export const ESTADOS_BR = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const;

export const TIPOS_HISTORICO = [
  { value: 'compra', label: 'Compra', color: 'text-blue-600' },
  { value: 'venda', label: 'Venda', color: 'text-green-600' },
  { value: 'mercado', label: 'Mercado', color: 'text-purple-600' },
  { value: 'avaliacao', label: 'Avaliação', color: 'text-orange-600' },
] as const;

export const APP_NAME = 'Bolicho do Grêmio';
export const APP_SUBTITLE = 'Vale dos Sinos';
export const APP_VERSION = '1.0.0';
