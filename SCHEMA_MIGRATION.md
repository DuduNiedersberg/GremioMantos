# Schema Migration Guide

## Production Schema Alignment

This document describes the schema changes made to align the API with the production Azure SQL database.

## Changes Made

### 1. Itens Table
The production `itens` table has different columns than the repo schema:

**Production Columns:**
- `id`, `tipo` (NOT NULL), `nome`, `ano`, `modelo`, `marca`, `jogador`
- `numero_camisa` (was `numero` in repo)
- `tamanho`, `cor_principal`, `condicao`
- `autografada`, `autografo_descricao`
- `valor_compra` (NOT NULL), `valor_venda`, `lucro_calculado`
- `situacao` (NOT NULL), `destino`, `data_aquisicao`, `data_saida`
- `observacoes`, `criado_em`, `atualizado_em`, `lote_id`, `valor_mercado`

**API Changes:**
- API field `numero` is now mapped to DB field `numero_camisa`
- `tipo` defaults to `'camiseta'` if not provided
- `valor_compra` defaults to `0` if not provided
- `situacao` defaults to `'disponivel'` if not provided

### 2. Vendas Table → View
Production does **not** have a `vendas` table. Instead, use the view `dbo.vw_historico_vendas`.

**View Columns:**
- `id`, `nome`, `ano`, `tipo`, `marca`, `jogador`
- `valor_compra`, `valor_venda`, `lucro_calculado`
- `data_saida`, `destino`, `cliente_id`, `cliente_nome`

**API Changes:**
- GET endpoints read from `dbo.vw_historico_vendas`
- POST/PUT/DELETE return 501 Not Implemented (no table to write to)
- To create a "sale", update the item in `itens` table with `situacao='vendido'`, `destino='venda'`, etc.

### 3. Clientes Table
**Production Columns:**
- `id`, `nome`, `apelido`, `telefone`, `instagram`, `cidade`, `tipo`, `observacoes`, `criado_em`

**Removed Columns:**
- `email`, `estado`, `atualizado_em`

### 4. Lotes Table
**Production Columns:**
- `id`, `nome`, `quantidade_total`, `quantidade_disponivel`, `valor_unitario_compra`, `data_aquisicao`, `observacoes`, `criado_em`

**Removed Columns:**
- `descricao`, `data_compra`, `valor_total`, `fornecedor`, `quantidade_itens`, `atualizado_em`

### 5. Trocas Table
**Production Columns:**
- `id`, `item_dado_id`, `item_recebido_id`, `valor_adicional`, `quem_pagou`, `data_troca`, `observacoes`, `criado_em`

**Removed Columns:**
- `valor_item_dado`, `valor_item_recebido`, `diferenca`

### 6. Dashboard Fixes
- Replaced multi-argument `ISNULL` with `COALESCE`
- Use `dbo.vw_historico_vendas` for sales metrics
- Handle NULL `valor_mercado` by falling back to `valor_venda` then `0`

## Missing Tables in Production

The following tables do not exist in production and need to be created:

1. **wishlist**
2. **historico_precos**
3. **imagens**

### Migration 004

Run the migration script `database/migrations/004_create_missing_tables_prod.sql` on the production database to create these tables.

The migration is **idempotent** - it can be run multiple times safely. It checks for table existence before creating them.

```sql
-- Run on production database
-- Connect to your Azure SQL database and execute:
.\database\migrations\004_create_missing_tables_prod.sql
```

## API Compatibility

The API maintains backward compatibility with the frontend by:
- Exposing `numero` in API responses (mapped from `numero_camisa`)
- Accepting `numero` in API requests (mapped to `numero_camisa`)
- Returning appropriate error messages for unsupported operations

## Testing

After deploying these changes:

1. Test `/api/itens` GET/POST with `numero` field
2. Test `/api/dashboard` returns 200 without SQL errors
3. Test `/api/vendas` GET returns sales from view
4. Test `/api/vendas` POST returns 501 Not Implemented
5. Run migration 004 on production
6. Test `/api/wishlist` and `/api/itens/{id}/historico-precos`

## Notes

- CORS headers are maintained on all responses (success and error)
- SQL error details are logged server-side but not exposed to clients in production
- All endpoints maintain pagination support where applicable
