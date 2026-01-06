# Production Database Schema Documentation

## Overview
This document describes the production Azure SQL database schema for the Grêmio Mantos application, including tables, views, relationships, and consistency rules.

## Database Objects

### Tables

#### 1. `dbo.itens`
Stores individual items (primarily jerseys/camisetas) in the collection.

**Columns:**
- `id` (INT, PK, IDENTITY): Primary key
- `tipo` (VARCHAR, NOT NULL): Type of item (default: 'camiseta')
- `nome` (NVARCHAR, NOT NULL): Item name/description
- `ano` (INT): Year/season
- `modelo` (NVARCHAR): Model/style
- `marca` (NVARCHAR): Brand/manufacturer
- `jogador` (NVARCHAR): Player name
- `numero_camisa` (INT): Jersey number (exposed as `numero` in API)
- `tamanho` (VARCHAR): Size
- `cor_principal` (NVARCHAR): Primary color
- `condicao` (VARCHAR): Condition
- `autografada` (BIT): Whether autographed
- `autografo_descricao` (NVARCHAR): Autograph description
- `valor_compra` (DECIMAL, NOT NULL): Purchase price
- `valor_venda` (DECIMAL): Sale price
- `lucro_calculado` (DECIMAL): Calculated profit (valor_venda - valor_compra)
- `situacao` (VARCHAR, NOT NULL): Status (disponivel, vendido, trocado, reservado)
- `destino` (VARCHAR): Destination (venda, troca, etc.)
- `data_aquisicao` (DATE): Acquisition date
- `data_saida` (DATE): Exit/sale date
- `observacoes` (NVARCHAR): Notes
- `criado_em` (DATETIME2): Creation timestamp
- `atualizado_em` (DATETIME2): Last update timestamp
- `lote_id` (INT, FK): Reference to lotes table
- `valor_mercado` (DECIMAL): Market value

**Foreign Keys:**
- `lote_id` → `dbo.lotes(id)` ON DELETE SET NULL

**Indexes:**
- `idx_itens_situacao` on `situacao`
- `idx_itens_lote` on `lote_id`

#### 2. `dbo.lotes`
Stores batches of items purchased together.

**Columns:**
- `id` (INT, PK, IDENTITY): Primary key
- `nome` (NVARCHAR, NOT NULL): Batch name
- `quantidade_total` (INT): Total quantity in batch
- `quantidade_disponivel` (INT): Available quantity
- `valor_unitario_compra` (DECIMAL): Unit purchase price
- `data_aquisicao` (DATE): Acquisition date
- `observacoes` (NVARCHAR): Notes
- `criado_em` (DATETIME2): Creation timestamp

#### 3. `dbo.clientes`
Stores customer/client information.

**Columns:**
- `id` (INT, PK, IDENTITY): Primary key
- `nome` (NVARCHAR, NOT NULL): Full name
- `apelido` (NVARCHAR): Nickname
- `telefone` (VARCHAR): Phone number
- `instagram` (NVARCHAR): Instagram handle
- `cidade` (NVARCHAR): City
- `tipo` (VARCHAR): Customer type
- `observacoes` (NVARCHAR): Notes
- `criado_em` (DATETIME2): Creation timestamp

**Indexes:**
- `idx_clientes_nome` on `nome`

#### 4. `dbo.transacoes`
Stores all transactions (sales, purchases, valuations).

**Columns:**
- `id` (INT, PK, IDENTITY): Primary key
- `tipo_transacao` (VARCHAR, NOT NULL): Transaction type (venda, compra, avaliacao)
- `item_id` (INT, NOT NULL, FK): Reference to item
- `cliente_id` (INT, FK): Reference to customer (required for sales)
- `valor` (DECIMAL, NOT NULL): Transaction amount
- `data_transacao` (DATE, NOT NULL): Transaction date
- `forma_pagamento` (VARCHAR): Payment method
- `observacoes` (NVARCHAR): Notes
- `criado_em` (DATETIME2): Creation timestamp
- `atualizado_em` (DATETIME2): Last update timestamp

**Foreign Keys:**
- `item_id` → `dbo.itens(id)` ON DELETE CASCADE
- `cliente_id` → `dbo.clientes(id)` ON DELETE SET NULL

**Indexes:**
- `idx_transacoes_tipo` on `tipo_transacao`
- `idx_transacoes_data` on `data_transacao`
- `idx_transacoes_item` on `item_id`
- `idx_transacoes_cliente` on `cliente_id`

#### 5. `dbo.trocas`
Stores trade transactions between items.

**Columns:**
- `id` (INT, PK, IDENTITY): Primary key
- `item_dado_id` (INT, NOT NULL, FK): Item given in trade
- `item_recebido_id` (INT, NOT NULL, FK): Item received in trade
- `valor_adicional` (DECIMAL): Additional cash value
- `quem_pagou` (VARCHAR): Who paid the additional amount
- `data_troca` (DATE): Trade date
- `observacoes` (NVARCHAR): Notes
- `criado_em` (DATETIME2): Creation timestamp
- `status` (VARCHAR, NOT NULL, DEFAULT 'ativa'): Trade status (ativa, cancelada)
- `cancelada_em` (DATETIME2): Cancellation timestamp

