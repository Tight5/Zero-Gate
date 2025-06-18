# Zero Gate ESO Platform - Complete Architecture Guide

## Project Overview

The Zero Gate ESO Platform is a sophisticated multi-tenant Enterprise Service Organization management system designed for Entrepreneur Support Organizations. It provides comprehensive tools for managing sponsor relationships, grant opportunities, relationship mapping, and strategic networking.

## Technology Stack

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for development and production builds
- **Routing**: React Router for client-side navigation
- **State Management**: TanStack React Query for server state
- **UI Library**: @replit/ui component library with shadcn/ui integration
- **Styling**: Tailwind CSS with custom theme support
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Primary Backend**: Express.js with TypeScript
- **Secondary Backend**: FastAPI with Python (for AI agents)
- **Authentication**: Replit Auth with OpenID Connect
- **Session Management**: Express sessions with PostgreSQL store
- **Database**: PostgreSQL with Drizzle ORM
- **API Design**: RESTful endpoints with tenant-based routing

### Database Architecture
- **Database**: PostgreSQL (Neon serverless)
- **ORM**: Drizzle ORM with type-safe queries
- **Multi-tenancy**: Row-Level Security (RLS) policies
- **Migrations**: Drizzle migrations for schema management
- **Session Storage**: PostgreSQL-backed session store

## Core System Components

### 1. Authentication System
- **Replit Auth Integration**: OpenID Connect flow
- **Session Management**: PostgreSQL-backed sessions
- **Multi-tenant Support**: User-tenant relationship management
- **Token Management**: Automatic refresh and session validation

### 2. Multi-Tenant Architecture
- **Tenant Context**: React context for tenant state management
- **Data Isolation**: PostgreSQL RLS policies ensure complete tenant separation
- **API Routing**: Tenant-aware endpoints with header-based context
- **Role-based Access**: Hierarchical permissions within tenants

### 3. AI Agent Architecture
- **OrchestrationAgent**: Asyncio workflow management with resource monitoring
- **ProcessingAgent**: NetworkX-based relationship graph processing
- **IntegrationAgent**: Microsoft Graph API integration with MSAL auth
- **Resource Management**: Intelligent feature toggling based on system resources

### 4. Frontend Context System
- **AuthContext**: User authentication state and methods
- **TenantContext**: Tenant selection and switching functionality
- **ThemeContext**: Dark/light mode theme management
- **ResourceContext**: Feature availability based on system resources

## Application Structure

### Page Hierarchy
```
/ (root)
├── /login - Authentication page
├── /tenant-selection - Organization selection after login
└── /dashboard (protected) - Main application layout
    ├── /dashboard - Executive dashboard with KPIs
    ├── /relationships - Hybrid relationship mapping
    ├── /sponsors - Sponsor management and profiles
    ├── /grants - Grant tracking and timelines
    ├── /calendar - Content calendar planning
    └── /settings - Platform configuration
```

### Component Architecture
```
src/
├── components/
│   ├── common/ - Shared utility components
│   ├── layout/ - App structure (Header, Sidebar, AppLayout)
│   ├── dashboard/ - Dashboard-specific components
│   ├── sponsors/ - Sponsor management components
│   ├── grants/ - Grant tracking components
│   ├── relationships/ - Relationship mapping components
│   └── calendar/ - Content calendar components
├── contexts/ - React context providers
├── hooks/ - Custom React hooks
├── pages/ - Top-level page components
├── lib/ - Utility functions and configurations
└── types/ - TypeScript type definitions
```

## Key Features Implementation

### 1. Dashboard System
- **KPI Cards**: Real-time metrics display with trend indicators
- **Widget System**: Modular dashboard components
- **Resource Monitoring**: System health and performance indicators
- **Quick Actions**: Fast access to common operations

### 2. Relationship Mapping
- **Hybrid Visualization**: Geographic and network graph views
- **Path Discovery**: Seven-degree connection analysis
- **Network Analytics**: Centrality and influence scoring
- **Interactive Features**: Zoom, filter, and search capabilities

