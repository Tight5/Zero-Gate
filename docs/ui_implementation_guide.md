# Zero Gate ESO Platform: UI Implementation Guide

## Overview

This guide outlines the implementation approach for the Zero Gate ESO Platform's user interface, focusing on modern React patterns, accessibility, and multi-tenant considerations.

## Component Architecture

### Core Layout Components

#### Header Component
```typescript
interface HeaderProps {
  user?: User;
  tenant?: Tenant;
  onTenantSwitch: (tenantId: string) => void;
}
```

Features:
- User profile dropdown with tenant switching
- Global search functionality
- Notification center
- Theme toggle (dark/light mode)
- Responsive navigation menu

#### Sidebar Navigation
```typescript
interface SidebarProps {
  collapsed?: boolean;
  activeRoute: string;
  permissions: UserPermissions;
}
```

Navigation Structure:
- Dashboard (always visible)
- Sponsors (tenant-specific)
- Grants (tenant-specific)
- Relationships (tenant-specific)
- Content Calendar (tenant-specific)
- Settings (user/tenant-specific)

#### App Layout
```typescript
interface AppLayoutProps {
  children: React.ReactNode;
  sidebar?: boolean;
  header?: boolean;
}
```

Responsive breakpoints:
- Mobile: < 768px (collapsed sidebar)
- Tablet: 768px - 1024px (condensed sidebar)
- Desktop: > 1024px (full sidebar)

### Feature-Specific Components

#### Dashboard Components

##### KPI Cards
```typescript
interface KPICardProps {
  title: string;
  value: number | string;
  change?: number;
  trend?: 'up' | 'down' | 'stable';
  format?: 'number' | 'currency' | 'percentage';
}
```

Key Metrics:
- Total Sponsors
- Active Grants
- Relationship Strength Score
- Content Calendar Items
- System Health Status

##### System Resources Monitor
```typescript
interface SystemResourcesProps {
  cpuUsage: number;
  memoryUsage: number;
  responseTime: number;
  uptime: number;
}
```

Visual indicators:
- Green: < 70% utilization
- Yellow: 70-85% utilization
- Red: > 85% utilization

#### Sponsor Management

##### Sponsor Form
```typescript
interface SponsorFormProps {
  sponsor?: Sponsor;
  onSubmit: (data: SponsorFormData) => void;
  onCancel: () => void;
}

interface SponsorFormData {
  name: string;
  contactInfo: {
    email: string;
    phone?: string;
    website?: string;
  };
  relationshipManager: string;
  tier: 'platinum' | 'gold' | 'silver' | 'bronze';
  notes?: string;
}
```

Validation Rules:
- Name: Required, min 2 characters
- Email: Required, valid email format
- Relationship Manager: Required, min 2 characters
- Tier: Required selection

##### Sponsor List
```typescript
interface SponsorListProps {
  sponsors: Sponsor[];
  onEdit: (sponsor: Sponsor) => void;
  onDelete: (sponsorId: string) => void;
  onView: (sponsor: Sponsor) => void;
}
```

Features:
- Search and filter capabilities
- Sortable columns
- Bulk actions
- Export functionality

#### Grant Management

##### Grant Timeline
```typescript
interface GrantTimelineProps {
  grant: Grant;
  milestones: GrantMilestone[];
  onMilestoneUpdate: (milestoneId: string, status: string) => void;
}
```

Timeline Features:
- Visual milestone progression
- Status indicators (pending, in_progress, completed, overdue)
- Backwards planning calculation (90/60/30 day milestones)
- Task management per milestone

##### Grant Form
```typescript
interface GrantFormProps {
  grant?: Grant;
  sponsors: Sponsor[];
  onSubmit: (data: GrantFormData) => void;
}

interface GrantFormData {
  name: string;
  sponsorId: string;
  amount: string;
  submissionDeadline: Date;
  description?: string;
  requirements?: string[];
}
```

Auto-generated Features:
- Milestone creation based on deadline
- Content calendar integration
- Timeline calculation

#### Relationship Mapping

