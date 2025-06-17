import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Calendar, 
  CheckCircle, 
  Circle, 
  Clock,
  Target,
  AlertTriangle
} from "lucide-react";

interface GrantTimelineProps {
  grantId: string;
  tenantId: string;
}

export default function GrantTimeline({ grantId, tenantId }: GrantTimelineProps) {
  const { data: timeline, isLoading } = useQuery({
    queryKey: ["/api/grants", grantId, "timeline"],
    queryFn: async () => {
      const res = await fetch(`/api/grants/${grantId}/timeline`, {
        credentials: "include",
        headers: {
          "X-Tenant-ID": tenantId,
        },
      });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
    enabled: !!grantId,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return CheckCircle;
      case "in_progress": return Clock;
      default: return Circle;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "text-green-600";
      case "in_progress": return "text-blue-600";
      default: return "text-gray-400";
    }
  };

  const getProgressPercentage = () => {
    if (!timeline?.milestones) return 0;
    const completed = timeline.milestones.filter((m: any) => m.status === "completed").length;
    return (completed / timeline.milestones.length) * 100;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-5 bg-gray-200 rounded w-32"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!timeline) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No timeline data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Grant Timeline
          </CardTitle>
          {timeline.days_remaining !== null && (
            <Badge variant={timeline.days_remaining < 30 ? "destructive" : "secondary"}>
              {timeline.days_remaining > 0 
                ? `${timeline.days_remaining} days left`
                : "Deadline passed"
              }
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Grant Overview */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">{timeline.grant_name}</h3>
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Submission Deadline:</span>
            <span className="font-medium">
              {timeline.submission_deadline 
                ? formatDate(timeline.submission_deadline)
                : "Not set"
              }
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between text-sm mb-1">
              <span>Progress</span>
              <span>{Math.round(getProgressPercentage())}%</span>
            </div>
            <Progress value={getProgressPercentage()} className="h-2" />
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-6">
          {timeline.milestones && timeline.milestones.length > 0 ? (
            timeline.milestones.map((milestone: any, index: number) => {
              const StatusIcon = getStatusIcon(milestone.status);
              const isLast = index === timeline.milestones.length - 1;
              
              return (
                <div key={milestone.milestone_id} className="relative">
                  {/* Timeline connector */}
                  {!isLast && (
                    <div className="absolute left-4 top-8 w-0.5 h-16 bg-gray-200"></div>
                  )}
                  
                  <div className="flex items-start space-x-4">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      milestone.status === "completed" 
                        ? "bg-green-100" 
                        : milestone.status === "in_progress"
                        ? "bg-blue-100"
                        : "bg-gray-100"
                    }`}>
                      <StatusIcon className={`w-5 h-5 ${getStatusColor(milestone.status)}`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900">
                          {milestone.title}
                        </h4>
                        <span className="text-xs text-gray-500">
                          {formatDate(milestone.date)}
                        </span>
                      </div>
                      
                      {milestone.tasks && milestone.tasks.length > 0 && (
                        <div className="mt-2">
                          <ul className="text-xs text-gray-600 space-y-1">
                            {milestone.tasks.slice(0, 3).map((task: string, taskIndex: number) => (
                              <li key={taskIndex} className="flex items-center">
                                <Circle className="w-2 h-2 mr-2 text-gray-400" />
                                {task}
                              </li>
                            ))}
                            {milestone.tasks.length > 3 && (
                              <li className="text-gray-400 italic">
                                +{milestone.tasks.length - 3} more tasks
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No milestones generated yet</p>
              <Button variant="outline" size="sm" className="mt-2">
                Generate Timeline
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
