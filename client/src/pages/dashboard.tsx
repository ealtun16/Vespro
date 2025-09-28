import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { BarChart3, TrendingUp, Calculator, Database, Plus, Trash2 } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import CostAnalysisTable from "@/components/tables/cost-analysis-table";
import { useTranslation } from "@/lib/i18n";

// Comprehensive cost analysis form schema with all fields
const costAnalysisSchema = z.object({
  // Form Information (Mandatory)
  form_code: z.string().min(1, "Form kodu gerekli"),
  client_name: z.string().min(1, "Müşteri adı gerekli"),
  form_title: z.string().min(1, "Form başlığı gerekli"),
  form_date: z.string().min(1, "Form tarihi gerekli"),
  revision_no: z.number().min(0).default(0),
  currency: z.string().default("EUR"),
  
  // Tank Specifications (Mandatory - Turkish fields)
  tank_name: z.string().min(1, "Tank adı gerekli"),
  tank_capi: z.number().min(1, "Tank çapı gerekli"), // TANK ÇAPI
  silindirik_yukseklik: z.number().min(1, "Silindirik yükseklik gerekli"), // SİLİNDİRİK YÜKSEKLİK
  insulation: z.enum(["var", "yok"], { required_error: "Insulation seçimi gerekli" }), // Insulation
  karistirici: z.enum(["var", "yok"], { required_error: "Karıştırıcı seçimi gerekli" }), // Karistirici
  ceket_serpantin: z.enum(["var", "yok"], { required_error: "Ceket/serpantin seçimi gerekli" }), // Ceket/serpantin
  volume: z.number().min(0.1, "Volume gerekli"), // Volume
  malzeme_kalitesi: z.string().min(1, "Malzeme kalitesi gerekli"), // Malzeme kalitesi
  basinc: z.string().min(1, "Basınç gerekli"), // Basinc -> Sami
  govde_acinimi: z.number().min(0, "Gövde açınımı gerekli"), // Govde Acinimi
  sicaklik: z.number(), // Sicaklik
  
  // Cost Items (Mandatory)
  cost_items: z.array(z.object({
    maliyet_faktoru: z.string().min(1, "Maliyet faktörü gerekli"), // MALİYET FAKTÖRÜ
    malzeme_kalitesi_item: z.union([z.string(), z.number()]).optional(), // MALZEME KALİTESİ
    malzeme_tipi: z.string().optional(), // MALZEME TİPİ
    adet: z.number().min(0, "Adet gerekli"), // Adet
    toplam_miktar: z.number().min(0, "Toplam miktar gerekli"), // TOPLAM MİKTAR
    birim: z.string().min(1, "Birim gerekli"), // BİRİM
    birim_fiyat_euro: z.number().min(0, "Birim fiyat gerekli"), // BİRİM FİYAT EURO
  })).min(1, "En az bir maliyet faktörü eklenmeli"),
  
  // Additional Fields
  notes: z.string().optional(),
});

type CostAnalysisFormData = z.infer<typeof costAnalysisSchema>;

interface DashboardStats {
  totalReports: number;
  tankModels: number;
  averageCost: number;
  completionRate: number;
}

