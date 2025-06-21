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
import AdminDashboard from '@/components/admin/AdminDashboard';
import Sponsors from '@/pages/Sponsors';
import Grants from '@/pages/Grants';
import Relationships from '@/pages/Relationships';
import ContentCalendar from '@/pages/ContentCalendar';
import Settings from '@/pages/Settings';
import Debug from '@/pages/Debug';
import Reports from '@/pages/Reports';
import Analytics from '@/pages/Analytics';
import Orchestration from '@/pages/Orchestration';
import Phase2Dashboard from '@/pages/Phase2Dashboard';
import ValidationDashboard from '@/pages/ValidationDashboard';
import NotFound from '@/pages/not-found';



function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/dashboard" component={AdminDashboard} />
        <Route path="/sponsors" component={Sponsors} />
        <Route path="/grants" component={Grants} />
        <Route path="/relationships" component={Relationships} />
        <Route path="/content-calendar" component={ContentCalendar} />
        <Route path="/calendar" component={ContentCalendar} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/orchestration" component={Orchestration} />
        <Route path="/phase2" component={Phase2Dashboard} />
        <Route path="/validation" component={ValidationDashboard} />
        <Route path="/settings" component={Settings} />
        <Route path="/debug" component={Debug} />
        <Route path="/reports" component={Reports} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

export default function App() {
  console.log("App component rendering...");
  
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TenantProvider>
            <ResourceProvider>
              <div className="min-h-screen bg-gray-50">
                <Router />
                <Toaster />
              </div>
            </ResourceProvider>
          </TenantProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}