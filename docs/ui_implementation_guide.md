# Zero Gate ESO Platform: UI Implementation Guide

## Component Architecture

### Layout Components

#### Header Component (`src/components/layout/Header.tsx`)
- **Purpose**: Navigation bar with user menu and tenant switcher
- **Features**: Search functionality, notifications, profile dropdown
- **Responsive**: Mobile hamburger menu, desktop horizontal layout
- **Authentication**: Shows user avatar and logout option

#### Sidebar Component (`src/components/layout/Sidebar.tsx`)
- **Purpose**: Main navigation with collapsible sections
- **Features**: Icon-based navigation, active state indicators
- **Sections**: Dashboard, Sponsors, Grants, Relationships, Content Calendar
- **Accessibility**: Keyboard navigation, screen reader support

#### AppLayout Component (`src/components/layout/AppLayout.tsx`)
- **Purpose**: Main layout wrapper combining header, sidebar, and content
- **Features**: Responsive grid layout, loading states
- **Theme**: Dark/light mode toggle integration

### Common Components

#### ProtectedRoute Component (`src/components/common/ProtectedRoute.tsx`)
- **Purpose**: Route-level authentication guard
- **Features**: Redirect to login, loading states, role-based access
- **Error Handling**: Graceful fallback for auth failures

#### TenantSelector Component (`src/components/common/TenantSelector.tsx`)
- **Purpose**: Dropdown for switching between tenants
- **Features**: Search filtering, recent tenants, create new tenant
- **State Management**: Updates global tenant context

#### TenantProvider Component (`src/components/common/TenantProvider.tsx`)
- **Purpose**: Context provider for tenant-specific data
- **Features**: Tenant switching, data isolation, cache management
- **Performance**: Optimized re-renders, selective updates

### Feature Components

#### HybridRelationshipMap Component (`src/components/features/HybridRelationshipMap.tsx`)
- **Purpose**: Interactive network visualization
- **Features**: D3.js integration, zoom/pan, node highlighting
- **Algorithms**: Seven-degree path discovery, clustering
- **Performance**: Canvas rendering, viewport culling

#### PathDiscovery Component (`src/components/features/PathDiscovery.tsx`)
- **Purpose**: Relationship path finding interface
- **Features**: Source/target selection, path visualization, strength indicators
- **Real-time**: WebSocket updates for live path discovery

#### GrantTimeline Component (`src/components/features/GrantTimeline.tsx`)
- **Purpose**: Grant milestone timeline visualization
- **Features**: Backwards planning, drag-and-drop milestones, progress tracking
- **Integration**: Content calendar sync, automated milestone generation

#### ContentCalendar Component (`src/components/features/ContentCalendar.tsx`)
- **Purpose**: Editorial calendar with grant integration
- **Features**: Drag-and-drop scheduling, recurring events, milestone linking
- **Views**: Month, week, day views with filtering

### Utility Components

#### ExcelFileProcessor Component (`src/components/utils/ExcelFileProcessor.tsx`)
- **Purpose**: Excel file upload and processing interface
- **Features**: Drag-and-drop upload, column mapping, preview
- **Validation**: Data type checking, duplicate detection
- **Progress**: Upload progress bar, processing status

#### DashboardKPICards Component (`src/components/dashboard/KPICards.tsx`)
- **Purpose**: Key performance indicator display cards
- **Features**: Animated counters, trend indicators, tooltips
- **Responsive**: Grid layout, mobile stacking

## Page Components

### AuthLogin Page (`src/pages/Auth/Login.tsx`)
- **Purpose**: User authentication interface
- **Features**: Email/password login, remember me, password reset
- **Integration**: Replit Auth, social login options
- **Security**: CSRF protection, rate limiting

### TenantSelection Page (`src/pages/TenantSelection.tsx`)
- **Purpose**: Tenant selection after login
- **Features**: Tenant grid, search, create new tenant
- **Onboarding**: First-time user guidance, tenant setup wizard

### Dashboard Page (`src/pages/Dashboard.tsx`)
- **Purpose**: Main application dashboard
- **Features**: KPI cards, recent activity, quick actions
- **Widgets**: Configurable dashboard layout, drag-and-drop widgets
- **Real-time**: Live data updates, notification center

