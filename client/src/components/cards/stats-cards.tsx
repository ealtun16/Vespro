import { Card, CardContent } from "@/components/ui/card";
import { FileText, Factory, DollarSign, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface StatsCardsProps {
  stats: any;
  loading: boolean;
}

export default function StatsCards({ stats, loading }: StatsCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="card-shadow">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Skeleton className="w-8 h-8 rounded-md" />
                <div className="ml-4 space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-12" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statItems = [
    {
      label: "Total Reports",
      value: stats?.totalReports || 0,
      icon: FileText,
      bgColor: "bg-primary",
      testId: "stat-total-reports"
    },
    {
      label: "Tank Models",
      value: stats?.tankModels || 0,
      icon: Factory,
      bgColor: "bg-accent",
      testId: "stat-tank-models"
    },
    {
      label: "Avg. Cost",
      value: `$${stats?.averageCost?.toLocaleString() || '0'}`,
      icon: DollarSign,
      bgColor: "bg-success",
      testId: "stat-avg-cost"
    },
    {
      label: "This Month",
      value: stats?.monthlyReports || 0,
      icon: Calendar,
      bgColor: "bg-secondary",
      testId: "stat-monthly-reports"
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statItems.map((item) => (
        <Card key={item.label} className="card-shadow">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className={`w-8 h-8 ${item.bgColor} rounded-md flex items-center justify-center`}>
                  <item.icon className="text-white h-4 w-4" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
                <p className="text-2xl font-bold text-foreground" data-testid={item.testId}>
                  {item.value}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