**Foreign Keys:**
- `item_dado_id` → `dbo.itens(id)` ON DELETE NO ACTION
- `item_recebido_id` → `dbo.itens(id)` ON DELETE NO ACTION

**Constraints:**
- CHECK: `item_dado_id != item_recebido_id`
- CHECK: `status IN ('ativa', 'cancelada')`

**Indexes:**
- `idx_trocas_data` on `data_troca`
- `idx_trocas_status` on `status`

#### 6. `dbo.wishlist`
Stores desired items to acquire.

**Columns:**
- `id` (INT, PK, IDENTITY): Primary key
- `nome` (NVARCHAR, NOT NULL): Item name
- `ano` (INT): Year/season
- `marca` (NVARCHAR): Brand
- `modelo` (NVARCHAR): Model
- `jogador` (NVARCHAR): Player name
- `tamanho` (VARCHAR): Size
- `valor_estimado` (DECIMAL): Estimated value
- `prioridade` (VARCHAR, NOT NULL): Priority (baixa, media, alta, urgente)
- `observacoes` (NVARCHAR): Notes
- `status` (VARCHAR, NOT NULL): Status (ativo, encontrado, desistido)
- `criado_em` (DATETIME2): Creation timestamp
- `atualizado_em` (DATETIME2): Last update timestamp

#### 7. `dbo.historico_precos`
Stores price history for items.

**Columns:**
- `id` (INT, PK, IDENTITY): Primary key
- `item_id` (INT, NOT NULL, FK): Reference to item
- `valor` (DECIMAL, NOT NULL): Price value
- `tipo_valor` (VARCHAR, NOT NULL): Value type (compra, venda, mercado, avaliacao)
- `fonte` (NVARCHAR): Source of valuation
- `data_registro` (DATE): Registration date
- `observacoes` (NVARCHAR): Notes
- `criado_em` (DATETIME2): Creation timestamp

**Foreign Keys:**
- `item_id` → `dbo.itens(id)` ON DELETE CASCADE

#### 8. `dbo.imagens`
Stores image references for items.

**Columns:**
- `id` (INT, PK, IDENTITY): Primary key
- `item_id` (INT, NOT NULL, FK): Reference to item
- `url_blob` (NVARCHAR, NOT NULL): Blob storage URL
- `thumbnail_url` (NVARCHAR): Thumbnail URL
- `nome_arquivo` (NVARCHAR): File name
- `tamanho_bytes` (BIGINT): File size in bytes
- `tipo_mime` (VARCHAR): MIME type
- `e_principal` (BIT, NOT NULL): Whether primary image
- `uploaded_em` (DATETIME2): Upload timestamp

**Foreign Keys:**
- `item_id` → `dbo.itens(id)` ON DELETE CASCADE

### Views

#### 1. `dbo.vw_dashboard_metricas`
Provides dashboard metrics summary.

**Columns (in order):**
1. `total_itens` (INT): Total number of items
2. `itens_estoque` (INT): Items in stock (disponivel)
3. `itens_vendidos` (INT): Items sold
4. `itens_trocados` (INT): Items traded
5. `capital_estoque` (DECIMAL): Value of items in stock
6. `total_investido_vendas` (DECIMAL): Total invested in sold items
7. `total_vendas` (DECIMAL): Total sales revenue
8. `lucro_total` (DECIMAL): Total profit
9. `margem_media` (DECIMAL): Average profit margin

**Usage:**
```sql
SELECT TOP 1 * FROM dbo.vw_dashboard_metricas
```

#### 2. `dbo.vw_historico_vendas`
Provides sales history from items table.

**Columns:**
- `id` (INT): Item ID
- `nome` (NVARCHAR): Item name
- `ano` (INT): Year
- `tipo` (VARCHAR): Type
- `marca` (NVARCHAR): Brand
- `jogador` (NVARCHAR): Player
- `valor_compra` (DECIMAL): Purchase price
- `valor_venda` (DECIMAL): Sale price
- `lucro_calculado` (DECIMAL): Calculated profit
- `data_saida` (DATE): Sale date
- `destino` (VARCHAR): Destination
- `cliente_id` (INT): Customer ID (from transacoes)
- `cliente_nome` (NVARCHAR): Customer name

**Source:**
Items where `situacao = 'vendido'` and `destino = 'venda'`, joined with transacoes and clientes.

#### 3. `dbo.vw_inventario_disponivel`
Provides available inventory.

**Columns:**
- All columns from `itens` where `situacao = 'disponivel'`

#### 4. `dbo.vw_relatorio_lucros`
Provides profit reports.

**Columns:**
- Aggregated profit data by period, category, etc.

## Consistency Rules

