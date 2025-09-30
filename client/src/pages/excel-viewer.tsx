import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Download, ArrowLeft } from "lucide-react";

export default function ExcelViewer() {
  const params = useParams<{ orderId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [excelData, setExcelData] = useState<any>(null);

  useEffect(() => {
    const fetchExcel = async () => {
      try {
        const response = await fetch(`/api/tank-orders/${params.orderId}/excel`);
        if (!response.ok) {
          throw new Error('Excel dosyası yüklenemedi');
        }
        const data = await response.json();
        setExcelData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Bilinmeyen hata');
      } finally {
        setLoading(false);
      }
    };

    fetchExcel();
  }, [params.orderId]);

  const handleDownload = () => {
    if (!excelData?.fileData) return;

    try {
      const binaryString = atob(excelData.fileData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const blob = new Blob([bytes], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = excelData.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('İndirme hatası:', error);
      alert('Excel dosyası indirilemedi');
    }
  };

  const handleBack = () => {
    window.close();
    // If window.close() doesn't work (not opened by script), navigate back
    setTimeout(() => {
      window.location.href = '/';
    }, 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-lg text-gray-600">Excel dosyası yükleniyor...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-lg text-red-600 mb-4">Hata: {error}</div>
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Geri Dön
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button onClick={handleBack} variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Geri
            </Button>
            <h1 className="text-lg font-semibold">{excelData?.filename || 'Excel Dosyası'}</h1>
          </div>
          {excelData?.fileData && (
            <Button onClick={handleDownload} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              İndir
            </Button>
          )}
        </div>
      </div>

      {/* Excel Content */}
      <div className="container mx-auto p-4">
        {excelData?.html ? (
          <div className="bg-white rounded-lg shadow-sm p-4 overflow-auto">
            <div 
              dangerouslySetInnerHTML={{ __html: excelData.html }}
              className="excel-table"
            />
          </div>
        ) : (
          <div className="text-center py-8 text-gray-600">
            Excel içeriği bulunamadı
          </div>
        )}
      </div>

      <style>{`
        .excel-table table {
          border-collapse: collapse;
          width: 100%;
          font-family: Arial, sans-serif;
          font-size: 12px;
        }
        .excel-table td, .excel-table th {
          border: 1px solid #ddd;
          padding: 8px 12px;
          text-align: left;
          white-space: nowrap;
        }
        .excel-table tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        .excel-table tr:hover {
          background-color: #f0f0f0;
        }
        .excel-table th {
          background-color: #4CAF50;
          color: white;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
}
