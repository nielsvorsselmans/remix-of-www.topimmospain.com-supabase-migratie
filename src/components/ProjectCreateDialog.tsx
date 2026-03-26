import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { parseGoogleMapsUrl } from "@/lib/parseGoogleMapsUrl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, CheckCircle2, XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { ResaleDetailsFields } from "@/components/ResaleDetailsFields";
import { ResaleFeaturesFields } from "@/components/ResaleFeaturesFields";
import { MediaUploader } from "@/components/MediaUploader";
import { cn } from "@/lib/utils";

const projectSchema = z.object({
  name: z.string().min(1, "Naam is verplicht"),
  display_title: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  country: z.string().default("Spanje"),
  price_from: z.string().optional(),
  price_to: z.string().optional(),
  resale_price: z.string().optional(),
  status: z.string().default("active"),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  google_maps_url: z.string().optional(),
  featured_image: z.string().optional(),
  description: z.string().optional(),
  active: z.boolean().default(true),
  is_resale: z.boolean().default(false),
  default_commission_type: z.enum(['percentage', 'fixed']).default('percentage'),
  default_commission_percentage: z.string().optional(),
  default_commission_fixed: z.string().optional(),
  // Resale fields
  resale_property_type: z.string().optional(),
  min_bedrooms: z.string().optional(),
  min_bathrooms: z.string().optional(),
  min_area: z.string().optional(),
  plot_size_sqm: z.string().optional(),
  terrace_area_sqm: z.string().optional(),
  floor: z.string().optional(),
  total_floors: z.string().optional(),
  year_built: z.string().optional(),
  orientation: z.string().optional(),
  energy_rating: z.string().optional(),
  parking: z.string().optional(),
  costa: z.string().optional(),
  distance_to_beach_m: z.string().optional(),
  distance_to_golf_m: z.string().optional(),
  distance_to_airport_km: z.string().optional(),
  distance_to_shops_m: z.string().optional(),
  has_pool: z.boolean().default(false),
  has_private_pool: z.boolean().default(false),
  has_communal_pool: z.boolean().default(false),
  has_garage: z.boolean().default(false),
  has_elevator: z.boolean().default(false),
  has_airconditioning: z.boolean().default(false),
  has_heating: z.boolean().default(false),
  has_fireplace: z.boolean().default(false),
  has_alarm: z.boolean().default(false),
  has_basement: z.boolean().default(false),
  has_storage_room: z.boolean().default(false),
  has_solarium: z.boolean().default(false),
  has_garden: z.boolean().default(false),
  is_furnished: z.boolean().default(false),
  is_key_ready: z.boolean().default(false),
  has_sea_views: z.boolean().default(false),
  has_mountain_views: z.boolean().default(false),
  has_garden_views: z.boolean().default(false),
  has_pool_views: z.boolean().default(false),
  has_open_views: z.boolean().default(false),
  community_fees_monthly: z.string().optional(),
  ibi_tax_yearly: z.string().optional(),
  garbage_tax_yearly: z.string().optional(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface ProjectCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const WIZARD_STEPS_RESALE = [
  { key: "basis", label: "Basis" },
  { key: "woning", label: "Woning" },
  { key: "kenmerken", label: "Kenmerken" },
  { key: "media", label: "Foto's" },
] as const;

const WIZARD_STEPS_NORMAL = [
  { key: "basis", label: "Basis" },
  { key: "media", label: "Foto's" },
] as const;

export function ProjectCreateDialog({
  open,
  onOpenChange,
  onSuccess,
}: ProjectCreateDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [parsedCoords, setParsedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [projectImages, setProjectImages] = useState<string[]>([]);

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      display_title: "",
      city: "",
      region: "",
      country: "Spanje",
      price_from: "",
      price_to: "",
      resale_price: "",
      status: "active",
      latitude: "",
      longitude: "",
      google_maps_url: "",
      featured_image: "",
      description: "",
      active: true,
      is_resale: false,
      default_commission_type: 'percentage',
      default_commission_percentage: "",
      default_commission_fixed: "",
      resale_property_type: "",
      min_bedrooms: "",
      min_bathrooms: "",
      min_area: "",
      plot_size_sqm: "",
      terrace_area_sqm: "",
      floor: "",
      total_floors: "",
      year_built: "",
      orientation: "",
      energy_rating: "",
      parking: "",
      costa: "",
      distance_to_beach_m: "",
      distance_to_golf_m: "",
      distance_to_airport_km: "",
      distance_to_shops_m: "",
      has_pool: false,
      has_private_pool: false,
      has_communal_pool: false,
      has_garage: false,
      has_elevator: false,
      has_airconditioning: false,
      has_heating: false,
      has_fireplace: false,
      has_alarm: false,
      has_basement: false,
      has_storage_room: false,
      has_solarium: false,
      has_garden: false,
      is_furnished: false,
      is_key_ready: false,
      has_sea_views: false,
      has_mountain_views: false,
      has_garden_views: false,
      has_pool_views: false,
      has_open_views: false,
      community_fees_monthly: "",
      ibi_tax_yearly: "",
      garbage_tax_yearly: "",
    },
  });

  const isResale = form.watch("is_resale");
  const steps = isResale ? WIZARD_STEPS_RESALE : WIZARD_STEPS_NORMAL;
  const currentStepKey = steps[Math.min(currentStep, steps.length - 1)]?.key;
  const isLastStep = currentStep >= steps.length - 1;

  // Reset step when toggling resale
  useEffect(() => {
    if (currentStep >= steps.length) {
      setCurrentStep(steps.length - 1);
    }
  }, [isResale, steps.length, currentStep]);

  // Parse Google Maps URL
  const watchMapsUrl = form.watch("google_maps_url");
  useEffect(() => {
    if (watchMapsUrl) {
      const coords = parseGoogleMapsUrl(watchMapsUrl);
      setParsedCoords(coords);
      if (coords) {
        form.setValue("latitude", coords.lat.toString());
        form.setValue("longitude", coords.lng.toString());
      }
    } else {
      setParsedCoords(null);
    }
  }, [watchMapsUrl, form]);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setCurrentStep(0);
      setProjectImages([]);
      setParsedCoords(null);
    }
  }, [open]);

  const handleNext = async () => {
    // Validate step 1
    if (currentStepKey === "basis") {
      const valid = await form.trigger("name");
      if (!valid) return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const onSubmit = async (data: ProjectFormData) => {
    setIsSubmitting(true);
    try {
      // Determine price values
      const priceFrom = isResale && data.resale_price
        ? parseFloat(data.resale_price)
        : data.price_from ? parseFloat(data.price_from) : null;
      const priceTo = isResale && data.resale_price
        ? parseFloat(data.resale_price)
        : data.price_to ? parseFloat(data.price_to) : null;

      const insertData: any = {
        name: data.name,
        display_title: data.display_title || null,
        city: data.city || null,
        region: data.region || null,
        country: data.country || "Spanje",
        price_from: priceFrom,
        price_to: priceTo,
        status: data.status || "active",
        latitude: data.latitude ? parseFloat(data.latitude) : null,
        longitude: data.longitude ? parseFloat(data.longitude) : null,
        featured_image: projectImages.length > 0 ? projectImages[0] : (data.featured_image || null),
        images: projectImages.length > 0 ? projectImages : null,
        description: data.description || null,
        active: data.active,
        is_resale: data.is_resale,
        source: "manual",
        default_commission_type: data.default_commission_type,
        default_commission_percentage: data.default_commission_percentage ? parseFloat(data.default_commission_percentage) : null,
        default_commission_fixed: data.default_commission_fixed ? parseFloat(data.default_commission_fixed) : null,
      };

      // Add resale-specific fields
      if (data.is_resale) {
        insertData.property_types = data.resale_property_type ? [data.resale_property_type] : null;
        insertData.min_bedrooms = data.min_bedrooms ? parseInt(data.min_bedrooms) : null;
        insertData.max_bedrooms = data.min_bedrooms ? parseInt(data.min_bedrooms) : null;
        insertData.min_bathrooms = data.min_bathrooms ? parseInt(data.min_bathrooms) : null;
        insertData.max_bathrooms = data.min_bathrooms ? parseInt(data.min_bathrooms) : null;
        insertData.min_area = data.min_area ? parseFloat(data.min_area) : null;
        insertData.max_area = data.min_area ? parseFloat(data.min_area) : null;
        insertData.plot_size_sqm = data.plot_size_sqm ? parseFloat(data.plot_size_sqm) : null;
        insertData.terrace_area_sqm = data.terrace_area_sqm ? parseFloat(data.terrace_area_sqm) : null;
        insertData.floor = data.floor ? parseInt(data.floor) : null;
        insertData.total_floors = data.total_floors ? parseInt(data.total_floors) : null;
        insertData.year_built = data.year_built ? parseInt(data.year_built) : null;
        insertData.orientation = data.orientation || null;
        insertData.energy_rating = data.energy_rating || null;
        insertData.parking = data.parking ? parseInt(data.parking) : null;
        insertData.costa = data.costa || null;
        insertData.distance_to_beach_m = data.distance_to_beach_m ? parseInt(data.distance_to_beach_m) : null;
        insertData.distance_to_golf_m = data.distance_to_golf_m ? parseInt(data.distance_to_golf_m) : null;
        insertData.distance_to_airport_km = data.distance_to_airport_km ? parseFloat(data.distance_to_airport_km) : null;
        insertData.distance_to_shops_m = data.distance_to_shops_m ? parseInt(data.distance_to_shops_m) : null;
        insertData.has_pool = data.has_pool;
        insertData.has_private_pool = data.has_private_pool;
        insertData.has_communal_pool = data.has_communal_pool;
        insertData.has_garage = data.has_garage;
        insertData.has_elevator = data.has_elevator;
        insertData.has_airconditioning = data.has_airconditioning;
        insertData.has_heating = data.has_heating;
        insertData.has_fireplace = data.has_fireplace;
        insertData.has_alarm = data.has_alarm;
        insertData.has_basement = data.has_basement;
        insertData.has_storage_room = data.has_storage_room;
        insertData.has_solarium = data.has_solarium;
        insertData.has_garden = data.has_garden;
        insertData.is_furnished = data.is_furnished;
        insertData.is_key_ready = data.is_key_ready;
        insertData.has_sea_views = data.has_sea_views;
        insertData.has_mountain_views = data.has_mountain_views;
        insertData.has_garden_views = data.has_garden_views;
        insertData.has_pool_views = data.has_pool_views;
        insertData.has_open_views = data.has_open_views;
        insertData.community_fees_monthly = data.community_fees_monthly ? parseFloat(data.community_fees_monthly) : null;
        insertData.ibi_tax_yearly = data.ibi_tax_yearly ? parseFloat(data.ibi_tax_yearly) : null;
        insertData.garbage_tax_yearly = data.garbage_tax_yearly ? parseFloat(data.garbage_tax_yearly) : null;
      }

      const { error } = await supabase
        .from("projects")
        .insert(insertData);

      if (error) throw error;

      toast.success("Project succesvol aangemaakt");
      form.reset();
      setProjectImages([]);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error("Fout bij het aanmaken van het project");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nieuw Project Toevoegen</DialogTitle>
          <DialogDescription>
            Maak een handmatig project aan. Dit project wordt niet beïnvloed door de XML sync.
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1 mb-2">
          {steps.map((step, idx) => (
            <div key={step.key} className="flex items-center flex-1">
              <button
                type="button"
                onClick={() => idx <= currentStep && setCurrentStep(idx)}
                className={cn(
                  "flex items-center gap-1.5 text-xs font-medium rounded-full px-3 py-1.5 transition-colors w-full justify-center",
                  idx === currentStep
                    ? "bg-primary text-primary-foreground"
                    : idx < currentStep
                    ? "bg-primary/15 text-primary cursor-pointer"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {idx < currentStep ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <span className="h-3.5 w-3.5 flex items-center justify-center text-[10px] font-bold">{idx + 1}</span>
                )}
                {step.label}
              </button>
              {idx < steps.length - 1 && (
                <div className={cn("h-px w-4 mx-1 flex-shrink-0", idx < currentStep ? "bg-primary" : "bg-border")} />
              )}
            </div>
          ))}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            {/* ===== STAP 1: BASIS ===== */}
            {currentStepKey === "basis" && (
              <div className="space-y-4">
                <div className="flex gap-4">
                  <FormField
                    control={form.control}
                    name="active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 flex-1">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Project Actief</FormLabel>
                          <FormDescription>Direct zichtbaar op de website</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="is_resale"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 flex-1">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Herverkoop</FormLabel>
                          <FormDescription>Enkele bestaande woning</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Naam *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Projectnaam" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="display_title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Weergave Titel</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Optionele weergavetitel" />
                        </FormControl>
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
                            <SelectItem value="active">Actief</SelectItem>
                            <SelectItem value="in_development">In Ontwikkeling</SelectItem>
                            <SelectItem value="completed">Opgeleverd</SelectItem>
                            <SelectItem value="sold_out">Uitverkocht</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField control={form.control} name="city" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stad</FormLabel>
                      <FormControl><Input {...field} placeholder="Stad" /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="region" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Regio</FormLabel>
                      <FormControl><Input {...field} placeholder="Costa Blanca Zuid" /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="country" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Land</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>

                {/* Price - conditional */}
                {isResale ? (
                  <FormField
                    control={form.control}
                    name="resale_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vraagprijs (€)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="0.01" placeholder="185000" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="price_from" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prijs Vanaf (€)</FormLabel>
                        <FormControl><Input {...field} type="number" step="0.01" placeholder="150000" /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="price_to" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prijs Tot (€)</FormLabel>
                        <FormControl><Input {...field} type="number" step="0.01" placeholder="350000" /></FormControl>
                      </FormItem>
                    )} />
                  </div>
                )}

                {/* Google Maps URL */}
                <FormField
                  control={form.control}
                  name="google_maps_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Google Maps Link</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://www.google.com/maps/..." />
                      </FormControl>
                      <FormDescription className="flex items-center gap-2">
                        {parsedCoords ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            <span className="text-emerald-600">
                              Coördinaten gevonden: {parsedCoords.lat.toFixed(6)}, {parsedCoords.lng.toFixed(6)}
                            </span>
                          </>
                        ) : field.value ? (
                          <>
                            <XCircle className="h-3 w-3 text-destructive" />
                            <span className="text-destructive">Geen coördinaten gevonden in URL</span>
                          </>
                        ) : (
                          "Plak een Google Maps link om de locatie automatisch in te vullen"
                        )}
                      </FormDescription>
                    </FormItem>
                  )}
                />

                {/* Hidden lat/lng shown as readonly when parsed */}
                {parsedCoords && (
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="latitude" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Latitude</FormLabel>
                        <FormControl><Input {...field} readOnly className="bg-muted" /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="longitude" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Longitude</FormLabel>
                        <FormControl><Input {...field} readOnly className="bg-muted" /></FormControl>
                      </FormItem>
                    )} />
                  </div>
                )}

                {/* Manual lat/lng when no maps url */}
                {!parsedCoords && !form.watch("google_maps_url") && (
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="latitude" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Latitude</FormLabel>
                        <FormControl><Input {...field} type="number" step="any" placeholder="37.8234" /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="longitude" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Longitude</FormLabel>
                        <FormControl><Input {...field} type="number" step="any" placeholder="-0.7876" /></FormControl>
                      </FormItem>
                    )} />
                  </div>
                )}
              </div>
            )}

            {/* ===== STAP 2: WONING (alleen resale) ===== */}
            {currentStepKey === "woning" && isResale && (
              <ResaleDetailsFields form={form} />
            )}

            {/* ===== STAP 3: KENMERKEN (alleen resale) ===== */}
            {currentStepKey === "kenmerken" && isResale && (
              <ResaleFeaturesFields form={form} />
            )}

            {/* ===== STAP 4 (of 2): MEDIA & AFRONDEN ===== */}
            {currentStepKey === "media" && (
              <div className="space-y-4">
                {/* Photo upload */}
                <div className="rounded-lg border p-4 space-y-3">
                  <span className="font-medium">Foto's</span>
                  <MediaUploader
                    uploadedUrls={projectImages}
                    onUrlsChange={setProjectImages}
                    maxFiles={20}
                  />
                  {projectImages.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      De eerste foto wordt automatisch als hoofdafbeelding ingesteld
                    </p>
                  )}
                </div>

                {/* Commission Section */}
                <div className="rounded-lg border p-4 space-y-4">
                  <span className="font-medium">Standaard TIS Commissie</span>
                  
                  <FormField
                    control={form.control}
                    name="default_commission_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage (%)</SelectItem>
                            <SelectItem value="fixed">Vast bedrag (€)</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  {form.watch('default_commission_type') === 'percentage' ? (
                    <FormField control={form.control} name="default_commission_percentage" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Percentage</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input {...field} type="number" step="0.1" placeholder="5" className="pr-8" />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                          </div>
                        </FormControl>
                      </FormItem>
                    )} />
                  ) : (
                    <FormField control={form.control} name="default_commission_fixed" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vast Bedrag</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                            <Input {...field} type="number" step="100" placeholder="3500" className="pl-8" />
                          </div>
                        </FormControl>
                      </FormItem>
                    )} />
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    Dit wordt automatisch overgenomen bij nieuwe verkopen
                  </p>
                </div>

                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Beschrijving</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Beschrijf het project..." rows={4} />
                    </FormControl>
                  </FormItem>
                )} />
              </div>
            )}

            {/* Footer with navigation */}
            <DialogFooter className="flex justify-between sm:justify-between gap-2">
              <div>
                {currentStep > 0 && (
                  <Button type="button" variant="outline" onClick={handlePrev}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Vorige
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                  Annuleren
                </Button>
                {isLastStep ? (
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Project Aanmaken
                  </Button>
                ) : (
                  <Button type="button" onClick={handleNext}>
                    Volgende
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
