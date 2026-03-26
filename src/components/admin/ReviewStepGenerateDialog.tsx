import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Star, MessageSquare, MapPin, Milestone, Info, Video, BookOpen, Check, ChevronDown, Brain, ArrowRight, RotateCcw, RefreshCw, AlertTriangle, Settings, Zap, Pencil, Eye, Heart, Target, ChevronUp, Mic, MicOff, Square } from "lucide-react";
import { useMediaRecording } from "@/hooks/useMediaRecording";
import { CustomerStorySettingsDialog } from "./CustomerStorySettingsDialog";
import { useBrainstormerConfig, useFormalizerConfig, AVAILABLE_MODELS } from "@/hooks/useCustomerStoryConfig";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviewId: string;
  saleId: string;
  currentQuote: string;
  currentRating: number;
  customerName: string;
  currentStoryPhase?: string;
  onSaved: () => void;
}

interface DossierContext {
  conversations: number;
  viewings: number;
  trips: number;
  milestones: number;
  notes: number;
  buildUpdates: number;
  hasTranscript?: boolean;
  transcriptWords?: number;
}

interface DossierDetails {
  conversations: string[];
  viewingFeedback: string[];
  tripDetails: string[];
  timeline: string[];
  crmNotes: string[];
  videoTranscriptPreview: string | null;
}

interface GeneratedData {
  quote: string;
  quote_emotional?: string;
  quote_concrete?: string;
  story_title: string;
  story_intro: string;
  story_content: string;
  story_sections: any;
  card_subtitle?: string;
}

interface InterviewQuestion {
  question: string;
  why: string;
  placeholder: string;
  category: string;
}

type PipelineState = 'idle' | 'interviewing' | 'answering' | 'brainstorming' | 'reviewing' | 'formalizing' | 'auto_generating' | 'done';
type AutoGenerateStep = 'brainstorm' | 'formalize';

