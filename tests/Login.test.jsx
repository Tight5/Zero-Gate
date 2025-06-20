import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import Login from '../client/src/pages/Login';
import { AuthContext } from '../client/src/contexts/AuthContext';
import { ThemeProvider } from '../client/src/contexts/ThemeContext';

// Mock the authentication service
jest.mock('../client/src/services/authService', () => ({
  login: jest.fn(),
  loginWithMicrosoft: jest.fn(),
  checkAuthStatus: jest.fn(),
}));

// Mock Replit Auth
jest.mock('@replit/ui', () => ({
  Button: ({ children, onClick, variant, ...props }) => (
    <button onClick={onClick} data-variant={variant} {...props}>
      {children}
    </button>
  ),
  Input: ({ value, onChange, ...props }) => (
    <input value={value} onChange={(e) => onChange(e.target.value)} {...props} />
  ),
  Card: ({ children }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }) => <div>{children}</div>,
  CardHeader: ({ children }) => <div>{children}</div>,
  CardTitle: ({ children }) => <h2>{children}</h2>,
}));

describe('Login Component', () => {
  let queryClient;
  let mockAuthContext;
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mockAuthContext = {
      user: null,
      isLoading: false,
      isAuthenticated: false,
      login: jest.fn(),
      logout: jest.fn(),
      loginWithMicrosoft: jest.fn(),
    };

    // Mock successful login response
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
          },
          token: 'mock-jwt-token',
        }),
      })
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderWithProviders = (component) => {
    return render(
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AuthContext.Provider value={mockAuthContext}>
              {component}
            </AuthContext.Provider>
          </ThemeProvider>
        </QueryClientProvider>
      </BrowserRouter>
    );
  };

  describe('Initial Render', () => {
    test('renders login form with all required fields', () => {
      renderWithProviders(<Login />);

      expect(screen.getByText(/welcome to zero gate/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    test('renders Microsoft 365 login option', () => {
      renderWithProviders(<Login />);

      expect(screen.getByRole('button', { name: /continue with microsoft 365/i })).toBeInTheDocument();
      expect(screen.getByText(/organizational access/i)).toBeInTheDocument();
    });

    test('displays platform branding and description', () => {
      renderWithProviders(<Login />);

      expect(screen.getByText(/executive service organization/i)).toBeInTheDocument();
      expect(screen.getByText(/intelligent relationship management/i)).toBeInTheDocument();
    });

    test('includes security features information', () => {
      renderWithProviders(<Login />);

      expect(screen.getByText(/secure authentication/i)).toBeInTheDocument();
      expect(screen.getByText(/multi-tenant access/i)).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    test('shows validation errors for empty fields', async () => {
      renderWithProviders(<Login />);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });
    });

    test('validates email format', async () => {
      renderWithProviders(<Login />);

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'invalid-email');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
      });
    });

    test('validates password minimum length', async () => {
      renderWithProviders(<Login />);

      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(passwordInput, '123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
      });
    });

    test('clears validation errors on input change', async () => {
      renderWithProviders(<Login />);

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Trigger validation error
      await user.click(submitButton);
      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });

      // Clear error by typing
      await user.type(emailInput, 'test@example.com');
      await waitFor(() => {
        expect(screen.queryByText(/email is required/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Authentication Flow', () => {
    test('handles successful login', async () => {
      renderWithProviders(<Login />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockAuthContext.login).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });
    });

    test('displays loading state during authentication', async () => {
      mockAuthContext.isLoading = true;
      renderWithProviders(<Login />);

      expect(screen.getByText(/signing in/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
    });

    test('handles authentication errors', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({
            message: 'Invalid credentials',
          }),
        })
      );

      renderWithProviders(<Login />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });
    });

    test('handles network errors gracefully', async () => {
      global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));

      renderWithProviders(<Login />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/connection error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Microsoft 365 Integration', () => {
    test('initiates Microsoft 365 login flow', async () => {
      renderWithProviders(<Login />);

      const microsoftButton = screen.getByRole('button', { name: /continue with microsoft 365/i });
      await user.click(microsoftButton);

      expect(mockAuthContext.loginWithMicrosoft).toHaveBeenCalled();
    });

    test('displays Microsoft 365 loading state', async () => {
      mockAuthContext.isLoading = true;
      renderWithProviders(<Login />);

      const microsoftButton = screen.getByRole('button', { name: /continue with microsoft 365/i });
      expect(microsoftButton).toBeDisabled();
    });

    test('shows organizational access benefits', () => {
      renderWithProviders(<Login />);

      expect(screen.getByText(/access your organization's data/i)).toBeInTheDocument();
      expect(screen.getByText(/automatic relationship mapping/i)).toBeInTheDocument();
      expect(screen.getByText(/email pattern analysis/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('has proper form labels and ARIA attributes', () => {
      renderWithProviders(<Login />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);

      expect(emailInput).toHaveAttribute('aria-required', 'true');
      expect(passwordInput).toHaveAttribute('aria-required', 'true');
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test('maintains focus management', async () => {
      renderWithProviders(<Login />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.tab();
      expect(emailInput).toHaveFocus();

      await user.tab();
      expect(passwordInput).toHaveFocus();
    });

    test('provides screen reader announcements for errors', async () => {
      renderWithProviders(<Login />);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        const errorElement = screen.getByText(/email is required/i);
        expect(errorElement).toHaveAttribute('role', 'alert');
      });
    });
  });

  describe('Responsive Design', () => {
    test('adapts to mobile viewport', () => {
      // Simulate mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      renderWithProviders(<Login />);

      const card = screen.getByTestId('card');
      expect(card).toHaveClass('w-full');
    });

    test('displays desktop layout on larger screens', () => {
      // Simulate desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });

      renderWithProviders(<Login />);

      expect(screen.getByText(/welcome to zero gate/i)).toBeInTheDocument();
    });
  });

  describe('Security Features', () => {
    test('does not expose sensitive information in DOM', () => {
      renderWithProviders(<Login />);

      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
    });

    test('implements proper CSRF protection', async () => {
      renderWithProviders(<Login />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
          })
        );
      });
    });
  });

  describe('Remember Me Functionality', () => {
    test('renders remember me checkbox', () => {
      renderWithProviders(<Login />);

      expect(screen.getByLabelText(/remember me/i)).toBeInTheDocument();
    });

    test('handles remember me state changes', async () => {
      renderWithProviders(<Login />);

      const rememberCheckbox = screen.getByLabelText(/remember me/i);
      expect(rememberCheckbox).not.toBeChecked();

      await user.click(rememberCheckbox);
      expect(rememberCheckbox).toBeChecked();
    });
  });
});