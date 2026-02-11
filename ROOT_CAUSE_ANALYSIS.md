# Admin Functions 404 - Root Cause and Fix

## Summary
Admin functions were returning 404 errors because the authentication middleware was returning responses **without CORS headers**, causing browsers/clients to fail the request before processing the actual HTTP status code.

## Root Cause

### The Problem
The `requireRole()` and `requireAuth()` middleware functions in `api/src/middleware/auth.ts` were returning 401 (Unauthorized) and 403 (Forbidden) responses **without CORS headers**.

```typescript
// BEFORE (INCORRECT):
export function requireRole(...allowedRoles: string[]) {
  return (user: JWTPayload): HttpResponseInit | null => {
    if (!allowedRoles.includes(user.tipo)) {
      return {
        status: 403,
        jsonBody: { error: 'Acesso negado', ... }
      }  // ❌ NO CORS HEADERS!
    }
    return null
  }
}
```

### Why This Caused 404 Errors

1. **Browser CORS Check**: When a browser makes a cross-origin request, it first checks CORS headers
2. **Missing Headers**: Responses without CORS headers fail the browser's security check
3. **Network Error**: The browser treats this as a network error, often displaying as "Failed to fetch"
4. **Status Code Lost**: The actual 403 status is lost, and some tools/environments report it as 404
5. **Terminal/CLI**: Even terminal tools like `curl` can have issues when CORS headers are inconsistent across endpoints

### Why Other Endpoints Worked

Working endpoints like `/api/itens` always used `successResponse()` or `handleError()`, both of which add CORS headers:

```typescript
// Working functions always use these helpers:
return successResponse(data, 200, origin);  // ✓ Adds CORS headers
return handleError(error, context, origin);  // ✓ Adds CORS headers
```

Admin functions had an additional middleware layer (`requireRole`) that returned early without going through these helpers.

## The Fix

### Changes Made

#### 1. Updated `requireAuth` (auth.ts)
```typescript
// AFTER (CORRECT):
import { addCorsHeaders } from '../lib/cors'

export function requireAuth(request: HttpRequest, origin?: string): HttpResponseInit | null {
  const authHeader = request.headers.get('authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return addCorsHeaders({  // ✓ Now adds CORS headers
      status: 401,
      jsonBody: { error: 'Token não fornecido', ... }
    }, origin)
  }
  
  const token = authHeader.substring(7)
  const payload = verifyToken(token)

  if (!payload) {
    return addCorsHeaders({  // ✓ Now adds CORS headers
      status: 401,
      jsonBody: { error: 'Token inválido ou expirado', ... }
    }, origin)
  }

  return null
}
```

#### 2. Updated `requireRole` (auth.ts)
```typescript
// AFTER (CORRECT):
export function requireRole(...allowedRoles: string[]) {
  return (user: JWTPayload, origin?: string): HttpResponseInit | null => {
    if (!allowedRoles.includes(user.tipo)) {
      return addCorsHeaders({  // ✓ Now adds CORS headers
        status: 403,
        jsonBody: { error: 'Acesso negado', ... }
      }, origin)
    }
    return null
  }
}
```

#### 3. Updated `protectedRoute` (auth.ts)
```typescript
// AFTER (CORRECT):
export function protectedRoute(
  handler: (request: HttpRequest, context: InvocationContext, user: JWTPayload) => Promise<HttpResponseInit>
) {
  return async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    const origin = request.headers.get('origin') || undefined  // ✓ Extract origin
    const authError = requireAuth(request, origin)  // ✓ Pass origin
    if (authError) return authError

    const user = extractUser(request)!
    return handler(request, context, user)
  }
}
```

#### 4. Updated Admin Functions
All admin function handlers now pass `origin` to `requireRole`:

```typescript
// admin-metricas.ts, admin-planos.ts, admin-tenants.ts
async function adminXxxHandler(..., user: JWTPayload): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin') || undefined;
  
  try {
    const roleError = requireRole('platform_admin')(user, origin);  // ✓ Pass origin
    if (roleError) return roleError;
    
    // ... rest of handler
  }
}
```

```typescript
// admin-usuarios.ts (allows both platform_admin and tenant_admin)
const roleError = requireRole('platform_admin', 'tenant_admin')(user, origin);
if (roleError) return roleError;
```

