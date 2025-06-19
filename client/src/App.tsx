import React from 'react';
import { Switch, Route } from 'wouter';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { queryClient } from './lib/queryClient';

// Import context providers
import { AuthProvider } from './contexts/AuthContext';
import { TenantProvider } from './contexts/TenantContext';
import { ResourceProvider } from './contexts/ResourceContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Import layout and pages
import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import Sponsors from '@/pages/Sponsors';
import Grants from '@/pages/Grants';
import Relationships from '@/pages/Relationships';
import ContentCalendar from '@/pages/ContentCalendar';
import Settings from '@/pages/Settings';
import Debug from '@/pages/Debug';
import Reports from '@/pages/Reports';
import Analytics from '@/pages/Analytics';
import NotFound from '@/pages/not-found';



function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/sponsors" component={Sponsors} />
        <Route path="/grants" component={Grants} />
        <Route path="/relationships" component={Relationships} />
        <Route path="/content-calendar" component={ContentCalendar} />
        <Route path="/calendar" component={ContentCalendar} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/settings" component={Settings} />
        <Route path="/debug" component={Debug} />
        <Route path="/reports" component={Reports} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TenantProvider>
            <ResourceProvider>
              <Router />
              <Toaster />
            </ResourceProvider>
          </TenantProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}