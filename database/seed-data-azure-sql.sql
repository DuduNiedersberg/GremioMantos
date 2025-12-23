-- =============================================================================
-- SEED DATA - Bolicho do Grêmio
-- Dados de exemplo para desenvolvimento e demonstração
-- =============================================================================

-- Inserir Lotes de Exemplo
INSERT INTO lotes (nome, descricao, data_compra, valor_total, fornecedor, quantidade_itens) VALUES
('Lote Histórico 1983-1995', 'Camisetas clássicas do Grêmio dos anos 80 e 90', '2024-01-15', 2500.00, 'Colecionador Porto Alegre', 0),
('Lote Libertadores 2017', 'Edição especial da campanha campeã', '2024-02-20', 1800.00, 'Loja Especializada', 0),
('Lote Brasileirão 2023', 'Camisetas da última temporada', '2024-03-10', 1200.00, 'Fornecedor Online', 0);

-- Inserir Itens de Exemplo
INSERT INTO itens (nome, ano, marca, modelo, jogador, numero, tamanho, situacao, valor_compra, valor_venda, valor_mercado, lote_id, data_aquisicao, origem, observacoes) VALUES
('Camisa Grêmio 1983 Olympikus Mundial', 1983, 'Olympikus', 'Home', 'Renato', 7, 'M', 'disponivel', 800.00, 1500.00, 1800.00, 1, '2024-01-15', 'Colecionador Porto Alegre', 'Camisa histórica do Mundial de 1983'),
('Camisa Grêmio 1995 Topper Libertadores', 1995, 'Topper', 'Home', 'Paulo Nunes', 9, 'G', 'disponivel', 600.00, 1200.00, 1400.00, 1, '2024-01-15', 'Colecionador Porto Alegre', 'Camisa da conquista da Libertadores de 1995'),
('Camisa Grêmio 2017 Umbro Libertadores', 2017, 'Umbro', 'Home', 'Luan', 7, 'M', 'disponivel', 450.00, 800.00, 950.00, 2, '2024-02-20', 'Loja Especializada', 'Edição comemorativa da Libertadores 2017'),
('Camisa Grêmio 2017 Umbro Libertadores Goleiro', 2017, 'Umbro', 'Goleiro', 'Marcelo Grohe', 1, 'GG', 'disponivel', 380.00, 700.00, 800.00, 2, '2024-02-20', 'Loja Especializada', 'Camisa de goleiro raríssima'),
('Camisa Grêmio 2023 Umbro Home', 2023, 'Umbro', 'Home', NULL, NULL, 'M', 'disponivel', 280.00, 450.00, 400.00, 3, '2024-03-10', 'Fornecedor Online', 'Modelo atual'),
('Camisa Grêmio 2023 Umbro Away', 2023, 'Umbro', 'Away', NULL, NULL, 'G', 'disponivel', 280.00, 450.00, 400.00, 3, '2024-03-10', 'Fornecedor Online', 'Uniforme 2 de 2023');

-- Inserir Clientes de Exemplo
INSERT INTO clientes (nome, email, telefone, cidade, estado, observacoes) VALUES
('João Silva', 'joao.silva@email.com', '(51) 99999-1111', 'Novo Hamburgo', 'RS', 'Cliente VIP, colecionador'),
('Maria Santos', 'maria.santos@email.com', '(51) 98888-2222', 'São Leopoldo', 'RS', 'Interesse em camisetas dos anos 90'),
('Pedro Oliveira', 'pedro.oliveira@email.com', '(51) 97777-3333', 'Porto Alegre', 'RS', 'Cliente regular');

-- Inserir Vendas de Exemplo
INSERT INTO vendas (item_id, cliente_id, valor_venda, valor_compra, data_venda, forma_pagamento, observacoes) VALUES
(1, 1, 1500.00, 800.00, '2024-06-15', 'PIX', 'Venda rápida, cliente muito satisfeito'),
(3, 2, 800.00, 450.00, '2024-07-20', 'Transferência', 'Enviado via Correios');

-- Atualizar situação dos itens vendidos
UPDATE itens SET situacao = 'vendido' WHERE id IN (1, 3);

-- Inserir Trocas de Exemplo
INSERT INTO trocas (item_dado_id, item_recebido_id, valor_item_dado, valor_item_recebido, data_troca, observacoes) VALUES
(5, 6, 280.00, 280.00, '2024-08-10', 'Troca sem diferença de valor');

-- Inserir Wishlist de Exemplo
INSERT INTO wishlist (nome, ano, marca, modelo, jogador, tamanho, valor_estimado, prioridade, observacoes, status) VALUES
('Camisa Grêmio 1981 Topper Libertadores', 1981, 'Topper', 'Home', NULL, 'M', 2500.00, 'urgente', 'Primeira Libertadores do clube', 'ativo'),
('Camisa Grêmio 2001 Penalty Copa do Brasil', 2001, 'Penalty', 'Home', 'Anderson', 10, 'G', 1800.00, 'alta', 'Camisa da conquista da Copa do Brasil', 'ativo'),
('Camisa Grêmio 1989 Topper Brasileirão', 1989, 'Topper', 'Home', 'Renato', 7, 'M', 1500.00, 'media', 'Último título brasileiro', 'ativo'),
('Camisa Grêmio 2016 Umbro Centenário', 2016, 'Umbro', 'Especial', NULL, 'M', 800.00, 'baixa', 'Edição comemorativa dos 100 anos', 'ativo');

-- Inserir Histórico de Preços
INSERT INTO historico_precos (item_id, valor, tipo_valor, fonte, data_registro, observacoes) VALUES
(2, 600.00, 'compra', 'Colecionador Porto Alegre', '2024-01-15', 'Valor pago na aquisição'),
(2, 1400.00, 'mercado', 'Mercado Livre', '2024-05-01', 'Preço médio no mercado'),
(2, 1200.00, 'venda', 'Preço definido', '2024-06-01', 'Preço de venda estabelecido'),
(4, 380.00, 'compra', 'Loja Especializada', '2024-02-20', 'Valor pago na aquisição'),
(4, 800.00, 'mercado', 'eBay', '2024-06-15', 'Avaliação internacional'),
(5, 280.00, 'compra', 'Fornecedor Online', '2024-03-10', 'Valor pago na aquisição'),
(5, 400.00, 'mercado', 'Mercado Livre', '2024-08-01', 'Preço médio atual');

-- Inserir Imagens Placeholder
INSERT INTO imagens (item_id, url_blob, thumbnail_url, nome_arquivo, tamanho_bytes, tipo_mime, e_principal) VALUES
(2, 'https://placeholder.com/600x800', 'https://placeholder.com/150x200', 'gremio-1995-home.jpg', 125000, 'image/jpeg', 1),
(4, 'https://placeholder.com/600x800', 'https://placeholder.com/150x200', 'gremio-2017-goleiro.jpg', 130000, 'image/jpeg', 1),
(5, 'https://placeholder.com/600x800', 'https://placeholder.com/150x200', 'gremio-2023-home.jpg', 115000, 'image/jpeg', 1),
(6, 'https://placeholder.com/600x800', 'https://placeholder.com/150x200', 'gremio-2023-away.jpg', 120000, 'image/jpeg', 1);
