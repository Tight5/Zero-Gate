/**
 * Grant Timeline Component
 * Displays grant status timeline with milestone tracking and backwards planning
 * Based on attached asset specifications with 90/60/30-day milestone visualization
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, differenceInDays, parseISO } from 'date-fns';
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Target,
  TrendingUp
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface GrantMilestone {
  id: string;
  title: string;
  dueDate: string;
  completed: boolean;
  type: '90-day' | '60-day' | '30-day' | 'submission';
  description: string;
}

interface Grant {
  id: string;
  title: string;
  organization: string;
  amount: number;
  deadline: string;
  status: 'planning' | 'in-progress' | 'review' | 'submitted' | 'awarded' | 'rejected';
  progress: number;
  milestones: GrantMilestone[];
  daysRemaining: number;
  riskLevel: 'low' | 'medium' | 'high';
}

interface GrantTimelineData {
  grants: Grant[];
  totalGrants: number;
  activeGrants: number;
  overdueGrants: number;
  upcomingDeadlines: number;
}

const statusColors = {
  planning: 'bg-blue-100 text-blue-800',
  'in-progress': 'bg-yellow-100 text-yellow-800',
  review: 'bg-purple-100 text-purple-800',
  submitted: 'bg-indigo-100 text-indigo-800',
  awarded: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800'
};

const riskColors = {
  low: 'text-green-600',
  medium: 'text-yellow-600',
  high: 'text-red-600'
};

const milestoneTypeColors = {
  '90-day': 'bg-blue-500',
  '60-day': 'bg-yellow-500',
  '30-day': 'bg-orange-500',
  'submission': 'bg-red-500'
};

const GrantTimelineSkeleton = () => (
  <div className="space-y-4">
    {[1, 2, 3].map(i => (
      <Card key={i} className="p-4">
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-6 w-20" />
        </div>
        <Skeleton className="h-2 w-full mb-3" />
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map(j => (
            <Skeleton key={j} className="h-8 w-full" />
          ))}
        </div>
      </Card>
    ))}
  </div>
);

const MilestoneIndicator: React.FC<{ milestone: GrantMilestone }> = ({ milestone }) => {
  const daysUntil = differenceInDays(parseISO(milestone.dueDate), new Date());
  const isOverdue = daysUntil < 0;
  const isUpcoming = daysUntil <= 7 && daysUntil > 0;

  return (
    <div className={cn(
      "flex items-center space-x-2 p-2 rounded-lg border",
      milestone.completed ? "bg-green-50 border-green-200" :
      isOverdue ? "bg-red-50 border-red-200" :
      isUpcoming ? "bg-yellow-50 border-yellow-200" :
      "bg-gray-50 border-gray-200"
    )}>
      <div className={cn(
        "w-3 h-3 rounded-full",
        milestoneTypeColors[milestone.type]
      )} />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium truncate">{milestone.title}</div>
        <div className="text-xs text-gray-500">
          {isOverdue ? `${Math.abs(daysUntil)} days overdue` :
           daysUntil === 0 ? 'Due today' :
           `${daysUntil} days`}
        </div>
      </div>
      {milestone.completed && (
        <CheckCircle className="w-4 h-4 text-green-600" />
      )}
    </div>
  );
};

const GrantCard: React.FC<{ grant: Grant }> = ({ grant }) => {
  const completedMilestones = grant.milestones.filter(m => m.completed).length;
  const totalMilestones = grant.milestones.length;
  const isOverdue = grant.daysRemaining < 0;

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm truncate">{grant.title}</h4>
          <p className="text-xs text-gray-600 truncate">{grant.organization}</p>
          <p className="text-sm font-medium text-green-600">
            ${grant.amount.toLocaleString()}
          </p>
        </div>
        <div className="flex flex-col items-end space-y-1">
          <Badge className={cn("text-xs", statusColors[grant.status])}>
            {grant.status.replace('-', ' ')}
          </Badge>
          <div className={cn(
            "text-xs font-medium",
            riskColors[grant.riskLevel]
          )}>
            {isOverdue ? `${Math.abs(grant.daysRemaining)} overdue` :
             grant.daysRemaining === 0 ? 'Due today' :
             `${grant.daysRemaining} days`}
          </div>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span>Progress</span>
          <span>{completedMilestones}/{totalMilestones} milestones</span>
        </div>
        <Progress value={grant.progress} className="h-2" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {grant.milestones.slice(0, 4).map(milestone => (
          <MilestoneIndicator key={milestone.id} milestone={milestone} />
        ))}
      </div>

      {grant.milestones.length > 4 && (
        <div className="text-xs text-gray-500 text-center mt-2">
          +{grant.milestones.length - 4} more milestones
        </div>
      )}
    </Card>
  );
};

export default function GrantTimeline() {
  const { data: timelineData, isLoading, error, refetch } = useQuery<GrantTimelineData>({
    queryKey: ['/api/dashboard/grants'],
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000, // Consider fresh for 30 seconds
  });

  if (isLoading) {
    return <GrantTimelineSkeleton />;
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500">
          <div className="text-lg font-medium text-red-600 mb-2">Failed to Load Grant Data</div>
          <p className="text-sm mb-4">Unable to retrieve grant timeline information</p>
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

  if (!timelineData || timelineData.grants.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500">
          <Target className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <div className="text-lg font-medium mb-2">No Grants Found</div>
          <p className="text-sm">Start tracking grant applications to see timeline data</p>
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
            {timelineData.totalGrants}
          </div>
          <div className="text-sm text-gray-600">Total Grants</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {timelineData.activeGrants}
          </div>
          <div className="text-sm text-gray-600">Active</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-red-600">
            {timelineData.overdueGrants}
          </div>
          <div className="text-sm text-gray-600">Overdue</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">
            {timelineData.upcomingDeadlines}
          </div>
          <div className="text-sm text-gray-600">Due Soon</div>
        </Card>
      </div>

      {/* Grant Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Grant Timeline</h3>
          <div className="flex items-center space-x-4 text-xs">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span>90-day</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span>60-day</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span>30-day</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>Submission</span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {timelineData.grants.map(grant => (
            <GrantCard key={grant.id} grant={grant} />
          ))}
        </div>
      </div>
    </div>
  );
}