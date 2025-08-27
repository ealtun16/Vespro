import CostAnalysisTable from "@/components/tables/cost-analysis-table";

export default function CostAnalysis() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">
          Cost Analysis
        </h1>
        <p className="mt-2 text-sm text-muted-foreground" data-testid="text-page-description">
          View and manage cost analysis reports for tank projects
        </p>
      </div>

      <CostAnalysisTable />
    </div>
  );
}