export default function Dashboard() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();
  
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: analyses, isLoading: analysesLoading } = useQuery({
    queryKey: ["/api/cost-analyses", { limit: 5 }],
  });

  const form = useForm<CostAnalysisFormData>({
    resolver: zodResolver(costAnalysisSchema),
    defaultValues: {
      form_code: `CA-${Date.now()}`,
      client_name: "",
      form_title: "MALİYET ANALİZ FORMU",
      form_date: new Date().toISOString().split('T')[0],
      revision_no: 0,
      currency: "EUR",
      tank_name: "",
      tank_capi: 1000,
      silindirik_yukseklik: 2000,
      insulation: "yok",
      karistirici: "yok", 
      ceket_serpantin: "yok",
      volume: 1.0,
      malzeme_kalitesi: "",
      basinc: "",
      govde_acinimi: 0,
      sicaklik: 20,
      cost_items: [{
        maliyet_faktoru: "",
        malzeme_kalitesi_item: "",
        malzeme_tipi: "",
        adet: 1,
        toplam_miktar: 1,
        birim: "kg",
        birim_fiyat_euro: 0,
      }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "cost_items",
  });

  const createAnalysisMutation = useMutation({
    mutationFn: async (data: CostAnalysisFormData) => {
      // Create the Vespro form with cost items
      const formPayload = {
        form_code: data.form_code,
        client_name: data.client_name,
        form_title: data.form_title,
        form_date: data.form_date,
        revision_no: data.revision_no,
        currency: data.currency,
        tank_name: data.tank_name,
        tank_diameter_mm: data.tank_capi.toString(),
        tank_height_mm: data.silindirik_yukseklik.toString(),
        tank_volume: data.volume.toString(),
        tank_material_grade: data.malzeme_kalitesi,
        operating_pressure: data.basinc,
        operating_temperature: data.sicaklik.toString(),
        notes: data.notes,
        metadata: {
          insulation: data.insulation,
          karistirici: data.karistirici,
          ceket_serpantin: data.ceket_serpantin,
          govde_acinimi: data.govde_acinimi,
          cost_items: data.cost_items,
        },
      };

      return await apiRequest("POST", "/api/vespro/forms", formPayload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cost-analyses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setOpen(false);
      form.reset();
      toast({
        title: "Başarılı",
        description: "Maliyet analizi başarıyla oluşturuldu",
      });
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Maliyet analizi oluşturulamadı",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CostAnalysisFormData) => {
    createAnalysisMutation.mutate(data);
  };

  const addCostItem = () => {
    append({
      maliyet_faktoru: "",
      malzeme_kalitesi_item: "",
      malzeme_tipi: "",
      adet: 1,
      toplam_miktar: 1,
      birim: "kg",
      birim_fiyat_euro: 0,
    });
  };

  const calculateTotalPrice = (index: number) => {
    const adet = form.watch(`cost_items.${index}.adet`);
    const birimFiyat = form.watch(`cost_items.${index}.birim_fiyat_euro`);
    
    if (adet && birimFiyat) {
      const total = adet * birimFiyat;
      form.setValue(`cost_items.${index}.toplam_miktar`, total);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">
            Maliyet Analizi Dashboard
          </h1>
          <p className="mt-2 text-sm text-muted-foreground" data-testid="text-page-description">
            Yeni maliyet analizi oluşturun ve mevcut analizleri yönetin
          </p>
        </div>
        
        {/* Main Action Button */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="lg" data-testid="button-create-cost-analysis">
              <Plus className="mr-2 h-5 w-5" />
              Yeni Maliyet Analizi
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Maliyet Analizi Formu</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Form Information Section */}
                <Card>
                  <CardHeader>
                    <CardTitle>Form Bilgileri</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="form_code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Form Kodu *</FormLabel>
                            <FormControl>
                              <Input placeholder="CA-001" {...field} data-testid="input-form-code" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="client_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Müşteri Adı *</FormLabel>
                            <FormControl>
                              <Input placeholder="Müşteri veya şirket adı" {...field} data-testid="input-client-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="form_title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Form Başlığı *</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-form-title" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="form_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Form Tarihi *</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} data-testid="input-form-date" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="revision_no"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Revizyon Numarası</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                data-testid="input-revision-no"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="currency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Para Birimi</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-currency">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="EUR">EUR</SelectItem>
                                <SelectItem value="USD">USD</SelectItem>
                                <SelectItem value="TRY">TRY</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Tank Specifications Section */}
                <Card>
                  <CardHeader>
                    <CardTitle>Tank Özellikleri</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="tank_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tank Adı *</FormLabel>
                          <FormControl>
                            <Input placeholder="Tank tanımlayıcısı" {...field} data-testid="input-tank-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="tank_capi"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tank Çapı (mm) *</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="Tank çapı"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                data-testid="input-tank-capi" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="silindirik_yukseklik"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Silindirik Yükseklik (mm) *</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="Silindirik yükseklik"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                data-testid="input-silindirik-yukseklik" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="insulation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Insulation *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-insulation">
                                  <SelectValue placeholder="Seçiniz" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="var">Var</SelectItem>
                                <SelectItem value="yok">Yok</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="karistirici"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Karıştırıcı *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-karistirici">
                                  <SelectValue placeholder="Seçiniz" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="var">Var</SelectItem>
                                <SelectItem value="yok">Yok</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="ceket_serpantin"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ceket/Serpantin *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-ceket-serpantin">
                                  <SelectValue placeholder="Seçiniz" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="var">Var</SelectItem>
                                <SelectItem value="yok">Yok</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="volume"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Volume (m³) *</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.1"
                                placeholder="Volume"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                data-testid="input-volume" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="malzeme_kalitesi"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Malzeme Kalitesi *</FormLabel>
                            <FormControl>
                              <Input placeholder="Malzeme kalitesi" {...field} data-testid="input-malzeme-kalitesi" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="basinc"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Basınç *</FormLabel>
                            <FormControl>
                              <Input placeholder="Sami" {...field} data-testid="input-basinc" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="govde_acinimi"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Gövde Açınımı *</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="Gövde açınımı"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                data-testid="input-govde-acinimi" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="sicaklik"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sıcaklık (°C) *</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="Sıcaklık"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                data-testid="input-sicaklik" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Cost Items Section */}
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>Maliyet Faktörleri *</CardTitle>
                      <Button 
                        type="button" 
                        onClick={addCostItem}
                        variant="outline"
                        size="sm"
                        data-testid="button-add-cost-item"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Ekle
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {fields.map((field, index) => (
                      <Card key={field.id} className="p-4 border-2">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="font-medium">Maliyet Faktörü #{index + 1}</h4>
                          {fields.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => remove(index)}
                              data-testid={`button-remove-cost-item-${index}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <FormField
                            control={form.control}
                            name={`cost_items.${index}.maliyet_faktoru`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Maliyet Faktörü *</FormLabel>
                                <FormControl>
                                  <Input placeholder="SAÇ, KAYNAK, vs." {...field} data-testid={`input-maliyet-faktoru-${index}`} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`cost_items.${index}.malzeme_kalitesi_item`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Malzeme Kalitesi</FormLabel>
                                <FormControl>
                                  <Input placeholder="S235JR, 1.4410" {...field} data-testid={`input-malzeme-kalitesi-item-${index}`} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <FormField
                            control={form.control}
                            name={`cost_items.${index}.malzeme_tipi`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Malzeme Tipi</FormLabel>
                                <FormControl>
                                  <Input placeholder="Çelik, Alüminyum" {...field} data-testid={`input-malzeme-tipi-${index}`} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`cost_items.${index}.adet`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Adet *</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    placeholder="Adet"
                                    {...field}
                                    onChange={(e) => {
                                      field.onChange(parseFloat(e.target.value) || 0);
                                      calculateTotalPrice(index);
                                    }}
                                    data-testid={`input-adet-${index}`} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`cost_items.${index}.birim`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Birim *</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid={`select-birim-${index}`}>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="kg">kg</SelectItem>
                                    <SelectItem value="adet">adet</SelectItem>
                                    <SelectItem value="m">m</SelectItem>
                                    <SelectItem value="m2">m²</SelectItem>
                                    <SelectItem value="m3">m³</SelectItem>
                                    <SelectItem value="set">set</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name={`cost_items.${index}.birim_fiyat_euro`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Birim Fiyat (€) *</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    step="0.01"
                                    placeholder="Birim fiyat"
                                    {...field}
                                    onChange={(e) => {
                                      field.onChange(parseFloat(e.target.value) || 0);
                                      calculateTotalPrice(index);
                                    }}
                                    data-testid={`input-birim-fiyat-${index}`} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`cost_items.${index}.toplam_miktar`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Toplam Miktar *</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    step="0.01"
                                    placeholder="Toplam miktar"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                    data-testid={`input-toplam-miktar-${index}`} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            render={() => (
                              <FormItem>
                                <FormLabel>Toplam Fiyat (€)</FormLabel>
                                <FormControl>
                                  <Input 
                                    value={(form.watch(`cost_items.${index}.adet`) * form.watch(`cost_items.${index}.birim_fiyat_euro`)).toFixed(2)}
                                    readOnly
                                    className="bg-muted"
                                    data-testid={`text-total-price-${index}`}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </Card>
                    ))}
                  </CardContent>
                </Card>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notlar</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Ek notlar veya özellikler" {...field} data-testid="textarea-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    İptal
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createAnalysisMutation.isPending}
                    data-testid="button-submit-analysis"
                  >
                    {createAnalysisMutation.isPending ? "Oluşturuluyor..." : "Maliyet Analizi Oluştur"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Toplam Analiz
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground" data-testid="text-total-reports">
              {statsLoading ? '...' : stats?.totalReports || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Bu ay +12%
            </p>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tank Modelleri
            </CardTitle>
            <Database className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground" data-testid="text-tank-models">
              {statsLoading ? '...' : stats?.tankModels || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Aktif tank tasarımları
            </p>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ortalama Maliyet
            </CardTitle>
            <Calculator className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground" data-testid="text-average-cost">
              €{statsLoading ? '...' : (stats?.averageCost || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Tank başına analiz
            </p>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tamamlama Oranı
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground" data-testid="text-completion-rate">
              {statsLoading ? '...' : Math.round(stats?.completionRate || 0)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Analiz tamamlama
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Analysis Table */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-foreground">
            Son Maliyet Analizleri
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <CostAnalysisTable data={analyses} loading={analysesLoading} showPagination={false} />
        </CardContent>
      </Card>
    </div>
  );
}