##### Hybrid Relationship Graph
```typescript
interface RelationshipGraphProps {
  relationships: Relationship[];
  highlightPath?: string[];
  onNodeSelect: (nodeId: string) => void;
  onPathDiscovery: (sourceId: string, targetId: string) => void;
}
```

Visualization Features:
- Force-directed graph layout
- Path highlighting (up to 7 degrees)
- Interactive node selection
- Zoom and pan capabilities
- Relationship strength indicators

##### Path Discovery
```typescript
interface PathDiscoveryProps {
  sourceId: string;
  targetId: string;
  maxDepth?: number;
  onPathFound: (path: string[]) => void;
}
```

Algorithm Features:
- Breadth-first search implementation
- Configurable search depth (default: 7)
- Relationship strength weighting
- Multiple path alternatives

#### Content Calendar

##### Calendar View
```typescript
interface ContentCalendarProps {
  items: ContentCalendarItem[];
  view: 'month' | 'week' | 'day';
  onItemCreate: (date: Date) => void;
  onItemEdit: (item: ContentCalendarItem) => void;
}
```

Calendar Features:
- Multiple view modes
- Drag-and-drop scheduling
- Grant milestone integration
- Content type categorization

## Design System

### Color Palette
```css
:root {
  --primary: 222.2 84% 4.9%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96%;
  --secondary-foreground: 222.2 84% 4.9%;
  --accent: 210 40% 96%;
  --accent-foreground: 222.2 84% 4.9%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --muted: 210 40% 96%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
}

.dark {
  --primary: 210 40% 98%;
  --primary-foreground: 222.2 84% 4.9%;
  --secondary: 222.2 84% 4.9%;
  --secondary-foreground: 210 40% 98%;
  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  --popover: 222.2 84% 4.9%;
  --popover-foreground: 210 40% 98%;
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 212.7 26.8% 83.9%;
}
```

### Typography Scale
```css
.text-xs { font-size: 0.75rem; line-height: 1rem; }
.text-sm { font-size: 0.875rem; line-height: 1.25rem; }
.text-base { font-size: 1rem; line-height: 1.5rem; }
.text-lg { font-size: 1.125rem; line-height: 1.75rem; }
.text-xl { font-size: 1.25rem; line-height: 1.75rem; }
.text-2xl { font-size: 1.5rem; line-height: 2rem; }
.text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
.text-4xl { font-size: 2.25rem; line-height: 2.5rem; }
```

### Spacing System
```css
.space-1 { margin: 0.25rem; }
.space-2 { margin: 0.5rem; }
.space-3 { margin: 0.75rem; }
.space-4 { margin: 1rem; }
.space-6 { margin: 1.5rem; }
.space-8 { margin: 2rem; }
.space-12 { margin: 3rem; }
.space-16 { margin: 4rem; }
```

## State Management

### React Query Configuration
```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 3,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});
```

### Query Key Patterns
```typescript
// Hierarchical cache keys for proper invalidation
const queryKeys = {
  sponsors: ['sponsors'] as const,
  sponsor: (id: string) => ['sponsors', id] as const,
  grants: ['grants'] as const,
  grant: (id: string) => ['grants', id] as const,
  grantMilestones: (grantId: string) => ['grants', grantId, 'milestones'] as const,
  relationships: ['relationships'] as const,
  relationshipPath: (sourceId: string, targetId: string) => 
    ['relationships', 'path', sourceId, targetId] as const,
  dashboard: ['dashboard'] as const,
  dashboardKPIs: ['dashboard', 'kpis'] as const,
};
```

### Form State Management
```typescript
// Using React Hook Form with Zod validation
const sponsorForm = useForm<SponsorFormData>({
  resolver: zodResolver(insertSponsorSchema),
  defaultValues: {
    name: '',
    contactInfo: { email: '' },
    relationshipManager: '',
    tier: 'bronze',
  },
});
```

## Accessibility Guidelines

### ARIA Labels and Roles
```typescript
// Proper semantic HTML and ARIA attributes
<nav role="navigation" aria-label="Main navigation">
  <ul role="menubar">
    <li role="none">
      <Link role="menuitem" aria-current={isActive ? 'page' : undefined}>
        Dashboard
      </Link>
    </li>
  </ul>
</nav>
```

