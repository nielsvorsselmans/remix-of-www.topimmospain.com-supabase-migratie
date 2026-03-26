import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { parseGoogleMapsUrl } from "@/lib/parseGoogleMapsUrl";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";

interface TravelGuideCategory {
  id: string;
  name: string;
  name_singular: string;
  icon: string;
}

interface TravelGuidePOI {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  address: string | null;
  municipality: string;
  region: string;
  latitude: number | null;
  longitude: number | null;
  google_maps_url: string | null;
  phone: string | null;
  website: string | null;
  tips: string | null;
  is_recommended: boolean;
  is_active: boolean;
}

interface POIFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  poi: TravelGuidePOI | null;
  categories: TravelGuideCategory[];
  onSuccess: () => void;
}

const REGIONS = [
  "Costa Cálida",
  "Costa Blanca Zuid",
  "Costa Blanca Noord",
];

const MUNICIPALITIES = [
  "Los Alcázares",
  "Torre-Pacheco",
  "San Javier",
  "La Manga",
  "Cartagena",
  "Murcia",
  "Mar Menor",
  "San Pedro del Pinatar",
  "Pilar de la Horadada",
  "Torrevieja",
  "Orihuela Costa",
  "Guardamar del Segura",
];

interface FormData {
  category_id: string;
  name: string;
  description: string;
  address: string;
  municipality: string;
  region: string;
  google_maps_url: string;
  phone: string;
  website: string;
  tips: string;
  is_recommended: boolean;
  is_active: boolean;
}

export function POIFormDialog({ open, onOpenChange, poi, categories, onSuccess }: POIFormDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!poi;

  const form = useForm<FormData>({
    defaultValues: {
      category_id: "",
      name: "",
      description: "",
      address: "",
      municipality: "",
      region: "Costa Cálida",
      google_maps_url: "",
      phone: "",
      website: "",
      tips: "",
      is_recommended: false,
      is_active: true,
    },
  });

  useEffect(() => {
    if (poi) {
      form.reset({
        category_id: poi.category_id,
        name: poi.name,
        description: poi.description || "",
        address: poi.address || "",
        municipality: poi.municipality,
        region: poi.region,
        google_maps_url: poi.google_maps_url || "",
        phone: poi.phone || "",
        website: poi.website || "",
        tips: poi.tips || "",
        is_recommended: poi.is_recommended,
        is_active: poi.is_active,
      });
    } else {
      form.reset({
        category_id: categories[0]?.id || "",
        name: "",
        description: "",
        address: "",
        municipality: "",
        region: "Costa Cálida",
        google_maps_url: "",
        phone: "",
        website: "",
        tips: "",
        is_recommended: false,
        is_active: true,
      });
    }
  }, [poi, categories, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      // Parse coordinates from Google Maps URL
      const coords = parseGoogleMapsUrl(data.google_maps_url);

      const poiData = {
        category_id: data.category_id,
        name: data.name,
        description: data.description || null,
        address: data.address || null,
        municipality: data.municipality,
        region: data.region,
        latitude: coords?.lat || null,
        longitude: coords?.lng || null,
        google_maps_url: data.google_maps_url || null,
        phone: data.phone || null,
        website: data.website || null,
        tips: data.tips || null,
        is_recommended: data.is_recommended,
        is_active: data.is_active,
        source: 'manual',
      };

      if (isEditing && poi) {
        const { error } = await supabase
          .from('travel_guide_pois')
          .update(poiData)
          .eq('id', poi.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('travel_guide_pois')
          .insert(poiData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-guide-pois'] });
      toast.success(isEditing ? "Locatie bijgewerkt" : "Locatie toegevoegd");
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.message || "Er ging iets mis");
    },
  });

  const handleSubmit = form.handleSubmit((data) => {
    saveMutation.mutate(data);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Locatie Bewerken" : "Nieuwe Locatie"}</DialogTitle>
          <DialogDescription>
            Voeg een nieuwe locatie toe aan de reisgids
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category_id"
                rules={{ required: "Selecteer een categorie" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categorie *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecteer categorie" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                rules={{ required: "Naam is verplicht" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Naam *</FormLabel>
                    <FormControl>
                      <Input placeholder="Bijv. Playa de la Concha" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Beschrijving</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Korte beschrijving van de locatie..."
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="municipality"
                rules={{ required: "Gemeente is verplicht" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gemeente *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecteer gemeente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MUNICIPALITIES.map(mun => (
                          <SelectItem key={mun} value={mun}>{mun}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecteer regio" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {REGIONS.map(region => (
                          <SelectItem key={region} value={region}>{region}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adres</FormLabel>
                  <FormControl>
                    <Input placeholder="Volledig adres" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="google_maps_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Google Maps URL</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="https://www.google.com/maps/..." 
                      {...field} 
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Coördinaten worden automatisch geëxtraheerd
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefoonnummer</FormLabel>
                    <FormControl>
                      <Input placeholder="+34 XXX XXX XXX" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="tips"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Insider Tips</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Tips van jullie team voor klanten..."
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Persoonlijke tips maken de reisgids waardevol!
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center gap-8">
              <FormField
                control={form.control}
                name="is_recommended"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Aanbevolen door Viva</FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Actief</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuleren
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Opslaan..." : isEditing ? "Bijwerken" : "Toevoegen"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
