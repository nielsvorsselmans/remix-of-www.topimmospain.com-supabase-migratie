import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Loader2, MessageCircleQuestion, ArrowLeft, Sparkles, Settings, RotateCcw, ChevronDown, Search, ShieldCheck, Gauge, User, FileText, Code, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useConversations } from "@/hooks/useConversations";

const AVAILABLE_MODELS = [
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (snel, goedkoop)" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (beste kwaliteit)" },
  { value: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite (snelst)" },
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash Preview" },
  { value: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro Preview" },
  { value: "openai/gpt-5", label: "GPT-5 (premium)" },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini" },
];

interface AIQuestion {
  question: string;
  search_intent: "INFORMATIONAL" | "COMMERCIAL" | "TRANSACTIONAL";
}

interface AIInsight {
  label: string;
  type: string;
  theme: string;
  subtheme: string;
  normalized_insight: string;
  raw_quote: string;
  impact_score: string;
  extraction_confidence: number;
  suggested_archetype: string;
  underlying_questions: (string | AIQuestion)[];
}

interface AIResult {
  anonymized_notes: string;
  sentiment: string;
  buyer_phase: string;
  conversation_richness: number;
  insights: AIInsight[];
}

interface TestAIAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const buyerPhaseConfig: Record<string, { label: string; color: string }> = {
  ORIENTATIE: { label: "🔍 Oriëntatie", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  VERGELIJKING: { label: "⚖️ Vergelijking", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" },
  BESLISSING: { label: "✅ Beslissing", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
};

const searchIntentConfig: Record<string, { label: string; icon: string; color: string }> = {
  INFORMATIONAL: { label: "Informatief", icon: "📖", color: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  COMMERCIAL: { label: "Commercieel", icon: "🔄", color: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  TRANSACTIONAL: { label: "Transactioneel", icon: "🎯", color: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300" },
};

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const getConfidenceLabel = (score: number) => {
  if (score >= 4) return "Letterlijk";
  if (score >= 3) return "Afgeleid";
  return "Geïnterpreteerd";
};

const getConfidenceStyle = (score: number) => {
  if (score >= 4) return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
  if (score >= 3) return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
};

const getContentSuggestion = (intent: string | null) => {
  switch (intent) {
    case "INFORMATIONAL": return { format: "📝 Blog / Gids", prefix: "Alles wat je moet weten over" };
    case "COMMERCIAL": return { format: "📊 Vergelijkingspagina", prefix: "Vergelijk:" };
    case "TRANSACTIONAL": return { format: "🎯 Landingspagina / FAQ", prefix: "" };
    default: return { format: "📝 Blog", prefix: "" };
  }
};

function RichnessIndicator({ score }: { score: number }) {
  const bars = Array.from({ length: 5 }, (_, i) => i < score);
  const color = score <= 2 ? "bg-red-500" : score <= 3 ? "bg-amber-500" : "bg-green-500";
  return (
    <div className="flex items-center gap-1">
      <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
      <div className="flex gap-0.5">
        {bars.map((filled, i) => (
          <div key={i} className={`w-3 h-2 rounded-sm ${filled ? color : 'bg-muted'}`} />
        ))}
      </div>
      <span className="text-xs text-muted-foreground ml-1">{score}/5</span>
    </div>
  );
}

export function TestAIAnalysisDialog({ open, onOpenChange }: TestAIAnalysisDialogProps) {
  const { data: conversations, isLoading: loadingConversations } = useConversations();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [customModel, setCustomModel] = useState("google/gemini-2.5-flash");
  const [defaultPrompt, setDefaultPrompt] = useState("");
  const [defaultModel, setDefaultModel] = useState("google/gemini-2.5-flash");
  const [loadingPrompt, setLoadingPrompt] = useState(false);

  useEffect(() => {
    if (!open) return;
    const loadPrompt = async () => {
      setLoadingPrompt(true);
      try {
        const { data } = await supabase
          .from("ai_prompts")
          .select("prompt_text, model_id")
          .eq("prompt_key", "analyze_conversation")
          .single();
        const prompt = data?.prompt_text || "";
        const model = data?.model_id || "google/gemini-2.5-flash";
        setDefaultPrompt(prompt);
        setDefaultModel(model);
        setCustomPrompt(prompt);
        setCustomModel(model);
      } catch {
        // ignore
      } finally {
        setLoadingPrompt(false);
      }
    };
    loadPrompt();
  }, [open]);

  const handleReset = () => {
    setCustomPrompt(defaultPrompt);
    setCustomModel(defaultModel);
  };

  const handleAnalyze = async (conversationId: string) => {
    setSelectedId(conversationId);
    setIsAnalyzing(true);
    setAiResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-conversation', {
        body: {
          conversationId,
          dryRun: true,
          ...(customPrompt && customPrompt !== defaultPrompt ? { customPrompt } : {}),
          ...(customModel && customModel !== defaultModel ? { customModel } : {}),
        }
      });

      if (error) throw error;
      if (data?.dryRunResult) {
        setAiResult(data.dryRunResult);
      } else {
        throw new Error("Geen AI resultaat ontvangen");
      }
    } catch (err) {
      console.error("AI analysis error:", err);
      toast.error("Fout bij AI-analyse");
      setSelectedId(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleBack = () => {
    setSelectedId(null);
    setAiResult(null);
  };

  const handleClose = (val: boolean) => {
    if (!val) {
      setSelectedId(null);
      setAiResult(null);
    }
    onOpenChange(val);
  };

  const sentimentColor = (s: string) => {
    if (s === "Enthousiast") return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    if (s === "Twijfelend") return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
  };

  const impactColor = (s: string) => {
    if (s === "High") return "destructive" as const;
    if (s === "Medium") return "default" as const;
    return "secondary" as const;
  };

  const selectedConversation = conversations?.find(c => c.id === selectedId);
  const isPromptModified = customPrompt !== defaultPrompt || customModel !== defaultModel;

  const getQuestionText = (q: string | AIQuestion): string => typeof q === 'string' ? q : q.question;
  const getQuestionIntent = (q: string | AIQuestion): string | null => typeof q === 'string' ? null : q.search_intent;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Test AI — Content Intelligence Extractie
          </DialogTitle>
        </DialogHeader>

        {/* Main scrollable area — native div with min-h-0 for flex shrink */}
        <div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6 pb-2">
          {/* Settings panel */}
          <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen} className="mb-4">
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Instellingen
                  {isPromptModified && (
                    <Badge variant="secondary" className="text-xs">Aangepast</Badge>
                  )}
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${settingsOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Model</label>
                <Select value={customModel} onValueChange={setCustomModel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_MODELS.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">System Prompt</label>
                {loadingPrompt ? (
                  <div className="flex items-center gap-2 py-4 text-muted-foreground text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" /> Prompt laden…
                  </div>
                ) : (
                  <Textarea
                    value={customPrompt}
                    onChange={e => setCustomPrompt(e.target.value)}
                    rows={10}
                    className="font-mono text-xs"
                  />
                )}
              </div>
              {isPromptModified && (
                <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5">
                  <RotateCcw className="h-3.5 w-3.5" /> Reset naar opgeslagen waarden
                </Button>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Step 1: Conversation list */}
          {!selectedId && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Klik op een gesprek om de AI-analyse te starten (dry run — niets wordt opgeslagen).
                </p>
                {conversations?.length ? (
                  <Badge variant="secondary" className="shrink-0">{conversations.length} gesprekken</Badge>
                ) : null}
              </div>
              {loadingConversations ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !conversations?.length ? (
                <p className="text-center py-12 text-muted-foreground">Geen gesprekken gevonden.</p>
              ) : (
                <div className="space-y-2">
                  {conversations.map(conv => {
                    const cleanText = stripHtml(conv.raw_notes);
                    return (
                      <button
                        key={conv.id}
                        onClick={() => handleAnalyze(conv.id)}
                        className="w-full text-left p-3 rounded-lg border hover:bg-accent/50 transition-colors space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {conv.crm_leads ? (
                              <span className="text-sm font-semibold">
                                {conv.crm_leads.first_name} {conv.crm_leads.last_name}
                              </span>
                            ) : (
                              <span className="text-sm font-medium text-muted-foreground italic">Onbekend</span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {conv.created_at ? new Date(conv.created_at).toLocaleDateString('nl-NL') : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="outline" className="text-xs">{conv.source_type}</Badge>
                          {conv.processed ? (
                            <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">✓ Verwerkt</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Onverwerkt</Badge>
                          )}
                          {conv.buyer_phase && buyerPhaseConfig[conv.buyer_phase] && (
                            <Badge className={`text-xs ${buyerPhaseConfig[conv.buyer_phase].color}`}>
                              {buyerPhaseConfig[conv.buyer_phase].label}
                            </Badge>
                          )}
                          {typeof conv.conversation_richness === 'number' && conv.conversation_richness > 0 && (
                            <RichnessIndicator score={conv.conversation_richness} />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {cleanText.slice(0, 150)}{cleanText.length > 150 ? '…' : ''}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Analyzing / Result */}
          {selectedId && (
            <div className="space-y-4">
              <Button variant="ghost" size="sm" onClick={handleBack} className="mb-2">
                <ArrowLeft className="h-4 w-4 mr-1" /> Terug naar lijst
              </Button>

              {/* Selected conversation with Leesbaar / Raw tabs */}
              {selectedConversation && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center justify-between">
                      <span>Geselecteerd gesprek</span>
                      {selectedConversation.crm_leads && (
                        <span className="text-xs font-normal text-muted-foreground">
                          {selectedConversation.crm_leads.first_name} {selectedConversation.crm_leads.last_name}
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="readable" className="w-full">
                      <TabsList className="mb-2">
                        <TabsTrigger value="readable" className="text-xs gap-1.5">
                          <FileText className="h-3.5 w-3.5" />
                          Leesbaar
                        </TabsTrigger>
                        <TabsTrigger value="raw" className="text-xs gap-1.5">
                          <Code className="h-3.5 w-3.5" />
                          Raw payload
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="readable">
                        <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                          {stripHtml(selectedConversation.raw_notes)}
                        </p>
                      </TabsContent>
                      <TabsContent value="raw">
                        <pre className="text-xs font-mono whitespace-pre-wrap bg-muted/50 rounded-md p-3 max-h-[300px] overflow-y-auto border">
                          {selectedConversation.raw_notes}
                        </pre>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              )}

              {isAnalyzing && (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">AI analyseert het gesprek…</p>
                  <p className="text-xs text-muted-foreground">Model: {customModel}</p>
                </div>
              )}

              {aiResult && (
                <div className="space-y-4">
                  {/* Top-level metadata */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={sentimentColor(aiResult.sentiment)}>{aiResult.sentiment}</Badge>
                    {aiResult.buyer_phase && buyerPhaseConfig[aiResult.buyer_phase] && (
                      <Badge className={buyerPhaseConfig[aiResult.buyer_phase].color}>
                        <User className="h-3 w-3 mr-1" />
                        {buyerPhaseConfig[aiResult.buyer_phase].label}
                      </Badge>
                    )}
                    {aiResult.conversation_richness && (
                      <RichnessIndicator score={aiResult.conversation_richness} />
                    )}
                    <span className="text-xs text-muted-foreground">Dry run — niet opgeslagen</span>
                    {isPromptModified && (
                      <Badge variant="outline" className="text-xs">Custom prompt/model</Badge>
                    )}
                  </div>

                  {/* Richness warning */}
                  {aiResult.conversation_richness && aiResult.conversation_richness <= 2 && (
                    <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
                      ⚠️ Dit gesprek bevat weinig directe klantdata — insights zijn minder betrouwbaar.
                    </div>
                  )}

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Geanonimiseerde samenvatting</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{aiResult.anonymized_notes}</p>
                    </CardContent>
                  </Card>

                  <h3 className="font-semibold text-sm">Geëxtraheerde Insights ({aiResult.insights.length})</h3>
                  {aiResult.insights.map((insight, i) => (
                    <Card key={i} className="border-l-4 border-l-primary/60">
                      <CardContent className="pt-4 space-y-3">
                        {/* Badges row */}
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant={impactColor(insight.impact_score)}>{insight.impact_score}</Badge>
                          <Badge variant="outline">{insight.type}</Badge>
                          <Badge variant="outline">{insight.theme}::{insight.subtheme}</Badge>
                          <Badge variant="secondary">{insight.suggested_archetype}</Badge>
                          {insight.extraction_confidence && (
                            <Badge className={`text-xs gap-1 ${getConfidenceStyle(insight.extraction_confidence)}`}>
                              <ShieldCheck className="h-3 w-3" />
                              {getConfidenceLabel(insight.extraction_confidence)}
                            </Badge>
                          )}
                        </div>

                        {/* Insight label */}
                        <p className="font-medium">{insight.label}</p>

                        {/* Raw quote with visual distinction based on confidence */}
                        {insight.raw_quote && (
                          <div className={`rounded-md p-2.5 text-sm italic ${
                            insight.extraction_confidence >= 4
                              ? 'bg-green-50 dark:bg-green-950/20 border-l-2 border-green-400'
                              : insight.extraction_confidence >= 3
                                ? 'bg-amber-50 dark:bg-amber-950/20 border-l-2 border-amber-400'
                                : 'bg-muted/50 border-l-2 border-muted-foreground/30'
                          }`}>
                            <span className="text-xs font-medium not-italic block mb-1 text-muted-foreground">
                              {insight.extraction_confidence >= 4 ? '💬 Directe quote' : insight.extraction_confidence >= 3 ? '🔍 Afgeleide observatie' : '🤖 AI-interpretatie'}
                            </span>
                            "{insight.raw_quote}"
                          </div>
                        )}

                        {/* Underlying questions with Google-search styling */}
                        {insight.underlying_questions?.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5 text-sm font-medium text-primary">
                              <MessageCircleQuestion className="h-4 w-4" />
                              Zoekbare vragen
                            </div>
                            <div className="space-y-2">
                              {insight.underlying_questions.map((q, qi) => {
                                const intent = getQuestionIntent(q);
                                const intentCfg = intent ? searchIntentConfig[intent] : null;
                                const suggestion = getContentSuggestion(intent);
                                const questionText = getQuestionText(q);
                                return (
                                  <div key={qi} className="space-y-1">
                                    {/* Search bar style */}
                                    <div className="flex items-center gap-2 bg-background border rounded-full px-3 py-1.5 shadow-sm">
                                      <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                      <span className="text-sm flex-1">{questionText}</span>
                                      {intentCfg && (
                                        <Badge className={`${intentCfg.color} text-xs shrink-0`}>
                                          {intentCfg.label}
                                        </Badge>
                                      )}
                                    </div>
                                    {/* Content suggestion */}
                                    <div className="flex items-center gap-1.5 pl-4 text-xs text-muted-foreground">
                                      <Lightbulb className="h-3 w-3 shrink-0" />
                                      <span>{suggestion.format}</span>
                                      <span className="text-foreground/70">
                                        → {suggestion.prefix ? `${suggestion.prefix} ` : ''}{questionText.replace(/\?$/, '')}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
