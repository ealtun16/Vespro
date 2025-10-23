import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, Download, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

// TypeScript interfaces
interface Tank {
  id: string;
  tank_kodu: string;
  fiyat_tarihi: string | null;
  cap_mm: number | null;
  silindir_boyu_mm: number | null;
  hacim_m3: number | null;
  urun_kalitesi: string | null;
  satis_fiyati_eur: number | null;
  toplam_agirlik_kg: number | null;
  created_at: string;
}

interface TankItem {
  id: string;
  tank_id: string;
  grup_no: string | null;
  sira_no: string | null;
  maliyet_faktoru: string | null;
  malzeme_kalitesi: string | null;
  malzeme_tipi: string | null;
  adet: number | null;
  toplam_miktar: number | null;
  birim: string | null;
  birim_fiyat_eur: number | null;
  toplam_fiyat_eur: number | null;
}

interface TankParametre {
  toplam_malzeme_agirligi_kg: number | null;
  birim_iscilik_eur_per_kg: number | null;
  toplam_tutar_eur: number | null;
}

interface TankDetail extends Tank {
  yalitim_kod: string | null;
  yalitim_aciklama: string | null;
  yalitim_malzeme: string | null;
  karistirici_kod: string | null;
  karistirici_aciklama: string | null;
  ceket_kod: string | null;
  ceket_aciklama: string | null;
  cevre_ara_hesap: number | null;
  basinc_bar: number | null;
  sicaklik_c: number | null;
  ortam_c: number | null;
  revizyon_no: number | null;
  ozet_etiketi: string | null;
  items: TankItem[];
  parametre: TankParametre | null;
  excel_available: boolean;
  excel_path: string | null;
}

