import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useImageUpload } from "@/hooks/useImageUpload";

const partnerFormSchema = z.object({
  name: z.string().min(2, "Naam moet minimaal 2 tekens bevatten"),
  role: z.string().min(2, "Rol moet minimaal 2 tekens bevatten"),
  company: z.string().min(2, "Bedrijf moet minimaal 2 tekens bevatten"),
  category: z.enum([
    "vastgoed_nl_be",
    "hypotheek_nl_be",
    "juridisch",
    "hypotheek_spanje",
  ]),
  bio: z.string().min(10, "Bio moet minimaal 2 tekens bevatten"),
  description: z.string().min(10, "Beschrijving moet minimaal 10 tekens bevatten"),
  slug: z.string().min(2, "Slug moet minimaal 2 tekens bevatten"),
  image_url: z.string().url("Ongeldige URL").optional().or(z.literal("")),
  logo_url: z.string().url("Ongeldige URL").optional().or(z.literal("")),
  website: z.string().url("Ongeldige URL").optional().or(z.literal("")),
  email: z.string().email("Ongeldig e-mailadres").optional().or(z.literal("")),
  phone: z.string().optional(),
  landing_page_title: z.string().optional(),
  landing_page_intro: z.string().optional(),
  order_index: z.coerce.number().int().min(0),
  active: z.boolean(),
  show_on_overview: z.boolean(),
  video_url: z.string().url("Ongeldige URL").optional().or(z.literal("")),
  services: z.string().optional(),
  certifications: z.string().optional(),
  social_links: z.string().optional(),
  years_experience: z.coerce.number().int().optional(),
  team_size: z.coerce.number().int().optional(),
  specializations: z.string().optional(),
  office_locations: z.string().optional(),
  testimonials: z.string().optional(),
  statistics: z.string().optional(),
  media_mentions: z.string().optional(),
  hero_image_url: z.string().url("Ongeldige URL").optional().or(z.literal("")),
  hero_video_url: z.string().url("Ongeldige URL").optional().or(z.literal("")),
  brand_color: z.string().optional(),
  ghl_tags: z.string().optional(),
});

type PartnerFormValues = z.infer<typeof partnerFormSchema>;

interface Partner {
  id: string;
  name: string;
  role: string;
  company: string;
  category: string;
  bio: string;
  description: string;
  slug: string;
  image_url: string | null;
  logo_url: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  landing_page_title: string | null;
  landing_page_intro: string | null;
  order_index: number;
  active: boolean;
  show_on_overview: boolean;
  video_url: string | null;
  services: any;
  certifications: any;
  social_links: any;
}

interface PartnerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partner?: Partner | null;
  onSuccess: () => void;
}

