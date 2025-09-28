import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Trash2,
  Eye,
} from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Turkish cost analysis form schema
const turkishCostAnalysisSchema = z.object({
  // Form Information
  form_code: z.string().min(1, "Form kodu gerekli"),
  client_name: z.string().min(1, "Müşteri adı gerekli"),
  form_title: z.string().min(1, "Form başlığı gerekli"),
  form_date: z.string().min(1, "Form tarihi gerekli"),
  revision_no: z.coerce.number().min(0).default(0),
  currency: z.string().default("EUR"),

  // Turkish Tank Specifications
  tank_name: z.string().min(1, "Tank adı gerekli"),
  tank_capi: z.coerce.number().min(1, "Tank çapı gerekli"),
  silindirik_yukseklik: z.coerce.number().min(1, "Silindirik yükseklik gerekli"),
  insulation: z.enum(["var", "yok"]),
  karistirici: z.enum(["var", "yok"]),
  ceket_serpantin: z.enum(["var", "yok"]),
  volume: z.coerce.number().min(0.1, "Volume gerekli"),
  malzeme_kalitesi: z.string().min(1, "Malzeme kalitesi gerekli"),
  basinc: z.string().min(1, "Basınç gerekli"),
  govde_acinimi: z.coerce.number().min(0, "Gövde açınımı gerekli"),
  sicaklik: z.coerce.number(),

  // Cost Items
  cost_items: z
    .array(
      z.object({
        maliyet_faktoru: z.string().min(1, "Maliyet faktörü gerekli"),
        malzeme_kalitesi_item: z.string().optional(),
        malzeme_tipi: z.string().optional(),
        adet: z.coerce.number().min(0, "Adet gerekli"),
        toplam_miktar: z.coerce.number().min(0, "Toplam miktar gerekli"),
        birim: z.string().min(1, "Birim gerekli"),
        birim_fiyat_euro: z.coerce.number().min(0, "Birim fiyat gerekli"),
      }),
    )
    .min(1, "En az bir maliyet faktörü eklenmeli"),

  notes: z.string().optional(),
});

type TurkishCostAnalysisFormData = z.infer<typeof turkishCostAnalysisSchema>;

