-- =============================================================================
-- Migration 005: Add transacoes table for production
-- =============================================================================
-- This migration creates the transacoes table to track all transactions
-- (sales, purchases, etc.) in the production database.
-- =============================================================================

-- Check if table exists before creating
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'transacoes' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.transacoes (
        id INT IDENTITY(1,1) PRIMARY KEY,
        tipo_transacao VARCHAR(20) NOT NULL CHECK (tipo_transacao IN ('venda', 'compra', 'avaliacao')),
        item_id INT NOT NULL,
        cliente_id INT NULL,
        valor DECIMAL(10,2) NOT NULL,
        data_transacao DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE),
        forma_pagamento VARCHAR(50),
        observacoes NVARCHAR(MAX),
        criado_em DATETIME2 NOT NULL DEFAULT GETDATE(),
        atualizado_em DATETIME2 NOT NULL DEFAULT GETDATE(),
        
        -- Foreign keys
        CONSTRAINT fk_transacoes_item FOREIGN KEY (item_id) REFERENCES dbo.itens(id) ON DELETE CASCADE,
        CONSTRAINT fk_transacoes_cliente FOREIGN KEY (cliente_id) REFERENCES dbo.clientes(id) ON DELETE SET NULL,
        
        -- Indexes for performance
        INDEX idx_transacoes_tipo (tipo_transacao),
        INDEX idx_transacoes_data (data_transacao),
        INDEX idx_transacoes_item (item_id),
        INDEX idx_transacoes_cliente (cliente_id)
    );
    
    PRINT 'Table dbo.transacoes created successfully';
END
ELSE
BEGIN
    PRINT 'Table dbo.transacoes already exists, skipping creation';
END;
GO
