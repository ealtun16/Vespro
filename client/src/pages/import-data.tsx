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
            İçe Aktarılan Kayıtlar
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Kayıtlar yükleniyor...</p>
            </div>
          ) : vesproForms && Array.isArray(vesproForms) && vesproForms.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Form Başlığı</TableHead>
                    <TableHead>Tank Adı</TableHead>
                    <TableHead>Tank Tipi</TableHead>
                    <TableHead>Para Birimi</TableHead>
                    <TableHead>İçe Aktarma Tarihi</TableHead>
                    <TableHead>İşlemler</TableHead>
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
              <p className="text-muted-foreground">Henüz kayıt yok</p>
              <p className="text-sm text-muted-foreground">Excel dosyası yükleyerek başlayın</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="card-shadow">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4" data-testid="text-import-guidelines">
            Import Guidelines
          </h2>
          <div className="space-y-4 text-sm text-muted-foreground">
            <div>
              <h3 className="font-medium text-foreground mb-2">Required Excel Columns:</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Report ID - Unique identifier for the cost analysis</li>
                <li>Tank Type - Storage Tank, Pressure Vessel, or Heat Exchanger</li>
                <li>Tank Name - Descriptive name for the tank</li>
                <li>Capacity - Tank capacity in liters</li>
                <li>Height - Tank height in millimeters</li>
                <li>Material Cost - Cost of materials in USD</li>
                <li>Labor Cost - Labor costs in USD</li>
                <li>Overhead Cost - Overhead costs in USD</li>
                <li>Total Cost - Total project cost in USD</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-foreground mb-2">Optional Columns:</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Material - Steel grade or material type</li>
                <li>Thickness - Wall thickness in millimeters</li>
                <li>Pressure - Operating pressure in bar</li>
                <li>Temperature - Operating temperature in Celsius</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-foreground mb-2">File Requirements:</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Maximum file size: 10MB</li>
                <li>Supported formats: .xlsx, .xls</li>
                <li>Data should start from row 2 (row 1 for headers)</li>
                <li>All required columns must be present</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
