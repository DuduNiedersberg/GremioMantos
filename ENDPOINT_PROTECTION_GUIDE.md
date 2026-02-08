# Endpoint Protection Guide

This guide explains how to use the endpoint protection utilities added to the authentication middleware.

## Overview

Two new functions have been added to `api/src/middleware/auth.ts` to simplify protecting endpoints:

1. **`protectedRoute()`** - Wraps handlers with automatic authentication
2. **`requireRole()`** - Validates user roles for authorization

---

## 1. protectedRoute()

### Purpose
Automatically validates JWT tokens and extracts user information before calling your handler. If authentication fails, returns a 401 error.

### Signature
```typescript
export function protectedRoute(
  handler: (request: HttpRequest, context: InvocationContext, user: JWTPayload) => Promise<HttpResponseInit>
): (request: HttpRequest, context: InvocationContext) => Promise<HttpResponseInit>
```

### Usage

#### Before (manual authentication):
```typescript
async function myHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const authError = requireAuth(request)
  if (authError) return authError

  const user = extractUser(request)
  if (!user) {
    return { status: 401, jsonBody: { error: 'Não autenticado' } }
  }

  // Your logic here
  return { status: 200, jsonBody: { message: `Hello ${user.nome}` } }
}

app.http('myEndpoint', {
  methods: ['GET'],
  route: 'my-endpoint',
  authLevel: 'anonymous',
  handler: myHandler
})
```

#### After (with protectedRoute):
```typescript
app.http('myEndpoint', {
  methods: ['GET'],
  route: 'my-endpoint',
  authLevel: 'anonymous',
  handler: protectedRoute(async (request, context, user) => {
    // user is guaranteed to be authenticated
    return { status: 200, jsonBody: { message: `Hello ${user.nome}` } }
  })
})
```

### Benefits
- ✅ Eliminates boilerplate authentication code
- ✅ Ensures consistent authentication handling
- ✅ Reduces errors from forgetting to check auth
- ✅ User is automatically typed as `JWTPayload`

---

## 2. requireRole()

### Purpose
Creates a validator function that checks if a user has one of the required roles. Returns a 403 error if unauthorized, or null if authorized.

### Signature
```typescript
export function requireRole(...allowedRoles: string[]): (user: JWTPayload) => HttpResponseInit | null
```

### Available Roles
Based on `UsuarioTipoEnum`:
- `'platform_admin'` - Platform administrator (highest privileges)
- `'tenant_admin'` - Tenant administrator
- `'tenant_member'` - Tenant member
- `'colecionador'` - Collector (default user)

### Usage

#### Single Role:
```typescript
app.http('adminOnly', {
  methods: ['DELETE'],
  route: 'admin/delete/:id',
  authLevel: 'anonymous',
  handler: protectedRoute(async (request, context, user) => {
    // Check if user is platform admin
    const roleError = requireRole('platform_admin')(user)
    if (roleError) return roleError

    // Only platform admins reach here
    return { status: 200, jsonBody: { message: 'Admin action performed' } }
  })
})
```

#### Multiple Roles:
```typescript
app.http('manageUsers', {
  methods: ['PATCH'],
  route: 'users/:id',
  authLevel: 'anonymous',
  handler: protectedRoute(async (request, context, user) => {
    // Allow both platform and tenant admins
    const roleError = requireRole('platform_admin', 'tenant_admin')(user)
    if (roleError) return roleError

    // Admins can proceed
    return { status: 200, jsonBody: { message: 'User updated' } }
  })
})
```

### Error Response
When a user doesn't have the required role:
```json
{
  "error": "Acesso negado",
  "message": "Você não tem permissão para este recurso"
}
```
HTTP Status: `403 Forbidden`

---

## Complete Examples

### Example 1: Simple Protected Endpoint
```typescript
import { app } from "@azure/functions"
import { protectedRoute } from '../middleware/auth'

app.http('profile', {
  methods: ['GET'],
  route: 'profile',
  authLevel: 'anonymous',
  handler: protectedRoute(async (request, context, user) => {
    return {
      status: 200,
      jsonBody: {
        id: user.userId,
        nome: user.nome,
        email: user.email,
        tipo: user.tipo,
        tenant_id: user.tenantId
      }
    }
  })
})
```

### Example 2: Admin-Only Deletion
```typescript
import { app } from "@azure/functions"
import { protectedRoute, requireRole } from '../middleware/auth'
import sql from 'mssql'

app.http('deleteItem', {
  methods: ['DELETE'],
  route: 'items/:id',
  authLevel: 'anonymous',
  handler: protectedRoute(async (request, context, user) => {
    // Only platform admins can delete
    const roleError = requireRole('platform_admin')(user)
    if (roleError) return roleError

    const itemId = request.params.id
    const pool = await sql.connect(config)
    
    await pool.request()
      .input('id', sql.Int, itemId)
      .query('DELETE FROM itens WHERE id = @id')

    return { status: 200, jsonBody: { message: 'Item deleted' } }
  })
})
```

