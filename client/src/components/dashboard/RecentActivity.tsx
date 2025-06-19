/**
 * Recent Activity Component
 * Displays recent platform activity with timeline visualization and activity type classification
 * Based on attached asset specifications with comprehensive activity tracking
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { 
  Clock,
  User,
  FileText,
  Award,
  Users,
  Calendar,
  MessageCircle,
  CheckCircle,
  AlertTriangle,
  Plus,
  Edit,
  Trash2,
  Upload
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface ActivityItem {
  id: string;
  type: 'grant' | 'sponsor' | 'relationship' | 'content' | 'system' | 'user';
  action: 'created' | 'updated' | 'deleted' | 'submitted' | 'approved' | 'rejected' | 'uploaded' | 'scheduled';
  title: string;
  description: string;
  timestamp: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  metadata?: {
    entityId?: string;
    entityType?: string;
    amount?: number;
    status?: string;
    priority?: 'low' | 'medium' | 'high';
  };
}

interface RecentActivityData {
  activities: ActivityItem[];
  totalCount: number;
  todayCount: number;
  weekCount: number;
}

const activityIcons = {
  grant: Award,
  sponsor: Users,
  relationship: User,
  content: Calendar,
  system: CheckCircle,
  user: User
};

const actionIcons = {
  created: Plus,
  updated: Edit,
  deleted: Trash2,
  submitted: FileText,
  approved: CheckCircle,
  rejected: AlertTriangle,
  uploaded: Upload,
  scheduled: Calendar
};

const activityColors = {
  grant: 'bg-green-100 text-green-700 border-green-200',
  sponsor: 'bg-blue-100 text-blue-700 border-blue-200',
  relationship: 'bg-purple-100 text-purple-700 border-purple-200',
  content: 'bg-orange-100 text-orange-700 border-orange-200',
  system: 'bg-gray-100 text-gray-700 border-gray-200',
  user: 'bg-indigo-100 text-indigo-700 border-indigo-200'
};

const priorityColors = {
  low: 'text-green-600',
  medium: 'text-yellow-600',
  high: 'text-red-600'
};

const RecentActivitySkeleton = () => (
  <div className="space-y-4">
    {[1, 2, 3, 4, 5].map(i => (
      <div key={i} className="flex items-start space-x-3 p-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    ))}
  </div>
);

const ActivityIcon: React.FC<{ activity: ActivityItem }> = ({ activity }) => {
  const TypeIcon = activityIcons[activity.type];
  const ActionIcon = actionIcons[activity.action];

  return (
    <div className="relative">
      <div className={cn(
        "w-10 h-10 rounded-full border-2 flex items-center justify-center",
        activityColors[activity.type]
      )}>
        <TypeIcon size={16} />
      </div>
      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full border-2 border-gray-200 flex items-center justify-center">
        <ActionIcon size={10} className="text-gray-600" />
      </div>
    </div>
  );
};

const ActivityItem: React.FC<{ activity: ActivityItem; isLast: boolean }> = ({ activity, isLast }) => {
  const timeAgo = formatDistanceToNow(parseISO(activity.timestamp), { addSuffix: true });

  return (
    <div className="relative">
      <div className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
        <ActivityIcon activity={activity} />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {activity.title}
                </p>
                <Badge variant="outline" className="text-xs capitalize">
                  {activity.action}
                </Badge>
                {activity.metadata?.priority && (
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    activity.metadata.priority === 'high' ? 'bg-red-500' :
                    activity.metadata.priority === 'medium' ? 'bg-yellow-500' :
                    'bg-green-500'
                  )} />
                )}
              </div>
              
              <p className="text-sm text-gray-600 mb-2">{activity.description}</p>
              
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <div className="flex items-center space-x-1">
                  <Avatar className="w-4 h-4">
                    <AvatarImage src={activity.user.avatar} />
                    <AvatarFallback className="text-xs">
                      {activity.user.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <span>{activity.user.name}</span>
                </div>
                
                <div className="flex items-center space-x-1">
                  <Clock size={10} />
                  <span>{timeAgo}</span>
                </div>
                
                {activity.metadata?.amount && (
                  <span className="font-medium text-green-600">
                    ${activity.metadata.amount.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {!isLast && (
        <div className="absolute left-8 top-16 w-px h-4 bg-gray-200" />
      )}
    </div>
  );
};

export default function RecentActivity() {
  const { data: activityData, isLoading, error, refetch } = useQuery<RecentActivityData>({
    queryKey: ['/api/dashboard/activity'],
    refetchInterval: 180000, // Emergency optimization: 30s → 180s to reduce memory pressure
    staleTime: 90000, // Emergency optimization: 15s → 90s
  });

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Recent Activity</h3>
          <Skeleton className="h-4 w-16" />
        </div>
        <RecentActivitySkeleton />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500">
          <div className="text-lg font-medium text-red-600 mb-2">Failed to Load Activity</div>
          <p className="text-sm mb-4">Unable to retrieve recent activity data</p>
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

  if (!activityData || activityData.activities.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500">
          <Clock className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <div className="text-lg font-medium mb-2">No Recent Activity</div>
          <p className="text-sm">Activity will appear here as you use the platform</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Recent Activity</h3>
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <span>Today: {activityData.todayCount}</span>
          <span>Week: {activityData.weekCount}</span>
        </div>
      </div>

      {/* Activity Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-lg font-bold text-blue-600">
            {activityData.activities.filter(a => a.type === 'grant').length}
          </div>
          <div className="text-xs text-gray-600">Grant Updates</div>
        </div>
        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <div className="text-lg font-bold text-purple-600">
            {activityData.activities.filter(a => a.type === 'relationship').length}
          </div>
          <div className="text-xs text-gray-600">Relationships</div>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-lg font-bold text-green-600">
            {activityData.activities.filter(a => a.type === 'sponsor').length}
          </div>
          <div className="text-xs text-gray-600">Sponsors</div>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="space-y-1 max-h-96 overflow-y-auto">
        {activityData.activities.map((activity, index) => (
          <ActivityItem 
            key={activity.id} 
            activity={activity} 
            isLast={index === activityData.activities.length - 1}
          />
        ))}
      </div>

      {activityData.totalCount > activityData.activities.length && (
        <div className="text-center mt-4 pt-4 border-t">
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View All {activityData.totalCount} Activities
          </button>
        </div>
      )}
    </Card>
  );
}