-- =============================================================================
-- MIGRATION 002: Adicionar Tabela de Histórico de Preços
-- =============================================================================

-- Tabela de Histórico de Preços
CREATE TABLE historico_precos (
    id INT IDENTITY(1,1) PRIMARY KEY,
    item_id INT FOREIGN KEY REFERENCES itens(id) ON DELETE CASCADE,
    valor DECIMAL(10,2) NOT NULL,
    tipo_valor VARCHAR(20) CHECK (tipo_valor IN ('compra', 'venda', 'mercado', 'avaliacao')),
    fonte NVARCHAR(255),
    data_registro DATE DEFAULT CAST(GETDATE() AS DATE),
    observacoes NVARCHAR(500),
    criado_em DATETIME2 DEFAULT GETDATE(),
    INDEX idx_historico_item (item_id),
    INDEX idx_historico_data (data_registro),
    INDEX idx_historico_tipo (tipo_valor)
);
