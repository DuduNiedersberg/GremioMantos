-- =============================================================================
-- MIGRATION 004: Create Missing Tables in Production
-- Creates wishlist, historico_precos, and imagens tables idempotently
-- =============================================================================

-- Create Wishlist Table
IF OBJECT_ID('dbo.wishlist', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.wishlist (
        id INT IDENTITY(1,1) PRIMARY KEY,
        nome NVARCHAR(255) NOT NULL,
        ano INT,
        marca NVARCHAR(100),
        modelo NVARCHAR(100),
        jogador NVARCHAR(100),
        tamanho VARCHAR(10),
        valor_estimado DECIMAL(10,2),
        prioridade VARCHAR(20) DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta', 'urgente')),
        observacoes NVARCHAR(MAX),
        status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'encontrado', 'desistido')),
        criado_em DATETIME2 DEFAULT GETDATE(),
        atualizado_em DATETIME2 DEFAULT GETDATE(),
        INDEX idx_wishlist_prioridade (prioridade),
        INDEX idx_wishlist_status (status)
    );
    PRINT 'Table dbo.wishlist created successfully';
END
ELSE
BEGIN
    PRINT 'Table dbo.wishlist already exists, skipping';
END
GO

-- Create Trigger for wishlist.atualizado_em
IF OBJECT_ID('dbo.trg_wishlist_update', 'TR') IS NULL
BEGIN
    EXEC('
    CREATE TRIGGER trg_wishlist_update
    ON dbo.wishlist
    AFTER UPDATE
    AS
    BEGIN
        SET NOCOUNT ON;
        UPDATE dbo.wishlist
        SET atualizado_em = GETDATE()
        FROM dbo.wishlist w
        INNER JOIN inserted ins ON w.id = ins.id;
    END
    ');
    PRINT 'Trigger trg_wishlist_update created successfully';
END
ELSE
BEGIN
    PRINT 'Trigger trg_wishlist_update already exists, skipping';
END
GO

-- Create Historico de Precos Table
IF OBJECT_ID('dbo.historico_precos', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.historico_precos (
        id INT IDENTITY(1,1) PRIMARY KEY,
        item_id INT NOT NULL,
        valor DECIMAL(10,2) NOT NULL,
        tipo_valor VARCHAR(20) CHECK (tipo_valor IN ('compra', 'venda', 'mercado', 'avaliacao')),
        fonte NVARCHAR(255),
        data_registro DATE DEFAULT CAST(GETDATE() AS DATE),
        observacoes NVARCHAR(500),
        criado_em DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT fk_historico_precos_item FOREIGN KEY (item_id) REFERENCES dbo.itens(id) ON DELETE CASCADE,
        INDEX idx_historico_item (item_id),
        INDEX idx_historico_data (data_registro),
        INDEX idx_historico_tipo (tipo_valor)
    );
    PRINT 'Table dbo.historico_precos created successfully';
END
ELSE
BEGIN
    PRINT 'Table dbo.historico_precos already exists, skipping';
END
GO

-- Create Imagens Table
IF OBJECT_ID('dbo.imagens', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.imagens (
        id INT IDENTITY(1,1) PRIMARY KEY,
        item_id INT NOT NULL,
        url_blob NVARCHAR(500) NOT NULL,
        thumbnail_url NVARCHAR(500),
        nome_arquivo NVARCHAR(255),
        tamanho_bytes INT,
        tipo_mime VARCHAR(50),
        e_principal BIT DEFAULT 0,
        uploaded_em DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT fk_imagens_item FOREIGN KEY (item_id) REFERENCES dbo.itens(id) ON DELETE CASCADE,
        INDEX idx_imagens_item (item_id),
        INDEX idx_imagens_principal (item_id, e_principal)
    );
    PRINT 'Table dbo.imagens created successfully';
END
ELSE
BEGIN
    PRINT 'Table dbo.imagens already exists, skipping';
END
GO

-- Create unique filtered index to ensure only one principal image per item
IF NOT EXISTS (
    SELECT 1 
    FROM sys.indexes 
    WHERE name = 'idx_uma_imagem_principal' 
    AND object_id = OBJECT_ID('dbo.imagens')
)
BEGIN
    CREATE UNIQUE INDEX idx_uma_imagem_principal 
    ON dbo.imagens(item_id) 
    WHERE e_principal = 1;
    PRINT 'Unique filtered index idx_uma_imagem_principal created successfully';
END
ELSE
BEGIN
    PRINT 'Unique filtered index idx_uma_imagem_principal already exists, skipping';
END
GO

PRINT 'Migration 004 completed successfully';
GO
