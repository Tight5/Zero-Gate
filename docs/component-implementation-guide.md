# Component Implementation Guide

## Authentication Components

### Login Page (`src/pages/Auth/Login.jsx`)
```jsx
Key Features:
- Email/password validation with real-time feedback
- Show/hide password toggle functionality
- Remember me checkbox for session persistence
- Integration with AuthContext for state management
- Responsive design with professional styling
- Error handling and loading states
- Redirect logic for authenticated users

Required Props:
- None (uses context for state management)

State Management:
- Form data (email, password, rememberMe)
- Validation errors
- Show/hide password toggle
- Loading and error states from AuthContext

Styling Classes:
- .login-page, .login-container, .login-card
- .login-header, .logo-section, .login-form
- .form-group, .password-input, .checkbox-group
- .login-button, .login-footer, .auth-links
```

### Tenant Selection Page (`src/pages/Auth/TenantSelection.jsx`)
```jsx
Key Features:
- User profile display with avatar and welcome message
- Organization grid with clickable tenant cards
- Role-based badge system (owner, admin, manager, user, viewer)
- Member count and organization status indicators
- Selection state management with visual feedback
- Continue button with disabled state logic
- Help section with support information

Required Props:
- None (uses TenantContext and AuthContext)

State Management:
- Selected tenant for continuation
- Loading states during tenant data fetch
- Available tenants from TenantContext

Card Features:
- Organization icon and name
- Description with fallback text
- Role badge with color coding
- Member count with Users icon
- Selection visual indicator
- Status badges for inactive organizations
```

## Layout Components

### App Layout (`src/components/layout/AppLayout.jsx`)
```jsx
Key Features:
- Main application shell with header and sidebar
- Sidebar collapse/expand functionality
- Theme integration for dark/light modes
- Tenant requirement validation
- Responsive design for mobile and desktop
- Outlet for nested route rendering

State Management:
- Sidebar collapsed state
- Theme context integration
- Tenant validation through TenantRequiredGuard

Layout Structure:
- Header component with navigation and user menu
- Collapsible sidebar with navigation items
- Main content area with tenant protection
- Responsive breakpoints and mobile optimization
```

### Header Component (`src/components/layout/Header.jsx`)
```jsx
Key Features:
- Logo and application title display
- Current tenant indicator
- Notification center with bell icon
- Theme toggle (dark/light mode)
- User menu with avatar and dropdown
- Menu toggle for sidebar collapse

User Menu Items:
- Settings navigation
- Logout functionality
- User profile information
- Avatar with fallback initials

Responsive Features:
- Mobile-friendly menu toggle
- Collapsible elements for smaller screens
- Touch-friendly button targets
```

### Sidebar Navigation (`src/components/layout/Sidebar.jsx`)
```jsx
Navigation Items:
- Dashboard: Executive overview and KPIs
- Relationship Mapping: Visualize stakeholder connections
- Sponsor Management: Manage sponsor relationships
- Grant Management: Track grants and timelines
- Content Calendar: Plan and schedule content
- Settings: Platform configuration

Features:
- Active route highlighting
- Icon and label display
- Collapsible mode with icon-only view
- Tooltips for collapsed state
- Role-based navigation visibility
```

## Dashboard Components

### KPI Cards (`src/components/dashboard/KPICards.jsx`)
```jsx
Metrics Displayed:
- Active Sponsors: Count with trend indicator
- Grant Applications: Total count with change percentage
- Funding Secured: Currency-formatted total
- Upcoming Deadlines: Count with trend analysis

Card Features:
- Icon representation for each metric
- Trend indicators (up/down arrows)
- Percentage change from previous period
- Color-coded status (green for positive, red for negative)
- Loading skeleton states
- Error handling with retry functionality

Data Formatting:
- Currency formatting for funding amounts
- Percentage formatting for changes
- Number localization for large values
- Responsive card grid layout
```

### Dashboard Page (`src/pages/Dashboard.jsx`)
```jsx
Sections:
- Page header with title and action buttons
- KPI cards section with real-time metrics
- Chart widgets with relationship and grant data
- Quick actions for common operations
- System health monitoring (if enabled)

Widget System:
- Relationship Strength Chart
- Grant Status Timeline
- Recent Activity Feed
- Quick Action Buttons

Feature Integration:
- Resource-aware widget loading
- Feature flag integration for advanced analytics
- Export and customization functionality
- Real-time data refresh capabilities
```

## Sponsor Management Components

### Sponsor List (`src/pages/SponsorManagement.jsx`)
```jsx
Features:
- Comprehensive sponsor table with sorting
- Search functionality across names and managers
- Status filtering (all, active, inactive, pending)
- Pagination for large datasets
- Click-to-view sponsor profiles
- Bulk action capabilities

Table Columns:
- Sponsor Name: Organization name with avatar
- Relationship Manager: Assigned team member
- Status: Color-coded status badges
- Active Grants: Count of current grants
- Last Contact: Date of most recent interaction
- Relationship Score: Visual progress bar

Actions:
- Add new sponsor functionality
- Individual sponsor profile access
- Filter and search combinations
- Export capabilities
```

