import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BlogContentGenerator } from "./BlogContentGenerator";

interface GeneratedContent {
  title?: string;
  slug?: string;
  intro?: string;
  summary?: string;
  outline?: any[];
  content?: any;
  meta_description?: string;
  meta_keywords?: string[];
  seo_bullets?: string[];
  featured_image?: string;
  category?: string;
  published?: boolean;
  add_to_guide?: boolean;
  guide_pillar?: string;
  portal_phases?: string[];
  source_insight_id?: string;
  source_tension_id?: string;
  source_question_id?: string;
}

interface BlogGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  prefillInsightId?: string;
  prefillInsightLabel?: string;
  prefillQuestion?: string;
  prefillQuestionId?: string;
  prefillAnswerFragments?: string[];
}

export function BlogGeneratorDialog({ open, onOpenChange, onSuccess, prefillInsightId, prefillInsightLabel, prefillQuestion, prefillQuestionId, prefillAnswerFragments }: BlogGeneratorDialogProps) {
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const ensureUniqueSlug = async (slug: string): Promise<string> => {
    let candidate = slug;
    let suffix = 1;
    while (true) {
      const { data } = await supabase.from("blog_posts").select("id").eq("slug", candidate).limit(1);
      if (!data || data.length === 0) return candidate;
      suffix++;
      candidate = `${slug}-${suffix}`;
    }
  };

  const handleComplete = async (data: GeneratedContent) => {
    setSaving(true);
    try {
      // Convert sections content to proper format for database
      const contentForDb = data.content || { sections: [] };

      const baseSlug = data.slug || `blog-${Date.now()}`;
      const uniqueSlug = await ensureUniqueSlug(baseSlug);

      // 1. Blog post opslaan
      const { data: insertedPost, error } = await supabase
        .from('blog_posts')
        .insert({
          title: data.title || 'Untitled',
          slug: uniqueSlug,
          intro: data.intro || '',
          summary: data.summary || null,
          category: data.category || 'Algemeen',
          content: contentForDb,
          meta_description: data.meta_description || null,
          meta_keywords: data.meta_keywords || [],
          seo_bullets: data.seo_bullets || [],
          featured_image: data.featured_image || null,
          published: data.published || false,
          published_at: data.published ? new Date().toISOString() : null,
          portal_phases: data.portal_phases || [],
          author: 'Top Immo Spain',
          source_insight_id: data.source_insight_id || null,
          source_tension_id: data.source_tension_id || null,
          source_question_id: data.source_question_id || null,
        } as any)
        .select('id')
        .single();

      if (error) throw error;

      // 2. Toevoegen aan gids indien geselecteerd
      if (data.add_to_guide && data.guide_pillar && insertedPost?.id) {
        // Get the highest order_index for this pillar
        const { data: existingItems } = await supabase
          .from('orientation_guide_items')
          .select('order_index')
          .eq('pillar', data.guide_pillar)
          .order('order_index', { ascending: false })
          .limit(1);
        
        const nextOrderIndex = (existingItems?.[0]?.order_index ?? -1) + 1;

        const { error: guideError } = await supabase
          .from('orientation_guide_items')
          .insert({
            pillar: data.guide_pillar,
            blog_post_id: insertedPost.id,
            order_index: nextOrderIndex,
            active: true,
            is_required: false,
          });

        if (guideError) {
          console.error("Error adding to guide:", guideError);
          toast.error("Post opgeslagen, maar kon niet aan gids toevoegen");
          onOpenChange(false);
          onSuccess();
          return;
        }
      }

      // 3. Success message
      const message = data.published 
        ? "Blogpost gepubliceerd!" 
        : "Blogpost opgeslagen als concept!";
      
      if (data.add_to_guide && data.guide_pillar) {
        toast.success(`${message} En toegevoegd aan de oriëntatiegids.`);
      } else {
        toast.success(message);
      }

      queryClient.invalidateQueries({ queryKey: ["workflow-counts"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-stats"] });
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error saving blog post:", error);
      toast.error("Kon blogpost niet opslaan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            AI Blog Generator
          </DialogTitle>
          <DialogDescription>
            Genereer automatisch een complete blogpost van idee tot artikel
          </DialogDescription>
        </DialogHeader>

        <BlogContentGenerator
          onComplete={handleComplete}
          onCancel={() => onOpenChange(false)}
          prefillInsightId={prefillInsightId}
          prefillInsightLabel={prefillInsightLabel}
          prefillQuestion={prefillQuestion}
          prefillQuestionId={prefillQuestionId}
          prefillAnswerFragments={prefillAnswerFragments}
        />
      </DialogContent>
    </Dialog>
  );
}
