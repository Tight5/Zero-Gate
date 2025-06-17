import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from '../client/src/pages/Dashboard';
import { useAuth } from '../client/src/hooks/useAuth';

// Mock the useAuth hook
jest.mock('../client/src/hooks/useAuth');

// Mock the API request function
jest.mock('../client/src/lib/queryClient', () => ({
  apiRequest: jest.fn(),
}));

// Mock Chart components to avoid canvas issues in tests
jest.mock('recharts', () => ({
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
}));

describe('Dashboard Component', () => {
  let queryClient;
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // Mock successful authentication
    useAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      isAuthenticated: true,
    });

    // Mock fetch to return dashboard data
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
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
        }),
      })
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderWithProviders = (component) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  test('renders dashboard header with user welcome message', async () => {
    renderWithProviders(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText(/Welcome back, Test/i)).toBeInTheDocument();
    });
  });

  test('displays KPI cards with correct metrics', async () => {
    renderWithProviders(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('25')).toBeInTheDocument(); // Sponsors count
      expect(screen.getByText('12')).toBeInTheDocument(); // Grants count
      expect(screen.getByText('150')).toBeInTheDocument(); // Relationships count
      expect(screen.getByText('$2.5M')).toBeInTheDocument(); // Total funding
    });
  });

  test('displays recent sponsors list', async () => {
    renderWithProviders(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Foundation A')).toBeInTheDocument();
      expect(screen.getByText('Corporation B')).toBeInTheDocument();
      expect(screen.getByText('Foundation')).toBeInTheDocument();
      expect(screen.getByText('Corporate')).toBeInTheDocument();
    });
  });

  test('displays recent grants with status and amounts', async () => {
    renderWithProviders(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Community Grant')).toBeInTheDocument();
      expect(screen.getByText('Education Grant')).toBeInTheDocument();
      expect(screen.getByText('$50,000')).toBeInTheDocument();
      expect(screen.getByText('$75,000')).toBeInTheDocument();
    });
  });

  test('renders grant status distribution chart', async () => {
    renderWithProviders(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
      expect(screen.getByText('Grant Status Distribution')).toBeInTheDocument();
    });
  });

  test('renders monthly funding trend chart', async () => {
    renderWithProviders(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      expect(screen.getByText('Funding Trends')).toBeInTheDocument();
    });
  });

  test('displays loading state while fetching data', () => {
    // Mock loading state
    global.fetch = jest.fn(() => new Promise(() => {})); // Never resolves

    renderWithProviders(<Dashboard />);
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test('handles error state gracefully', async () => {
    // Mock API error
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ message: 'Server error' }),
      })
    );

    renderWithProviders(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText(/error loading dashboard/i)).toBeInTheDocument();
    });
  });

  test('displays system metrics section', async () => {
    renderWithProviders(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText(/system metrics/i)).toBeInTheDocument();
    });
  });

  test('shows quick action buttons', async () => {
    renderWithProviders(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText(/add sponsor/i)).toBeInTheDocument();
      expect(screen.getByText(/create grant/i)).toBeInTheDocument();
      expect(screen.getByText(/map relationships/i)).toBeInTheDocument();
    });
  });

  test('updates data when user changes tenant', async () => {
    const { rerender } = renderWithProviders(<Dashboard />);
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('25')).toBeInTheDocument();
    });

    // Mock different tenant data
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          sponsors: 15,
          grants: 8,
          relationships: 90,
          totalFunding: 1800000,
        }),
      })
    );

    // Simulate tenant change by re-rendering
    rerender(
      <QueryClientProvider client={queryClient}>
        <Dashboard />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('15')).toBeInTheDocument(); // Updated sponsors count
    });
  });

  test('navigation links work correctly', async () => {
    renderWithProviders(<Dashboard />);
    
    await waitFor(() => {
      const sponsorsLink = screen.getByRole('link', { name: /sponsors/i });
      const grantsLink = screen.getByRole('link', { name: /grants/i });
      const relationshipsLink = screen.getByRole('link', { name: /relationships/i });
      
      expect(sponsorsLink).toHaveAttribute('href', '/sponsors');
      expect(grantsLink).toHaveAttribute('href', '/grants');
      expect(relationshipsLink).toHaveAttribute('href', '/relationships');
    });
  });

  test('responsive design elements are present', async () => {
    renderWithProviders(<Dashboard />);
    
    await waitFor(() => {
      // Check for responsive container elements
      expect(screen.getAllByTestId('responsive-container')).toHaveLength(2);
    });
  });

  test('accessibility features are implemented', async () => {
    renderWithProviders(<Dashboard />);
    
    await waitFor(() => {
      // Check for proper headings hierarchy
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(4);
    });
  });
});