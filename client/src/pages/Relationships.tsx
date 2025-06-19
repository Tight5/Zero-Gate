import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
// Layout components temporarily disabled for memory optimization
import RelationshipGraph from "@/components/relationships/RelationshipGraph";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Network, Search, Plus } from "lucide-react";

export default function Relationships() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { selectedTenant } = useTenant();
  const [searchSource, setSearchSource] = useState("");
  const [searchTarget, setSearchTarget] = useState("");
  const [pathResult, setPathResult] = useState<any>(null);

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

  const { data: relationships = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/relationships"],
    queryFn: async () => {
      const res = await fetch("/api/relationships", {
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

  const handlePathSearch = async () => {
    if (!searchSource || !searchTarget) {
      toast({
        title: "Missing Information",
        description: "Please enter both source and target for path discovery",
        variant: "destructive",
      });
      return;
    }

    try {
      const res = await fetch("/api/relationships/discover-path", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tenant-ID": selectedTenant,
        },
        credentials: "include",
        body: JSON.stringify({
          source_id: searchSource,
          target_id: searchTarget,
        }),
      });

      const result = await res.json();
      setPathResult(result);

      if (result.path_found) {
        toast({
          title: "Path Found!",
          description: `Found connection in ${result.degrees_of_separation} degrees`,
        });
      } else {
        toast({
          title: "No Path Found",
          description: "No connection found within 7 degrees of separation",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to discover relationship path",
        variant: "destructive",
      });
    }
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
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 ml-64 pt-16">
          <div className="p-8">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Relationship Mapping</h1>
                <p className="text-gray-600">Discover connections and build strategic networks</p>
              </div>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Add Relationship
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Path Discovery */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Search className="w-5 h-5 mr-2" />
                      Path Discovery
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="source">Source Contact</Label>
                      <Input
                        id="source"
                        placeholder="e.g., john.doe@example.com"
                        value={searchSource}
                        onChange={(e) => setSearchSource(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="target">Target Contact</Label>
                      <Input
                        id="target"
                        placeholder="e.g., jane.smith@example.com"
                        value={searchTarget}
                        onChange={(e) => setSearchTarget(e.target.value)}
                      />
                    </div>
                    <Button 
                      onClick={handlePathSearch}
                      className="w-full bg-primary hover:bg-primary/90"
                    >
                      <Search className="w-4 h-4 mr-2" />
                      Find Connection
                    </Button>
                  </CardContent>
                </Card>

                {/* Path Result */}
                {pathResult && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Connection Result</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {pathResult.path_found ? (
                        <div className="space-y-3">
                          <div className="flex items-center text-sm">
                            <span className="font-medium text-green-600">
                              {pathResult.degrees_of_separation} degrees of separation
                            </span>
                          </div>
                          <div className="space-y-2">
                            <Label>Connection Path:</Label>
                            {pathResult.path.map((contact: string, index: number) => (
                              <div key={index} className="text-sm">
                                {index > 0 && <span className="text-gray-400">↓</span>}
                                <div className="bg-blue-50 px-2 py-1 rounded text-blue-800">
                                  {contact}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <Network className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">No connection found</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Relationship Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle>Network Stats</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Relationships</span>
                        <span className="font-medium">
                          {relationships ? relationships.length : 0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Verified</span>
                        <span className="font-medium">
                          {relationships ? relationships.filter((r: any) => r.verified).length : 0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Strong Connections</span>
                        <span className="font-medium">
                          {relationships ? relationships.filter((r: any) => (r.strength || 1) >= 4).length : 0}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Relationship Graph */}
              <div className="lg:col-span-2">
                <Card className="h-[700px]">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Network className="w-5 h-5 mr-2" />
                      Relationship Network
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-full">
                    {isLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                          <p className="text-gray-600">Loading network...</p>
                        </div>
                      </div>
                    ) : relationships && relationships.length > 0 ? (
                      <RelationshipGraph 
                        relationships={relationships} 
                        highlightPath={pathResult?.path_found ? pathResult.path : null}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <Network className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No relationships yet</h3>
                          <p className="text-gray-500 mb-4">
                            Start building your relationship network by adding connections.
                          </p>
                          <Button className="bg-primary hover:bg-primary/90">
                            <Plus className="w-4 h-4 mr-2" />
                            Add First Relationship
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
