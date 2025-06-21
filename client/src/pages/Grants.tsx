import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
// Layout components temporarily disabled for memory optimization
import GrantTimeline from "@/components/grants/GrantTimeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Target, Calendar, DollarSign } from "lucide-react";

export default function Grants() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { selectedTenant } = useTenant();
  const [selectedGrant, setSelectedGrant] = useState<any>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: grants = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/grants"],
    queryFn: async () => {
      const res = await fetch("/api/grants", {
        credentials: "include",
        headers: {
          "X-Tenant-ID": selectedTenant,
        },
      });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "awarded": return "bg-green-100 text-green-800";
      case "submitted": return "bg-blue-100 text-blue-800";
      case "in_progress": return "bg-yellow-100 text-yellow-800";
      case "draft": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const getDaysRemaining = (deadline: string) => {
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diff = deadlineDate.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Layout components temporarily disabled for memory optimization */}
      <div className="flex">
        <main className="flex-1 p-4">
          <div className="p-8">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Grant Management</h1>
                <p className="text-gray-600">Track grant applications and manage submission timelines</p>
              </div>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Add Grant
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Grants List */}
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">Grant Applications</h2>
                
                {isLoading ? (
                  <div className="space-y-4">
                    {[...Array(4)].map((_, i) => (
                      <Card key={i} className="animate-pulse">
                        <CardHeader>
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="h-3 bg-gray-200 rounded"></div>
                            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : grants && grants.length > 0 ? (
                  <div className="space-y-4">
                    {grants.map((grant: any) => (
                      <Card 
                        key={grant.id} 
                        className={`cursor-pointer transition-all hover:shadow-lg ${
                          selectedGrant?.id === grant.id ? 'ring-2 ring-primary' : ''
                        }`}
                        onClick={() => setSelectedGrant(grant)}
                      >
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg">{grant.name}</CardTitle>
                              <p className="text-sm text-gray-500">
                                {grant.amount && formatCurrency(grant.amount)}
                              </p>
                            </div>
                            <Badge className={getStatusColor(grant.status || 'draft')}>
                              {grant.status ? grant.status.replace('_', ' ') : 'Draft'}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {grant.submissionDeadline && (
                              <div className="flex items-center text-sm text-gray-600">
                                <Calendar className="w-4 h-4 mr-2" />
                                Deadline: {new Date(grant.submissionDeadline).toLocaleDateString()}
                                <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">
                                  {getDaysRemaining(grant.submissionDeadline)} days
                                </span>
                              </div>
                            )}
                            {grant.amount && (
                              <div className="flex items-center text-sm text-gray-600">
                                <DollarSign className="w-4 h-4 mr-2" />
                                {formatCurrency(grant.amount)}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="text-center py-12">
                      <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No grants yet</h3>
                      <p className="text-gray-500 mb-4">
                        Start tracking your grant applications and submission timelines.
                      </p>
                      <Button className="bg-primary hover:bg-primary/90">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Your First Grant
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Grant Timeline */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Grant Timeline</h2>
                {selectedGrant ? (
                  <GrantTimeline grant={{
                    ...selectedGrant,
                    title: selectedGrant.name,
                    submissionDeadline: new Date(selectedGrant.submissionDeadline),
                    organization: selectedGrant.organization || 'Unknown Organization',
                    milestones: selectedGrant.milestones || []
                  }} />
                ) : (
                  <Card>
                    <CardContent className="text-center py-12">
                      <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Grant</h3>
                      <p className="text-gray-500">
                        Choose a grant from the list to view its timeline and milestones.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
