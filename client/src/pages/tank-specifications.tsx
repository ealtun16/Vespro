import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const tankSpecSchema = z.object({
  // Form Information (Mandatory)
  name: z.string().min(1, "Tank name is required"),
  type: z.string().min(1, "Tank type is required"),
  
  // Tank Specifications (Mandatory)
  capacity: z.number().min(1, "Capacity must be greater than 0"),
  height: z.number().min(1, "Height must be greater than 0"),
  diameter: z.number().optional(),
  width: z.number().optional(),
  
  // Material Information (Mandatory)
  material: z.string().min(1, "Material is required"),
  material_type: z.string().optional(),
  material_grade: z.string().optional(),
  thickness: z.number().optional(),
  
  // Operating Conditions
  pressure: z.number().optional(),
  pressure_text: z.string().optional(),
  temperature: z.number().optional(),
  temperature_text: z.string().optional(),
  
  // Additional Fields
  volume_calculated: z.number().optional(),
  surface_area: z.number().optional(),
  drawing_reference: z.string().optional(),
  features: z.string().optional(),
});

type TankSpecFormData = z.infer<typeof tankSpecSchema>;

export default function TankSpecifications() {
  const [open, setOpen] = useState(false);
  const [editingSpec, setEditingSpec] = useState<any>(null);
  const { toast } = useToast();

  const { data: specifications, isLoading } = useQuery({
    queryKey: ["/api/tank-specifications"],
  });

  const form = useForm<TankSpecFormData>({
    resolver: zodResolver(tankSpecSchema),
    defaultValues: {
      name: "",
      type: "",
      capacity: 1000,
      height: 2000,
      material: "Steel",
      material_type: "",
      material_grade: "",
      pressure_text: "",
      temperature_text: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: TankSpecFormData) => {
      const processedData = {
        ...data,
        features: data.features ? JSON.parse(`{"notes": "${data.features}"}`) : null,
      };
      return apiRequest("POST", "/api/tank-specifications", processedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tank-specifications"] });
      setOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Tank specification created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create tank specification",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: TankSpecFormData) => {
      const processedData = {
        ...data,
        features: data.features ? JSON.parse(`{"notes": "${data.features}"}`) : null,
      };
      return apiRequest("PUT", `/api/tank-specifications/${editingSpec.id}`, processedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tank-specifications"] });
      setOpen(false);
      setEditingSpec(null);
      form.reset();
      toast({
        title: "Success",
        description: "Tank specification updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update tank specification",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/tank-specifications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tank-specifications"] });
      toast({
        title: "Success",
        description: "Tank specification deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete tank specification",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TankSpecFormData) => {
    if (editingSpec) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const openEditDialog = (spec: any) => {
    setEditingSpec(spec);
    form.reset({
      name: spec.name,
      type: spec.type,
      capacity: spec.capacity,
      height: spec.height,
      diameter: spec.diameter,
      width: spec.width,
      material: spec.material,
      material_type: spec.material_type || "",
      material_grade: spec.material_grade || "",
      pressure: spec.pressure ? parseFloat(spec.pressure) : undefined,
      pressure_text: spec.pressure_text || "",
      temperature: spec.temperature ? parseFloat(spec.temperature) : undefined,
      temperature_text: spec.temperature_text || "",
      thickness: spec.thickness ? parseFloat(spec.thickness) : undefined,
      volume_calculated: spec.volume_calculated ? parseFloat(spec.volume_calculated) : undefined,
      surface_area: spec.surface_area ? parseFloat(spec.surface_area) : undefined,
      drawing_reference: spec.drawing_reference || "",
      features: spec.features?.notes || "",
    });
    setOpen(true);
  };

  const openCreateDialog = () => {
    setEditingSpec(null);
    form.reset();
    setOpen(true);
  };

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">
            Tank Specifications
          </h1>
          <p className="mt-2 text-sm text-muted-foreground" data-testid="text-page-description">
            Manage tank specifications and technical details
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} data-testid="button-add-specification">
              <Plus className="mr-2 h-4 w-4" />
              Add Specification
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingSpec ? "Edit Tank Specification" : "Create Tank Specification"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Tank name" {...field} data-testid="input-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-type">
                              <SelectValue placeholder="Select tank type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Storage Tank">Storage Tank</SelectItem>
                            <SelectItem value="Pressure Vessel">Pressure Vessel</SelectItem>
                            <SelectItem value="Heat Exchanger">Heat Exchanger</SelectItem>
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
                    name="capacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Capacity (L)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="Capacity in liters"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            data-testid="input-capacity"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="height"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Height (mm)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="Height in millimeters"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            data-testid="input-height"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="diameter"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Diameter (mm)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="Diameter in millimeters"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                            data-testid="input-diameter"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="width"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Width (mm)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="Width in millimeters"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                            data-testid="input-width"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Material Information Section */}
                <div className="grid grid-cols-1 gap-4">
                  <h3 className="text-lg font-semibold text-foreground">Material Information</h3>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="material"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Material *</FormLabel>
                        <FormControl>
                          <Input placeholder="Steel, Aluminum, etc." {...field} data-testid="input-material" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="material_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Material Type</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., EVATHERM, SAÇ" {...field} data-testid="input-material-type" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="material_grade"
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

                {/* Operating Conditions Section */}
                <div className="grid grid-cols-1 gap-4">
                  <h3 className="text-lg font-semibold text-foreground">Operating Conditions</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="pressure"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pressure (bar)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.1"
                            placeholder="Operating pressure"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                            data-testid="input-pressure"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pressure_text"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pressure Description</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 0 BAR, Normal Pressure" {...field} data-testid="input-pressure-text" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="temperature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Temperature (°C)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.1"
                            placeholder="Operating temperature"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                            data-testid="input-temperature"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="temperature_text"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Temperature Description</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., SICAKLIK, Room Temperature" {...field} data-testid="input-temperature-text" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="thickness"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Thickness (mm)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.1"
                            placeholder="Wall thickness"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                            data-testid="input-thickness"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="volume_calculated"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Volume (m³)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.1"
                            placeholder="Calculated volume"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                            data-testid="input-volume"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="surface_area"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Surface Area (m²)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.1"
                            placeholder="Surface area"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                            data-testid="input-surface-area"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Additional Information Section */}
                <div className="grid grid-cols-1 gap-4">
                  <h3 className="text-lg font-semibold text-foreground">Additional Information</h3>
                </div>
                
                <FormField
                  control={form.control}
                  name="drawing_reference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Drawing Reference</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 1788V01-EV1" {...field} data-testid="input-drawing-reference" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="features"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Features / Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Additional features or notes"
                          {...field}
                          data-testid="textarea-features"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-save-specification"
                  >
                    {editingSpec ? "Update" : "Create"} Specification
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="card-shadow">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted">
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Dimensions</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Pressure</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : !specifications || !Array.isArray(specifications) || specifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No tank specifications found
                  </TableCell>
                </TableRow>
              ) : (
                Array.isArray(specifications) ? specifications.map((spec: any) => (
                  <TableRow key={spec.id} data-testid={`row-specification-${spec.id}`}>
                    <TableCell className="font-medium" data-testid={`text-name-${spec.id}`}>
                      {spec.name}
                    </TableCell>
                    <TableCell data-testid={`text-type-${spec.id}`}>{spec.type}</TableCell>
                    <TableCell data-testid={`text-capacity-${spec.id}`}>{spec.capacity}L</TableCell>
                    <TableCell data-testid={`text-dimensions-${spec.id}`}>
                      {spec.height}H{spec.diameter ? ` x ${spec.diameter}D` : ''} mm
                    </TableCell>
                    <TableCell data-testid={`text-material-${spec.id}`}>{spec.material}</TableCell>
                    <TableCell data-testid={`text-pressure-${spec.id}`}>
                      {spec.pressure ? `${spec.pressure} bar` : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => openEditDialog(spec)}
                          data-testid={`button-edit-${spec.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => deleteMutation.mutate(spec.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-${spec.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : null
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
