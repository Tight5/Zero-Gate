# Zero Gate ESO Platform - JWT Authentication System

## Overview

Complete JWT-based authentication system with multi-tenant support and role-based permissions implemented for the Zero Gate ESO Platform.

## Features

- **JWT Token Management**: Access and refresh tokens with secure expiration
- **Multi-Tenant Support**: Complete tenant context isolation
- **Role-Based Access Control**: Hierarchical permissions (viewer < user < manager < admin < owner)
- **Password Security**: Bcrypt hashing with salt
- **Token Refresh**: Automatic token renewal system
- **Password Reset**: Secure password reset workflow

## API Endpoints

### Authentication Endpoints

| Endpoint | Method | Description | Authentication |
|----------|--------|-------------|----------------|
| `/auth/login` | POST | User login with email/password | None |
| `/auth/logout` | POST | User logout | Bearer Token |
| `/auth/refresh` | POST | Refresh access token | None |
| `/auth/register` | POST | Register new user | None |
| `/auth/me` | GET | Get current user info | Bearer Token |

### Password Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/password-reset/request` | POST | Request password reset |
| `/auth/password-reset/confirm` | POST | Confirm password reset |
| `/auth/change-password` | POST | Change password |

### Tenant Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/tenants` | GET | Get user's accessible tenants |
| `/auth/switch-tenant` | POST | Switch tenant context |

### Role Testing Endpoints

| Endpoint | Method | Required Role |
|----------|--------|---------------|
| `/auth/test/viewer` | GET | viewer+ |
| `/auth/test/user` | GET | user+ |
| `/auth/test/manager` | GET | manager+ |
| `/auth/test/admin` | GET | admin+ |

## Authentication Flow

### 1. Login Request
```json
POST /auth/login
{
  "email": "admin@nasdaq-center.org",
  "password": "password123",
  "tenant_id": "optional-tenant-uuid"
}
```

### 2. Login Response
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 1800,
  "user": {
    "id": "jwt-admin-001",
    "email": "admin@nasdaq-center.org",
    "first_name": "Admin",
    "last_name": "User",
    "role": "admin",
    "tenant_id": "tenant-uuid",
    "permissions": []
  },
  "tenant": {
    "id": "tenant-uuid",
    "name": "NASDAQ Entrepreneurial Center",
    "slug": "nasdaq-center"
  }
}
```

### 3. Protected Request
```http
GET /auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Role Hierarchy

1. **viewer** - Read-only access to basic data
2. **user** - Standard user operations
3. **manager** - Team management capabilities
4. **admin** - Administrative operations
5. **owner** - Full tenant control

## Test Credentials

All test users use password: `password123`

| Email | Role | Tenant |
|-------|------|--------|
| admin@nasdaq-center.org | admin | NASDAQ Center |
| manager@nasdaq-center.org | manager | NASDAQ Center |
| user@nasdaq-center.org | user | NASDAQ Center |
| viewer@nasdaq-center.org | viewer | NASDAQ Center |

## Token Configuration

- **Access Token Expiry**: 30 minutes
- **Refresh Token Expiry**: 7 days
- **Algorithm**: HS256
- **Password Hashing**: bcrypt with salt

## Security Features

- **Password Requirements**: Secure bcrypt hashing
- **Token Validation**: JWT signature verification
- **Role Enforcement**: Automatic permission checking
- **Tenant Isolation**: Complete data segregation
- **Session Management**: Secure session handling

## Testing the System

### 1. Start FastAPI Server
```bash
cd server
python test_jwt_server.py
```

### 2. Test Login
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@nasdaq-center.org", "password": "password123"}'
```

### 3. Test Protected Endpoint
```bash
curl -X GET http://localhost:8000/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 4. API Documentation
Visit: http://localhost:8000/docs

## Integration with Frontend

The JWT authentication system integrates seamlessly with the existing React frontend:

1. **Login Flow**: Frontend sends credentials to `/auth/login`
2. **Token Storage**: Store access/refresh tokens securely
3. **Request Headers**: Include `Authorization: Bearer TOKEN` 
4. **Token Refresh**: Automatic refresh on token expiry
5. **Role Checking**: Frontend can check user role for UI rendering

## Database Schema

The authentication system uses the existing multi-tenant PostgreSQL schema:

- **users table**: User accounts with password hashes
- **tenants table**: Organization/tenant definitions  
- **user_tenants table**: User-tenant relationships with roles
- **RLS policies**: Complete tenant data isolation

## Production Considerations

- Set strong JWT_SECRET_KEY environment variable
- Implement token blacklisting for logout
- Add rate limiting for login attempts
- Configure CORS properly for production domains
- Use Redis for password reset token storage
- Implement proper email sending for password resets