import React from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthContext } from '../client/src/contexts/AuthContext';
import { TenantContext } from '../client/src/contexts/TenantContext';
import { ResourceContext } from '../client/src/contexts/ResourceContext';
import { ThemeProvider } from '../client/src/contexts/ThemeContext';

// Default mock contexts
const defaultAuthContext = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
  },
  isLoading: false,
  isAuthenticated: true,
  login: jest.fn(),
  logout: jest.fn(),
  loginWithMicrosoft: jest.fn(),
};

const defaultTenantContext = {
  currentTenant: {
    id: 'test-tenant',
    name: 'Test Organization',
  },
  tenants: [
    { id: 'test-tenant', name: 'Test Organization' },
  ],
  selectedTenant: 'test-tenant',
  switchTenant: jest.fn(),
  isLoading: false,
};

const defaultResourceContext = {
  isFeatureEnabled: jest.fn(() => true),
  features: {
    relationship_mapping: true,
    advanced_analytics: true,
    path_discovery: true,
    excel_processing: true,
    email_analysis: true,
  },
  resourceUsage: {
    memory: 75,
    cpu: 60,
  },
  isLoading: false,
};

// Custom render function with providers
export const renderWithProviders = (
  ui,
  {
    authContext = defaultAuthContext,
    tenantContext = defaultTenantContext,
    resourceContext = defaultResourceContext,
    queryClient = null,
    router = true,
    ...renderOptions
  } = {}
) => {
  // Create a fresh query client for each test
  const testQueryClient = queryClient || new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  const AllProviders = ({ children }) => (
    <QueryClientProvider client={testQueryClient}>
      <ThemeProvider>
        <AuthContext.Provider value={authContext}>
          <TenantContext.Provider value={tenantContext}>
            <ResourceContext.Provider value={resourceContext}>
              {router ? (
                <BrowserRouter>
                  {children}
                </BrowserRouter>
              ) : (
                children
              )}
            </ResourceContext.Provider>
          </TenantContext.Provider>
        </AuthContext.Provider>
      </ThemeProvider>
    </QueryClientProvider>
  );

  return render(ui, { wrapper: AllProviders, ...renderOptions });
};

// Mock API responses for common endpoints
export const mockApiResponses = {
  dashboard: {
    sponsors: 25,
    grants: 12,
    relationships: 150,
    totalFunding: 2500000,
    activeGrants: 8,
    pendingApplications: 4,
    recentSponsors: [
      { id: '1', name: 'Foundation A', tier: 'Foundation', created_at: '2024-01-15' },
      { id: '2', name: 'Corporation B', tier: 'Corporate', created_at: '2024-01-10' },
    ],
    recentGrants: [
      { id: '1', title: 'Community Grant', amount: 50000, status: 'Draft' },
      { id: '2', title: 'Education Grant', amount: 75000, status: 'Submitted' },
    ],
    grantStatusDistribution: [
      { status: 'Draft', count: 3 },
      { status: 'Submitted', count: 5 },
      { status: 'Approved', count: 2 },
      { status: 'Rejected', count: 2 },
    ],
    monthlyFunding: [
      { month: 'Jan', amount: 150000 },
      { month: 'Feb', amount: 200000 },
      { month: 'Mar', amount: 175000 },
    ],
  },

  sponsors: [
    {
      id: '1',
      name: 'Foundation Alpha',
      type: 'Foundation',
      tier: 'Primary',
      status: 'Active',
      relationshipManager: 'John Smith',
      lastContact: '2024-01-15',
      activeGrants: 3,
      totalFunding: 500000,
      relationshipScore: 85,
      email: 'contact@foundationalpha.org',
      phone: '+1-555-0101',
      address: '123 Foundation St, New York, NY 10001',
    },
    {
      id: '2',
      name: 'Corporate Beta',
      type: 'Corporate',
      tier: 'Secondary',
      status: 'Active',
      relationshipManager: 'Sarah Johnson',
      lastContact: '2024-01-10',
      activeGrants: 1,
      totalFunding: 250000,
      relationshipScore: 72,
      email: 'partnerships@corporatebeta.com',
      phone: '+1-555-0102',
      address: '456 Business Ave, Los Angeles, CA 90210',
    },
  ],

  grants: [
    {
      id: '1',
      title: 'Community Development Grant',
      description: 'Supporting local community initiatives',
      amount: 150000,
      status: 'Draft',
      priority: 'High',
      sponsor: 'Foundation Alpha',
      submissionDeadline: '2024-03-15',
      submissionDate: null,
      createdAt: '2024-01-15',
      phase: 'Planning',
      progressPercentage: 25,
    },
    {
      id: '2',
      title: 'Education Innovation Grant',
      description: 'Technology integration in education',
      amount: 75000,
      status: 'Submitted',
      priority: 'Medium',
      sponsor: 'Corporate Beta',
      submissionDeadline: '2024-02-28',
      submissionDate: '2024-02-25',
      createdAt: '2024-01-10',
      phase: 'Review',
      progressPercentage: 85,
    },
  ],

  relationships: {
    nodes: [
      {
        id: '1',
        name: 'John Smith',
        type: 'person',
        organization: 'Foundation A',
        position: { lat: 40.7128, lng: -74.0060 },
        strength: 0.8,
        tier: 'primary',
      },
      {
        id: '2',
        name: 'Foundation A',
        type: 'organization',
        position: { lat: 40.7589, lng: -73.9851 },
        strength: 0.9,
        tier: 'foundation',
      },
    ],
    links: [
      {
        source: '1',
        target: '2',
        strength: 0.8,
        type: 'employment',
        confidence: 0.95,
      },
    ],
  },

  pathDiscovery: {
    path: ['1', '2', '3'],
    confidence: 0.85,
    steps: [
      {
        from: 'John Smith',
        to: 'Foundation A',
        relationship: 'Program Director',
        strength: 0.8,
      },
    ],
    totalDistance: 2,
    estimatedTime: '2-3 weeks',
    keyInfluencers: ['Foundation A'],
  },

  networkAnalytics: {
    networkDensity: 0.45,
    averagePathLength: 2.3,
    centralityScores: {
      betweenness: { '2': 0.8 },
      closeness: { '1': 0.7 },
    },
    clusters: 3,
  },
};

