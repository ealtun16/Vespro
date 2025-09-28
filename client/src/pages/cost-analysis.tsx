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

// Simplified Vespro form schema
const vesproFormSchema = z.object({
  // Form Information (Mandatory)
  form_code: z.string().min(1, "Form code is required"),
  client_name: z.string().min(1, "Client name is required"),
  form_title: z.string().min(1, "Form title is required"),
  form_date: z.string().min(1, "Form date is required"),
  revision_no: z.number().min(0).default(0),
  currency: z.string().default("EUR"),
  
  // Tank Specifications (Mandatory)
  tank_name: z.string().min(1, "Tank name is required"),
  tank_type: z.string().min(1, "Tank type is required"),
  tank_width_mm: z.string().optional(),
  tank_height_mm: z.string().optional(),
  tank_diameter_mm: z.string().optional(),
  tank_volume: z.string().optional(),
  tank_surface_area: z.string().optional(),
  
  // Material Information
  tank_material_type: z.string().optional(),
  tank_material_grade: z.string().optional(),
  operating_pressure: z.string().optional(),
  operating_temperature: z.string().optional(),
  
  // Additional Fields
  drawing_revision: z.string().optional(),
  project_status: z.string().optional(),
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
      tank_type: "",
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
        tank_type: data.tank_type,
        tank_width_mm: data.tank_width_mm,
        tank_height_mm: data.tank_height_mm,
        tank_diameter_mm: data.tank_diameter_mm,
        tank_volume: data.tank_volume,
        tank_surface_area: data.tank_surface_area,
        tank_material_type: data.tank_material_type,
        tank_material_grade: data.tank_material_grade,
        operating_pressure: data.operating_pressure,
        operating_temperature: data.operating_temperature,
        drawing_revision: data.drawing_revision,
        project_status: data.project_status,
        notes: data.notes,
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

                    <div className="grid grid-cols-3 gap-4">
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
                      <FormField
                        control={form.control}
                        name="project_status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Project Status</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., In Progress, Completed" {...field} data-testid="input-project-status" />
                            </FormControl>
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
                    <CardTitle>Tank Specifications</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="tank_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tank Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="Tank identifier" {...field} data-testid="input-tank-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="tank_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tank Type *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-tank-type">
                                  <SelectValue placeholder="Select tank type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Storage Tank">Storage Tank</SelectItem>
                                <SelectItem value="Pressure Vessel">Pressure Vessel</SelectItem>
                                <SelectItem value="Heat Exchanger">Heat Exchanger</SelectItem>
                                <SelectItem value="Reactor">Reactor</SelectItem>
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
                        name="tank_width_mm"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Width (mm)</FormLabel>
                            <FormControl>
                              <Input placeholder="Width in mm" {...field} data-testid="input-tank-width" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="tank_height_mm"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Height (mm)</FormLabel>
                            <FormControl>
                              <Input placeholder="Height in mm" {...field} data-testid="input-tank-height" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="tank_diameter_mm"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Diameter (mm)</FormLabel>
                            <FormControl>
                              <Input placeholder="Diameter in mm" {...field} data-testid="input-tank-diameter" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="tank_volume"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Volume (m³)</FormLabel>
                            <FormControl>
                              <Input placeholder="Volume in cubic meters" {...field} data-testid="input-tank-volume" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="tank_surface_area"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Surface Area (m²)</FormLabel>
                            <FormControl>
                              <Input placeholder="Surface area in sq meters" {...field} data-testid="input-tank-surface-area" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="tank_material_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Material Type</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., EVATHERM, Steel" {...field} data-testid="input-material-type" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="tank_material_grade"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Material Grade</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., 1.4410, super duplex" {...field} data-testid="input-material-grade" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="operating_pressure"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Operating Pressure</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., 0 BAR, Normal Pressure" {...field} data-testid="input-operating-pressure" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="operating_temperature"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Operating Temperature</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., SICAKLIK, Room Temperature" {...field} data-testid="input-operating-temperature" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="drawing_revision"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Drawing Revision</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Rev-01, 1788V01-EV1" {...field} data-testid="input-drawing-revision" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Additional notes or specifications" {...field} data-testid="textarea-notes" />
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