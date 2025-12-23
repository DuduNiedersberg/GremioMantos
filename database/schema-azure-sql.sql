-- =============================================================================
-- BOLICHO DO GRÊMIO - VALE DOS SINOS
-- Schema Principal - Azure SQL Database
-- =============================================================================

-- Tabela de Itens (Camisetas)
CREATE TABLE itens (
    id INT IDENTITY(1,1) PRIMARY KEY,
    nome NVARCHAR(255) NOT NULL,
    ano INT,
    marca NVARCHAR(100),
    modelo NVARCHAR(100),
    jogador NVARCHAR(100),
    numero INT,
    tamanho VARCHAR(10),
    situacao VARCHAR(20) DEFAULT 'disponivel' CHECK (situacao IN ('disponivel', 'vendido', 'trocado', 'reservado')),
    valor_compra DECIMAL(10,2),
    valor_venda DECIMAL(10,2),
    valor_mercado DECIMAL(10,2),
    lote_id INT,
    data_aquisicao DATE,
    origem NVARCHAR(255),
    observacoes NVARCHAR(MAX),
    criado_em DATETIME2 DEFAULT GETDATE(),
    atualizado_em DATETIME2 DEFAULT GETDATE(),
    INDEX idx_itens_situacao (situacao),
    INDEX idx_itens_ano (ano),
    INDEX idx_itens_lote (lote_id)
);

-- Tabela de Lotes
CREATE TABLE lotes (
    id INT IDENTITY(1,1) PRIMARY KEY,
    nome NVARCHAR(255) NOT NULL,
    descricao NVARCHAR(500),
    data_compra DATE,
    valor_total DECIMAL(10,2),
    fornecedor NVARCHAR(255),
    quantidade_itens INT DEFAULT 0,
    criado_em DATETIME2 DEFAULT GETDATE(),
    atualizado_em DATETIME2 DEFAULT GETDATE(),
    INDEX idx_lotes_data (data_compra)
);

-- Foreign Key para Lotes
ALTER TABLE itens 
ADD CONSTRAINT fk_itens_lote 
FOREIGN KEY (lote_id) REFERENCES lotes(id) ON DELETE SET NULL;

-- Tabela de Clientes
CREATE TABLE clientes (
    id INT IDENTITY(1,1) PRIMARY KEY,
    nome NVARCHAR(255) NOT NULL,
    email NVARCHAR(255),
    telefone VARCHAR(20),
    cidade NVARCHAR(100),
    estado VARCHAR(2),
    observacoes NVARCHAR(MAX),
    criado_em DATETIME2 DEFAULT GETDATE(),
    atualizado_em DATETIME2 DEFAULT GETDATE(),
    INDEX idx_clientes_nome (nome),
    INDEX idx_clientes_cidade (cidade)
);

-- Tabela de Vendas
CREATE TABLE vendas (
    id INT IDENTITY(1,1) PRIMARY KEY,
    item_id INT NOT NULL FOREIGN KEY REFERENCES itens(id) ON DELETE CASCADE,
    cliente_id INT FOREIGN KEY REFERENCES clientes(id) ON DELETE SET NULL,
    valor_venda DECIMAL(10,2) NOT NULL,
    valor_compra DECIMAL(10,2),
    lucro DECIMAL(10,2),
    data_venda DATE DEFAULT CAST(GETDATE() AS DATE),
    forma_pagamento VARCHAR(50),
    observacoes NVARCHAR(500),
    criado_em DATETIME2 DEFAULT GETDATE(),
    INDEX idx_vendas_data (data_venda),
    INDEX idx_vendas_item (item_id),
    INDEX idx_vendas_cliente (cliente_id)
);

-- Tabela de Trocas
CREATE TABLE trocas (
    id INT IDENTITY(1,1) PRIMARY KEY,
    item_dado_id INT FOREIGN KEY REFERENCES itens(id) ON DELETE NO ACTION,
    item_recebido_id INT FOREIGN KEY REFERENCES itens(id) ON DELETE NO ACTION,
    valor_item_dado DECIMAL(10,2),
    valor_item_recebido DECIMAL(10,2),
    diferenca DECIMAL(10,2),
    data_troca DATE DEFAULT CAST(GETDATE() AS DATE),
    observacoes NVARCHAR(500),
    criado_em DATETIME2 DEFAULT GETDATE(),
    INDEX idx_trocas_data (data_troca),
    CONSTRAINT chk_itens_diferentes CHECK (item_dado_id != item_recebido_id)
);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Trigger para atualizar atualizado_em automaticamente
GO
CREATE OR ALTER TRIGGER trg_itens_update
ON itens
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE itens
    SET atualizado_em = GETDATE()
    FROM itens i
    INNER JOIN inserted ins ON i.id = ins.id;
END;
GO

CREATE OR ALTER TRIGGER trg_lotes_update
ON lotes
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE lotes
    SET atualizado_em = GETDATE()
    FROM lotes l
    INNER JOIN inserted ins ON l.id = ins.id;
END;
GO

CREATE OR ALTER TRIGGER trg_clientes_update
ON clientes
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE clientes
    SET atualizado_em = GETDATE()
    FROM clientes c
    INNER JOIN inserted ins ON c.id = ins.id;
END;
GO

-- Trigger para calcular lucro automaticamente nas vendas
CREATE OR ALTER TRIGGER trg_vendas_calcular_lucro
ON vendas
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE vendas
    SET lucro = v.valor_venda - ISNULL(v.valor_compra, 0)
    FROM vendas v
    INNER JOIN inserted ins ON v.id = ins.id;
END;
GO

-- Trigger para calcular diferença nas trocas
CREATE OR ALTER TRIGGER trg_trocas_calcular_diferenca
ON trocas
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE trocas
    SET diferenca = ISNULL(t.valor_item_recebido, 0) - ISNULL(t.valor_item_dado, 0)
    FROM trocas t
    INNER JOIN inserted ins ON t.id = ins.id;
END;
GO

-- Trigger para atualizar quantidade de itens no lote
CREATE OR ALTER TRIGGER trg_lotes_atualizar_quantidade
ON itens
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Atualizar contagem para lotes afetados por INSERT ou UPDATE
    IF EXISTS (SELECT * FROM inserted)
    BEGIN
        UPDATE lotes
        SET quantidade_itens = (
            SELECT COUNT(*) 
            FROM itens 
            WHERE lote_id = lotes.id
        )
        FROM lotes
        WHERE id IN (SELECT DISTINCT lote_id FROM inserted WHERE lote_id IS NOT NULL);
    END
    
    -- Atualizar contagem para lotes afetados por DELETE
    IF EXISTS (SELECT * FROM deleted)
    BEGIN
        UPDATE lotes
        SET quantidade_itens = (
            SELECT COUNT(*) 
            FROM itens 
            WHERE lote_id = lotes.id
        )
        FROM lotes
        WHERE id IN (SELECT DISTINCT lote_id FROM deleted WHERE lote_id IS NOT NULL);
    END
END;
GO