### 1. Sale Transaction → Item Update
When creating or updating a `venda` transaction:
- Update related `itens` row:
  - `situacao = 'vendido'`
  - `destino = 'venda'`
  - `data_saida = data_transacao` (or GETDATE() if null)
  - `valor_venda = transacoes.valor`
  - `lucro_calculado = valor_venda - valor_compra`

### 2. Sale Transaction Delete → Item Revert
When deleting a sale transaction:
- Check if there are other sale transactions for the same item
- If no other sales exist, revert item to available:
  - `situacao = 'disponivel'`
  - `destino = NULL`
  - `data_saida = NULL`
  - `valor_venda = NULL`
  - `lucro_calculado = NULL`

### 3. Trade Creation → Item Updates
When creating or updating a trade:
- Update `item_dado_id`:
  - `situacao = 'trocado'`
  - `destino = 'troca'`
  - `data_saida = data_troca`
- Update `item_recebido_id`:
  - `situacao = 'disponivel'`
  - `destino = NULL`
  - `data_saida = NULL`
  - `data_aquisicao = data_troca`

### 4. Trade Cancellation → Item Revert
When canceling a trade (via `/api/trocas/{id}/cancelar` or PUT with status='cancelada'):
- Update trade record:
  - `status = 'cancelada'`
  - `cancelada_em = GETDATE()`
- Revert item states to pre-trade condition:
  - `item_dado_id`: Restore to appropriate state (typically disponivel)
  - `item_recebido_id`: May need different handling based on business logic

### 5. Wishlist Conversion → Item Creation
When converting wishlist item to actual item:
- Create new item in `itens` with data from wishlist
- Set item defaults:
  - `tipo = 'camiseta'`
  - `situacao = 'disponivel'`
- Update wishlist:
  - `status = 'encontrado'`

## API Field Mapping

### numero ↔ numero_camisa
- **API Field**: `numero` (exposed in JSON requests/responses)
- **Database Column**: `numero_camisa`
- **Mapping**: Automatic in API layer for backward compatibility

## Business Rules

### 1. CORS Headers
- All endpoints must return CORS headers on both success AND error responses
- Origin header should be passed through to all response functions

### 2. Item Defaults
- `tipo`: Default to `'camiseta'` if not provided
- `situacao`: Default to `'disponivel'` if not provided
- `valor_compra`: Required field (NOT NULL in database)

### 3. Transaction Requirements
- Sale transactions (`tipo_transacao = 'venda'`) require `cliente_id`
- Transaction value must be positive
- Date defaults to current date if not provided

### 4. Trade Rules
- Cannot trade same item with itself (`item_dado_id != item_recebido_id`)
- Hard DELETE is blocked - must use cancel endpoint
- Cancel endpoint updates status flag, preserving audit trail

### 5. Dashboard Data Source
- Metrics come from `dbo.vw_dashboard_metricas` view (single row)
- Inventory list from `dbo.vw_inventario_disponivel`
- Recent sales from `dbo.vw_historico_vendas`
- Monthly sales: GROUP BY FORMAT(data_saida, 'yyyy-MM') from `vw_historico_vendas`

## Query Examples

### Get Dashboard Metrics
```sql
SELECT TOP 1 * FROM dbo.vw_dashboard_metricas
```

### Get Sales History with Customer
```sql
SELECT * FROM dbo.vw_historico_vendas
ORDER BY data_saida DESC
```

### Get Available Inventory
```sql
SELECT * FROM dbo.vw_inventario_disponivel
ORDER BY criado_em DESC
```

### Create Sale Transaction
```sql
BEGIN TRANSACTION;

-- Insert transaction
INSERT INTO dbo.transacoes (tipo_transacao, item_id, cliente_id, valor, data_transacao)
VALUES ('venda', @item_id, @cliente_id, @valor, @data_transacao);

-- Update item status
UPDATE dbo.itens
SET situacao = 'vendido',
    destino = 'venda',
    data_saida = @data_transacao,
    valor_venda = @valor,
    lucro_calculado = @valor - valor_compra
WHERE id = @item_id;

COMMIT TRANSACTION;
```

### Cancel Trade
```sql
UPDATE dbo.trocas
SET status = 'cancelada',
    cancelada_em = GETDATE()
WHERE id = @id;

-- Note: Item revert logic handled in API layer
```

## Migration Notes

### Required Migrations for Production

These migrations add new functionality required by the CRUD API:

1. `005_add_transacoes_table.sql` - Creates transacoes table for tracking all transaction types
2. `006_add_trocas_status.sql` - Adds status tracking to trocas for soft-cancel support

### Previously Applied Migrations

These migrations create supporting tables:

1. `001_add_wishlist.sql` - Creates wishlist table
2. `002_add_historico_precos.sql` - Creates historico_precos table
3. `003_add_imagens.sql` - Creates imagens table
4. `004_create_missing_tables_prod.sql` - Creates missing tables in production (aggregates 001-003)

All migrations are idempotent and can be run multiple times safely.
