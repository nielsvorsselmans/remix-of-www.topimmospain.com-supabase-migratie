import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { FastTrackOverlay } from "./FastTrackOverlay";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Loader2, Sparkles, ChevronRight, ChevronLeft, Check, X, Plus,
  Image as ImageIcon, BookOpen, Lightbulb, Zap, MessageSquare, PenLine,
  RefreshCw, Edit3, Eye, EyeOff, FileText, AlertTriangle, Search,
} from "lucide-react";
import { SeoDataPanel } from "./briefing/SeoDataPanel";
import { CompetitiveAnalysisStep } from "./briefing/CompetitiveAnalysisStep";
import { PipelineDataInspector } from "./briefing/PipelineDataInspector";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useBlogBriefingContext } from "@/hooks/useBlogBriefingContext";
import { useValidatedInsightsForContent, type ValidatedInsight } from "@/hooks/useValidatedInsightsForContent";
import { useBlogBrainstormPrompt, useBlogWriterPrompt, useBlogImagePrompt } from "@/hooks/useBlogPipelinePrompts";
import { AVAILABLE_MODELS } from "@/hooks/useBriefingPrompt";
import { CharacterCounter } from "./CharacterCounter";

const FALLBACK_CATEGORIES = [
  "Aankoopproces",
  "Financiering",
  "Regio-informatie",
  "Veelgestelde vragen",
  "Algemeen",
];

const PORTAL_PHASES = [
  { value: "orientatie", label: "Oriëntatie" },
  { value: "selectie", label: "Selectie" },
  { value: "bezichtiging", label: "Bezichtiging" },
  { value: "aankoop", label: "Aankoop" },
  { value: "overdracht", label: "Overdracht" },
  { value: "beheer", label: "Beheer" },
];

type SourceType = 'idea' | 'insight' | 'feedback' | 'question';

interface BriefingResult {
  unique_angle: string;
  emotional_hook: string;
  target_audience: string;
  seo_strategy: {
    primary_keyword: string;
    secondary_keywords: string[];
    search_intent: string;
  };
  article_structure: {
    headline: string;
    subheadline: string;
    sections: { heading: string; purpose: string; key_points: string[] }[];
  };
  differentiation: string;
  tone_notes: string;
  underlying_questions?: string[];
  raw_brainstorm?: string;
}

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
  source_question_id?: string;
  briefing_record_id?: string;
}

interface BlogContentGeneratorProps {
  onComplete: (data: GeneratedContent) => void;
  onCancel: () => void;
  prefillInsightId?: string;
  prefillInsightLabel?: string;
  prefillQuestion?: string;
  prefillQuestionId?: string;
  prefillAnswerFragments?: string[];
  prefillInsightTheme?: string;
  prefillBuyerPhases?: string[];
  prefillSearchIntent?: string;
  prefillFrequency?: number;
  existingBriefing?: any;
  onAutoSave?: (data: { article_data?: any; image_url?: string }) => void;
  fastTrack?: boolean;
  prefillCustomInstructions?: string;
}

const THEME_TO_CATEGORY: Record<string, string> = {
  JURIDISCH: "Juridisch",
  FINANCIEEL: "Financiering",
  LOCATIE: "Regio-informatie",
  PROCES: "Aankoopproces",
  BELASTING: "Fiscaliteit",
  VERHUUR: "Rendement",
  BOUWTECHNISCH: "Aankoopproces",
  EMOTIE: "Veelgestelde vragen",
};

function getPhaseLabel(phase: string) {
  const map: Record<string, string> = {
    ORIENTATIE: "Oriëntatie",
    VERGELIJKING: "Vergelijking",
    BESLISSING: "Beslissing",
  };
  return map[phase] || phase;
}

// ─── Helpers ──────────────────────────────────────────────────────

function countWords(content: any, intro?: string): number {
  let text = intro || '';
  if (content?.sections) {
    for (const section of content.sections) {
      if (section.text) text += ' ' + section.text;
      if (section.items) text += ' ' + section.items.join(' ');
    }
  }
  return text.split(/\s+/).filter(Boolean).length;
}

function estimateReadTime(wordCount: number): number {
  return Math.max(1, Math.round(wordCount / 200));
}