export default function Dashboard() {
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<any>(null);
  const { toast } = useToast();

  // Fetch Turkish cost analyses
  const { data: analyses, isLoading: analysesLoading, refetch: refetchAnalyses } = useQuery({
    queryKey: ["/api/turkish-cost-analyses"],
    queryFn: () => apiRequest("GET", "/api/turkish-cost-analyses"),
  });

  const form = useForm<TurkishCostAnalysisFormData>({
    resolver: zodResolver(turkishCostAnalysisSchema),
    defaultValues: {
      form_code: `TCA-${Date.now()}`,
      client_name: "",
      form_title: "TÜRKİYE MALİYET ANALİZ FORMU",
      form_date: new Date().toISOString().split("T")[0],
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
      cost_items: [
        {
          maliyet_faktoru: "",
          malzeme_kalitesi_item: "",
          malzeme_tipi: "",
          adet: 1,
          toplam_miktar: 1,
          birim: "kg",
          birim_fiyat_euro: 0,
        },
      ],
      notes: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "cost_items",
  });

  const createAnalysisMutation = useMutation({
    mutationFn: async (data: TurkishCostAnalysisFormData) => {
      return await apiRequest("POST", "/api/turkish-cost-analyses", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/turkish-cost-analyses"] });
      setOpen(false);
      form.reset();
      refetchAnalyses();
      toast({
        title: "Başarılı",
        description: "Türkçe maliyet analizi başarıyla oluşturuldu",
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

  const onSubmit = (data: TurkishCostAnalysisFormData) => {
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

  const viewAnalysis = async (id: string) => {
    try {
      const analysis = await apiRequest("GET", `/api/turkish-cost-analyses/${id}`);
      setSelectedAnalysis(analysis);
      setViewOpen(true);
    } catch (error) {
      toast({
        title: "Hata",
        description: "Analiz detayları yüklenemedi",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            Türkçe Maliyet Analizi Dashboard
          </h1>
          <p className="mt-2 text-sm text-muted-foreground" data-testid="text-page-description">
            Yeni maliyet analizi oluşturun ve mevcut analizleri görüntüleyin
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="lg" data-testid="button-create-analysis">
              <Plus className="mr-2 h-5 w-5" />
              Yeni Maliyet Analizi
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Yeni Türkçe Maliyet Analizi Formu</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Form Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Form Bilgileri</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="form_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Form Kodu *</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-form-code" />
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
                            <Input {...field} data-testid="input-client-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
                  </CardContent>
                </Card>

                {/* Tank Specifications */}
                <Card>
                  <CardHeader>
                    <CardTitle>Tank Özellikleri</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="tank_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tank Adı *</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-tank-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="tank_capi"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tank Çapı (mm) *</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
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
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                                data-testid="input-silindirik-yukseklik"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
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
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                                data-testid="input-volume"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="insulation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Insulation *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-insulation">
                                  <SelectValue />
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
                                  <SelectValue />
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
                                  <SelectValue />
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
                        name="malzeme_kalitesi"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Malzeme Kalitesi *</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-malzeme-kalitesi" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="basinc"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Basınç *</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-basinc" />
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
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
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
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
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

                {/* Cost Items */}
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>Maliyet Faktörleri *</CardTitle>
                      <Button type="button" onClick={addCostItem} data-testid="button-add-cost-item">
                        <Plus className="mr-2 h-4 w-4" />
                        Faktör Ekle
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {fields.map((field, index) => (
                      <div key={field.id} className="border rounded p-4 space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium">Maliyet Faktörü #{index + 1}</h4>
                          {fields.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => remove(index)}
                              data-testid={`button-remove-cost-item-${index}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name={`cost_items.${index}.maliyet_faktoru`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Maliyet Faktörü *</FormLabel>
                                <FormControl>
                                  <Input {...field} data-testid={`input-maliyet-faktoru-${index}`} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`cost_items.${index}.malzeme_tipi`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Malzeme Tipi</FormLabel>
                                <FormControl>
                                  <Input {...field} data-testid={`input-malzeme-tipi-${index}`} />
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
                                    <SelectItem value="m²">m²</SelectItem>
                                    <SelectItem value="m³">m³</SelectItem>
                                    <SelectItem value="set">set</SelectItem>
                                  </SelectContent>
                                </Select>
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
                                    {...field}
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                    data-testid={`input-adet-${index}`}
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
                                    {...field}
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                    data-testid={`input-toplam-miktar-${index}`}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`cost_items.${index}.birim_fiyat_euro`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Birim Fiyat (EUR) *</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    {...field}
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                    data-testid={`input-birim-fiyat-${index}`}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Notes */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notlar</FormLabel>
                      <FormControl>
                        <Textarea {...field} data-testid="input-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-4">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    İptal
                  </Button>
                  <Button type="submit" disabled={createAnalysisMutation.isPending} data-testid="button-submit-form">
                    {createAnalysisMutation.isPending ? "Oluşturuluyor..." : "Analiz Oluştur"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Existing Analyses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Mevcut Maliyet Analizleri</CardTitle>
        </CardHeader>
        <CardContent>
          {analysesLoading ? (
            <div>Yükleniyor...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Form Kodu</TableHead>
                  <TableHead>Müşteri Adı</TableHead>
                  <TableHead>Tank Adı</TableHead>
                  <TableHead>Form Tarihi</TableHead>
                  <TableHead>Toplam Maliyet</TableHead>
                  <TableHead>İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(analyses as any)?.analyses?.map((analysis: any) => (
                  <TableRow key={analysis.id}>
                    <TableCell data-testid={`text-form-code-${analysis.id}`}>{analysis.form_code}</TableCell>
                    <TableCell data-testid={`text-client-name-${analysis.id}`}>{analysis.client_name}</TableCell>
                    <TableCell data-testid={`text-tank-name-${analysis.id}`}>{analysis.tank_name}</TableCell>
                    <TableCell data-testid={`text-form-date-${analysis.id}`}>{analysis.form_date}</TableCell>
                    <TableCell data-testid={`text-total-cost-${analysis.id}`}>
                      {analysis.total_cost ? `${analysis.total_cost} EUR` : "-"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => viewAnalysis(analysis.id)}
                        data-testid={`button-view-${analysis.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(!(analyses as any)?.analyses || (analyses as any).analyses.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Henüz maliyet analizi bulunamadı
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Analysis Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Maliyet Analizi Detayları</DialogTitle>
          </DialogHeader>
          {selectedAnalysis && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Form Bilgileri</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <strong>Form Kodu:</strong> {selectedAnalysis.analysis.form_code}
                  </div>
                  <div>
                    <strong>Müşteri:</strong> {selectedAnalysis.analysis.client_name}
                  </div>
                  <div>
                    <strong>Form Başlığı:</strong> {selectedAnalysis.analysis.form_title}
                  </div>
                  <div>
                    <strong>Tarih:</strong> {selectedAnalysis.analysis.form_date}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tank Özellikleri</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <strong>Tank Adı:</strong> {selectedAnalysis.analysis.tank_name}
                  </div>
                  <div>
                    <strong>Tank Çapı:</strong> {selectedAnalysis.analysis.tank_capi} mm
                  </div>
                  <div>
                    <strong>Silindirik Yükseklik:</strong> {selectedAnalysis.analysis.silindirik_yukseklik} mm
                  </div>
                  <div>
                    <strong>Volume:</strong> {selectedAnalysis.analysis.volume} m³
                  </div>
                  <div>
                    <strong>Insulation:</strong> {selectedAnalysis.analysis.insulation}
                  </div>
                  <div>
                    <strong>Karıştırıcı:</strong> {selectedAnalysis.analysis.karistirici}
                  </div>
                  <div>
                    <strong>Malzeme Kalitesi:</strong> {selectedAnalysis.analysis.malzeme_kalitesi}
                  </div>
                  <div>
                    <strong>Basınç:</strong> {selectedAnalysis.analysis.basinc}
                  </div>
                </CardContent>
              </Card>

              {selectedAnalysis.items && selectedAnalysis.items.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Maliyet Faktörleri</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Maliyet Faktörü</TableHead>
                          <TableHead>Malzeme Tipi</TableHead>
                          <TableHead>Adet</TableHead>
                          <TableHead>Toplam Miktar</TableHead>
                          <TableHead>Birim</TableHead>
                          <TableHead>Birim Fiyat</TableHead>
                          <TableHead>Toplam</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedAnalysis.items.map((item: any) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.maliyet_faktoru}</TableCell>
                            <TableCell>{item.malzeme_tipi || "-"}</TableCell>
                            <TableCell>{item.adet}</TableCell>
                            <TableCell>{item.toplam_miktar}</TableCell>
                            <TableCell>{item.birim}</TableCell>
                            <TableCell>{item.birim_fiyat_euro} EUR</TableCell>
                            <TableCell>
                              {(Number(item.adet) * Number(item.birim_fiyat_euro)).toFixed(2)} EUR
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {selectedAnalysis.analysis.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>Notlar</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>{selectedAnalysis.analysis.notes}</p>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end">
                <Button onClick={() => setViewOpen(false)}>Kapat</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}