import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import GrantManagement from '../client/src/pages/Grants';
import { TenantContext } from '../client/src/contexts/TenantContext';
import { AuthContext } from '../client/src/contexts/AuthContext';
import { ThemeProvider } from '../client/src/contexts/ThemeContext';

// Mock date-fns for consistent date testing
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    if (formatStr === 'MMM dd, yyyy') return 'Jan 15, 2024';
    if (formatStr === 'yyyy-MM-dd') return '2024-01-15';
    return '2024-01-15';
  }),
  addDays: jest.fn((date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000)),
  differenceInDays: jest.fn(() => 45),
  parseISO: jest.fn((str) => new Date(str)),
  isAfter: jest.fn(() => false),
  isBefore: jest.fn(() => true),
}));

// Mock shadcn/ui components
jest.mock('../client/src/components/ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange }) => (
    <div data-testid="tabs" data-value={value}>
      {children}
    </div>
  ),
  TabsList: ({ children }) => <div data-testid="tabs-list">{children}</div>,
  TabsTrigger: ({ children, value, onClick }) => (
    <button onClick={onClick} data-value={value} data-testid="tab-trigger">
      {children}
    </button>
  ),
  TabsContent: ({ children, value }) => (
    <div data-testid="tab-content" data-value={value}>
      {children}
    </div>
  ),
}));

jest.mock('../client/src/components/ui/progress', () => ({
  Progress: ({ value, className }) => (
    <div data-testid="progress" data-value={value} className={className}>
      <div style={{ width: `${value}%` }} />
    </div>
  ),
}));

jest.mock('../client/src/components/ui/calendar', () => ({
  Calendar: ({ selected, onSelect, ...props }) => (
    <div 
      data-testid="calendar" 
      onClick={() => onSelect?.(new Date('2024-03-15'))}
      {...props}
    />
  ),
}));