### 3. Sponsor Management
- **Profile System**: Comprehensive sponsor information
- **Relationship Tracking**: Contact history and engagement scoring
- **Status Management**: Active, inactive, and pending classifications
- **Search and Filtering**: Advanced query capabilities

### 4. Grant Management
- **Timeline Tracking**: Backwards planning with 90/60/30-day milestones
- **Status Workflows**: Application lifecycle management
- **Deadline Monitoring**: Automated alerts and reminders
- **Funding Tracking**: Financial progress monitoring

### 5. Content Calendar
- **Strategic Planning**: Content scheduling aligned with grant cycles
- **Milestone Integration**: Automated content suggestions
- **Multi-channel Support**: Various communication channels
- **Collaboration Tools**: Team-based content planning

## Data Models

### Core Entities
- **Users**: Authentication and profile information
- **Tenants**: Organization-level data containers
- **Sponsors**: Funding organization profiles and relationships
- **Grants**: Grant opportunities and application tracking
- **Relationships**: Network connections and strength metrics
- **Content**: Calendar items and communication planning

### Relationship Schema
- **Sponsor-Grant**: Many-to-many funding relationships
- **User-Tenant**: Role-based organizational access
- **Relationship-Entity**: Graph connections between all entities
- **Content-Grant**: Timeline-based content alignment

## Security Implementation

### Authentication Flow
1. User initiates login through Replit Auth
2. OpenID Connect handles token exchange
3. Session created in PostgreSQL store
4. Frontend receives authenticated context
5. API requests include session credentials

### Data Security
- **Row-Level Security**: PostgreSQL RLS enforces tenant boundaries
- **Session Management**: Secure session storage and validation
- **API Authorization**: Middleware validates all requests
- **Input Validation**: Zod schemas for all data inputs

## Performance Optimization

### Frontend Optimization
- **Lazy Loading**: Code splitting for page components
- **React Query**: Intelligent caching and background updates
- **Memoization**: Performance optimization for complex calculations
- **Virtual Scrolling**: Efficient large dataset rendering

### Backend Optimization
- **Database Indexing**: Optimized queries for tenant-isolated data
- **Connection Pooling**: Efficient database connection management
- **Caching Strategy**: Multi-layer caching for frequently accessed data
- **Resource Monitoring**: Automatic feature degradation under load

## Deployment Architecture

### Development Environment
- **Replit Platform**: Hosted development with live reload
- **Vite Dev Server**: Hot module replacement for frontend
- **Express Server**: Backend API with automatic restart
- **PostgreSQL**: Managed database with development access

### Production Considerations
- **Build Process**: Optimized asset generation
- **Static Serving**: Express serves both API and static files
- **Database Migrations**: Automated schema updates
- **Environment Variables**: Secure configuration management

## API Design Patterns

### RESTful Endpoints
- **Tenant Context**: All endpoints include tenant awareness
- **Standard Methods**: GET, POST, PUT, DELETE with consistent patterns
- **Error Handling**: Structured error responses with proper HTTP codes
- **Pagination**: Cursor-based pagination for large datasets

### Data Flow Pattern
1. Frontend request with tenant headers
2. Middleware extracts and validates tenant context
3. Database query with RLS-enforced filtering
4. Response data with proper error handling
5. React Query manages caching and updates

## Development Guidelines

### Code Standards
- **TypeScript**: Strict type checking for all code
- **ESLint/Prettier**: Consistent code formatting
- **Component Patterns**: Functional components with hooks
- **Error Boundaries**: Graceful error handling throughout app

### Testing Strategy
- **Unit Testing**: Component and utility function tests
- **Integration Testing**: API endpoint and database tests
- **E2E Testing**: Critical user flow validation
- **Performance Testing**: Load testing for scalability

## Scaling Considerations

### Performance Monitoring
- **Resource Thresholds**: CPU and memory monitoring
- **Feature Toggling**: Automatic degradation under load
- **Query Optimization**: Database performance monitoring
- **User Experience**: Response time and error rate tracking

### Horizontal Scaling
- **Stateless Design**: Session storage in database
- **Database Scaling**: Read replicas and connection pooling
- **CDN Integration**: Static asset delivery optimization
- **Load Balancing**: Multiple application instances