### RelationshipMapping Page (`src/pages/RelationshipMapping.tsx`)
- **Purpose**: Relationship visualization and management
- **Features**: Network graph, path discovery, relationship editing
- **Tools**: Zoom controls, filter panel, export options
- **Performance**: Optimized for large networks (50,000+ nodes)

### SponsorManagement Page (`src/pages/SponsorManagement.tsx`)
- **Purpose**: Sponsor CRUD operations and analytics
- **Features**: Data grid, bulk operations, tier management
- **Search**: Advanced filtering, full-text search
- **Export**: CSV/Excel export, custom reports

### GrantManagement Page (`src/pages/GrantManagement.tsx`)
- **Purpose**: Grant lifecycle management
- **Features**: Timeline view, milestone tracking, status updates
- **Templates**: Grant application templates, automated workflows
- **Analytics**: Success rates, funding trends, pipeline analysis

### Settings Page (`src/pages/Settings.tsx`)
- **Purpose**: Application and user preferences
- **Features**: Profile settings, notification preferences, integrations
- **Sections**: User profile, tenant settings, API keys, billing

### ContentCalendar Page (`src/pages/ContentCalendar.tsx`)
- **Purpose**: Content planning and scheduling
- **Features**: Calendar views, content templates, approval workflows
- **Integration**: Grant milestone sync, social media scheduling
- **Collaboration**: Team assignments, approval processes

## Design System

### Color Palette
```css
:root {
  --primary-50: #eff6ff;
  --primary-500: #3b82f6;
  --primary-900: #1e3a8a;
  
  --secondary-50: #f8fafc;
  --secondary-500: #64748b;
  --secondary-900: #0f172a;
  
  --success-500: #10b981;
  --warning-500: #f59e0b;
  --error-500: #ef4444;
}

.dark {
  --background: #0f172a;
  --foreground: #f8fafc;
  --muted: #1e293b;
  --accent: #334155;
}
```

### Typography Scale
- **Headings**: Inter font family, weight 600-700
- **Body**: Inter font family, weight 400-500
- **Code**: JetBrains Mono, weight 400

### Spacing System
- Base unit: 4px (0.25rem)
- Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96px

### Component States
- **Default**: Normal state styling
- **Hover**: Subtle color/shadow changes
- **Active**: Pressed state indication
- **Focus**: Accessibility focus rings
- **Disabled**: Reduced opacity, no interactions
- **Loading**: Skeleton states, spinners

## Responsive Design

### Breakpoints
```css
/* Mobile First Approach */
@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
@media (min-width: 1536px) { /* 2xl */ }
```

### Mobile Adaptations
- **Navigation**: Collapsible sidebar, bottom tab bar
- **Tables**: Horizontal scroll, card layout alternatives
- **Forms**: Single column layout, optimized input sizing
- **Charts**: Touch-optimized interactions, simplified views

## Performance Optimization

### Code Splitting
- Route-based splitting for each page
- Component-level splitting for heavy features
- Library splitting for third-party dependencies

### Lazy Loading
- Images with intersection observer
- Components with React.lazy()
- Data with infinite scroll pagination

### Caching Strategy
- React Query for server state caching
- LocalStorage for user preferences
- SessionStorage for temporary data

### Bundle Optimization
- Tree shaking for unused code elimination
- Compression with gzip/brotli
- Asset optimization (images, fonts)

## Accessibility Standards

### WCAG 2.1 Compliance
- Level AA conformance target
- Keyboard navigation support
- Screen reader compatibility
- Color contrast ratios

### Implementation Details
- Semantic HTML elements
- ARIA labels and descriptions
- Focus management
- Error message announcements

## Testing Strategy

### Unit Testing
- Component isolation testing
- Hook testing with React Testing Library
- Utility function testing

### Integration Testing
- API integration testing
- User workflow testing
- Cross-browser compatibility

### E2E Testing
- Critical path automation
- Regression testing suite
- Performance monitoring

## Development Workflow

### Local Development
```bash
npm run dev          # Start development server
npm run test         # Run test suite
npm run lint         # Code linting
npm run type-check   # TypeScript validation
```

### Code Quality
- ESLint for code style
- Prettier for formatting
- Husky for pre-commit hooks
- TypeScript for type safety

### Documentation
- Storybook for component documentation
- JSDoc for function documentation
- README files for setup instructions

This UI implementation guide ensures consistent, accessible, and performant user interface development across the Zero Gate ESO platform.