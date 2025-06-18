import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type AuthMode = 'tenant' | 'admin';

interface AuthModeContextType {
  mode: AuthMode;
  switchMode: (mode: AuthMode) => void;
  getTenantEmail: () => string;
  getAdminEmail: () => string;
  getCurrentEmail: () => string;
  isAdminMode: boolean;
  isTenantMode: boolean;
}

const AuthModeContext = createContext<AuthModeContextType | undefined>(undefined);

interface AuthModeProviderProps {
  children: ReactNode;
}

export function AuthModeProvider({ children }: AuthModeProviderProps) {
  const [mode, setMode] = useState<AuthMode>(() => {
    // Check localStorage for saved mode, default to tenant
    const savedMode = localStorage.getItem('auth-mode') as AuthMode;
    return savedMode && ['tenant', 'admin'].includes(savedMode) ? savedMode : 'tenant';
  });

  // Email configuration
  const TENANT_EMAIL = 'clint.phillips@thecenter.nasdaq.org';
  const ADMIN_EMAIL = 'admin@tight5digital.com';

  useEffect(() => {
    // Save mode to localStorage whenever it changes
    localStorage.setItem('auth-mode', mode);
  }, [mode]);

  const switchMode = (newMode: AuthMode) => {
    if (newMode !== mode) {
      setMode(newMode);
      // Clear any cached auth data when switching modes
      localStorage.removeItem('auth-cache');
      // Force a page reload to ensure clean authentication state
      window.location.reload();
    }
  };

  const getTenantEmail = () => TENANT_EMAIL;
  const getAdminEmail = () => ADMIN_EMAIL;
  
  const getCurrentEmail = () => {
    return mode === 'admin' ? ADMIN_EMAIL : TENANT_EMAIL;
  };

  const contextValue: AuthModeContextType = {
    mode,
    switchMode,
    getTenantEmail,
    getAdminEmail,
    getCurrentEmail,
    isAdminMode: mode === 'admin',
    isTenantMode: mode === 'tenant'
  };

  return (
    <AuthModeContext.Provider value={contextValue}>
      {children}
    </AuthModeContext.Provider>
  );
}

export function useAuthMode(): AuthModeContextType {
  const context = useContext(AuthModeContext);
  if (context === undefined) {
    throw new Error('useAuthMode must be used within an AuthModeProvider');
  }
  return context;
}