# React Implementation Patterns for Zero Gate ESO Platform

## Component Architecture

### File Structure
```
src/
├── pages/
│   ├── TenantSelection.tsx
│   └── Login.tsx
├── components/
│   ├── common/
│   ├── layout/
│   └── tenant/
├── contexts/
│   ├── AuthContext.tsx
│   ├── TenantContext.tsx
│   └── ThemeContext.tsx
├── hooks/
│   └── useContexts.ts
└── lib/
    └── utils.ts
```

### Context Integration Pattern
```tsx
// Recommended pattern for accessing multiple contexts
import { useContexts } from '@/hooks/useContexts';

const Component = () => {
  const { auth, tenant, theme } = useContexts();
  // Use contexts safely with proper error handling
};
```

### State Management Pattern
```tsx
// Local state for component-specific data
const [selectedTenant, setSelectedTenant] = useState(null);

// Context state for global data
const { currentTenant, switchTenant } = useTenant();

// Server state with React Query
const { data: tenants, isLoading } = useQuery({
  queryKey: ['/api/tenants'],
  enabled: !!user
});
```

## Component Development Standards

### Props Interface Definition
```tsx
interface TenantCardProps {
  tenant: {
    id: string;
    name: string;
    description?: string;
    role: string;
    userCount: number;
    status: 'active' | 'inactive';
  };
  isSelected: boolean;
  onSelect: (tenant: any) => void;
}
```

### Error Boundary Implementation
```tsx
// Wrap components with error boundaries
<ErrorBoundary fallback={<ErrorFallback />}>
  <TenantSelection />
</ErrorBoundary>
```

### Loading State Patterns
```tsx
// Show loading skeletons while data loads
if (isLoading) {
  return <TenantSelectionSkeleton />;
}

// Show empty state when no data
if (!tenants?.length) {
  return <EmptyTenantsState />;
}
```

## Styling Patterns

### CSS-in-JS with Tailwind
```tsx
// Use Tailwind classes with conditional styling
const cardClasses = cn(
  "border rounded-lg p-6 cursor-pointer transition-all",
  isSelected && "border-blue-500 bg-blue-50",
  "hover:shadow-md hover:border-gray-300"
);
```

### Custom CSS Variables
```css
:root {
  --color-primary: #3366FF;
  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-error: #EF4444;
}
```

### Responsive Design Implementation
```tsx
// Use responsive classes
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {tenants.map(tenant => (
    <TenantCard key={tenant.id} tenant={tenant} />
  ))}
</div>
```

## Event Handling Patterns

### Form Submission
```tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!selectedTenant) return;
  
  try {
    await switchTenant(selectedTenant.id);
    navigate('/dashboard');
  } catch (error) {
    showError('Failed to switch tenant');
  }
};
```

### Click Handlers with State Updates
```tsx
const handleTenantSelect = useCallback((tenant: Tenant) => {
  setSelectedTenant(tenant);
  // Additional logic for selection feedback
}, []);
```

## Performance Optimization

### Memoization
```tsx
// Memoize expensive calculations
const sortedTenants = useMemo(() => 
  tenants?.sort((a, b) => a.name.localeCompare(b.name))
, [tenants]);

// Memoize callback functions
const handleSelect = useCallback((tenant) => {
  setSelectedTenant(tenant);
}, []);
```

### Lazy Loading
```tsx
// Lazy load components
const TenantSelection = lazy(() => import('./TenantSelection'));

// Use with Suspense
<Suspense fallback={<LoadingSpinner />}>
  <TenantSelection />
</Suspense>
```

## API Integration

### React Query Usage
```tsx
// Query with proper caching and error handling
const { 
  data: tenants, 
  isLoading, 
  error,
  refetch 
} = useQuery({
  queryKey: ['/api/tenants'],
  retry: 3,
  retryDelay: 1000,
  staleTime: 5 * 60 * 1000 // 5 minutes
});
```

### Mutation Handling
```tsx
const switchTenantMutation = useMutation({
  mutationFn: (tenantId: string) => 
    apiRequest(`/api/tenants/${tenantId}/switch`, { method: 'POST' }),
  onSuccess: () => {
    queryClient.invalidateQueries(['/api/auth/user']);
    navigate('/dashboard');
  },
  onError: (error) => {
    showError('Failed to switch tenant');
  }
});
```

## Testing Patterns

### Component Testing
```tsx
// Test component rendering and interactions
test('selects tenant when clicked', () => {
  render(<TenantSelection />);
  
  const tenantCard = screen.getByText('Test Organization');
  fireEvent.click(tenantCard);
  
  expect(tenantCard).toHaveClass('selected');
});
```

### Context Testing
```tsx
// Test with mock contexts
const mockAuthContext = {
  user: { id: '1', name: 'Test User' },
  logout: jest.fn()
};

render(
  <AuthContext.Provider value={mockAuthContext}>
    <TenantSelection />
  </AuthContext.Provider>
);
```

## Security Considerations

### Input Validation
```tsx
// Validate props and user inputs
const validateTenantSelection = (tenant: unknown): tenant is Tenant => {
  return tenant && 
    typeof tenant === 'object' && 
    'id' in tenant && 
    'name' in tenant;
};
```

### XSS Prevention
```tsx
// Sanitize user-generated content
<div 
  dangerouslySetInnerHTML={{
    __html: DOMPurify.sanitize(tenant.description)
  }}
/>
```

## Best Practices

### Component Composition
- Keep components small and focused
- Use composition over inheritance
- Extract reusable logic into custom hooks
- Implement proper prop validation

### Error Handling
- Use error boundaries for component errors
- Implement proper loading and error states
- Provide meaningful error messages
- Include retry mechanisms for failed operations

### Accessibility
- Use semantic HTML elements
- Implement proper ARIA attributes
- Ensure keyboard navigation support
- Maintain sufficient color contrast