import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/hooks/useTenant";
import { memo, useMemo } from "react";
import { Calendar, Clock, Target, AlertTriangle, CheckCircle, Circle } from "lucide-react";
import { format, parseISO, differenceInDays, isBefore } from "date-fns";

interface Grant {
  id: string;
  title: string;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected';
  deadline: string;
  amount: number;
  sponsor: string;
  milestones: {
    id: string;
    title: string;
    date: string;
    completed: boolean;
    type: '90_day' | '60_day' | '30_day' | 'submission';
  }[];
}

const GrantTimeline = memo(function GrantTimeline() {
  const { selectedTenant } = useTenant();

  const { data: grants, isLoading, error } = useQuery({
    queryKey: ["/api/dashboard/grants"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/grants", {
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

  const timelineData = useMemo(() => {
    if (!grants?.length) return [];
    
    return grants
      .filter((grant: Grant) => grant.status !== 'rejected')
      .sort((a: Grant, b: Grant) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .slice(0, 8);
  }, [grants]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'under_review': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'under_review': return <Clock className="h-4 w-4" />;
      case 'submitted': return <Target className="h-4 w-4" />;
      default: return <Circle className="h-4 w-4" />;
    }
  };

  const getDaysUntilDeadline = (deadline: string) => {
    const days = differenceInDays(parseISO(deadline), new Date());
    return days;
  };

  const isOverdue = (deadline: string) => {
    return isBefore(parseISO(deadline), new Date());
  };

  if (isLoading) {
    return (
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Grant Status Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 border rounded-lg animate-pulse">
                <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                </div>
                <div className="w-16 h-6 bg-gray-300 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Grant Status Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Unable to load grant timeline</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!timelineData.length) {
    return (
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Grant Status Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Target className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No active grants</p>
              <p className="text-sm mt-1">Create your first grant to see timeline</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Grant Status Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {timelineData.map((grant: Grant, index: number) => {
            const daysUntil = getDaysUntilDeadline(grant.deadline);
            const overdue = isOverdue(grant.deadline);
            
            return (
              <div
                key={grant.id}
                className={`relative flex items-start gap-3 p-3 border rounded-lg transition-colors hover:bg-gray-50 ${
                  overdue ? 'border-red-200 bg-red-50' : ''
                }`}
              >
                {/* Timeline connector */}
                {index < timelineData.length - 1 && (
                  <div className="absolute left-4 top-12 w-0.5 h-8 bg-gray-200"></div>
                )}
                
                {/* Status indicator */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  grant.status === 'approved' ? 'bg-green-100 text-green-600' :
                  grant.status === 'under_review' ? 'bg-yellow-100 text-yellow-600' :
                  grant.status === 'submitted' ? 'bg-blue-100 text-blue-600' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {getStatusIcon(grant.status)}
                </div>
                
                {/* Grant details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{grant.title}</h4>
                      <p className="text-xs text-gray-600 mt-1">
                        {grant.sponsor} • ${grant.amount.toLocaleString()}
                      </p>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1">
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${getStatusColor(grant.status)}`}
                      >
                        {grant.status.replace('_', ' ')}
                      </Badge>
                      
                      <div className={`text-xs flex items-center gap-1 ${
                        overdue ? 'text-red-600' :
                        daysUntil <= 7 ? 'text-orange-600' :
                        'text-gray-600'
                      }`}>
                        <Clock className="h-3 w-3" />
                        {overdue ? (
                          <span className="font-medium">Overdue</span>
                        ) : (
                          <span>{daysUntil} days</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Milestones */}
                  {grant.milestones && grant.milestones.length > 0 && (
                    <div className="mt-2 flex gap-1">
                      {grant.milestones.slice(0, 4).map((milestone) => (
                        <div
                          key={milestone.id}
                          className={`w-2 h-2 rounded-full ${
                            milestone.completed 
                              ? 'bg-green-500' 
                              : isBefore(parseISO(milestone.date), new Date())
                              ? 'bg-red-500'
                              : 'bg-gray-300'
                          }`}
                          title={`${milestone.title} - ${format(parseISO(milestone.date), 'MMM d')}`}
                        />
                      ))}
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500 mt-1">
                    Due: {format(parseISO(grant.deadline), 'MMM d, yyyy')}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {grants && grants.length > timelineData.length && (
          <div className="mt-4 pt-4 border-t text-center">
            <p className="text-xs text-gray-500">
              Showing {timelineData.length} of {grants.length} grants
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export default GrantTimeline;