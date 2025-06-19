import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuthMode } from '@/contexts/AuthModeContext';
// Layout components temporarily disabled for memory optimization
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign, 
  FileText, 
  Download,
  Calendar,
  Target,
  Network,
  Crown
} from 'lucide-react';

interface ReportMetric {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
}

interface ReportData {
  metrics: ReportMetric[];
  insights: string[];
  adminMetrics?: ReportMetric[];
}

export default function Reports() {
  const { isAdminMode } = useAuthMode();

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['/api/reports', isAdminMode ? 'admin' : 'tenant'],
    retry: false,
  });

  // Mock data for demonstration
  const mockData: ReportData = {
    metrics: [
      {
        title: 'Active Sponsors',
        value: '127',
        change: '+12%',
        trend: 'up',
        icon: <Users className="h-4 w-4" />
      },
      {
        title: 'Grant Opportunities',
        value: '43',
        change: '+8%',
        trend: 'up',
        icon: <Target className="h-4 w-4" />
      },
      {
        title: 'Network Connections',
        value: '2,847',
        change: '+23%',
        trend: 'up',
        icon: <Network className="h-4 w-4" />
      },
      {
        title: 'Total Funding Tracked',
        value: '$2.4M',
        change: '+15%',
        trend: 'up',
        icon: <DollarSign className="h-4 w-4" />
      }
    ],
    adminMetrics: isAdminMode ? [
      {
        title: 'System Users',
        value: '1,234',
        change: '+5%',
        trend: 'up',
        icon: <Users className="h-4 w-4" />
      },
      {
        title: 'API Requests',
        value: '45.2K',
        change: '+18%',
        trend: 'up',
        icon: <BarChart3 className="h-4 w-4" />
      },
      {
        title: 'Database Size',
        value: '12.4 GB',
        change: '+2%',
        trend: 'up',
        icon: <FileText className="h-4 w-4" />
      },
      {
        title: 'Uptime',
        value: '99.98%',
        change: '0%',
        trend: 'neutral',
        icon: <TrendingUp className="h-4 w-4" />
      }
    ] : [],
    insights: [
      'Sponsor engagement increased 15% this quarter',
      'Grant application success rate improved to 68%',
      'Network growth accelerating with 23% new connections',
      'Microsoft 365 integration driving relationship discovery'
    ]
  };

  const data = reportData || mockData;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 ml-64 pt-16">
            <div className="p-8">
              <div className="flex items-center justify-center min-h-96">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 ml-64 pt-16">
          <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {isAdminMode ? 'System Reports' : 'Performance Reports'}
              {isAdminMode && <Crown className="inline-block ml-2 h-6 w-6 text-blue-600" />}
            </h1>
            <p className="text-muted-foreground">
              {isAdminMode 
                ? 'Comprehensive system analytics and performance metrics'
                : 'Track your organization\'s growth and impact metrics'
              }
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              Time Range
            </Button>
            <Button size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Mode Indicator */}
        {isAdminMode && (
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-900 dark:text-blue-100">
                  Admin Mode Active - Viewing system-wide metrics
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Metrics Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {data.metrics.map((metric, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {metric.title}
                </CardTitle>
                {metric.icon}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <TrendingUp className={`mr-1 h-3 w-3 ${
                    metric.trend === 'up' ? 'text-green-600' : 
                    metric.trend === 'down' ? 'text-red-600' : 
                    'text-gray-600'
                  }`} />
                  {metric.change} from last month
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Admin Metrics */}
        {isAdminMode && data.adminMetrics && data.adminMetrics.length > 0 && (
          <>
            <Separator />
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Crown className="h-5 w-5 text-blue-600" />
                System Administration Metrics
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {data.adminMetrics.map((metric, index) => (
                  <Card key={index} className="border-blue-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        {metric.title}
                      </CardTitle>
                      {metric.icon}
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{metric.value}</div>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <TrendingUp className={`mr-1 h-3 w-3 ${
                          metric.trend === 'up' ? 'text-green-600' : 
                          metric.trend === 'down' ? 'text-red-600' : 
                          'text-gray-600'
                        }`} />
                        {metric.change} from last week
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Insights */}
        <Card>
          <CardHeader>
            <CardTitle>Key Insights</CardTitle>
            <CardDescription>
              Important trends and highlights from your data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.insights.map((insight, index) => (
                <div key={index} className="flex items-start gap-3">
                  <Badge variant="secondary" className="mt-0.5">
                    {index + 1}
                  </Badge>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {insight}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Charts Placeholder */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Growth Trends</CardTitle>
              <CardDescription>
                Monthly growth across key metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-muted/50 rounded-md">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Chart visualization coming soon</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Network Analysis</CardTitle>
              <CardDescription>
                Relationship mapping and connection strength
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-muted/50 rounded-md">
                <div className="text-center">
                  <Network className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Network visualization coming soon</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        </div>
        </main>
      </div>
    </div>
  );
}