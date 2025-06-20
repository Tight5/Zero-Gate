import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SponsorManagement from '../client/src/pages/Sponsors';
import { TenantContext } from '../client/src/contexts/TenantContext';
import { AuthContext } from '../client/src/contexts/AuthContext';
import { ThemeProvider } from '../client/src/contexts/ThemeContext';

// Mock shadcn/ui components
jest.mock('../client/src/components/ui/dialog', () => ({
  Dialog: ({ children, open }) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }) => <h2 data-testid="dialog-title">{children}</h2>,
  DialogTrigger: ({ children, asChild }) => <div data-testid="dialog-trigger">{children}</div>,
}));

jest.mock('../client/src/components/ui/button', () => ({
  Button: ({ children, onClick, variant, disabled, ...props }) => (
    <button 
      onClick={onClick} 
      disabled={disabled}
      data-variant={variant} 
      {...props}
    >
      {children}
    </button>
  ),
}));

jest.mock('../client/src/components/ui/input', () => ({
  Input: ({ value, onChange, ...props }) => (
    <input 
      value={value} 
      onChange={(e) => onChange?.(e)} 
      {...props} 
    />
  ),
}));

jest.mock('../client/src/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }) => (
    <select 
      value={value} 
      onChange={(e) => onValueChange?.(e.target.value)}
      data-testid="select"
    >
      {children}
    </select>
  ),
  SelectContent: ({ children }) => <div>{children}</div>,
  SelectItem: ({ children, value }) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }) => <div>{children}</div>,
  SelectValue: ({ placeholder }) => <span>{placeholder}</span>,
}));

jest.mock('../client/src/components/ui/table', () => ({
  Table: ({ children }) => <table data-testid="sponsors-table">{children}</table>,
  TableBody: ({ children }) => <tbody>{children}</tbody>,
  TableCell: ({ children }) => <td>{children}</td>,
  TableHead: ({ children }) => <th>{children}</th>,
  TableHeader: ({ children }) => <thead>{children}</thead>,
  TableRow: ({ children }) => <tr>{children}</tr>,
}));

jest.mock('../client/src/components/ui/badge', () => ({
  Badge: ({ children, variant }) => (
    <span data-testid="badge" data-variant={variant}>{children}</span>
  ),
}));

jest.mock('../client/src/components/ui/card', () => ({
  Card: ({ children }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }) => <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children }) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }) => <h3 data-testid="card-title">{children}</h3>,
}));