export function PartnerFormDialog({
  open,
  onOpenChange,
  partner,
  onSuccess,
}: PartnerFormDialogProps) {
  // toast imported from sonner at top level
  const isEditing = !!partner;
  const [isGenerating, setIsGenerating] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [updateMode, setUpdateMode] = useState<'all' | 'empty'>('empty');
  const logoUpload = useImageUpload({ bucket: 'partner-logos', pathPrefix: 'partner-logos' });
  const photoUpload = useImageUpload({ bucket: 'partner-logos', pathPrefix: 'partner-logos' });
  const heroUpload = useImageUpload({ bucket: 'partner-logos', pathPrefix: 'partner-logos' });

  const form = useForm<PartnerFormValues>({
    resolver: zodResolver(partnerFormSchema),
    defaultValues: {
      name: "",
      role: "",
      company: "",
      category: "vastgoed_nl_be",
      bio: "",
      description: "",
      slug: "",
      image_url: "",
      logo_url: "",
      website: "",
      email: "",
      phone: "",
      landing_page_title: "",
      landing_page_intro: "",
      order_index: 0,
      active: true,
      show_on_overview: true,
      video_url: "",
      services: "",
      certifications: "",
      social_links: "",
      hero_image_url: "",
      hero_video_url: "",
      brand_color: "",
      ghl_tags: "",
    },
  });

  // Auto-generate slug from company name
  const generateSlug = (company: string): string => {
    return company
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  // Handle logo upload
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = await logoUpload.upload(file);
    if (url) form.setValue('logo_url', url);
  };

  // Handle profile photo upload
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = await photoUpload.upload(file);
    if (url) form.setValue('image_url', url);
  };

  // Handle hero image upload
  const handleHeroImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = await heroUpload.upload(file);
    if (url) form.setValue('hero_image_url', url);
  };

  // Handle AI generation
  const handleGenerateWithAI = async () => {
    if (!websiteUrl) {
      toast.error("Voer een website URL in om te genereren met AI.");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-partner-profile", {
        body: {
          websiteUrl,
          name: form.getValues("name"),
          company: form.getValues("company"),
          category: form.getValues("category"),
          partnerId: partner?.id || null,
        },
      });

      if (error) throw error;

      // Populate form fields with AI-generated content based on update mode
      const shouldUpdate = (fieldValue: any) => {
        if (updateMode === 'all') return true;
        return !fieldValue || fieldValue === '' || fieldValue === '[]' || fieldValue === '{}';
      };

      if (data.bio && shouldUpdate(form.getValues("bio"))) form.setValue("bio", data.bio);
      if (data.description && shouldUpdate(form.getValues("description"))) form.setValue("description", data.description);
      if (data.landing_page_title && shouldUpdate(form.getValues("landing_page_title"))) form.setValue("landing_page_title", data.landing_page_title);
      if (data.landing_page_intro && shouldUpdate(form.getValues("landing_page_intro"))) form.setValue("landing_page_intro", data.landing_page_intro);
      
      // Auto-fill contact details
      if (data.email && shouldUpdate(form.getValues("email"))) form.setValue("email", data.email);
      if (data.phone && shouldUpdate(form.getValues("phone"))) form.setValue("phone", data.phone);
      
      // Auto-fill URLs
      if (data.website_url && shouldUpdate(form.getValues("website"))) form.setValue("website", data.website_url);
      if (data.logo_url && shouldUpdate(form.getValues("logo_url"))) form.setValue("logo_url", data.logo_url);
      if (data.profile_image_url && shouldUpdate(form.getValues("image_url"))) form.setValue("image_url", data.profile_image_url);
      if (data.video_url && shouldUpdate(form.getValues("video_url"))) form.setValue("video_url", data.video_url);
      
      // Auto-fill social links (all platforms)
      if (data.social_links && shouldUpdate(form.getValues("social_links"))) {
        form.setValue("social_links", JSON.stringify(data.social_links));
      }
      
      // Auto-fill services
      if (data.services && Array.isArray(data.services) && data.services.length > 0 && shouldUpdate(form.getValues("services"))) {
        const servicesArray = data.services.map((service: string) => ({
          name: service,
          icon: 'CheckCircle'
        }));
        form.setValue("services", JSON.stringify(servicesArray));
      }

      // Auto-fill extended fields
      if (data.years_experience && shouldUpdate(form.getValues("years_experience"))) form.setValue("years_experience", data.years_experience);
      if (data.team_size && shouldUpdate(form.getValues("team_size"))) form.setValue("team_size", data.team_size);
      
      if (data.certifications && Array.isArray(data.certifications) && shouldUpdate(form.getValues("certifications"))) {
        form.setValue("certifications", JSON.stringify(data.certifications, null, 2));
      }
      
      if (data.specializations && Array.isArray(data.specializations) && shouldUpdate(form.getValues("specializations"))) {
        form.setValue("specializations", JSON.stringify(data.specializations, null, 2));
      }
      
      if (data.office_locations && Array.isArray(data.office_locations) && shouldUpdate(form.getValues("office_locations"))) {
        form.setValue("office_locations", JSON.stringify(data.office_locations, null, 2));
      }
      
      if (data.testimonials && Array.isArray(data.testimonials) && shouldUpdate(form.getValues("testimonials"))) {
        form.setValue("testimonials", JSON.stringify(data.testimonials, null, 2));
      }
      
      if (data.statistics && typeof data.statistics === 'object' && shouldUpdate(form.getValues("statistics"))) {
        form.setValue("statistics", JSON.stringify(data.statistics, null, 2));
      }
      
      if (data.media_mentions && Array.isArray(data.media_mentions) && shouldUpdate(form.getValues("media_mentions"))) {
        form.setValue("media_mentions", JSON.stringify(data.media_mentions, null, 2));
      }
      
      if (data.hero_image_url && shouldUpdate(form.getValues("hero_image_url"))) {
        form.setValue("hero_image_url", data.hero_image_url);
      }
      
      if (data.hero_video_url && shouldUpdate(form.getValues("hero_video_url"))) {
        form.setValue("hero_video_url", data.hero_video_url);
      }
      
      if (data.brand_color && shouldUpdate(form.getValues("brand_color"))) {
        form.setValue("brand_color", data.brand_color);
      }

      // Auto-fill website URL from input
      if (websiteUrl && shouldUpdate(form.getValues("website"))) {
        form.setValue("website", websiteUrl);
      }

      // If this is a new partner, automatically create it in the database
      if (!isEditing) {
        const partnerData = {
          name: form.getValues("name"),
          role: form.getValues("role"),
          company: form.getValues("company"),
          category: form.getValues("category"),
          bio: form.getValues("bio"),
          description: form.getValues("description"),
          slug: form.getValues("slug"),
          image_url: form.getValues("image_url") || null,
          logo_url: form.getValues("logo_url") || null,
          website: form.getValues("website") || null,
          email: form.getValues("email") || null,
          phone: form.getValues("phone") || null,
          video_url: form.getValues("video_url") || null,
          landing_page_title: form.getValues("landing_page_title") || null,
          landing_page_intro: form.getValues("landing_page_intro") || null,
          order_index: form.getValues("order_index"),
          active: form.getValues("active"),
          show_on_overview: form.getValues("show_on_overview"),
          services: safeParseJSON(form.getValues("services")),
          certifications: safeParseJSON(form.getValues("certifications")),
          social_links: safeParseJSON(form.getValues("social_links")),
          years_experience: form.getValues("years_experience") || null,
          team_size: form.getValues("team_size") || null,
          specializations: safeParseJSON(form.getValues("specializations")),
          office_locations: safeParseJSON(form.getValues("office_locations")),
          testimonials: safeParseJSON(form.getValues("testimonials")),
          statistics: safeParseJSON(form.getValues("statistics")),
          media_mentions: safeParseJSON(form.getValues("media_mentions")),
          hero_image_url: form.getValues("hero_image_url") || null,
          hero_video_url: form.getValues("hero_video_url") || null,
          brand_color: form.getValues("brand_color") || null,
        };

        const { data: newPartner, error: insertError } = await supabase
          .from("partners")
          .insert([partnerData])
          .select()
          .single();

        if (insertError) throw insertError;

        // Update the scraped_data record with the new partner_id
        if (newPartner) {
          await supabase
            .from("partner_scraped_data")
            .update({ partner_id: newPartner.id })
            .eq("website_url", websiteUrl)
            .is("partner_id", null);
        }

        toast.success(`${partnerData.name} is automatisch opgeslagen en verschijnt nu in de lijst.`);

        // Trigger refresh and close dialog
        onSuccess();
        onOpenChange(false);
      } else {
        // For existing partners, just show success message
        toast.success("AI generatie succesvol. Controleer en klik op Opslaan.");
      }
    } catch (error) {
      console.error("Error generating partner profile:", error);
      toast.error("Kon partner profiel niet genereren. Controleer de website URL.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Watch company field to auto-generate slug
  const companyValue = form.watch("company");
  useEffect(() => {
    if (!isEditing && companyValue) {
      form.setValue("slug", generateSlug(companyValue));
    }
  }, [companyValue, isEditing, form]);

  useEffect(() => {
    if (partner) {
      form.reset({
        name: partner.name,
        role: partner.role,
        company: partner.company,
        category: partner.category as any,
        bio: partner.bio,
        description: partner.description,
        slug: partner.slug,
        image_url: partner.image_url || "",
        logo_url: partner.logo_url || "",
        website: partner.website || "",
        email: partner.email || "",
        phone: partner.phone || "",
        landing_page_title: partner.landing_page_title || "",
        landing_page_intro: partner.landing_page_intro || "",
        order_index: partner.order_index,
        active: partner.active,
        show_on_overview: partner.show_on_overview,
        video_url: partner.video_url || "",
        services: partner.services ? JSON.stringify(partner.services) : "",
        certifications: partner.certifications ? JSON.stringify(partner.certifications) : "",
        social_links: partner.social_links ? JSON.stringify(partner.social_links) : "",
        years_experience: (partner as any).years_experience || undefined,
        team_size: (partner as any).team_size || undefined,
        specializations: (partner as any).specializations ? JSON.stringify((partner as any).specializations) : "",
        office_locations: (partner as any).office_locations ? JSON.stringify((partner as any).office_locations) : "",
        testimonials: (partner as any).testimonials ? JSON.stringify((partner as any).testimonials) : "",
        statistics: (partner as any).statistics ? JSON.stringify((partner as any).statistics) : "",
        media_mentions: (partner as any).media_mentions ? JSON.stringify((partner as any).media_mentions) : "",
        hero_image_url: (partner as any).hero_image_url || "",
        hero_video_url: (partner as any).hero_video_url || "",
        brand_color: (partner as any).brand_color || "",
        ghl_tags: (partner as any).ghl_tags ? (partner as any).ghl_tags.join(", ") : "",
      });
      setWebsiteUrl(partner.website || "");
    } else {
      form.reset({
        name: "",
        role: "",
        company: "",
        category: "vastgoed_nl_be",
        bio: "",
        description: "",
        slug: "",
        image_url: "",
        logo_url: "",
        website: "",
        email: "",
        phone: "",
        landing_page_title: "",
        landing_page_intro: "",
        order_index: 0,
        active: true,
        show_on_overview: true,
        video_url: "",
        services: "",
        certifications: "",
        social_links: "",
        hero_image_url: "",
        hero_video_url: "",
        brand_color: "",
        ghl_tags: "",
      });
    }
  }, [partner, form]);

  // Safe JSON parser to prevent crashes
  const safeParseJSON = (value: string | undefined): any => {
    if (!value || value.trim() === '' || value.trim() === '[]' || value.trim() === '{}') {
      return null;
    }
    try {
      return JSON.parse(value);
    } catch (error) {
      console.error('Invalid JSON:', value, error);
      toast.error("Ongeldige JSON data. Sommige velden worden niet opgeslagen.");
      return null;
    }
  };

  const onSubmit = async (values: PartnerFormValues) => {
    try {
      const partnerData = {
        name: values.name,
        role: values.role,
        company: values.company,
        category: values.category,
        bio: values.bio,
        description: values.description,
        slug: values.slug,
        image_url: values.image_url || null,
        logo_url: values.logo_url || null,
        website: values.website || null,
        email: values.email || null,
        phone: values.phone || null,
        video_url: values.video_url || null,
        landing_page_title: values.landing_page_title || null,
        landing_page_intro: values.landing_page_intro || null,
        order_index: values.order_index,
        active: values.active,
        show_on_overview: values.show_on_overview,
        services: safeParseJSON(values.services),
        certifications: safeParseJSON(values.certifications),
        social_links: safeParseJSON(values.social_links),
        years_experience: values.years_experience || null,
        team_size: values.team_size || null,
        specializations: safeParseJSON(values.specializations),
        office_locations: safeParseJSON(values.office_locations),
        testimonials: safeParseJSON(values.testimonials),
        statistics: safeParseJSON(values.statistics),
        media_mentions: safeParseJSON(values.media_mentions),
        hero_image_url: values.hero_image_url || null,
        hero_video_url: values.hero_video_url || null,
        brand_color: values.brand_color || null,
        ghl_tags: values.ghl_tags
          ? values.ghl_tags.split(',').map((t: string) => t.trim()).filter(Boolean)
          : [],
      };

      if (isEditing) {
        const { error } = await supabase
          .from("partners")
          .update(partnerData)
          .eq("id", partner.id);

        if (error) throw error;

        toast.success(`${values.name} is succesvol bijgewerkt.`);
      } else {
        const { error } = await supabase.from("partners").insert([partnerData]);

        if (error) throw error;

        toast.success(`${values.name} is succesvol toegevoegd.`);
      }

      onSuccess();
    } catch (error) {
      console.error("Error saving partner:", error);
      toast.error("Kon partner niet opslaan. Probeer het opnieuw.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Partner Bewerken" : "Partner Toevoegen"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Pas de gegevens van deze partner aan."
              : "Voeg een nieuwe partner toe aan het netwerk."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Alert className="border-primary/20 bg-primary/5">
              <Sparkles className="h-4 w-4 text-primary" />
              <AlertDescription>
                <div className="space-y-3">
                  <p className="font-medium text-sm">AI Partner Generatie</p>
                  <p className="text-sm text-muted-foreground">
                    {isEditing 
                      ? "Verrijk de partner data met nieuwe AI gegenereerde content"
                      : "Vul minimale gegevens in en laat AI de rest genereren"
                    }
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="https://www.bedrijf.nl"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      disabled={isGenerating}
                    />
                    <Button
                      type="button"
                      onClick={handleGenerateWithAI}
                      disabled={isGenerating || !form.watch("name") || !form.watch("company") || !websiteUrl}
                      className="whitespace-nowrap"
                    >
                      {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isGenerating ? "Genereren..." : isEditing ? "Opnieuw Genereren" : "Genereer met AI"}
                    </Button>
                  </div>
                  {isEditing && (
                    <div className="flex items-center gap-4 pt-2 border-t">
                      <p className="text-xs font-medium">Update modus:</p>
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="radio"
                          value="empty"
                          checked={updateMode === 'empty'}
                          onChange={(e) => setUpdateMode(e.target.value as 'empty' | 'all')}
                          className="cursor-pointer"
                        />
                        Alleen lege velden
                      </label>
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="radio"
                          value="all"
                          checked={updateMode === 'all'}
                          onChange={(e) => setUpdateMode(e.target.value as 'empty' | 'all')}
                          className="cursor-pointer"
                        />
                        Alle velden overschrijven
                      </label>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {isEditing 
                      ? "Kies of je alleen lege velden wilt bijwerken of alle velden wilt overschrijven"
                      : "Vul eerst naam, bedrijf en website in, dan genereert AI de rest"
                    }
                  </p>
                </div>
              </AlertDescription>
            </Alert>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Naam *</FormLabel>
                    <FormControl>
                      <Input placeholder="Arthur Brekelmans" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bedrijf *</FormLabel>
                    <FormControl>
                      <Input placeholder="Brekelmans Adviesgroep" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rol *</FormLabel>
                  <FormControl>
                    <Input placeholder="Financieel adviseur" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categorie *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecteer een categorie" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="vastgoed_nl_be">Vastgoed NL/BE</SelectItem>
                      <SelectItem value="hypotheek_nl_be">Hypotheek NL/BE</SelectItem>
                      <SelectItem value="juridisch">Juridisch</SelectItem>
                      <SelectItem value="hypotheek_spanje">
                        Hypotheek Spanje
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio (kort) *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Een korte bio van 2-4 zinnen..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Korte menselijke bio voor in de partner card
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Beschrijving (uitgebreid) *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Uitgebreide beschrijving van de partner en hun rol..."
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Uitgebreide beschrijving voor de partner pagina
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL Slug *</FormLabel>
                  <FormControl>
                    <Input placeholder="bedrijfsnaam-advies" {...field} />
                  </FormControl>
                  <FormDescription>
                    Wordt automatisch gegenereerd, maar kan handmatig aangepast worden
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="landing_page_title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Landingspagina Titel</FormLabel>
                  <FormControl>
                    <Input placeholder="Welkom via [Partner Naam]" {...field} />
                  </FormControl>
                  <FormDescription>
                    Gepersonaliseerde titel voor de partner landingspagina
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="landing_page_intro"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Landingspagina Intro</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Korte intro tekst voor de landingspagina..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Wordt getoond op de partner landingspagina
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="info@bedrijf.nl"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefoon</FormLabel>
                    <FormControl>
                      <Input placeholder="+31 6 12345678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input placeholder="https://www.bedrijf.nl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="image_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Persoon Foto URL</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input placeholder="https://..." {...field} />
                      </FormControl>
                      <div className="relative">
                        <input
                          type="file"
                          id="photo-upload"
                          className="hidden"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          disabled={photoUpload.isUploading}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById('photo-upload')?.click()}
                          disabled={photoUpload.isUploading}
                        >
                          {photoUpload.isUploading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Uploaden...
                            </>
                          ) : (
                            'Upload'
                          )}
                        </Button>
                      </div>
                    </div>
                    <FormDescription>
                      Foto van de contactpersoon. Upload handmatig of laat AI extraheren.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="logo_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bedrijfslogo URL</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input placeholder="https://..." {...field} />
                    </FormControl>
                    <div className="relative">
                      <input
                        type="file"
                        id="logo-upload"
                        className="hidden"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        disabled={logoUpload.isUploading}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('logo-upload')?.click()}
                        disabled={logoUpload.isUploading}
                      >
                        {logoUpload.isUploading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Uploaden...
                          </>
                        ) : (
                          'Upload'
                        )}
                      </Button>
                    </div>
                  </div>
                  <FormDescription>
                    Logo van het bedrijf (voor banners en landingspagina). Upload handmatig of laat AI extraheren.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="video_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Video URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://youtube.com/watch?v=..." {...field} />
                  </FormControl>
                  <FormDescription>
                    YouTube of Vimeo link voor intro video op partner pagina
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hero_image_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hero Afbeelding URL</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input placeholder="https://..." {...field} />
                    </FormControl>
                    <div className="relative">
                      <input
                        type="file"
                        id="hero-image-upload"
                        className="hidden"
                        accept="image/*"
                        onChange={handleHeroImageUpload}
                        disabled={heroUpload.isUploading}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('hero-image-upload')?.click()}
                        disabled={heroUpload.isUploading}
                      >
                        {heroUpload.isUploading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Uploaden...
                          </>
                        ) : (
                          'Upload'
                        )}
                      </Button>
                    </div>
                  </div>
                  <FormDescription>
                    Grote banner/hero afbeelding van partner website (breed formaat). Upload handmatig of laat AI extraheren.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hero_video_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hero Video URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/video.mp4" {...field} />
                  </FormControl>
                  <FormDescription>
                    Direct link naar MP4/WebM video voor hero sectie (heeft prioriteit boven afbeelding)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="brand_color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Brand Kleur</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input placeholder="#3B82F6" {...field} />
                    </FormControl>
                    {field.value && (
                      <div 
                        className="w-12 h-10 rounded border"
                        style={{ backgroundColor: field.value }}
                      />
                    )}
                  </div>
                  <FormDescription>
                    Primaire brand kleur in hex formaat (bijv. #3B82F6)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ghl_tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>GHL Tags</FormLabel>
                  <FormControl>
                    <Input placeholder="Arthur Brekelmans, Brekelmans Advies" {...field} />
                  </FormControl>
                  <FormDescription>
                    Komma-gescheiden tags voor automatische koppeling met GoHighLevel contacten. Leads met deze tag worden automatisch aan deze partner toegewezen.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="services"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Diensten (JSON)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='[{"title":"Hypotheekadvies","icon":"home"},{"title":"Fiscaal advies","icon":"calculator"}]'
                      className="resize-none font-mono text-sm"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    JSON array met diensten (title en icon velden)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="certifications"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Certificeringen (JSON)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='[{"name":"AFM Vergunning","year":"2020"},{"name":"Wft Hypotheken","year":"2018"}]'
                      className="resize-none font-mono text-sm"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    JSON array met certificeringen (name en year velden)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="social_links"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Social Media Links (JSON)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='{"linkedin":"https://linkedin.com/in/naam","facebook":"https://facebook.com/bedrijf"}'
                      className="resize-none font-mono text-sm"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    JSON object met social media URLs (linkedin, facebook, etc.)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="order_index"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Volgorde *</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" {...field} />
                  </FormControl>
                  <FormDescription>
                    Lagere getallen verschijnen eerder
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Actief</FormLabel>
                      <FormDescription>
                        Toon deze partner op de website
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
                name="show_on_overview"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Toon op overzicht</FormLabel>
                      <FormDescription>
                        Toon op partners overzichtspagina
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
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Annuleren
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditing ? "Opslaan" : "Toevoegen"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