// Mock fetch function that responds based on URL patterns
export const createMockFetch = (customResponses = {}) => {
  return jest.fn((url, options) => {
    const method = options?.method || 'GET';
    
    // Merge custom responses with defaults
    const responses = { ...mockApiResponses, ...customResponses };
    
    // Dashboard endpoints
    if (url.includes('/dashboard') && method === 'GET') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(responses.dashboard),
      });
    }
    
    // Sponsors endpoints
    if (url.includes('/sponsors')) {
      if (method === 'GET') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(responses.sponsors),
        });
      }
      if (method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: '3',
            ...responses.sponsors[0],
            name: 'New Sponsor',
          }),
        });
      }
      if (method === 'PUT' || method === 'DELETE') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      }
    }
    
    // Grants endpoints
    if (url.includes('/grants')) {
      if (method === 'GET') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(responses.grants),
        });
      }
      if (method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: '3',
            ...responses.grants[0],
            title: 'New Grant',
          }),
        });
      }
      if (method === 'PUT' || method === 'DELETE') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      }
    }
    
    // Relationships endpoints
    if (url.includes('/relationships/graph')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(responses.relationships),
      });
    }
    
    if (url.includes('/relationships/path')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(responses.pathDiscovery),
      });
    }
    
    if (url.includes('/relationships/analytics')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(responses.networkAnalytics),
      });
    }
    
    // Authentication endpoints
    if (url.includes('/auth/login')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          user: defaultAuthContext.user,
          token: 'mock-jwt-token',
        }),
      });
    }
    
    if (url.includes('/auth/me')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(defaultAuthContext.user),
      });
    }
    
    // Default success response
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
    });
  });
};

// Mock error responses for testing error states
export const createMockErrorFetch = (errorCode = 500, errorMessage = 'Server error') => {
  return jest.fn(() =>
    Promise.resolve({
      ok: false,
      status: errorCode,
      json: () => Promise.resolve({ message: errorMessage }),
    })
  );
};

// Mock network error for testing connectivity issues
export const createMockNetworkErrorFetch = () => {
  return jest.fn(() => Promise.reject(new Error('Network error')));
};

// Helper function to wait for loading states to complete
export const waitForLoadingToFinish = async (getByText) => {
  const { waitForElementToBeRemoved } = await import('@testing-library/react');
  
  try {
    await waitForElementToBeRemoved(() => getByText(/loading/i), {
      timeout: 5000,
    });
  } catch (error) {
    // Loading element might not exist or might have finished already
  }
};

