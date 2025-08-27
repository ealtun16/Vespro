import { useQuery } from "@tanstack/react-query";
import StatsCards from "@/components/cards/stats-cards";
import FileUpload from "@/components/upload/file-upload";
import CostAnalysisTable from "@/components/tables/cost-analysis-table";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: costAnalysesData, isLoading: analysesLoading } = useQuery({
    queryKey: ["/api/cost-analyses", { page: 1, limit: 5 }],
  });

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">
          Tank Cost Analysis Dashboard
        </h1>
        <p className="mt-2 text-sm text-muted-foreground" data-testid="text-page-description">
          Manage and analyze industrial tank cost reports
        </p>
      </div>

      {/* Stats Cards */}
      <StatsCards stats={stats} loading={statsLoading} />

      {/* File Upload Section */}
      <FileUpload />

      {/* Recent Cost Analyses */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-foreground mb-4" data-testid="text-recent-analyses">
          Recent Cost Analysis Reports
        </h2>
        <CostAnalysisTable 
          data={costAnalysesData} 
          loading={analysesLoading} 
          showPagination={false}
        />
      </div>

      {/* Recent Activity */}
      <div className="mt-8 bg-card rounded-lg border border-border p-6 card-shadow">
        <h2 className="text-lg font-semibold text-foreground mb-4" data-testid="text-recent-activity">
          Recent Activity
        </h2>
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-success rounded-full"></div>
            <span className="text-sm text-foreground" data-testid="text-activity-1">
              New cost analysis report uploaded: TCA-2024-005
            </span>
            <span className="text-xs text-muted-foreground ml-auto" data-testid="text-activity-time-1">
              2 hours ago
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-accent rounded-full"></div>
            <span className="text-sm text-foreground" data-testid="text-activity-2">
              Tank specification updated: Storage Tank 3000L
            </span>
            <span className="text-xs text-muted-foreground ml-auto" data-testid="text-activity-time-2">
              4 hours ago
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-primary rounded-full"></div>
            <span className="text-sm text-foreground" data-testid="text-activity-3">
              Excel export completed: Monthly_Cost_Report.xlsx
            </span>
            <span className="text-xs text-muted-foreground ml-auto" data-testid="text-activity-time-3">
              6 hours ago
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-secondary rounded-full"></div>
            <span className="text-sm text-foreground" data-testid="text-activity-4">
              System backup completed successfully
            </span>
            <span className="text-xs text-muted-foreground ml-auto" data-testid="text-activity-time-4">
              8 hours ago
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
