# API Schema Adaptation - Summary of Changes

## Overview
The Azure Functions API has been adapted to match the production Azure SQL schema. This document summarizes the key changes made.

## Key Schema Differences

### 1. **Itens Table - Field Mapping**
- **API Field**: `numero` ↔ **DB Field**: `numero_camisa`
- All GET responses now map `numero_camisa` → `numero` for frontend compatibility
- All POST/PUT requests map `numero` → `numero_camisa` for database compatibility

### 2. **Vendas Table → View**
- Production does NOT have a `vendas` table
- All queries now use `dbo.vw_historico_vendas` view instead
- View columns: `id, nome, ano, tipo, marca, jogador, valor_compra, valor_venda, lucro_calculado, data_saida, destino, cliente_id, cliente_nome`

### 3. **New Required Fields in Itens**
Production schema has these as NOT NULL:
- `tipo` - defaults to `'camiseta'`
- `valor_compra` - defaults to `0`
- `situacao` - defaults to `'disponivel'`

## API Endpoint Changes

### `/api/itens`
✅ GET - Returns items with `numero` field (mapped from `numero_camisa`)
✅ POST - Accepts `numero`, maps to `numero_camisa`, ensures NOT NULL fields
✅ PUT - Accepts `numero`, maps to `numero_camisa`
✅ DELETE - No changes

### `/api/vendas`
✅ GET - Reads from `dbo.vw_historico_vendas` with pagination and search
✅ GET /{id} - Reads single sale from view
❌ POST - Returns 501 Not Implemented (no table to write to)
❌ PUT - Returns 501 Not Implemented
❌ DELETE - Returns 501 Not Implemented

### `/api/dashboard`
✅ Fixed `ISNULL` → `COALESCE` for NULL handling
✅ Uses `dbo.vw_historico_vendas` for sales metrics
✅ Handles NULL `valor_mercado` with fallback to `valor_venda` then `0`
✅ Sales by month now aggregates from view

### `/api/clientes`
✅ Removed: `email`, `estado`, `atualizado_em`
✅ Added: `apelido`, `instagram`, `tipo`
✅ Updated search to include new fields

### `/api/lotes`
✅ Removed: `descricao`, `fornecedor`, `data_compra`, `valor_total`, `quantidade_itens`, `atualizado_em`
✅ Added: `quantidade_total`, `quantidade_disponivel`, `valor_unitario_compra`, `data_aquisicao`
✅ Updated INSERT queries to use new fields

### `/api/trocas`
✅ Removed: `valor_item_dado`, `valor_item_recebido`, `diferenca`
✅ Added: `valor_adicional`, `quem_pagou`
✅ Updated INSERT queries to use new fields

### `/api/wishlist` & `/api/itens/{id}/historico-precos`
✅ No changes needed - will work after migration 004 is applied

## Migration Required

### **IMPORTANT**: Run Migration 004
The following tables are missing in production and must be created:
- `dbo.wishlist`
- `dbo.historico_precos`
- `dbo.imagens`

Execute: `database/migrations/004_create_missing_tables_prod.sql`

The migration is idempotent and can be run multiple times safely.

## Backward Compatibility

### Frontend Compatibility Maintained
- API continues to expose `numero` field (not `numero_camisa`)
- Response structures remain consistent
- CORS headers maintained on all responses

### Breaking Changes
- **Vendas POST/PUT/DELETE**: Now return 501 Not Implemented
  - To record a sale, update the item in `/api/itens` with:
    - `situacao: 'vendido'`
    - `destino: 'venda'`
    - `data_saida: <date>`
    - `valor_venda: <amount>`

## Testing Checklist

After deployment:
- [ ] Test `/api/itens` GET with pagination
- [ ] Test `/api/itens` POST with `numero` field
- [ ] Test `/api/itens/{id}` returns `numero` (not `numero_camisa`)
- [ ] Test `/api/dashboard` returns 200 without SQL errors
- [ ] Test `/api/vendas` GET returns sales with pagination
- [ ] Test `/api/vendas` POST returns 501
- [ ] Test `/api/clientes` with new fields (`apelido`, `instagram`)
- [ ] Test `/api/lotes` with new fields
- [ ] Test `/api/trocas` with new fields
- [ ] Apply migration 004 to production
- [ ] Test `/api/wishlist` after migration
- [ ] Test `/api/itens/{id}/historico-precos` after migration

## Error Handling

- SQL errors are logged server-side via `context.error()`
- Generic error messages returned to clients in production
- CORS headers present on both success and error responses
- Validation errors from Zod include detailed field information

## Build & Deployment

```bash
cd api
npm install
npm run build
```

All TypeScript code compiles successfully with no errors.
