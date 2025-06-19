import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRealTimeKPIs } from '@/hooks/useRealTimeData';
import { TrendingUp, TrendingDown, DollarSign, Users, Target, Clock } from 'lucide-react';

interface KPIData {
  totalSponsors: number;
  activeGrants: number;
  totalFunding: number;
  successRate: number;
  trends: {
    sponsors: number;
    grants: number;
    funding: number;
    success: number;
  };
  lastUpdated?: Date;
}

export function RealTimeKPICards() {
  const { data: kpiData, lastUpdate, connected } = useRealTimeKPIs();
  const [displayData, setDisplayData] = useState<KPIData>({
    totalSponsors: 25,
    activeGrants: 8,
    totalFunding: 125000,
    successRate: 72,
    trends: { sponsors: 5.2, grants: -2.1, funding: 8.7, success: 3.4 }
  });

  // Update display data when real-time data arrives
  useEffect(() => {
    if (kpiData) {
      setDisplayData(prev => ({
        ...prev,
        ...kpiData,
        lastUpdated: lastUpdate || new Date()
      }));
    }
  }, [kpiData, lastUpdate]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatTrend = (trend: number) => {
    const isPositive = trend > 0;
    return (
      <div className={`flex items-center gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        <span className="text-xs font-medium">
          {isPositive ? '+' : ''}{trend.toFixed(1)}%
        </span>
      </div>
    );
  };

  const getConnectionStatus = () => {
    if (connected) {
      return <Badge variant="outline" className="text-green-600 border-green-600">Live</Badge>;
    }
    return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Cached</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Real-Time KPIs</h3>
        <div className="flex items-center gap-2">
          {getConnectionStatus()}
          {displayData.lastUpdated && (
            <span className="text-xs text-gray-500">
              Updated: {displayData.lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sponsors */}
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sponsors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{displayData.totalSponsors}</div>
            <div className="flex items-center justify-between mt-2">
              {formatTrend(displayData.trends.sponsors)}
              <span className="text-xs text-muted-foreground">vs last month</span>
            </div>
          </CardContent>
          {connected && (
            <div className="absolute top-0 right-0 w-1 h-full bg-green-500 opacity-50"></div>
          )}
        </Card>

        {/* Active Grants */}
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Grants</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{displayData.activeGrants}</div>
            <div className="flex items-center justify-between mt-2">
              {formatTrend(displayData.trends.grants)}
              <span className="text-xs text-muted-foreground">vs last month</span>
            </div>
          </CardContent>
          {connected && (
            <div className="absolute top-0 right-0 w-1 h-full bg-green-500 opacity-50"></div>
          )}
        </Card>

        {/* Total Funding */}
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Funding</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(displayData.totalFunding)}</div>
            <div className="flex items-center justify-between mt-2">
              {formatTrend(displayData.trends.funding)}
              <span className="text-xs text-muted-foreground">vs last month</span>
            </div>
          </CardContent>
          {connected && (
            <div className="absolute top-0 right-0 w-1 h-full bg-green-500 opacity-50"></div>
          )}
        </Card>

        {/* Success Rate */}
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{displayData.successRate}%</div>
            <div className="flex items-center justify-between mt-2">
              {formatTrend(displayData.trends.success)}
              <span className="text-xs text-muted-foreground">vs last month</span>
            </div>
          </CardContent>
          {connected && (
            <div className="absolute top-0 right-0 w-1 h-full bg-green-500 opacity-50"></div>
          )}
        </Card>
      </div>

      {/* Real-time Indicator */}
      {connected && (
        <div className="flex items-center justify-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Real-time updates active</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default RealTimeKPICards;