import React, { Suspense } from 'react';
import { Switch, Route } from 'wouter';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

// Contexts
import TenantProvider from '@/contexts/TenantContext';
import ResourceProvider from '@/contexts/ResourceContext';

// Components
import ErrorBoundary from '@/components/common/ErrorBoundary';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import AppLayout from '@/components/layout/AppLayout';

// Query Client
import { queryClient } from './lib/queryClient';

// Hooks
import { useAuth } from '@/hooks/useAuth';

// Lazy load pages for better performance
const Landing = React.lazy(() => import('@/pages/Landing'));
const Login = React.lazy(() => import('@/pages/Login'));
const TenantSelection = React.lazy(() => import('@/pages/TenantSelection'));
const Dashboard = React.lazy(() => import('@/pages/Dashboard'));
const Sponsors = React.lazy(() => import('@/pages/Sponsors'));
const Grants = React.lazy(() => import('@/pages/Grants'));
const Relationships = React.lazy(() => import('@/pages/Relationships'));
const ContentCalendar = React.lazy(() => import('@/pages/ContentCalendar'));
const Settings = React.lazy(() => import('@/pages/Settings'));
const Debug = React.lazy(() => import('@/pages/Debug'));
const Reports = React.lazy(() => import('@/pages/Reports'));
const NotFound = React.lazy(() => import('@/pages/not-found'));

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/login" component={Login} />
          <Route path="/tenant-selection" component={TenantSelection} />
        </>
      ) : (
        <Route path="/:rest*">
          {(params) => (
            <AppLayout>
              <Switch>
                <Route path="/" component={Dashboard} />
                <Route path="/dashboard" component={Dashboard} />
                <Route path="/sponsors" component={Sponsors} />
                <Route path="/grants" component={Grants} />
                <Route path="/relationships" component={Relationships} />
                <Route path="/content-calendar" component={ContentCalendar} />
                <Route path="/reports" component={Reports} />
                <Route path="/settings" component={Settings} />
                <Route path="/debug" component={Debug} />
                <Route component={NotFound} />
              </Switch>
            </AppLayout>
          )}
        </Route>
      )}
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ResourceProvider>
          <TenantProvider>
            <TooltipProvider>
              <div className="min-h-screen bg-background">
                <Suspense fallback={<LoadingSpinner />}>
                  <Router />
                </Suspense>
                <Toaster />
                <ReactQueryDevtools initialIsOpen={false} />
              </div>
            </TooltipProvider>
          </TenantProvider>
        </ResourceProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}