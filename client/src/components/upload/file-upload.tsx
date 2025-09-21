import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, FolderOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";

interface FileUploadProps {
  onUploadSuccess?: () => void;
}

export default function FileUpload({ onUploadSuccess }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls)$/)) {
      toast({
        title: "Invalid file type",
        description: "Please upload an Excel file (.xlsx or .xls)",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await apiRequest('POST', '/api/import/excel', formData);
      const result = await response.json();
      
      toast({
        title: t('toast.uploadSuccess'),
        description: t('import.processedCount').replace('{{count}}', result.recordsProcessed),
      });
      
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (error) {
      toast({
        title: t('toast.uploadFailed'),
        description: "Excel dosyası yükleme ve işleme başarısız oldu",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleBulkImport = () => {
    toast({
      title: "Feature coming soon",
      description: "Bulk import functionality will be available soon",
    });
  };

  return (
    <Card className="card-shadow mb-8">
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4" data-testid="text-import-title">
          {t('import.uploadTitle')}
        </h2>
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
          <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
            <FileSpreadsheet className="text-2xl text-accent h-6 w-6" />
          </div>
          <p className="text-lg font-medium text-foreground mb-2" data-testid="text-upload-title">
            {t('import.uploadTitle')}
          </p>
          <p className="text-sm text-muted-foreground mb-4" data-testid="text-upload-description">
            {t('import.uploadDescription')}
          </p>
          <div className="flex justify-center space-x-4">
            <Button 
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={uploading}
              onClick={() => document.getElementById('file-input')?.click()}
              data-testid="button-choose-files"
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? 'Uploading...' : 'Choose Files'}
            </Button>
            <input
              id="file-input"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            <Button 
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={handleBulkImport}
              data-testid="button-bulk-import"
            >
              <FolderOpen className="mr-2 h-4 w-4" />
              Bulk Import
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-4" data-testid="text-supported-formats">
            {t('import.supportedFormats')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
