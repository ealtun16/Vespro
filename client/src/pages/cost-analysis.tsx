import CostAnalysisTable from "@/components/tables/cost-analysis-table";
import { useTranslation } from "@/lib/i18n";

export default function CostAnalysis() {
  const { t } = useTranslation();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">
          {t('costAnalysis.title')}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground" data-testid="text-page-description">
          {t('costAnalysis.subtitle')}
        </p>
      </div>

      <CostAnalysisTable />
    </div>
  );
}
