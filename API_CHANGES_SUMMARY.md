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
- `situacao` - defaults to `'estoque'` (items start in inventory)

## API Endpoint Changes

**Note**: All endpoints now use JWT authentication via `protectedRoute()` middleware. Tenant isolation is enforced on all data endpoints - users can only access data belonging to their tenant (except platform admins).

### `/api/platform/tenants`
✅ GET - List all tenants (platform admin only)
✅ GET /{id} - Get tenant details with recent activity (platform admin only)
✅ POST - Create new tenant (platform admin only)
✅ PUT /{id} - Update tenant settings (platform admin only)
✅ PATCH /{id}/toggle-status - Activate/deactivate tenant (platform admin only)
✅ PATCH /{id}/suspend - Suspend/unsuspend tenant (platform admin only)

### `/api/platform/usuarios`
✅ GET - List all users (platform/tenant admins, filtered by tenant for tenant admins)
✅ GET /{id} - Get user details (platform/tenant admins)
✅ POST - Create new user (platform/tenant admins, tenant admin can only create in their tenant)
✅ PUT /{id} - Update user (platform/tenant admins, tenant admin cannot create admin roles)
✅ PATCH /{id}/toggle-status - Activate/deactivate user (platform/tenant admins)
✅ PATCH /{id}/reset-password - Reset user password (platform/tenant admins)

### `/api/itens`
✅ GET - Returns items with `numero` field (mapped from `numero_camisa`)
✅ POST - Accepts `numero`, maps to `numero_camisa`, ensures NOT NULL fields
✅ PUT - Accepts `numero`, maps to `numero_camisa`
✅ DELETE - No changes

### `/api/vendas`
✅ GET - Reads from itens table with `situacao = 'vendida'`, includes JOIN to transacoes and clientes for full sale details
✅ GET /{id} - Reads single sale from itens table
✅ POST - Creates atomic transaction: inserts into `transacoes` table, creates `venda_detalhes` record, and updates item `situacao` to `'vendida'` (fully functional)
❌ PUT - Returns 501 Not Implemented (sales are immutable)
❌ DELETE - Returns 501 Not Implemented (sales are immutable)

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
- **Vendas POST**: Now fully functional - creates atomic transaction with `transacoes` + `venda_detalhes` + updates item to `situacao: 'vendida'`
- **Vendas PUT/DELETE**: Return 501 Not Implemented (sales are immutable after creation)
- **Item situacao values**: Correct value for sold items is `'vendida'` (not `'vendido'`)
- **Authentication**: All endpoints require JWT authentication via Bearer token
- **Tenant Isolation**: Users can only access data within their tenant (except platform admins)

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
