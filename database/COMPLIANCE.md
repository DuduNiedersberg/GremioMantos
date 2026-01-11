# API-Database Compliance Documentation

This document describes the database constraints and how the API complies with them.

## Database Constraint Mapping (Production - Source of Truth)

### CHECK Constraints (Enums)

#### clientes.tipo
- **Allowed values:** `'cliente'`, `'fornecedor'`, `'colecionador'`, `'ambos'`
- **Default:** `'cliente'`
- **API compliance:** Enforced via Zod schema in `clienteSchema`

#### itens.tipo
- **Allowed values:** `'camiseta'`, `'jaqueta'`, `'colete'`, `'treino'`, `'livro'`, `'outro'`
- **Default:** `'camiseta'`
- **API compliance:** Enforced via Zod schema in `itemSchema`

#### itens.situacao
- **Allowed values:** `'estoque'`, `'vendida'`, `'trocada'`, `'baixada_colecao'`
- **Default:** `'estoque'`
- **API compliance:** Enforced via Zod schema in `itemSchema`
- **Note:** Previous incorrect values (`'disponivel'`, `'vendido'`, `'trocado'`) have been replaced

#### itens.condicao
- **Allowed values:** `'nova'`, `'seminova'`, `'usada'`, `'vintage'`
- **Default:** `'usada'`
- **API compliance:** Enforced via Zod schema in `itemSchema`

#### transacoes.tipo_transacao
- **Allowed values:** `'compra'`, `'venda'`, `'troca'`
- **API compliance:** Enforced via Zod schema in `transacaoSchema`
- **Note:** Previous incorrect value `'avaliacao'` has been removed

#### trocas.quem_pagou
- **Allowed values:** NULL, `'nos'`, `'cliente'`
- **API compliance:** Enforced via Zod schema in `trocaSchema`

#### historico_precos.tipo_valor
- **Allowed values:** `'compra'`, `'venda'`, `'mercado'`, `'avaliacao'`
- **API compliance:** Enforced via Zod schema in `historicoPrecoSchema`

#### wishlist.prioridade
- **Allowed values:** `'baixa'`, `'media'`, `'alta'`, `'urgente'`
- **Default:** `'media'`
- **API compliance:** Enforced via Zod schema in `wishlistSchema`

#### wishlist.status
- **Allowed values:** `'ativo'`, `'encontrado'`, `'desistido'`
- **Default:** `'ativo'`
- **API compliance:** Enforced via Zod schema in `wishlistSchema`

---

## Foreign Keys and ON DELETE Behavior

| Child Table | FK Column | Parent Table | ON DELETE | API Implementation |
|-------------|-----------|--------------|-----------|-------------------|
| `historico_precos` | `item_id` | `itens.id` | **CASCADE** | No check needed (auto-delete) |
| `imagens` | `item_id` | `itens.id` | **CASCADE** | No check needed (auto-delete) |
| `itens` | `lote_id` | `lotes.id` | NO_ACTION | Set NULL before delete (in `lotes.ts`) |
| `transacoes` | `cliente_id` | `clientes.id` | NO_ACTION | **FK check in `clientes.ts` DELETE** |
| `transacoes` | `item_id` | `itens.id` | NO_ACTION | **FK check in `itens.ts` DELETE** |
| `trocas` | `item_dado_id` | `itens.id` | NO_ACTION | **FK check in `itens.ts` DELETE** |
| `trocas` | `item_recebido_id` | `itens.id` | NO_ACTION | **FK check in `itens.ts` DELETE** |

### FK Check Implementation

#### In `clientes.ts` (DELETE handler)
Before deleting a customer, checks if they have any transactions:
```typescript
const checkTransacoes = await executeQuery<{ count: number }>(
  'SELECT COUNT(*) as count FROM transacoes WHERE cliente_id = @id',
  { id }
);

if (checkTransacoes.recordset[0].count > 0) {
  return successResponse({
    error: 'Não é possível excluir',
    message: `Este cliente possui ${checkTransacoes.recordset[0].count} transação(ões). Remova as transações primeiro.`,
  }, 409, origin);
}
```

