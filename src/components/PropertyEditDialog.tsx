import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useProjectsList } from "@/hooks/useProjectsList";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, X } from "lucide-react";

const propertySchema = z.object({
  title: z.string().min(1, "Titel is verplicht"),
  property_type: z.string().optional(),
  price: z.string().optional(),
  bedrooms: z.string().optional(),
  bathrooms: z.string().optional(),
  area_sqm: z.string().optional(),
  terrace_area_sqm: z.string().optional(),
  plot_size_sqm: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  country: z.string().default("Spanje"),
  postal_code: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  status: z.string().optional(),
  description: z.string().optional(),
  parking: z.string().optional(),
  furnished: z.boolean().default(false),
  garden: z.boolean().default(false),
  orientation: z.string().optional(),
  energy_rating: z.string().optional(),
  year_built: z.string().optional(),
  distance_to_beach_m: z.string().optional(),
  community_fees_monthly: z.string().optional(),
  viewing_url: z.string().optional(),
  image_url: z.string().optional(),
  project_id: z.string().optional(),
});

type PropertyFormData = z.infer<typeof propertySchema>;

interface Project {
  id: string;
  name: string;
  city?: string;
}

interface Property {
  id: string;
  title: string;
  property_type?: string;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  area_sqm?: number;
  terrace_area_sqm?: number;
  plot_size_sqm?: number;
  address?: string;
  city?: string;
  region?: string;
  country?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  status?: string;
  description?: string;
  parking?: number;
  furnished?: boolean;
  garden?: boolean;
  orientation?: string;
  energy_rating?: string;
  year_built?: number;
  distance_to_beach_m?: number;
  community_fees_monthly?: number;
  viewing_url?: string;
  image_url?: string;
  features?: string[];
  images?: string[];
  project_id?: string;
}

interface PropertyEditDialogProps {
  property: Property;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPropertyUpdated: () => void;
}

