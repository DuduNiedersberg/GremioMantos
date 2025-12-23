-- =============================================================================
-- MIGRATION 001: Adicionar Tabela de Wishlist
-- =============================================================================

-- Tabela de Wishlist (itens desejados)
CREATE TABLE wishlist (
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

-- Trigger para atualizar atualizado_em
GO
CREATE OR ALTER TRIGGER trg_wishlist_update
ON wishlist
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE wishlist
    SET atualizado_em = GETDATE()
    FROM wishlist w
    INNER JOIN inserted ins ON w.id = ins.id;
END;
GO
