import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/hooks/useTenant";
import { memo, useMemo } from "react";
import { 
  Activity, 
  Users, 
  Target, 
  Network, 
  Calendar, 
  FileText, 
  Mail, 
  Phone,
  MessageSquare,
  Clock
} from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";

interface ActivityItem {
  id: string;
  type: 'sponsor_added' | 'grant_submitted' | 'relationship_mapped' | 'content_created' | 'meeting_scheduled' | 'email_sent' | 'call_completed';
  title: string;
  description: string;
  timestamp: string;
  user: string;
  metadata?: {
    entityId?: string;
    entityName?: string;
    amount?: number;
    status?: string;
  };
}

const RecentActivity = memo(function RecentActivity() {
  const { selectedTenant } = useTenant();

  const { data: activities, isLoading, error } = useQuery({
    queryKey: ["/api/dashboard/activities"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/activities", {
        credentials: "include",
        headers: {
          "X-Tenant-ID": selectedTenant,
        },
      });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
    staleTime: 30 * 1000,
    gcTime: 60 * 1000,
  });

  const sortedActivities = useMemo(() => {
    if (!activities?.length) return [];
    return activities
      .sort((a: ActivityItem, b: ActivityItem) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, 10);
  }, [activities]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'sponsor_added': return <Users className="h-4 w-4" />;
      case 'grant_submitted': return <Target className="h-4 w-4" />;
      case 'relationship_mapped': return <Network className="h-4 w-4" />;
      case 'content_created': return <FileText className="h-4 w-4" />;
      case 'meeting_scheduled': return <Calendar className="h-4 w-4" />;
      case 'email_sent': return <Mail className="h-4 w-4" />;
      case 'call_completed': return <Phone className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'sponsor_added': return 'text-blue-600 bg-blue-50';
      case 'grant_submitted': return 'text-green-600 bg-green-50';
      case 'relationship_mapped': return 'text-purple-600 bg-purple-50';
      case 'content_created': return 'text-orange-600 bg-orange-50';
      case 'meeting_scheduled': return 'text-indigo-600 bg-indigo-50';
      case 'email_sent': return 'text-cyan-600 bg-cyan-50';
      case 'call_completed': return 'text-pink-600 bg-pink-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'sponsor_added': return 'Sponsor';
      case 'grant_submitted': return 'Grant';
      case 'relationship_mapped': return 'Network';
      case 'content_created': return 'Content';
      case 'meeting_scheduled': return 'Meeting';
      case 'email_sent': return 'Email';
      case 'call_completed': return 'Call';
      default: return 'Activity';
    }
  };

  if (isLoading) {
    return (
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-start gap-3 animate-pulse">
                <div className="w-8 h-8 bg-gray-300 rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                </div>
                <div className="w-12 h-4 bg-gray-300 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Unable to load activities</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!sortedActivities.length) {
    return (
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No recent activity</p>
              <p className="text-sm mt-1">Activity will appear here as you work</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {sortedActivities.map((activity: ActivityItem, index: number) => (
            <div key={activity.id} className="relative flex items-start gap-3">
              {/* Timeline connector */}
              {index < sortedActivities.length - 1 && (
                <div className="absolute left-4 top-8 w-0.5 h-8 bg-gray-200"></div>
              )}
              
              {/* Activity icon */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${getActivityColor(activity.type)}`}>
                {getActivityIcon(activity.type)}
              </div>
              
              {/* Activity details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-xs">
                        {getTypeLabel(activity.type)}
                      </Badge>
                      {activity.metadata?.amount && (
                        <span className="text-xs font-medium text-green-600">
                          ${activity.metadata.amount.toLocaleString()}
                        </span>
                      )}
                    </div>
                    
                    <h4 className="font-medium text-sm leading-tight mb-1">
                      {activity.title}
                    </h4>
                    
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {activity.description}
                    </p>
                    
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                      <span>{activity.user}</span>
                      <span>•</span>
                      <span>{formatDistanceToNow(parseISO(activity.timestamp), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
                
                {activity.metadata?.status && (
                  <Badge 
                    variant="outline" 
                    className={`text-xs mt-2 ${
                      activity.metadata.status === 'completed' ? 'border-green-200 text-green-700' :
                      activity.metadata.status === 'pending' ? 'border-yellow-200 text-yellow-700' :
                      activity.metadata.status === 'failed' ? 'border-red-200 text-red-700' :
                      'border-gray-200 text-gray-700'
                    }`}
                  >
                    {activity.metadata.status}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {activities && activities.length > sortedActivities.length && (
          <div className="mt-4 pt-4 border-t text-center">
            <button className="text-xs text-blue-600 hover:text-blue-800 font-medium">
              View all activity ({activities.length})
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export default RecentActivity;