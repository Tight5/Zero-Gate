import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Activity, 
  Users, 
  Target, 
  Network, 
  CheckCircle, 
  AlertTriangle,
  Info
} from "lucide-react";

export default function RecentActivity() {
  // Mock activity data - in real app this would come from API
  const activities = [
    {
      id: 1,
      type: "sponsor",
      action: "created",
      description: "New sponsor 'Tech Foundation' added",
      timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
      status: "success",
      icon: Users,
    },
    {
      id: 2,
      type: "grant",
      action: "milestone",
      description: "Grant 'Education Initiative' milestone completed",
      timestamp: new Date(Date.now() - 1000 * 60 * 45), // 45 minutes ago
      status: "success",
      icon: Target,
    },
    {
      id: 3,
      type: "relationship",
      action: "discovered",
      description: "New relationship path discovered (3 degrees)",
      timestamp: new Date(Date.now() - 1000 * 60 * 90), // 1.5 hours ago
      status: "info",
      icon: Network,
    },
    {
      id: 4,
      type: "system",
      action: "warning",
      description: "High memory usage detected (85%)",
      timestamp: new Date(Date.now() - 1000 * 60 * 120), // 2 hours ago
      status: "warning",
      icon: AlertTriangle,
    },
    {
      id: 5,
      type: "grant",
      action: "created",
      description: "New grant application 'Community Health' started",
      timestamp: new Date(Date.now() - 1000 * 60 * 180), // 3 hours ago
      status: "info",
      icon: Target,
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success": return "bg-green-100 text-green-800";
      case "warning": return "bg-yellow-100 text-yellow-800";
      case "error": return "bg-red-100 text-red-800";
      default: return "bg-blue-100 text-blue-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success": return CheckCircle;
      case "warning": return AlertTriangle;
      case "error": return AlertTriangle;
      default: return Info;
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            Recent Activity
          </CardTitle>
          <Button variant="outline" size="sm">
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => {
            const Icon = activity.icon;
            const StatusIcon = getStatusIcon(activity.status);
            
            return (
              <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <Icon className="w-4 h-4 text-gray-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.description}
                    </p>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(activity.status)}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {activity.status}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatTimestamp(activity.timestamp)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* System Health Summary */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-green-600">98.5%</div>
              <div className="text-xs text-gray-500">Uptime</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-blue-600">1.2s</div>
              <div className="text-xs text-gray-500">Avg Response</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-purple-600">847</div>
              <div className="text-xs text-gray-500">API Calls/hr</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