describe('GrantManagement Component', () => {
  let queryClient;
  let mockTenantContext;
  let mockAuthContext;
  let user;

  const mockGrants = [
    {
      id: '1',
      title: 'Community Development Grant',
      description: 'Supporting local community initiatives and development programs',
      amount: 150000,
      status: 'Draft',
      priority: 'High',
      sponsor: 'Foundation Alpha',
      submissionDeadline: '2024-03-15',
      submissionDate: null,
      createdAt: '2024-01-15',
      phase: 'Planning',
      progressPercentage: 25,
      milestones: [
        {
          id: '1',
          title: '90-Day Milestone',
          description: 'Initial research and stakeholder mapping',
          dueDate: '2024-01-20',
          status: 'Completed',
          type: '90-day',
        },
        {
          id: '2',
          title: '60-Day Milestone',
          description: 'Draft proposal development',
          dueDate: '2024-02-15',
          status: 'In Progress',
          type: '60-day',
        },
        {
          id: '3',
          title: '30-Day Milestone',
          description: 'Final review and submission preparation',
          dueDate: '2024-03-01',
          status: 'Pending',
          type: '30-day',
        },
      ],
      tasks: [
        {
          id: '1',
          title: 'Complete needs assessment',
          description: 'Conduct comprehensive community needs analysis',
          assignee: 'John Smith',
          dueDate: '2024-01-25',
          status: 'Completed',
          estimatedHours: 16,
          milestone: '90-day',
        },
        {
          id: '2',
          title: 'Draft project narrative',
          description: 'Write initial project narrative and objectives',
          assignee: 'Sarah Johnson',
          dueDate: '2024-02-10',
          status: 'In Progress',
          estimatedHours: 24,
          milestone: '60-day',
        },
      ],
    },
    {
      id: '2',
      title: 'Education Innovation Grant',
      description: 'Technology integration in educational programs',
      amount: 75000,
      status: 'Submitted',
      priority: 'Medium',
      sponsor: 'Corporate Beta',
      submissionDeadline: '2024-02-28',
      submissionDate: '2024-02-25',
      createdAt: '2024-01-10',
      phase: 'Review',
      progressPercentage: 85,
      milestones: [
        {
          id: '4',
          title: '90-Day Milestone',
          description: 'Technology assessment and requirements gathering',
          dueDate: '2024-01-15',
          status: 'Completed',
          type: '90-day',
        },
        {
          id: '5',
          title: '60-Day Milestone',
          description: 'Proposal writing and budget development',
          dueDate: '2024-02-10',
          status: 'Completed',
          type: '60-day',
        },
        {
          id: '6',
          title: '30-Day Milestone',
          description: 'Final submission and documentation',
          dueDate: '2024-02-25',
          status: 'Completed',
          type: '30-day',
        },
      ],
      tasks: [],
    },
    {
      id: '3',
      title: 'Healthcare Access Initiative',
      description: 'Improving healthcare access in underserved communities',
      amount: 200000,
      status: 'Approved',
      priority: 'High',
      sponsor: 'Family Foundation Gamma',
      submissionDeadline: '2024-01-31',
      submissionDate: '2024-01-28',
      createdAt: '2023-12-15',
      phase: 'Implementation',
      progressPercentage: 100,
      milestones: [],
      tasks: [],
    },
  ];

  beforeEach(() => {
    user = userEvent.setup();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mockTenantContext = {
      currentTenant: {
        id: 'test-tenant',
        name: 'Test Organization',
      },
      selectedTenant: 'test-tenant',
    };

    mockAuthContext = {
      user: {
        id: 'test-user',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      },
      isAuthenticated: true,
    };

    // Mock API responses
    global.fetch = jest.fn((url) => {
      if (url.includes('/grants')) {
        if (url.includes('POST')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              id: '4',
              ...mockGrants[0],
              title: 'New Grant',
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockGrants),
        });
      }
      if (url.includes('/grants/timeline')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            milestones: mockGrants[0].milestones,
            criticalPath: ['1', '2', '3'],
            riskAssessment: 'Low',
            successProbability: 85,
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderWithProviders = (component) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthContext.Provider value={mockAuthContext}>
            <TenantContext.Provider value={mockTenantContext}>
              {component}
            </TenantContext.Provider>
          </AuthContext.Provider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  };

  describe('Initial Render', () => {
    test('renders grant management page header', async () => {
      renderWithProviders(<GrantManagement />);

      expect(screen.getByText(/grant management/i)).toBeInTheDocument();
      expect(screen.getByText(/track grant applications and timelines/i)).toBeInTheDocument();
    });

    test('displays tab navigation', () => {
      renderWithProviders(<GrantManagement />);

      expect(screen.getByTestId('tabs')).toBeInTheDocument();
      expect(screen.getByText(/active grants/i)).toBeInTheDocument();
      expect(screen.getByText(/submitted/i)).toBeInTheDocument();
      expect(screen.getByText(/completed/i)).toBeInTheDocument();
    });

    test('shows create grant button', () => {
      renderWithProviders(<GrantManagement />);

      expect(screen.getByRole('button', { name: /create grant/i })).toBeInTheDocument();
    });

    test('displays loading state while fetching grants', () => {
      global.fetch = jest.fn(() => new Promise(() => {})); // Never resolves

      renderWithProviders(<GrantManagement />);

      expect(screen.getByText(/loading grants/i)).toBeInTheDocument();
    });
  });

  describe('Grant List Display', () => {
    test('displays grants in active tab by default', async () => {
      renderWithProviders(<GrantManagement />);

      await waitFor(() => {
        expect(screen.getByText('Community Development Grant')).toBeInTheDocument();
        expect(screen.queryByText('Education Innovation Grant')).not.toBeInTheDocument(); // Submitted status
      });
    });

    test('shows grant information correctly', async () => {
      renderWithProviders(<GrantManagement />);

      await waitFor(() => {
        expect(screen.getByText('Community Development Grant')).toBeInTheDocument();
        expect(screen.getByText('$150,000')).toBeInTheDocument();
        expect(screen.getByText('Foundation Alpha')).toBeInTheDocument();
        expect(screen.getByText('High')).toBeInTheDocument();
        expect(screen.getByText('Draft')).toBeInTheDocument();
      });
    });

    test('displays progress indicators', async () => {
      renderWithProviders(<GrantManagement />);

      await waitFor(() => {
        const progressBars = screen.getAllByTestId('progress');
        expect(progressBars[0]).toHaveAttribute('data-value', '25');
      });
    });

    test('switches to submitted tab', async () => {
      renderWithProviders(<GrantManagement />);

      const submittedTab = screen.getByText(/submitted/i);
      await user.click(submittedTab);

      await waitFor(() => {
        expect(screen.getByText('Education Innovation Grant')).toBeInTheDocument();
        expect(screen.queryByText('Community Development Grant')).not.toBeInTheDocument();
      });
    });

    test('switches to completed tab', async () => {
      renderWithProviders(<GrantManagement />);

      const completedTab = screen.getByText(/completed/i);
      await user.click(completedTab);

      await waitFor(() => {
        expect(screen.getByText('Healthcare Access Initiative')).toBeInTheDocument();
        expect(screen.queryByText('Community Development Grant')).not.toBeInTheDocument();
      });
    });
  });

  describe('Grant Creation Form', () => {
    test('opens grant creation modal', async () => {
      renderWithProviders(<GrantManagement />);

      const createButton = screen.getByRole('button', { name: /create grant/i });
      await user.click(createButton);

      expect(screen.getByTestId('dialog')).toBeInTheDocument();
      expect(screen.getByText(/create new grant/i)).toBeInTheDocument();
    });

    test('renders all form fields', async () => {
      renderWithProviders(<GrantManagement />);

      const createButton = screen.getByRole('button', { name: /create grant/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/grant title/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/funding amount/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/sponsor/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/submission deadline/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
      });
    });

    test('validates required fields', async () => {
      renderWithProviders(<GrantManagement />);

      const createButton = screen.getByRole('button', { name: /create grant/i });
      await user.click(createButton);

      const saveButton = screen.getByRole('button', { name: /create grant/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/title is required/i)).toBeInTheDocument();
        expect(screen.getByText(/amount is required/i)).toBeInTheDocument();
        expect(screen.getByText(/deadline is required/i)).toBeInTheDocument();
      });
    });

    test('validates funding amount format', async () => {
      renderWithProviders(<GrantManagement />);

      const createButton = screen.getByRole('button', { name: /create grant/i });
      await user.click(createButton);

      const amountInput = screen.getByLabelText(/funding amount/i);
      await user.type(amountInput, 'invalid-amount');

      const saveButton = screen.getByRole('button', { name: /create grant/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid amount format/i)).toBeInTheDocument();
      });
    });

    test('submits form with valid data', async () => {
      renderWithProviders(<GrantManagement />);

      const createButton = screen.getByRole('button', { name: /create grant/i });
      await user.click(createButton);

      await waitFor(() => {
        const titleInput = screen.getByLabelText(/grant title/i);
        const amountInput = screen.getByLabelText(/funding amount/i);
        const deadlineInput = screen.getByLabelText(/submission deadline/i);
        
        user.type(titleInput, 'New Innovation Grant');
        user.type(amountInput, '100000');
        user.click(deadlineInput);
      });

      const calendar = screen.getByTestId('calendar');
      await user.click(calendar);

      const saveButton = screen.getByRole('button', { name: /create grant/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/grants'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('New Innovation Grant'),
          })
        );
      });
    });
  });

  describe('Grant Timeline View', () => {
    test('displays grant timeline when grant clicked', async () => {
      renderWithProviders(<GrantManagement />);

      await waitFor(() => {
        const grantCard = screen.getByText('Community Development Grant');
        user.click(grantCard);
      });

      await waitFor(() => {
        expect(screen.getByText(/grant timeline/i)).toBeInTheDocument();
        expect(screen.getByText(/90-day milestone/i)).toBeInTheDocument();
        expect(screen.getByText(/60-day milestone/i)).toBeInTheDocument();
        expect(screen.getByText(/30-day milestone/i)).toBeInTheDocument();
      });
    });

    test('shows milestone status indicators', async () => {
      renderWithProviders(<GrantManagement />);

      await waitFor(() => {
        const grantCard = screen.getByText('Community Development Grant');
        user.click(grantCard);
      });

      await waitFor(() => {
        expect(screen.getByText(/completed/i)).toBeInTheDocument();
        expect(screen.getByText(/in progress/i)).toBeInTheDocument();
        expect(screen.getByText(/pending/i)).toBeInTheDocument();
      });
    });

    test('displays milestone descriptions and due dates', async () => {
      renderWithProviders(<GrantManagement />);

      await waitFor(() => {
        const grantCard = screen.getByText('Community Development Grant');
        user.click(grantCard);
      });

      await waitFor(() => {
        expect(screen.getByText(/initial research and stakeholder mapping/i)).toBeInTheDocument();
        expect(screen.getByText(/draft proposal development/i)).toBeInTheDocument();
        expect(screen.getByText(/final review and submission preparation/i)).toBeInTheDocument();
      });
    });

    test('shows task management section', async () => {
      renderWithProviders(<GrantManagement />);

      await waitFor(() => {
        const grantCard = screen.getByText('Community Development Grant');
        user.click(grantCard);
      });

      await waitFor(() => {
        expect(screen.getByText(/tasks/i)).toBeInTheDocument();
        expect(screen.getByText(/complete needs assessment/i)).toBeInTheDocument();
        expect(screen.getByText(/draft project narrative/i)).toBeInTheDocument();
      });
    });

    test('displays task assignees and due dates', async () => {
      renderWithProviders(<GrantManagement />);

      await waitFor(() => {
        const grantCard = screen.getByText('Community Development Grant');
        user.click(grantCard);
      });

      await waitFor(() => {
        expect(screen.getByText(/john smith/i)).toBeInTheDocument();
        expect(screen.getByText(/sarah johnson/i)).toBeInTheDocument();
        expect(screen.getByText(/16 hours/i)).toBeInTheDocument();
        expect(screen.getByText(/24 hours/i)).toBeInTheDocument();
      });
    });
  });

  describe('Backwards Planning', () => {
    test('generates milestones based on submission deadline', async () => {
      renderWithProviders(<GrantManagement />);

      const createButton = screen.getByRole('button', { name: /create grant/i });
      await user.click(createButton);

      await waitFor(() => {
        const deadlineInput = screen.getByLabelText(/submission deadline/i);
        user.click(deadlineInput);
      });

      const calendar = screen.getByTestId('calendar');
      await user.click(calendar);

      await waitFor(() => {
        expect(screen.getByText(/auto-generate timeline/i)).toBeInTheDocument();
      });

      const generateButton = screen.getByRole('button', { name: /generate timeline/i });
      await user.click(generateButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/grants/timeline'),
          expect.objectContaining({
            method: 'POST',
          })
        );
      });
    });

    test('displays generated timeline preview', async () => {
      renderWithProviders(<GrantManagement />);

      // Mock timeline generation response
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            milestones: [
              { type: '90-day', date: '2024-01-15', title: 'Research Phase' },
              { type: '60-day', date: '2024-02-15', title: 'Draft Phase' },
              { type: '30-day', date: '2024-03-01', title: 'Review Phase' },
            ],
            criticalPath: ['research', 'draft', 'review'],
            riskAssessment: 'Medium',
            successProbability: 78,
          }),
        })
      );

      const createButton = screen.getByRole('button', { name: /create grant/i });
      await user.click(createButton);

      const generateButton = screen.getByRole('button', { name: /generate timeline/i });
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/research phase/i)).toBeInTheDocument();
        expect(screen.getByText(/draft phase/i)).toBeInTheDocument();
        expect(screen.getByText(/review phase/i)).toBeInTheDocument();
        expect(screen.getByText(/success probability: 78%/i)).toBeInTheDocument();
      });
    });

    test('shows risk assessment and recommendations', async () => {
      renderWithProviders(<GrantManagement />);

      await waitFor(() => {
        const grantCard = screen.getByText('Community Development Grant');
        user.click(grantCard);
      });

      await waitFor(() => {
        expect(screen.getByText(/risk assessment/i)).toBeInTheDocument();
        expect(screen.getByText(/critical path/i)).toBeInTheDocument();
        expect(screen.getByText(/success probability/i)).toBeInTheDocument();
      });
    });
  });

  describe('Task Management', () => {
    test('adds new task to milestone', async () => {
      renderWithProviders(<GrantManagement />);

      await waitFor(() => {
        const grantCard = screen.getByText('Community Development Grant');
        user.click(grantCard);
      });

      await waitFor(() => {
        const addTaskButton = screen.getByRole('button', { name: /add task/i });
        user.click(addTaskButton);
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/task title/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/assignee/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/due date/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/estimated hours/i)).toBeInTheDocument();
      });
    });

    test('marks task as completed', async () => {
      renderWithProviders(<GrantManagement />);

      await waitFor(() => {
        const grantCard = screen.getByText('Community Development Grant');
        user.click(grantCard);
      });

      await waitFor(() => {
        const taskCheckbox = screen.getAllByRole('checkbox')[0];
        user.click(taskCheckbox);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/tasks/1'),
          expect.objectContaining({
            method: 'PUT',
            body: expect.stringContaining('Completed'),
          })
        );
      });
    });

    test('updates milestone progress based on task completion', async () => {
      renderWithProviders(<GrantManagement />);

      await waitFor(() => {
        const grantCard = screen.getByText('Community Development Grant');
        user.click(grantCard);
      });

      await waitFor(() => {
        const progressBars = screen.getAllByTestId('progress');
        expect(progressBars.some(bar => bar.getAttribute('data-value') === '100')).toBe(true); // 90-day milestone completed
      });
    });
  });

  describe('Search and Filtering', () => {
    test('filters grants by search term', async () => {
      renderWithProviders(<GrantManagement />);

      const searchInput = screen.getByPlaceholderText(/search grants/i);
      await user.type(searchInput, 'Community');

      await waitFor(() => {
        expect(screen.getByText('Community Development Grant')).toBeInTheDocument();
        expect(screen.queryByText('Education Innovation Grant')).not.toBeInTheDocument();
      });
    });

    test('filters grants by priority', async () => {
      renderWithProviders(<GrantManagement />);

      const priorityFilter = screen.getByLabelText(/priority filter/i);
      await user.selectOptions(priorityFilter, 'High');

      await waitFor(() => {
        expect(screen.getByText('Community Development Grant')).toBeInTheDocument();
        expect(screen.queryByText('Education Innovation Grant')).not.toBeInTheDocument();
      });
    });

    test('filters grants by sponsor', async () => {
      renderWithProviders(<GrantManagement />);

      const sponsorFilter = screen.getByLabelText(/sponsor filter/i);
      await user.selectOptions(sponsorFilter, 'Foundation Alpha');

      await waitFor(() => {
        expect(screen.getByText('Community Development Grant')).toBeInTheDocument();
        expect(screen.queryByText('Education Innovation Grant')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('displays error message when API fails', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ message: 'Server error' }),
        })
      );

      renderWithProviders(<GrantManagement />);

      await waitFor(() => {
        expect(screen.getByText(/error loading grants/i)).toBeInTheDocument();
      });
    });

    test('handles form submission errors', async () => {
      global.fetch = jest.fn((url) => {
        if (url.includes('POST')) {
          return Promise.resolve({
            ok: false,
            status: 400,
            json: () => Promise.resolve({ message: 'Validation error' }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockGrants),
        });
      });

      renderWithProviders(<GrantManagement />);

      const createButton = screen.getByRole('button', { name: /create grant/i });
      await user.click(createButton);

      await waitFor(() => {
        const titleInput = screen.getByLabelText(/grant title/i);
        user.type(titleInput, 'Test Grant');
      });

      const saveButton = screen.getByRole('button', { name: /create grant/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/validation error/i)).toBeInTheDocument();
      });
    });

    test('shows retry button on error', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ message: 'Server error' }),
        })
      );

      renderWithProviders(<GrantManagement />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    test('implements proper ARIA labels', () => {
      renderWithProviders(<GrantManagement />);

      expect(screen.getByRole('tablist')).toHaveAttribute('aria-label', 'Grant status tabs');
      expect(screen.getByRole('button', { name: /create grant/i })).toHaveAttribute('aria-label');
    });

    test('supports keyboard navigation', async () => {
      renderWithProviders(<GrantManagement />);

      const createButton = screen.getByRole('button', { name: /create grant/i });
      createButton.focus();
      expect(createButton).toHaveFocus();

      await user.keyboard('{Tab}');
      const searchInput = screen.getByPlaceholderText(/search grants/i);
      expect(searchInput).toHaveFocus();
    });

    test('provides screen reader announcements', async () => {
      renderWithProviders(<GrantManagement />);

      await waitFor(() => {
        expect(screen.getByText(/3 grants found/i)).toHaveAttribute('aria-live', 'polite');
      });
    });

    test('has proper heading hierarchy', async () => {
      renderWithProviders(<GrantManagement />);

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/grant management/i);
      
      await waitFor(() => {
        const grantCard = screen.getByText('Community Development Grant');
        user.click(grantCard);
      });

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(/grant timeline/i);
      });
    });
  });

  describe('Performance', () => {
    test('handles large grant datasets efficiently', async () => {
      const largeGrantList = Array.from({ length: 100 }, (_, i) => ({
        ...mockGrants[0],
        id: `grant-${i}`,
        title: `Grant ${i}`,
      }));

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(largeGrantList),
        })
      );

      renderWithProviders(<GrantManagement />);

      await waitFor(() => {
        expect(screen.getByText(/100 grants found/i)).toBeInTheDocument();
      });
    });

    test('implements virtual scrolling for large lists', async () => {
      renderWithProviders(<GrantManagement />);

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-grant-list')).toBeInTheDocument();
      });
    });
  });

  describe('Export Functionality', () => {
    test('exports grant data to CSV', async () => {
      const mockBlob = new Blob(['mock csv data'], { type: 'text/csv' });
      global.URL.createObjectURL = jest.fn(() => 'mock-url');
      global.URL.revokeObjectURL = jest.fn();

      renderWithProviders(<GrantManagement />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      await user.click(exportButton);

      const csvOption = screen.getByText(/export as csv/i);
      await user.click(csvOption);

      expect(global.URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    });

    test('exports timeline to PDF', async () => {
      renderWithProviders(<GrantManagement />);

      await waitFor(() => {
        const grantCard = screen.getByText('Community Development Grant');
        user.click(grantCard);
      });

      const exportButton = screen.getByRole('button', { name: /export timeline/i });
      await user.click(exportButton);

      const pdfOption = screen.getByText(/export as pdf/i);
      await user.click(pdfOption);

      // Verify PDF export functionality
      expect(screen.getByText(/generating pdf/i)).toBeInTheDocument();
    });
  });
});