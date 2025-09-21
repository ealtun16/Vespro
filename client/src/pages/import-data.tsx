import FileUpload from "@/components/upload/file-upload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, FileText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { useTranslation } from "@/lib/i18n";

export default function ImportData() {
  const { t } = useTranslation();
  const { data: vesproForms = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/vespro-forms'],
    select: (data: any) => data || []
  });

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">
          {t('import.title')}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground" data-testid="text-page-description">
          {t('import.subtitle')}
        </p>
      </div>

      <FileUpload onUploadSuccess={() => refetch()} />

      {/* Imported Records Section */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('import.importedRecords')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">{t('import.loadingRecords')}</p>
            </div>
          ) : vesproForms && Array.isArray(vesproForms) && vesproForms.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('table.formTitle')}</TableHead>
                    <TableHead>{t('table.tankName')}</TableHead>
                    <TableHead>{t('table.tankType')}</TableHead>
                    <TableHead>{t('table.currency')}</TableHead>
                    <TableHead>{t('table.importDate')}</TableHead>
                    <TableHead>{t('table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vesproForms.map((form: any) => (
                    <TableRow key={form.form_id} data-testid={`row-vespro-form-${form.form_id}`}>
                      <TableCell className="font-medium" data-testid={`text-form-title-${form.form_id}`}>
                        {form.form_title}
                      </TableCell>
                      <TableCell data-testid={`text-tank-name-${form.form_id}`}>
                        {form.tank_name || t('status.unspecified')}
                      </TableCell>
                      <TableCell data-testid={`text-tank-type-${form.form_id}`}>
                        {form.tank_type && (
                          <Badge variant="outline">{form.tank_type}</Badge>
                        )}
                      </TableCell>
                      <TableCell data-testid={`text-currency-${form.form_id}`}>
                        {form.currency}
                      </TableCell>
                      <TableCell data-testid={`text-import-date-${form.form_id}`}>
                        {form.created_at && formatDistanceToNow(new Date(form.created_at), { addSuffix: true, locale: tr })}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm"
                          data-testid={`button-view-${form.form_id}`}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          {t('action.view')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">{t('import.noRecords')}</p>
              <p className="text-sm text-muted-foreground">{t('import.startByUploading')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="card-shadow">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4" data-testid="import-guidelines-title">
            {t('import.guidelinesTitle')}
          </h2>
          <div className="space-y-4 text-sm text-muted-foreground">
            <div>
              <h3 className="font-medium text-foreground mb-2">{t('import.requiredColumns')}</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>{t('import.guideline.reportId')}</li>
                <li>{t('import.guideline.tankType')}</li>
                <li>{t('import.guideline.tankName')}</li>
                <li>{t('import.guideline.capacity')}</li>
                <li>{t('import.guideline.height')}</li>
                <li>{t('import.guideline.materialCost')}</li>
                <li>{t('import.guideline.laborCost')}</li>
                <li>{t('import.guideline.overheadCost')}</li>
                <li>{t('import.guideline.totalCost')}</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-foreground mb-2">{t('import.optionalColumns')}</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>{t('import.guideline.material')}</li>
                <li>{t('import.guideline.thickness')}</li>
                <li>{t('import.guideline.pressure')}</li>
                <li>{t('import.guideline.temperature')}</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-foreground mb-2">{t('import.fileRequirements')}</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>{t('import.guideline.maxFileSize')}</li>
                <li>{t('import.guideline.supportedFormats')}</li>
                <li>{t('import.guideline.dataStartRow')}</li>
                <li>{t('import.guideline.requiredColumnsPresent')}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
