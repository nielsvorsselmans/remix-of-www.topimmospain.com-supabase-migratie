import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { clearBlogCache } from "@/hooks/useExternalData";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BlogContentGenerator } from "./BlogContentGenerator";
import { BriefingsTable } from "./BriefingsTable";
import { DraftBlogsTable } from "./DraftBlogsTable";
import { BriefingDetailView } from "./BriefingDetailView";
import { BlogPipelineSettings } from "./BlogPipelineSettings";
import type { ContentBriefing } from "@/hooks/useContentBriefings";

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
  scheduled_at?: string;
  add_to_guide?: boolean;
  guide_pillar?: string;
  portal_phases?: string[];
  source_insight_id?: string;
  source_tension_id?: string;
  source_question_id?: string;
  briefing_record_id?: string;
}

export interface CreatePagePrefill {
  insightId?: string;
  insightLabel?: string;
  question?: string;
  questionId?: string;
  answerFragments?: string[];
  insightTheme?: string;
  buyerPhases?: string[];
  searchIntent?: string;
  frequency?: number;
  fastTrack?: boolean;
  customInstructions?: string;
}

interface CreatePageProps {
  prefill?: CreatePagePrefill | null;
  onPrefillConsumed?: () => void;
  openBriefingId?: string | null;
  onBriefingIdConsumed?: () => void;
}

type ViewMode = "list" | "detail" | "write" | "settings";

