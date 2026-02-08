# JWT Authentication Testing Guide

This guide provides comprehensive instructions for testing the JWT authentication endpoints.

## Prerequisites

1. Set up environment variables in `.env` file (use `.env.example` as reference)
2. Ensure JWT_SECRET is set
3. Database connection must be configured

## Environment Variables Required

```env
JWT_SECRET=your-secure-secret-key-here
DB_SERVER=your-server.database.windows.net
DB_NAME=your-database-name
DB_USER=your-username
DB_PASSWORD=your-password
```

## API Endpoints

### 1. Register a New User
**POST** `/api/auth/register`

#### Request Body:
```json
{
  "nome": "Eduardo Niedersberg",
  "email": "dudu@bolicho.com",
  "senha": "Senha123!@",
  "telefone": "51999887766",
  "tipo": "tenant_admin",
  "tenant_id": 1
}
```

#### Password Requirements:
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character (!@#$%^&*(),.?":{}|<>)

#### Success Response (201):
```json
{
  "message": "Usuário criado com sucesso",
  "usuario": {
    "id": 1,
    "nome": "Eduardo Niedersberg",
    "email": "dudu@bolicho.com",
    "tipo": "tenant_admin",
    "tenant_id": 1
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Error Responses:
- **400**: Invalid data (validation errors)
- **409**: Email already registered
- **500**: Server error

---

### 2. Login
**POST** `/api/auth/login`

#### Request Body:
```json
{
  "email": "dudu@bolicho.com",
  "senha": "Senha123!@"
}
```

#### Success Response (200):
```json
{
  "message": "Login realizado com sucesso",
  "usuario": {
    "id": 1,
    "nome": "Eduardo Niedersberg",
    "email": "dudu@bolicho.com",
    "tipo": "tenant_admin",
    "tenant_id": 1
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Error Responses:
- **400**: Invalid data or email linked to social provider
- **401**: Invalid email or password
- **403**: User account disabled
- **500**: Server error

---

### 3. Get Current User
**GET** `/api/auth/me`

#### Headers:
```
Authorization: Bearer <token>
```

#### Success Response (200):
```json
{
  "id": 1,
  "nome": "Eduardo Niedersberg",
  "email": "dudu@bolicho.com",
  "telefone": "51999887766",
  "tipo": "tenant_admin",
  "tenant_id": 1,
  "ativo": true,
  "tenant_nome": "Bolicho do Grêmio",
  "tenant_slug": "bolicho-gremio"
}
```

#### Error Responses:
- **401**: Token not provided or invalid/expired
- **404**: User not found
- **500**: Server error

---

## Testing with cURL

### Register:
```bash
curl -X POST http://localhost:7071/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Eduardo Niedersberg",
    "email": "dudu@bolicho.com",
    "senha": "Senha123!@",
    "telefone": "51999887766",
    "tipo": "tenant_admin",
    "tenant_id": 1
  }'
```

### Login:
```bash
curl -X POST http://localhost:7071/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dudu@bolicho.com",
    "senha": "Senha123!@"
  }'
```

### Get Current User:
```bash
curl -X GET http://localhost:7071/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Testing with HTTPie

### Register:
```bash
http POST http://localhost:7071/api/auth/register \
  nome="Eduardo Niedersberg" \
  email="dudu@bolicho.com" \
  senha="Senha123!@" \
  telefone="51999887766" \
  tipo="tenant_admin" \
  tenant_id:=1
```

### Login:
```bash
http POST http://localhost:7071/api/auth/login \
  email="dudu@bolicho.com" \
  senha="Senha123!@"
```

### Get Current User:
```bash
http GET http://localhost:7071/api/auth/me \
  "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## User Types

- `platform_admin`: Platform administrator
- `tenant_admin`: Tenant administrator
- `tenant_member`: Tenant member
- `colecionador`: Collector (default)

---

## Authentication Providers

- `local`: Email/password authentication (default)
- `google`: Google OAuth
- `facebook`: Facebook OAuth
- `instagram`: Instagram OAuth

---

## Security Features

✅ Password hashing with bcrypt (12 rounds)
✅ JWT token with 7-day expiration
✅ Token validation on protected routes
✅ Password complexity requirements
✅ Email uniqueness validation
✅ Provider-specific authentication
✅ Secure error messages (no information leakage)
✅ Environment variable requirement for JWT_SECRET

---

## Common Issues

### Issue: "JWT_SECRET environment variable must be set"
**Solution**: Set JWT_SECRET in your .env file

### Issue: "Email já cadastrado"
**Solution**: Use a different email address or login with existing credentials

### Issue: "Token inválido ou expirado"
**Solution**: Login again to get a new token

### Issue: "Senha deve ter ao menos 1 caractere especial"
**Solution**: Include at least one special character in password (!@#$%^&*(),.?":{}|<>)

---

## Next Steps

1. Implement password reset functionality
2. Implement email verification
3. Implement refresh tokens
4. Add OAuth provider implementations
5. Add rate limiting
6. Add session management