// Helper function to simulate user interactions
export const userActions = {
  fillForm: async (user, fields) => {
    for (const [field, value] of Object.entries(fields)) {
      const input = screen.getByLabelText(new RegExp(field, 'i'));
      await user.clear(input);
      await user.type(input, value);
    }
  },
  
  selectOption: async (user, labelPattern, value) => {
    const select = screen.getByLabelText(new RegExp(labelPattern, 'i'));
    await user.selectOptions(select, value);
  },
  
  clickButton: async (user, buttonPattern) => {
    const button = screen.getByRole('button', { name: new RegExp(buttonPattern, 'i') });
    await user.click(button);
  },
  
  typeInInput: async (user, placeholderPattern, value) => {
    const input = screen.getByPlaceholderText(new RegExp(placeholderPattern, 'i'));
    await user.clear(input);
    await user.type(input, value);
  },
};

// Test data generators
export const generateTestData = {
  sponsors: (count = 5) => Array.from({ length: count }, (_, i) => ({
    id: `sponsor-${i + 1}`,
    name: `Test Sponsor ${i + 1}`,
    type: i % 2 === 0 ? 'Foundation' : 'Corporate',
    tier: ['Primary', 'Secondary', 'Tertiary'][i % 3],
    status: 'Active',
    relationshipManager: `Manager ${i + 1}`,
    lastContact: '2024-01-15',
    activeGrants: Math.floor(Math.random() * 5),
    totalFunding: (i + 1) * 100000,
    relationshipScore: 50 + Math.floor(Math.random() * 50),
    email: `sponsor${i + 1}@example.com`,
    phone: `+1-555-010${i + 1}`,
    address: `${i + 1}23 Test St, City, State 12345`,
  })),
  
  grants: (count = 5) => Array.from({ length: count }, (_, i) => ({
    id: `grant-${i + 1}`,
    title: `Test Grant ${i + 1}`,
    description: `Description for test grant ${i + 1}`,
    amount: (i + 1) * 50000,
    status: ['Draft', 'Submitted', 'Approved', 'Rejected'][i % 4],
    priority: ['High', 'Medium', 'Low'][i % 3],
    sponsor: `Sponsor ${i + 1}`,
    submissionDeadline: '2024-03-15',
    submissionDate: i % 2 === 0 ? '2024-03-10' : null,
    createdAt: '2024-01-15',
    phase: ['Planning', 'Development', 'Review', 'Implementation'][i % 4],
    progressPercentage: (i + 1) * 20,
  })),
  
  relationships: (nodeCount = 5, linkCount = 3) => ({
    nodes: Array.from({ length: nodeCount }, (_, i) => ({
      id: `node-${i + 1}`,
      name: `Entity ${i + 1}`,
      type: i % 2 === 0 ? 'person' : 'organization',
      position: { lat: 40 + Math.random(), lng: -74 + Math.random() },
      strength: Math.random(),
      tier: ['primary', 'secondary', 'tertiary'][i % 3],
    })),
    links: Array.from({ length: linkCount }, (_, i) => ({
      source: `node-${i + 1}`,
      target: `node-${Math.min(i + 2, nodeCount)}`,
      strength: Math.random(),
      type: ['employment', 'professional', 'personal'][i % 3],
      confidence: Math.random(),
    })),
  }),
};

// Custom matchers for better assertions
export const customMatchers = {
  toHaveLoadingState: (element) => ({
    pass: element.textContent.includes('loading') || element.hasAttribute('aria-busy'),
    message: () => 'Expected element to have loading state',
  }),
  
  toHaveErrorState: (element) => ({
    pass: element.textContent.includes('error') || element.hasAttribute('aria-invalid'),
    message: () => 'Expected element to have error state',
  }),
  
  toBeAccessible: (element) => ({
    pass: element.hasAttribute('aria-label') || element.hasAttribute('aria-labelledby'),
    message: () => 'Expected element to have accessibility attributes',
  }),
};

// Performance testing utilities
export const performanceHelpers = {
  measureRenderTime: (renderFunction) => {
    const start = performance.now();
    const result = renderFunction();
    const end = performance.now();
    return { result, renderTime: end - start };
  },
  
  simulateSlowNetwork: () => {
    global.fetch = jest.fn(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve(mockApiResponses.dashboard),
        }), 2000)
      )
    );
  },
  
  simulateMemoryPressure: () => {
    // Simulate high memory usage scenario
    return {
      ...defaultResourceContext,
      resourceUsage: { memory: 95, cpu: 85 },
      isFeatureEnabled: (feature) => !['relationship_mapping', 'advanced_analytics'].includes(feature),
    };
  },
};

export default {
  renderWithProviders,
  mockApiResponses,
  createMockFetch,
  createMockErrorFetch,
  createMockNetworkErrorFetch,
  waitForLoadingToFinish,
  userActions,
  generateTestData,
  customMatchers,
  performanceHelpers,
};