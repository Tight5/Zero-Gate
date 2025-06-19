import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Activity, RefreshCw, Download, Square } from "lucide-react";

export default function SystemResources() {
  const { data: metrics, isLoading, refetch } = useQuery({
    queryKey: ["/api/dashboard/metrics"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/metrics", {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
    refetchInterval: 120000, // Ultra emergency optimization: 30s → 120s to reduce memory pressure
  });

  const getProgressColor = (value: number) => {
    if (value >= 80) return "bg-red-500";
    if (value >= 60) return "bg-yellow-500";
    return "bg-green-500";
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
              <div key={i} className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-20"></div>
                <div className="h-2 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* System Resources */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            System Resources
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">CPU Usage</span>
              <span className="font-medium">{metrics?.cpuUsage || 0}%</span>
            </div>
            <Progress 
              value={metrics?.cpuUsage || 0} 
              className="h-2"
            />
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Memory</span>
              <span className="font-medium">{metrics?.memoryUsage || 0}%</span>
            </div>
            <Progress 
              value={metrics?.memoryUsage || 0} 
              className="h-2"
            />
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Disk I/O</span>
              <span className="font-medium">{metrics?.diskIO || 0}%</span>
            </div>
            <Progress 
              value={metrics?.diskIO || 0} 
              className="h-2"
            />
          </div>

          {metrics?.lastUpdated && (
            <div className="text-xs text-gray-500 mt-3">
              Last updated: {new Date(metrics.lastUpdated).toLocaleTimeString()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={() => refetch()}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Metrics
          </Button>
          <Button variant="outline" className="w-full justify-start">
            <Download className="w-4 h-4 mr-2" />
            Download Logs
          </Button>
          <Button 
            variant="destructive" 
            className="w-full justify-start"
          >
            <Square className="w-4 h-4 mr-2" />
            Emergency Stop
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
