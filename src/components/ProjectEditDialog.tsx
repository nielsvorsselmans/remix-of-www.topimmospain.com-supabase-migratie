import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { parseGoogleMapsUrl } from "@/lib/parseGoogleMapsUrl";
import { cn } from "@/lib/utils";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ExternalLink, MapPin, Bed, Bath, Video, FileText, Users, Home, CheckCircle2, XCircle, Star, X, ImageIcon, Sparkles, TrendingUp, Brain } from "lucide-react";
import { ProjectVideoManager } from "@/components/ProjectVideoManager";
import { ProjectDocumentManager } from "@/components/ProjectDocumentManager";
import { ProjectContactsManager } from "@/components/ProjectContactsManager";
import { MediaUploader } from "@/components/MediaUploader";
import { LocationIntelligenceTab } from "@/components/admin/LocationIntelligenceTab";
import { RentalIntelligenceTab } from "@/components/admin/RentalIntelligenceTab";
import { DeepAnalysisTab, StructuredDeepAnalysis } from "@/components/admin/DeepAnalysisTab";
import { ResalePropertyFields } from "@/components/ResalePropertyFields";

const projectSchema = z.object({
  name: z.string().min(1, "Naam is verplicht"),
  display_title: z.string().optional(),
  project_key: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  country: z.string().default("Spanje"),
  location: z.string().optional(),
  price_from: z.string().optional(),
  price_to: z.string().optional(),
  resale_price: z.string().optional(),
  status: z.string().optional(),
  completion_date: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  featured_image: z.string().optional(),
  description: z.string().optional(),
  active: z.boolean().default(true),
  environment_video_url: z.string().optional(),
  showhouse_video_url: z.string().optional(),
  // Showhouse location fields
  showhouse_maps_url: z.string().optional(),
  showhouse_address: z.string().optional(),
  showhouse_latitude: z.string().optional(),
  showhouse_longitude: z.string().optional(),
  showhouse_notes: z.string().optional(),
  // Commission
  default_commission_type: z.enum(['percentage', 'fixed']).default('percentage'),
  default_commission_percentage: z.string().optional(),
  default_commission_fixed: z.string().optional(),
  // Resale fields
  is_resale: z.boolean().default(false),
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

interface Property {
  id: string;
  title: string;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  city: string | null;
  status: string | null;
  image_url: string | null;
}

interface LocationIntelligence {
  coordinates: { lat: number; lng: number };
  nearbyAmenities: Record<string, { name: string; distance_meters: number }[]>;
  note: string;
  fetchedAt?: string;
}

interface Project {
  id: string;
  name: string;
  display_title?: string;
  project_key?: string;
  city?: string;
  region?: string;
  country?: string;
  location?: string;
  price_from?: number;
  price_to?: number;
  status?: string;
  completion_date?: string;
  latitude?: number;
  longitude?: number;
  featured_image?: string;
  images?: string[];
  environment_video_url?: string;
  showhouse_video_url?: string;
  description?: string;
  active?: boolean;
  // Showhouse location
  showhouse_maps_url?: string;
  showhouse_address?: string;
  showhouse_latitude?: number;
  showhouse_longitude?: number;
  showhouse_notes?: string;
  // Commission
  default_commission_type?: string;
  default_commission_percentage?: number;
  default_commission_fixed?: number;
  // Resale
  is_resale?: boolean;
  min_bedrooms?: number;
  max_bedrooms?: number;
  min_bathrooms?: number;
  max_bathrooms?: number;
  min_area?: number;
  max_area?: number;
  plot_size_sqm?: number;
  terrace_area_sqm?: number;
  floor?: number;
  total_floors?: number;
  year_built?: number;
  orientation?: string;
  energy_rating?: string;
  parking?: number;
  costa?: string;
  distance_to_beach_m?: number;
  distance_to_golf_m?: number;
  distance_to_airport_km?: number;
  distance_to_shops_m?: number;
  has_pool?: boolean;
  has_private_pool?: boolean;
  has_communal_pool?: boolean;
  has_garage?: boolean;
  has_elevator?: boolean;
  has_airconditioning?: boolean;
  has_heating?: boolean;
  has_fireplace?: boolean;
  has_alarm?: boolean;
  has_basement?: boolean;
  has_storage_room?: boolean;
  has_solarium?: boolean;
  has_garden?: boolean;
  is_furnished?: boolean;
  is_key_ready?: boolean;
  has_sea_views?: boolean;
  has_mountain_views?: boolean;
  has_garden_views?: boolean;
  has_pool_views?: boolean;
  has_open_views?: boolean;
  community_fees_monthly?: number;
  ibi_tax_yearly?: number;
  garbage_tax_yearly?: number;
  property_types?: string[];
  // Location Intelligence
  location_intelligence?: LocationIntelligence | null;
  location_intelligence_updated_at?: string | null;
  // Deep Analysis
  deep_analysis_brainstorm?: string | null;
  deep_analysis_updated_at?: string | null;
  deep_analysis_structured?: unknown | null;
}

interface ProjectEditDialogProps {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ProjectEditDialog({
  project,
  open,
  onOpenChange,
  onSuccess,
}: ProjectEditDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(false);
  
  // Photo management state
  const [projectImages, setProjectImages] = useState<string[]>(
    (project.images as string[]) || []
  );
  const [featuredImage, setFeaturedImage] = useState<string>(
    project.featured_image || ''
  );

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: project.name || "",
      display_title: project.display_title || "",
      project_key: project.project_key || "",
      city: project.city || "",
      region: project.region || "",
      country: project.country || "Spanje",
      location: project.location || "",
      price_from: project.price_from?.toString() || "",
      price_to: project.price_to?.toString() || "",
      resale_price: project.is_resale && project.price_from ? project.price_from.toString() : "",
      status: project.status || "active",
      completion_date: project.completion_date || "",
      latitude: project.latitude?.toString() || "",
      longitude: project.longitude?.toString() || "",
      featured_image: project.featured_image || "",
      description: project.description || "",
      active: project.active ?? true,
      environment_video_url: project.environment_video_url || "",
      showhouse_video_url: project.showhouse_video_url || "",
      showhouse_maps_url: project.showhouse_maps_url || "",
      showhouse_address: project.showhouse_address || "",
      showhouse_latitude: project.showhouse_latitude?.toString() || "",
      showhouse_longitude: project.showhouse_longitude?.toString() || "",
      showhouse_notes: project.showhouse_notes || "",
      default_commission_type: (project.default_commission_type as 'percentage' | 'fixed') || 'percentage',
      default_commission_percentage: project.default_commission_percentage?.toString() || "",
      default_commission_fixed: project.default_commission_fixed?.toString() || "",
      is_resale: project.is_resale ?? false,
      resale_property_type: project.property_types?.[0] || "",
      min_bedrooms: project.min_bedrooms?.toString() || "",
      min_bathrooms: project.min_bathrooms?.toString() || "",
      min_area: project.min_area?.toString() || "",
      plot_size_sqm: project.plot_size_sqm?.toString() || "",
      terrace_area_sqm: project.terrace_area_sqm?.toString() || "",
      floor: project.floor?.toString() || "",
      total_floors: project.total_floors?.toString() || "",
      year_built: project.year_built?.toString() || "",
      orientation: project.orientation || "",
      energy_rating: project.energy_rating || "",
      parking: project.parking?.toString() || "",
      costa: project.costa || "",
      distance_to_beach_m: project.distance_to_beach_m?.toString() || "",
      distance_to_golf_m: project.distance_to_golf_m?.toString() || "",
      distance_to_airport_km: project.distance_to_airport_km?.toString() || "",
      distance_to_shops_m: project.distance_to_shops_m?.toString() || "",
      has_pool: project.has_pool ?? false,
      has_private_pool: project.has_private_pool ?? false,
      has_communal_pool: project.has_communal_pool ?? false,
      has_garage: project.has_garage ?? false,
      has_elevator: project.has_elevator ?? false,
      has_airconditioning: project.has_airconditioning ?? false,
      has_heating: project.has_heating ?? false,
      has_fireplace: project.has_fireplace ?? false,
      has_alarm: project.has_alarm ?? false,
      has_basement: project.has_basement ?? false,
      has_storage_room: project.has_storage_room ?? false,
      has_solarium: project.has_solarium ?? false,
      has_garden: project.has_garden ?? false,
      is_furnished: project.is_furnished ?? false,
      is_key_ready: project.is_key_ready ?? false,
      has_sea_views: project.has_sea_views ?? false,
      has_mountain_views: project.has_mountain_views ?? false,
      has_garden_views: project.has_garden_views ?? false,
      has_pool_views: project.has_pool_views ?? false,
      has_open_views: project.has_open_views ?? false,
      community_fees_monthly: project.community_fees_monthly?.toString() || "",
      ibi_tax_yearly: project.ibi_tax_yearly?.toString() || "",
      garbage_tax_yearly: project.garbage_tax_yearly?.toString() || "",
    },
  });

  // Track if showhouse has different location
  const hasShowhouseLocation = !!(project.showhouse_maps_url || project.showhouse_address || project.showhouse_latitude);
  const [showShowhouseLocation, setShowShowhouseLocation] = useState(hasShowhouseLocation);
  const [parsedCoords, setParsedCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Parse coordinates when maps URL changes
  const watchMapsUrl = form.watch("showhouse_maps_url");
  useEffect(() => {
    if (watchMapsUrl) {
      const coords = parseGoogleMapsUrl(watchMapsUrl);
      setParsedCoords(coords);
      if (coords) {
        form.setValue("showhouse_latitude", coords.lat.toString());
        form.setValue("showhouse_longitude", coords.lng.toString());
      }
    } else {
      setParsedCoords(null);
    }
  }, [watchMapsUrl, form]);

  // Reset form values when project changes
  useEffect(() => {
    form.reset({
      name: project.name || "",
      display_title: project.display_title || "",
      project_key: project.project_key || "",
      city: project.city || "",
      region: project.region || "",
      country: project.country || "Spanje",
      location: project.location || "",
      price_from: project.price_from?.toString() || "",
      price_to: project.price_to?.toString() || "",
      resale_price: project.is_resale && project.price_from ? project.price_from.toString() : "",
      status: project.status || "active",
      completion_date: project.completion_date || "",
      latitude: project.latitude?.toString() || "",
      longitude: project.longitude?.toString() || "",
      featured_image: project.featured_image || "",
      description: project.description || "",
      active: project.active ?? true,
      environment_video_url: project.environment_video_url || "",
      showhouse_video_url: project.showhouse_video_url || "",
      showhouse_maps_url: project.showhouse_maps_url || "",
      showhouse_address: project.showhouse_address || "",
      showhouse_latitude: project.showhouse_latitude?.toString() || "",
      showhouse_longitude: project.showhouse_longitude?.toString() || "",
      showhouse_notes: project.showhouse_notes || "",
      default_commission_type: (project.default_commission_type as 'percentage' | 'fixed') || 'percentage',
      default_commission_percentage: project.default_commission_percentage?.toString() || "",
      default_commission_fixed: project.default_commission_fixed?.toString() || "",
      is_resale: project.is_resale ?? false,
      resale_property_type: project.property_types?.[0] || "",
      min_bedrooms: project.min_bedrooms?.toString() || "",
      min_bathrooms: project.min_bathrooms?.toString() || "",
      min_area: project.min_area?.toString() || "",
      plot_size_sqm: project.plot_size_sqm?.toString() || "",
      terrace_area_sqm: project.terrace_area_sqm?.toString() || "",
      floor: project.floor?.toString() || "",
      total_floors: project.total_floors?.toString() || "",
      year_built: project.year_built?.toString() || "",
      orientation: project.orientation || "",
      energy_rating: project.energy_rating || "",
      parking: project.parking?.toString() || "",
      costa: project.costa || "",
      distance_to_beach_m: project.distance_to_beach_m?.toString() || "",
      distance_to_golf_m: project.distance_to_golf_m?.toString() || "",
      distance_to_airport_km: project.distance_to_airport_km?.toString() || "",
      distance_to_shops_m: project.distance_to_shops_m?.toString() || "",
      has_pool: project.has_pool ?? false,
      has_private_pool: project.has_private_pool ?? false,
      has_communal_pool: project.has_communal_pool ?? false,
      has_garage: project.has_garage ?? false,
      has_elevator: project.has_elevator ?? false,
      has_airconditioning: project.has_airconditioning ?? false,
      has_heating: project.has_heating ?? false,
      has_fireplace: project.has_fireplace ?? false,
      has_alarm: project.has_alarm ?? false,
      has_basement: project.has_basement ?? false,
      has_storage_room: project.has_storage_room ?? false,
      has_solarium: project.has_solarium ?? false,
      has_garden: project.has_garden ?? false,
      is_furnished: project.is_furnished ?? false,
      is_key_ready: project.is_key_ready ?? false,
      has_sea_views: project.has_sea_views ?? false,
      has_mountain_views: project.has_mountain_views ?? false,
      has_garden_views: project.has_garden_views ?? false,
      has_pool_views: project.has_pool_views ?? false,
      has_open_views: project.has_open_views ?? false,
      community_fees_monthly: project.community_fees_monthly?.toString() || "",
      ibi_tax_yearly: project.ibi_tax_yearly?.toString() || "",
      garbage_tax_yearly: project.garbage_tax_yearly?.toString() || "",
    });
    setShowShowhouseLocation(!!(project.showhouse_maps_url || project.showhouse_address || project.showhouse_latitude));
    // Reset photo state when project changes
    setProjectImages((project.images as string[]) || []);
    setFeaturedImage(project.featured_image || '');
  }, [project.id, form]);

  useEffect(() => {
    if (open) {
      fetchProperties();
    }
  }, [open, project.id]);

  const fetchProperties = async () => {
    try {
      setLoadingProperties(true);
      const { data, error } = await supabase
        .from("properties")
        .select("id, title, price, bedrooms, bathrooms, city, status, image_url")
        .eq("project_id", project.id)
        .order("price", { ascending: true, nullsFirst: false });

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error("Error fetching properties:", error);
    } finally {
      setLoadingProperties(false);
    }
  };

  const formatPrice = (price: number | null) => {
    if (!price) return "N/A";
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Photo handlers
  const handleImagesChange = (urls: string[]) => {
    setProjectImages(urls);
    // Auto-select first image as featured if none selected
    if (!featuredImage && urls.length > 0) {
      setFeaturedImage(urls[0]);
    }
  };

  const handleRemoveImage = (url: string) => {
    const newImages = projectImages.filter(i => i !== url);
    setProjectImages(newImages);
    // Reset featured if removed
    if (featuredImage === url) {
      setFeaturedImage(newImages[0] || '');
    }
  };

  const onSubmit = async (data: ProjectFormData) => {
    setIsSubmitting(true);
    try {
      const updateData: any = {
        name: data.name,
        display_title: data.display_title || null,
        project_key: data.project_key || null,
        city: data.city || null,
        region: data.region || null,
        country: data.country || "Spanje",
        location: data.location || null,
        price_from: data.is_resale && data.resale_price
          ? parseFloat(data.resale_price)
          : data.price_from ? parseFloat(data.price_from) : null,
        price_to: data.is_resale && data.resale_price
          ? parseFloat(data.resale_price)
          : data.price_to ? parseFloat(data.price_to) : null,
        status: data.status || "active",
        completion_date: data.completion_date || null,
        latitude: data.latitude ? parseFloat(data.latitude) : null,
        longitude: data.longitude ? parseFloat(data.longitude) : null,
        featured_image: featuredImage || projectImages[0] || null,
        images: projectImages,
        environment_video_url: data.environment_video_url || null,
        showhouse_video_url: data.showhouse_video_url || null,
        description: data.description || null,
        active: data.active,
        // Showhouse location fields
        showhouse_maps_url: showShowhouseLocation ? (data.showhouse_maps_url || null) : null,
        showhouse_address: showShowhouseLocation ? (data.showhouse_address || null) : null,
        showhouse_latitude: showShowhouseLocation && data.showhouse_latitude ? parseFloat(data.showhouse_latitude) : null,
        showhouse_longitude: showShowhouseLocation && data.showhouse_longitude ? parseFloat(data.showhouse_longitude) : null,
        showhouse_notes: showShowhouseLocation ? (data.showhouse_notes || null) : null,
        // Commission
        default_commission_type: data.default_commission_type,
        default_commission_percentage: data.default_commission_percentage ? parseFloat(data.default_commission_percentage) : null,
        default_commission_fixed: data.default_commission_fixed ? parseFloat(data.default_commission_fixed) : null,
        // Resale fields
        is_resale: data.is_resale,
        property_types: data.resale_property_type ? [data.resale_property_type] : null,
        min_bedrooms: data.min_bedrooms ? parseInt(data.min_bedrooms) : null,
        max_bedrooms: data.min_bedrooms ? parseInt(data.min_bedrooms) : null,
        min_bathrooms: data.min_bathrooms ? parseInt(data.min_bathrooms) : null,
        max_bathrooms: data.min_bathrooms ? parseInt(data.min_bathrooms) : null,
        min_area: data.min_area ? parseFloat(data.min_area) : null,
        max_area: data.min_area ? parseFloat(data.min_area) : null,
        plot_size_sqm: data.plot_size_sqm ? parseFloat(data.plot_size_sqm) : null,
        terrace_area_sqm: data.terrace_area_sqm ? parseFloat(data.terrace_area_sqm) : null,
        floor: data.floor ? parseInt(data.floor) : null,
        total_floors: data.total_floors ? parseInt(data.total_floors) : null,
        year_built: data.year_built ? parseInt(data.year_built) : null,
        orientation: data.orientation || null,
        energy_rating: data.energy_rating || null,
        parking: data.parking ? parseInt(data.parking) : null,
        costa: data.costa || null,
        distance_to_beach_m: data.distance_to_beach_m ? parseInt(data.distance_to_beach_m) : null,
        distance_to_golf_m: data.distance_to_golf_m ? parseInt(data.distance_to_golf_m) : null,
        distance_to_airport_km: data.distance_to_airport_km ? parseFloat(data.distance_to_airport_km) : null,
        distance_to_shops_m: data.distance_to_shops_m ? parseInt(data.distance_to_shops_m) : null,
        has_pool: data.has_pool,
        has_private_pool: data.has_private_pool,
        has_communal_pool: data.has_communal_pool,
        has_garage: data.has_garage,
        has_elevator: data.has_elevator,
        has_airconditioning: data.has_airconditioning,
        has_heating: data.has_heating,
        has_fireplace: data.has_fireplace,
        has_alarm: data.has_alarm,
        has_basement: data.has_basement,
        has_storage_room: data.has_storage_room,
        has_solarium: data.has_solarium,
        has_garden: data.has_garden,
        is_furnished: data.is_furnished,
        is_key_ready: data.is_key_ready,
        has_sea_views: data.has_sea_views,
        has_mountain_views: data.has_mountain_views,
        has_garden_views: data.has_garden_views,
        has_pool_views: data.has_pool_views,
        has_open_views: data.has_open_views,
        community_fees_monthly: data.community_fees_monthly ? parseFloat(data.community_fees_monthly) : null,
        ibi_tax_yearly: data.ibi_tax_yearly ? parseFloat(data.ibi_tax_yearly) : null,
        garbage_tax_yearly: data.garbage_tax_yearly ? parseFloat(data.garbage_tax_yearly) : null,
      };

      const { error } = await supabase
        .from("projects")
        .update(updateData)
        .eq("id", project.id);

      if (error) throw error;

      toast.success("Project succesvol bijgewerkt");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating project:", error);
      toast.error("Fout bij het bijwerken van het project");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Project Bewerken</DialogTitle>
          <DialogDescription>
            Pas de projectgegevens aan en klik op opslaan om de wijzigingen door te voeren.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="data" className="w-full">
          <div className="space-y-2">
            {/* Row 1: Content tabs */}
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="data">Data</TabsTrigger>
              <TabsTrigger value="photos" className="flex items-center gap-1">
                <ImageIcon className="h-3 w-3" />
                Foto's
              </TabsTrigger>
              <TabsTrigger value="contacts">Contacten</TabsTrigger>
              <TabsTrigger value="videos">Video's</TabsTrigger>
              <TabsTrigger value="documents">Docs</TabsTrigger>
              <TabsTrigger value="properties">Properties ({properties.length})</TabsTrigger>
            </TabsList>
            
            {/* Row 2: AI tabs */}
            <TabsList className="grid w-full grid-cols-3 bg-primary/5">
              <TabsTrigger value="location" className="flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Locatie AI
              </TabsTrigger>
              <TabsTrigger value="rental" className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Verhuur AI
              </TabsTrigger>
              <TabsTrigger value="deep-analysis" className="flex items-center gap-1">
                <Brain className="h-3 w-3" />
                Analyse AI
              </TabsTrigger>
            </TabsList>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <TabsContent value="data" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Project Actief</FormLabel>
                        <FormDescription>
                          Schakel dit uit om het project te deactiveren
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_resale"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Herverkoop</FormLabel>
                        <FormDescription>
                          Enkele bestaande woning (geen XML-sync)
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Naam *</FormLabel>
                        <FormControl>
                          <Input {...field} />
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
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="project_key"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Key</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
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
                            <SelectItem value="active">Actief</SelectItem>
                            <SelectItem value="in_development">In Ontwikkeling</SelectItem>
                            <SelectItem value="completed">Opgeleverd</SelectItem>
                            <SelectItem value="sold_out">Uitverkocht</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                </div>

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Locatie Beschrijving</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Bijv. Aan de kust, bij golfbaan" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch("is_resale") ? (
                  <FormField
                    control={form.control}
                    name="resale_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vraagprijs (€)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="0.01" placeholder="185000" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="price_from"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prijs Vanaf (€)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" step="0.01" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="price_to"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prijs Tot (€)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" step="0.01" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="latitude"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Latitude</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="any" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="longitude"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Longitude</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="any" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Commission Section */}
                <div className="rounded-lg border p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Financieel</span>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="default_commission_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Standaard Commissie Type</FormLabel>
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch('default_commission_type') === 'percentage' ? (
                    <FormField
                      control={form.control}
                      name="default_commission_percentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Standaard TIS Commissie</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input {...field} type="number" step="0.1" placeholder="5" className="pr-8" />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <FormField
                      control={form.control}
                      name="default_commission_fixed"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Standaard TIS Commissie</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                              <Input {...field} type="number" step="100" placeholder="3500" className="pl-8" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    Dit percentage/bedrag wordt automatisch overgenomen bij nieuwe verkopen
                  </p>
                </div>

                {/* Showhouse Location Section */}
                <div className="rounded-lg border p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Home className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Showhouse Locatie</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {showShowhouseLocation ? "Andere locatie" : "Zelfde als project"}
                      </span>
                      <Switch
                        checked={showShowhouseLocation}
                        onCheckedChange={setShowShowhouseLocation}
                      />
                    </div>
                  </div>

                  {showShowhouseLocation && (
                    <div className="space-y-4 pt-2">
                      <FormField
                        control={form.control}
                        name="showhouse_maps_url"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Google Maps Link</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="https://www.google.com/maps/..." />
                            </FormControl>
                            <FormDescription className="flex items-center gap-2">
                              {parsedCoords ? (
                                <>
                                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                                  <span className="text-green-600">
                                    Coördinaten gevonden: {parsedCoords.lat.toFixed(6)}, {parsedCoords.lng.toFixed(6)}
                                  </span>
                                </>
                              ) : field.value ? (
                                <>
                                  <XCircle className="h-3 w-3 text-destructive" />
                                  <span className="text-destructive">Geen coördinaten gevonden in URL</span>
                                </>
                              ) : (
                                "Plak hier de Google Maps link van de showhouse locatie"
                              )}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="showhouse_address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Adres (optioneel)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Bijv. Calle Principal 123, Los Alcázares" />
                            </FormControl>
                            <FormDescription>Voor weergave in de bezichtigingsplanning</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="showhouse_latitude"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Latitude</FormLabel>
                              <FormControl>
                                <Input {...field} type="number" step="any" readOnly className="bg-muted" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="showhouse_longitude"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Longitude</FormLabel>
                              <FormControl>
                                <Input {...field} type="number" step="any" readOnly className="bg-muted" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="showhouse_notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notities</FormLabel>
                            <FormControl>
                              <Textarea {...field} placeholder="Bijv. Bel aan bij receptie, parkeren achteraan..." rows={2} />
                            </FormControl>
                            <FormDescription>Praktische info voor bezichtigingen</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="completion_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opleverdatum</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Beschrijving</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={4} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Resale Property Details */}
                {form.watch("is_resale") && <ResalePropertyFields form={form} />}
              </TabsContent>

              {/* Photos Tab */}
              <TabsContent value="photos" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium">Project Foto's</h3>
                    <p className="text-sm text-muted-foreground">
                      Upload foto's en klik op het sterretje om de hoofdfoto te selecteren.
                    </p>
                  </div>
                  
                  <MediaUploader 
                    uploadedUrls={projectImages}
                    onUrlsChange={handleImagesChange}
                    maxFiles={50}
                  />
                  
                  {projectImages.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {projectImages.map((url) => (
                        <div 
                          key={url} 
                          className={cn(
                            "relative group aspect-square rounded-lg overflow-hidden border-2 transition-all",
                            featuredImage === url 
                              ? "border-primary ring-2 ring-primary ring-offset-2" 
                              : "border-transparent hover:border-muted-foreground/30"
                          )}
                        >
                          <img 
                            src={url} 
                            alt="Project foto"
                            className="w-full h-full object-cover" 
                          />
                          
                          {/* Featured image selection button */}
                          <button
                            type="button"
                            onClick={() => setFeaturedImage(url)}
                            className={cn(
                              "absolute top-2 left-2 p-1.5 rounded-full transition-all",
                              featuredImage === url
                                ? "bg-primary text-primary-foreground"
                                : "bg-black/50 text-white/70 hover:text-yellow-400 opacity-0 group-hover:opacity-100"
                            )}
                            title={featuredImage === url ? "Dit is de hoofdfoto" : "Maak hoofdfoto"}
                          >
                            <Star className={cn("h-4 w-4", featuredImage === url && "fill-current")} />
                          </button>
                          
                          {/* Remove button */}
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(url)}
                            className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Verwijder foto"
                          >
                            <X className="h-3 w-3" />
                          </button>
                          
                          {/* Featured label */}
                          {featuredImage === url && (
                            <div className="absolute bottom-0 left-0 right-0 bg-primary text-primary-foreground text-xs text-center py-1 font-medium">
                              Hoofdfoto
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="contacts" className="mt-4">
                <ProjectContactsManager projectId={project.id} />
              </TabsContent>

              <TabsContent value="videos" className="space-y-6 mt-4">
                {/* Existing main videos */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    Hoofdvideo's
                  </h4>
                  <FormField
                    control={form.control}
                    name="environment_video_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Omgeving Video URL</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://..." />
                        </FormControl>
                        <FormDescription>
                          YouTube, Vimeo of directe video link
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="showhouse_video_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Showhouse Video URL</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://..." />
                        </FormControl>
                        <FormDescription>
                          YouTube, Vimeo of directe video link
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Divider */}
                <div className="border-t pt-6">
                  <ProjectVideoManager projectId={project.id} />
                </div>
              </TabsContent>

              <TabsContent value="documents" className="mt-4">
                <ProjectDocumentManager projectId={project.id} projectName={project.name} />
              </TabsContent>

              <TabsContent value="properties" className="mt-4">
                {loadingProperties ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : properties.length === 0 ? (
                  <div className="text-center py-12 border rounded-lg">
                    <p className="text-muted-foreground">
                      Geen properties gevonden voor dit project
                    </p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[80px]">Foto</TableHead>
                          <TableHead>Titel</TableHead>
                          <TableHead>Locatie</TableHead>
                          <TableHead>Specs</TableHead>
                          <TableHead>Prijs</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Acties</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {properties.map((property) => (
                          <TableRow key={property.id}>
                            <TableCell>
                              <div className="w-16 h-16 rounded overflow-hidden bg-muted flex items-center justify-center">
                                {property.image_url ? (
                                  <img
                                    src={property.image_url}
                                    alt={property.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <MapPin className="w-6 h-6 text-muted-foreground" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium line-clamp-2 max-w-xs">
                                {property.title}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 text-sm">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span>{property.city || "Onbekend"}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3 text-sm">
                                {property.bedrooms !== null && (
                                  <div className="flex items-center gap-1">
                                    <Bed className="h-4 w-4 text-muted-foreground" />
                                    <span>{property.bedrooms}</span>
                                  </div>
                                )}
                                {property.bathrooms !== null && (
                                  <div className="flex items-center gap-1">
                                    <Bath className="h-4 w-4 text-muted-foreground" />
                                    <span>{property.bathrooms}</span>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-semibold">{formatPrice(property.price)}</div>
                            </TableCell>
                            <TableCell>
                              {property.status && (
                                <Badge
                                  variant={
                                    property.status === "available"
                                      ? "default"
                                      : property.status === "sold"
                                      ? "secondary"
                                      : "outline"
                                  }
                                >
                                  {property.status}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button asChild variant="ghost" size="sm">
                                <Link to={`/admin/properties?id=${property.id}`} target="_blank">
                                  <ExternalLink className="h-4 w-4" />
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              {/* Location Intelligence Tab */}
              <TabsContent value="location" className="mt-4">
                <LocationIntelligenceTab
                  projectId={project.id}
                  projectName={project.name}
                  latitude={project.latitude ?? null}
                  longitude={project.longitude ?? null}
                  locationIntelligence={project.location_intelligence ?? null}
                  locationIntelligenceUpdatedAt={project.location_intelligence_updated_at ?? null}
                  onRefresh={onSuccess}
                />
              </TabsContent>

              {/* Rental Intelligence Tab */}
              <TabsContent value="rental" className="mt-4">
                <RentalIntelligenceTab
                  projectId={project.id}
                  projectName={project.name}
                  latitude={project.latitude ?? null}
                  longitude={project.longitude ?? null}
                  onRefresh={onSuccess}
                />
              </TabsContent>

              {/* Deep Analysis Tab */}
              <TabsContent value="deep-analysis" className="mt-4">
                <DeepAnalysisTab
                  projectId={project.id}
                  projectName={project.name}
                  latitude={project.latitude ?? null}
                  longitude={project.longitude ?? null}
                  existingAnalysis={project.deep_analysis_brainstorm ?? null}
                  existingStructured={project.deep_analysis_structured as StructuredDeepAnalysis | null}
                  analysisUpdatedAt={project.deep_analysis_updated_at ?? null}
                  onSave={onSuccess}
                />
              </TabsContent>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Annuleren
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Opslaan
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