export function ReviewStepGenerateDialog({ open, onOpenChange, reviewId, saleId, currentQuote, currentRating, customerName, currentStoryPhase, onSaved }: Props) {
  const isMobile = useIsMobile();
  const { data: brainstormerConfig } = useBrainstormerConfig();
  const { data: formalizerConfig } = useFormalizerConfig();
  
  const brainstormerLabel = AVAILABLE_MODELS.find(m => m.id === brainstormerConfig?.model_id)?.label || "Brainstormer";
  const formalizerLabel = AVAILABLE_MODELS.find(m => m.id === formalizerConfig?.model_id)?.label || "Formalizer";

  const [quote, setQuote] = useState(currentQuote || "");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const isOplevering = currentStoryPhase === 'aankoop';
  const [rating, setRating] = useState(currentRating || 5);
  const [context, setContext] = useState("");
  const [saving, setSaving] = useState(false);
  const [dossierContext, setDossierContext] = useState<DossierContext | null>(null);
  const [dossierDetails, setDossierDetails] = useState<DossierDetails | null>(null);
  const [loadingContext, setLoadingContext] = useState(false);
  const [generatedData, setGeneratedData] = useState<GeneratedData | null>(null);
  const [dossierOpen, setDossierOpen] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  // 2-step pipeline state
  const [pipelineState, setPipelineState] = useState<PipelineState>('idle');
  const [autoGenerateStep, setAutoGenerateStep] = useState<AutoGenerateStep>('brainstorm');
  const [originalBrainstorm, setOriginalBrainstorm] = useState("");
  const [editedBrainstorm, setEditedBrainstorm] = useState("");
  const [showOriginalBrainstorm, setShowOriginalBrainstorm] = useState(false);
  const [editingSectionIdx, setEditingSectionIdx] = useState<number | null>(null);
  const [interviewQuestions, setInterviewQuestions] = useState<InterviewQuestion[]>([]);
  const [interviewAnswers, setInterviewAnswers] = useState<Record<number, string>>({});
  const [interviewFreeText, setInterviewFreeText] = useState("");
  const [voiceMemoBase64, setVoiceMemoBase64] = useState<string | null>(null);
  const [voiceMemoMimeType, setVoiceMemoMimeType] = useState<string | null>(null);
  const [voiceMemoBlobUrl, setVoiceMemoBlobUrl] = useState<string | null>(null);
  const [selectedQuoteVariant, setSelectedQuoteVariant] = useState<'emotional' | 'concrete'>('emotional');
  const [showPreview, setShowPreview] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setQuote(currentQuote || "");
      setRating(currentRating || 5);
      setContext("");
      setGeneratedData(null);
      setDossierOpen(false);
      setPipelineState('idle');
      setOriginalBrainstorm("");
      setEditedBrainstorm("");
      setShowOriginalBrainstorm(false);
      setInterviewQuestions([]);
      setInterviewAnswers({});
      setInterviewFreeText("");
      setVoiceMemoBase64(null);
      setVoiceMemoMimeType(null);
      if (voiceMemoBlobUrl) URL.revokeObjectURL(voiceMemoBlobUrl);
      setVoiceMemoBlobUrl(null);
      setSelectedQuoteVariant('emotional');
      setShowPreview(false);
      setShowMoreOptions(false);
      setAutoGenerateStep('brainstorm');
      setEditingField(null);
      fetchDossierContext();
    }
  }, [open, currentQuote, currentRating]);

  const [contextError, setContextError] = useState<string | null>(null);

  const fetchDossierContext = async () => {
    setLoadingContext(true);
    setContextError(null);
    try {
      const [storyRes, reviewRes] = await Promise.all([
        supabase.functions.invoke("generate-customer-story", {
          body: { sale_id: saleId, context_only: true },
        }),
        supabase.from("reviews").select("video_transcript").eq("id", reviewId).maybeSingle(),
      ]);

      if (storyRes.error) {
        console.error("Dossier context error:", storyRes.error);
        setContextError("Klantdossier kon niet geladen worden");
        return;
      }
      if (storyRes.data?.error) {
        console.error("Dossier context data error:", storyRes.data.error);
        setContextError(storyRes.data.error);
        return;
      }

      const ctx = storyRes.data?.context || { conversations: 0, viewings: 0, trips: 0, milestones: 0, notes: 0 };
      ctx.notes = ctx.notes ?? 0;
      const details = storyRes.data?.dossierDetails || null;
      if (details) {
        details.crmNotes = details.crmNotes ?? [];
      }
      
      if (reviewRes.data?.video_transcript) {
        ctx.hasTranscript = true;
        ctx.transcriptWords = reviewRes.data.video_transcript.split(/\s+/).length;
      }
      setDossierContext(ctx);
      if (details) {
        setDossierDetails(details);
      }
    } catch (err) {
      console.error("Dossier context fetch failed:", err);
      setContextError("Klantdossier kon niet geladen worden");
    } finally {
      setLoadingContext(false);
    }
  };

  // Step 0: Interview - generate questions
  const handleStartInterview = async () => {
    setPipelineState('interviewing');
    try {
      const { data, error } = await supabase.functions.invoke("generate-customer-story", {
        body: { sale_id: saleId, step: 'interview', review_id: reviewId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const questions = data?.questions || [];
      setInterviewQuestions(questions);
      setInterviewAnswers({});
      setPipelineState('answering');
      toast.success(`${questions.length} vragen gegenereerd`);
    } catch (err: any) {
      console.error("Interview error:", err);
      toast.error(err?.message || "Kon interview vragen niet genereren");
      setPipelineState('idle');
    }
  };

  // Build additional context from interview answers
  const buildInterviewContext = (): string => {
    const parts = [];
    if (context.trim()) parts.push(context);
    if (interviewFreeText.trim()) {
      parts.push(`CONTEXT VAN DE MAKELAAR (vrije input met eventuele antwoorden op interviewvragen):\n${interviewFreeText}`);
    }
    return parts.join('\n\n');
  };

  // Voice memo handler — store as base64, no transcription
  const handleVoiceMemoComplete = useCallback((blob: Blob) => {
    // Convert blob to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      setVoiceMemoBase64(base64);
      setVoiceMemoMimeType(blob.type);
      // Create blob URL for playback
      if (voiceMemoBlobUrl) URL.revokeObjectURL(voiceMemoBlobUrl);
      setVoiceMemoBlobUrl(URL.createObjectURL(blob));
      toast.success("Voice memo opgeslagen ✓");
    };
    reader.readAsDataURL(blob);
  }, [voiceMemoBlobUrl]);

  const removeVoiceMemo = useCallback(() => {
    setVoiceMemoBase64(null);
    setVoiceMemoMimeType(null);
    if (voiceMemoBlobUrl) URL.revokeObjectURL(voiceMemoBlobUrl);
    setVoiceMemoBlobUrl(null);
  }, [voiceMemoBlobUrl]);

  const voiceRecording = useMediaRecording({ onRecordingComplete: handleVoiceMemoComplete });

  // Step 1: Brainstorm
  const handleBrainstorm = async () => {
    setPipelineState('brainstorming');
    const generatePhase = isOplevering ? 'oplevering' : 'aankoop';
    const enrichedContext = buildInterviewContext();
    try {
      const { data, error } = await supabase.functions.invoke("generate-customer-story", {
        body: { 
          sale_id: saleId, 
          additional_context: enrichedContext, 
          phase: generatePhase, 
          review_id: reviewId,
          step: 'brainstorm',
          voice_memo_base64: voiceMemoBase64 || undefined,
          voice_memo_mime_type: voiceMemoMimeType || undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const brainstormText = data?.brainstorm || '';
      setOriginalBrainstorm(brainstormText);
      setEditedBrainstorm(brainstormText);
      setPipelineState('reviewing');
      toast.success("Brainstorm gegenereerd — review en pas aan");
    } catch (err: any) {
      console.error("Brainstorm error:", err);
      toast.error(err?.message || "Kon brainstorm niet genereren");
      setPipelineState('idle');
    }
  };

  // Step 2: Formalize
  const handleFormalize = async () => {
    if (!editedBrainstorm.trim()) {
      toast.error("De brainstorm tekst is leeg");
      return;
    }
    setPipelineState('formalizing');
    const generatePhase = isOplevering ? 'oplevering' : 'aankoop';
    try {
      const { data, error } = await supabase.functions.invoke("generate-customer-story", {
        body: { 
          sale_id: saleId, 
          phase: generatePhase, 
          review_id: reviewId,
          step: 'formalize',
          brainstorm_text: editedBrainstorm,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.quote) setQuote(data.quote);
      
      if (data) {
        const quoteEmotional = data.quote_emotional || data.quote || "";
        const quoteConcrete = data.quote_concrete || data.quote || "";
        setGeneratedData({
          quote: quoteEmotional,
          quote_emotional: quoteEmotional,
          quote_concrete: quoteConcrete,
          story_title: data.story_title || "",
          story_intro: data.story_intro || "",
          story_content: data.story_content || "",
          story_sections: data.story_sections || null,
          card_subtitle: data.card_subtitle || "",
        });
        setSelectedQuoteVariant('emotional');
        setQuote(quoteEmotional);
        if (data.merged_sections) {
          (setGeneratedData as any)(prev => ({ ...prev, merged_sections: data.merged_sections, phase: data.phase }));
        }
      }
      setPipelineState('done');
      toast.success("Case study klaar — controleer en sla op");
    } catch (err: any) {
      console.error("Formalize error:", err);
      toast.error(err?.message || "Kon niet formaliseren");
      setPipelineState('reviewing');
    }
  };

  const handleRestartBrainstorm = () => {
    handleBrainstorm();
  };

  // One-click auto-generate with step tracking
  const handleAutoGenerate = async () => {
    setPipelineState('auto_generating');
    setAutoGenerateStep('brainstorm');
    const generatePhase = isOplevering ? 'oplevering' : 'aankoop';
    try {
      // Step 1: Brainstorm
      const { data: brainstormData, error: brainstormError } = await supabase.functions.invoke("generate-customer-story", {
        body: { sale_id: saleId, additional_context: buildInterviewContext(), phase: generatePhase, review_id: reviewId, step: 'brainstorm', voice_memo_base64: voiceMemoBase64 || undefined, voice_memo_mime_type: voiceMemoMimeType || undefined },
      });
      if (brainstormError) throw brainstormError;
      if (brainstormData?.error) throw new Error(brainstormData.error);

      const brainstormText = brainstormData?.brainstorm || '';
      setOriginalBrainstorm(brainstormText);
      setEditedBrainstorm(brainstormText);

      // Step 2: Formalize
      setAutoGenerateStep('formalize');
      const { data: formalizeData, error: formalizeError } = await supabase.functions.invoke("generate-customer-story", {
        body: { sale_id: saleId, phase: generatePhase, review_id: reviewId, step: 'formalize', brainstorm_text: brainstormText },
      });
      if (formalizeError) throw formalizeError;
      if (formalizeData?.error) throw new Error(formalizeData.error);

      if (formalizeData) {
        const quoteEmotional = formalizeData.quote_emotional || formalizeData.quote || "";
        const quoteConcrete = formalizeData.quote_concrete || formalizeData.quote || "";
        setQuote(quoteEmotional);
        setSelectedQuoteVariant('emotional');
        setGeneratedData({
          quote: quoteEmotional,
          quote_emotional: quoteEmotional,
          quote_concrete: quoteConcrete,
          story_title: formalizeData.story_title || "",
          story_intro: formalizeData.story_intro || "",
          story_content: formalizeData.story_content || "",
          story_sections: formalizeData.story_sections || null,
          card_subtitle: formalizeData.card_subtitle || "",
        });
        if (formalizeData.merged_sections) {
          setGeneratedData(prev => prev ? { ...prev, merged_sections: formalizeData.merged_sections, phase: formalizeData.phase } as any : prev);
        }
      }
      setPipelineState('done');
      toast.success("Case study gegenereerd!");
    } catch (err: any) {
      console.error("Auto-generate error:", err);
      toast.error(err?.message || "Automatisch genereren mislukt");
      setPipelineState('idle');
    }
  };

  // Inline editing helpers
  const updateSectionField = useCallback((idx: number, field: 'heading' | 'content', value: string) => {
    setGeneratedData(prev => {
      if (!prev?.story_sections?.sections) return prev;
      const updatedSections = [...prev.story_sections.sections];
      updatedSections[idx] = { ...updatedSections[idx], [field]: value };
      return { ...prev, story_sections: { ...prev.story_sections, sections: updatedSections } };
    });
  }, []);

  const updateStoryField = useCallback((field: 'story_title' | 'story_intro' | 'quote' | 'quote_emotional' | 'quote_concrete' | 'card_subtitle', value: string) => {
    setGeneratedData(prev => prev ? { ...prev, [field]: value } : prev);
    if (field === 'quote') setQuote(value);
  }, []);

  const handleSelectQuoteVariant = useCallback((variant: 'emotional' | 'concrete') => {
    setSelectedQuoteVariant(variant);
    const selectedQuote = variant === 'emotional' 
      ? generatedData?.quote_emotional || generatedData?.quote || ""
      : generatedData?.quote_concrete || generatedData?.quote || "";
    setQuote(selectedQuote);
    setGeneratedData(prev => prev ? { ...prev, quote: selectedQuote } : prev);
  }, [generatedData]);

  const handleSave = async () => {
    if (!quote.trim()) {
      toast.error("Vul een review quote in");
      return;
    }
    setSaving(true);

    if (generatedData) {
      try {
        const { data: currentReview } = await supabase
          .from("reviews")
          .select("quote, story_title, story_intro, story_content, story_sections, story_phase, story_versions")
          .eq("id", reviewId)
          .single();

        if (currentReview?.story_intro || currentReview?.story_content) {
          const existingVersions = (currentReview.story_versions as any[]) || [];
          const backup = {
            quote: currentReview.quote,
            story_title: currentReview.story_title,
            story_intro: currentReview.story_intro,
            story_content: currentReview.story_content,
            story_sections: currentReview.story_sections,
            story_phase: currentReview.story_phase,
            backed_up_at: new Date().toISOString(),
          };
          await supabase
            .from("reviews")
            .update({ story_versions: [...existingVersions, backup] } as any)
            .eq("id", reviewId);
        }
      } catch (err) {
        console.warn("Could not create backup:", err);
      }
    }

    const updatePayload: Record<string, any> = {
      quote,
      rating,
      review_status: "review",
    };

    if (generatedData) {
      updatePayload.story_title = generatedData.story_title;
      updatePayload.story_intro = generatedData.story_intro;
      updatePayload.story_content = generatedData.story_content;
      updatePayload.story_sections = (generatedData as any).merged_sections || generatedData.story_sections;
      updatePayload.has_full_story = true;
      updatePayload.brainstorm_insights = editedBrainstorm || originalBrainstorm || null;
      // Save interview data (questions + answers + free text) for future re-generation
      if (interviewQuestions.length > 0 || interviewFreeText.trim()) {
        updatePayload.interview_data = {
          questions: interviewQuestions,
          answers: interviewAnswers,
          free_text: interviewFreeText,
          recorded_at: new Date().toISOString(),
        };
      }
      if (generatedData.card_subtitle) updatePayload.card_subtitle = generatedData.card_subtitle;
      if (generatedData.quote_emotional) updatePayload.quote_emotional = generatedData.quote_emotional;
      if (generatedData.quote_concrete) updatePayload.quote_concrete = generatedData.quote_concrete;
      const slugSource = generatedData.story_title || customerName || '';
      updatePayload.story_slug = slugSource
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      const genPhase = (generatedData as any).phase;
      if (genPhase === 'oplevering') {
        updatePayload.story_phase = 'compleet';
      } else {
        updatePayload.story_phase = genPhase || 'aankoop';
      }
    }

    const { error } = await supabase
      .from("reviews")
      .update(updatePayload)
      .eq("id", reviewId);

    setSaving(false);
    if (error) {
      toast.error("Kon review niet opslaan");
      return;
    }
    toast.success(generatedData ? "Case study opgeslagen ✓" : "Review opgeslagen");
    onSaved();
    onOpenChange(false);
  };

  const totalContext = dossierContext
    ? dossierContext.conversations + dossierContext.viewings + dossierContext.trips + dossierContext.milestones + (dossierContext.notes || 0) + (dossierContext.buildUpdates || 0)
    : 0;

  const brainstormHasChanges = originalBrainstorm !== editedBrainstorm;

  // ============ RENDER CONTENT ============
  const renderContent = () => (
    <div className={`space-y-4 ${isMobile ? 'pb-6' : ''}`}>
      {/* === IDLE STATE === */}
      {(pipelineState === 'idle' || pipelineState === 'brainstorming') && (
        <>
          {/* Dossier context - compact on mobile */}
          {loadingContext ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground p-3 bg-muted/30 rounded-md">
              <Loader2 className="h-3 w-3 animate-spin" /> Context laden...
            </div>
          ) : contextError ? (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md">
              <p className="text-xs text-destructive flex items-center gap-1.5">
                <Info className="h-3 w-3" /> {contextError}
              </p>
            </div>
          ) : dossierContext ? (
            <Collapsible open={dossierOpen} onOpenChange={setDossierOpen}>
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-md">
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-center justify-between text-xs font-medium hover:text-primary transition-colors">
                    <span className="flex items-center gap-1.5">
                      <Info className="h-3 w-3 text-primary" />
                      {totalContext > 0 ? `${totalContext} dossier-items beschikbaar` : 'Geen klantdata gevonden'}
                    </span>
                    <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${dossierOpen ? 'rotate-180' : ''}`} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  {totalContext > 0 ? (
                    <>
                      <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground mt-2">
                        {dossierContext.conversations > 0 && (
                          <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {dossierContext.conversations} gesprekken</span>
                        )}
                        {dossierContext.viewings > 0 && (
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {dossierContext.viewings} bezichtigingen</span>
                        )}
                        {dossierContext.trips > 0 && (
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {dossierContext.trips} reizen</span>
                        )}
                        {dossierContext.milestones > 0 && (
                          <span className="flex items-center gap-1"><Milestone className="h-3 w-3" /> {dossierContext.milestones} milestones</span>
                        )}
                        {(dossierContext.notes || 0) > 0 && (
                          <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {dossierContext.notes} notities</span>
                        )}
                        {(dossierContext.buildUpdates || 0) > 0 && (
                          <span className="flex items-center gap-1"><Video className="h-3 w-3" /> {dossierContext.buildUpdates} bouwupdates</span>
                        )}
                        {dossierContext.hasTranscript && (
                          <span className="flex items-center gap-1"><Video className="h-3 w-3" /> Transcript ({dossierContext.transcriptWords} woorden)</span>
                        )}
                      </div>
                      {dossierDetails && <DossierDetailsView details={dossierDetails} />}
                    </>
                  ) : (
                    <p className="text-[10px] text-muted-foreground mt-2">
                      Koppel eerst een klant aan deze verkoop of voeg extra context toe.
                    </p>
                  )}
                </CollapsibleContent>
              </div>
            </Collapsible>
          ) : null}

          {/* PRIMARY ACTION: One big button */}
          <Button
            size="lg"
            className={`w-full gap-2 ${isMobile ? 'h-14 text-base' : 'h-12'}`}
            onClick={handleAutoGenerate}
            disabled={pipelineState === 'brainstorming' || loadingContext}
          >
            <Sparkles className={isMobile ? "h-5 w-5" : "h-4 w-4"} />
            Genereer Case Study
          </Button>

          {isOplevering && (
            <p className="text-[10px] text-amber-600 dark:text-amber-400">
              Aankoopverhaal bestaat al — brainstorm richt zich op aanvullende opleveringssecties.
            </p>
          )}

          {/* MORE OPTIONS toggle */}
          <Collapsible open={showMoreOptions} onOpenChange={setShowMoreOptions}>
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
                {showMoreOptions ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                Meer opties
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-3 pt-2">
                <div>
                  <Label className="text-xs">Extra context voor AI (optioneel)</Label>
                  <Textarea
                    placeholder="Bijv. klant was erg tevreden over de begeleiding..."
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    className={`min-h-[60px] ${isMobile ? 'text-base' : ''}`}
                  />
                </div>
                <div className={`flex gap-2 ${isMobile ? 'flex-col' : 'flex-row'}`}>
                  <Button
                    variant="outline"
                    className={`gap-1.5 ${isMobile ? 'h-12 text-sm' : 'flex-1'}`}
                    onClick={handleStartInterview}
                    disabled={pipelineState === 'brainstorming' || loadingContext}
                  >
                    🎤 Interview + Genereren
                  </Button>
                  <Button
                    variant="ghost"
                    className={`gap-1.5 ${isMobile ? 'h-12 text-sm' : 'flex-1'}`}
                    onClick={handleBrainstorm}
                    disabled={pipelineState === 'brainstorming'}
                  >
                    {pipelineState === 'brainstorming' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Brain className="h-3.5 w-3.5" />
                    )}
                    {pipelineState === 'brainstorming' ? 'Brainstormen...' : 'Handmatig (met review)'}
                  </Button>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Rating + Quote for idle save */}
          <Separator />
          <div>
            <Label className="text-xs">Beoordeling</Label>
            <div className="flex gap-1 mt-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRating(i + 1)}
                  className={isMobile ? "p-2" : "p-0.5"}
                >
                  <Star className={`${isMobile ? 'h-7 w-7' : 'h-5 w-5'} ${i < rating ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30'}`} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs">Review quote</Label>
            <Textarea
              placeholder="De ervaring van de klant in hun eigen woorden..."
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              className={`min-h-[80px] ${isMobile ? 'text-base' : ''}`}
            />
          </div>
          <div className={`flex gap-2 ${isMobile ? 'flex-col' : 'justify-end'}`}>
            <Button variant="outline" className={isMobile ? 'h-12' : ''} onClick={() => onOpenChange(false)}>Annuleren</Button>
            <Button className={isMobile ? 'h-12' : ''} onClick={handleSave} disabled={saving || !quote.trim()}>
              {saving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              Opslaan (zonder case study)
            </Button>
          </div>
        </>
      )}

      {/* === INTERVIEWING STATE === */}
      {pipelineState === 'interviewing' && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Interview vragen worden voorbereid...</p>
        </div>
      )}

      {/* === ANSWERING STATE === */}
      {pipelineState === 'answering' && (
        <div className="space-y-4">
          <Alert>
            <AlertDescription className="text-xs">
              Gebruik de vragen als inspiratie en deel je kennis over deze klant — typ of spreek in.
            </AlertDescription>
          </Alert>

          {/* Inspiration list - collapsible */}
          <Collapsible defaultOpen={true}>
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground transition-colors p-2 bg-muted/30 rounded-md border">
                <span className="flex items-center gap-1.5">
                  💡 Denk hierbij aan... ({interviewQuestions.length} suggesties)
                </span>
                <ChevronDown className="h-3 w-3" />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 space-y-1.5 pl-2">
                {interviewQuestions.map((q, idx) => (
                  <div key={idx} className="flex items-start gap-2 py-1.5 border-b border-border/30 last:border-0">
                    <Badge variant="outline" className="text-[9px] shrink-0 mt-0.5">{q.category}</Badge>
                    <div>
                      <p className="text-xs font-medium">{q.question}</p>
                      <p className="text-[10px] text-muted-foreground italic">{q.why}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Single free text input */}
          <div className="space-y-2">
            <Label className="text-xs">Jouw context & antwoorden</Label>
            <Textarea
              placeholder="Typ hier vrij wat je weet over deze klant, het proces, bijzondere momenten, quotes die je hebt gehoord..."
              value={interviewFreeText}
              onChange={(e) => setInterviewFreeText(e.target.value)}
              className={`${isMobile ? 'min-h-[150px] text-base' : 'min-h-[180px] text-sm'}`}
            />

            {/* Voice memo controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {!voiceRecording.isRecording && !voiceMemoBase64 && (
                <Button
                  variant="outline"
                  size="sm"
                  className={`gap-1.5 ${isMobile ? 'h-12 flex-1' : ''}`}
                  onClick={voiceRecording.startRecording}
                >
                  <Mic className="h-4 w-4" />
                  {isMobile ? 'Spreek in' : 'Voice memo'}
                </Button>
              )}
              {voiceRecording.isRecording && (
                <>
                  <div className="flex items-center gap-2 flex-1">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
                    </span>
                    <span className="text-sm font-mono text-destructive">
                      {voiceRecording.formatTime(voiceRecording.duration)}
                    </span>
                  </div>
                  {voiceRecording.isPaused ? (
                    <Button variant="outline" size="sm" className={isMobile ? 'h-12' : ''} onClick={voiceRecording.togglePause}>
                      <Mic className="h-4 w-4 mr-1" /> Hervat
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" className={isMobile ? 'h-12' : ''} onClick={voiceRecording.togglePause}>
                      <MicOff className="h-4 w-4 mr-1" /> Pauzeer
                    </Button>
                  )}
                  <Button variant="default" size="sm" className={`gap-1.5 ${isMobile ? 'h-12' : ''}`} onClick={voiceRecording.stopRecording}>
                    <Square className="h-3 w-3" /> Stop opname
                  </Button>
                </>
              )}
              {voiceMemoBase64 && voiceMemoBlobUrl && (
                <div className="flex items-center gap-2 w-full p-2 bg-muted/50 rounded-md border">
                  <audio src={voiceMemoBlobUrl} controls className="h-8 flex-1" />
                  <Button variant="ghost" size="sm" onClick={removeVoiceMemo} className="shrink-0 text-xs text-destructive hover:text-destructive">
                    Verwijder
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className={`flex gap-2 pt-2 border-t ${isMobile ? 'flex-col' : ''}`}>
            <Button
              variant="outline"
              onClick={() => setPipelineState('idle')}
              className={isMobile ? 'h-12' : 'flex-1'}
            >
              ← Terug
            </Button>
            <Button
              onClick={handleBrainstorm}
              className={isMobile ? 'h-12' : 'flex-1'}
              disabled={!interviewFreeText.trim() && !context.trim()}
            >
              <Brain className="h-4 w-4 mr-2" />
              Start Brainstorm
            </Button>
          </div>
        </div>
      )}

      {/* === REVIEWING STATE: Brainstorm editor === */}
      {pipelineState === 'reviewing' && (
        <div className="space-y-4">
          <Alert>
            <Brain className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Ruwe brainstorm — corrigeer of pas aan voordat de case study wordt gestructureerd.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">{customerName}</label>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs gap-1">
                  <Brain className="h-3 w-3" />
                  {brainstormerLabel}
                </Badge>
                {brainstormHasChanges && (
                  <Button variant="ghost" size="sm" onClick={() => setEditedBrainstorm(originalBrainstorm)} className="text-xs h-7">
                    <RotateCcw className="h-3 w-3 mr-1" /> Reset
                  </Button>
                )}
              </div>
            </div>
            
            <Textarea
              value={editedBrainstorm}
              onChange={(e) => setEditedBrainstorm(e.target.value)}
              className={`font-mono text-sm leading-relaxed ${isMobile ? 'min-h-[250px]' : 'min-h-[350px]'}`}
              placeholder="De brainstorm verschijnt hier..."
            />
            
            {brainstormHasChanges && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Wijzigingen worden meegenomen
              </p>
            )}
          </div>

          {brainstormHasChanges && (
            <div className="border-t pt-3">
              <Button variant="outline" size="sm" onClick={() => setShowOriginalBrainstorm(!showOriginalBrainstorm)} className="w-full text-xs">
                {showOriginalBrainstorm ? "Verberg origineel" : "Toon originele brainstorm"}
              </Button>
              {showOriginalBrainstorm && (
                <div className="mt-3 p-3 bg-muted/50 rounded-md">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Origineel:</p>
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap max-h-48 overflow-y-auto">{originalBrainstorm}</pre>
                </div>
              )}
            </div>
          )}

          <div className={`flex gap-2 pt-2 border-t ${isMobile ? 'flex-col-reverse' : ''}`}>
            <Button
              variant="outline"
              onClick={handleRestartBrainstorm}
              disabled={pipelineState !== 'reviewing'}
              className={isMobile ? 'h-12' : 'flex-1'}
            >
              <RefreshCw className="h-4 w-4 mr-2" /> Opnieuw
            </Button>
            <Button
              onClick={handleFormalize}
              disabled={!editedBrainstorm.trim()}
              className={isMobile ? 'h-12' : 'flex-1'}
            >
              Formaliseren <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* === FORMALIZING / AUTO_GENERATING STATE === */}
      {(pipelineState === 'formalizing' || pipelineState === 'auto_generating') && (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          
          {pipelineState === 'auto_generating' ? (
            <div className="w-full max-w-xs space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {autoGenerateStep === 'brainstorm' ? 'Stap 1/2: Brainstormen...' : 'Stap 2/2: Structureren...'}
                  </span>
                  <span className="text-muted-foreground font-medium">
                    {autoGenerateStep === 'brainstorm' ? '~30s' : '~20s'}
                  </span>
                </div>
                <Progress value={autoGenerateStep === 'brainstorm' ? 35 : 75} className="h-2" />
              </div>
              <p className="text-[10px] text-center text-muted-foreground">
                {autoGenerateStep === 'brainstorm' 
                  ? 'AI analyseert het klantdossier en brainstormt het verhaal...'
                  : 'AI structureert de case study met titel, quote en secties...'
                }
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">Case study wordt gestructureerd...</p>
              <Badge variant="secondary" className="text-xs gap-1">
                <Sparkles className="h-3 w-3" /> {formalizerLabel}
              </Badge>
            </>
          )}
        </div>
      )}

      {/* === DONE STATE: Card-based result === */}
      {pipelineState === 'done' && generatedData && (
        <div className="space-y-3">
          {/* Success header */}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs">
              <Check className="h-4 w-4 text-emerald-600" />
              <span className="font-medium text-emerald-700 dark:text-emerald-400">Case study klaar</span>
            </span>
            <Button
              variant={showPreview ? "default" : "outline"}
              size="sm"
              className={`gap-1 ${isMobile ? 'h-10 px-4' : 'h-7 text-xs'}`}
              onClick={() => setShowPreview(!showPreview)}
            >
              <Eye className="h-3.5 w-3.5" />
              {showPreview ? "Bewerken" : "Preview"}
            </Button>
          </div>

          {showPreview ? (
            /* === PREVIEW MODE === */
            <div className="p-4 bg-card border rounded-lg space-y-4">
              <h2 className="text-xl font-bold tracking-tight">{generatedData.story_title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{generatedData.story_intro}</p>
              {generatedData.story_sections?.sections?.map((section: { heading: string; content: string }, idx: number) => (
                <div key={idx}>
                  <h3 className="text-sm font-semibold mb-1">{section.heading}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{section.content}</p>
                </div>
              ))}
              <blockquote className="border-l-4 border-primary pl-4 italic text-sm text-foreground/80">
                "{generatedData.quote}"
                <span className="block text-xs text-muted-foreground mt-1 not-italic">— {customerName}</span>
              </blockquote>
            </div>
          ) : (
            /* === EDIT MODE: Card-based === */
            <div className="space-y-2">
              {/* Title card */}
              <EditableCard
                label="Titel"
                value={generatedData.story_title}
                isEditing={editingField === 'title'}
                onToggleEdit={() => setEditingField(editingField === 'title' ? null : 'title')}
                onChange={(v) => updateStoryField('story_title', v)}
                isMobile={isMobile}
              />

              {/* Quote selection card */}
              <div className="p-3 bg-card border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Quote</span>
                </div>
                {generatedData.quote_emotional && generatedData.quote_concrete && generatedData.quote_emotional !== generatedData.quote_concrete ? (
                  <div className={`grid gap-2 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    <button
                      type="button"
                      onClick={() => handleSelectQuoteVariant('emotional')}
                      className={`p-3 rounded-md border text-left text-sm leading-relaxed transition-all ${
                        selectedQuoteVariant === 'emotional'
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                          : 'border-border hover:border-primary/30'
                      }`}
                    >
                      <span className="flex items-center gap-1 text-xs font-medium mb-1.5">
                        <Heart className="h-3 w-3" /> Emotioneel
                      </span>
                      <span className="italic text-muted-foreground text-xs">"{generatedData.quote_emotional}"</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectQuoteVariant('concrete')}
                      className={`p-3 rounded-md border text-left text-sm leading-relaxed transition-all ${
                        selectedQuoteVariant === 'concrete'
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                          : 'border-border hover:border-primary/30'
                      }`}
                    >
                      <span className="flex items-center gap-1 text-xs font-medium mb-1.5">
                        <Target className="h-3 w-3" /> Concreet
                      </span>
                      <span className="italic text-muted-foreground text-xs">"{generatedData.quote_concrete}"</span>
                    </button>
                  </div>
                ) : (
                  <p className="italic text-sm text-muted-foreground">"{generatedData.quote}"</p>
                )}
                {editingField === 'quote' ? (
                  <Textarea
                    value={generatedData.quote}
                    onChange={(e) => updateStoryField('quote', e.target.value)}
                    className={`text-sm italic leading-relaxed resize-none ${isMobile ? 'text-base min-h-[80px]' : 'min-h-[40px]'}`}
                    placeholder="Bewerk quote..."
                    autoFocus
                    onBlur={() => setEditingField(null)}
                  />
                ) : (
                  <button 
                    onClick={() => setEditingField('quote')} 
                    className="text-[10px] text-primary hover:underline flex items-center gap-1"
                  >
                    <Pencil className="h-2.5 w-2.5" /> Bewerk quote
                  </button>
                )}
              </div>

              {/* Card subtitle */}
              <EditableCard
                label="Card subtitle"
                value={generatedData.card_subtitle || ''}
                isEditing={editingField === 'subtitle'}
                onToggleEdit={() => setEditingField(editingField === 'subtitle' ? null : 'subtitle')}
                onChange={(v) => updateStoryField('card_subtitle', v)}
                placeholder="Bijv. Van twijfel naar droomhuis • Costa Blanca"
                isMobile={isMobile}
              />

              {/* Sections summary */}
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <button className="w-full p-3 bg-card border rounded-lg flex items-center justify-between text-left hover:bg-accent/50 transition-colors">
                    <div>
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">Verhaal</span>
                      <span className="text-xs text-muted-foreground">
                        {generatedData.story_sections?.sections?.length || 0} secties
                      </span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="border border-t-0 rounded-b-lg p-3 space-y-3">
                    {/* Intro */}
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Intro</Label>
                      <Textarea
                        value={generatedData.story_intro}
                        onChange={(e) => updateStoryField('story_intro', e.target.value)}
                        className={`text-xs min-h-[60px] mt-0.5 leading-relaxed ${isMobile ? 'text-sm' : ''}`}
                      />
                    </div>
                    <Separator />
                    {generatedData.story_sections?.sections?.map((section: { heading: string; content: string }, idx: number) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Label className="text-[10px] text-muted-foreground shrink-0">Sectie {idx + 1}</Label>
                          <Input
                            value={section.heading}
                            onChange={(e) => updateSectionField(idx, 'heading', e.target.value)}
                            className={`text-xs font-semibold ${isMobile ? 'h-10 text-sm' : 'h-7'}`}
                          />
                        </div>
                        <Textarea
                          value={section.content}
                          onChange={(e) => updateSectionField(idx, 'content', e.target.value)}
                          className={`text-xs min-h-[80px] leading-relaxed ${isMobile ? 'text-sm' : ''}`}
                        />
                        {idx < (generatedData.story_sections?.sections?.length || 0) - 1 && <Separator className="mt-3" />}
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}

          {/* Rating */}
          <div className="pt-2">
            <Label className="text-xs">Beoordeling</Label>
            <div className="flex gap-1 mt-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <button key={i} type="button" onClick={() => setRating(i + 1)} className={isMobile ? "p-2" : "p-0.5"}>
                  <Star className={`${isMobile ? 'h-7 w-7' : 'h-5 w-5'} ${i < rating ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30'}`} />
                </button>
              ))}
            </div>
          </div>

          {!generatedData && (
            <div>
              <Label className="text-xs">Review quote</Label>
              <Textarea
                placeholder="De ervaring van de klant..."
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
                className={`min-h-[80px] ${isMobile ? 'text-base' : ''}`}
              />
            </div>
          )}

          {/* Action buttons */}
          <div className={`flex gap-2 pt-2 border-t ${isMobile ? 'flex-col-reverse' : 'justify-end'}`}>
            <Button variant="outline" className={isMobile ? 'h-12' : ''} onClick={() => setPipelineState('reviewing')}>
              ← Brainstorm
            </Button>
            <Button variant="outline" className={isMobile ? 'h-12' : ''} onClick={() => onOpenChange(false)}>Annuleren</Button>
            <Button className={isMobile ? 'h-12 text-base' : ''} onClick={handleSave} disabled={saving || !quote.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Opslaan
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  // ============ WRAPPER: Sheet on mobile, Dialog on desktop ============
  const headerContent = (
    <>
      <div className="flex items-center gap-2 text-base">
        <Sparkles className="h-4 w-4" /> Review & Case Study
        <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={() => setSettingsOpen(true)} title="AI Instellingen">
          <Settings className="h-3.5 w-3.5" />
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        {pipelineState === 'idle' && `Case study genereren voor ${customerName}`}
        {pipelineState === 'interviewing' && 'Vragen worden voorbereid...'}
        {pipelineState === 'answering' && 'Beantwoord de vragen voor een beter verhaal'}
        {pipelineState === 'brainstorming' && 'AI brainstormt het verhaal...'}
        {pipelineState === 'auto_generating' && 'Case study wordt gegenereerd...'}
        {pipelineState === 'reviewing' && 'Review de brainstorm'}
        {pipelineState === 'formalizing' && 'Verhaal wordt gestructureerd...'}
        {pipelineState === 'done' && 'Controleer en sla op'}
      </p>

      {/* Compact progress for non-idle states */}
      {pipelineState !== 'idle' && pipelineState !== 'auto_generating' && (
        <div className="flex items-center gap-1.5 text-[10px] flex-wrap pt-1">
          <Badge variant={['interviewing', 'answering'].includes(pipelineState) ? 'default' : 'secondary'} className="gap-0.5 h-5">
            🎤 Interview
            {['brainstorming', 'reviewing', 'formalizing', 'done'].includes(pipelineState) && <Check className="h-2.5 w-2.5" />}
          </Badge>
          <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
          <Badge variant={pipelineState === 'brainstorming' ? 'default' : ['reviewing', 'formalizing', 'done'].includes(pipelineState) ? 'secondary' : 'outline'} className="gap-0.5 h-5">
            <Brain className="h-2.5 w-2.5" /> Brainstorm
            {['reviewing', 'formalizing', 'done'].includes(pipelineState) && <Check className="h-2.5 w-2.5" />}
          </Badge>
          <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
          <Badge variant={pipelineState === 'formalizing' ? 'default' : pipelineState === 'done' ? 'secondary' : 'outline'} className="gap-0.5 h-5">
            <Sparkles className="h-2.5 w-2.5" /> Resultaat
            {pipelineState === 'done' && <Check className="h-2.5 w-2.5" />}
          </Badge>
        </div>
      )}
    </>
  );

  return (
    <>
      {isMobile ? (
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent side="bottom" className="h-[95vh] flex flex-col overflow-y-auto rounded-t-xl p-4">
            <SheetHeader className="text-left pb-2 border-b">
              <SheetTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4" /> Review & Case Study
                <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={() => setSettingsOpen(true)}>
                  <Settings className="h-3.5 w-3.5" />
                </Button>
              </SheetTitle>
              <SheetDescription asChild>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {pipelineState === 'idle' && `Case study genereren voor ${customerName}`}
                    {pipelineState === 'interviewing' && 'Vragen worden voorbereid...'}
                    {pipelineState === 'answering' && 'Beantwoord de vragen'}
                    {pipelineState === 'brainstorming' && 'AI brainstormt...'}
                    {pipelineState === 'auto_generating' && 'Wordt gegenereerd...'}
                    {pipelineState === 'reviewing' && 'Review de brainstorm'}
                    {pipelineState === 'formalizing' && 'Wordt gestructureerd...'}
                    {pipelineState === 'done' && 'Controleer en sla op'}
                  </p>
                  {pipelineState !== 'idle' && pipelineState !== 'auto_generating' && (
                    <div className="flex items-center gap-1.5 text-[10px] flex-wrap pt-1">
                      <Badge variant={['interviewing', 'answering'].includes(pipelineState) ? 'default' : 'secondary'} className="gap-0.5 h-5">
                        🎤
                        {['brainstorming', 'reviewing', 'formalizing', 'done'].includes(pipelineState) && <Check className="h-2.5 w-2.5" />}
                      </Badge>
                      <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                      <Badge variant={pipelineState === 'brainstorming' ? 'default' : ['reviewing', 'formalizing', 'done'].includes(pipelineState) ? 'secondary' : 'outline'} className="gap-0.5 h-5">
                        <Brain className="h-2.5 w-2.5" />
                        {['reviewing', 'formalizing', 'done'].includes(pipelineState) && <Check className="h-2.5 w-2.5" />}
                      </Badge>
                      <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                      <Badge variant={pipelineState === 'formalizing' ? 'default' : pipelineState === 'done' ? 'secondary' : 'outline'} className="gap-0.5 h-5">
                        <Sparkles className="h-2.5 w-2.5" />
                        {pipelineState === 'done' && <Check className="h-2.5 w-2.5" />}
                      </Badge>
                    </div>
                  )}
                </div>
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto pt-4">
              {renderContent()}
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className={`max-h-[90vh] flex flex-col overflow-y-auto ${pipelineState === 'reviewing' || pipelineState === 'done' ? 'max-w-2xl' : 'max-w-lg'}`}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4" /> Review & Case Study
                <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={() => setSettingsOpen(true)} title="AI Instellingen">
                  <Settings className="h-3.5 w-3.5" />
                </Button>
              </DialogTitle>
              <DialogDescription asChild>
                <div>
                  <p>
                    {pipelineState === 'idle' && `Case study genereren voor ${customerName}`}
                    {pipelineState === 'interviewing' && 'Vragen worden voorbereid...'}
                    {pipelineState === 'answering' && 'Beantwoord de vragen voor een beter verhaal'}
                    {pipelineState === 'brainstorming' && 'AI brainstormt het verhaal...'}
                    {pipelineState === 'auto_generating' && 'Case study wordt gegenereerd...'}
                    {pipelineState === 'reviewing' && 'Review de brainstorm'}
                    {pipelineState === 'formalizing' && 'Verhaal wordt gestructureerd...'}
                    {pipelineState === 'done' && 'Controleer en sla op'}
                  </p>
                  {pipelineState !== 'idle' && pipelineState !== 'auto_generating' && (
                    <div className="flex items-center gap-1.5 text-[10px] flex-wrap pt-1">
                      <Badge variant={['interviewing', 'answering'].includes(pipelineState) ? 'default' : 'secondary'} className="gap-0.5 h-5">
                        🎤 Interview
                        {['brainstorming', 'reviewing', 'formalizing', 'done'].includes(pipelineState) && <Check className="h-2.5 w-2.5" />}
                      </Badge>
                      <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                      <Badge variant={pipelineState === 'brainstorming' ? 'default' : ['reviewing', 'formalizing', 'done'].includes(pipelineState) ? 'secondary' : 'outline'} className="gap-0.5 h-5">
                        <Brain className="h-2.5 w-2.5" /> Brainstorm
                        {['reviewing', 'formalizing', 'done'].includes(pipelineState) && <Check className="h-2.5 w-2.5" />}
                      </Badge>
                      <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                      <Badge variant={pipelineState === 'formalizing' ? 'default' : pipelineState === 'done' ? 'secondary' : 'outline'} className="gap-0.5 h-5">
                        <Sparkles className="h-2.5 w-2.5" /> Resultaat
                        {pipelineState === 'done' && <Check className="h-2.5 w-2.5" />}
                      </Badge>
                    </div>
                  )}
                </div>
              </DialogDescription>
            </DialogHeader>
            {renderContent()}
          </DialogContent>
        </Dialog>
      )}
      <CustomerStorySettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}

// ============ HELPER COMPONENTS ============

function EditableCard({ label, value, isEditing, onToggleEdit, onChange, placeholder, isMobile }: {
  label: string;
  value: string;
  isEditing: boolean;
  onToggleEdit: () => void;
  onChange: (v: string) => void;
  placeholder?: string;
  isMobile: boolean;
}) {
  return (
    <div className="p-3 bg-card border rounded-lg">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        <button onClick={onToggleEdit} className="text-[10px] text-primary hover:underline flex items-center gap-1">
          <Pencil className="h-2.5 w-2.5" /> {isEditing ? 'Klaar' : 'Bewerk'}
        </button>
      </div>
      {isEditing ? (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`font-semibold ${isMobile ? 'h-10 text-base' : 'text-sm'}`}
          placeholder={placeholder}
          autoFocus
        />
      ) : (
        <p className={`font-semibold truncate ${isMobile ? 'text-base' : 'text-sm'}`}>
          {value || <span className="text-muted-foreground italic font-normal">{placeholder || 'Geen waarde'}</span>}
        </p>
      )}
    </div>
  );
}

/** Collapsible detail view for the full dossier content */
function DossierDetailsView({ details }: { details: DossierDetails }) {
  return (
    <div className="mt-2 pt-2 border-t border-primary/10 space-y-3 text-[11px] text-muted-foreground">
      {details.conversations.length > 0 && (
        <DossierSection title="Gesprekshistorie" icon={<MessageSquare className="h-3 w-3" />}>
          {details.conversations.map((c, i) => (
            <p key={i} className="py-1 border-b border-border/40 last:border-0">{c}</p>
          ))}
        </DossierSection>
      )}
      {details.viewingFeedback.length > 0 && (
        <DossierSection title="Bezichtigingsfeedback" icon={<MapPin className="h-3 w-3" />}>
          {details.viewingFeedback.map((v, i) => (
            <p key={i} className="py-1 border-b border-border/40 last:border-0">{v}</p>
          ))}
        </DossierSection>
      )}
      {details.tripDetails.length > 0 && (
        <DossierSection title="Bezichtigingsreizen" icon={<MapPin className="h-3 w-3" />}>
          {details.tripDetails.map((t, i) => (
            <p key={i} className="py-1 border-b border-border/40 last:border-0">{t}</p>
          ))}
        </DossierSection>
      )}
      {details.timeline.length > 0 && (
        <DossierSection title="Tijdslijn" icon={<Milestone className="h-3 w-3" />}>
          {details.timeline.map((t, i) => (
            <p key={i} className="py-1 border-b border-border/40 last:border-0">{t}</p>
          ))}
        </DossierSection>
      )}
      {details.crmNotes && details.crmNotes.length > 0 && (
        <DossierSection title="CRM Notities" icon={<BookOpen className="h-3 w-3" />}>
          {details.crmNotes.map((n, i) => (
            <p key={i} className="py-1 border-b border-border/40 last:border-0">{n}</p>
          ))}
        </DossierSection>
      )}
      {details.videoTranscriptPreview && (
        <DossierSection title="Video transcript" icon={<Video className="h-3 w-3" />}>
          <p className="whitespace-pre-wrap text-[10px] max-h-32 overflow-y-auto">{details.videoTranscriptPreview}</p>
        </DossierSection>
      )}
    </div>
  );
}

function DossierSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-medium text-foreground/80 flex items-center gap-1 mb-1">{icon} {title}</p>
      <div className="pl-4">{children}</div>
    </div>
  );
}
