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
      title: 'Yükleme başarılı',
      description: 'Dosya başarıyla yüklendi ve işlendi',
    });
  };

  // Download original Excel file
  const downloadExcelFile = async (formId: string, formTitle: string) => {
    try {
      const response = await fetch(`/api/vespro-forms/${formId}/download`);
      
      if (!response.ok) {
        if (response.status === 404) {
          toast({
            title: 'Dosya bulunamadı',
            description: 'Orijinal Excel dosyası mevcut değil',
            variant: "destructive",
          });
          return;
        }
        throw new Error('Failed to download file');
      }
      
      // Get filename from response headers or use default
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'excel_file.xlsx';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      // Create blob and open in new tab (for viewing in browser)
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Open Excel file in new tab
      const newTab = window.open(url, '_blank');
      if (newTab) {
        // Set title for the new tab
        newTab.document.title = filename;
      } else {
        // Fallback to download if popup blocked
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      // Clean up the URL after some time
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);
      
      toast({
        title: 'İndirme başarılı',
        description: `${filename} dosyası indirildi`,
      });
      
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: 'İndirme hatası',
        description: 'Excel dosyası indirilirken hata oluştu',
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">
          Veri İçe Aktarma
        </h1>
        <p className="mt-2 text-sm text-muted-foreground" data-testid="text-page-description">
          Tank maliyet analizi verilerini içeren Excel dosyalarını içe aktarın
        </p>
      </div>

      <FileUpload onUploadSuccess={handleUploadSuccess} />

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
                        {form.tank_name || 'Belirtilmemiş'}
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
                          onClick={() => downloadExcelFile(form.form_id, form.form_title)}
                          data-testid={`button-view-${form.form_id}`}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Görüntüle
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
          <h2 className="text-lg font-semibold text-foreground mb-4" data-testid="import-guidelines-title">
            İçe Aktarma Kuralları
          </h2>
          <div className="space-y-4 text-sm text-muted-foreground">
            <div>
              <h3 className="font-medium text-foreground mb-2">Gerekli Excel Sütunları:</h3>
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
              <h3 className="font-medium text-foreground mb-2">İsteğe Bağlı Sütunlar:</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>{t('import.guideline.material')}</li>
                <li>{t('import.guideline.thickness')}</li>
                <li>{t('import.guideline.pressure')}</li>
                <li>{t('import.guideline.temperature')}</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-foreground mb-2">Dosya Gereksinimleri:</h3>
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
