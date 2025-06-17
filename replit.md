# Zero Gate ESO Platform

## Overview

The Zero Gate ESO Platform is a sophisticated multi-tenant Executive Service Organization management system built with React/TypeScript frontend and Express.js backend. The application provides comprehensive tools for managing sponsor relationships, grant opportunities with backwards planning timelines, hybrid relationship mapping with 7-degree path discovery, content calendar integration, and strategic networking within the ESO ecosystem. It uses Replit Auth for authentication and PostgreSQL with Drizzle ORM for data persistence.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack React Query for server state management
- **Routing**: Wouter for client-side routing
- **Build Tool**: Vite for development and production builds
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Authentication**: Replit Auth with OpenID Connect
- **Session Management**: Express sessions with PostgreSQL store
- **API Design**: RESTful endpoints with tenant-based routing

### Database Architecture
- **Database**: PostgreSQL (configured for Neon serverless)
- **ORM**: Drizzle ORM with migrations
- **Multi-tenancy**: Row-Level Security (RLS) policies for complete tenant isolation
- **Security**: PostgreSQL RLS policies enforce tenant boundaries at database level
- **Schema**: Includes users, tenants, sponsors, grants, relationships, and content calendar tables with comprehensive RLS protection

## Key Components

### Authentication System
- Implements Replit Auth using OpenID Connect
- Session-based authentication with PostgreSQL session store
- Multi-tenant user support with role-based access
- Automatic token refresh and session management

### Multi-Tenant Architecture
- Tenant context middleware for data isolation
- User-tenant relationship management
- Tenant-specific API endpoints with header-based routing
- Role-based permissions within tenants

### Data Management
- Sponsors: Complete contact and relationship management with tier classification
- Grants: Timeline tracking with backwards planning (90/60/30-day milestones) and status updates
- Relationships: Hybrid network graph visualization with 7-degree pathfinding algorithms
- Content Calendar: Strategic communication planning with grant milestone integration
- Advanced Analytics: System resource monitoring and performance tracking

### User Interface
- Responsive design with mobile-first approach
- Dark/light theme support through CSS custom properties
- Component-based architecture using shadcn/ui
- Interactive dashboards with real-time data updates

## Data Flow

### Authentication Flow
1. User initiates login through Replit Auth
2. OpenID Connect handles authentication and token exchange
3. User session created and stored in PostgreSQL
4. Frontend receives authenticated user context
5. API requests include session credentials for authorization

### API Request Flow
1. Frontend makes authenticated request with tenant headers
2. Express middleware validates session and extracts tenant context
3. Drizzle ORM queries filtered by tenant ID
4. Response data returned with proper error handling
5. React Query manages caching and state updates

### Real-time Updates
- React Query provides optimistic updates and background refetching
- Toast notifications for user feedback
- Error boundary handling for graceful degradation

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL serverless driver
- **drizzle-orm**: Type-safe database ORM
- **@tanstack/react-query**: Server state management
- **openid-client**: OpenID Connect authentication
- **express-session**: Session management
- **react-hook-form**: Form handling and validation

### UI Dependencies
- **@radix-ui/***: Accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **lucide-react**: Icon library
- **wouter**: Lightweight routing

### Development Dependencies
- **vite**: Build tool and dev server
- **typescript**: Type checking
- **tsx**: TypeScript execution for development

## Deployment Strategy

### Development Environment
- Replit-hosted development with live reload
- Vite dev server with HMR (Hot Module Replacement)
- PostgreSQL database provisioning through Replit
- Environment variables managed through Replit secrets

### Production Deployment
- Build process generates optimized static assets
- Express server serves both API and static files
- Database migrations handled through Drizzle Kit
- Autoscale deployment target for scalability

### Environment Configuration
- Development: `npm run dev` with tsx and Vite
- Production: `npm run build` followed by `npm run start`
- Database: `npm run db:push` for schema updates

## Changelog

```
Changelog:
- June 17, 2025. Initial setup and complete platform implementation
- June 17, 2025. User confirmed application interface looks good and is ready for use
- June 17, 2025. Created comprehensive implementation documentation based on attached materials:
  * Scaling indicators documentation (docs/scaling_indicators.md)
  * Cloud transition plan (docs/cloud_transition_plan.md)
  * UI implementation guide (docs/ui_implementation_guide.md)
  * Backend test suite for grant timeline functionality (tests/grant_timeline.test.js)
  * Frontend dashboard component tests (tests/Dashboard.test.jsx)
  * Performance benchmark script (scripts/loadTest.js)
  * Content Calendar page with full functionality (client/src/pages/ContentCalendar.tsx)
- June 17, 2025. Completed build integration and production optimization:
  * Fixed UUID validation errors and tenant management system
  * Created comprehensive CI/CD pipeline with GitHub Actions
  * Developed production build scripts with optimization tools
  * Implemented health checks and performance monitoring
  * Added deployment guide and security checklist
  * Optimized database queries with proper indexing strategy
  * Created production environment configuration templates
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```