# Backend Implementation Guide

## Express.js Backend Architecture

### Main Application Entry (`server/index.ts`)
```typescript
Key Features:
- Express server with middleware configuration
- Static file serving for frontend assets
- API route registration and error handling
- Health check endpoints with system metrics
- CORS configuration for development and production
- Session management with PostgreSQL store

Server Configuration:
- Port configuration from environment variables
- Middleware stack: CORS, sessions, auth, static files
- Error handling middleware for graceful failures
- Request logging and performance monitoring
- Graceful shutdown handling
```

### Authentication System (`server/replitAuth.ts`)
```typescript
Replit Auth Integration:
- OpenID Connect configuration with dynamic discovery
- Multi-domain support for Replit deployments
- Session management with PostgreSQL backing
- Token refresh and validation logic
- User session serialization/deserialization

Authentication Flow:
1. /api/login - Initiates OIDC authentication
2. /api/callback - Handles OIDC callback and user creation
3. /api/logout - Handles logout and session cleanup
4. isAuthenticated middleware - Protects routes

User Management:
- Automatic user creation from OIDC claims
- User profile updates from token data
- Session persistence across requests
- Token refresh for expired sessions
```

### Database Integration (`server/db.ts`)
```typescript
Database Configuration:
- Neon PostgreSQL serverless connection
- Drizzle ORM with type-safe queries
- Connection pooling for performance
- WebSocket support for serverless environments
- Environment-based configuration

Schema Integration:
- Shared schema from @shared/schema
- Type-safe database operations
- Automatic relationship handling
- Migration support through Drizzle Kit
```

### Storage Layer (`server/storage.ts`)
```typescript
Interface Design:
- IStorage interface for consistent API
- DatabaseStorage implementation with Drizzle
- User management operations (required for Replit Auth)
- Tenant-aware data operations
- Error handling and validation

Core Operations:
- getUser(id): Retrieve user by ID
- upsertUser(userData): Create or update user
- Tenant-specific data isolation
- Multi-tenant query patterns
```

### API Routes (`server/routes.ts`)
```typescript
Route Organization:
- Authentication routes (/api/auth/*)
- Tenant management (/api/tenants)
- Dashboard data (/api/dashboard/*)
- Protected route examples
- Health and metrics endpoints

Middleware Integration:
- isAuthenticated for protected routes
- Tenant context extraction
- Error handling and validation
- Request/response logging
```

## FastAPI Python Backend

### Main Application (`main.py`)
```python
FastAPI Configuration:
- Async application with lifespan management
- CORS middleware for cross-origin requests
- Resource monitoring integration
- Agent initialization and management
- Health check endpoints

Application Lifecycle:
- Startup: Initialize agents and database connections
- Runtime: Handle API requests with resource awareness
- Shutdown: Clean up resources and connections

Route Integration:
- Sponsor management routes
- Grant tracking routes
- Relationship analysis routes
- Workflow orchestration routes
```

### AI Agent Architecture

#### Orchestration Agent (`agents/orchestration.py`)
```python
Core Features:
- Asyncio-based workflow management
- Resource-aware task scheduling
- Intelligent feature toggling
- Task queue management with priorities
- Emergency controls and circuit breakers

Workflow Types:
- Sponsor analysis workflows
- Grant timeline generation
- Relationship mapping tasks
- Content calendar synchronization
- Data processing pipelines

Resource Management:
- CPU and memory threshold monitoring
- Automatic feature degradation
- Task prioritization based on system load
- Graceful handling of resource constraints
```

#### Processing Agent (`agents/processing.py`)
```python
NetworkX Integration:
- Graph-based relationship analysis
- Seven-degree path discovery
- Centrality and influence scoring
- Sponsor metrics calculation
- Grant timeline optimization

Core Algorithms:
- Shortest path calculation between entities
- Network centrality metrics (betweenness, closeness)
- Influence propagation modeling
- Timeline backwards planning
- Risk assessment calculations

Performance Optimization:
- Graph caching for frequently accessed data
- Incremental updates for large networks
- Memory-efficient algorithms
- Tenant-isolated graph processing
```

#### Integration Agent (`agents/integration_new.py`)
```python
Microsoft Graph Integration:
- MSAL authentication with client credentials
- Organizational user extraction
- Email pattern analysis for relationship strength
- Excel file processing for dashboard insights
- Real-time synchronization capabilities

Data Processing:
- User hierarchy mapping (manager/report relationships)
- Communication frequency analysis
- Relationship strength calculation
- Excel data parsing and validation
- Automated data enrichment
```

## Database Schema (`shared/schema.ts`)

### Core Tables
```typescript
Users Table:
- id: Primary key (varchar from Replit Auth)
- email: User email address
- firstName, lastName: User names
- profileImageUrl: Avatar URL
- createdAt, updatedAt: Timestamps

Sessions Table (Required for Replit Auth):
- sid: Session ID (primary key)
- sess: Session data (JSONB)
- expire: Session expiration timestamp
- Indexes for performance optimization

Tenants Table:
- id: UUID primary key
- name: Organization name
- domain: Organization domain
- settings: Configuration JSONB
- RLS policies for data isolation

Additional Tables:
- Sponsors: Funding organization data
- Grants: Grant opportunity tracking
- Relationships: Network connection data
- Content: Calendar and communication items
```

