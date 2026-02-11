# Troubleshooting Admin Functions 404 Errors

## Problem
Admin functions (`/api/platform/metricas`, `/api/platform/planos`, `/api/platform/tenants`, `/api/platform/usuarios`) are returning 404 errors even though they appear to be registered in Azure Functions.

## Investigation Summary

### ✅ Code is Correct
All the following have been verified:
1. TypeScript types are correct: All handlers use `Promise<HttpResponseInit>`
2. All Record types use proper generics: `Record<string, any>` or `Record<string, number>`
3. Functions are properly registered with `app.http()`
4. Functions are imported in `src/index.ts`
5. Code compiles without errors
6. Compiled output includes all admin functions

### 🔍 Potential Root Causes

#### 1. Azure Functions Runtime Not Loading index.js
**Symptom**: Functions are "listed" in Azure but don't respond to requests

**Check**:
- Verify `package.json` has `"main": "dist/index.js"`
- Check Azure Application Insights logs for startup errors
- Look for module loading errors in Azure Log Stream

**Fix**: Already configured correctly in package.json

#### 2. Cold Start or Deployment Issues  
**Symptom**: 404 immediately after deployment

**Check**:
- Wait 30-60 seconds after deployment for functions to warm up
- Restart the Function App in Azure Portal
- Check deployment logs for any errors

**Test**:
```bash
# Test health endpoint first
curl -i https://gremiomantosapi.azurewebsites.net/api/health

# Then test a working endpoint
curl -i https://gremiomantosapi.azurewebsites.net/api/itens
```

#### 3. Authentication/Authorization Errors Masked as 404
**Symptom**: Missing or invalid JWT token returns 404 instead of 401

**Check**:
- Test OPTIONS request first (doesn't require auth):
```bash
curl -i -X OPTIONS https://gremiomantosapi.azurewebsites.net/api/platform/metricas \
  -H "Origin: http://localhost:3000"
```

- Test with valid JWT token:
```bash
curl -i -X GET https://gremiomantosapi.azurewebsites.net/api/platform/metricas \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Origin: http://localhost:3000"
```

**Fix**: If this is the issue, the middleware should be returning 401/403, not 404. Check middleware implementation.

#### 4. Route Registration Order
**Symptom**: Routes with similar patterns conflict

**Check**: The current route patterns are:
- `admin/metricas` (no params)
- `admin/planos/{id?}/{action?}`
- `admin/tenants/{id?}/{action?}`
- `admin/usuarios/{id?}/{action?}`

These should not conflict, but Azure may process them differently.

**Test**: Check if changing the import order in index.ts affects behavior

#### 5. Deployment Package Issue
**Symptom**: Functions not included in deployment package

**Check deployment package contents**:
```bash
# The GitHub workflow shows package structure
# Look for this in deployment logs:
unzip -l deploy.zip | grep -E "(admin-|index.js)"
```

Should show:
```
dist/index.js
dist/functions/admin-metricas.js
dist/functions/admin-planos.js
dist/functions/admin-tenants.js
dist/functions/admin-usuarios.js
```

## Diagnostic Steps

### Step 1: Verify Local Functionality
```bash
cd api
npm install
npm run build
npm start
```

Then test locally:
```bash
# Get a JWT token first from auth endpoint
curl -X POST http://localhost:7071/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"nome":"Admin","email":"admin@test.com","senha":"Test123!","tipo":"platform_admin"}'

# Extract token from response, then test admin endpoint
curl -i http://localhost:7071/api/platform/metricas \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Step 2: Check Azure Portal
1. Go to Azure Portal → Function App → Functions
2. Verify these functions are listed:
   - admin-metricas
   - admin-planos
   - admin-tenants
   - admin-usuarios
3. Click on each function and check "Function Keys" and "Integration" tabs
4. Verify route patterns match expectations

### Step 3: Check Azure Logs
1. Go to Azure Portal → Function App → Log Stream
2. Restart the Function App
3. Watch for any errors during startup
4. Look specifically for messages about admin functions

### Step 4: Test with Postman/curl
Test in this order:
1. OPTIONS request (should return 200/204 with CORS headers)
2. GET without auth (should return 401 with CORS headers - before the fix this returned 404)
3. GET with valid platform_admin JWT (should return 200 with data)

### Step 5: Compare with Working Function
If `/api/itens` works but `/api/platform/metricas` doesn't:
1. Both use same middleware pattern
2. Both use protectedRoute
3. Both have same function registration
4. The only difference is the route path

Try accessing: `/api/platform/metricas` vs `/api/admin%2Fmetricas` (URL encoded)

## Quick Fixes to Try

### Fix 1: Redeploy
```bash
# Trigger a new deployment
git commit --allow-empty -m "Trigger redeploy"
git push
```

### Fix 2: Restart Function App
In Azure Portal:
1. Go to Function App
2. Click "Restart"
3. Wait 60 seconds
4. Test again

### Fix 3: Check App Settings
Verify these settings in Azure Portal → Configuration → Application Settings:
- `FUNCTIONS_WORKER_RUNTIME` = `node`
- `WEBSITE_NODE_DEFAULT_VERSION` = `~20`
- `FUNCTIONS_EXTENSION_VERSION` = `~4`

### Fix 4: Check CORS Settings
In Azure Portal → CORS:
- Verify your frontend origin is listed
- Or enable "Allow all origins" (for testing only)

## Common Gotchas

1. **Case Sensitivity**: Azure Functions routes are case-sensitive
   - Use `/api/platform/metricas` not `/api/Admin/Metricas`

2. **Trailing Slashes**: May cause issues
   - Use `/api/platform/metricas` not `/api/platform/metricas/`

3. **Auth Token Format**: Must be exactly:
   ```
   Authorization: Bearer <token>
   ```
   Not `Bearer: <token>` or `Authorization: <token>`

4. **Cold Start**: First request after deployment may timeout or return 404
   - Wait and retry after 30-60 seconds

## Next Steps

If none of the above resolves the issue:

1. **Enable Application Insights**:
   - Configure detailed logging
   - Check for any runtime errors

2. **Add Debug Logging**:
   ```typescript
   context.log('Admin metricas handler called');
   ```

3. **Test Route Simplification**:
   - Temporarily change route from `admin/metricas` to `adminmetricas`
   - If this works, there may be an Azure routing issue with `/` in paths

4. **Check Azure Service Health**:
   - Verify no Azure outages or issues in your region

## Contact Support

If issue persists, provide:
1. Exact URL being called
2. Full curl command with headers (redact sensitive data)
3. Response status code and body
4. Azure Application Insights logs
5. Screenshot of Function App → Functions list in Azure Portal
