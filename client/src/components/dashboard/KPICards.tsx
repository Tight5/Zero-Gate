import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Target, Network, Calendar, TrendingUp } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";

export default function KPICards() {
  const { selectedTenant } = useTenant();

  const { data: kpis, isLoading } = useQuery({
    queryKey: ["/api/dashboard/kpis"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/kpis", {
        credentials: "include",
        headers: {
          "X-Tenant-ID": selectedTenant,
        },
      });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
  });

  const cards = [
    {
      title: "Total Sponsors",
      value: kpis?.sponsors || 0,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      description: "Active sponsor relationships",
    },
    {
      title: "Active Grants",
      value: kpis?.grants || 0,
      icon: Target,
      color: "text-green-600",
      bgColor: "bg-green-50",
      description: "Grant applications in progress",
    },
    {
      title: "Network Connections",
      value: kpis?.relationships || 0,
      icon: Network,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      description: "Mapped relationships",
    },
    {
      title: "Content Items",
      value: kpis?.contentItems || 0,
      icon: Calendar,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      description: "Scheduled content pieces",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-5 w-5 bg-gray-200 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-32"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {card.title}
              </CardTitle>
              <div className={`${card.bgColor} p-2 rounded-lg`}>
                <Icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {card.value.toLocaleString()}
              </div>
              <p className="text-xs text-gray-500">
                {card.description}
              </p>
              <div className="flex items-center mt-2 text-xs text-green-600">
                <TrendingUp className="h-3 w-3 mr-1" />
                <span>+12% from last month</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
