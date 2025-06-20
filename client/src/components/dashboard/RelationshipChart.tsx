/**
 * Relationship Strength Chart Component
 * Visualizes relationship strength data with radial bar chart and pie chart
 * Based on attached asset specifications with responsive design
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  RadialBarChart, 
  RadialBar, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend 
} from 'recharts';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface RelationshipData {
  id: string;
  name: string;
  strength: number;
  type: 'direct' | 'indirect' | 'professional' | 'personal' | 'organizational';
  value: number;
  fill: string;
}

interface RelationshipStats {
  totalRelationships: number;
  strongConnections: number;
  averageStrength: number;
  topConnectors: Array<{
    name: string;
    connections: number;
    strength: number;
  }>;
  strengthDistribution: RelationshipData[];
  typeDistribution: Array<{
    type: string;
    count: number;
    percentage: number;
    color: string;
  }>;
}

const COLORS = {
  direct: '#3366FF',
  indirect: '#10B981',
  professional: '#8B5CF6',
  personal: '#F59E0B',
  organizational: '#EF4444'
};

const RelationshipChartSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <Skeleton className="h-48 w-full" />
      </Card>
      <Card className="p-6">
        <Skeleton className="h-6 w-28 mb-4" />
        <Skeleton className="h-48 w-full" />
      </Card>
    </div>
    <Card className="p-6">
      <Skeleton className="h-6 w-36 mb-4" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
    </Card>
  </div>
);

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: RelationshipData;
    value: number;
  }>;
  label?: string;
}

interface PieTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      type: string;
      count: number;
      percentage: number;
      color: string;
    };
    value: number;
  }>;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 border rounded-lg shadow-lg">
        <p className="font-medium">{data.name}</p>
        <p className="text-sm text-gray-600">
          Strength: <span className="font-medium">{data.strength}%</span>
        </p>
        <p className="text-sm text-gray-600">
          Type: <span className="font-medium capitalize">{data.type}</span>
        </p>
      </div>
    );
  }
  return null;
};

const PieTooltip = ({ active, payload }: PieTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 border rounded-lg shadow-lg">
        <p className="font-medium capitalize">{data.type}</p>
        <p className="text-sm text-gray-600">
          Count: <span className="font-medium">{data.count}</span>
        </p>
        <p className="text-sm text-gray-600">
          Percentage: <span className="font-medium">{data.percentage}%</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function RelationshipChart() {
  const { data: relationshipData, isLoading, error, refetch } = useQuery<RelationshipStats>({
    queryKey: ['/api/dashboard/relationships'],
    refetchInterval: 240000, // Emergency optimization: 60s → 240s to reduce memory pressure
    staleTime: 120000, // Emergency optimization: 30s → 120s
  });

  if (isLoading) {
    return <RelationshipChartSkeleton />;
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500">
          <div className="text-lg font-medium text-red-600 mb-2">Failed to Load Relationship Data</div>
          <p className="text-sm mb-4">Unable to retrieve relationship analytics</p>
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

  if (!relationshipData || relationshipData.strengthDistribution.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500">
          <div className="text-lg font-medium mb-2">No Relationship Data</div>
          <p className="text-sm">Start mapping relationships to see analytics</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">
            {relationshipData.totalRelationships}
          </div>
          <div className="text-sm text-gray-600">Total Connections</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {relationshipData.strongConnections}
          </div>
          <div className="text-sm text-gray-600">Strong Bonds</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">
            {relationshipData.averageStrength}%
          </div>
          <div className="text-sm text-gray-600">Avg Strength</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">
            {relationshipData.topConnectors.length}
          </div>
          <div className="text-sm text-gray-600">Key Connectors</div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Strength Distribution */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Relationship Strength</h3>
          <ResponsiveContainer width="100%" height={250}>
            <RadialBarChart
              cx="50%"
              cy="50%"
              innerRadius="20%"
              outerRadius="90%"
              data={relationshipData.strengthDistribution}
            >
              <RadialBar
                dataKey="strength"
                cornerRadius={4}
                fill="#3366FF"
              />
              <Tooltip content={<CustomTooltip />} />
            </RadialBarChart>
          </ResponsiveContainer>
        </Card>

        {/* Type Distribution */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Connection Types</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={relationshipData.typeDistribution}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="count"
                label={({ type, percentage }) => `${percentage}%`}
              >
                {relationshipData.typeDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
              <Legend 
                formatter={(value, entry) => (
                  <span className="capitalize text-sm">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Top Connectors */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Key Connectors</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {relationshipData.topConnectors.map((connector, index) => (
            <div 
              key={connector.name}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </div>
                <div>
                  <div className="font-medium text-sm">{connector.name}</div>
                  <div className="text-xs text-gray-500">
                    {connector.connections} connections
                  </div>
                </div>
              </div>
              <Badge 
                variant={connector.strength >= 80 ? "default" : "secondary"}
                className="text-xs"
              >
                {connector.strength}%
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}