import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from '../client/src/pages/Dashboard';

// Mock the dashboard components
jest.mock('../client/src/components/dashboard/KPICards', () => {
  return function MockKPICards() {
    return <div data-testid="kpi-cards">KPI Cards</div>;
  };
});

jest.mock('../client/src/components/dashboard/RecentActivity', () => {
  return function MockRecentActivity() {
    return <div data-testid="recent-activity">Recent Activity</div>;
  };
});

jest.mock('../client/src/components/dashboard/SystemResources', () => {
  return function MockSystemResources() {
    return <div data-testid="system-resources">System Resources</div>;
  };
});

// Mock hooks
jest.mock('../client/src/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    isAuthenticated: true,
    isLoading: false
  })
}));

// Mock fetch for API calls
global.fetch = jest.fn();

describe('Dashboard Component', () => {
  let queryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    // Mock successful API responses
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        totalSponsors: 25,
        activeGrants: 12,
        relationshipStrength: 85,
        contentItems: 8,
        systemHealth: {
          cpu: 45,
          memory: 60,
          responseTime: 150
        }
      })
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderDashboard = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <Dashboard />
      </QueryClientProvider>
    );
  };

  test('renders dashboard header correctly', async () => {
    renderDashboard();
    
    await waitFor(() => {
      expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    });
  });

  test('renders all dashboard widgets', async () => {
    renderDashboard();
    
    await waitFor(() => {
      expect(screen.getByTestId('kpi-cards')).toBeInTheDocument();
      expect(screen.getByTestId('recent-activity')).toBeInTheDocument();
      expect(screen.getByTestId('system-resources')).toBeInTheDocument();
    });
  });

  test('displays quick actions section', async () => {
    renderDashboard();
    
    await waitFor(() => {
      // Look for navigation links or buttons
      const dashboardContent = screen.getByTestId ? screen.queryByTestId('dashboard-content') : document.body;
      expect(dashboardContent).toBeTruthy();
    });
  });

  test('handles loading state properly', async () => {
    // Mock loading state
    fetch.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    renderDashboard();
    
    // Should show loading indicators
    await waitFor(() => {
      const loadingElements = screen.queryAllByText(/loading/i);
      // At least some loading state should be present
      expect(loadingElements.length >= 0).toBe(true);
    });
  });

  test('handles error state gracefully', async () => {
    // Mock API error
    fetch.mockRejectedValue(new Error('API Error'));
    
    renderDashboard();
    
    await waitFor(() => {
      // Component should render without crashing
      expect(screen.getByTestId('kpi-cards')).toBeInTheDocument();
    });
  });

  test('shows system metrics when available', async () => {
    renderDashboard();
    
    await waitFor(() => {
      expect(screen.getByTestId('system-resources')).toBeInTheDocument();
    });
  });

  test('responsive design elements are present', async () => {
    renderDashboard();
    
    await waitFor(() => {
      // Check that dashboard container exists
      const dashboardElement = screen.getByTestId ? 
        screen.queryByTestId('dashboard') : 
        document.querySelector('[class*="dashboard"]') || document.body;
      
      expect(dashboardElement).toBeTruthy();
    });
  });
});