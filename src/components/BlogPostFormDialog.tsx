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
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BlogSectionEditor, 
  ContentSection, 
  parseContentFromDb, 
  serializeContentToDb 
} from "@/components/admin/BlogSectionEditor";

const CATEGORIES = [
  "Oriënteren",
  "Aankoopproces", 
  "financiering",
  "belastingen",
  "juridisch",
  "verhuur",
  "Praktisch",
  "Algemeen"
];

const PORTAL_PHASES = [
  { value: "overdracht", label: "Overdracht" },
  { value: "beheer", label: "Beheer" },
];

const blogPostFormSchema = z.object({
  title: z.string().min(5, "Titel moet minimaal 5 tekens bevatten"),
  slug: z.string().min(3, "Slug moet minimaal 3 tekens bevatten"),
  category: z.string().min(2, "Categorie is verplicht"),
  intro: z.string().min(20, "Intro moet minimaal 20 tekens bevatten"),
  summary: z.string().optional(),
  author: z.string().optional(),
  featured_image: z.string().url("Ongeldige URL").optional().or(z.literal("")),
  meta_description: z.string().optional(),
  meta_keywords: z.string().optional(),
  seo_bullets: z.string().optional(),
  published: z.boolean(),
});

type BlogPostFormValues = z.infer<typeof blogPostFormSchema>;

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  intro: string;
  summary?: string | null;
  content: any;
  category: string;
  author: string | null;
  published: boolean;
  published_at: string | null;
  featured_image: string | null;
  meta_description: string | null;
  meta_keywords: string[] | null;
  seo_bullets: string[];
  portal_phases?: string[] | null;
}

interface BlogPostFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post?: BlogPost | null;
  onSuccess: () => void;
}

