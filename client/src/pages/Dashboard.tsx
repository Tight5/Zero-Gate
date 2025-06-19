/**
 * Executive Dashboard Page
 * Comprehensive dashboard with KPI cards, relationship chart, grant timeline, and recent activity
 * Based on attached asset 35 specifications with responsive grid layouts and error boundaries
 */

import { Suspense, lazy, useEffect, useCallback, memo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { 
  BarChart3, 
  Plus, 
  Filter, 
  Download, 
  RefreshCw,
  Settings,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import KPICards from "@/components/dashboard/KPICards";
import { ErrorBoundary } from "react-error-boundary";

// Lazy load heavy dashboard components to improve performance
const RelationshipChart = lazy(() => import("@/components/dashboard/RelationshipChart"));
const GrantTimeline = lazy(() => import("@/components/dashboard/GrantTimeline"));
const RecentActivity = lazy(() => import("@/components/dashboard/RecentActivity"));

// Loading skeleton for components
function ComponentSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`${className} animate-pulse`}>
      <div className="bg-white rounded-lg border p-6">
        <div className="h-6 bg-gray-200 rounded mb-4 w-1/3"></div>
        <div className="space-y-3">
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    </div>
  );
}

// Error fallback component
function ComponentErrorFallback({ error, resetErrorBoundary, title = "Component" }: { 
  error: Error; 
  resetErrorBoundary: () => void; 
  title?: string; 
}) {
  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="text-center text-gray-500">
        <div className="text-lg font-medium text-red-600 mb-2">Error Loading {title}</div>
        <p className="text-sm mb-4">Unable to load this component. Please try again.</p>
        <button 
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

const Dashboard = memo(function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  const handleAuthRedirect = useCallback(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, isLoading, toast]);

  useEffect(() => {
    handleAuthRedirect();
  }, [handleAuthRedirect]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="dashboard-page">
      {/* Layout components temporarily disabled for memory optimization */}
      <div className="flex">{/* Sidebar temporarily disabled */}
        <main className="flex-1">
          <div className="dashboard-content">
            {/* Page Header */}
            <div className="dashboard-header">
              <div className="header-content">
                <div className="title-section">
                  <h1>
                    <BarChart3 size={28} />
                    Executive Dashboard
                  </h1>
                  <p className="dashboard-subtitle">
                    Monitor your ESO platform performance and key metrics
                  </p>
                </div>
              </div>
            </div>

            {/* KPI Cards */}
            <section className="dashboard-section">
              <div className="section-header">
                <h3>Key Performance Indicators</h3>
                <span className="section-subtitle">Real-time organizational metrics</span>
              </div>
              <ErrorBoundary
                FallbackComponent={(props) => <ComponentErrorFallback {...props} title="KPI Cards" />}
                onError={(error) => console.error('KPI Cards error:', error)}
              >
                <KPICards />
              </ErrorBoundary>
            </section>

            {/* Main Dashboard Grid */}
            <div className="dashboard-grid">
              {/* Relationship Chart */}
              <div className="grid-item">
                <div className="dashboard-widget">
                  <div className="widget-header">
                    <h4>Relationship Strength Overview</h4>
                  </div>
                  <div className="widget-content">
                    <ErrorBoundary
                      FallbackComponent={(props) => <ComponentErrorFallback {...props} title="Relationship Chart" />}
                      onError={(error) => console.error('Relationship Chart error:', error)}
                    >
                      <Suspense fallback={<ComponentSkeleton />}>
                        <RelationshipChart />
                      </Suspense>
                    </ErrorBoundary>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="grid-item">
                <div className="dashboard-widget">
                  <div className="widget-header">
                    <h4>Recent Activity</h4>
                  </div>
                  <div className="widget-content">
                    <ErrorBoundary
                      FallbackComponent={(props) => <ComponentErrorFallback {...props} title="Recent Activity" />}
                      onError={(error) => console.error('Recent Activity error:', error)}
                    >
                      <Suspense fallback={<ComponentSkeleton />}>
                        <RecentActivity />
                      </Suspense>
                    </ErrorBoundary>
                  </div>
                </div>
              </div>
            </div>

            {/* Grant Timeline - spans full width */}
            <section className="dashboard-section">
              <div className="section-header">
                <h3>Grant Status Timeline</h3>
                <span className="section-subtitle">Track grant applications and deadlines</span>
              </div>
              <div className="dashboard-widget">
                <div className="widget-content">
                  <ErrorBoundary
                    FallbackComponent={(props) => <ComponentErrorFallback {...props} title="Grant Timeline" />}
                    onError={(error) => console.error('Grant Timeline error:', error)}
                  >
                    <Suspense fallback={<ComponentSkeleton />}>
                      <GrantTimeline />
                    </Suspense>
                  </ErrorBoundary>
                </div>
              </div>
            </section>

            {/* Footer info */}
            <div className="text-xs text-gray-400 text-center py-4 border-t">
              Dashboard data refreshes automatically every 30 seconds
            </div>
          </div>
        </main>
      </div>
    </div>
  );
});

export default Dashboard;