### Keyboard Navigation
- Tab order follows logical flow
- All interactive elements are keyboard accessible
- Focus indicators are clearly visible
- Escape key closes modals and dropdowns

### Screen Reader Support
- Meaningful alt text for images
- Live regions for dynamic content updates
- Proper heading hierarchy (h1 > h2 > h3)
- Form labels associated with inputs

## Performance Optimization

### Code Splitting
```typescript
// Lazy load pages for better initial load time
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Sponsors = lazy(() => import('./pages/Sponsors'));
const Grants = lazy(() => import('./pages/Grants'));
const Relationships = lazy(() => import('./pages/Relationships'));

// Wrap in Suspense with loading fallback
<Suspense fallback={<PageLoadingSkeleton />}>
  <Dashboard />
</Suspense>
```

### Data Fetching Optimization
```typescript
// Prefetch related data
const { data: sponsors } = useQuery({
  queryKey: queryKeys.sponsors,
  queryFn: () => apiRequest('/api/sponsors'),
});

// Optimistic updates for better UX
const updateSponsorMutation = useMutation({
  mutationFn: updateSponsor,
  onMutate: async (newSponsor) => {
    await queryClient.cancelQueries({ queryKey: queryKeys.sponsors });
    const previousSponsors = queryClient.getQueryData(queryKeys.sponsors);
    queryClient.setQueryData(queryKeys.sponsors, (old: Sponsor[]) =>
      old.map(sponsor => sponsor.id === newSponsor.id ? newSponsor : sponsor)
    );
    return { previousSponsors };
  },
  onError: (err, newSponsor, context) => {
    queryClient.setQueryData(queryKeys.sponsors, context.previousSponsors);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.sponsors });
  },
});
```

### Image Optimization
```typescript
// Use appropriate image formats and sizes
<img 
  src="/api/sponsors/avatar/optimized" 
  alt={`${sponsor.name} logo`}
  loading="lazy"
  width={64}
  height={64}
  className="rounded-full object-cover"
/>
```

## Testing Strategy

### Component Testing
```typescript
// Test component behavior, not implementation
test('SponsorForm submits valid data', async () => {
  const onSubmit = jest.fn();
  render(<SponsorForm onSubmit={onSubmit} />);
  
  await user.type(screen.getByLabelText(/name/i), 'Test Sponsor');
  await user.type(screen.getByLabelText(/email/i), 'test@example.com');
  await user.selectOptions(screen.getByLabelText(/tier/i), 'gold');
  
  await user.click(screen.getByRole('button', { name: /submit/i }));
  
  expect(onSubmit).toHaveBeenCalledWith({
    name: 'Test Sponsor',
    contactInfo: { email: 'test@example.com' },
    tier: 'gold'
  });
});
```

### Integration Testing
```typescript
// Test user workflows end-to-end
test('User can create and view sponsor', async () => {
  render(<App />);
  
  // Navigate to sponsors page
  await user.click(screen.getByRole('link', { name: /sponsors/i }));
  
  // Create new sponsor
  await user.click(screen.getByRole('button', { name: /add sponsor/i }));
  await user.type(screen.getByLabelText(/name/i), 'New Sponsor');
  await user.type(screen.getByLabelText(/email/i), 'new@example.com');
  await user.click(screen.getByRole('button', { name: /save/i }));
  
  // Verify sponsor appears in list
  expect(screen.getByText('New Sponsor')).toBeInTheDocument();
});
```

## Deployment Considerations

### Build Optimization
```typescript
// Vite configuration for production builds
export default defineConfig({
  build: {
    target: 'es2015',
    minify: 'terser',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          charts: ['recharts', 'd3'],
        },
      },
    },
  },
});
```

### Asset Optimization
- SVG icons minified and embedded
- Critical CSS inlined
- Non-critical CSS loaded asynchronously
- Images served in WebP format with fallbacks

This implementation guide ensures a consistent, accessible, and performant user interface for the Zero Gate ESO Platform.