### Sponsor Profile (`src/components/sponsors/SponsorProfile.jsx`)
```jsx
Profile Sections:
- Basic information and contact details
- Relationship timeline and interaction history
- Active grants and funding history
- Communication preferences and notes
- Document attachments and files
- Relationship network connections

Features:
- Edit mode for updating information
- Activity timeline with chronological events
- Grant association management
- Contact method preferences
- File upload and management
- Relationship strength visualization
```

## Relationship Mapping Components

### Relationship Mapping Page (`src/pages/RelationshipMapping.jsx`)
```jsx
Tab Structure:
- Hybrid Map: Combined geographic and network visualization
- Path Discovery: Seven-degree connection analysis
- Network Analytics: Centrality and influence metrics
- Settings: Configuration and preferences

Features:
- Resource-aware feature availability
- Integrated map and network views
- Interactive node and edge manipulation
- Advanced search and filtering
- Export and sharing capabilities

Integration Points:
- Feature flag system for resource management
- Tenant-specific relationship data
- Real-time updates and synchronization
- Mobile-responsive design patterns
```

### Hybrid Relationship Map (`src/components/relationships/HybridRelationshipMap.jsx`)
```jsx
Map Features:
- Geographic overlay with relationship markers
- Network graph with force-directed layout
- Zoom and pan functionality
- Node clustering for performance
- Edge weight visualization
- Interactive selection and highlighting

Visualization Types:
- Geographic map with location-based nodes
- Force-directed graph for relationship strength
- Hybrid view combining both approaches
- Customizable node and edge styling
- Performance optimization for large datasets
```

## Grant Management Components

### Grant Management Page (`src/pages/GrantManagement.jsx`)
```jsx
Features:
- Grant application tracking and status management
- Timeline visualization with backwards planning
- Deadline monitoring and alert system
- Funding progress tracking
- Document management and requirements
- Team collaboration and task assignment

Timeline Features:
- 90/60/30-day milestone tracking
- Automated deadline calculations
- Risk assessment and mitigation
- Progress visualization
- Task assignment and completion tracking
```

## Common Components

### Tenant Required Guard (`src/components/common/TenantRequiredGuard.jsx`)
```jsx
Functionality:
- Validates tenant selection before content access
- Redirects to tenant selection if no tenant chosen
- Handles loading states during tenant validation
- Displays no-access message for users without tenants
- Integrates with authentication flow

Guard Logic:
- Check for current tenant in context
- Validate user access to selected tenant
- Handle loading and error states
- Provide appropriate redirects and messages
```

### Protected Route (`src/components/common/ProtectedRoute.jsx`)
```jsx
Features:
- Authentication requirement validation
- Automatic redirect to login for unauthenticated users
- Loading state management during auth checks
- Integration with AuthContext
- Support for nested protected routes

Security Features:
- Session validation
- Token refresh handling
- Graceful degradation for expired sessions
- Error boundary integration
```

## Custom Hooks

### Tenant Data Hook (`src/hooks/useTenantData.js`)
```jsx
Features:
- Tenant-aware data fetching with React Query
- Automatic cache invalidation on tenant switch
- Error handling and retry logic
- Loading state management
- Optimistic updates for mutations

Usage Patterns:
- useTenantData(endpoint, options) for queries
- useTenantMutation(endpoint, options) for mutations
- useTenantStats() for dashboard metrics
- useTenantSettings() for configuration management
```

## Styling Patterns

### CSS Class Conventions
```css
Page-level classes:
- .{page-name}-page: Main page container
- .{page-name}-header: Page header section
- .{page-name}-content: Main content area

Component-level classes:
- .{component-name}: Main component container
- .{component-name}-header: Component header
- .{component-name}-content: Component content
- .{component-name}-footer: Component footer

State classes:
- .loading: Loading state styles
- .error: Error state styles
- .active: Active/selected state
- .disabled: Disabled state styles
```

### Responsive Design Patterns
```css
Breakpoints:
- Mobile: < 640px (single column layouts)
- Tablet: 640px - 1024px (2-column grids)
- Desktop: > 1024px (full layouts)

Grid Systems:
- CSS Grid for main layout structure
- Flexbox for component-level layouts
- Responsive grid columns with auto-fit
- Container queries for component responsiveness
```

## Error Handling Patterns

### Component Error Boundaries
```jsx
Features:
- Graceful error recovery with fallback UI
- Error logging and reporting
- User-friendly error messages
- Retry mechanisms where appropriate
- Context preservation during errors

Implementation:
- Page-level error boundaries
- Component-specific error handling
- API error response handling
- Form validation error display
- Network error recovery
```

## Performance Optimization

### Component Optimization
```jsx
Techniques:
- React.memo for expensive components
- useMemo for complex calculations
- useCallback for event handlers
- Lazy loading for route components
- Virtual scrolling for large lists

Caching Strategies:
- React Query for server state caching
- LocalStorage for user preferences
- Session storage for temporary data
- Memory caching for computed values
```