/**
 * KPI Cards Component
 * Displays key performance indicators with trend analysis and responsive design
 * Based on attached asset 32 specifications with enhanced TypeScript support
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Users, Calendar, Award, DollarSign } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface KPIData {
  active_sponsors: number;
  total_grants: number;
  funding_secured: number;
  upcoming_deadlines: number;
  sponsors_change: number;
  grants_change: number;
  funding_change: number;
  deadlines_change: number;
  success_rate: number;
  avg_grant_amount: number;
}

interface KPICardProps {
  id: string;
  title: string;
  value: number;
  change: number;
  icon: React.ComponentType<any>;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  format?: 'currency' | 'percentage' | 'number';
}

const KPICardSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    {[1, 2, 3, 4].map((i) => (
      <Card key={i} className="p-6">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-4 w-12" />
        </div>
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-8 w-20 mb-2" />
        <Skeleton className="h-3 w-32" />
      </Card>
    ))}
  </div>
);

const formatValue = (value: number, format?: string): string => {
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    case 'percentage':
      return `${value.toFixed(1)}%`;
    default:
      return value.toLocaleString();
  }
};

const getChangeColor = (change: number): string => {
  if (change > 0) return 'text-green-600 bg-green-50';
  if (change < 0) return 'text-red-600 bg-red-50';
  return 'text-gray-600 bg-gray-50';
};

const getChangeIcon = (change: number) => {
  if (change > 0) return TrendingUp;
  if (change < 0) return TrendingDown;
  return null;
};

const colorVariants = {
  blue: 'border-blue-200 bg-blue-50/50',
  green: 'border-green-200 bg-green-50/50',
  purple: 'border-purple-200 bg-purple-50/50',
  orange: 'border-orange-200 bg-orange-50/50',
  red: 'border-red-200 bg-red-50/50'
};

const iconColorVariants = {
  blue: 'text-blue-600 bg-blue-100',
  green: 'text-green-600 bg-green-100',
  purple: 'text-purple-600 bg-purple-100',
  orange: 'text-orange-600 bg-orange-100',
  red: 'text-red-600 bg-red-100'
};

const KPICard: React.FC<KPICardProps> = ({ title, value, change, icon: Icon, color, format }) => {
  const ChangeIcon = getChangeIcon(change);
  const changeColorClass = getChangeColor(change);

  return (
    <Card className={cn(
      "p-6 transition-all duration-200 hover:shadow-md",
      colorVariants[color]
    )}>
      <div className="flex items-center justify-between mb-4">
        <div className={cn(
          "p-2 rounded-lg",
          iconColorVariants[color]
        )}>
          <Icon size={20} />
        </div>
        
        {change !== 0 && ChangeIcon && (
          <div className={cn(
            "flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium",
            changeColorClass
          )}>
            <ChangeIcon size={12} />
            <span>{Math.abs(change)}%</span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <div className="text-2xl font-bold text-gray-900">
          {formatValue(value, format)}
        </div>
        
        {change !== 0 && (
          <p className={cn(
            "text-xs",
            change > 0 ? "text-green-600" : "text-red-600"
          )}>
            {change > 0 ? '+' : ''}{change}% from last period
          </p>
        )}
      </div>
    </Card>
  );
};

export default function KPICards() {
  const { data: kpiData, isLoading, error, refetch } = useQuery<KPIData>({
    queryKey: ['/api/dashboard/kpis'],
    refetchInterval: 180000, // Emergency optimization: 30s → 180s to reduce memory pressure
    staleTime: 90000, // Emergency optimization: 15s → 90s
  });

  if (isLoading) {
    return <KPICardSkeleton />;
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500">
          <div className="text-lg font-medium text-red-600 mb-2">Failed to Load KPI Data</div>
          <p className="text-sm mb-4">Unable to retrieve key performance indicators</p>
          <button 
            onClick={() => refetch()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            Retry
          </button>
        </div>
      </Card>
    );
  }

  const kpis: KPICardProps[] = [
    {
      id: 'active_sponsors',
      title: 'Active Sponsors',
      value: kpiData?.active_sponsors || 0,
      change: kpiData?.sponsors_change || 0,
      icon: Users,
      color: 'blue'
    },
    {
      id: 'total_grants',
      title: 'Grant Applications',
      value: kpiData?.total_grants || 0,
      change: kpiData?.grants_change || 0,
      icon: Award,
      color: 'green'
    },
    {
      id: 'funding_secured',
      title: 'Funding Secured',
      value: kpiData?.funding_secured || 0,
      change: kpiData?.funding_change || 0,
      icon: DollarSign,
      color: 'purple',
      format: 'currency'
    },
    {
      id: 'upcoming_deadlines',
      title: 'Upcoming Deadlines',
      value: kpiData?.upcoming_deadlines || 0,
      change: kpiData?.deadlines_change || 0,
      icon: Calendar,
      color: 'orange'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {kpis.map((kpi) => (
        <KPICard key={kpi.id} {...kpi} />
      ))}
    </div>
  );
}