export function CreatePage({ prefill, onPrefillConsumed, openBriefingId, onBriefingIdConsumed }: CreatePageProps) {
  const [key, setKey] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedBriefingId, setSelectedBriefingId] = useState<string | null>(null);
  const [activeBriefing, setActiveBriefing] = useState<ContentBriefing | null>(null);
  const queryClient = useQueryClient();

  // Handle external briefing ID navigation
  useEffect(() => {
    if (openBriefingId && selectedBriefingId !== openBriefingId) {
      setSelectedBriefingId(openBriefingId);
      setViewMode("detail");
      onBriefingIdConsumed?.();
    }
  }, [openBriefingId]);

  const handleComplete = async (data: GeneratedContent) => {
    try {
      const contentForDb = data.content || { sections: [] };

      const { data: insertedPost, error } = await supabase
        .from('blog_posts')
        .insert({
          title: data.title || 'Untitled',
          slug: data.slug || `blog-${Date.now()}`,
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
          scheduled_at: data.scheduled_at || null,
          portal_phases: data.portal_phases || [],
          author: 'Top Immo Spain',
          source_insight_id: data.source_insight_id || null,
          source_tension_id: data.source_tension_id || null,
          source_question_id: data.source_question_id || null,
        } as any)
        .select('id')
        .single();

      if (error) throw error;

      // Mark briefing as written
      const briefingIdToUpdate = activeBriefing?.id || data.briefing_record_id;
      if (briefingIdToUpdate) {
        await supabase
          .from('content_briefings' as any)
          .update({ status: 'written', updated_at: new Date().toISOString() })
          .eq('id', briefingIdToUpdate);
      }

      if (data.add_to_guide && data.guide_pillar && insertedPost?.id) {
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
          return;
        }
      }

      const message = data.published
        ? "Blogpost gepubliceerd!"
        : data.scheduled_at
          ? "Blogpost ingepland!"
          : "Blogpost opgeslagen als concept!";

      if (data.add_to_guide && data.guide_pillar) {
        toast.success(`${message} En toegevoegd aan de oriëntatiegids.`);
      } else {
        toast.success(message);
      }

      clearBlogCache();
      queryClient.invalidateQueries({ queryKey: ["workflow-counts"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-stats"] });
      queryClient.invalidateQueries({ queryKey: ["content-briefings"] });
      queryClient.invalidateQueries({ queryKey: ["latest-blog-posts"] });
      queryClient.invalidateQueries({ queryKey: ["published-blogs"] });
      queryClient.invalidateQueries({ queryKey: ["published-blog-posts"] });
      onPrefillConsumed?.();
      setActiveBriefing(null);
      setViewMode("list");
      setKey(prev => prev + 1);
    } catch (error: any) {
      console.error("Error saving blog post:", error);
      const detail = error?.message || error?.details || JSON.stringify(error);
      toast.error(`Kon blogpost niet opslaan: ${detail}`);
    }
  };

  const handleCancel = () => {
    onPrefillConsumed?.();
    setActiveBriefing(null);
    setViewMode("list");
    setKey(prev => prev + 1);
  };

  const handleAutoSave = async (data: { article_data?: any; image_url?: string }) => {
    if (!activeBriefing?.id) return;
    try {
      const updatePayload: any = { updated_at: new Date().toISOString() };
      if (data.article_data) updatePayload.article_data = data.article_data;
      if (data.image_url) updatePayload.image_url = data.image_url;

      await supabase
        .from('content_briefings' as any)
        .update(updatePayload)
        .eq('id', activeBriefing.id);
    } catch (e) {
      console.warn("Auto-save failed:", e);
    }
  };

  const handleOpenBriefing = (id: string) => {
    setSelectedBriefingId(id);
    setViewMode("detail");
  };

  const handleWriteFromBriefing = (briefing: ContentBriefing) => {
    setActiveBriefing(briefing);
    setViewMode("write");
    setKey(prev => prev + 1);
  };

  const handleBackToList = () => {
    setSelectedBriefingId(null);
    setViewMode("list");
  };

  // If prefill is provided (legacy flow from insight), show generator directly
  if (prefill) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Creëren</h2>
          <p className="text-sm text-muted-foreground">
            Genereer een blogpost vanuit een idee, inzicht of klantvraag.
          </p>
        </div>
        <BlogContentGenerator
          key={key}
          onComplete={handleComplete}
          onCancel={handleCancel}
          prefillInsightId={prefill.insightId}
          prefillInsightLabel={prefill.insightLabel}
          prefillQuestion={prefill.question}
          prefillQuestionId={prefill.questionId}
          prefillAnswerFragments={prefill.answerFragments}
          prefillInsightTheme={prefill.insightTheme}
          prefillBuyerPhases={prefill.buyerPhases}
          prefillSearchIntent={prefill.searchIntent}
          prefillFrequency={prefill.frequency}
          fastTrack={prefill.fastTrack}
          prefillCustomInstructions={prefill.customInstructions}
        />
      </div>
    );
  }

  // Write mode: BlogContentGenerator with existing briefing
  if (viewMode === "write" && activeBriefing) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Artikel schrijven</h2>
          <p className="text-sm text-muted-foreground">
            Schrijf een artikel op basis van de goedgekeurde briefing.
          </p>
        </div>
        <BlogContentGenerator
          key={key}
          onComplete={handleComplete}
          onCancel={handleCancel}
          existingBriefing={activeBriefing}
          onAutoSave={handleAutoSave}
        />
      </div>
    );
  }

  // Detail mode: show full briefing
  if (viewMode === "detail" && selectedBriefingId) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Briefing details</h2>
          <p className="text-sm text-muted-foreground">
            Bekijk en beoordeel de strategische briefing.
          </p>
        </div>
        <BriefingDetailView
          briefingId={selectedBriefingId}
          onBack={handleBackToList}
          onWriteArticle={handleWriteFromBriefing}
        />
      </div>
    );
  }

  // Settings mode
  if (viewMode === "settings") {
    return (
      <BlogPipelineSettings onBack={() => setViewMode("list")} />
    );
  }

  // List mode: show all briefings
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Creëren</h2>
          <p className="text-sm text-muted-foreground">
            Bekijk opgeslagen briefings of genereer een nieuw artikel.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setViewMode("settings")}>
          <Settings className="h-4 w-4 mr-1" /> Pipeline instellingen
        </Button>
      </div>
      <BriefingsTable
        onOpenBriefing={handleOpenBriefing}
        onWriteFromBriefing={handleWriteFromBriefing}
      />
      <DraftBlogsTable />
    </div>
  );
}