#### In `itens.ts` (DELETE handler)
Before deleting an item, checks for both transactions and trades:
```typescript
// Check FK: transacoes
const checkTransacoes = await executeQuery<{ count: number }>(
  'SELECT COUNT(*) as count FROM transacoes WHERE item_id = @id',
  { id }
);

// Check FK: trocas
const checkTrocas = await executeQuery<{ count: number }>(
  'SELECT COUNT(*) as count FROM trocas WHERE item_dado_id = @id OR item_recebido_id = @id',
  { id }
);

const totalRefs = checkTransacoes.recordset[0].count + checkTrocas.recordset[0].count;

if (totalRefs > 0) {
  return successResponse({
    error: 'Não é possível excluir',
    message: `Este item possui ${checkTransacoes.recordset[0].count} transação(ões) e ${checkTrocas.recordset[0].count} troca(s). Remova as referências primeiro.`,
  }, 409, origin);
}
```

---

## Special Constraints

### lotes.quantidade_disponivel
**Constraint:** `quantidade_disponivel <= quantidade_total`

**API compliance:**
- Enforced via Zod schema refinement in `loteSchema`
- The schema validation ensures that `quantidade_disponivel` cannot exceed `quantidade_total`

```typescript
export const loteSchema = z.object({
  // ... other fields
}).refine(
  (data) => {
    if (data.quantidade_disponivel !== undefined && 
        data.quantidade_total !== undefined && 
        data.quantidade_disponivel > data.quantidade_total) {
      return false;
    }
    return true;
  },
  {
    message: 'quantidade_disponivel não pode ser maior que quantidade_total',
    path: ['quantidade_disponivel'],
  }
);
```

### imagens unique principal
**Constraint:** `UNIQUE INDEX idx_uma_imagem_principal ON imagens(item_id) WHERE e_principal = 1`

Only one image per item can have `e_principal = true`.

**API compliance:** This constraint is enforced by the database. The API should handle potential unique constraint violations when updating images.

---

## Item Status (situacao) Value Mapping

The correct values for `itens.situacao` are used consistently across all API endpoints:

### Transaction Flow
- **Initial state:** `'estoque'` (item available in inventory)
- **After sale:** `'vendida'` (item sold)
- **After trade given:** `'trocada'` (item traded away)
- **Manual status:** `'baixada_colecao'` (item written off from collection)

### Updated Files
All hardcoded incorrect values have been replaced:
- ✅ `'disponivel'` → `'estoque'`
- ✅ `'vendido'` → `'vendida'`
- ✅ `'trocado'` → `'trocada'`

### Affected Files
- `api/src/lib/utils.ts` - Schema definitions
- `api/src/lib/types.ts` - TypeScript interfaces
- `api/src/functions/itens.ts` - Item CRUD operations
- `api/src/functions/transacoes.ts` - Transaction handling
- `api/src/functions/trocas.ts` - Trade handling
- `api/src/functions/vendas.ts` - Sales endpoint (backward compatibility)
- `api/src/functions/wishlist.ts` - Wishlist to item converter

---

## Validation Strategy

The API uses a two-layer validation approach:

1. **Zod Schema Validation** - All request bodies are validated against Zod schemas before database operations
2. **Database Constraints** - The database enforces constraints as the final authority

This ensures:
- Early feedback to API clients (via Zod validation errors)
- Data integrity at the database level (via CHECK and FK constraints)
- No invalid data can be written to the database

---

## Future Considerations

When adding new features or modifying the database schema:

1. Update the corresponding Zod schema in `api/src/lib/utils.ts`
2. Update the TypeScript interface in `api/src/lib/types.ts`
3. Update this documentation to reflect the changes
4. Test the API endpoints to ensure compliance
5. For new foreign keys with NO_ACTION, add FK checks in DELETE handlers
6. For new CHECK constraints, ensure enum types are enforced in schemas

---

## Testing Compliance

To verify API-database compliance:

1. **Schema Testing:** Attempt to insert/update with invalid enum values (should fail validation)
2. **FK Testing:** Attempt to delete entities with dependent records (should return 409)
3. **Constraint Testing:** Attempt to violate CHECK constraints (should fail at DB level with clear error)
4. **Business Logic Testing:** Verify that item status changes correctly during sales/trades

---

*Last Updated: 2026-01-11*
*Maintainer: API Development Team*
