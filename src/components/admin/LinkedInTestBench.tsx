import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { LinkedInBriefingView, type LinkedInBriefing, type ApprovedBriefing } from "./LinkedInBriefingView";
import { LinkedInArchetypeCompare, type CompareResult } from "./LinkedInArchetypeCompare";
import { LinkedInBriefingSummary } from "./LinkedInBriefingSummary";
import { SocialPostPreview } from "./SocialPostPreview";
import { GHLScheduler } from "./GHLScheduler";
import { LinkedInPhotoSelector } from "./LinkedInPhotoSelector";
import { InlinePhotoGenerator } from "./InlinePhotoGenerator";
import { InlineSocialImageGenerator } from "./InlineSocialImageGenerator";
import { type LinkedInPhoto } from "@/hooks/usePhotoLibrary";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Copy, Check, Clock, ArrowRight, RotateCcw, Save, CalendarIcon, ExternalLink, Plus, History, Pencil, Image, ImageIcon, Eye, SkipForward, ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, X, BarChart3, ChevronDown, Facebook, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
import { nl } from "date-fns/locale";

type Step = "select" | "brainstorm" | "briefing" | "write" | "photo" | "preview" | "schedule";

interface DebugData {
  systemPrompt?: string;
  userPrompt?: string;
  model?: string;
  enrichment?: any;
  recentHooks?: string[];
  styleExamples?: any[];
  rawResponse?: string;
  polishResult?: any;
}

interface Variant {
  id: string;
  briefing: ApprovedBriefing;
  content: string;
  hashtags: string[];
  editedContent: string;
  debug: DebugData | null;
  duration: number | null;
  savedPostId: string | null;
  savingDraft: boolean;
  photoId: string | null;
  photoUrl: string | null;
}

function CopyBlock({ label, content }: { label: string; content: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Button variant="ghost" size="sm" className="h-6 px-2" onClick={handleCopy}>
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </Button>
      </div>
      <pre className="whitespace-pre-wrap text-xs bg-muted/50 rounded-md p-3 max-h-96 overflow-y-auto border">
        {content}
      </pre>
    </div>
  );
}

