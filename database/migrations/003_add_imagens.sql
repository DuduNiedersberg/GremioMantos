-- =============================================================================
-- MIGRATION 003: Adicionar Tabela de Imagens
-- =============================================================================

-- Tabela de Imagens (preparado para Azure Blob Storage)
CREATE TABLE imagens (
    id INT IDENTITY(1,1) PRIMARY KEY,
    item_id INT FOREIGN KEY REFERENCES itens(id) ON DELETE CASCADE,
    url_blob NVARCHAR(500) NOT NULL,
    thumbnail_url NVARCHAR(500),
    nome_arquivo NVARCHAR(255),
    tamanho_bytes INT,
    tipo_mime VARCHAR(50),
    e_principal BIT DEFAULT 0,
    uploaded_em DATETIME2 DEFAULT GETDATE(),
    INDEX idx_imagens_item (item_id),
    INDEX idx_imagens_principal (item_id, e_principal)
);

-- Garantir apenas uma imagem principal por item
CREATE UNIQUE INDEX idx_uma_imagem_principal 
ON imagens(item_id) 
WHERE e_principal = 1;