export function BlogContentGenerator({ onComplete, onCancel, prefillInsightId, prefillInsightLabel, prefillQuestion, prefillQuestionId, prefillAnswerFragments, prefillInsightTheme, prefillBuyerPhases, prefillSearchIntent, prefillFrequency, existingBriefing, onAutoSave, fastTrack: fastTrackProp, prefillCustomInstructions }: BlogContentGeneratorProps) {
  // Pipeline state: 1=source, 2=brainstorm review, 3=competitive, 4=content review, 5=image, 6=finalize
  // If existingBriefing is provided with article_data, resume at step 4
  // If existingBriefing is provided without article_data, start at step 2
  const initialStep = existingBriefing
    ? (existingBriefing.article_data ? 4 : 2)
    : 1;
  const [step, setStep] = useState(initialStep);
  const [briefingRecordId, setBriefingRecordId] = useState<string | null>(existingBriefing?.id || null);
  const briefingRecordIdRef = useRef<string | null>(existingBriefing?.id || null);
  const [loading, setLoading] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [seoLoading, setSeoLoading] = useState(false);
  const [fastTrackRunning, setFastTrackRunning] = useState(false);
  const [fastTrackStep, setFastTrackStep] = useState<"brainstorm" | "write" | "image">("brainstorm");
  const [fastTrackError, setFastTrackError] = useState<string | null>(null);

  // Step 1: Source selection
  const [sourceType, setSourceType] = useState<SourceType>('idea');
  const [idea, setIdea] = useState("");
  const [category, setCategory] = useState(existingBriefing?.category || "");
  const [selectedInsight, setSelectedInsight] = useState<ValidatedInsight | null>(null);
  const [feedbackTopic, setFeedbackTopic] = useState("");
  const [customInstructions, setCustomInstructions] = useState(prefillCustomInstructions || "");
  const [dynamicCategories, setDynamicCategories] = useState<string[]>([]);

  // Step 2: Briefing — pre-load from existingBriefing if provided
  const [briefing, setBriefing] = useState<BriefingResult | null>(
    existingBriefing?.briefing_data || null
  );
  const [newKeyword, setNewKeyword] = useState("");

  // Step 3: Generated content — restore from existingBriefing if available
  const [generatedData, setGeneratedData] = useState<GeneratedContent>(
    existingBriefing?.article_data
      ? {
          title: existingBriefing.article_data.title,
          slug: existingBriefing.article_data.slug,
          intro: existingBriefing.article_data.intro,
          summary: existingBriefing.article_data.summary,
          meta_description: existingBriefing.article_data.meta_description,
          meta_keywords: existingBriefing.article_data.meta_keywords,
          seo_bullets: existingBriefing.article_data.seo_bullets,
        }
      : {}
  );
  const [editableContent, setEditableContent] = useState<any>(
    existingBriefing?.article_data?.content || null
  );
  const [editingSectionIndex, setEditingSectionIndex] = useState<number | null>(null);
  const [sectionInstruction, setSectionInstruction] = useState("");
  const [rewritingSection, setRewritingSection] = useState(false);

  // Step 3: Competitive analysis
  const [gapsApplied, setGapsApplied] = useState(false);

  // Step 5+6: Image & publish
  const [featuredImage, setFeaturedImage] = useState<string | null>(existingBriefing?.image_url || null);
  const [publishImmediately, setPublishImmediately] = useState(false);
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [addToGuide, setAddToGuide] = useState(false);
  const [selectedPillar, setSelectedPillar] = useState<string>('');
  const [selectedPortalPhases, setSelectedPortalPhases] = useState<string[]>(() => {
    if (prefillBuyerPhases?.length) {
      const phaseMap: Record<string, string> = {
        awareness: 'orientatie',
        ORIENTATIE: 'orientatie',
        consideration: 'selectie',
        VERGELIJKING: 'selectie',
        decision: 'aankoop',
        BESLISSING: 'aankoop',
      };
      return [...new Set(prefillBuyerPhases.map(p => phaseMap[p]).filter(Boolean))];
    }
    return [];
  });

  // Context hooks
  const { data: briefingContext, isLoading: contextLoading } = useBlogBriefingContext();
  const { data: insights } = useValidatedInsightsForContent();
  const { data: brainstormConfig } = useBlogBrainstormPrompt();
  const { data: writerConfig } = useBlogWriterPrompt();
  const { data: imageConfig } = useBlogImagePrompt();

  const getModelLabel = (modelId?: string) => {
    if (!modelId) return null;
    return AVAILABLE_MODELS.find(m => m.id === modelId)?.label || modelId.split('/').pop();
  };

  const totalSteps = 6;

  // Load dynamic categories
  useEffect(() => {
    const loadCategories = async () => {
      const { data } = await supabase
        .from('blog_posts')
        .select('category');
      if (data) {
        const unique = [...new Set(data.map(d => d.category).filter(Boolean))].sort();
        setDynamicCategories(unique.length > 0 ? unique : FALLBACK_CATEGORIES);
      }
    };
    loadCategories();
  }, []);

  const categories = dynamicCategories.length > 0 ? dynamicCategories : FALLBACK_CATEGORIES;

  // Prefill insight
  useEffect(() => {
    if (prefillInsightId && insights?.length) {
      const found = insights.find(i => i.id === prefillInsightId);
      if (found) {
        setSourceType('insight');
        setSelectedInsight(found);
      }
    }
  }, [prefillInsightId, insights]);

  // Prefill from content question + map category from insight theme
  useEffect(() => {
    if (prefillQuestion) {
      setSourceType('question');
      setIdea(prefillQuestion);
      if (!category) {
        const mappedCategory = prefillInsightTheme
          ? THEME_TO_CATEGORY[prefillInsightTheme] || "Veelgestelde vragen"
          : "Veelgestelde vragen";
        setCategory(mappedCategory);
      }
    }
  }, [prefillQuestion, prefillInsightTheme]);

  // Word count & quality metrics
  const wordCount = useMemo(() => countWords(editableContent, generatedData.intro), [editableContent, generatedData.intro]);
  const readTime = useMemo(() => estimateReadTime(wordCount), [wordCount]);
  const sectionCount = editableContent?.sections?.filter((s: any) => s.type === 'heading')?.length || 0;

  const qualityChecks = useMemo(() => {
    const title = generatedData.title || '';
    const intro = generatedData.intro || '';
    const metaDesc = generatedData.meta_description || '';
    const primaryKw = briefing?.seo_strategy?.primary_keyword?.toLowerCase() || '';

    return {
      wordCountOk: wordCount >= 1500 && wordCount <= 2500,
      titleLength: title.length > 0 && title.length <= 60,
      metaDescOk: metaDesc.length > 0 && metaDesc.length <= 155,
      keywordInTitle: primaryKw ? title.toLowerCase().includes(primaryKw) : false,
      keywordInIntro: primaryKw ? intro.toLowerCase().includes(primaryKw) : false,
      enoughSections: sectionCount >= 3,
      hasImage: !!featuredImage,
    };
  }, [generatedData, briefing, wordCount, sectionCount, featuredImage]);

  const qualityScore = useMemo(() => {
    const checks = Object.values(qualityChecks);
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [qualityChecks]);

  // ─── Error handler for rate limits ─────────────────────────────

  const handleApiError = (error: any) => {
    const message = error?.message || error?.toString() || '';
    if (message.includes('Rate limit') || message.includes('429')) {
      toast.error("Rate limit bereikt. Probeer het over een minuut opnieuw.");
    } else if (message.includes('tegoed') || message.includes('402')) {
      toast.error("AI-tegoed onvoldoende. Vul je credits aan.");
    } else {
      toast.error(message || "Er ging iets mis");
    }
  };

  // ─── Auto-save briefing to database ────────────────────────────

  const saveBriefingToDb = async (updates: {
    briefing_data?: any;
    raw_brainstorm?: string;
    source_type?: string;
    source_text?: string;
    category?: string;
    source_insight_id?: string | null;
    source_question_id?: string | null;
    source_context?: any;
    article_data?: any;
    image_url?: string;
    status?: string;
    seo_research?: any;
  }) => {
    try {
      const currentId = briefingRecordIdRef.current || briefingRecordId;
      if (currentId) {
        // UPDATE existing record
        await supabase
          .from('content_briefings' as any)
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', currentId);
      } else {
        // INSERT new record
        const { data: inserted, error } = await supabase
          .from('content_briefings' as any)
          .insert({
            ...updates,
            status: updates.status || 'draft',
            source_type: updates.source_type || sourceType || 'idea',
            source_text: updates.source_text || idea || prefillQuestion || '',
            category: updates.category || category || 'Algemeen',
          })
          .select('id')
          .single();
        if (error) throw error;
        if (inserted) {
          const newId = (inserted as any).id;
          briefingRecordIdRef.current = newId;
          setBriefingRecordId(newId);
        }
      }
    } catch (e) {
      console.warn("Auto-save briefing failed:", e);
    }
  };

  // ─── Step 1: Generate brainstorm ─────────────────────────────────

  const generateBrainstorm = async () => {
    if (sourceType === 'idea' && !idea.trim()) {
      toast.error("Vul een idee in");
      return;
    }
    if (!category) {
      toast.error("Selecteer een categorie");
      return;
    }

    setLoading(true);
    try {
      const body: any = {
        step: 'brainstorm',
        idea: sourceType === 'idea' ? idea : undefined,
        category,
        source_type: sourceType,
        context: briefingContext || {},
      };

      if (sourceType === 'insight' && selectedInsight) {
        body.insight_id = selectedInsight.id;
        body.idea = selectedInsight.label;
      } else if (sourceType === 'feedback') {
        body.source_data = { topic: feedbackTopic };
        body.idea = feedbackTopic;
      } else if (sourceType === 'question') {
        body.source_type = 'question';
        body.idea = prefillQuestion || idea;
        body.source_data = {
          question: prefillQuestion || idea,
          question_id: prefillQuestionId,
          answer_fragments: prefillAnswerFragments || [],
        };
      }

      if (customInstructions.trim()) {
        body.custom_instructions = customInstructions.trim();
      }

      body.briefing_id = existingBriefing?.id;
      const { data, error } = await supabase.functions.invoke('generate-blog-content', { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setBriefing(data);
      setStep(2);

      // Auto-save briefing to database
      const sourceText = sourceType === 'insight' && selectedInsight
        ? selectedInsight.label
        : sourceType === 'question'
          ? (prefillQuestion || idea)
          : sourceType === 'feedback'
            ? feedbackTopic
            : idea;

      await saveBriefingToDb({
        briefing_data: data,
        raw_brainstorm: data.raw_brainstorm || null,
        source_type: sourceType,
        source_text: sourceText,
        category,
        source_insight_id: sourceType === 'insight' ? selectedInsight?.id : null,
        source_question_id: prefillQuestionId || null,
        source_context: prefillAnswerFragments?.length
          ? { answer_fragments: prefillAnswerFragments }
          : null,
        status: 'draft',
      });

      toast.success("Strategische briefing gegenereerd!");
    } catch (error) {
      console.error("Error generating brainstorm:", error);
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  // ─── Step 2: Write article from briefing ─────────────────────────

  const writeArticle = async () => {
    if (!briefing) return;

    setLoading(true);
    try {
      // Build source_context to pass evidence to the writer
      const sourceContext: any = {};
      if (prefillAnswerFragments?.length) {
        sourceContext.answer_fragments = prefillAnswerFragments;
      }
      if (prefillQuestionId) {
        sourceContext.question_id = prefillQuestionId;
      }
      if (prefillInsightId) {
        sourceContext.insight_id = prefillInsightId;
      }

      const { data, error } = await supabase.functions.invoke('generate-blog-content', {
        body: {
          step: 'write',
          briefing,
          category,
          source_context: Object.keys(sourceContext).length > 0 ? sourceContext : undefined,
          briefing_id: existingBriefing?.id,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const articleData = {
        title: data.title,
        slug: data.slug,
        intro: data.intro,
        summary: data.summary,
        meta_description: data.meta_description,
        meta_keywords: data.meta_keywords,
        seo_bullets: data.seo_bullets,
        content: data.content,
      };

      setGeneratedData({
        title: data.title,
        slug: data.slug,
        intro: data.intro,
        summary: data.summary,
        meta_description: data.meta_description,
        meta_keywords: data.meta_keywords,
        seo_bullets: data.seo_bullets,
      });
      setEditableContent(data.content);
      setStep(4);

      // Auto-save article to briefing (both via callback and direct DB)
      onAutoSave?.({ article_data: articleData });
      await saveBriefingToDb({
        article_data: articleData,
        status: 'article_ready',
      });

      toast.success("Artikel gegenereerd!");
    } catch (error) {
      console.error("Error writing article:", error);
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  // ─── Step 3: Rewrite section ─────────────────────────────────────

  const rewriteSection = async (sectionIdx: number) => {
    if (!sectionInstruction.trim()) {
      toast.error("Geef een instructie voor herschrijving");
      return;
    }

    setRewritingSection(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-blog-content', {
        body: {
          step: 'rewrite-section',
          section_index: sectionIdx,
          section_instruction: sectionInstruction,
          full_content: editableContent,
          briefing_id: existingBriefing?.id,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const newSections = [...(editableContent?.sections || [])];
      newSections.splice(sectionIdx, 1, ...data.sections);
      setEditableContent({ ...editableContent, sections: newSections });
      setEditingSectionIndex(null);
      setSectionInstruction("");
      toast.success("Sectie herschreven!");
    } catch (error) {
      console.error("Error rewriting section:", error);
      handleApiError(error);
    } finally {
      setRewritingSection(false);
    }
  };

  // ─── Step 4: Image (direct, no temp DB record) ──────────────────

  const generateImage = async () => {
    if (!generatedData.title) return;
    setGeneratingImage(true);
    try {
      // Check which SEO checks fail — run polish in parallel with image if needed
      const primaryKw = briefing?.seo_strategy?.primary_keyword?.toLowerCase() || '';
      const needsSeoPolish = primaryKw && (
        !generatedData.meta_description || generatedData.meta_description.length === 0 || generatedData.meta_description.length > 155 ||
        !generatedData.title?.toLowerCase().includes(primaryKw) ||
        !(generatedData.intro || '').toLowerCase().includes(primaryKw)
      );

      const imagePromise = supabase.functions.invoke('generate-blog-image', {
        body: {
          title: generatedData.title,
          intro: generatedData.intro || '',
          category: category,
          emotional_hook: briefing?.emotional_hook || '',
          target_audience: briefing?.target_audience || '',
          unique_angle: briefing?.unique_angle || '',
        },
      });

      const seoPromise = needsSeoPolish
        ? supabase.functions.invoke('polish-blog-seo', {
            body: {
              title: generatedData.title,
              intro: generatedData.intro || '',
              meta_description: generatedData.meta_description || '',
              primary_keyword: briefing?.seo_strategy?.primary_keyword || '',
              category: category,
            },
          })
        : Promise.resolve({ data: { fixes: {} }, error: null });

      const [imageResult, seoResult] = await Promise.all([imagePromise, seoPromise]);

      // Process image result
      if (imageResult.error) throw imageResult.error;
      if (imageResult.data?.error) throw new Error(imageResult.data.error);

      setFeaturedImage(imageResult.data.imageUrl);

      // Process SEO polish result
      if (seoResult.data?.fixes && Object.keys(seoResult.data.fixes).length > 0) {
        const fixes = seoResult.data.fixes;
        const updatedData = { ...generatedData };
        if (fixes.title) updatedData.title = fixes.title;
        if (fixes.intro) updatedData.intro = fixes.intro;
        if (fixes.meta_description) updatedData.meta_description = fixes.meta_description;
        setGeneratedData(updatedData);

        const fixCount = Object.keys(fixes).length;
        toast.success(`Afbeelding gegenereerd + ${fixCount} SEO-fix${fixCount > 1 ? 'es' : ''} toegepast!`);
      } else {
        toast.success("Afbeelding gegenereerd!");
      }

      setStep(5);

      // Auto-save image URL + any SEO fixes to briefing
      onAutoSave?.({ image_url: imageResult.data.imageUrl });
      await saveBriefingToDb({ image_url: imageResult.data.imageUrl });

    } catch (error) {
      console.error("Error generating image:", error);
      handleApiError(error);
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleComplete = () => {
    onComplete({
      ...generatedData,
      content: editableContent,
      featured_image: featuredImage || undefined,
      category,
      published: publishImmediately,
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      add_to_guide: addToGuide,
      guide_pillar: selectedPillar || undefined,
      portal_phases: selectedPortalPhases.length > 0 ? selectedPortalPhases : undefined,
      source_insight_id: selectedInsight?.id || prefillInsightId || undefined,
      source_question_id: prefillQuestionId || undefined,
      briefing_record_id: briefingRecordIdRef.current || briefingRecordId || undefined,
    });
  };

  // ─── Fast Track: run all steps automatically ─────────────────────

  const runFastTrack = useCallback(async () => {
    setFastTrackRunning(true);
    setFastTrackError(null);

    try {
      // Step 1: Brainstorm
      setFastTrackStep("brainstorm");
      await generateBrainstorm();
    } catch (e: any) {
      setFastTrackError(e?.message || "Fout bij briefing genereren");
      return;
    }
  }, [sourceType, idea, category, selectedInsight, feedbackTopic, customInstructions, briefingContext, prefillQuestion, prefillQuestionId, prefillAnswerFragments, prefillInsightId]);

  // Continue fast track when step advances (triggered by generateBrainstorm/writeArticle setting step)
  useEffect(() => {
    if (!fastTrackRunning || fastTrackError) return;

    const continueTrack = async () => {
      try {
        if (step === 2 && fastTrackStep === "brainstorm") {
          // Brainstorm done, now write
          setFastTrackStep("write");
          await writeArticle();
        } else if (step === 4 && fastTrackStep === "write") {
          // Write done, now image
          setFastTrackStep("image");
          await generateImage();
        } else if (step === 5 && fastTrackStep === "image") {
          // All done — land on finalize (step 6)
          setStep(6);
          setFastTrackRunning(false);
          toast.success("⚡ Versneld proces voltooid! Controleer en publiceer.");
        }
      } catch (e: any) {
        setFastTrackError(e?.message || "Er ging iets mis");
      }
    };

    // Small delay to allow state to settle
    const timer = setTimeout(continueTrack, 100);
    return () => clearTimeout(timer);
  }, [step, fastTrackRunning, fastTrackStep, fastTrackError]);

  // Auto-trigger fast track on mount if prop is set
  useEffect(() => {
    if (fastTrackProp && step === 1 && !fastTrackRunning && category && (idea || prefillQuestion)) {
      runFastTrack();
    }
  }, [fastTrackProp, category, idea, prefillQuestion]);

  const cancelFastTrack = () => {
    setFastTrackRunning(false);
    setFastTrackError(null);
  };

  // ─── Inline content editing helpers ──────────────────────────────

  const updateContentSection = (index: number, field: string, value: string) => {
    const sections = [...(editableContent?.sections || [])];
    sections[index] = { ...sections[index], [field]: value };
    setEditableContent({ ...editableContent, sections });
  };

  // ─── Keyword management ──────────────────────────────────────────

  const addSecondaryKeyword = () => {
    if (!newKeyword.trim() || !briefing) return;
    setBriefing({
      ...briefing,
      seo_strategy: {
        ...briefing.seo_strategy,
        secondary_keywords: [...briefing.seo_strategy.secondary_keywords, newKeyword.trim()],
      },
    });
    setNewKeyword("");
  };

  const removeSecondaryKeyword = (index: number) => {
    if (!briefing) return;
    const kws = briefing.seo_strategy.secondary_keywords.filter((_, i) => i !== index);
    setBriefing({
      ...briefing,
      seo_strategy: { ...briefing.seo_strategy, secondary_keywords: kws },
    });
  };

  // ─── Preview renderer ───────────────────────────────────────────

  const renderPreview = () => (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <h1>{generatedData.title}</h1>
      <p className="lead text-muted-foreground italic">{generatedData.intro}</p>
      {editableContent?.sections?.map((section: any, i: number) => {
        if (section.type === 'heading') {
          const Tag = `h${section.level || 2}` as keyof JSX.IntrinsicElements;
          return <Tag key={i}>{section.text}</Tag>;
        }
        if (section.type === 'paragraph') return <p key={i}>{section.text}</p>;
        if (section.type === 'list') return (
          <ul key={i}>{section.items?.map((item: string, j: number) => <li key={j}>{item}</li>)}</ul>
        );
        return null;
      })}
    </div>
  );

  // ─── Render ──────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Fast Track Overlay */}
      {fastTrackRunning && (
        <FastTrackOverlay
          currentStep={fastTrackStep}
          error={fastTrackError}
          onCancel={cancelFastTrack}
        />
      )}
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3, 4, 5, 6].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                s === step
                  ? "bg-primary text-primary-foreground"
                  : s < step
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {s < step ? <Check className="h-4 w-4" /> : s}
            </div>
            {s < totalSteps && (
              <div className={`w-8 h-0.5 ${s < step ? "bg-primary/20" : "bg-muted"}`} />
            )}
          </div>
        ))}
      </div>

      {/* ═══ STEP 1: Source & Idea ═══ */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold">Stap 1: Startpunt kiezen</h3>
            {brainstormConfig?.model && (
              <Badge variant="secondary" className="text-xs">{getModelLabel(brainstormConfig.model)}</Badge>
            )}
            <p className="text-sm text-muted-foreground">
              Kies je bron en beschrijf het onderwerp
            </p>
          </div>

          {/* Source type tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { type: 'idea' as SourceType, icon: Lightbulb, label: 'Vrij idee' },
              { type: 'insight' as SourceType, icon: Zap, label: 'Klantinzicht' },
              { type: 'feedback' as SourceType, icon: MessageSquare, label: 'Feedback' },
              { type: 'question' as SourceType, icon: Search, label: 'Klantvraag' },
            ].map(({ type, icon: Icon, label }) => (
              <button
                key={type}
                onClick={() => setSourceType(type)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-colors text-sm ${
                  sourceType === type
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Source-specific input */}
          <div className="space-y-4">
            {sourceType === 'idea' && (
              <div className="space-y-2">
                <Label>Blogpost idee *</Label>
                <Textarea
                  placeholder="Bijv: Hoe werkt een hypotheek in Spanje voor Nederlanders?"
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  rows={3}
                />
              </div>
            )}

            {sourceType === 'insight' && (
              <div className="space-y-2">
                <Label>Selecteer een klantinzicht</Label>
                {insights?.length ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {insights.map((insight) => (
                      <button
                        key={insight.id}
                        onClick={() => setSelectedInsight(insight)}
                        className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${
                          selectedInsight?.id === insight.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{insight.label}</span>
                          {insight.theme && (
                            <Badge variant="secondary" className="text-xs">{insight.theme}</Badge>
                          )}
                          {insight.icp_score && (
                            <Badge variant="outline" className="text-xs">ICP: {insight.icp_score}/5</Badge>
                          )}
                        </div>
                        {(insight as any).raw_quote && (
                          <p className="text-xs text-muted-foreground mt-1 italic line-clamp-2">
                            "{(insight as any).raw_quote}"
                          </p>
                        )}
                        {insight.icp_persona_match?.length ? (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {insight.icp_persona_match.map((p, j) => (
                              <Badge key={j} variant="outline" className="text-xs">{p}</Badge>
                            ))}
                          </div>
                        ) : null}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Geen gevalideerde inzichten beschikbaar</p>
                )}
              </div>
            )}

            {sourceType === 'feedback' && (
              <div className="space-y-2">
                <Label>Gevraagd topic door lezers</Label>
                <Textarea
                  placeholder="Bijv: Lezers vragen vaak naar de kosten van een NIE-nummer"
                  value={feedbackTopic}
                  onChange={(e) => setFeedbackTopic(e.target.value)}
                  rows={3}
                />
                {briefingContext?.missing_topics?.length ? (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Suggesties uit feedback:</p>
                    <div className="flex flex-wrap gap-1">
                      {briefingContext.missing_topics.slice(0, 6).map((topic, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="cursor-pointer hover:bg-primary/10"
                          onClick={() => setFeedbackTopic(topic)}
                        >
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {sourceType === 'question' && (
              <div className="space-y-3">
                <div className="rounded-lg border bg-muted/50 p-3">
                  <Label className="text-xs text-muted-foreground">Klantvraag</Label>
                  <p className="text-sm font-medium mt-1">{prefillQuestion || idea}</p>
                  {/* Context metadata */}
                  {(prefillFrequency || prefillSearchIntent || prefillBuyerPhases?.length) && (
                    <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-border/50">
                      {prefillFrequency && prefillFrequency > 1 && (
                        <Badge variant="secondary" className="text-xs">
                          📊 {prefillFrequency}× gesteld
                        </Badge>
                      )}
                      {prefillSearchIntent && (
                        <Badge variant="outline" className="text-xs">
                          🔍 {prefillSearchIntent}
                        </Badge>
                      )}
                      {prefillBuyerPhases?.map((phase) => (
                        <Badge key={phase} variant="outline" className="text-xs">
                          {getPhaseLabel(phase)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                {prefillAnswerFragments && prefillAnswerFragments.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Antwoordfragmenten ({prefillAnswerFragments.length})
                    </Label>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {prefillAnswerFragments.map((frag, i) => (
                        <div key={i} className="text-xs bg-background border rounded px-2 py-1.5 italic text-muted-foreground">
                          "{frag.length > 150 ? frag.slice(0, 150) + '…' : frag}"
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Categorie *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer een categorie" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom instructions */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <PenLine className="h-3.5 w-3.5" />
                Aanvullende instructies
                <span className="text-muted-foreground font-normal">(optioneel)</span>
              </Label>
              <Textarea
                placeholder="Specifieke instructies voor de AI, bijv: focus op kosten, vermijd juridisch jargon, schrijf voor beginners, vergelijk met Nederland..."
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                rows={3}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Deze instructies worden direct verwerkt in de strategische briefing en het artikel.
              </p>
            </div>
          </div>

          {/* Context loading indicator */}
          {contextLoading && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Context laden (analytics, bestaande content)...
            </p>
          )}

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={onCancel}>Annuleren</Button>
            <Button
              onClick={generateBrainstorm}
              disabled={loading || !category || (sourceType === 'idea' && !idea.trim()) || (sourceType === 'insight' && !selectedInsight) || (sourceType === 'feedback' && !feedbackTopic.trim())}
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Brainstormen...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" />Genereer Briefing</>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ═══ STEP 2: Briefing Review ═══ */}
      {step === 2 && briefing && (
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold">Stap 2: Strategische Briefing</h3>
            {writerConfig?.model && (
              <Badge variant="secondary" className="text-xs">Schrijver: {getModelLabel(writerConfig.model)}</Badge>
            )}
            <p className="text-sm text-muted-foreground">
              Review en pas de briefing aan voordat het artikel wordt geschreven
            </p>
          </div>

          {/* Editable headline */}
          <div className="space-y-2">
            <Label>Titel</Label>
            <Input
              value={briefing.article_structure.headline}
              onChange={(e) => setBriefing({
                ...briefing,
                article_structure: { ...briefing.article_structure, headline: e.target.value },
              })}
              className="font-semibold text-lg"
            />
            <CharacterCounter current={briefing.article_structure.headline.length} max={60} />
          </div>

          <div className="space-y-2">
            <Label>Ondertitel</Label>
            <Input
              value={briefing.article_structure.subheadline}
              onChange={(e) => setBriefing({
                ...briefing,
                article_structure: { ...briefing.article_structure, subheadline: e.target.value },
              })}
            />
          </div>

          {/* Strategy cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-accent-foreground" />
                  Unieke invalshoek
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={briefing.unique_angle}
                  onChange={(e) => setBriefing({ ...briefing, unique_angle: e.target.value })}
                  rows={2}
                  className="text-sm"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Emotionele haak
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={briefing.emotional_hook}
                  onChange={(e) => setBriefing({ ...briefing, emotional_hook: e.target.value })}
                  rows={2}
                  className="text-sm"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Doelgroep</CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  value={briefing.target_audience}
                  onChange={(e) => setBriefing({ ...briefing, target_audience: e.target.value })}
                  className="text-sm"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">SEO Keyword</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Input
                  value={briefing.seo_strategy.primary_keyword}
                  onChange={(e) => setBriefing({
                    ...briefing,
                    seo_strategy: { ...briefing.seo_strategy, primary_keyword: e.target.value },
                  })}
                  className="text-sm"
                />
                <div className="flex flex-wrap gap-1">
                  {briefing.seo_strategy.secondary_keywords.map((kw, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="text-xs cursor-pointer hover:bg-destructive/20 group"
                      onClick={() => removeSecondaryKeyword(i)}
                    >
                      {kw}
                      <X className="h-2.5 w-2.5 ml-1 opacity-0 group-hover:opacity-100" />
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-1">
                  <Input
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    placeholder="Nieuw keyword..."
                    className="text-xs h-7"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSecondaryKeyword())}
                  />
                  <Button size="sm" variant="ghost" onClick={addSecondaryKeyword} className="h-7 px-2">
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* SEO Market Data from DataForSEO */}
          <SeoDataPanel
            seoResearch={
              (briefing as any).seo_research?.keyword_data
                ? {
                    keyword: (briefing as any).seo_research.keyword_data?.keyword,
                    search_volume: (briefing as any).seo_research.keyword_data?.search_volume,
                    cpc: (briefing as any).seo_research.keyword_data?.cpc,
                    competition: (briefing as any).seo_research.keyword_data?.competition,
                    competition_level: (briefing as any).seo_research.keyword_data?.competition_level,
                    related_keywords: (briefing as any).seo_research.related_keywords,
                  }
                : existingBriefing?.seo_research?.keyword_data
                ? {
                    keyword: existingBriefing.seo_research.keyword_data?.keyword,
                    search_volume: existingBriefing.seo_research.keyword_data?.search_volume,
                    cpc: existingBriefing.seo_research.keyword_data?.cpc,
                    competition: existingBriefing.seo_research.keyword_data?.competition,
                    competition_level: existingBriefing.seo_research.keyword_data?.competition_level,
                    related_keywords: existingBriefing.seo_research.related_keywords,
                  }
                : null
            }
            isLoading={seoLoading}
            onAddKeyword={(kw) => {
              if (!briefing.seo_strategy.secondary_keywords.includes(kw)) {
                setBriefing({
                  ...briefing,
                  seo_strategy: {
                    ...briefing.seo_strategy,
                    secondary_keywords: [...briefing.seo_strategy.secondary_keywords, kw],
                  },
                });
                toast.success(`"${kw}" toegevoegd als secondary keyword`);
              }
            }}
          />

          {/* Pipeline Data Inspector */}
          <PipelineDataInspector
            stepLabel="Brainstorm"
            modelId={brainstormConfig?.model}
            modelLabel={getModelLabel(brainstormConfig?.model) || undefined}
            seoResearchAvailable={!!(briefing as any).seo_research || !!existingBriefing?.seo_research}
            seoSearchVolume={(briefing as any).seo_research?.keyword_data?.search_volume ?? existingBriefing?.seo_research?.keyword_data?.search_volume}
            briefingId={existingBriefing?.id}
            rawBrainstorm={(briefing as any).raw_brainstorm || existingBriefing?.raw_brainstorm}
            inputSummary={{
              "Bron": sourceType,
              "Categorie": category,
              "Bestaande blogs": briefingContext?.existing_titles?.length ?? 0,
              "Populaire artikelen": briefingContext?.popular_articles?.length ?? 0,
              "Ontbrekende topics": briefingContext?.missing_topics?.length ?? 0,
            }}
          />

          {/* Underlying questions */}
          {briefing.underlying_questions?.length ? (
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />
                Onderliggende vragen van de doelgroep
              </Label>
              <p className="text-xs text-muted-foreground">
                Deze vragen worden beantwoord in het artikel. Bewerk, verwijder of voeg toe.
              </p>
              <div className="space-y-1.5">
                {briefing.underlying_questions.map((q, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={q}
                      onChange={(e) => {
                        const questions = [...(briefing.underlying_questions || [])];
                        questions[i] = e.target.value;
                        setBriefing({ ...briefing, underlying_questions: questions });
                      }}
                      className="text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const questions = (briefing.underlying_questions || []).filter((_, idx) => idx !== i);
                        setBriefing({ ...briefing, underlying_questions: questions });
                      }}
                    >
                      <X className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const questions = [...(briefing.underlying_questions || []), ""];
                  setBriefing({ ...briefing, underlying_questions: questions });
                }}
              >
                <Plus className="h-3 w-3 mr-1" />
                Vraag toevoegen
              </Button>
            </div>
          ) : null}

          {/* Article structure (sections) */}
          <div className="space-y-2">
            <Label>Artikel structuur</Label>
            <div className="space-y-2">
              {briefing.article_structure.sections.map((section, i) => (
                <Card key={i}>
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-2">
                        <Input
                          value={section.heading}
                          onChange={(e) => {
                            const sections = [...briefing.article_structure.sections];
                            sections[i] = { ...sections[i], heading: e.target.value };
                            setBriefing({
                              ...briefing,
                              article_structure: { ...briefing.article_structure, sections },
                            });
                          }}
                          className="font-medium text-sm"
                        />
                        <p className="text-xs text-muted-foreground">{section.purpose}</p>
                        <div className="flex flex-wrap gap-1">
                          {section.key_points.map((kp, j) => (
                            <Badge key={j} variant="outline" className="text-xs">{kp}</Badge>
                          ))}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const sections = briefing.article_structure.sections.filter((_, idx) => idx !== i);
                          setBriefing({
                            ...briefing,
                            article_structure: { ...briefing.article_structure, sections },
                          });
                        }}
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const sections = [
                  ...briefing.article_structure.sections,
                  { heading: "Nieuwe sectie", purpose: "Beschrijf het doel", key_points: ["Punt 1"] },
                ];
                setBriefing({
                  ...briefing,
                  article_structure: { ...briefing.article_structure, sections },
                });
              }}
            >
              <Plus className="h-3 w-3 mr-1" />
              Sectie toevoegen
            </Button>
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Terug
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={generateBrainstorm} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <><RefreshCw className="h-4 w-4 mr-2" />Opnieuw brainstormen</>
                )}
              </Button>
              <Button onClick={async () => {
                // Auto-save edited briefing before moving to step 3
                await saveBriefingToDb({ briefing_data: briefing });
                setStep(3);
              }}>
                Volgende: Concurrentie
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ STEP 3: Competitive Analysis ═══ */}
      {step === 3 && briefing && (
        <CompetitiveAnalysisStep
          serpResults={
            (briefing as any).seo_research?.serp_results ||
            existingBriefing?.seo_research?.serp_results ||
            []
          }
          competitiveAnalysis={
            (briefing as any).seo_research?.competitive_analysis ||
            existingBriefing?.seo_research?.competitive_analysis ||
            null
          }
          onBack={() => setStep(2)}
          onWriteArticle={writeArticle}
          onApplyGaps={() => {
            const gaps = (briefing as any).seo_research?.competitive_analysis?.content_gaps ||
              existingBriefing?.seo_research?.competitive_analysis?.content_gaps || [];
            if (gaps.length && briefing) {
              const existingKws = briefing.seo_strategy.secondary_keywords || [];
              const newKws = gaps.filter((g: string) => !existingKws.includes(g));
              setBriefing({
                ...briefing,
                seo_strategy: {
                  ...briefing.seo_strategy,
                  secondary_keywords: [...existingKws, ...newKws],
                },
              });
              setGapsApplied(true);
              // Auto-save updated briefing with applied gaps
              const updatedBriefing = {
                ...briefing,
                seo_strategy: {
                  ...briefing.seo_strategy,
                  secondary_keywords: [...existingKws, ...newKws],
                },
              };
              saveBriefingToDb({ briefing_data: updatedBriefing });
              toast.success(`${newKws.length} gaps verwerkt als secondary keywords`);
            }
          }}
          gapsApplied={gapsApplied}
          loading={loading}
        />
      )}

      {/* ═══ STEP 4: Content Review & Inline Editing ═══ */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <h3 className="text-lg font-semibold">Stap 4: Artikel bewerken</h3>
              <p className="text-sm text-muted-foreground">
                Bewerk de content inline of herschrijf secties met AI
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
              {showPreview ? "Bewerk" : "Preview"}
            </Button>
          </div>

          {/* Word count & quality bar */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              <span className={wordCount < 1500 || wordCount > 2500 ? "text-amber-500 font-medium" : "text-primary font-medium"}>
                {wordCount.toLocaleString("nl-NL")} woorden
              </span>
              <span>({readTime} min leestijd)</span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <span>{sectionCount} secties</span>
            <Separator orientation="vertical" className="h-4" />
            <span>Kwaliteit: {qualityScore}%</span>
          </div>

          {showPreview ? (
            <Card>
              <CardContent className="pt-6">
                {renderPreview()}
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Editable title */}
              <div className="space-y-2">
                <Label>Titel</Label>
                <Input
                  value={generatedData.title || ''}
                  onChange={(e) => setGeneratedData(prev => ({
                    ...prev,
                    title: e.target.value,
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').substring(0, 80),
                  }))}
                  className="font-semibold"
                />
                <CharacterCounter current={(generatedData.title || '').length} max={60} />
              </div>

              {/* Editable intro */}
              <div className="space-y-2">
                <Label>Intro</Label>
                <Textarea
                  value={generatedData.intro || ''}
                  onChange={(e) => setGeneratedData(prev => ({ ...prev, intro: e.target.value }))}
                  rows={2}
                />
              </div>

              {/* Editable summary */}
              <div className="space-y-2">
                <Label>Samenvatting</Label>
                <Textarea
                  value={generatedData.summary || ''}
                  onChange={(e) => setGeneratedData(prev => ({ ...prev, summary: e.target.value }))}
                  rows={2}
                  placeholder="Korte samenvatting van het artikel..."
                />
                <p className="text-xs text-muted-foreground">Wordt getoond in overzichten en social shares</p>
              </div>

              {/* Content sections with inline editing */}
              <div className="space-y-2">
                <Label>Content secties</Label>
                {editableContent?.sections?.map((section: any, index: number) => (
                  <Card key={index} className="group relative">
                    <CardContent className="pt-3 pb-3">
                      {section.type === 'heading' && (
                        <Input
                          value={section.text}
                          onChange={(e) => updateContentSection(index, 'text', e.target.value)}
                          className="font-semibold text-base border-0 p-0 h-auto focus-visible:ring-0"
                        />
                      )}
                      {section.type === 'paragraph' && (
                        <Textarea
                          value={section.text}
                          onChange={(e) => updateContentSection(index, 'text', e.target.value)}
                          className="border-0 p-0 resize-none focus-visible:ring-0 text-sm"
                          rows={Math.max(2, Math.ceil((section.text?.length || 0) / 80))}
                        />
                      )}
                      {section.type === 'list' && (
                        <div className="space-y-1">
                          {section.items?.map((item: string, i: number) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="text-muted-foreground text-sm">•</span>
                              <Input
                                value={item}
                                onChange={(e) => {
                                  const sections = [...(editableContent.sections || [])];
                                  const items = [...(sections[index].items || [])];
                                  items[i] = e.target.value;
                                  sections[index] = { ...sections[index], items };
                                  setEditableContent({ ...editableContent, sections });
                                }}
                                className="border-0 p-0 h-auto text-sm focus-visible:ring-0"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* AI rewrite button */}
                      <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {editingSectionIndex === index ? (
                          <div className="flex items-center gap-2 w-full">
                            <Input
                              value={sectionInstruction}
                              onChange={(e) => setSectionInstruction(e.target.value)}
                              placeholder="Bijv: maak korter, voeg voorbeeld toe..."
                              className="text-xs h-7"
                              onKeyDown={(e) => e.key === 'Enter' && rewriteSection(index)}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => rewriteSection(index)}
                              disabled={rewritingSection}
                              className="h-7 px-2"
                            >
                              {rewritingSection ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => { setEditingSectionIndex(null); setSectionInstruction(""); }}
                              className="h-7 px-2"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingSectionIndex(index)}
                            className="h-6 px-2 text-xs text-muted-foreground"
                          >
                            <Edit3 className="h-3 w-3 mr-1" />
                            Herschrijf met AI
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* SEO preview */}
              {generatedData.meta_description && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">SEO Preview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Input
                      value={generatedData.meta_description || ''}
                      onChange={(e) => setGeneratedData(prev => ({ ...prev, meta_description: e.target.value }))}
                      className="text-sm"
                    />
                    <CharacterCounter current={(generatedData.meta_description || '').length} max={155} />
                    <div className="flex flex-wrap gap-1">
                      {generatedData.meta_keywords?.map((keyword, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{keyword}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Pipeline Data Inspector */}
          <PipelineDataInspector
            stepLabel="Writer"
            modelId={writerConfig?.model}
            modelLabel={getModelLabel(writerConfig?.model) || undefined}
            briefingId={existingBriefing?.id}
            inputSummary={{
              "Woorden": wordCount,
              "Secties": sectionCount,
              "Leestijd": `${readTime} min`,
              "SEO score": `${qualityScore}%`,
            }}
          />

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setStep(3)}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Terug
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={writeArticle} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <><RefreshCw className="h-4 w-4 mr-2" />Regenereer artikel</>
                )}
              </Button>
              <Button variant="outline" onClick={() => setStep(6)}>
                Overslaan
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
              <Button onClick={generateImage} disabled={generatingImage}>
                {generatingImage ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Genereren...</>
                ) : (
                  <><ImageIcon className="h-4 w-4 mr-2" />Genereer Afbeelding</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ STEP 5: Image Review ═══ */}
      {step === 5 && (
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold">Stap 5: Afbeelding</h3>
            {imageConfig?.model && (
              <Badge variant="secondary" className="text-xs">{getModelLabel(imageConfig.model)}</Badge>
            )}
            <p className="text-sm text-muted-foreground">Bekijk en eventueel regenereer de featured image</p>
          </div>
          {featuredImage && (
            <img src={featuredImage} alt="Featured" className="w-full h-48 object-cover rounded-lg" />
          )}
          <div className="flex justify-center">
            <Button variant="outline" size="sm" onClick={generateImage} disabled={generatingImage}>
              {generatingImage ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Regenereren...</>
              ) : (
                <><RefreshCw className="h-4 w-4 mr-2" />Regenereer afbeelding</>
              )}
            </Button>
          </div>
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setStep(4)}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Terug
            </Button>
            <Button onClick={() => setStep(6)}>
              Volgende
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* ═══ STEP 6: Finalize ═══ */}
      {step === 6 && (
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold">Stap 6: Finaliseren</h3>
            <p className="text-sm text-muted-foreground">
              Controleer alles en sla op
            </p>
          </div>

          {featuredImage && (
            <img src={featuredImage} alt="Featured" className="w-full h-48 object-cover rounded-lg" />
          )}

          {/* Quality checklist */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                Kwaliteitscheck
                <Badge variant={qualityScore >= 80 ? "default" : qualityScore >= 50 ? "secondary" : "destructive"} className="text-xs">
                  {qualityScore}%
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { ok: qualityChecks.wordCountOk, label: `Woordenaantal (${wordCount})`, hint: "1500-2500" },
                  { ok: qualityChecks.titleLength, label: `Titel lengte (${(generatedData.title || '').length})`, hint: "≤60" },
                  { ok: qualityChecks.metaDescOk, label: "Meta description", hint: "≤155" },
                  { ok: qualityChecks.keywordInTitle, label: "Keyword in titel", hint: "" },
                  { ok: qualityChecks.keywordInIntro, label: "Keyword in intro", hint: "" },
                  { ok: qualityChecks.enoughSections, label: `Secties (${sectionCount})`, hint: "≥3" },
                  { ok: qualityChecks.hasImage, label: "Featured image", hint: "" },
                ].map(({ ok, label, hint }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    {ok ? (
                      <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                    ) : (
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    )}
                    <span className={ok ? "text-foreground" : "text-muted-foreground"}>
                      {label} {hint && <span className="text-muted-foreground">({hint})</span>}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Full article preview toggle */}
          <Card>
            <button
              type="button"
              className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
              onClick={() => setShowPreview(!showPreview)}
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                Volledig artikel bekijken
              </div>
              {showPreview ? (
                <ChevronLeft className="h-4 w-4 text-muted-foreground rotate-90" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground rotate-90" />
              )}
            </button>
            {showPreview && (
              <CardContent className="pt-0 border-t">
                {renderPreview()}
              </CardContent>
            )}
          </Card>

          {/* Summary card */}
          <Card>
            <CardContent className="pt-4">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Titel:</dt>
                  <dd className="font-medium text-right max-w-[60%]">{generatedData.title}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Categorie:</dt>
                  <dd><Badge variant="outline">{category}</Badge></dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Woorden:</dt>
                  <dd>{wordCount} (~{readTime} min)</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Secties:</dt>
                  <dd>{sectionCount}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Afbeelding:</dt>
                  <dd>{featuredImage ? "✓" : "Geen"}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="publish-toggle">Direct publiceren</Label>
                  <p className="text-xs text-muted-foreground">Maak direct zichtbaar op de website</p>
                </div>
                <Switch id="publish-toggle" checked={publishImmediately} onCheckedChange={(checked) => { setPublishImmediately(checked); if (checked) setScheduledAt(null); }} />
              </div>

              {!publishImmediately && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Publicatie inplannen</Label>
                    <p className="text-xs text-muted-foreground">Plan een datum en tijd voor automatische publicatie</p>
                    <Input
                      type="datetime-local"
                      value={scheduledAt || ""}
                      onChange={(e) => setScheduledAt(e.target.value || null)}
                      min={new Date().toISOString().slice(0, 16)}
                    />
                    {scheduledAt && (
                      <p className="text-xs text-muted-foreground">
                        Wordt automatisch gepubliceerd op het gekozen moment.
                      </p>
                    )}
                  </div>
                </>
              )}

              <Separator />

              {/* Portal phases selector */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Portaalfases
                </Label>
                <p className="text-xs text-muted-foreground">In welke fase(s) van het klantenportaal verschijnt dit artikel?</p>
                <div className="grid grid-cols-3 gap-2">
                  {PORTAL_PHASES.map(({ value, label }) => (
                    <label
                      key={value}
                      className={`flex items-center gap-2 p-2 rounded-md border text-xs cursor-pointer transition-colors ${
                        selectedPortalPhases.includes(value) ? "border-primary bg-primary/5" : "border-border"
                      }`}
                    >
                      <Checkbox
                        checked={selectedPortalPhases.includes(value)}
                        onCheckedChange={(checked) => {
                          setSelectedPortalPhases(prev =>
                            checked ? [...prev, value] : prev.filter(p => p !== value)
                          );
                        }}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="guide-toggle" className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Toevoegen aan Oriëntatiegids
                  </Label>
                  <p className="text-xs text-muted-foreground">Voeg toe als leesmateriaal</p>
                </div>
                <Switch
                  id="guide-toggle"
                  checked={addToGuide}
                  onCheckedChange={(checked) => { setAddToGuide(checked); if (!checked) setSelectedPillar(''); }}
                />
              </div>

              {addToGuide && (
                <Select value={selectedPillar} onValueChange={setSelectedPillar}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer een pijler" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regio">Regio's ontdekken</SelectItem>
                    <SelectItem value="financiering">Financiering</SelectItem>
                    <SelectItem value="juridisch">Juridisch</SelectItem>
                    <SelectItem value="fiscaliteit">Fiscaliteit</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setStep(featuredImage ? 5 : 4)}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Terug
            </Button>
            <Button onClick={handleComplete} disabled={addToGuide && !selectedPillar}>
              <Check className="h-4 w-4 mr-2" />
              {publishImmediately ? "Publiceren" : scheduledAt ? "Inplannen" : "Opslaan als Concept"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
