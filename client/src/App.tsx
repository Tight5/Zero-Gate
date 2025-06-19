
import React from 'react';
import { Switch, Route } from 'wouter';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

// Query Client
import { queryClient } from './lib/queryClient';

// Hooks
import { useAuth } from '@/hooks/useAuth';

// Pages
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
import Reports from '@/pages/Reports';
import NotFound from '@/pages/not-found';

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/login" component={Login} />
        </>
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/tenant-selection" component={TenantSelection} />
          <Route path="/sponsors" component={Sponsors} />
          <Route path="/grants" component={Grants} />
          <Route path="/relationships" component={Relationships} />
          <Route path="/content-calendar" component={ContentCalendar} />
          <Route path="/reports" component={Reports} />
          <Route path="/settings" component={Settings} />
          <Route path="/debug" component={Debug} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
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
        <Route 
          path="/reports" 
          element={
            <ProtectedRoute>
              <Reports />
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
