import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  currentTenantId?: string;
  createdAt: string;
  updatedAt: string;
  tenants?: any[];
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
  refetch: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient();
  const [isInitialized, setIsInitialized] = useState(false);

  const {
    data: user,
    isLoading,
    refetch,
    error
  } = useQuery({
    queryKey: ['/api/auth/user'],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: isInitialized
  });

  useEffect(() => {
    // Initialize auth check on mount
    setIsInitialized(true);
  }, []);

  const login = () => {
    window.location.href = '/api/login';
  };

  const logout = () => {
    // Clear all cached data
    queryClient.clear();
    window.location.href = '/api/logout';
  };

  const isAuthenticated = !!user && !error;

  const contextValue: AuthContextType = {
    user: user || null,
    isLoading: isLoading && isInitialized,
    isAuthenticated,
    login,
    logout,
    refetch
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export type { User, AuthContextType };