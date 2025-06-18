import { Suspense, lazy, useEffect, useCallback, memo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
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
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 ml-64 pt-16">
          <div className="p-8">
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Executive Dashboard</h1>
              <p className="text-gray-600">Monitor your ESO platform performance and key metrics</p>
            </div>

            {/* KPI Cards */}
            <ErrorBoundary
              FallbackComponent={(props) => <ComponentErrorFallback {...props} title="KPI Cards" />}
              onError={(error) => console.error('KPI Cards error:', error)}
            >
              <div className="mb-8">
                <KPICards />
              </div>
            </ErrorBoundary>

            {/* Main Dashboard Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
              {/* Relationship Chart - spans 2 columns on extra large screens */}
              <div className="xl:col-span-2">
                <ErrorBoundary
                  FallbackComponent={(props) => <ComponentErrorFallback {...props} title="Relationship Chart" />}
                  onError={(error) => console.error('Relationship Chart error:', error)}
                >
                  <Suspense fallback={<ComponentSkeleton />}>
                    <RelationshipChart />
                  </Suspense>
                </ErrorBoundary>
              </div>

              {/* Recent Activity - spans 1 column */}
              <div className="xl:col-span-1">
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

            {/* Grant Timeline - spans full width */}
            <div className="mb-8">
              <ErrorBoundary
                FallbackComponent={(props) => <ComponentErrorFallback {...props} title="Grant Timeline" />}
                onError={(error) => console.error('Grant Timeline error:', error)}
              >
                <Suspense fallback={<ComponentSkeleton />}>
                  <GrantTimeline />
                </Suspense>
              </ErrorBoundary>
            </div>

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
