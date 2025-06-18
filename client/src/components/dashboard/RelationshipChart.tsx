import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, RadialBarChart, RadialBar, Legend, PieChart, Pie, Cell } from "recharts";
import { useTenant } from "@/hooks/useTenant";
import { memo, useMemo } from "react";
import { Network, Users, TrendingUp } from "lucide-react";

interface RelationshipData {
  id: string;
  name: string;
  strength: number;
  type: string;
  connections: number;
}

const RelationshipChart = memo(function RelationshipChart() {
  const { selectedTenant } = useTenant();

  const { data: relationships, isLoading, error } = useQuery({
    queryKey: ["/api/dashboard/relationships"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/relationships", {
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

  const chartData = useMemo(() => {
    if (!relationships?.length) return [];
    
    return relationships.slice(0, 6).map((rel: RelationshipData, index: number) => ({
      name: rel.name,
      strength: rel.strength,
      fill: [
        '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', 
        '#8dd1e1', '#d084d0'
      ][index % 6]
    }));
  }, [relationships]);

  const strengthData = useMemo(() => {
    if (!relationships?.length) return [];
    
    const strengthCategories = {
      strong: relationships.filter((r: RelationshipData) => r.strength >= 80).length,
      medium: relationships.filter((r: RelationshipData) => r.strength >= 50 && r.strength < 80).length,
      weak: relationships.filter((r: RelationshipData) => r.strength < 50).length,
    };

    return [
      { name: 'Strong (80%+)', value: strengthCategories.strong, fill: '#22c55e' },
      { name: 'Medium (50-79%)', value: strengthCategories.medium, fill: '#f59e0b' },
      { name: 'Weak (<50%)', value: strengthCategories.weak, fill: '#ef4444' },
    ].filter(item => item.value > 0);
  }, [relationships]);

  if (isLoading) {
    return (
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Relationship Strength
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
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
            <Network className="h-5 w-5" />
            Relationship Strength
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Unable to load relationship data</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!relationships?.length) {
    return (
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Relationship Strength
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Network className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No relationship data available</p>
              <p className="text-sm mt-1">Start mapping relationships to see insights</p>
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
          <Network className="h-5 w-5" />
          Relationship Strength
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-64">
          <div className="flex flex-col">
            <h4 className="text-sm font-medium mb-2">Strength Distribution</h4>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={strengthData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  dataKey="value"
                >
                  {strengthData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="flex flex-col">
            <h4 className="text-sm font-medium mb-2">Top Relationships</h4>
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart 
                cx="50%" 
                cy="50%" 
                innerRadius="20%" 
                outerRadius="80%" 
                data={chartData}
              >
                <RadialBar dataKey="strength" cornerRadius={10} fill="#8884d8" />
                <Legend />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {relationships && relationships.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                Total Relationships: {relationships.length}
              </span>
              <span>
                Avg Strength: {Math.round(relationships.reduce((sum: number, r: RelationshipData) => sum + r.strength, 0) / relationships.length)}%
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export default RelationshipChart;