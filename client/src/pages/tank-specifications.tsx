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
  name: z.string().min(1, "Name is required"),
  type: z.string().min(1, "Type is required"),
  capacity: z.number().min(1, "Capacity must be greater than 0"),
  height: z.number().min(1, "Height must be greater than 0"),
  diameter: z.number().optional(),
  pressure: z.number().optional(),
  temperature: z.number().optional(),
  material: z.string().min(1, "Material is required"),
  thickness: z.number().optional(),
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
      pressure: spec.pressure ? parseFloat(spec.pressure) : undefined,
      temperature: spec.temperature ? parseFloat(spec.temperature) : undefined,
      material: spec.material,
      thickness: spec.thickness ? parseFloat(spec.thickness) : undefined,
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
                    name="material"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Material</FormLabel>
                        <FormControl>
                          <Input placeholder="Steel grade or material" {...field} data-testid="input-material" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
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
                </div>

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
              ) : !specifications || specifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No tank specifications found
                  </TableCell>
                </TableRow>
              ) : (
                specifications?.map((spec: any) => (
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
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