### Multi-Tenant Security
```sql
Row-Level Security Policies:
- Tenant isolation at database level
- User-tenant relationship validation
- Automatic filtering based on tenant context
- Secure data access patterns

Policy Examples:
- Users can only access their own tenant data
- Admin users have broader access within tenant
- Cross-tenant data access prevention
- Audit trail for data access patterns
```

## API Design Patterns

### RESTful Endpoint Structure
```typescript
Authentication Endpoints:
- GET /api/auth/user - Current user information
- POST /api/auth/login - Initiate authentication
- POST /api/auth/logout - End user session

Tenant Management:
- GET /api/tenants - Available tenants for user
- POST /api/tenants/{id}/switch - Switch active tenant
- GET /api/tenants/{id}/settings - Tenant configuration

Dashboard Endpoints:
- GET /api/dashboard/kpis - Key performance indicators
- GET /api/dashboard/metrics - System performance metrics
- GET /api/dashboard/activity - Recent activity feed

Resource Endpoints:
- GET /api/sponsors - Paginated sponsor list
- POST /api/sponsors - Create new sponsor
- GET /api/grants - Grant tracking data
- PUT /api/relationships - Update relationship data
```

### Error Handling Patterns
```typescript
HTTP Status Codes:
- 200: Successful operations
- 201: Resource creation
- 400: Bad request (validation errors)
- 401: Unauthorized (authentication required)
- 403: Forbidden (insufficient permissions)
- 404: Resource not found
- 500: Internal server error

Error Response Format:
{
  "error": "Error type",
  "message": "Human-readable description",
  "code": "SPECIFIC_ERROR_CODE",
  "details": {} // Additional context
}
```

## Middleware Implementation

### Tenant Context Middleware (`utils/tenant_context.py`)
```python
Features:
- Extract tenant ID from request headers
- Validate user access to tenant
- Set database context for RLS policies
- Handle tenant switching operations
- Audit tenant access patterns

Request Processing:
1. Extract tenant header from request
2. Validate user has access to tenant
3. Set database session variables
4. Process request with tenant context
5. Log access for audit purposes
```

### Performance Monitoring (`utils/resource_monitor.py`)
```python
Monitoring Features:
- Real-time CPU and memory tracking
- Feature availability determination
- Automatic degradation thresholds
- Performance metrics collection
- Alert generation for critical issues

Resource Thresholds:
- CPU: 65% threshold for feature degradation
- Memory: 70% threshold for optimization
- Response Time: Latency monitoring
- Error Rate: Failure rate tracking
```

## Security Implementation

### Authentication Security
```typescript
Session Security:
- HttpOnly cookies for session management
- Secure flag for HTTPS environments
- SameSite protection against CSRF
- Session timeout and rotation
- Multi-domain session support

Token Management:
- JWT validation for API requests
- Automatic token refresh logic
- Secure token storage patterns
- Token revocation capabilities
```

### Data Security
```sql
Database Security:
- Row-Level Security for multi-tenancy
- Encrypted connections to database
- Parameterized queries to prevent injection
- Audit logging for data access
- Backup and recovery procedures
```

## Performance Optimization

### Database Optimization
```sql
Indexing Strategy:
- Primary keys on all tables
- Foreign key indexes for relationships
- Composite indexes for common queries
- Partial indexes for filtered queries
- GIN indexes for JSONB columns

Query Optimization:
- Efficient JOIN patterns
- Proper use of CTEs and subqueries
- Limit and offset for pagination
- Connection pooling configuration
```

### Caching Strategy
```typescript
Multi-Level Caching:
- Application-level caching with Redis/Memory
- Database query result caching
- Static asset caching with CDN
- Session data caching
- API response caching with TTL

Cache Invalidation:
- Event-driven cache updates
- TTL-based expiration
- Manual cache clearing for critical updates
- Cache warming strategies
```

## Development Workflow

### Environment Configuration
```bash
Development Setup:
- Environment variable management
- Database connection configuration
- Authentication provider setup
- Feature flag configuration
- Logging level settings

Production Deployment:
- Environment-specific configurations
- Database migration procedures
- SSL certificate management
- Monitoring and alerting setup
```

### Testing Strategy
```typescript
Unit Testing:
- Database operation testing
- Authentication flow validation
- API endpoint testing
- Error handling verification

Integration Testing:
- End-to-end API testing
- Database integration testing
- Authentication provider testing
- Multi-tenant functionality testing
```

## Monitoring and Logging

### Application Monitoring
```typescript
Metrics Collection:
- Request/response times
- Error rates and types
- Resource utilization
- User activity patterns
- Feature usage statistics

Logging Strategy:
- Structured logging with JSON format
- Log level configuration
- Error tracking and alerting
- Performance monitoring
- Security event logging
```

### Health Checks
```typescript
Health Endpoints:
- /health - Basic application health
- /health/detailed - Comprehensive system status
- /metrics - Prometheus-compatible metrics
- /status - Service dependency status

Monitoring Integration:
- Uptime monitoring
- Performance baseline tracking
- Alert configuration
- Dashboard integration
```