describe('SponsorManagement Component', () => {
  let queryClient;
  let mockTenantContext;
  let mockAuthContext;
  let user;

  const mockSponsors = [
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
    {
      id: '3',
      name: 'Family Foundation Gamma',
      type: 'Family Foundation',
      tier: 'Tertiary',
      status: 'Inactive',
      relationshipManager: 'Mike Davis',
      lastContact: '2023-12-20',
      activeGrants: 0,
      totalFunding: 100000,
      relationshipScore: 45,
      email: 'info@familygamma.org',
      phone: '+1-555-0103',
      address: '789 Philanthropy Rd, Chicago, IL 60601',
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
      if (url.includes('/sponsors')) {
        if (url.includes('POST')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              id: '4',
              ...mockSponsors[0],
              name: 'New Sponsor',
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSponsors),
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
    test('renders sponsor management page header', async () => {
      renderWithProviders(<SponsorManagement />);

      expect(screen.getByText(/sponsor management/i)).toBeInTheDocument();
      expect(screen.getByText(/manage your sponsor relationships/i)).toBeInTheDocument();
    });

    test('displays add sponsor button', () => {
      renderWithProviders(<SponsorManagement />);

      expect(screen.getByRole('button', { name: /add sponsor/i })).toBeInTheDocument();
    });

    test('shows loading state while fetching sponsors', () => {
      global.fetch = jest.fn(() => new Promise(() => {})); // Never resolves

      renderWithProviders(<SponsorManagement />);

      expect(screen.getByText(/loading sponsors/i)).toBeInTheDocument();
    });

    test('displays empty state when no sponsors exist', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        })
      );

      renderWithProviders(<SponsorManagement />);

      await waitFor(() => {
        expect(screen.getByText(/no sponsors found/i)).toBeInTheDocument();
        expect(screen.getByText(/start by adding your first sponsor/i)).toBeInTheDocument();
      });
    });
  });

  describe('Sponsor List Display', () => {
    test('renders sponsors table with all sponsors', async () => {
      renderWithProviders(<SponsorManagement />);

      await waitFor(() => {
        expect(screen.getByTestId('sponsors-table')).toBeInTheDocument();
        expect(screen.getByText('Foundation Alpha')).toBeInTheDocument();
        expect(screen.getByText('Corporate Beta')).toBeInTheDocument();
        expect(screen.getByText('Family Foundation Gamma')).toBeInTheDocument();
      });
    });

    test('displays sponsor information correctly', async () => {
      renderWithProviders(<SponsorManagement />);

      await waitFor(() => {
        expect(screen.getByText('Foundation Alpha')).toBeInTheDocument();
        expect(screen.getByText('John Smith')).toBeInTheDocument();
        expect(screen.getByText('Primary')).toBeInTheDocument();
        expect(screen.getByText('Active')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument(); // Active grants
      });
    });

    test('shows relationship scores with visual indicators', async () => {
      renderWithProviders(<SponsorManagement />);

      await waitFor(() => {
        expect(screen.getByText('85')).toBeInTheDocument(); // Foundation Alpha score
        expect(screen.getByText('72')).toBeInTheDocument(); // Corporate Beta score
        expect(screen.getByText('45')).toBeInTheDocument(); // Family Foundation Gamma score
      });
    });

    test('displays status badges with correct variants', async () => {
      renderWithProviders(<SponsorManagement />);

      await waitFor(() => {
        const badges = screen.getAllByTestId('badge');
        expect(badges.some(badge => badge.textContent === 'Active')).toBe(true);
        expect(badges.some(badge => badge.textContent === 'Inactive')).toBe(true);
      });
    });
  });

  describe('Search and Filtering', () => {
    test('renders search input', () => {
      renderWithProviders(<SponsorManagement />);

      expect(screen.getByPlaceholderText(/search sponsors/i)).toBeInTheDocument();
    });

    test('filters sponsors by search term', async () => {
      renderWithProviders(<SponsorManagement />);

      await waitFor(() => {
        expect(screen.getByText('Foundation Alpha')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search sponsors/i);
      await user.type(searchInput, 'Foundation');

      await waitFor(() => {
        expect(screen.getByText('Foundation Alpha')).toBeInTheDocument();
        expect(screen.getByText('Family Foundation Gamma')).toBeInTheDocument();
        expect(screen.queryByText('Corporate Beta')).not.toBeInTheDocument();
      });
    });

    test('filters sponsors by status', async () => {
      renderWithProviders(<SponsorManagement />);

      await waitFor(() => {
        expect(screen.getByText('Foundation Alpha')).toBeInTheDocument();
      });

      const statusFilter = screen.getByTestId('select');
      await user.selectOptions(statusFilter, 'Active');

      await waitFor(() => {
        expect(screen.getByText('Foundation Alpha')).toBeInTheDocument();
        expect(screen.getByText('Corporate Beta')).toBeInTheDocument();
        expect(screen.queryByText('Family Foundation Gamma')).not.toBeInTheDocument();
      });
    });

    test('filters sponsors by tier', async () => {
      renderWithProviders(<SponsorManagement />);

      await waitFor(() => {
        expect(screen.getByText('Foundation Alpha')).toBeInTheDocument();
      });

      const tierFilter = screen.getByDisplayValue(/all tiers/i);
      await user.selectOptions(tierFilter, 'Primary');

      await waitFor(() => {
        expect(screen.getByText('Foundation Alpha')).toBeInTheDocument();
        expect(screen.queryByText('Corporate Beta')).not.toBeInTheDocument();
      });
    });

    test('clears search when input is emptied', async () => {
      renderWithProviders(<SponsorManagement />);

      const searchInput = screen.getByPlaceholderText(/search sponsors/i);
      await user.type(searchInput, 'Foundation');
      await user.clear(searchInput);

      await waitFor(() => {
        expect(screen.getByText('Foundation Alpha')).toBeInTheDocument();
        expect(screen.getByText('Corporate Beta')).toBeInTheDocument();
        expect(screen.getByText('Family Foundation Gamma')).toBeInTheDocument();
      });
    });
  });

  describe('Sponsor Form Modal', () => {
    test('opens add sponsor modal when button clicked', async () => {
      renderWithProviders(<SponsorManagement />);

      const addButton = screen.getByRole('button', { name: /add sponsor/i });
      await user.click(addButton);

      expect(screen.getByTestId('dialog')).toBeInTheDocument();
      expect(screen.getByTestId('dialog-title')).toHaveTextContent(/add new sponsor/i);
    });

    test('renders all form fields in modal', async () => {
      renderWithProviders(<SponsorManagement />);

      const addButton = screen.getByRole('button', { name: /add sponsor/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/sponsor name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/organization type/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/tier classification/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/address/i)).toBeInTheDocument();
      });
    });

    test('validates required fields', async () => {
      renderWithProviders(<SponsorManagement />);

      const addButton = screen.getByRole('button', { name: /add sponsor/i });
      await user.click(addButton);

      const saveButton = screen.getByRole('button', { name: /save sponsor/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/sponsor name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });
    });

    test('validates email format', async () => {
      renderWithProviders(<SponsorManagement />);

      const addButton = screen.getByRole('button', { name: /add sponsor/i });
      await user.click(addButton);

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'invalid-email');

      const saveButton = screen.getByRole('button', { name: /save sponsor/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
      });
    });

    test('submits form with valid data', async () => {
      renderWithProviders(<SponsorManagement />);

      const addButton = screen.getByRole('button', { name: /add sponsor/i });
      await user.click(addButton);

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/sponsor name/i);
        const emailInput = screen.getByLabelText(/email address/i);
        
        user.type(nameInput, 'New Foundation');
        user.type(emailInput, 'contact@newfoundation.org');
      });

      const saveButton = screen.getByRole('button', { name: /save sponsor/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/sponsors'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('New Foundation'),
          })
        );
      });
    });
  });

  describe('Sponsor Actions', () => {
    test('opens edit modal when sponsor row clicked', async () => {
      renderWithProviders(<SponsorManagement />);

      await waitFor(() => {
        const sponsorRow = screen.getByText('Foundation Alpha');
        user.click(sponsorRow);
      });

      await waitFor(() => {
        expect(screen.getByTestId('dialog')).toBeInTheDocument();
        expect(screen.getByTestId('dialog-title')).toHaveTextContent(/edit sponsor/i);
      });
    });

    test('pre-fills form with sponsor data in edit mode', async () => {
      renderWithProviders(<SponsorManagement />);

      await waitFor(() => {
        const sponsorRow = screen.getByText('Foundation Alpha');
        user.click(sponsorRow);
      });

      await waitFor(() => {
        expect(screen.getByDisplayValue('Foundation Alpha')).toBeInTheDocument();
        expect(screen.getByDisplayValue('contact@foundationalpha.org')).toBeInTheDocument();
      });
    });

    test('updates sponsor information', async () => {
      renderWithProviders(<SponsorManagement />);

      await waitFor(() => {
        const sponsorRow = screen.getByText('Foundation Alpha');
        user.click(sponsorRow);
      });

      await waitFor(() => {
        const nameInput = screen.getByDisplayValue('Foundation Alpha');
        user.clear(nameInput);
        user.type(nameInput, 'Updated Foundation Alpha');
      });

      const saveButton = screen.getByRole('button', { name: /save sponsor/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/sponsors/1'),
          expect.objectContaining({
            method: 'PUT',
            body: expect.stringContaining('Updated Foundation Alpha'),
          })
        );
      });
    });

    test('deletes sponsor when delete button clicked', async () => {
      global.confirm = jest.fn(() => true);

      renderWithProviders(<SponsorManagement />);

      await waitFor(() => {
        const deleteButton = screen.getAllByText(/delete/i)[0];
        user.click(deleteButton);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/sponsors/1'),
          expect.objectContaining({
            method: 'DELETE',
          })
        );
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

      renderWithProviders(<SponsorManagement />);

      await waitFor(() => {
        expect(screen.getByText(/error loading sponsors/i)).toBeInTheDocument();
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

      renderWithProviders(<SponsorManagement />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
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
          json: () => Promise.resolve(mockSponsors),
        });
      });

      renderWithProviders(<SponsorManagement />);

      const addButton = screen.getByRole('button', { name: /add sponsor/i });
      await user.click(addButton);

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/sponsor name/i);
        const emailInput = screen.getByLabelText(/email address/i);
        
        user.type(nameInput, 'Test Sponsor');
        user.type(emailInput, 'test@example.com');
      });

      const saveButton = screen.getByRole('button', { name: /save sponsor/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/validation error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Sorting', () => {
    test('sorts sponsors by name', async () => {
      renderWithProviders(<SponsorManagement />);

      await waitFor(() => {
        const nameHeader = screen.getByText(/sponsor name/i);
        user.click(nameHeader);
      });

      // Verify sponsors are sorted alphabetically
      await waitFor(() => {
        const sponsorNames = screen.getAllByTestId('sponsor-name');
        expect(sponsorNames[0]).toHaveTextContent('Corporate Beta');
        expect(sponsorNames[1]).toHaveTextContent('Family Foundation Gamma');
        expect(sponsorNames[2]).toHaveTextContent('Foundation Alpha');
      });
    });

    test('sorts sponsors by relationship score', async () => {
      renderWithProviders(<SponsorManagement />);

      await waitFor(() => {
        const scoreHeader = screen.getByText(/relationship score/i);
        user.click(scoreHeader);
      });

      // Verify sponsors are sorted by score (descending)
      await waitFor(() => {
        const scores = screen.getAllByTestId('relationship-score');
        expect(parseInt(scores[0].textContent)).toBeGreaterThan(
          parseInt(scores[1].textContent)
        );
      });
    });

    test('reverses sort order on second click', async () => {
      renderWithProviders(<SponsorManagement />);

      const nameHeader = screen.getByText(/sponsor name/i);
      await user.click(nameHeader);
      await user.click(nameHeader); // Second click

      // Verify sort order is reversed
      await waitFor(() => {
        const sponsorNames = screen.getAllByTestId('sponsor-name');
        expect(sponsorNames[0]).toHaveTextContent('Foundation Alpha');
        expect(sponsorNames[2]).toHaveTextContent('Corporate Beta');
      });
    });
  });

  describe('Pagination', () => {
    test('displays pagination when sponsors exceed page size', async () => {
      const manySponsors = Array.from({ length: 25 }, (_, i) => ({
        ...mockSponsors[0],
        id: `sponsor-${i}`,
        name: `Sponsor ${i}`,
      }));

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(manySponsors),
        })
      );

      renderWithProviders(<SponsorManagement />);

      await waitFor(() => {
        expect(screen.getByText(/page 1 of/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /next page/i })).toBeInTheDocument();
      });
    });

    test('navigates to next page', async () => {
      const manySponsors = Array.from({ length: 25 }, (_, i) => ({
        ...mockSponsors[0],
        id: `sponsor-${i}`,
        name: `Sponsor ${i}`,
      }));

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(manySponsors),
        })
      );

      renderWithProviders(<SponsorManagement />);

      await waitFor(() => {
        const nextButton = screen.getByRole('button', { name: /next page/i });
        user.click(nextButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/page 2 of/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    test('implements proper ARIA labels', async () => {
      renderWithProviders(<SponsorManagement />);

      expect(screen.getByRole('table')).toHaveAttribute('aria-label', 'Sponsors list');
      expect(screen.getByRole('button', { name: /add sponsor/i })).toHaveAttribute('aria-label');
    });

    test('supports keyboard navigation', async () => {
      renderWithProviders(<SponsorManagement />);

      const addButton = screen.getByRole('button', { name: /add sponsor/i });
      addButton.focus();
      expect(addButton).toHaveFocus();

      await user.keyboard('{Tab}');
      const searchInput = screen.getByPlaceholderText(/search sponsors/i);
      expect(searchInput).toHaveFocus();
    });

    test('provides screen reader announcements', async () => {
      renderWithProviders(<SponsorManagement />);

      await waitFor(() => {
        expect(screen.getByText(/3 sponsors found/i)).toHaveAttribute('aria-live', 'polite');
      });
    });
  });
});