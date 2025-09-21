import FileUpload from "@/components/upload/file-upload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, FileText, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { useTranslation } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";

export default function ImportData() {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  // Add polling for real-time updates
  const { data: vesproForms = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/vespro-forms'],
    select: (data: any) => data || [],
    refetchInterval: 3000, // Poll every 3 seconds for updates
    refetchIntervalInBackground: false
  });

  // Handle successful upload with proper cache invalidation
  const handleUploadSuccess = async () => {
    // Invalidate multiple related caches for immediate UI updates
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['/api/vespro-forms'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/cost-analyses'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] })
    ]);
    
    // Force immediate refetch
    await refetch();
    
    toast({
      title: t('import.uploadSuccess'),
      description: t('import.uploadSuccessDescription'),
    });
  };

  // View file content in new tab
  const viewFileContent = async (formId: string, formTitle: string) => {
    try {
      const response = await fetch(`/api/vespro-forms/${formId}/content`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch file content');
      }
      
      const content = await response.json();
      
      // Create formatted content for display
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="tr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${formTitle} - İçerik Görüntüleme</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; line-height: 1.6; }
            .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
            .content { background: white; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px; }
            .field { margin-bottom: 15px; }
            .label { font-weight: bold; color: #495057; }
            .value { color: #212529; }
            .section { margin-bottom: 30px; border-bottom: 1px solid #dee2e6; padding-bottom: 20px; }
            .section:last-child { border-bottom: none; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #dee2e6; }
            th { background-color: #f8f9fa; font-weight: 600; }
            .cost-item { background: #f8f9fa; padding: 10px; margin: 5px 0; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${formTitle}</h1>
            <p>Form ID: ${formId}</p>
            <p>Oluşturulma: ${new Date(content.created_at).toLocaleDateString('tr-TR')}</p>
          </div>
          
          <div class="content">
            <div class="section">
              <h2>Genel Bilgiler</h2>
              <div class="field">
                <span class="label">Form Kodu:</span> 
                <span class="value">${content.form_code || 'Belirtilmemiş'}</span>
              </div>
              <div class="field">
                <span class="label">Müşteri:</span> 
                <span class="value">${content.client_name || 'Belirtilmemiş'}</span>
              </div>
              <div class="field">
                <span class="label">Para Birimi:</span> 
                <span class="value">${content.currency || 'EUR'}</span>
              </div>
            </div>
            
            <div class="section">
              <h2>Tank Bilgileri</h2>
              <div class="field">
                <span class="label">Tank Adı:</span> 
                <span class="value">${content.tank_name || 'Belirtilmemiş'}</span>
              </div>
              <div class="field">
                <span class="label">Tank Tipi:</span> 
                <span class="value">${content.tank_type || 'Belirtilmemiş'}</span>
              </div>
              ${content.tank_width_mm ? `<div class="field"><span class="label">Genişlik:</span> <span class="value">${content.tank_width_mm} mm</span></div>` : ''}
              ${content.tank_height_mm ? `<div class="field"><span class="label">Yükseklik:</span> <span class="value">${content.tank_height_mm} mm</span></div>` : ''}
              ${content.tank_material_grade ? `<div class="field"><span class="label">Malzeme:</span> <span class="value">${content.tank_material_grade}</span></div>` : ''}
            </div>
            
            ${content.metadata ? `
              <div class="section">
                <h2>İçe Aktarma Detayları</h2>
                <div class="field">
                  <span class="label">İçe Aktarma Tarihi:</span> 
                  <span class="value">${new Date(content.metadata.importDate).toLocaleString('tr-TR')}</span>
                </div>
                ${content.metadata.originalData ? `
                  <h3>Orijinal Excel Verileri:</h3>
                  <pre style="background: #f8f9fa; padding: 15px; border-radius: 4px; overflow: auto;">${JSON.stringify(content.metadata.originalData, null, 2)}</pre>
                ` : ''}
              </div>
            ` : ''}
            
            ${content.notes ? `
              <div class="section">
                <h2>Notlar</h2>
                <p>${content.notes}</p>
              </div>
            ` : ''}
          </div>
        </body>
        </html>
      `;
      
      // Open in new tab
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(htmlContent);
        newWindow.document.close();
      }
      
    } catch (error) {
      console.error('Error viewing file content:', error);
      toast({
        title: 'Dosya görüntüleme hatası',
        description: 'Dosya içeriği yüklenirken hata oluştu',
        variant: "destructive",
      });
    }
  };

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

      <FileUpload onUploadSuccess={handleUploadSuccess} />

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
                          onClick={() => viewFileContent(form.form_id, form.form_title)}
                          data-testid={`button-view-${form.form_id}`}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
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
