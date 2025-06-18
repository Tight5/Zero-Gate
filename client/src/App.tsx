
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

// Global Contexts
import { AuthProvider } from './contexts/AuthContext';
import { AuthModeProvider } from './contexts/AuthModeContext';
import { TenantProvider } from './contexts/TenantContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ResourceProvider } from './contexts/ResourceContext';

// Query Client
import { queryClient } from './lib/queryClient';

// Environment Configuration
import env from './config/env';

// Hooks
import { useAuth } from '@/hooks/useAuth';

// Pages
import NotFound from '@/pages/not-found';
import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import TenantSelection from '@/pages/TenantSelection';
import Dashboard from '@/pages/Dashboard';
import Sponsors from '@/pages/Sponsors';
import Grants from '@/pages/Grants';
import Relationships from '@/pages/Relationships';
import ContentCalendar from '@/pages/ContentCalendar';
import Settings from '@/pages/Settings';
import Debug from '@/pages/Debug';

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}

// Public Route Component
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}

// App Router Component
function AppRouter() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/" 
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } 
        />
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } 
        />
        <Route 
          path="/landing" 
          element={
            <PublicRoute>
              <Landing />
            </PublicRoute>
          } 
        />
        
        {/* Protected Routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/sponsors" 
          element={
            <ProtectedRoute>
              <Sponsors />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/grants" 
          element={
            <ProtectedRoute>
              <Grants />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/relationships" 
          element={
            <ProtectedRoute>
              <Relationships />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/content-calendar" 
          element={
            <ProtectedRoute>
              <ContentCalendar />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/tenant-selection" 
          element={
            <ProtectedRoute>
              <TenantSelection />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/debug" 
          element={
            <ProtectedRoute>
              <Debug />
            </ProtectedRoute>
          } 
        />
        
        {/* 404 Route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

// Main App Component
function App() {
  return (
    <ThemeProvider defaultTheme="system">
      <QueryClientProvider client={queryClient}>
        <AuthModeProvider>
          <AuthProvider>
            <TenantProvider>
              <ResourceProvider>
                <TooltipProvider>
                  <div className="min-h-screen bg-background text-foreground">
                    <AppRouter />
                    <Toaster />
                    {env.isDevelopment && <ReactQueryDevtools initialIsOpen={false} />}
                  </div>
                </TooltipProvider>
              </ResourceProvider>
            </TenantProvider>
          </AuthProvider>
        </AuthModeProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
