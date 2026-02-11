#!/bin/bash

# Test script for Azure Functions endpoints
# Usage: ./test-endpoints.sh [BASE_URL] [JWT_TOKEN]

set -e

BASE_URL="${1:-http://localhost:7071}"
JWT_TOKEN="${2:-}"

echo "========================================="
echo "Azure Functions Endpoint Test"
echo "========================================="
echo "Base URL: $BASE_URL"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

test_endpoint() {
    local method=$1
    local path=$2
    local requires_auth=$3
    local expected_status=$4
    local description=$5
    
    echo -n "Testing $method $path ... "
    
    if [ "$requires_auth" = "true" ] && [ -z "$JWT_TOKEN" ]; then
        echo -e "${YELLOW}SKIPPED${NC} (no JWT token provided)"
        return
    fi
    
    local headers=""
    if [ "$requires_auth" = "true" ]; then
        headers="-H \"Authorization: Bearer $JWT_TOKEN\""
    fi
    
    local status
    status=$(eval curl -s -o /dev/null -w "%{http_code}" -X "$method" \
        "$BASE_URL$path" \
        $headers \
        -H "Content-Type: application/json" \
        2>/dev/null || echo "000")
    
    if [ "$status" = "$expected_status" ]; then
        echo -e "${GREEN}✓ $status${NC} - $description"
    elif [ "$status" = "401" ] && [ "$requires_auth" = "true" ]; then
        echo -e "${YELLOW}⚠ 401${NC} - Auth required (expected if token is invalid)"
    elif [ "$status" = "403" ] && [ "$requires_auth" = "true" ]; then
        echo -e "${YELLOW}⚠ 403${NC} - Forbidden (user may lack required role)"
    else
        echo -e "${RED}✗ $status${NC} - Expected $expected_status, got $status"
    fi
}

echo "========================================="
echo "Public Endpoints (No Auth Required)"
echo "========================================="

test_endpoint "GET" "/api/health" "false" "200" "Health check endpoint"
test_endpoint "OPTIONS" "/api/itens" "false" "200" "CORS preflight"
test_endpoint "OPTIONS" "/api/admin/metricas" "false" "200" "CORS preflight for admin"

echo ""
echo "========================================="
echo "Protected Endpoints (Auth Required)"
echo "========================================="

if [ -z "$JWT_TOKEN" ]; then
    echo -e "${YELLOW}Skipping protected endpoints - no JWT token provided${NC}"
    echo "Usage: $0 <BASE_URL> <JWT_TOKEN>"
    echo ""
    echo "To get a JWT token:"
    echo "1. Register a platform_admin user via /api/auth/register"
    echo "2. Login via /api/auth/login"
    echo "3. Copy the 'token' from the response"
    exit 0
fi

echo ""
echo "Standard Endpoints:"
test_endpoint "GET" "/api/itens" "true" "200" "List items"
test_endpoint "GET" "/api/vendas" "true" "200" "List sales"
test_endpoint "GET" "/api/dashboard" "true" "200" "Dashboard metrics"

echo ""
echo "Admin Endpoints (Platform Admin Only):"
test_endpoint "GET" "/api/admin/metricas" "true" "200" "Platform metrics"
test_endpoint "GET" "/api/admin/planos" "true" "200" "List plans"
test_endpoint "GET" "/api/admin/tenants" "true" "200" "List tenants"
test_endpoint "GET" "/api/admin/usuarios" "true" "200" "List users"

echo ""
echo "========================================="
echo "Test Complete"
echo "========================================="
echo ""
echo "Legend:"
echo "  ✓ - Success (expected status code)"
echo "  ⚠ - Warning (auth/permission issue)"
echo "  ✗ - Failure (unexpected status code)"
echo ""
echo "Common issues:"
echo "- 404: Function not found or not loaded"
echo "- 401: Missing or invalid JWT token"
echo "- 403: Valid token but insufficient permissions"
echo "- 500: Server error (check logs)"
echo ""