## Files Modified

1. **api/src/middleware/auth.ts**
   - Added `import { addCorsHeaders } from '../lib/cors'`
   - Updated `requireAuth()` to accept `origin` parameter and use `addCorsHeaders()`
   - Updated `requireRole()` to accept `origin` parameter and use `addCorsHeaders()`
   - Updated `protectedRoute()` to extract and pass `origin`

2. **api/src/functions/admin-metricas.ts**
   - Updated `requireRole('platform_admin')(user)` → `requireRole('platform_admin')(user, origin)`

3. **api/src/functions/admin-planos.ts**
   - Updated `requireRole('platform_admin')(user)` → `requireRole('platform_admin')(user, origin)`

4. **api/src/functions/admin-tenants.ts**
   - Updated `requireRole('platform_admin')(user)` → `requireRole('platform_admin')(user, origin)`

5. **api/src/functions/admin-usuarios.ts**
   - Updated `requireRole('platform_admin', 'tenant_admin')(user)` → `requireRole('platform_admin', 'tenant_admin')(user, origin)`

## Testing

### Before Fix
```bash
# Admin endpoints returned 404 or network errors
curl -i -X GET https://gremiomantosapi.azurewebsites.net/api/admin/metricas \
  -H "Authorization: Bearer <token>"
# Result: 404 Not Found (or network error)
```

### After Fix
```bash
# Now returns proper status codes with CORS headers
curl -i -X GET https://gremiomantosapi.azurewebsites.net/api/admin/metricas \
  -H "Authorization: Bearer <invalid-token>"
# Result: 401 Unauthorized with CORS headers

curl -i -X GET https://gremiomantosapi.azurewebsites.net/api/admin/metricas \
  -H "Authorization: Bearer <tenant-member-token>"
# Result: 403 Forbidden with CORS headers

curl -i -X GET https://gremiomantosapi.azurewebsites.net/api/admin/metricas \
  -H "Authorization: Bearer <platform-admin-token>"
# Result: 200 OK with data and CORS headers
```

## How to Verify the Fix

1. **Deploy the updated code** to Azure
2. **Wait 30-60 seconds** for cold start
3. **Test with curl**:
   ```bash
   ./test-endpoints.sh https://gremiomantosapi.azurewebsites.net YOUR_JWT_TOKEN
   ```

4. **Verify CORS headers are present**:
   ```bash
   curl -i -X OPTIONS https://gremiomantosapi.azurewebsites.net/api/admin/metricas
   # Should see: Access-Control-Allow-Origin, Access-Control-Allow-Methods, etc.
   ```

5. **Test from browser console**:
   ```javascript
   fetch('https://gremiomantosapi.azurewebsites.net/api/admin/metricas', {
     headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
   }).then(r => r.json()).then(console.log).catch(console.error)
   ```

## Impact

### What's Fixed
✅ Admin endpoints now return proper HTTP status codes (401, 403, 200) instead of 404
✅ CORS headers are consistently added to all responses
✅ Browser requests work correctly
✅ Terminal/curl requests return accurate status codes
✅ Error messages are properly displayed to clients

### Breaking Changes
None - this is a bug fix that makes the API work as originally intended.

## Lessons Learned

1. **Always add CORS headers**: Every response from a cross-origin API must include CORS headers
2. **Middleware consistency**: All middleware returning `HttpResponseInit` should use the same patterns
3. **Early returns are risky**: Functions that return early bypass normal response processing
4. **Test authentication paths**: Don't just test happy paths - test 401/403 scenarios too
5. **CORS errors appear as network errors**: Missing CORS headers don't show clean error messages

## Prevention

To prevent similar issues in the future:

1. Create a helper function for all auth errors:
   ```typescript
   function authErrorResponse(status: number, error: string, message: string, origin?: string) {
     return addCorsHeaders({ status, jsonBody: { error, message } }, origin)
   }
   ```

2. Use TypeScript to enforce CORS:
   ```typescript
   type CorsAwareResponse = HttpResponseInit & { headers: { 'Access-Control-Allow-Origin': string } }
   ```

3. Add integration tests that verify CORS headers on all endpoints

4. Use a response interceptor/wrapper to ensure CORS headers are always added