export default function TankForms() {
  const [selectedTank, setSelectedTank] = useState<Tank | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Fetch tank list
  const { data: tanks, isLoading } = useQuery<Tank[]>({
    queryKey: ['/api/tank-forms'],
  });

  // Fetch tank detail with items
  const { data: tankDetail } = useQuery<TankDetail>({
    queryKey: [`/api/tank-forms/${selectedTank?.id}`],
    enabled: !!selectedTank,
  });

  const formatNumber = (val: any) => {
    if (!val) return '-';
    return Number(val).toLocaleString('tr-TR', { maximumFractionDigits: 2 });
  };

  const formatCurrency = (val: any) => {
    if (!val) return '-';
    return Number(val).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  };

  if (viewMode === 'list') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Tank Formları</h1>
            <p className="text-muted-foreground">Yüklenmiş Excel formlarını görüntüleyin</p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Yükleniyor...</div>
        ) : (
          <div className="grid gap-4">
            {tanks?.map((tank: any) => (
              <Card key={tank.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => {
                setSelectedTank(tank);
                setViewMode('detail');
              }}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-green-600" />
                        {tank.tank_kodu}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {tank.urun_kalitesi || 'Malzeme belirtilmemiş'}
                      </CardDescription>
                    </div>
                    <Badge variant="outline">{tank.fiyat_tarihi || 'Tarih yok'}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Çap</p>
                      <p className="font-semibold">{formatNumber(tank.cap_mm)} mm</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Uzunluk</p>
                      <p className="font-semibold">{formatNumber(tank.silindir_boyu_mm)} mm</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Hacim</p>
                      <p className="font-semibold">{formatNumber(tank.hacim_m3)} m³</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Toplam Fiyat</p>
                      <p className="font-semibold text-green-600">{formatCurrency(tank.satis_fiyati_eur)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Detail view - Excel benzeri görünüm
  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 10, 200));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 10, 50));
  const handleResetZoom = () => setZoomLevel(100);
  
  const handleDownload = () => {
    if (tankDetail?.excel_available && tankDetail?.excel_path) {
      // Excel dosyasını indir
      const link = document.createElement('a');
      link.href = `/uploads/${tankDetail.excel_path}`;
      link.download = tankDetail.excel_path;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert('Excel dosyası mevcut değil');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => setViewMode('list')}>
          ← Geri
        </Button>
        <h1 className="text-2xl font-bold">{selectedTank?.tank_kodu}</h1>
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
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            İndir
          </Button>
        </div>
      </div>

      <div style={{ zoom: `${zoomLevel}%`, transformOrigin: 'top left' }} className="transition-all duration-200">

      {/* Header Information - Excel Style */}
      <Card>
        <CardHeader className="bg-green-50 dark:bg-green-950">
          <CardTitle className="text-center text-lg font-bold">MALİYET ANALİZ FORMU</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="font-semibold bg-gray-50 w-1/6 text-center border">Tank Kodu</TableCell>
                <TableCell className="w-1/6 text-center border">{tankDetail?.tank_kodu}</TableCell>
                <TableCell className="font-semibold bg-gray-50 w-1/6 text-center border">Fiyat Tarihi</TableCell>
                <TableCell className="w-1/6 text-center border">{tankDetail?.fiyat_tarihi || '-'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold bg-gray-50 text-center border">Yalıtım</TableCell>
                <TableCell className="text-center border">{tankDetail?.yalitim_aciklama || '-'}</TableCell>
                <TableCell className="font-semibold bg-gray-50 text-center border">Karıştırıcı</TableCell>
                <TableCell className="text-center border">{tankDetail?.karistirici_aciklama || '-'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold bg-gray-50 text-center border">Çap (mm)</TableCell>
                <TableCell className="text-center border">{formatNumber(tankDetail?.cap_mm)}</TableCell>
                <TableCell className="font-semibold bg-gray-50 text-center border">Uzunluk (mm)</TableCell>
                <TableCell className="text-center border">{formatNumber(tankDetail?.silindir_boyu_mm)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold bg-gray-50 text-center border">Hacim (m³)</TableCell>
                <TableCell className="text-center border">{formatNumber(tankDetail?.hacim_m3)}</TableCell>
                <TableCell className="font-semibold bg-gray-50 text-center border">Malzeme Kalitesi</TableCell>
                <TableCell className="text-center border">{tankDetail?.urun_kalitesi}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold bg-gray-50 text-center border">Basınç</TableCell>
                <TableCell className="text-center border">{formatNumber(tankDetail?.basinc_bar)} BAR</TableCell>
                <TableCell className="font-semibold bg-gray-50 text-center border">Sıcaklık</TableCell>
                <TableCell className="text-center border">{formatNumber(tankDetail?.sicaklik_c)} °C</TableCell>
              </TableRow>
              <TableRow className="bg-green-100 dark:bg-green-900">
                <TableCell className="font-bold text-center border">Toplam Ağırlık</TableCell>
                <TableCell className="font-bold text-center border">{formatNumber(tankDetail?.toplam_agirlik_kg)} kg</TableCell>
                <TableCell className="font-bold text-center border">Satış Fiyatı</TableCell>
                <TableCell className="font-bold text-lg text-green-600 text-center border">{formatCurrency(tankDetail?.satis_fiyati_eur)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cost Items - Excel Style */}
      <Card>
        <CardHeader className="bg-green-50 dark:bg-green-950">
          <CardTitle className="font-bold">Maliyet Kalemleri</CardTitle>
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
                {tankDetail?.items?.map((item: any, idx: number) => (
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

      {/* Summary - Excel Style */}
      {tankDetail?.parametre && (
        <Card>
          <CardHeader className="bg-green-50 dark:bg-green-950">
            <CardTitle className="font-bold">Özet ve Parametreler</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-semibold bg-gray-50 text-center border w-1/2">Toplam Malzeme Ağırlığı</TableCell>
                  <TableCell className="text-center border w-1/2">{formatNumber(tankDetail.parametre.toplam_malzeme_agirligi_kg)} kg</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-semibold bg-gray-50 text-center border">Birim İşçilik</TableCell>
                  <TableCell className="text-center border">{formatCurrency(tankDetail.parametre.birim_iscilik_eur_per_kg)} / kg</TableCell>
                </TableRow>
                <TableRow className="bg-green-100 dark:bg-green-900">
                  <TableCell className="font-bold text-lg text-center border">TOPLAM TUTAR</TableCell>
                  <TableCell className="font-bold text-lg text-green-600 text-center border">
                    {formatCurrency(tankDetail.parametre.toplam_tutar_eur)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
}
