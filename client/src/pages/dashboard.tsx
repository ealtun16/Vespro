import { useState, useEffect } from "react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Database,
  Calculator,
  FileText,
  Upload,
} from "lucide-react";
import { Edit } from "lucide-react";
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
  const [editMode, setEditMode] = useState(false);
  const [editingAnalysis, setEditingAnalysis] = useState<any>(null);
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteAnalysisId, setDeleteAnalysisId] = useState<string | null>(null);
  const [deleteAnalysisDialogOpen, setDeleteAnalysisDialogOpen] = useState(false);
  const [excelViewOpen, setExcelViewOpen] = useState(false);
  const [excelViewData, setExcelViewData] = useState<any>(null);
  const [excelLoading, setExcelLoading] = useState(false);
  const { toast } = useToast();

  // Fetch Turkish cost analyses
  const { data: analyses, isLoading: analysesLoading, refetch: refetchAnalyses } = useQuery({
    queryKey: ["turkish-cost-analyses"],
    queryFn: async () => {
      const response = await fetch("/api/turkish-cost-analyses");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  // Fetch orders list (combined view with costs)
  const { data: ordersListData, isLoading: ordersListLoading, refetch: refetchOrdersList } = useQuery({
    queryKey: ["orders-list"],
    queryFn: async () => {
      const response = await fetch("/api/orders/list");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  // Fetch tank orders (from Excel upload) - kept for backward compatibility
  const { data: tankOrdersData, isLoading: tankOrdersLoading, refetch: refetchTankOrders } = useQuery({
    queryKey: ["tank-orders"],
    queryFn: async () => {
      const response = await fetch("/api/tank-orders");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    },
    staleTime: 0,
    refetchOnMount: true,
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
      console.log("Submitting Turkish cost analysis data:", data);
      return await apiRequest("POST", "/api/turkish-cost-analyses", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/turkish-cost-analyses"] });
      closeDialog();
      refetchAnalyses();
      toast({
        title: "Başarılı",
        description: "Türkçe maliyet analizi başarıyla oluşturuldu",
      });
    },
    onError: (error: any) => {
      console.error("Turkish cost analysis creation error:", error);
      
      let errorMessage = "Maliyet analizi oluşturulamadı";
      let errorDetails = "";

      if (error?.response?.data) {
        const errorData = error.response.data;
        errorMessage = errorData.message || errorMessage;
        errorDetails = errorData.details || "";
        
        // If we have Zod validation errors, show them in a more user-friendly way
        if (errorData.errors && Array.isArray(errorData.errors)) {
          errorDetails = errorData.errors.map((err: any) => 
            `${err.path.join(' → ')}: ${err.message}`
          ).join('\n');
        }
      } else if (error?.message) {
        errorDetails = error.message;
      }

      toast({
        title: "Hata",
        description: errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage,
        variant: "destructive",
      });
    },
  });

  const updateAnalysisMutation = useMutation({
    mutationFn: async (data: TurkishCostAnalysisFormData) => {
      console.log("Updating Turkish cost analysis data:", data);
      const response = await apiRequest("PUT", `/api/turkish-cost-analyses/${editingAnalysis.id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/turkish-cost-analyses"] });
      closeDialog();
      refetchAnalyses();
      toast({
        title: "Başarılı",
        description: "Türkçe maliyet analizi başarıyla güncellendi",
      });
    },
    onError: (error: any) => {
      console.error("Turkish cost analysis update error:", error);
      
      let errorMessage = "Maliyet analizi güncellenemedi";
      let errorDetails = "";

      if (error?.response?.data) {
        const errorData = error.response.data;
        errorMessage = errorData.message || errorMessage;
        errorDetails = errorData.details || "";
        
        if (errorData.errors && Array.isArray(errorData.errors)) {
          errorDetails = errorData.errors.map((err: any) => 
            `${err.path.join(' → ')}: ${err.message}`
          ).join('\n');
        }
      } else if (error?.message) {
        errorDetails = error.message;
      }

      toast({
        title: "Hata",
        description: errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage,
        variant: "destructive",
      });
    },
  });

  const deleteTankOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return await apiRequest("DELETE", `/api/tank-orders/${orderId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tank-orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders-list"] });
      refetchTankOrders();
      refetchOrdersList();
      setDeleteDialogOpen(false);
      setDeleteOrderId(null);
      toast({
        title: "Başarılı",
        description: "Form başarıyla silindi",
      });
    },
    onError: (error: any) => {
      console.error("Tank order delete error:", error);
      toast({
        title: "Hata",
        description: "Form silinirken hata oluştu",
        variant: "destructive",
      });
    },
  });

  const deleteTurkishAnalysisMutation = useMutation({
    mutationFn: async (analysisId: string) => {
      return await apiRequest("DELETE", `/api/turkish-cost-analyses/${analysisId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["turkish-cost-analyses"] });
      refetchAnalyses();
      setDeleteAnalysisDialogOpen(false);
      setDeleteAnalysisId(null);
      toast({
        title: "Başarılı",
        description: "Maliyet analizi başarıyla silindi",
      });
    },
    onError: (error: any) => {
      console.error("Turkish analysis delete error:", error);
      toast({
        title: "Hata",
        description: "Maliyet analizi silinirken hata oluştu",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TurkishCostAnalysisFormData) => {
    if (editMode && editingAnalysis) {
      updateAnalysisMutation.mutate(data);
    } else {
      createAnalysisMutation.mutate(data);
    }
  };

  const closeDialog = () => {
    setOpen(false);
    setEditMode(false);
    setEditingAnalysis(null);
    form.reset();
  };

  const openCreateDialog = () => {
    setEditMode(false);
    setEditingAnalysis(null);
    form.reset();
    setOpen(true);
  };

  const openEditDialog = async (analysis: any) => {
    try {
      // Fetch full analysis data with items
      const response = await apiRequest("GET", `/api/turkish-cost-analyses/${analysis.id}`);
      const fullData = await response.json();
      
      setEditMode(true);
      setEditingAnalysis(fullData.analysis);
      
      // Pre-populate form with existing data
      form.reset({
        form_code: fullData.analysis.form_code,
        client_name: fullData.analysis.client_name,
        form_title: fullData.analysis.form_title,
        form_date: fullData.analysis.form_date,
        revision_no: parseInt(fullData.analysis.revision_no) || 0,
        currency: fullData.analysis.currency || "EUR",
        tank_name: fullData.analysis.tank_name,
        tank_capi: parseFloat(fullData.analysis.tank_capi) || 0,
        silindirik_yukseklik: parseFloat(fullData.analysis.silindirik_yukseklik) || 0,
        insulation: fullData.analysis.insulation,
        karistirici: fullData.analysis.karistirici,
        ceket_serpantin: fullData.analysis.ceket_serpantin,
        volume: parseFloat(fullData.analysis.volume) || 0,
        malzeme_kalitesi: fullData.analysis.malzeme_kalitesi,
        basinc: fullData.analysis.basinc,
        govde_acinimi: parseFloat(fullData.analysis.govde_acinimi) || 0,
        sicaklik: parseFloat(fullData.analysis.sicaklik) || 0,
        notes: fullData.analysis.notes || "",
        cost_items: fullData.items.map((item: any) => ({
          maliyet_faktoru: item.maliyet_faktoru,
          malzeme_kalitesi_item: item.malzeme_kalitesi_item || "",
          malzeme_tipi: item.malzeme_tipi || "",
          adet: parseFloat(item.adet) || 0,
          toplam_miktar: parseFloat(item.toplam_miktar) || 0,
          birim: item.birim,
          birim_fiyat_euro: parseFloat(item.birim_fiyat_euro) || 0,
        }))
      });
      
      setOpen(true);
    } catch (error) {
      toast({
        title: "Hata", 
        description: "Analiz verileri yüklenemedi",
        variant: "destructive",
      });
    }
  };

  const handleViewExcel = async (orderId: string) => {
    setExcelLoading(true);
    setExcelViewOpen(true);
    setExcelViewData(null);
    try {
      const response = await fetch(`/api/tank-orders/${orderId}/excel`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Excel dosyası yüklenemedi:', {
          orderId,
          status: response.status,
          message: errorData.message
        });
        throw new Error(errorData.message || 'Excel dosyası yüklenemedi');
      }
      
      const data = await response.json();
      
      // Log the file path for debugging
      console.log('Excel dosyası yüklendi:', {
        filename: data.filename,
        filePath: data.filePath,
        orderId
      });
      
      setExcelViewData(data);
    } catch (error) {
      console.error('Excel görüntüleme hatası:', error);
      setExcelViewData({ 
        error: true, 
        message: error instanceof Error ? error.message : 'Excel dosyası bulunamadı veya yol hatalı' 
      });
    } finally {
      setExcelLoading(false);
    }
  };

  const handleExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/excel/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Excel yükleme başarısız');
      }

      const result = await response.json();
      
      // Refresh the analyses list and tank orders after successful upload
      refetchAnalyses();
      refetchTankOrders();
      refetchOrdersList();
      
      // Handle multi-sheet results
      if (result.results) {
        const { totalSheets, successfulSheets, failedSheets, tankOrderIds } = result.results;
        
        // Show success toast with sheet counts
        toast({
          title: "Excel Dosyası Yüklendi",
          description: `${totalSheets} sayfa işlendi: ${successfulSheets} başarılı${failedSheets > 0 ? `, ${failedSheets} başarısız` : ''}`,
          variant: failedSheets > 0 ? "default" : "default",
        });
        
        // Open modal for the first successful sheet
        if (tankOrderIds.length > 0) {
          await handleViewExcel(tankOrderIds[0]);
        }
      } else if (result.tankOrderId) {
        // Legacy single sheet support
        await handleViewExcel(result.tankOrderId);
        toast({
          title: "Başarılı",
          description: "Excel dosyası yüklendi",
        });
      }
      
      // Reset file input
      event.target.value = '';
    } catch (error) {
      console.error('Excel upload error:', error);
      toast({
        title: "Hata",
        description: "Excel dosyası yüklenirken hata oluştu",
        variant: "destructive",
      });
      event.target.value = '';
    }
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
      const response = await apiRequest("GET", `/api/turkish-cost-analyses/${id}`);
      const data = await response.json();
      setSelectedAnalysis(data);
      setViewOpen(true);
    } catch (error) {
      toast({
        title: "Hata",
        description: "Analiz detayları yüklenemedi",
        variant: "destructive",
      });
    }
  };

  // Calculate summary statistics from orders list (includes both Excel and manual entries)
  const totalAnalyses = (ordersListData as any)?.orders?.length || 0;
  const totalCost = (ordersListData as any)?.orders?.reduce((sum: number, order: any) => {
    return sum + (parseFloat(order.total_price_eur) || 0);
  }, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            Maliyet Analiz Yönetimi
          </h1>
          <p className="mt-2 text-sm text-muted-foreground" data-testid="text-page-description">
            Tank maliyet analizlerini oluşturun, görüntüleyin ve yönetin
          </p>
        </div>

        <div className="flex gap-2">
          <Dialog open={open} onOpenChange={(isOpen) => {
            if (isOpen && !editMode) {
              // Opening for create mode - reset form
              setEditMode(false);
              setEditingAnalysis(null);
              form.reset({
                form_code: `TCA-${Date.now()}`,
                client_name: "",
                form_title: "TÜRKİYE MALİYET ANALİZ FORMU",
                form_date: new Date().toISOString().split("T")[0],
                revision_no: 0,
                currency: "EUR",
                tank_name: "",
                tank_capi: 0,
                silindirik_yukseklik: 0,
                insulation: "yok",
                karistirici: "yok",
                ceket_serpantin: "yok",
                volume: 0,
                malzeme_kalitesi: "",
                basinc: "",
                govde_acinimi: 0,
                sicaklik: 20,
                notes: "",
                cost_items: [
                  {
                    maliyet_faktoru: "",
                    malzeme_kalitesi_item: "",
                    malzeme_tipi: "",
                    adet: 0,
                    toplam_miktar: 0,
                    birim: "",
                    birim_fiyat_euro: 0,
                  }
                ],
              });
            }
            setOpen(isOpen);
          }}>
          <DialogTrigger asChild>
            <Button size="lg" data-testid="button-create-analysis">
              <Plus className="mr-2 h-5 w-5" />
              Yeni Maliyet Analizi
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editMode ? "Maliyet Analizini Düzenle" : "Yeni Türkçe Maliyet Analizi Formu"}
              </DialogTitle>
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
                                onChange={(e) => field.onChange(e.target.value)}
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
                                onChange={(e) => field.onChange(e.target.value)}
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
                                onChange={(e) => field.onChange(e.target.value)}
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
                                onChange={(e) => field.onChange(e.target.value)}
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
                                onChange={(e) => field.onChange(e.target.value)}
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
                                    onChange={(e) => field.onChange(e.target.value)}
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
                                    onChange={(e) => field.onChange(e.target.value)}
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
                                    onChange={(e) => field.onChange(e.target.value)}
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
                  <Button type="button" variant="outline" onClick={closeDialog}>
                    İptal
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createAnalysisMutation.isPending || updateAnalysisMutation.isPending} 
                    data-testid="button-submit-form"
                  >
                    {editMode 
                      ? (updateAnalysisMutation.isPending ? "Güncelleniyor..." : "Analizi Güncelle")
                      : (createAnalysisMutation.isPending ? "Oluşturuluyor..." : "Analiz Oluştur")
                    }
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      </div>

      {/* Excel Upload Button */}
      <div className="flex justify-end">
        <Button 
          size="lg" 
          variant="outline"
          onClick={() => document.getElementById('excel-upload')?.click()}
          data-testid="button-upload-excel"
        >
          <Upload className="mr-2 h-5 w-5" />
          Excel Dosyası Yükle
        </Button>
        <input
          id="excel-upload"
          type="file"
          accept=".xlsx,.xls"
          style={{ display: 'none' }}
          onChange={handleExcelUpload}
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Toplam Analiz Sayısı
            </CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-analyses">
              {totalAnalyses}
            </div>
            <p className="text-xs text-muted-foreground">
              Kayıtlı maliyet analizi
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Toplam Maliyet
            </CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-cost">
              €{totalCost.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Tüm analizler toplamı
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Sistem Durumu
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-system-status">
              Aktif
            </div>
            <p className="text-xs text-muted-foreground">
              Türkçe maliyet analizi sistemi
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tank Cost Analysis Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tank Maliyet Analizi</CardTitle>
        </CardHeader>
        <CardContent>
          {ordersListLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Yükleniyor...</div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ürün Kodu</TableHead>
                  <TableHead>Tank Ölçüleri</TableHead>
                  <TableHead>Malzeme Kalitesi</TableHead>
                  <TableHead className="text-right">Toplam Malzeme Kg</TableHead>
                  <TableHead className="text-right">Satış Fiyatı €</TableHead>
                  <TableHead>Kaynak</TableHead>
                  <TableHead>Oluşturma / Güncelleme</TableHead>
                  <TableHead>İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(ordersListData as any)?.orders?.map((order: any) => {
                  const tankDimensions = [
                    order.diameter_mm ? `Ø${parseFloat(order.diameter_mm).toFixed(0)}` : null,
                    order.length_mm ? `${parseFloat(order.length_mm).toFixed(0)}mm` : null,
                    order.pressure_bar ? `${parseFloat(order.pressure_bar).toFixed(1)} bar` : null,
                  ].filter(Boolean).join(' × ');

                  const createdDate = order.created_date ? new Date(order.created_date).toLocaleDateString('tr-TR') : '-';
                  const updatedAt = order.updated_at ? new Date(order.updated_at).toLocaleDateString('tr-TR') : '-';

                  return (
                    <TableRow key={order.id}>
                      <TableCell data-testid={`text-kod-${order.id}`} className="font-medium">
                        {order.kod || '-'}
                      </TableCell>
                      <TableCell data-testid={`text-tank-dimensions-${order.id}`}>
                        {tankDimensions || '-'}
                      </TableCell>
                      <TableCell data-testid={`text-material-grade-${order.id}`}>
                        {order.material_grade || '-'}
                      </TableCell>
                      <TableCell data-testid={`text-total-weight-${order.id}`} className="text-right">
                        {parseFloat(order.total_weight_kg || 0).toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2})} kg
                      </TableCell>
                      <TableCell data-testid={`text-total-${order.id}`} className="text-right font-bold">
                        €{parseFloat(order.total_price_eur || 0).toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </TableCell>
                      <TableCell data-testid={`text-source-${order.id}`}>
                        <span 
                          className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                            order.source_kind === 'Excel' 
                              ? 'bg-green-50 text-green-700 ring-green-700/10' 
                              : 'bg-blue-50 text-blue-700 ring-blue-700/10'
                          }`}
                          title={order.source_filename || order.source_kind}
                        >
                          {order.source_kind}
                        </span>
                      </TableCell>
                      <TableCell data-testid={`text-dates-${order.id}`}>
                        <div className="flex flex-col text-sm">
                          <span>{createdDate}</span>
                          <span className="text-xs text-muted-foreground">{updatedAt}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewExcel(order.id)}
                            data-testid={`button-view-${order.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setDeleteOrderId(order.id);
                              setDeleteDialogOpen(true);
                            }}
                            data-testid={`button-delete-${order.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                
                {/* Empty State */}
                {(!(ordersListData as any)?.orders || (ordersListData as any).orders.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      Henüz maliyet analizi bulunamadı. Manuel form oluşturmak veya Excel dosyası yüklemek için yukarıdaki butonları kullanın.
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
                            <TableCell>€{parseFloat(item.birim_fiyat_euro).toFixed(2)}</TableCell>
                            <TableCell>
                              €{(Number(item.adet) * Number(item.birim_fiyat_euro)).toFixed(2)}
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

      {/* Delete Tank Order Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Formu Silmek İstediğinize Emin Misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem geri alınamaz. Form ve ilgili tüm maliyet verileri kalıcı olarak silinecektir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteOrderId) {
                  deleteTankOrderMutation.mutate(deleteOrderId);
                }
              }}
              data-testid="button-confirm-delete"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Turkish Analysis Confirmation Dialog */}
      <AlertDialog open={deleteAnalysisDialogOpen} onOpenChange={setDeleteAnalysisDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Maliyet Analizini Silmek İstediğinize Emin Misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem geri alınamaz. Maliyet analizi ve ilgili tüm maliyet kalemleri kalıcı olarak silinecektir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-analysis">İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteAnalysisId) {
                  deleteTurkishAnalysisMutation.mutate(deleteAnalysisId);
                }
              }}
              data-testid="button-confirm-delete-analysis"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Excel View Modal */}
      {excelViewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setExcelViewOpen(false)}
          />
          
          <div className="relative z-10 bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-[95vw] h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">
                {excelViewData?.filename || 'Excel Dosyası'}
              </h2>
              <div className="flex items-center gap-2">
                {excelViewData?.filename && (
                  <Button
                    onClick={() => {
                      try {
                        const a = document.createElement('a');
                        a.href = `/download/${excelViewData.filename}`;
                        a.download = excelViewData.filename;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        
                        toast({
                          title: "Başarılı",
                          description: "Excel dosyası indirildi",
                        });
                      } catch (error) {
                        console.error('İndirme hatası:', error);
                        toast({
                          title: "Hata",
                          description: "Excel dosyası indirilemedi",
                          variant: "destructive",
                        });
                      }
                    }}
                    variant="outline"
                    size="sm"
                    data-testid="button-download-excel"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    İndir
                  </Button>
                )}
                <Button
                  onClick={() => setExcelViewOpen(false)}
                  variant="ghost"
                  size="sm"
                  data-testid="button-close-excel"
                >
                  ✕
                </Button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-4">
              {excelLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-muted-foreground">Yükleniyor...</div>
                </div>
              ) : excelViewData?.error ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="text-destructive text-lg font-semibold mb-2">
                      Dosya Bulunamadı
                    </div>
                    <div className="text-muted-foreground">
                      {excelViewData.message || 'Excel dosyası bulunamadı veya yol hatalı'}
                    </div>
                    <div className="text-sm text-muted-foreground mt-4">
                      Lütfen dosyanın yüklendiğinden emin olun veya tekrar deneyin.
                    </div>
                  </div>
                </div>
              ) : excelViewData?.html ? (
                <div 
                  dangerouslySetInnerHTML={{ __html: excelViewData.html }}
                  className="excel-table"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-muted-foreground">Excel verisi bulunamadı</div>
                </div>
              )}
            </div>
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
          `}</style>
        </div>
      )}
    </div>
  );
}