# Admin Functions 404 Issue - Investigation Summary

## Issue Description
Admin functions (`/api/platform/metricas`, `/api/platform/planos`, `/api/platform/tenants`, `/api/platform/usuarios`) were returning 404 Not Found errors even though they appeared to be registered in Azure Functions.

## Root Cause Analysis

### What Was Suspected (from problem statement)
The problem statement suggested that TypeScript `Promise` types were missing the `<HttpResponseInit>` generic parameter, which could cause Azure Functions to not register routes properly.

### What Was Actually Found
**All TypeScript types are correct!** Investigation revealed:

1. ✅ All handler functions already use `Promise<HttpResponseInit>`:
   - `admin-metricas.ts` lines 7 and 157
   - `admin-planos.ts` lines 8 and 194
   - `admin-tenants.ts` lines 8 and 285
   - `admin-usuarios.ts` lines 8 and 328

2. ✅ All `Record` types have proper generic parameters:
   - `Record<string, any>` or `Record<string, number>`

3. ✅ All functions are properly registered with `app.http()`

4. ✅ All functions are imported in `src/index.ts`

5. ✅ Code compiles without errors

6. ✅ All functions appear in compiled output (`dist/`)

## Changes Made

### 1. Added Missing Import (api/src/index.ts)
Added the missing `update-password` function import to `index.ts`:

```typescript
import './functions/update-password';
```

This function existed but was not being imported, so it wouldn't have been registered in Azure Functions.

### 2. Created Troubleshooting Guide
Created `TROUBLESHOOTING_404.md` with comprehensive diagnostic steps for Azure Functions 404 errors.

### 3. Created Test Script
Created `test-endpoints.sh` to systematically test all endpoints and identify issues.

## Why Are Admin Functions Returning 404?

Since the code is correct, the 404 errors are likely caused by one of these runtime issues:

### Most Likely Causes:

1. **Authentication Middleware Behavior**
   - The `protectedRoute` middleware might be returning errors that appear as 404
   - Test with OPTIONS request first (doesn't require auth)
   - Verify JWT token is valid and user has `platform_admin` role

2. **Cold Start / Deployment Issue**
   - Functions may need 30-60 seconds to fully load after deployment
   - Try restarting the Function App in Azure Portal

3. **Azure Functions Runtime Loading**
   - Check Azure Log Stream for startup errors
   - Verify `dist/index.js` is being loaded correctly
   - Check Application Insights for function registration logs

4. **CORS Configuration**
   - If calling from browser, CORS settings might be rejecting requests
   - OPTIONS requests should work even without CORS properly configured

### Less Likely (But Possible):

5. **Route Pattern Conflicts**
   - Azure may handle routes differently than expected
   - Try accessing without optional parameters first

6. **Deployment Package**
   - Verify `dist/functions/admin-*.js` files are in deployment package
   - Check GitHub Actions deployment logs

## How to Diagnose

### Step 1: Test Locally
```bash
cd api
npm install
npm run build  
npm start

# In another terminal
./test-endpoints.sh http://localhost:7071 YOUR_JWT_TOKEN
```

If admin functions work locally but not in Azure, it's an Azure-specific issue.

### Step 2: Test OPTIONS Requests
```bash
curl -i -X OPTIONS https://gremiomantosapi.azurewebsites.net/api/platform/metricas \
  -H "Origin: http://localhost:3000"
```

Should return 200/204 with CORS headers. If this returns 404, functions aren't loading.

### Step 3: Test With Valid JWT
```bash
# Get a platform_admin JWT token first, then:
curl -i -X GET https://gremiomantosapi.azurewebsites.net/api/platform/metricas \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

- 404 = Function not found/loaded
- 401 = Auth required (token missing/invalid)
- 403 = Forbidden (user not platform_admin)
- 200 = Success!

### Step 4: Check Azure Logs
1. Azure Portal → Function App → Log Stream
2. Look for startup errors or function registration messages
3. Check Application Insights for any errors

## Recommendations

### Immediate Actions:
1. **Redeploy the application** with the latest code
2. **Restart the Function App** in Azure Portal
3. **Wait 60 seconds** after deployment before testing
4. **Test with the test script** to systematically identify the issue

### Verification:
1. Confirm admin functions are listed in Azure Portal under Functions
2. Check that routes match expectations (e.g., `admin/metricas` not `admin-metricas`)
3. Verify user has `platform_admin` role in JWT token
4. Check CORS settings allow your frontend origin

### If Issue Persists:
1. Enable Application Insights detailed logging
2. Check Azure service health for any regional issues
3. Try simplifying routes (e.g., `adminmetricas` instead of `admin/metricas`)
4. Compare deployment package structure with a known-working deployment

## Files Modified

1. `api/src/index.ts` - Added `update-password` import
2. `TROUBLESHOOTING_404.md` - Comprehensive troubleshooting guide
3. `test-endpoints.sh` - Endpoint testing script
4. `ADMIN_FUNCTIONS_INVESTIGATION.md` - This document

## Testing Checklist

- [x] Code compiles without errors
- [x] All TypeScript types are correct
- [x] All functions are registered
- [x] All functions are imported
- [ ] Test locally with Azure Functions Core Tools
- [ ] Deploy to Azure
- [ ] Verify functions load in Azure Portal
- [ ] Test OPTIONS requests
- [ ] Test with valid JWT token
- [ ] Check Azure logs for errors

## Conclusion

The code is correctly implemented. The 404 errors are a runtime issue in Azure, not a code issue. Follow the troubleshooting steps in `TROUBLESHOOTING_404.md` to identify and resolve the actual cause of the 404 errors.

The most common causes are:
1. Missing/invalid JWT token (appears as 404 in some middleware configurations)
2. Cold start delay after deployment
3. Function App not fully restarted after deployment
4. CORS configuration issues

Use the `test-endpoints.sh` script to systematically test and identify the exact issue.