export function PropertyEditDialog({
  property,
  open,
  onOpenChange,
  onPropertyUpdated,
}: PropertyEditDialogProps) {
  const [saving, setSaving] = useState(false);
  const { data: projectsData, isLoading: loadingProjects } = useProjectsList();
  const projects = projectsData?.map(p => ({ id: p.id, name: p.name, city: p.city || undefined })) || [];
  const [features, setFeatures] = useState<string[]>(property.features || []);
  const [newFeature, setNewFeature] = useState("");
  const [images, setImages] = useState<string[]>(property.images || []);
  const [newImage, setNewImage] = useState("");

  const form = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      title: property.title || "",
      property_type: property.property_type || "",
      price: property.price?.toString() || "",
      bedrooms: property.bedrooms?.toString() || "",
      bathrooms: property.bathrooms?.toString() || "",
      area_sqm: property.area_sqm?.toString() || "",
      terrace_area_sqm: property.terrace_area_sqm?.toString() || "",
      plot_size_sqm: property.plot_size_sqm?.toString() || "",
      address: property.address || "",
      city: property.city || "",
      region: property.region || "",
      country: property.country || "Spanje",
      postal_code: property.postal_code || "",
      latitude: property.latitude?.toString() || "",
      longitude: property.longitude?.toString() || "",
      status: property.status || "available",
      description: property.description || "",
      parking: property.parking?.toString() || "",
      furnished: property.furnished || false,
      garden: property.garden || false,
      orientation: property.orientation || "",
      energy_rating: property.energy_rating || "",
      year_built: property.year_built?.toString() || "",
      distance_to_beach_m: property.distance_to_beach_m?.toString() || "",
      community_fees_monthly: property.community_fees_monthly?.toString() || "",
      viewing_url: property.viewing_url || "",
      image_url: property.image_url || "",
      project_id: property.project_id || "",
    },
  });

  useEffect(() => {
    if (open) {
      setFeatures(property.features || []);
      setImages(property.images || []);
    }
  }, [open, property]);

  const onSubmit = async (data: PropertyFormData) => {
    try {
      setSaving(true);

      const updateData: any = {
        title: data.title,
        property_type: data.property_type || null,
        price: data.price ? parseFloat(data.price) : null,
        bedrooms: data.bedrooms ? parseInt(data.bedrooms) : null,
        bathrooms: data.bathrooms ? parseFloat(data.bathrooms) : null,
        area_sqm: data.area_sqm ? parseFloat(data.area_sqm) : null,
        terrace_area_sqm: data.terrace_area_sqm ? parseFloat(data.terrace_area_sqm) : null,
        plot_size_sqm: data.plot_size_sqm ? parseFloat(data.plot_size_sqm) : null,
        address: data.address || null,
        city: data.city || null,
        region: data.region || null,
        country: data.country || "Spanje",
        postal_code: data.postal_code || null,
        latitude: data.latitude ? parseFloat(data.latitude) : null,
        longitude: data.longitude ? parseFloat(data.longitude) : null,
        status: data.status || "available",
        description: data.description || null,
        parking: data.parking ? parseInt(data.parking) : null,
        furnished: data.furnished,
        garden: data.garden,
        orientation: data.orientation || null,
        energy_rating: data.energy_rating || null,
        year_built: data.year_built ? parseInt(data.year_built) : null,
        distance_to_beach_m: data.distance_to_beach_m ? parseInt(data.distance_to_beach_m) : null,
        community_fees_monthly: data.community_fees_monthly ? parseFloat(data.community_fees_monthly) : null,
        viewing_url: data.viewing_url || null,
        image_url: data.image_url || null,
        project_id: data.project_id || null,
        features: features.length > 0 ? features : null,
        images: images.length > 0 ? images : null,
      };

      const { error } = await supabase
        .from("properties")
        .update(updateData)
        .eq("id", property.id);

      if (error) throw error;

      toast.success("Pand succesvol bijgewerkt");
      onPropertyUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating property:", error);
      toast.error("Fout bij bijwerken pand");
    } finally {
      setSaving(false);
    }
  };

  const addFeature = () => {
    if (newFeature.trim() && !features.includes(newFeature.trim())) {
      setFeatures([...features, newFeature.trim()]);
      setNewFeature("");
    }
  };

  const removeFeature = (feature: string) => {
    setFeatures(features.filter((f) => f !== feature));
  };

  const addImage = () => {
    if (newImage.trim() && !images.includes(newImage.trim())) {
      setImages([...images, newImage.trim()]);
      setNewImage("");
    }
  };

  const removeImage = (image: string) => {
    setImages(images.filter((img) => img !== image));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pand Bewerken</DialogTitle>
          <DialogDescription>
            Wijzig de gegevens van dit pand
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="data" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="data">Property Data</TabsTrigger>
                <TabsTrigger value="media">Features & Media</TabsTrigger>
                <TabsTrigger value="project">Project Link</TabsTrigger>
              </TabsList>

              <TabsContent value="data" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Titel *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="property_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecteer type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Appartement">Appartement</SelectItem>
                            <SelectItem value="Villa">Villa</SelectItem>
                            <SelectItem value="Penthouse">Penthouse</SelectItem>
                            <SelectItem value="Duplex">Duplex</SelectItem>
                            <SelectItem value="Bungalow">Bungalow</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecteer status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="available">Beschikbaar</SelectItem>
                            <SelectItem value="sold">Verkocht</SelectItem>
                            <SelectItem value="reserved">Gereserveerd</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prijs (€)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bedrooms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slaapkamers</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bathrooms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Badkamers</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.5" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="area_sqm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Oppervlakte (m²)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="terrace_area_sqm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Terras (m²)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="plot_size_sqm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Perceel (m²)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="parking"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parkeerplaatsen</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Adres</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stad</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="postal_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postcode</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="region"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Regio</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Land</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Beschrijving</FormLabel>
                        <FormControl>
                          <Textarea rows={4} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="media" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div>
                    <FormLabel>Features</FormLabel>
                    <div className="flex gap-2 mt-2">
                      <Input
                        value={newFeature}
                        onChange={(e) => setNewFeature(e.target.value)}
                        placeholder="Nieuwe feature..."
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addFeature();
                          }
                        }}
                      />
                      <Button type="button" onClick={addFeature} variant="outline">
                        Toevoegen
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {features.map((feature) => (
                        <Badge key={feature} variant="secondary" className="gap-1">
                          {feature}
                          <X
                            className="h-3 w-3 cursor-pointer"
                            onClick={() => removeFeature(feature)}
                          />
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="image_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hoofd Afbeelding URL</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div>
                    <FormLabel>Extra Afbeeldingen</FormLabel>
                    <div className="flex gap-2 mt-2">
                      <Input
                        value={newImage}
                        onChange={(e) => setNewImage(e.target.value)}
                        placeholder="Image URL..."
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addImage();
                          }
                        }}
                      />
                      <Button type="button" onClick={addImage} variant="outline">
                        Toevoegen
                      </Button>
                    </div>
                    <div className="space-y-2 mt-3">
                      {images.map((image, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 border rounded">
                          <span className="flex-1 text-sm truncate">{image}</span>
                          <X
                            className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-foreground"
                            onClick={() => removeImage(image)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="viewing_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Viewing URL</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="project" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="project_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gekoppeld Project</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value === "__no_project__" ? "" : value)}
                        defaultValue={field.value || "__no_project__"}
                        disabled={loadingProjects}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecteer project (optioneel)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__no_project__">Geen project</SelectItem>
                          {projects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name} {project.city && `- ${project.city}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {property.project_id && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">
                      Dit pand is momenteel gekoppeld aan een project. Selecteer "Geen project" om
                      de koppeling te verwijderen.
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Annuleren
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Opslaan
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
