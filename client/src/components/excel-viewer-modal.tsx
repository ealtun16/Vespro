import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ZoomIn, ZoomOut, Maximize2, X, Download, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ExcelViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  isLoading: boolean;
}

export function ExcelViewerModal({ isOpen, onClose, data, isLoading }: ExcelViewerModalProps) {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [filterMode, setFilterMode] = useState<'all' | 'used-only'>('all');
  const { toast } = useToast();

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 10, 200));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 10, 50));
  const handleResetZoom = () => setZoomLevel(100);

  const toggleFilterMode = () => {
    setFilterMode(prev => prev === 'all' ? 'used-only' : 'all');
  };

  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    
    const items = [...data.items];
    
    if (filterMode === 'used-only') {
      // Sadece toplam fiyatı 0'dan büyük olanları göster
      return items.filter(item => parseFloat(item.toplam_fiyat_eur || 0) > 0);
    }
    
    // all - tüm kalemler (backend'den grup_no, sira_no'ya göre sıralı geliyor)
    return items;
  }, [data?.items, filterMode]);

  const getFilterIcon = () => {
    return filterMode === 'used-only' 
      ? <ArrowDown className="h-4 w-4 ml-1" /> 
      : <ArrowUpDown className="h-4 w-4 ml-1" />;
  };

  const getFilterLabel = () => {
    return filterMode === 'used-only' 
      ? 'Sadece Maliyet Giderleri' 
      : 'Tüm Kalemler';
  };

  const formatNumber = (val: any) => {
    if (!val) return '-';
    return Number(val).toLocaleString('tr-TR', { maximumFractionDigits: 2 });
  };

  const formatCurrency = (val: any) => {
    if (!val) return '-';
    return Number(val).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  };

  const formatDate = (dateStr: any) => {
    if (!dateStr) return '-';
    try {
      const str = String(dateStr);
      // PostgreSQL timestamp: "2023-11-15 12:34:56.789+00" veya ISO: "2023-11-15T12:34:56"
      // Sadece tarih kısmını al (ilk 10 karakter: YYYY-MM-DD)
      let datePart = str;
      if (str.includes('T')) {
        datePart = str.split('T')[0];
      } else if (str.includes(' ')) {
        datePart = str.split(' ')[0];
      }
      
      const [year, month, day] = datePart.split('-');
      if (!year || !month || !day) return '-';
      return `${day}.${month}.${year}`;
    } catch {
      return '-';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative z-10 bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-[95vw] h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-2xl font-bold">{data?.tank_kodu || 'Tank Formu'}</h2>
          <div className="flex gap-2">
            <div className="flex items-center gap-2 border rounded-md p-1">
              <Button variant="ghost" size="sm" onClick={handleZoomOut} disabled={zoomLevel <= 50}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[60px] text-center">{zoomLevel}%</span>
              <Button variant="ghost" size="sm" onClick={handleZoomIn} disabled={zoomLevel >= 200}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleResetZoom} title="Sıfırla">
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-muted-foreground">Yükleniyor...</div>
            </div>
          ) : data?.error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-destructive text-lg font-semibold mb-2">
                  Dosya Bulunamadı
                </div>
                <div className="text-muted-foreground">
                  {data.message || 'Tank formu bulunamadı'}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ zoom: `${zoomLevel}%`, transformOrigin: 'top left' }} className="transition-all duration-200 space-y-4">
              {/* Header Information */}
              <Card>
                <CardHeader className="bg-green-50 dark:bg-green-950">
                  <CardTitle className="text-center text-lg font-bold">MALİYET ANALİZ FORMU</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-semibold bg-gray-50 w-1/6 text-center border">Tank Kodu</TableCell>
                        <TableCell className="w-1/6 text-center border">{data?.tank_kodu}</TableCell>
                        <TableCell className="font-semibold bg-gray-50 w-1/6 text-center border">Fiyat Tarihi</TableCell>
                        <TableCell className="w-1/6 text-center border font-semibold">{formatDate(data?.fiyat_tarihi || data?.created_at)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-semibold bg-gray-50 text-center border">Yalıtım</TableCell>
                        <TableCell className="text-center border">{data?.yalitim_aciklama || '-'}</TableCell>
                        <TableCell className="font-semibold bg-gray-50 text-center border">Karıştırıcı</TableCell>
                        <TableCell className="text-center border">{data?.karistirici_aciklama || '-'}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-semibold bg-gray-50 text-center border">Çap (mm)</TableCell>
                        <TableCell className="text-center border">{formatNumber(data?.cap_mm)}</TableCell>
                        <TableCell className="font-semibold bg-gray-50 text-center border">Uzunluk (mm)</TableCell>
                        <TableCell className="text-center border">{formatNumber(data?.silindir_boyu_mm)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-semibold bg-gray-50 text-center border">Hacim (m³)</TableCell>
                        <TableCell className="text-center border">{formatNumber(data?.hacim_m3)}</TableCell>
                        <TableCell className="font-semibold bg-gray-50 text-center border">Malzeme Kalitesi</TableCell>
                        <TableCell className="text-center border">{data?.urun_kalitesi}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-semibold bg-gray-50 text-center border">Basınç</TableCell>
                        <TableCell className="text-center border">{formatNumber(data?.basinc_bar)} BAR</TableCell>
                        <TableCell className="font-semibold bg-gray-50 text-center border">Sıcaklık</TableCell>
                        <TableCell className="text-center border">{formatNumber(data?.sicaklik_c)} °C</TableCell>
                      </TableRow>
                      <TableRow className="bg-green-100 dark:bg-green-900">
                        <TableCell className="font-bold text-center border">Toplam Ağırlık</TableCell>
                        <TableCell className="font-bold text-center border">{formatNumber(data?.toplam_agirlik_kg)} kg</TableCell>
                        <TableCell className="font-bold text-center border">Satış Fiyatı</TableCell>
                        <TableCell className="font-bold text-lg text-green-600 text-center border">{formatCurrency(data?.satis_fiyati_eur)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Cost Items */}
              <Card>
                <CardHeader className="bg-green-50 dark:bg-green-950">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-bold">Maliyet Kalemleri</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleFilterMode}
                      className="flex items-center gap-1"
                      title={filterMode === 'all' ? 'Sadece kullanılan kalemleri göster' : 'Tüm kalemleri göster'}
                    >
                      {getFilterLabel()}
                      {getFilterIcon()}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-green-100 dark:bg-green-900">
                          <TableHead className="text-center font-bold border">Grup</TableHead>
                          <TableHead className="text-center font-bold border">Sıra</TableHead>
                          <TableHead className="text-center font-bold border">Maliyet Faktörü</TableHead>
                          <TableHead className="text-center font-bold border">Malzeme Kalitesi</TableHead>
                          <TableHead className="text-center font-bold border">Malzeme Tipi</TableHead>
                          <TableHead className="text-center font-bold border">Adet</TableHead>
                          <TableHead className="text-center font-bold border">Toplam Miktar</TableHead>
                          <TableHead className="text-center font-bold border">Birim</TableHead>
                          <TableHead className="text-center font-bold border">Birim Fiyat</TableHead>
                          <TableHead className="text-center font-bold border">Toplam Fiyat</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredItems.map((item: any, idx: number) => (
                          <TableRow key={idx} className={idx % 2 === 0 ? 'bg-gray-50/50' : ''}>
                            <TableCell className="text-center font-semibold border">{item.grup_no}</TableCell>
                            <TableCell className="text-center border">{item.sira_no}</TableCell>
                            <TableCell className="text-center font-medium border">{item.maliyet_faktoru}</TableCell>
                            <TableCell className="text-center text-sm border">{item.malzeme_kalitesi || '-'}</TableCell>
                            <TableCell className="text-center text-sm border">{item.malzeme_tipi || '-'}</TableCell>
                            <TableCell className="text-center border">{formatNumber(item.adet)}</TableCell>
                            <TableCell className="text-center border">{formatNumber(item.toplam_miktar)}</TableCell>
                            <TableCell className="text-center border">{item.birim}</TableCell>
                            <TableCell className="text-center border">{formatCurrency(item.birim_fiyat_eur)}</TableCell>
                            <TableCell className="text-center font-semibold text-green-600 border">
                              {formatCurrency(item.toplam_fiyat_eur)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Summary */}
              {data?.parametre && (
                <Card>
                  <CardHeader className="bg-green-50 dark:bg-green-950">
                    <CardTitle className="font-bold">Özet ve Parametreler</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-semibold bg-gray-50 text-center border w-1/2">Toplam Malzeme Ağırlığı</TableCell>
                          <TableCell className="text-center border w-1/2">{formatNumber(data.parametre.toplam_malzeme_agirligi_kg)} kg</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-semibold bg-gray-50 text-center border">Birim İşçilik</TableCell>
                          <TableCell className="text-center border">{formatCurrency(data.parametre.birim_iscilik_eur_per_kg)} / kg</TableCell>
                        </TableRow>
                        <TableRow className="bg-green-100 dark:bg-green-900">
                          <TableCell className="font-bold text-lg text-center border">TOPLAM TUTAR</TableCell>
                          <TableCell className="font-bold text-lg text-green-600 text-center border">
                            {formatCurrency(data.parametre.toplam_tutar_eur)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
