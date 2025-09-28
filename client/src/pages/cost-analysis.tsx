import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import CostAnalysisTable from "@/components/tables/cost-analysis-table";
import { useTranslation } from "@/lib/i18n";

// Turkish Vespro form schema
const vesproFormSchema = z.object({
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
  
  // Additional Fields
  notes: z.string().optional(),
});

type VesproFormData = z.infer<typeof vesproFormSchema>;

export default function CostAnalysis() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const form = useForm<VesproFormData>({
    resolver: zodResolver(vesproFormSchema),
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
    },
  });

  const createFormMutation = useMutation({
    mutationFn: async (data: VesproFormData) => {
      // Create the Vespro form
      const formPayload = {
        form_code: data.form_code,
        client_name: data.client_name,
        form_title: data.form_title,
        form_date: data.form_date,
        revision_no: data.revision_no,
        currency: data.currency,
        tank_name: data.tank_name,
        tank_diameter_mm: data.tank_capi.toString(), // Tank çapı
        tank_height_mm: data.silindirik_yukseklik.toString(), // Silindirik yükseklik
        tank_volume: data.volume.toString(), // Volume
        tank_material_grade: data.malzeme_kalitesi, // Malzeme kalitesi
        operating_pressure: data.basinc, // Basınç
        operating_temperature: data.sicaklik.toString(), // Sıcaklık
        notes: data.notes,
        // Turkish specific fields in metadata
        metadata: {
          insulation: data.insulation,
          karistirici: data.karistirici,
          ceket_serpantin: data.ceket_serpantin,
          govde_acinimi: data.govde_acinimi,
        },
      };

      return await apiRequest("POST", "/api/vespro/forms", formPayload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cost-analyses"] });
      setOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Cost analysis form created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create cost analysis form",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: VesproFormData) => {
    createFormMutation.mutate(data);
  };

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">
            {t('costAnalysis.title')}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground" data-testid="text-page-description">
            Create and manage cost analysis forms manually
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-cost-analysis">
              <Plus className="mr-2 h-4 w-4" />
              Create Cost Analysis
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Cost Analysis Form</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Form Information Section */}
                <Card>
                  <CardHeader>
                    <CardTitle>Form Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="form_code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Form Code *</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., CA-001" {...field} data-testid="input-form-code" />
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
                            <FormLabel>Client Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="Client or company name" {...field} data-testid="input-client-name" />
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
                            <FormLabel>Form Title *</FormLabel>
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
                            <FormLabel>Form Date *</FormLabel>
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
                            <FormLabel>Revision Number</FormLabel>
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
                            <FormLabel>Currency</FormLabel>
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

                {/* Tank Specifications Section - Turkish Fields */}
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
                  </CardContent>
                </Card>

                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createFormMutation.isPending}
                    data-testid="button-submit-cost-analysis"
                  >
                    {createFormMutation.isPending ? "Creating..." : "Create Cost Analysis"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <CostAnalysisTable />
    </div>
  );
}