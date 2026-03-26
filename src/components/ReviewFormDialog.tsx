import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { StorySectionEditor, type StorySections } from "@/components/admin/StorySectionEditor";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Upload, Link as LinkIcon, Star, FileText, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { compressImage } from "@/lib/imageCompression";
import { Label } from "@/components/ui/label";

const reviewFormSchema = z.object({
  customer_name: z.string().min(2, "Naam moet minimaal 2 tekens bevatten"),
  location: z.string().min(2, "Locatie is verplicht"),
  quote: z.string().min(10, "Quote moet minimaal 10 tekens bevatten"),
  rating: z.number().min(1).max(5),
  image_url: z.string().url("Ongeldige URL").optional().or(z.literal("")),
  active: z.boolean(),
  story_title: z.string().optional(),
  story_intro: z.string().optional(),
  story_featured_image: z.string().url("Ongeldige URL").optional().or(z.literal("")),
});

type ReviewFormValues = z.infer<typeof reviewFormSchema>;

interface Review {
  id: string;
  customer_name: string;
  location: string;
  quote: string;
  rating: number;
  customer_type: string | null;
  property_type: string | null;
  investment_type: string | null;
  year: number | null;
  image_url: string | null;
  active: boolean;
  featured: boolean;
  has_full_story: boolean;
  story_title: string | null;
  story_slug: string | null;
  story_intro: string | null;
  story_featured_image: string | null;
  story_content: string | null;
  story_phase?: string | null;
  sale_id?: string | null;
  crm_lead_id?: string | null;
  photo_urls?: string[] | null;
  video_url?: string | null;
}

interface ReviewFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  review?: Review | null;
  onSuccess: () => void;
  defaultSaleId?: string | null;
  defaultCrmLeadId?: string | null;
  defaultCustomerName?: string;
}

interface SaleOption {
  id: string;
  property_description: string | null;
  project_name: string | null;
  project_display_title: string | null;
  project_city: string | null;
  customer_names: string[];
}