export function LinkedInTestBench() {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("select");
  const [selectedPostId, setSelectedPostId] = useState<string>("");
  const [brainstormLoading, setBrainstormLoading] = useState(false);
  const [writeLoading, setWriteLoading] = useState(false);
  const [brainstormDebug, setBrainstormDebug] = useState<DebugData | null>(null);
  const [briefingResult, setBriefingResult] = useState<LinkedInBriefing | null>(null);
  const [approvedBriefing, setApprovedBriefing] = useState<ApprovedBriefing | null>(null);
  const [brainstormDuration, setBrainstormDuration] = useState<number | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [aiPhotoDialogOpen, setAiPhotoDialogOpen] = useState(false);
  const [socialImageDialogOpen, setSocialImageDialogOpen] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState(false);
  const [showDrafts, setShowDrafts] = useState(true);
  const [compareResults, setCompareResults] = useState<CompareResult[] | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [savingAllCompare, setSavingAllCompare] = useState(false);
  const [alsoPostToFacebook, setAlsoPostToFacebook] = useState(false);
  const [facebookScheduling, setFacebookScheduling] = useState(false);
  const brainstormGenIdRef = useRef<string | null>(null);
  const briefingGenIdRef = useRef<string | null>(null);

  const [variants, setVariants] = useState<Variant[]>([]);
  const [activeVariantId, setActiveVariantId] = useState<string | null>(null);

  const { data: blogPosts } = useQuery({
    queryKey: ["blog-posts-published"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, category, slug, intro, summary, meta_keywords")
        .eq("published", true)
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: linkedinPostCounts } = useQuery({
    queryKey: ["linkedin-post-counts-per-blog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_posts")
        .select("blog_post_id")
        .eq("platform", "linkedin")
        .not("blog_post_id", "is", null);
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of data || []) {
        if (row.blog_post_id) {
          counts[row.blog_post_id] = (counts[row.blog_post_id] || 0) + 1;
        }
      }
      return counts;
    },
  });

  const { data: generationHistory } = useQuery({
    queryKey: ["social-post-generations", selectedPostId],
    queryFn: async () => {
      if (!selectedPostId) return [];
      const { data, error } = await supabase
        .from("social_post_generations")
        .select("id, step, briefing_snapshot, model_used, raw_ai_response, polish_result, duration_ms, created_at, social_post_id")
        .eq("blog_post_id", selectedPostId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedPostId,
  });

  const { data: existingLinkedInPosts } = useQuery({
    queryKey: ["existing-linkedin-posts", selectedPostId],
    queryFn: async () => {
      const { data } = await supabase
        .from("social_posts")
        .select("id, status, created_at")
        .eq("blog_post_id", selectedPostId)
        .eq("platform", "linkedin")
        .in("status", ["scheduled", "published"]);
      return data || [];
    },
    enabled: !!selectedPostId,
  });

  const { data: linkedinDrafts } = useQuery({
    queryKey: ["linkedin-drafts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_posts")
        .select("id, content, hashtags, photo_id, blog_post_id, created_at, updated_at, scheduled_for, blog_posts:blog_post_id(title), linkedin_photo_library:photo_id(image_url)")
        .eq("platform", "linkedin")
        .eq("status", "draft")
        .not("blog_post_id", "is", null)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      const mapped = (data || []).map((d: any) => ({
        id: d.id,
        content: d.content,
        hashtags: d.hashtags || [],
        photoId: d.photo_id,
        photoUrl: d.linkedin_photo_library?.image_url || null,
        blogPostId: d.blog_post_id,
        blogTitle: d.blog_posts?.title || null,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
        scheduledFor: d.scheduled_for || null,
      }));
      return mapped.sort((a: any, b: any) => {
        if (!a.scheduledFor && b.scheduledFor) return -1;
        if (a.scheduledFor && !b.scheduledFor) return 1;
        return 0;
      });
    },
  });

  // Auto-save on step change
  const prevStepRef = useRef<Step>(step);
  useEffect(() => {
    if (prevStepRef.current === step) return;
    const prevStep = prevStepRef.current;
    prevStepRef.current = step;
    
    const variant = variants.find(v => v.id === activeVariantId);
    if (!variant?.savedPostId) return;
    
    if (prevStep === "write" && variant.editedContent !== variant.content) {
      supabase.from("social_post_generations").insert({
        blog_post_id: selectedPostId,
        social_post_id: variant.savedPostId,
        step: "content_edit",
        raw_ai_response: variant.editedContent,
        enrichment_data: { original_length: variant.content.length, edited_length: variant.editedContent.length },
      }).then(() => queryClient.invalidateQueries({ queryKey: ["social-post-generations", selectedPostId] }));
    }
    
    supabase
      .from("social_posts")
      .update({
        content: variant.editedContent,
        hashtags: variant.hashtags,
        photo_id: variant.photoId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", variant.savedPostId)
      .then(({ error }) => {
        if (error) console.error("Auto-save failed:", error);
        else queryClient.invalidateQueries({ queryKey: ["linkedin-drafts"] });
      });
  }, [step]);

  const selectedPost = blogPosts?.find((p) => p.id === selectedPostId);

  const loadDraft = async (draft: NonNullable<typeof linkedinDrafts>[number]) => {
    reset();
    setSelectedPostId(draft.blogPostId || "");
    setShowDrafts(false);
    
    const { data: gens } = await supabase
      .from("social_post_generations")
      .select("*")
      .eq("social_post_id", draft.id)
      .order("created_at", { ascending: true });
    
    const brainstormGen = (gens || []).find((g: any) => g.step === "brainstorm");
    const briefingGen = (gens || []).find((g: any) => g.step === "briefing_approved");
    const writeGen = (gens || []).find((g: any) => g.step === "write");
    
    if (brainstormGen?.raw_ai_response) {
      try {
        const parsed = JSON.parse(brainstormGen.raw_ai_response);
        setBriefingResult(parsed.briefing || parsed);
      } catch { /* ignore */ }
    }
    if (brainstormGen?.briefing_snapshot) {
      setBriefingResult(brainstormGen.briefing_snapshot as any);
    }
    
    if (briefingGen?.briefing_snapshot) {
      setApprovedBriefing(briefingGen.briefing_snapshot as any);
    }
    
    if (brainstormGen) {
      setBrainstormDebug({
        systemPrompt: (brainstormGen.prompts_snapshot as any)?.system_prompt || undefined,
        userPrompt: (brainstormGen.prompts_snapshot as any)?.user_prompt || undefined,
        model: brainstormGen.model_used || undefined,
        enrichment: brainstormGen.enrichment_data || undefined,
        rawResponse: brainstormGen.raw_ai_response || undefined,
      });
      setBrainstormDuration(brainstormGen.duration_ms || null);
    }

    // Load compare results if they exist for this blog post
    if (draft.blogPostId) {
      const { data: compareGens } = await supabase
        .from("social_post_generations")
        .select("*")
        .eq("blog_post_id", draft.blogPostId)
        .eq("step", "compare")
        .order("created_at", { ascending: false })
        .limit(3);
      
      if (compareGens && compareGens.length > 0) {
        const restored: CompareResult[] = compareGens.map((g: any) => {
          const enrichment = g.enrichment_data || {};
          return {
            archetype: enrichment.archetype || (g.briefing_snapshot as any)?.archetype || "unknown",
            content: g.raw_ai_response || "",
            hashtags: enrichment.hashtags || [],
            debug: null,
            duration: enrichment.duration || g.duration_ms || null,
            status: "done" as const,
            usedHook: enrichment.usedHook,
          };
        });
        setCompareResults(restored);
      }
    }
    
    const variantId = crypto.randomUUID();
    const newVariant: Variant = {
      id: variantId,
      briefing: (briefingGen?.briefing_snapshot as any) || { archetype: "", selected_hook: "", teaser_questions: [], trigger_word: "", emotional_angle: "", target_audience_insight: "" },
      content: draft.content,
      hashtags: draft.hashtags,
      editedContent: draft.content,
      debug: writeGen ? {
        systemPrompt: (writeGen.prompts_snapshot as any)?.system_prompt || undefined,
        userPrompt: (writeGen.prompts_snapshot as any)?.user_prompt || undefined,
        model: writeGen.model_used || undefined,
        rawResponse: writeGen.raw_ai_response || undefined,
        polishResult: writeGen.polish_result || undefined,
      } : null,
      duration: writeGen?.duration_ms || null,
      savedPostId: draft.id,
      savingDraft: false,
      photoId: draft.photoId,
      photoUrl: draft.photoUrl,
    };
    
    setVariants([newVariant]);
    setActiveVariantId(variantId);
    
    const hasContent = draft.content?.length > 0;
    const hasPhoto = !!draft.photoId;
    if (hasPhoto) setStep("preview");
    else if (hasContent) setStep("write");
    else if (briefingGen) setStep("briefing");
    else setStep("select");
  };

  const reset = () => {
    setStep("select");
    setBrainstormDebug(null);
    setBriefingResult(null);
    setApprovedBriefing(null);
    setBrainstormDuration(null);
    setVariants([]);
    setActiveVariantId(null);
    setScheduleSuccess(false);
    setCompareResults(null);
    setIsComparing(false);
    brainstormGenIdRef.current = null;
    briefingGenIdRef.current = null;
  };

  const loadFromHistory = (gen: any) => {
    const loadableSteps = ["brainstorm", "briefing_approved", "write", "compare"];
    if (!loadableSteps.includes(gen.step)) return;

    // Handle compare records: load all compare records for same blog post created around the same time
    if (gen.step === "compare") {
      const loadCompareRecords = async () => {
        const genTime = new Date(gen.created_at).getTime();
        const allCompare = (generationHistory || []).filter((g: any) => {
          if (g.step !== "compare") return false;
          const timeDiff = Math.abs(new Date(g.created_at).getTime() - genTime);
          return timeDiff < 60000; // within 1 minute = same batch
        });
        
        const results: CompareResult[] = allCompare.map((g: any) => {
          const enrichment = g.enrichment_data || {};
          return {
            archetype: enrichment.archetype || (g.briefing_snapshot as any)?.archetype || "unknown",
            content: g.raw_ai_response || "",
            hashtags: enrichment.hashtags || [],
            debug: null,
            duration: enrichment.duration || g.duration_ms || null,
            status: "done" as const,
            usedHook: enrichment.usedHook,
          };
        });
        
        if (results.length > 0) {
          setCompareResults(results);
          setStep("write");
          toast.success(`${results.length} vergelijkingsresultaten geladen`);
        } else {
          toast.error("Geen vergelijkingsdata gevonden");
        }
      };
      loadCompareRecords();
      return;
    }

    if (gen.step === "brainstorm") {
      let briefing = null;
      if (gen.briefing_snapshot) {
        briefing = gen.briefing_snapshot;
      } else if (gen.raw_ai_response) {
        try {
          const parsed = JSON.parse(gen.raw_ai_response);
          briefing = parsed.briefing || parsed;
        } catch { /* ignore */ }
      }
      if (!briefing) {
        toast.error("Geen briefing-data gevonden in dit record");
        return;
      }
      setBriefingResult(briefing as any);
      setApprovedBriefing(null);
      setBrainstormDebug({
        systemPrompt: gen.prompts_snapshot?.system_prompt || undefined,
        userPrompt: gen.prompts_snapshot?.user_prompt || undefined,
        model: gen.model_used || undefined,
        enrichment: gen.enrichment_data || undefined,
        rawResponse: gen.raw_ai_response || undefined,
      });
      setBrainstormDuration(gen.duration_ms || null);
      brainstormGenIdRef.current = gen.id;
      briefingGenIdRef.current = null;
      setVariants([]);
      setActiveVariantId(null);
      setStep("briefing");
      toast.success("Brainstorm geladen — kies je briefing-opties");
    } else if (gen.step === "briefing_approved") {
      if (!gen.briefing_snapshot) {
        toast.error("Geen briefing-snapshot gevonden");
        return;
      }
      setApprovedBriefing(gen.briefing_snapshot as any);
      briefingGenIdRef.current = gen.id;
      setStep("briefing");
      toast.success("Goedgekeurde briefing geladen — klik op 'Schrijf post'");
    } else if (gen.step === "write") {
      if (!gen.raw_ai_response) {
        toast.error("Geen content gevonden in dit write-record");
        return;
      }
      let content = gen.raw_ai_response;
      let hashtags: string[] = [];
      try {
        const parsed = JSON.parse(gen.raw_ai_response);
        if (parsed.content) {
          content = parsed.content;
          hashtags = parsed.hashtags || [];
        }
      } catch { /* plain text */ }

      const variantId = crypto.randomUUID();
      const newVariant: Variant = {
        id: variantId,
        briefing: (gen.briefing_snapshot as any) || approvedBriefing || { archetype: "", selected_hook: "", teaser_questions: [], trigger_word: "", emotional_angle: "", target_audience_insight: "" },
        content,
        hashtags,
        editedContent: content,
        debug: {
          systemPrompt: gen.prompts_snapshot?.system_prompt || undefined,
          userPrompt: gen.prompts_snapshot?.user_prompt || undefined,
          model: gen.model_used || undefined,
          rawResponse: gen.raw_ai_response || undefined,
          polishResult: gen.polish_result || undefined,
        },
        duration: gen.duration_ms || null,
        savedPostId: gen.social_post_id || null,
        savingDraft: false,
        photoId: null,
        photoUrl: null,
      };

      setVariants(prev => [...prev, newVariant]);
      setActiveVariantId(variantId);
      setStep("write");
      toast.success("Write-resultaat geladen als nieuwe variant");
    }
  };

  const handleSaveDraft = async (variantId: string) => {
    const variant = variants.find(v => v.id === variantId);
    if (!variant || !selectedPost || variant.savedPostId) return;
    
    setVariants(prev => prev.map(v => v.id === variantId ? { ...v, savingDraft: true } : v));
    try {
      const { data, error } = await supabase
        .from("social_posts")
        .insert({
          platform: "linkedin",
          content: variant.editedContent,
          hashtags: variant.hashtags,
          status: "draft",
          blog_post_id: selectedPost.id,
          photo_id: variant.photoId,
        })
        .select("id")
        .single();
      if (error) throw error;
      setVariants(prev => prev.map(v => v.id === variantId ? { ...v, savedPostId: data.id, savingDraft: false } : v));
      queryClient.invalidateQueries({ queryKey: ["social-post-generations", selectedPostId] });
      queryClient.invalidateQueries({ queryKey: ["linkedin-drafts"] });
      toast.success("Post opgeslagen als concept");
    } catch (e: any) {
      toast.error("Opslaan mislukt: " + e.message);
      setVariants(prev => prev.map(v => v.id === variantId ? { ...v, savingDraft: false } : v));
    }
  };

  const handleBrainstorm = async () => {
    if (!selectedPost) return;
    setBrainstormLoading(true);
    const start = performance.now();

    try {
      const { data, error } = await supabase.functions.invoke("generate-linkedin-post", {
        body: {
          step: "brainstorm",
          blog_post_id: selectedPost.id,
          title: selectedPost.title,
          intro: selectedPost.intro,
          summary: selectedPost.summary,
          keywords: selectedPost.meta_keywords,
          slug: selectedPost.slug,
          debug: true,
        },
      });

      setBrainstormDuration(Math.round(performance.now() - start));

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setBriefingResult(data.briefing);
      setBrainstormDebug(data._debug || null);
      brainstormGenIdRef.current = data._debug?.generationId || null;
      setStep("briefing");
      queryClient.invalidateQueries({ queryKey: ["social-post-generations", selectedPostId] });
    } catch (e: any) {
      toast.error("Brainstorm mislukt: " + e.message);
    } finally {
      setBrainstormLoading(false);
    }
  };

  const handleApprove = async (approved: ApprovedBriefing) => {
    setApprovedBriefing(approved);
    
    if (selectedPostId) {
      const { data: inserted } = await supabase.from("social_post_generations").insert({
        blog_post_id: selectedPostId,
        step: "briefing_approved",
        briefing_snapshot: approved as any,
        social_post_id: null,
      }).select("id").single();
      briefingGenIdRef.current = inserted?.id || null;
      queryClient.invalidateQueries({ queryKey: ["social-post-generations", selectedPostId] });
    }
    
    handleWrite(approved);
  };

  const handleWrite = async (approved: ApprovedBriefing) => {
    if (!selectedPost) return;
    setWriteLoading(true);
    setStep("write");
    const variantId = crypto.randomUUID();
    setActiveVariantId(variantId);
    const start = performance.now();

    try {
      const { data, error } = await supabase.functions.invoke("generate-linkedin-post", {
        body: {
          step: "write",
          blog_post_id: selectedPost.id,
          title: selectedPost.title,
          briefing: approved,
          debug: true,
          dry_run: true,
        },
      });

      const duration = Math.round(performance.now() - start);

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      let savedId: string | null = null;
      try {
        const { data: savedPost, error: saveError } = await supabase
          .from("social_posts")
          .insert({
            platform: "linkedin",
            content: data.content,
            hashtags: data.hashtags,
            status: "draft",
            blog_post_id: selectedPost.id,
          })
          .select("id")
          .single();
        if (!saveError && savedPost) {
          savedId = savedPost.id;
          queryClient.invalidateQueries({ queryKey: ["linkedin-drafts"] });
        }
      } catch (e) {
        console.error("Auto-save draft failed:", e);
      }

      if (savedId && data._debug?.generationId) {
        await supabase
          .from("social_post_generations")
          .update({ social_post_id: savedId })
          .eq("id", data._debug.generationId);
      }

      const idsToLink = [brainstormGenIdRef.current, briefingGenIdRef.current].filter(Boolean) as string[];
      if (savedId && idsToLink.length > 0) {
        await supabase
          .from("social_post_generations")
          .update({ social_post_id: savedId })
          .in("id", idsToLink);
      }

      const newVariant: Variant = {
        id: variantId,
        briefing: approved,
        content: data.content,
        hashtags: data.hashtags,
        editedContent: data.content,
        debug: data._debug || null,
        duration,
        savedPostId: savedId,
        savingDraft: false,
        photoId: null,
        photoUrl: null,
      };

      setVariants(prev => [...prev, newVariant]);
      queryClient.invalidateQueries({ queryKey: ["social-post-generations", selectedPostId] });
    } catch (e: any) {
      toast.error("Write mislukt: " + e.message);
    } finally {
      setWriteLoading(false);
    }
  };

  const handleNewVariant = () => {
    setStep("briefing");
  };

  const handleCompare = async (approved: ApprovedBriefing) => {
    if (!selectedPost) return;
    setIsComparing(true);
    const archetypes = ["engagement", "authority", "educational"];
    
    const initial: CompareResult[] = archetypes.map(a => ({
      archetype: a,
      content: "",
      hashtags: [],
      debug: null,
      duration: null,
      status: "loading" as const,
    }));
    setCompareResults(initial);

    // Hook-type → archetype mapping for optimal comparison
    const hookMapping: Record<string, string> = {
      engagement: "situatie",
      authority: "stelling",
      educational: "vraag",
    };

    const promises = archetypes.map(async (archetype) => {
      const start = performance.now();
      
      // Select the best-matching hook for this archetype
      const preferredHookType = hookMapping[archetype];
      const matchedHook = briefingResult?.hook_options?.find(h => h.type === preferredHookType);
      const selectedHookForArchetype = matchedHook?.text || approved.selected_hook;

      try {
        const { data, error } = await supabase.functions.invoke("generate-linkedin-post", {
          body: {
            step: "write",
            blog_post_id: selectedPost.id,
            title: selectedPost.title,
            briefing: { ...approved, archetype, selected_hook: selectedHookForArchetype },
            debug: true,
            dry_run: true,
          },
        });
        const duration = Math.round(performance.now() - start);
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        
        setCompareResults(prev => prev?.map(r =>
          r.archetype === archetype
            ? { ...r, content: data.content, hashtags: data.hashtags || [], debug: data._debug, duration, status: "done" as const, usedHook: selectedHookForArchetype }
            : r
        ) || null);
      } catch (e: any) {
        setCompareResults(prev => prev?.map(r =>
          r.archetype === archetype
            ? { ...r, status: "error" as const, error: e.message, duration: Math.round(performance.now() - start) }
            : r
        ) || null);
      }
    });

    await Promise.allSettled(promises);
    setIsComparing(false);

    // Persist compare results to database
    try {
      const finalResults = compareResults || [];
      // We need to read the latest state after all promises settled
      setCompareResults(prev => {
        if (!prev) return prev;
        const successResults = prev.filter(r => r.status === "done");
        if (successResults.length > 0 && selectedPostId) {
          const records = successResults.map(r => ({
            blog_post_id: selectedPostId,
            step: "compare",
            briefing_snapshot: { ...approved, archetype: r.archetype } as any,
            raw_ai_response: r.content,
            enrichment_data: { archetype: r.archetype, hashtags: r.hashtags, duration: r.duration, usedHook: r.usedHook } as any,
            duration_ms: r.duration,
            social_post_id: null,
          }));
          supabase.from("social_post_generations").insert(records).then(() => {
            queryClient.invalidateQueries({ queryKey: ["social-post-generations", selectedPostId] });
          });
        }
        return prev;
      });
    } catch (e) {
      console.error("Failed to persist compare results:", e);
    }
  };

  const handleSelectCompareResult = (result: CompareResult) => {
    const variantId = crypto.randomUUID();
    const newVariant: Variant = {
      id: variantId,
      briefing: { ...approvedBriefing!, archetype: result.archetype },
      content: result.content,
      hashtags: result.hashtags,
      editedContent: result.content,
      debug: result.debug,
      duration: result.duration,
      savedPostId: result.savedPostId || null,
      savingDraft: false,
      photoId: null,
      photoUrl: null,
    };
    setVariants(prev => [...prev, newVariant]);
    setActiveVariantId(variantId);
    setCompareResults(null);
    setStep("write");
  };

  const handleEditCompareResult = (archetype: string, content: string) => {
    setCompareResults(prev => prev?.map(r =>
      r.archetype === archetype ? { ...r, content } : r
    ) || null);
  };

  const handleSaveCompareDraft = async (result: CompareResult) => {
    if (!selectedPost || result.savedPostId) return;
    const { data, error } = await supabase
      .from("social_posts")
      .insert({
        platform: "linkedin",
        content: result.content,
        hashtags: result.hashtags,
        status: "draft",
        blog_post_id: selectedPost.id,
      })
      .select("id")
      .single();
    if (error) throw error;
    setCompareResults(prev => prev?.map(r =>
      r.archetype === result.archetype ? { ...r, savedPostId: data.id } : r
    ) || null);
    queryClient.invalidateQueries({ queryKey: ["linkedin-drafts"] });
    queryClient.invalidateQueries({ queryKey: ["linkedin-post-counts-per-blog"] });
    toast.success(`${result.archetype} opgeslagen als concept`);
  };

  const handleSaveAllCompare = async () => {
    if (!compareResults) return;
    setSavingAllCompare(true);
    try {
      const toSave = compareResults.filter(r => r.status === "done" && !r.savedPostId);
      for (const result of toSave) {
        await handleSaveCompareDraft(result);
      }
      toast.success(`${toSave.length} posts opgeslagen als concept`);
    } catch (e: any) {
      toast.error("Opslaan mislukt: " + e.message);
    } finally {
      setSavingAllCompare(false);
    }
  };

  const handleRewrite = (variantId: string) => {
    const variant = variants.find(v => v.id === variantId);
    if (variant && briefingResult) {
      handleWrite(variant.briefing);
    }
  };

  const updateVariantContent = (variantId: string, newContent: string) => {
    setVariants(prev => prev.map(v => v.id === variantId ? { ...v, editedContent: newContent } : v));
  };

  const updateVariantHashtags = (variantId: string, newHashtags: string[]) => {
    setVariants(prev => prev.map(v => v.id === variantId ? { ...v, hashtags: newHashtags } : v));
  };

  const updateVariantPhoto = (variantId: string, photo: LinkedInPhoto | null) => {
    setVariants(prev => prev.map(v => v.id === variantId ? { ...v, photoId: photo?.id || null, photoUrl: photo?.image_url || null } : v));
    
    const variant = variants.find(v => v.id === variantId);
    
    if (variant?.savedPostId) {
      supabase.from("social_posts")
        .update({ photo_id: photo?.id || null, updated_at: new Date().toISOString() })
        .eq("id", variant.savedPostId)
        .then(({ error }) => {
          if (error) console.error("Immediate photo save failed:", error);
          else queryClient.invalidateQueries({ queryKey: ["linkedin-drafts"] });
        });
    }
    
    if (variant?.savedPostId && selectedPostId) {
      (async () => {
        await supabase.from("social_post_generations")
          .delete()
          .eq("social_post_id", variant.savedPostId!)
          .eq("step", "photo_selected");
        
        await supabase.from("social_post_generations").insert({
          blog_post_id: selectedPostId,
          social_post_id: variant.savedPostId,
          step: "photo_selected",
          enrichment_data: photo ? { photo_id: photo.id, photo_url: photo.image_url } : { photo_id: null },
        });
        
        queryClient.invalidateQueries({ queryKey: ["social-post-generations", selectedPostId] });
      })();
    }
  };

  const steps: { key: Step; label: string; icon: React.ReactNode }[] = [
    { key: "select", label: "Artikel", icon: <span>1</span> },
    { key: "brainstorm", label: "Brainstorm", icon: <span>2</span> },
    { key: "briefing", label: "Briefing", icon: <span>3</span> },
    { key: "write", label: "Write", icon: <span>4</span> },
    { key: "photo", label: "Foto", icon: <Image className="h-3.5 w-3.5" /> },
    { key: "preview", label: "Preview", icon: <Eye className="h-3.5 w-3.5" /> },
    { key: "schedule", label: "Inplannen", icon: <CalendarIcon className="h-3.5 w-3.5" /> },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === step);
  const activeVariant = variants.find(v => v.id === activeVariantId);
  const showSidebar = step !== "select";

  // ─── SIDEBAR CONTENT ───
  const renderSidebar = () => (
    <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
      {/* Article info */}
      {selectedPost && (
        <div className="rounded-lg border bg-card p-3 space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Artikel</span>
          <p className="text-sm font-medium leading-tight">{selectedPost.title}</p>
          <p className="text-[10px] text-muted-foreground">/{selectedPost.slug}</p>
          {selectedPost.meta_keywords && selectedPost.meta_keywords.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {selectedPost.meta_keywords.slice(0, 5).map((kw, i) => (
                <Badge key={i} variant="outline" className="text-[10px]">{kw}</Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Briefing summary (after approval, not on briefing step) */}
      {approvedBriefing && step !== "briefing" && (
        <LinkedInBriefingSummary
          briefing={approvedBriefing}
          onEdit={() => setStep("briefing")}
        />
      )}

      {/* Duplicate warning */}
      {existingLinkedInPosts && existingLinkedInPosts.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700 p-3 text-xs">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-300">Al {existingLinkedInPosts.length} LinkedIn {existingLinkedInPosts.length === 1 ? 'post' : 'posts'}</p>
            <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5">
              {existingLinkedInPosts.map(p => p.status).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Drafts */}
      {linkedinDrafts && linkedinDrafts.length > 0 && (
        <Collapsible defaultOpen={step === "select"}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 text-left hover:bg-muted/50 transition-colors rounded-lg border bg-card">
            <span className="text-xs font-medium flex items-center gap-1.5">
              📋 Concepten ({linkedinDrafts.length})
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-1 mt-1 max-h-48 overflow-y-auto">
              {linkedinDrafts.map((draft) => (
                <button
                  key={draft.id}
                  onClick={() => loadDraft(draft)}
                  className="flex items-center gap-2 w-full text-left text-[11px] border rounded-md p-2 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{draft.blogTitle || "Leeg concept"}</p>
                    <p className="text-muted-foreground text-[10px]">
                      {formatDistanceToNow(new Date(draft.updatedAt), { addSuffix: true, locale: nl })}
                    </p>
                  </div>
                  {draft.scheduledFor ? (
                    <Badge variant="outline" className="text-[9px] border-green-500 text-green-600 bg-green-50 shrink-0">
                      Ingepland
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[9px] border-amber-500 text-amber-600 bg-amber-50 shrink-0">
                      Concept
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* History */}
      {generationHistory && generationHistory.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 text-left hover:bg-muted/50 transition-colors rounded-lg border bg-card">
            <span className="text-xs font-medium flex items-center gap-1.5">
              <History className="h-3.5 w-3.5" />
              Historie ({generationHistory.length})
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-1 mt-1 max-h-48 overflow-y-auto">
              {generationHistory.map((gen: any) => {
                const briefing = gen.briefing_snapshot || {};
                const isLoadable = ["brainstorm", "briefing_approved", "write"].includes(gen.step);
                return (
                  <div key={gen.id} className="flex items-center gap-2 text-[11px] border rounded-md p-2 hover:bg-muted/50">
                    <Badge variant={gen.step === "brainstorm" ? "secondary" : "default"} className="text-[9px] shrink-0">
                      {gen.step}
                    </Badge>
                    <span className="text-muted-foreground truncate flex-1">
                      {formatDistanceToNow(new Date(gen.created_at), { addSuffix: true, locale: nl })}
                    </span>
                    {isLoadable && (
                      <Button variant="outline" size="sm" className="h-5 px-1.5 text-[9px] shrink-0" onClick={() => loadFromHistory(gen)}>
                        <RotateCcw className="h-2.5 w-2.5 mr-0.5" />
                        Laad
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Debug */}
      {showDebug && (
        <Collapsible>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 text-left hover:bg-muted/50 transition-colors rounded-lg border bg-card">
            <span className="text-xs font-medium">🔍 Debug Data</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-1 space-y-2">
              {brainstormDebug && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-[10px]">
                    {brainstormDuration && <Badge variant="outline" className="text-[9px]"><Clock className="h-2.5 w-2.5 mr-0.5" />{brainstormDuration}ms</Badge>}
                    {brainstormDebug.model && <Badge variant="secondary" className="text-[9px]">{brainstormDebug.model}</Badge>}
                  </div>
                  <Accordion type="multiple" className="space-y-1">
                    {brainstormDebug.enrichment && (
                      <AccordionItem value="enrichment" className="border rounded-md px-2">
                        <AccordionTrigger className="text-[10px] py-1.5">Enrichment</AccordionTrigger>
                        <AccordionContent><CopyBlock label="Enrichment" content={JSON.stringify(brainstormDebug.enrichment, null, 2)} /></AccordionContent>
                      </AccordionItem>
                    )}
                    {brainstormDebug.systemPrompt && (
                      <AccordionItem value="system" className="border rounded-md px-2">
                        <AccordionTrigger className="text-[10px] py-1.5">System Prompt</AccordionTrigger>
                        <AccordionContent><CopyBlock label="System" content={brainstormDebug.systemPrompt} /></AccordionContent>
                      </AccordionItem>
                    )}
                    {brainstormDebug.userPrompt && (
                      <AccordionItem value="user" className="border rounded-md px-2">
                        <AccordionTrigger className="text-[10px] py-1.5">User Prompt</AccordionTrigger>
                        <AccordionContent><CopyBlock label="User" content={brainstormDebug.userPrompt} /></AccordionContent>
                      </AccordionItem>
                    )}
                    {brainstormDebug.rawResponse && (
                      <AccordionItem value="raw" className="border rounded-md px-2">
                        <AccordionTrigger className="text-[10px] py-1.5">Raw Response</AccordionTrigger>
                        <AccordionContent><CopyBlock label="Raw" content={JSON.stringify(JSON.parse(brainstormDebug.rawResponse), null, 2)} /></AccordionContent>
                      </AccordionItem>
                    )}
                  </Accordion>
                </div>
              )}
              {briefingResult && (
                <div className="space-y-1">
                  <span className="text-[10px] font-medium text-muted-foreground">Live Briefing</span>
                  <pre className="whitespace-pre-wrap text-[10px] bg-muted/50 rounded p-2 max-h-40 overflow-y-auto border">{JSON.stringify(briefingResult, null, 2)}</pre>
                </div>
              )}
              {approvedBriefing && (
                <div className="space-y-1">
                  <span className="text-[10px] font-medium text-muted-foreground">Approved Briefing</span>
                  <pre className="whitespace-pre-wrap text-[10px] bg-primary/5 rounded p-2 max-h-40 overflow-y-auto border border-primary/20">{JSON.stringify(approvedBriefing, null, 2)}</pre>
                </div>
              )}
              {activeVariant?.debug && (
                <Accordion type="multiple" className="space-y-1">
                  {activeVariant.debug.systemPrompt && (
                    <AccordionItem value="wsystem" className="border rounded-md px-2">
                      <AccordionTrigger className="text-[10px] py-1.5">System (Write)</AccordionTrigger>
                      <AccordionContent><CopyBlock label="System" content={activeVariant.debug.systemPrompt} /></AccordionContent>
                    </AccordionItem>
                  )}
                  {activeVariant.debug.userPrompt && (
                    <AccordionItem value="wuser" className="border rounded-md px-2">
                      <AccordionTrigger className="text-[10px] py-1.5">User (Write)</AccordionTrigger>
                      <AccordionContent><CopyBlock label="User" content={activeVariant.debug.userPrompt} /></AccordionContent>
                    </AccordionItem>
                  )}
                  {activeVariant.debug.rawResponse && (
                    <AccordionItem value="wraw" className="border rounded-md px-2">
                      <AccordionTrigger className="text-[10px] py-1.5">Raw (Write)</AccordionTrigger>
                      <AccordionContent><CopyBlock label="Raw" content={JSON.stringify(JSON.parse(activeVariant.debug.rawResponse), null, 2)} /></AccordionContent>
                    </AccordionItem>
                  )}
                  {activeVariant.debug.polishResult && (
                    <AccordionItem value="wpolish" className="border rounded-md px-2">
                      <AccordionTrigger className="text-[10px] py-1.5">Polish</AccordionTrigger>
                      <AccordionContent>
                        <CopyBlock label="Vóór" content={activeVariant.debug.polishResult.raw || ""} />
                        <CopyBlock label="Na" content={activeVariant.debug.polishResult.polished || ""} />
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </aside>
  );

  const handleGoBack = () => {
    const stepOrder: Step[] = ["select", "brainstorm", "briefing", "write", "photo", "preview", "schedule"];
    const idx = stepOrder.indexOf(step);
    if (idx <= 0) return;
    
    if (step === "brainstorm") {
      // Going back from brainstorm resets to select
      reset();
      if (selectedPostId) setSelectedPostId(selectedPostId);
      return;
    }
    
    // For other steps, just go back one step — preserving state
    setStep(stepOrder[idx - 1]);
  };

  // ─── MAIN CONTENT ───
  const renderMainContent = () => (
    <div className="space-y-6">
      {/* Back button for all steps except select */}
      {step !== "select" && step !== "schedule" && (
        <Button variant="ghost" size="sm" onClick={handleGoBack} className="text-xs -mb-2">
          <ChevronLeft className="h-3.5 w-3.5 mr-1" />
          Terug
        </Button>
      )}

      {/* Step: Briefing */}
      {step === "briefing" && briefingResult && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Briefing Review</h3>
          <LinkedInBriefingView
            briefing={briefingResult}
            onApprove={handleApprove}
            onCompare={handleCompare}
            isWriting={writeLoading}
            isComparing={isComparing}
          />
        </div>
      )}

      {/* Archetype comparison */}
      {compareResults && (
        <LinkedInArchetypeCompare
          results={compareResults}
          onSelect={handleSelectCompareResult}
          onClose={() => { setCompareResults(null); setIsComparing(false); }}
          onEdit={handleEditCompareResult}
          onSaveDraft={handleSaveCompareDraft}
          onSaveAll={handleSaveAllCompare}
          savingAll={savingAllCompare}
        />
      )}

      {/* Step: Write */}
      {step === "write" && !compareResults && (
        <div className="space-y-4">
          {writeLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
              <Sparkles className="h-4 w-4 animate-pulse" />
              Post wordt geschreven...
            </div>
          )}

          {variants.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                {variants.map((v, i) => (
                  <Button
                    key={v.id}
                    variant={activeVariantId === v.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveVariantId(v.id)}
                    className="text-xs"
                  >
                    Variant {i + 1}
                    {v.briefing.archetype && (
                      <Badge variant="secondary" className="ml-1.5 text-[10px] capitalize">{v.briefing.archetype}</Badge>
                    )}
                    {v.savedPostId && <Check className="h-3 w-3 ml-1 text-green-600" />}
                  </Button>
                ))}
                {briefingResult && !writeLoading && (
                  <Button variant="outline" size="sm" onClick={handleNewVariant} className="text-xs">
                    <Plus className="h-3 w-3 mr-1" />
                    Nieuwe variant
                  </Button>
                )}
              </div>

              {activeVariant && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-medium">Write Output</h3>
                    {activeVariant.duration && (
                      <Badge variant="outline" className="text-[10px]">
                        <Clock className="h-3 w-3 mr-1" />
                        {activeVariant.duration}ms
                      </Badge>
                    )}
                    {activeVariant.debug?.model && (
                      <Badge variant="secondary" className="text-[10px]">{activeVariant.debug.model}</Badge>
                    )}
                    {!activeVariant.savedPostId && (
                      <Badge variant="outline" className="text-[10px] text-orange-600 border-orange-300">dry_run</Badge>
                    )}
                    {activeVariant.savedPostId && (
                      <Badge variant="outline" className="text-[10px] text-green-600 border-green-300">
                        <Check className="h-3 w-3 mr-1" />Opgeslagen
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <div>
                      <SocialPostPreview
                        platform="linkedin"
                        content={activeVariant.editedContent}
                        hashtags={activeVariant.hashtags}
                      />
                      <div className="mt-3">
                        {activeVariant.photoUrl ? (
                          <button
                            onClick={() => setStep("photo")}
                            className="flex items-center gap-2 p-2 rounded-md border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-950/30 transition-colors w-full"
                          >
                            <img src={activeVariant.photoUrl} alt="Foto" className="h-12 w-12 rounded object-cover shrink-0" />
                            <div className="flex-1 text-left">
                              <p className="text-xs font-medium text-green-700 dark:text-green-400">Foto geselecteerd</p>
                              <p className="text-[10px] text-muted-foreground">Klik om te wijzigen</p>
                            </div>
                            <Pencil className="h-3 w-3 text-muted-foreground" />
                          </button>
                        ) : (
                          <button
                            onClick={() => setStep("photo")}
                            className="flex items-center gap-2 p-2 rounded-md border border-dashed border-muted-foreground/30 hover:border-muted-foreground/50 transition-colors w-full text-muted-foreground"
                          >
                            <ImageIcon className="h-4 w-4" />
                            <span className="text-xs">Geen foto — klik om toe te voegen</span>
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                          <Pencil className="h-3 w-3" />
                          Content (bewerkbaar)
                        </span>
                        {activeVariant.editedContent !== activeVariant.content && (
                          <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">Bewerkt</Badge>
                        )}
                      </div>
                      <Textarea
                        value={activeVariant.editedContent}
                        onChange={(e) => updateVariantContent(activeVariant.id, e.target.value)}
                        className="min-h-[300px] text-sm font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    {!activeVariant.savedPostId ? (
                      <Button variant="outline" onClick={() => handleSaveDraft(activeVariant.id)} disabled={activeVariant.savingDraft}>
                        <Save className="h-4 w-4 mr-2" />
                        {activeVariant.savingDraft ? "Opslaan..." : "Opslaan als concept"}
                      </Button>
                    ) : (
                      <Button variant="outline" asChild>
                        <a href="/admin/social-posts">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Bekijk in Social Posts
                        </a>
                      </Button>
                    )}
                    <Button onClick={() => setStep("photo")}>
                      <ChevronRight className="h-4 w-4 mr-2" />
                      Volgende: Foto
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleRewrite(activeVariant.id)}>
                      <RotateCcw className="h-3.5 w-3.5 mr-1" />
                      Opnieuw
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step: Photo */}
      {step === "photo" && activeVariant && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Image className="h-4 w-4" />
            Foto kiezen
          </h3>
          <LinkedInPhotoSelector
            selectedPhotoId={activeVariant.photoId}
            onSelect={(photo) => updateVariantPhoto(activeVariant.id, photo)}
          />
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setAiPhotoDialogOpen(true)}>
              <Sparkles className="h-4 w-4 mr-2" />
              AI Portretfoto
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSocialImageDialogOpen(true)}>
              <ImageIcon className="h-4 w-4 mr-2" />
              AI Post Afbeelding
            </Button>
          </div>
          {activeVariant.photoUrl && (
            <div className="rounded-lg overflow-hidden border max-w-md bg-muted/30">
              <img src={activeVariant.photoUrl} alt="Foto" className="max-h-64 w-full object-contain" />
            </div>
          )}
          <div className="flex items-center gap-3 pt-2">
            <Button variant="outline" onClick={() => setStep("write")}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Terug
            </Button>
            <Button onClick={() => setStep("preview")}>
              <ChevronRight className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { updateVariantPhoto(activeVariant.id, null); setStep("preview"); }}>
              <SkipForward className="h-3.5 w-3.5 mr-1" />
              Overslaan
            </Button>
          </div>
          <InlinePhotoGenerator
            open={aiPhotoDialogOpen}
            onOpenChange={setAiPhotoDialogOpen}
            postContent={activeVariant.editedContent}
            onGenerated={(photo) => {
              setVariants(prev => prev.map(v => v.id === activeVariant.id ? { ...v, photoId: photo.id, photoUrl: photo.url } : v));
            }}
          />
          <InlineSocialImageGenerator
            open={socialImageDialogOpen}
            onOpenChange={setSocialImageDialogOpen}
            postContent={activeVariant.editedContent}
            onGenerated={(url) => {
              setVariants(prev => prev.map(v => v.id === activeVariant.id ? { ...v, photoId: null, photoUrl: url } : v));
            }}
          />
        </div>
      )}

      {/* Step: Preview */}
      {step === "preview" && activeVariant && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Preview
          </h3>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <SocialPostPreview
              platform="linkedin"
              content={activeVariant.editedContent}
              imageUrl={activeVariant.photoUrl || undefined}
            />
            <div className="space-y-3">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Pencil className="h-3 w-3" />
                Laatste aanpassingen
              </span>
              <Textarea
                value={activeVariant.editedContent}
                onChange={(e) => updateVariantContent(activeVariant.id, e.target.value)}
                className="min-h-[200px] text-sm font-mono"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Button variant="outline" onClick={() => setStep("photo")}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Terug
            </Button>
            <Button onClick={async () => {
              setScheduleSuccess(false);
              if (activeVariant && !activeVariant.savedPostId) {
                await handleSaveDraft(activeVariant.id);
              }
              setStep("schedule");
            }}>
              <ChevronRight className="h-4 w-4 mr-2" />
              Inplannen
            </Button>
          </div>
        </div>
      )}

      {/* Step: Schedule */}
      {step === "schedule" && activeVariant && (
        <div className="space-y-4">
          {scheduleSuccess ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <h3 className="text-lg font-medium">Post succesvol ingepland!</h3>
              <p className="text-sm text-muted-foreground">De post wordt automatisch gepubliceerd via GHL.</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground bg-muted/50 rounded-lg px-4 py-2">
                <span>Platform: <strong className="text-foreground">LinkedIn{alsoPostToFacebook ? " + Facebook" : ""}</strong></span>
                {activeVariant.photoUrl && <span>📷 Met foto</span>}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={reset}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Nieuwe post
                </Button>
                <Button variant="outline" asChild>
                  <a href="/admin/social-posts">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Social Posts
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a href="/admin/social-posts?tab=stats">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Statistieken
                  </a>
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-4">
                <Button variant="outline" size="sm" onClick={() => setStep("preview")}>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Terug
                </Button>
              </div>
              {selectedPost?.slug && (
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 mb-4">
                  <Checkbox
                    id="also-facebook"
                    checked={alsoPostToFacebook}
                    onCheckedChange={(checked) => setAlsoPostToFacebook(!!checked)}
                  />
                  <label htmlFor="also-facebook" className="flex items-center gap-2 text-sm cursor-pointer">
                    <Facebook className="h-4 w-4 text-blue-600" />
                    <span>Ook op Facebook plaatsen</span>
                  </label>
                  {alsoPostToFacebook && (
                    <Badge variant="outline" className="text-[10px] ml-auto">
                      + blog-link met UTM tracking
                    </Badge>
                  )}
                </div>
              )}
              {facebookScheduling && (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 mb-4 text-sm text-blue-700 dark:text-blue-300">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Facebook-post wordt ingepland...
                </div>
              )}
              <GHLScheduler
                content={activeVariant.editedContent}
                platform="linkedin"
                contentItemId={activeVariant.savedPostId || undefined}
                existingPostId={activeVariant.savedPostId || undefined}
                blogPostId={selectedPostId || undefined}
                mediaUrls={activeVariant.photoUrl ? [activeVariant.photoUrl] : undefined}
                initialPhotoId={activeVariant.photoId}
                initialPhotoUrl={activeVariant.photoUrl}
                showPhotoSelector={false}
                onScheduled={async (status) => {
                  setVariants(prev => prev.map(v => v.id === activeVariant.id ? { ...v, savedPostId: v.savedPostId || "scheduled" } : v));
                  queryClient.invalidateQueries({ queryKey: ["linkedin-drafts"] });
                  if (alsoPostToFacebook && selectedPost?.slug) {
                    setFacebookScheduling(true);
                    try {
                      const { data: acctData } = await supabase.functions.invoke("get-ghl-social-accounts");
                      const fbAccounts = acctData?.groupedAccounts?.facebook || [];
                      if (fbAccounts.length === 0) {
                        toast.error("Geen Facebook-accounts gevonden in GHL");
                        setFacebookScheduling(false);
                        setScheduleSuccess(true);
                        return;
                      }
                      const blogLink = `https://www.topimmospain.com/blog/${selectedPost.slug}?utm_source=facebook&utm_medium=social&utm_campaign=${selectedPost.slug}`;
                      const fbContent = `${activeVariant.editedContent}\n\n👉 Lees het volledige artikel: ${blogLink}`;
                      const { data: fbResult, error: fbError } = await supabase.functions.invoke("schedule-ghl-post", {
                        body: {
                          accountIds: fbAccounts.map((a: any) => a.id),
                          content: fbContent,
                          hashtags: [],
                          mediaUrls: activeVariant.photoUrl ? [activeVariant.photoUrl] : [],
                          publishNow: status === "published",
                          platform: "facebook",
                          blogPostId: selectedPostId || undefined,
                        },
                      });
                      if (fbResult && !fbResult.success && fbResult.error) {
                        toast.error(`Facebook fout: ${fbResult.error}`);
                      } else if (fbError) {
                        toast.error(`Facebook fout: ${fbError.message}`);
                      } else {
                        toast.success("Facebook-post ook ingepland!");
                      }
                      queryClient.invalidateQueries({ queryKey: ["social-posts-all"] });
                    } catch (err: any) {
                      toast.error(`Facebook cross-post mislukt: ${err.message}`);
                    } finally {
                      setFacebookScheduling(false);
                    }
                  }
                  setScheduleSuccess(true);
                }}
              />
            </>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Progress stepper */}
      <div className="flex items-center gap-1 overflow-x-auto">
        {steps.map((s, i) => {
          const isCompleted = i < currentStepIndex;
          const isActive = i === currentStepIndex;
          const isFuture = i > currentStepIndex;
          return (
            <div key={s.key} className="flex items-center gap-1">
              <button
                onClick={() => isCompleted ? setStep(s.key) : undefined}
                disabled={isFuture}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors shrink-0",
                  isCompleted && "bg-green-500 text-white cursor-pointer hover:bg-green-600",
                  isActive && "bg-primary text-primary-foreground ring-2 ring-primary/30",
                  isFuture && "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
                )}
              >
                {isCompleted ? <CheckCircle2 className="h-3.5 w-3.5" /> : s.icon}
                <span className="hidden md:inline">{s.label}</span>
              </button>
              {i < steps.length - 1 && (
                <div className={cn("h-0.5 w-4 shrink-0 transition-colors", isCompleted ? "bg-green-500" : "bg-muted")} />
              )}
            </div>
          );
        })}
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDebug(!showDebug)}
            className={showDebug ? "text-primary" : ""}
          >
            🔍 Debug
          </Button>
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Reset
          </Button>
        </div>
      </div>

      {/* Step 0: Article selection (full width) */}
      {step === "select" && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center gap-3">
              <Select value={selectedPostId} onValueChange={(v) => { setSelectedPostId(v); reset(); setSelectedPostId(v); }}>
                <SelectTrigger className="max-w-md">
                  <SelectValue placeholder="Kies een gepubliceerd artikel..." />
                </SelectTrigger>
                <SelectContent>
                  {blogPosts?.map((post) => (
                    <SelectItem key={post.id} value={post.id}>
                      <span className="truncate">{post.title}</span>
                      <Badge variant="outline" className="ml-2 text-[10px] capitalize">{post.category}</Badge>
                      {linkedinPostCounts?.[post.id] ? (
                        <Badge variant="secondary" className="ml-1 text-[10px]">
                          {linkedinPostCounts[post.id]} post{linkedinPostCounts[post.id] > 1 ? 's' : ''}
                        </Badge>
                      ) : null}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleBrainstorm} disabled={!selectedPostId || brainstormLoading}>
                {brainstormLoading ? <Sparkles className="h-4 w-4 mr-2 animate-pulse" /> : <Sparkles className="h-4 w-4 mr-2" />}
                {brainstormLoading ? "Brainstorming..." : "Start Brainstorm"}
              </Button>
            </div>
            {selectedPost && (
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p><strong>Slug:</strong> {selectedPost.slug}</p>
                <p><strong>Keywords:</strong> {(selectedPost.meta_keywords || []).join(", ") || "—"}</p>
              </div>
            )}
            {existingLinkedInPosts && existingLinkedInPosts.length > 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700 p-3 text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-300">Dit artikel heeft al {existingLinkedInPosts.length} LinkedIn {existingLinkedInPosts.length === 1 ? 'post' : 'posts'}</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                    Status: {existingLinkedInPosts.map(p => p.status).join(', ')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar on select: just drafts */}
          <aside className="space-y-4">
            {linkedinDrafts && linkedinDrafts.length > 0 && (
              <div className="rounded-lg border bg-card p-3 space-y-2">
                <h3 className="text-xs font-medium flex items-center gap-1.5">📋 Concepten ({linkedinDrafts.length})</h3>
                <div className="space-y-1 max-h-80 overflow-y-auto">
                  {linkedinDrafts.map((draft) => (
                    <button
                      key={draft.id}
                      onClick={() => loadDraft(draft)}
                      className="flex items-center gap-2 w-full text-left text-[11px] border rounded-md p-2 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{draft.blogTitle || "Leeg concept"}</p>
                        <p className="text-muted-foreground text-[10px]">
                          {formatDistanceToNow(new Date(draft.updatedAt), { addSuffix: true, locale: nl })}
                        </p>
                      </div>
                      {draft.scheduledFor ? (
                        <Badge variant="outline" className="text-[9px] border-green-500 text-green-600 bg-green-50 shrink-0">
                          Ingepland {format(new Date(draft.scheduledFor), "d MMM", { locale: nl })}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] border-amber-500 text-amber-600 bg-amber-50 shrink-0">
                          Concept
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Two-panel layout for all other steps */}
      {showSidebar && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {renderMainContent()}
          </div>
          {renderSidebar()}
        </div>
      )}
    </div>
  );
}