export function BlogPostFormDialog({
  open,
  onOpenChange,
  post,
  onSuccess,
}: BlogPostFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!post;
  const [sections, setSections] = useState<ContentSection[]>([]);
  const [portalPhases, setPortalPhases] = useState<string[]>([]);
  const form = useForm<BlogPostFormValues>({
    resolver: zodResolver(blogPostFormSchema),
    defaultValues: {
      title: "",
      slug: "",
      category: "",
      intro: "",
      summary: "",
      author: "Top Immo Spain",
      featured_image: "",
      meta_description: "",
      meta_keywords: "",
      seo_bullets: "",
      published: false,
    },
  });

  useEffect(() => {
    if (post) {
      form.reset({
        title: post.title,
        slug: post.slug,
        category: post.category,
        intro: post.intro,
        summary: post.summary || "",
        author: post.author || "Top Immo Spain",
        featured_image: post.featured_image || "",
        meta_description: post.meta_description || "",
        meta_keywords: post.meta_keywords?.join(", ") || "",
        seo_bullets: post.seo_bullets?.join("\n") || "",
        published: post.published,
      });
      setSections(parseContentFromDb(post.content));
      setPortalPhases(post.portal_phases || []);
      form.reset({
        title: "",
        slug: "",
        category: "",
        intro: "",
        summary: "",
        author: "Top Immo Spain",
        featured_image: "",
        meta_description: "",
        meta_keywords: "",
        seo_bullets: "",
        published: false,
      });
      setSections([]);
      setPortalPhases([]);
    }
  }, [post, form]);

  // Auto-generate slug from title
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const ensureUniqueSlug = async (slug: string, excludeId?: string): Promise<string> => {
    let candidate = slug;
    let suffix = 1;
    while (true) {
      let query = supabase.from("blog_posts").select("id").eq("slug", candidate).limit(1);
      if (excludeId) query = query.neq("id", excludeId);
      const { data } = await query;
      if (!data || data.length === 0) return candidate;
      suffix++;
      candidate = `${slug}-${suffix}`;
    }
  };

  const onSubmit = async (values: BlogPostFormValues) => {
    try {
      const uniqueSlug = await ensureUniqueSlug(values.slug, post?.id);
      if (uniqueSlug !== values.slug) {
        toast({
          title: "Slug aangepast",
          description: `Slug was al in gebruik. Aangepast naar "${uniqueSlug}".`,
        });
      }
      const postData = {
        title: values.title,
        slug: uniqueSlug,
        category: values.category,
        intro: values.intro,
        summary: values.summary || null,
        content: serializeContentToDb(sections),
        author: values.author || "Top Immo Spain",
        featured_image: values.featured_image || null,
        meta_description: values.meta_description || null,
        meta_keywords: values.meta_keywords
          ? values.meta_keywords.split(",").map((k) => k.trim())
          : null,
        seo_bullets: values.seo_bullets
          ? values.seo_bullets.split("\n").filter((b) => b.trim())
          : [],
        published: values.published,
        published_at: values.published && !post?.published 
          ? new Date().toISOString() 
          : post?.published_at,
        portal_phases: portalPhases.length > 0 ? portalPhases : null,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("blog_posts")
          .update(postData)
          .eq("id", post.id);

        if (error) throw error;

        toast({
          title: "Post bijgewerkt",
          description: `"${values.title}" is succesvol bijgewerkt.`,
        });
      } else {
        const { error } = await supabase.from("blog_posts").insert([postData]);

        if (error) throw error;

        toast({
          title: "Post toegevoegd",
          description: `"${values.title}" is succesvol toegevoegd.`,
        });
      }

      onSuccess();
    } catch (error) {
      console.error("Error saving post:", error);
      toast({
        title: "Fout bij opslaan",
        description: "Kon post niet opslaan. Probeer het opnieuw.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Blog Post Bewerken" : "Blog Post Toevoegen"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Pas de gegevens van deze blog post aan."
              : "Voeg een nieuwe blog post toe."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="content" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="seo">SEO</TabsTrigger>
                <TabsTrigger value="settings">Instellingen</TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="space-y-4 mt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Titel *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Investeren in Spanje: Complete Gids"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              if (!isEditing && !form.getValues("slug")) {
                                form.setValue("slug", generateSlug(e.target.value));
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                  )}
                />
                
                {/* Summary Field - NEW */}
                <FormField
                  control={form.control}
                  name="summary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Samenvatting (optioneel)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Korte samenvatting in 2-3 zinnen met direct antwoord op de hoofdvraag. Bijvoorbeeld: 'De minimale aanbetaling voor een hypotheek in Spanje is 30% voor niet-residenten. Dit percentage kan oplopen tot 40% afhankelijk van uw situatie en de bank.'"
                          {...field}
                          rows={4}
                        />
                      </FormControl>
                      <FormDescription>
                        Optimaal voor AI citaties en Google featured snippets. Geef een direct, helder antwoord op de hoofdvraag van het artikel.
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
                        <FormLabel>Slug *</FormLabel>
                        <FormControl>
                          <Input placeholder="investeren-in-spanje" {...field} />
                        </FormControl>
                        <FormDescription>URL-vriendelijke versie</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="category"
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
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="intro"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Intro *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Een korte introductie van de blog post..."
                          className="resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Korte samenvatting (verschijnt in overzichten)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Content *
                  </label>
                  <div className="max-h-[400px] overflow-y-auto border rounded-lg p-3 bg-muted/30">
                    <BlogSectionEditor 
                      sections={sections} 
                      onChange={setSections} 
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="seo" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="meta_description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meta Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Korte beschrijving voor zoekmachines (max 160 tekens)"
                          className="resize-none"
                          rows={2}
                          maxLength={160}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {field.value?.length || 0}/160 tekens
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="meta_keywords"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meta Keywords</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="investeren, spanje, vastgoed (komma gescheiden)"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="seo_bullets"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SEO Bullets</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Eén bullet per regel&#10;Tweede bullet punt&#10;Derde bullet punt"
                          className="resize-none"
                          rows={5}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>Belangrijke punten (1 per regel)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="featured_image"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Featured Image URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="settings" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="author"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Auteur</FormLabel>
                      <FormControl>
                        <Input placeholder="Viva Vastgoed" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="published"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Gepubliceerd</FormLabel>
                        <FormDescription>
                          Maak deze post zichtbaar op de website
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

                {/* Portal Phases */}
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Portaal Zichtbaarheid</FormLabel>
                    <FormDescription>
                      Toon dit artikel in het klantenportaal tijdens specifieke fases
                    </FormDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {PORTAL_PHASES.map((phase) => {
                      const isSelected = portalPhases.includes(phase.value);
                      return (
                        <Button
                          key={phase.value}
                          type="button"
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setPortalPhases(prev =>
                              isSelected
                                ? prev.filter(p => p !== phase.value)
                                : [...prev, phase.value]
                            );
                          }}
                        >
                          {phase.label}
                        </Button>
                      );
                    })}
                  </div>
                  {portalPhases.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Zichtbaar in: {portalPhases.map(p => PORTAL_PHASES.find(pp => pp.value === p)?.label).join(", ")}
                    </p>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-3 pt-4 border-t">
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
