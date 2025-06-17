
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Routes, Route, BrowserRouter } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from 'next-themes';
import { TenantProvider } from '@/components/common/TenantProvider';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';

// Pages
import { Login } from '@/pages/Login';
import { TenantSelection } from '@/pages/TenantSelection';
import { Dashboard } from '@/pages/Dashboard';
import { Relationships } from '@/pages/Relationships';
import { Sponsors } from '@/pages/Sponsors';
import { Grants } from '@/pages/Grants';
import { ContentCalendar } from '@/pages/ContentCalendar';
import { Settings } from '@/pages/Settings';
import { Landing } from '@/pages/Landing';
import { NotFound } from '@/pages/not-found';

// Layout
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (previously cacheTime)
      retry: 3,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <TenantProvider>
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/tenant-selection" element={<TenantSelection />} />
              
              {/* Protected routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Dashboard />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/relationships" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Relationships />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/sponsors" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Sponsors />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/grants" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Grants />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/content-calendar" element={
                <ProtectedRoute>
                  <AppLayout>
                    <ContentCalendar />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/settings" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Settings />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              {/* 404 route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          <Toaster />
        </TenantProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
