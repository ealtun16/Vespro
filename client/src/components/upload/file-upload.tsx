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
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Validate all files are Excel files
    const invalidFiles = files.filter(file => !file.name.match(/\.(xlsx|xls)$/));
    if (invalidFiles.length > 0) {
      toast({
        title: t('toast.invalidFileType'),
        description: `${t('toast.invalidFileDescription')} - ${invalidFiles.map(f => f.name).join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      // Process files one by one to maintain individual file names
      for (const file of files) {
        try {
          const formData = new FormData();
          formData.append('file', file);

          const response = await apiRequest('POST', '/api/import/excel', formData);
          
          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error);
          errorCount++;
        }
      }

      // Show result toast
      if (successCount > 0 && errorCount === 0) {
        toast({
          title: t('toast.uploadSuccess'),
          description: `${successCount} dosya başarıyla yüklendi`,
        });
      } else if (successCount > 0 && errorCount > 0) {
        toast({
          title: 'Kısmi başarı',
          description: `${successCount} dosya yüklendi, ${errorCount} dosya başarısız`,
          variant: "default",
        });
      } else {
        toast({
          title: t('toast.uploadFailed'),
          description: 'Tüm dosyalar yüklenemedi',
          variant: "destructive",
        });
      }

      if (onUploadSuccess && successCount > 0) {
        onUploadSuccess();
      }
    } finally {
      setUploading(false);
      event.target.value = '';
    }
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
            Birden fazla Excel dosyasını aynı anda seçebilirsiniz
          </p>
          <div className="flex justify-center space-x-4">
            <Button 
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={uploading}
              onClick={() => document.getElementById('file-input')?.click()}
              data-testid="button-choose-files"
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? 'Yükleniyor...' : 'Dosyaları Seç'}
            </Button>
            <input
              id="file-input"
              type="file"
              accept=".xlsx,.xls"
              multiple
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-4" data-testid="text-supported-formats">
            {t('import.supportedFormats')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
