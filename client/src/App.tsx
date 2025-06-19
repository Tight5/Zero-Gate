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

// Simple layout component
function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Zero Gate ESO Platform
          </h1>
          <nav className="flex space-x-4">
            <a href="/" className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">Dashboard</a>
            <a href="/sponsors" className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">Sponsors</a>
            <a href="/grants" className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">Grants</a>
            <a href="/relationships" className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">Relationships</a>
          </nav>
        </div>
      </header>
      <main className="p-6">
        {children}
      </main>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/">
        <Layout>
          <Dashboard />
        </Layout>
      </Route>
      <Route path="/dashboard">
        <Layout>
          <Dashboard />
        </Layout>
      </Route>
      <Route path="/sponsors">
        <Layout>
          <Sponsors />
        </Layout>
      </Route>
      <Route path="/grants">
        <Layout>
          <Grants />
        </Layout>
      </Route>
      <Route path="/relationships">
        <Layout>
          <Relationships />
        </Layout>
      </Route>
      <Route path="/content-calendar">
        <Layout>
          <ContentCalendar />
        </Layout>
      </Route>
      <Route path="/settings">
        <Layout>
          <Settings />
        </Layout>
      </Route>
      <Route path="/debug">
        <Layout>
          <Debug />
        </Layout>
      </Route>
      <Route path="/reports">
        <Layout>
          <Reports />
        </Layout>
      </Route>
      <Route>
        <Layout>
          <NotFound />
        </Layout>
      </Route>
    </Switch>
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