### Example 3: Tenant-Isolated Data Access
```typescript
import { app } from "@azure/functions"
import { protectedRoute } from '../middleware/auth'
import sql from 'mssql'

app.http('myItems', {
  methods: ['GET'],
  route: 'my-items',
  authLevel: 'anonymous',
  handler: protectedRoute(async (request, context, user) => {
    const pool = await sql.connect(config)
    
    // Automatically filter by user's tenant
    const result = await pool.request()
      .input('tenant_id', sql.Int, user.tenantId)
      .input('user_id', sql.Int, user.userId)
      .query(`
        SELECT * FROM itens 
        WHERE tenant_id = @tenant_id 
        AND created_by = @user_id
      `)

    return {
      status: 200,
      jsonBody: {
        items: result.recordset,
        count: result.recordset.length
      }
    }
  })
})
```

### Example 4: Role-Based Data Filtering
```typescript
import { app } from "@azure/functions"
import { protectedRoute, requireRole } from '../middleware/auth'
import sql from 'mssql'

app.http('allUsers', {
  methods: ['GET'],
  route: 'users',
  authLevel: 'anonymous',
  handler: protectedRoute(async (request, context, user) => {
    // Only admins can view all users
    const roleError = requireRole('platform_admin', 'tenant_admin')(user)
    if (roleError) return roleError

    const pool = await sql.connect(config)
    
    let query = 'SELECT id, nome, email, tipo FROM usuarios'
    const params: any = {}
    
    // Tenant admins only see users in their tenant
    if (user.tipo === 'tenant_admin') {
      query += ' WHERE tenant_id = @tenant_id'
      params.tenant_id = user.tenantId
    }
    
    const request = pool.request()
    Object.entries(params).forEach(([key, value]) => {
      request.input(key, value)
    })
    
    const result = await request.query(query)

    return { status: 200, jsonBody: result.recordset }
  })
})
```

---

## Best Practices

### 1. Always Use protectedRoute for Authenticated Endpoints
```typescript
// ✅ Good
handler: protectedRoute(async (request, context, user) => { ... })

// ❌ Bad - manual auth is error-prone
handler: async (request, context) => {
  const authError = requireAuth(request)
  // Easy to forget or implement inconsistently
}
```

### 2. Check Roles Early
```typescript
handler: protectedRoute(async (request, context, user) => {
  // Check role first, before any business logic
  const roleError = requireRole('admin')(user)
  if (roleError) return roleError
  
  // Then proceed with logic
})
```

### 3. Use Type Safety
```typescript
// user parameter is fully typed as JWTPayload
handler: protectedRoute(async (request, context, user) => {
  // TypeScript knows about these properties:
  user.userId    // number
  user.email     // string
  user.tipo      // UsuarioTipo
  user.tenantId  // number | null
  user.nome      // string
})
```

### 4. Combine with Tenant Isolation
```typescript
handler: protectedRoute(async (request, context, user) => {
  // Always filter by tenant for multi-tenant data
  const query = `
    SELECT * FROM itens 
    WHERE tenant_id = @tenant_id
  `
  // This ensures tenant isolation
})
```

---

## Testing

### Test Protected Endpoint
```bash
# Without token (should fail with 401)
curl -X GET http://localhost:7071/api/profile

# With valid token (should succeed)
curl -X GET http://localhost:7071/api/profile \
  -H "Authorization: ******
```

### Test Role-Based Access
```bash
# Login as regular user
TOKEN=$(curl -X POST http://localhost:7071/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","senha":"Pass123!@"}' \
  | jq -r '.token')

# Try admin endpoint (should fail with 403)
curl -X DELETE http://localhost:7071/api/admin/delete/1 \
  -H "Authorization: ******

# Login as admin
ADMIN_TOKEN=$(curl -X POST http://localhost:7071/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","senha":"Admin123!@"}' \
  | jq -r '.token')

# Try admin endpoint (should succeed)
curl -X DELETE http://localhost:7071/api/admin/delete/1 \
  -H "Authorization: ******
```

---

## Migration Guide

### Updating Existing Endpoints

If you have existing endpoints using manual authentication, here's how to migrate:

#### Step 1: Import the new functions
```typescript
import { protectedRoute, requireRole } from '../middleware/auth'
```

#### Step 2: Wrap your handler
```typescript
// Before
async function myHandler(request: HttpRequest, context: InvocationContext) {
  const authError = requireAuth(request)
  if (authError) return authError
  const user = extractUser(request)!
  // ... rest of logic
}

// After
const myHandler = protectedRoute(async (request, context, user) => {
  // ... rest of logic
})
```

#### Step 3: Update function registration
```typescript
app.http('myEndpoint', {
  methods: ['GET'],
  route: 'my-endpoint',
  authLevel: 'anonymous',
  handler: myHandler  // Already wrapped with protectedRoute
})
```

---

## Summary

- Use `protectedRoute()` to automatically handle authentication
- Use `requireRole()` to enforce role-based access control
- These utilities reduce boilerplate and improve code maintainability
- Always combine with tenant isolation for multi-tenant applications
- Test thoroughly with different user roles

For more information, see:
- `JWT_TESTING_GUIDE.md` - JWT authentication testing
- `IMPLEMENTATION_SUMMARY.md` - Complete implementation details