interface LeadOption {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

const generateSlug = (title: string) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

export function ReviewFormDialog({
  open,
  onOpenChange,
  review,
  onSuccess,
  defaultSaleId,
  defaultCrmLeadId,
  defaultCustomerName,
}: ReviewFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!review;
  const [storySections, setStorySections] = useState<StorySections | null>(null);
  const [additionalContext, setAdditionalContext] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [isUploadingCustomerImage, setIsUploadingCustomerImage] = useState(false);
  const [isUploadingStoryImage, setIsUploadingStoryImage] = useState(false);
  const [isCompressingCustomerImage, setIsCompressingCustomerImage] = useState(false);
  const [isCompressingStoryImage, setIsCompressingStoryImage] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [selectedCrmLeadId, setSelectedCrmLeadId] = useState<string | null>(null);
  const [sales, setSales] = useState<SaleOption[]>([]);
  const [leads, setLeads] = useState<LeadOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [transcript, setTranscript] = useState("");
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  const [storyPhase, setStoryPhase] = useState<string>("aankoop");
  const [customerType, setCustomerType] = useState<string>("");

  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      customer_name: "",
      location: "",
      quote: "",
      rating: 5,
      image_url: "",
      active: true,
      story_title: "",
      story_intro: "",
      story_featured_image: "",
    },
  });

  useEffect(() => {
    if (review) {
      form.reset({
        customer_name: review.customer_name,
        location: review.location,
        quote: review.quote,
        rating: review.rating,
        image_url: review.image_url || review.photo_urls?.[0] || "",
        active: review.active,
        story_title: review.story_title || "",
        story_intro: review.story_intro || "",
        story_featured_image: review.story_featured_image || "",
      });
      setStorySections((review as any).story_sections || null);
      setAdditionalContext("");
      setHasGenerated(true);
      setSelectedSaleId(review.sale_id || null);
      setSelectedCrmLeadId(review.crm_lead_id || null);
      setVideoUrl((review as any).video_url || "");
      setStoryPhase(review.story_phase || "aankoop");
      setCustomerType(review.customer_type || "");
      setVideoUrl((review as any).video_url || "");
      // Fetch transcript
      if (review.id) {
        setLoadingTranscript(true);
        supabase.from("reviews").select("video_transcript").eq("id", review.id).maybeSingle()
          .then(({ data }) => { setTranscript((data as any)?.video_transcript || ""); setLoadingTranscript(false); });
      }
    } else {
      form.reset({
        customer_name: defaultCustomerName || "",
        location: "",
        quote: "",
        rating: 5,
        image_url: "",
        active: true,
        story_title: "",
        story_intro: "",
        story_featured_image: "",
      });
      setStorySections(null);
      setAdditionalContext("");
      setHasGenerated(false);
      setSelectedSaleId(defaultSaleId || null);
      setSelectedCrmLeadId(defaultCrmLeadId || null);
      setVideoUrl("");
      setTranscript("");
      setStoryPhase("aankoop");
      setCustomerType("");
    }
  }, [review, open, form, defaultSaleId, defaultCrmLeadId, defaultCustomerName]);

  // Fetch sales and leads for dropdown options
  useEffect(() => {
    if (!open) return;
    
    const fetchOptions = async () => {
      setLoadingOptions(true);
      try {
        const { data: salesData } = await supabase
          .from('sales')
          .select(`
            id,
            property_description,
            projects (name, display_title, city),
            sale_customers (
              crm_leads (first_name, last_name)
            )
          `)
          .order('created_at', { ascending: false });
        
        if (salesData) {
          setSales(salesData.map((sale: any) => ({
            id: sale.id,
            property_description: sale.property_description,
            project_name: sale.projects?.name || null,
            project_display_title: sale.projects?.display_title || null,
            project_city: sale.projects?.city || null,
            customer_names: sale.sale_customers?.map((sc: any) => 
              [sc.crm_leads?.first_name, sc.crm_leads?.last_name].filter(Boolean).join(' ')
            ).filter(Boolean) || []
          })));
        }
        
        const { data: leadsData } = await supabase
          .from('crm_leads')
          .select('id, first_name, last_name, email')
          .order('created_at', { ascending: false });
        
        if (leadsData) {
          setLeads(leadsData);
        }
      } catch (error) {
        console.error('Error fetching options:', error);
      } finally {
        setLoadingOptions(false);
      }
    };
    
    fetchOptions();
  }, [open]);

  const handleSaleSelect = (saleId: string) => {
    if (saleId === 'none') {
      setSelectedSaleId(null);
      return;
    }
    const sale = sales.find(s => s.id === saleId);
    if (sale) {
      setSelectedSaleId(saleId);
      setSelectedCrmLeadId(null);
      if (sale.customer_names.length > 0) {
        form.setValue('customer_name', sale.customer_names.join(' en '));
      }
      if (sale.project_city) {
        const locationParts = [sale.property_description, sale.project_city].filter(Boolean);
        form.setValue('location', locationParts.join(' in ') || sale.project_city);
      }
    }
  };

  const handleLeadSelect = (leadId: string) => {
    if (leadId === 'none') {
      setSelectedCrmLeadId(null);
      return;
    }
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      setSelectedCrmLeadId(leadId);
      setSelectedSaleId(null);
      const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(' ');
      if (fullName) {
        form.setValue('customer_name', fullName);
      }
    }
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    target: 'customer' | 'story'
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: "Ongeldig bestandstype", description: "Upload alleen afbeeldingen (JPG, PNG, etc.)", variant: "destructive" });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "Bestand te groot", description: "Maximale bestandsgrootte is 20MB", variant: "destructive" });
      return;
    }

    const setCompressing = target === 'customer' ? setIsCompressingCustomerImage : setIsCompressingStoryImage;
    const setUploading = target === 'customer' ? setIsUploadingCustomerImage : setIsUploadingStoryImage;
    const fieldName = target === 'customer' ? 'image_url' : 'story_featured_image';
    const fileSuffix = target === 'customer' ? 'customer' : 'story';

    setCompressing(true);
    try {
      const originalSizeKB = (file.size / 1024).toFixed(0);
      const compressedFile = await compressImage(file);
      const compressedSizeKB = (compressedFile.size / 1024).toFixed(0);
      
      setCompressing(false);
      setUploading(true);
      
      const fileName = `reviews/${Date.now()}-${fileSuffix}.jpg`;
      const { error: uploadError } = await supabase.storage.from('review-images').upload(fileName, compressedFile);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('review-images').getPublicUrl(fileName);
      form.setValue(fieldName as any, publicUrl);
      toast({ title: "Foto geüpload", description: `${originalSizeKB}KB → ${compressedSizeKB}KB` });
    } catch (error) {
      console.error(`Error uploading ${target} image:`, error);
      toast({ title: "Upload mislukt", description: "Kon afbeelding niet uploaden.", variant: "destructive" });
    } finally {
      setCompressing(false);
      setUploading(false);
    }
  };

  const [dossierContext, setDossierContext] = useState<{ conversations: number; viewings: number; trips: number; milestones: number } | null>(null);
  const [isLoadingContext, setIsLoadingContext] = useState(false);

  useEffect(() => {
    if (!selectedSaleId) {
      setDossierContext(null);
      return;
    }
    const fetchContext = async () => {
      setIsLoadingContext(true);
      try {
        const { data, error } = await supabase.functions.invoke('generate-customer-story', {
          body: { sale_id: selectedSaleId, context_only: true }
        });
        if (!error && data?.context) {
          setDossierContext(data.context);
        }
      } catch (e) {
        console.error('Error fetching context:', e);
      } finally {
        setIsLoadingContext(false);
      }
    };
    fetchContext();
  }, [selectedSaleId]);

  const handleGenerateStory = async () => {
    const formValues = form.getValues();
    
    if (!selectedSaleId && (!formValues.customer_name || !formValues.location)) {
      toast({ title: "Ontbrekende gegevens", description: "Vul minimaal de klantnaam en locatie in, of koppel een verkoop.", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-customer-story', {
        body: {
          customer_name: formValues.customer_name,
          location: formValues.location,
          additional_context: additionalContext,
          sale_id: selectedSaleId || undefined,
        }
      });

      if (error) throw error;

      if (data) {
        form.setValue('quote', data.quote);
        form.setValue('story_title', data.story_title);
        form.setValue('story_intro', data.story_intro);
        if (data.story_sections) {
          setStorySections(data.story_sections);
        }
        setHasGenerated(true);
        
        const contextInfo = data.context 
          ? ` (op basis van ${data.context.conversations} gesprekken, ${data.context.viewings} bezichtigingen)`
          : '';
        
        toast({ title: "Verhaal gegenereerd", description: `Succesvol gegenereerd${contextInfo}! Je kunt het nu bewerken.` });
      }
    } catch (error) {
      console.error('Error generating story:', error);
      toast({ title: "Fout bij genereren", description: "Er ging iets mis. Probeer het opnieuw.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const onSubmit = async (values: ReviewFormValues) => {
    try {
      // Auto-compute has_full_story and story_slug
      const hasStory = !!(storySections && values.story_title);
      const storySlug = values.story_title 
        ? generateSlug(values.story_title) 
        : (hasStory ? generateSlug(values.customer_name) : null);

      const reviewData: Record<string, any> = {
        customer_name: values.customer_name,
        location: values.location,
        quote: values.quote,
        rating: values.rating,
        image_url: values.image_url || null,
        photo_urls: values.image_url ? [values.image_url] : null,
        active: values.active,
        has_full_story: hasStory,
        story_title: hasStory ? values.story_title || null : null,
        story_slug: hasStory ? storySlug : null,
        story_intro: hasStory ? values.story_intro || null : null,
        story_featured_image: hasStory ? values.story_featured_image || null : null,
        story_sections: hasStory ? storySections || null : null,
        sale_id: selectedSaleId || null,
        crm_lead_id: selectedCrmLeadId || null,
        video_url: videoUrl || null,
        review_status: values.active ? 'published' : 'draft',
        story_phase: hasStory ? (storyPhase || 'aankoop') : null,
        customer_type: customerType || null,
      };

      if (isEditing) {
        const { error } = await supabase.from("reviews").update(reviewData).eq("id", review.id);
        if (error) throw error;
        toast({ title: "Review bijgewerkt", description: `Review van "${values.customer_name}" is bijgewerkt.` });
      } else {
        const { error } = await supabase.from("reviews").insert([reviewData] as any);
        if (error) throw error;
        toast({ title: "Review toegevoegd", description: `Review van "${values.customer_name}" is toegevoegd.` });
      }

      onSuccess();
    } catch (error) {
      console.error("Error saving review:", error);
      toast({ title: "Fout bij opslaan", description: "Kon review niet opslaan.", variant: "destructive" });
    }
  };

  // Star rating component
  const StarRating = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <button key={i} type="button" onClick={() => onChange(i + 1)} className="p-0.5">
          <Star className={`h-5 w-5 ${i < value ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30'}`} />
        </button>
      ))}
    </div>
  );

  // Reusable image upload field
  const ImageUploadField = ({ 
    fieldName, target, label, description, isUploading, isCompressing 
  }: { 
    fieldName: 'image_url' | 'story_featured_image'; 
    target: 'customer' | 'story'; 
    label: string; 
    description?: string;
    isUploading: boolean; 
    isCompressing: boolean;
  }) => (
    <FormField
      control={form.control}
      name={fieldName}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          {description && <FormDescription>{description}</FormDescription>}
          <div className="space-y-2">
            <div className="flex gap-2">
              <FormControl>
                <Input placeholder="https://... of upload een foto" {...field} />
              </FormControl>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, target)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isUploading || isCompressing}
                />
                <Button type="button" variant="outline" disabled={isUploading || isCompressing} className="whitespace-nowrap">
                  {isCompressing ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" />Comprimeren...</>
                  ) : isUploading ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" />Uploaden...</>
                  ) : (
                    <><Upload className="h-4 w-4 mr-2" />Upload</>
                  )}
                </Button>
              </div>
            </div>
            {field.value && (
              <div className="rounded-lg border p-2">
                <img src={field.value} alt="Preview" className={`${target === 'story' ? 'h-32 w-full' : 'h-20 w-20'} object-cover rounded`} />
              </div>
            )}
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Review Bewerken" : "Review Toevoegen"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Pas de gegevens van deze review aan." : "Voeg een nieuwe klantreview toe."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Coupling Section - hidden when opened from sale context */}
            {!defaultSaleId && (
              <div className="rounded-lg border p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <LinkIcon className="h-4 w-4 text-muted-foreground" />
                  <Label className="font-medium">Koppeling (optioneel)</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Koppel deze review aan een verkoop of klant voor betere tracking.
                </p>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="sale-select">Koppel aan verkoop</Label>
                    <Select value={selectedSaleId || 'none'} onValueChange={handleSaleSelect} disabled={loadingOptions}>
                      <SelectTrigger id="sale-select">
                        <SelectValue placeholder={loadingOptions ? "Laden..." : "Selecteer verkoop"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Geen koppeling</SelectItem>
                        {sales.map((sale) => (
                          <SelectItem key={sale.id} value={sale.id}>
                            {[sale.project_name || sale.project_display_title, sale.property_description, sale.customer_names.length > 0 ? `(${sale.customer_names.join(', ')})` : null].filter(Boolean).join(' - ') || 'Onbekende verkoop'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="lead-select">Of koppel aan klant</Label>
                    <Select value={selectedCrmLeadId || 'none'} onValueChange={handleLeadSelect} disabled={loadingOptions}>
                      <SelectTrigger id="lead-select">
                        <SelectValue placeholder={loadingOptions ? "Laden..." : "Selecteer klant"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Geen koppeling</SelectItem>
                        {leads.map((lead) => (
                          <SelectItem key={lead.id} value={lead.id}>
                            {[lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Onbekend'} 
                            {lead.email ? ` (${lead.email})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {(selectedSaleId || selectedCrmLeadId) && (
                  <p className="text-xs text-emerald-600">
                    ✓ Review wordt gekoppeld aan {selectedSaleId ? 'verkoop' : 'klant'}
                  </p>
                )}
              </div>
            )}

            {/* Video URL - always visible */}
            <div className="space-y-2">
              <Label htmlFor="video-url">Video URL (optioneel)</Label>
              <Input
                id="video-url"
                placeholder="https://youtube.com/watch?v=... of https://vimeo.com/..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Plak de link naar het klantinterview (YouTube of Vimeo)
              </p>
              {/* Transcript section */}
              {loadingTranscript ? (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Transcript laden...
                </div>
              ) : transcript ? (
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <FileText className="h-3 w-3" />
                    Transcript bekijken ({transcript.split(/\s+/).length} woorden)
                    <ChevronDown className="h-3 w-3" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <pre className="mt-2 max-h-48 overflow-y-auto text-xs bg-muted/30 rounded-md p-3 whitespace-pre-wrap font-sans leading-relaxed">
                      {transcript}
                    </pre>
                  </CollapsibleContent>
                </Collapsible>
              ) : videoUrl && review?.id ? (
                <p className="text-xs text-muted-foreground">Geen transcript beschikbaar</p>
              ) : null}
            </div>

            {!hasGenerated && !isEditing ? (
              // Generation Mode
              <div className="space-y-4">
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Genereer Klantverhaal met AI</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Vul de basisgegevens in en laat AI een review én case study genereren.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="customer_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Klantnaam *</FormLabel>
                        <FormControl><Input placeholder="Jan en Marie de Vries" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Locatie *</FormLabel>
                        <FormControl><Input placeholder="Villa in Los Alcázares" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <ImageUploadField
                  fieldName="image_url"
                  target="customer"
                  label="Klant Foto (optioneel)"
                  isUploading={isUploadingCustomerImage}
                  isCompressing={isCompressingCustomerImage}
                />

                {/* Additional context */}
                <div>
                  <Label>Extra context voor AI (optioneel)</Label>
                  <Textarea
                    placeholder="Bijv. klant was erg tevreden over de bezichtigingsreis..."
                    value={additionalContext}
                    onChange={(e) => setAdditionalContext(e.target.value)}
                    className="mt-1.5"
                  />
                </div>

                {/* Dossier context indicator */}
                {selectedSaleId && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                    {isLoadingContext ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" /> Context laden...
                      </div>
                    ) : dossierContext ? (
                      <>
                        <p className="text-xs font-medium">Beschikbare klantdata:</p>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-1">
                          {dossierContext.conversations > 0 && (
                            <span className="bg-background px-2 py-0.5 rounded-full border">{dossierContext.conversations} gesprekken</span>
                          )}
                          {dossierContext.viewings > 0 && (
                            <span className="bg-background px-2 py-0.5 rounded-full border">{dossierContext.viewings} bezichtigingen</span>
                          )}
                          {dossierContext.trips > 0 && (
                            <span className="bg-background px-2 py-0.5 rounded-full border">{dossierContext.trips} reizen</span>
                          )}
                          {dossierContext.milestones > 0 && (
                            <span className="bg-background px-2 py-0.5 rounded-full border">{dossierContext.milestones} milestones</span>
                          )}
                          {dossierContext.conversations === 0 && dossierContext.viewings === 0 && (
                            <span>Geen verrijkte data — basis generatie</span>
                          )}
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">Verkoop gekoppeld — context wordt meegestuurd</p>
                    )}
                  </div>
                )}

                <Button type="button" onClick={handleGenerateStory} disabled={isGenerating} className="w-full" size="lg">
                  {isGenerating ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Verhaal wordt gegenereerd...</>
                  ) : (
                    <><Sparkles className="mr-2 h-5 w-5" />Genereer Review & Case Study</>
                  )}
                </Button>
              </div>
            ) : (
              // Edit Mode: Two tabs
              <Tabs defaultValue="review" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="review">Review</TabsTrigger>
                  <TabsTrigger value="casestudy">Case Study</TabsTrigger>
                </TabsList>

                <TabsContent value="review" className="space-y-4 mt-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="customer_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Klantnaam *</FormLabel>
                          <FormControl><Input placeholder="Jan de Vries" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Locatie *</FormLabel>
                          <FormControl><Input placeholder="Villa in Alfas del Pi" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="quote"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quote *</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Een korte testimonial..." className="resize-none" rows={3} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="rating"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Beoordeling</FormLabel>
                        <FormControl>
                          <StarRating value={field.value} onChange={field.onChange} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <ImageUploadField
                    fieldName="image_url"
                    target="customer"
                    label="Klant Foto"
                    isUploading={isUploadingCustomerImage}
                    isCompressing={isCompressingCustomerImage}
                  />

                  <FormField
                    control={form.control}
                    name="active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Actief</FormLabel>
                          <FormDescription>Toon op website</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="casestudy" className="space-y-4 mt-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Verhaalfase</Label>
                      <Select value={storyPhase} onValueChange={setStoryPhase}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecteer fase" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="aankoop">Aankoop</SelectItem>
                          <SelectItem value="compleet">Compleet</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Klanttype</Label>
                      <Select value={customerType || "none"} onValueChange={(v) => setCustomerType(v === "none" ? "" : v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecteer klanttype" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Niet ingesteld</SelectItem>
                          <SelectItem value="Genieter">Genieter</SelectItem>
                          <SelectItem value="Investeerder">Investeerder</SelectItem>
                          <SelectItem value="Combinatie">Combinatie</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <ImageUploadField
                    fieldName="story_featured_image"
                    target="story"
                    label="Story Featured Image"
                    description="Featured afbeelding voor de case study pagina"
                    isUploading={isUploadingStoryImage}
                    isCompressing={isCompressingStoryImage}
                  />

                  <FormField
                    control={form.control}
                    name="story_title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Story Titel</FormLabel>
                        <FormControl>
                          <Input placeholder="Van droom tot werkelijkheid in Alfas del Pi" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="story_intro"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Story Intro</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Korte samenvatting van het verhaal..." className="resize-none" rows={3} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <StorySectionEditor value={storySections} onChange={setStorySections} />
                </TabsContent>
              </Tabs>
            )}

            {(hasGenerated || isEditing) && (
              <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Annuleren
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditing ? "Bijwerken" : "Toevoegen"}
                </Button>
              </div>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
