import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowLeft, PenLine, Search, Target, Lightbulb, BookOpen, MessageSquare, Plus, X, Save, CheckCircle2, AlertTriangle, TrendingUp, Globe, ExternalLink, Loader2, History, ChevronDown, Linkedin } from "lucide-react";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
import { useContentBriefing, type ContentBriefing } from "@/hooks/useContentBriefings";
import { useBlogBrainstormPrompt } from "@/hooks/useBlogPipelinePrompts";
import { AVAILABLE_MODELS } from "@/hooks/useBriefingPrompt";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LinkedInPostDialog } from "./LinkedInPostDialog";

interface BriefingDetailViewProps {
  briefingId: string;
  onBack: () => void;
  onWriteArticle: (briefing: ContentBriefing) => void;
}

export function BriefingDetailView({ briefingId, onBack, onWriteArticle }: BriefingDetailViewProps) {
  const { data: briefing, isLoading } = useContentBriefing(briefingId);
  const { data: brainstormConfig } = useBlogBrainstormPrompt();
  const queryClient = useQueryClient();
  const [editedData, setEditedData] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");
  const [loadingSeo, setLoadingSeo] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [showLinkedIn, setShowLinkedIn] = useState(false);

  // Fetch pipeline logs for this briefing
  const { data: pipelineLogs } = useQuery({
    queryKey: ["pipeline-logs", briefingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_pipeline_logs" as any)
        .select("*")
        .eq("briefing_id", briefingId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const getModelLabel = (modelId?: string) => {
    if (!modelId) return null;
    return AVAILABLE_MODELS.find(m => m.id === modelId)?.label || modelId.split('/').pop();
  };

  // Use editedData if user has started editing, otherwise use original
  const b = (!isLoading && briefing) ? (editedData || briefing.briefing_data || {}) : {};
  const seo = b.seo_strategy || {};
  const structure = b.article_structure || {};
  const hasEdits = editedData !== null;

  // ─── Briefing Quality Score ────────────────────────────────────
  const qualityChecks = useMemo(() => {
    const checks = [
      { label: "Emotionele haak", ok: !!(b.emotional_hook && b.emotional_hook.trim().length > 10) },
      { label: "Unieke invalshoek", ok: !!(b.unique_angle && b.unique_angle.trim().length > 10) },
      { label: "Doelgroep", ok: !!(b.target_audience && b.target_audience.trim().length > 5) },
      { label: "Primair keyword", ok: !!(seo.primary_keyword && seo.primary_keyword.trim().length > 2) },
      { label: "Secundaire keywords (≥2)", ok: (seo.secondary_keywords?.length || 0) >= 2 },
      { label: "Secties (≥4)", ok: (structure.sections?.length || 0) >= 4 },
      { label: "Onderliggende vragen", ok: (b.underlying_questions?.length || 0) >= 3 },
      { label: "Differentiatie", ok: !!(b.differentiation && b.differentiation.trim().length > 10) },
    ];
    const score = Math.round((checks.filter(c => c.ok).length / checks.length) * 100);
    return { checks, score };
  }, [b, seo, structure]);

  const scoreColor = qualityChecks.score >= 80 ? "text-green-600" : qualityChecks.score >= 50 ? "text-amber-600" : "text-red-500";

  if (isLoading) {
    return <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}</div>;
  }

  if (!briefing) {
    return <p className="text-muted-foreground">Briefing niet gevonden.</p>;
  }

  const updateField = (path: string, value: any) => {
    const data = editedData || { ...briefing.briefing_data };
    const keys = path.split('.');
    let obj = data;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!obj[keys[i]]) obj[keys[i]] = {};
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    setEditedData({ ...data });
  };

  const saveBriefing = async () => {
    if (!editedData) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('content_briefings' as any)
        .update({
          briefing_data: editedData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', briefingId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["content-briefing", briefingId] });
      queryClient.invalidateQueries({ queryKey: ["content-briefings"] });
      toast.success("Briefing opgeslagen!");
    } catch (error) {
      console.error("Error saving briefing:", error);
      toast.error("Kon briefing niet opslaan");
    } finally {
      setSaving(false);
    }
  };

  const handleWriteArticle = () => {
    // Pass the edited briefing data if available
    const updatedBriefing = editedData
      ? { ...briefing, briefing_data: editedData }
      : briefing;
    onWriteArticle(updatedBriefing);
  };

  const addSecondaryKeyword = () => {
    if (!newKeyword.trim()) return;
    const currentKws = seo.secondary_keywords || [];
    updateField('seo_strategy.secondary_keywords', [...currentKws, newKeyword.trim()]);
    setNewKeyword("");
  };

  const removeSecondaryKeyword = (index: number) => {
    const kws = (seo.secondary_keywords || []).filter((_: string, i: number) => i !== index);
    updateField('seo_strategy.secondary_keywords', kws);
  };

  const seoResearch = b.seo_research;

  const fetchSeoResearch = async () => {
    const keyword = seo.primary_keyword;
    if (!keyword || keyword.trim().length < 2) {
      toast.error("Vul eerst een primair keyword in");
      return;
    }
    setLoadingSeo(true);
    try {
      const { data, error } = await supabaseClient.functions.invoke('seo-keyword-research', {
        body: { keyword: keyword.trim(), language_code: 'nl', location_code: 2528 },
      });
      if (error) throw error;
      updateField('seo_research', data);
      toast.success("SEO data opgehaald!");
    } catch (e) {
      console.error("SEO research failed:", e);
      toast.error("Kon SEO data niet ophalen");
    } finally {
      setLoadingSeo(false);
    }
  };


  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Terug
        </Button>
        <div className="flex items-center gap-2">
          {brainstormConfig?.model && (
            <Badge variant="secondary" className="text-xs">
              {getModelLabel(brainstormConfig.model)}
            </Badge>
          )}
          {hasEdits && (
            <Button variant="outline" size="sm" onClick={saveBriefing} disabled={saving}>
              <Save className="h-4 w-4 mr-1" />
              {saving ? "Opslaan..." : "Opslaan"}
            </Button>
          )}
          {briefing.status !== "written" && (
            <Button onClick={handleWriteArticle}>
              <PenLine className="h-4 w-4 mr-1" /> Schrijf artikel
            </Button>
          )}
        </div>
      </div>

      {/* Quality Score */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Target className="h-4 w-4" /> Briefing kwaliteit
            </span>
            <span className={`text-lg font-bold ${scoreColor}`}>{qualityChecks.score}%</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Progress value={qualityChecks.score} className="h-2" />
          <div className="grid grid-cols-2 gap-1.5">
            {qualityChecks.checks.map(({ label, ok }) => (
              <div key={label} className="flex items-center gap-1.5 text-xs">
                {ok ? (
                  <CheckCircle2 className="h-3 w-3 text-green-600 shrink-0" />
                ) : (
                  <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
                )}
                <span className={ok ? "text-foreground" : "text-muted-foreground"}>{label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Source */}
      {briefing.source_text && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Bron
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm">{briefing.source_text}</span>
            </div>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline">{briefing.source_type}</Badge>
              <Badge variant="secondary">{briefing.category}</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Headline & Subheadline */}
      {(structure.headline || structure.subheadline) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="h-4 w-4" /> Titel & structuur
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {structure.headline !== undefined && (
              <div className="space-y-1">
                <Label className="text-xs">Titel</Label>
                <Input
                  value={structure.headline || ''}
                  onChange={(e) => updateField('article_structure.headline', e.target.value)}
                  className="font-semibold"
                />
              </div>
            )}
            {structure.subheadline !== undefined && (
              <div className="space-y-1">
                <Label className="text-xs">Ondertitel</Label>
                <Input
                  value={structure.subheadline || ''}
                  onChange={(e) => updateField('article_structure.subheadline', e.target.value)}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Strategic angle - editable */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4" /> Strategische invalshoek
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {b.unique_angle !== undefined && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Unieke invalshoek</Label>
              <Textarea
                value={b.unique_angle || ''}
                onChange={(e) => updateField('unique_angle', e.target.value)}
                rows={2}
                className="text-sm"
              />
            </div>
          )}
          {b.emotional_hook !== undefined && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Emotionele haak</Label>
              <Textarea
                value={b.emotional_hook || ''}
                onChange={(e) => updateField('emotional_hook', e.target.value)}
                rows={2}
                className="text-sm"
              />
            </div>
          )}
          {b.target_audience !== undefined && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Doelgroep</Label>
              <Input
                value={b.target_audience || ''}
                onChange={(e) => updateField('target_audience', e.target.value)}
                className="text-sm"
              />
            </div>
          )}
          {b.differentiation !== undefined && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Differentiatie</Label>
              <Textarea
                value={b.differentiation || ''}
                onChange={(e) => updateField('differentiation', e.target.value)}
                rows={2}
                className="text-sm"
              />
            </div>
          )}
          {b.tone_notes !== undefined && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Toon & stijl</Label>
              <Input
                value={b.tone_notes || ''}
                onChange={(e) => updateField('tone_notes', e.target.value)}
                className="text-sm"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* SEO Strategy - editable */}
      {(seo.primary_keyword !== undefined || seo.secondary_keywords?.length > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Search className="h-4 w-4" /> SEO-strategie
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {seo.primary_keyword !== undefined && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Primair keyword</Label>
                <Input
                  value={seo.primary_keyword || ''}
                  onChange={(e) => updateField('seo_strategy.primary_keyword', e.target.value)}
                  className="text-sm"
                />
              </div>
            )}
            {seo.secondary_keywords && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Secundaire keywords</Label>
                <div className="flex flex-wrap gap-1">
                  {seo.secondary_keywords.map((kw: string, i: number) => (
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
              </div>
            )}
            {seo.search_intent !== undefined && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Zoekintentie</Label>
                <Input
                  value={seo.search_intent || ''}
                  onChange={(e) => updateField('seo_strategy.search_intent', e.target.value)}
                  className="text-sm"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* SEO Research Panel */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> SEO Marktdata
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSeoResearch}
              disabled={loadingSeo}
              className="h-7"
            >
              {loadingSeo ? (
                <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Ophalen...</>
              ) : seoResearch ? (
                <><TrendingUp className="h-3 w-3 mr-1" /> Vernieuwen</>
              ) : (
                <><TrendingUp className="h-3 w-3 mr-1" /> Ophalen</>
              )}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!seoResearch && !loadingSeo && (
            <p className="text-xs text-muted-foreground text-center py-2">
              Klik "Ophalen" om zoekvolume, concurrentie en SERP-data op te halen voor het primaire keyword.
            </p>
          )}
          {loadingSeo && (
            <div className="flex items-center justify-center py-4 gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> DataForSEO data ophalen...
            </div>
          )}
          {seoResearch && (
            <>
              {/* Keyword metrics */}
              {seoResearch.keyword_data && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-md border p-2 text-center">
                    <p className="text-xs text-muted-foreground">Zoekvolume</p>
                    <p className="text-lg font-bold text-foreground">
                      {seoResearch.keyword_data.search_volume !== null ? seoResearch.keyword_data.search_volume.toLocaleString() : '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">/maand</p>
                  </div>
                  <div className="rounded-md border p-2 text-center">
                    <p className="text-xs text-muted-foreground">CPC</p>
                    <p className="text-lg font-bold text-foreground">
                      {seoResearch.keyword_data.cpc !== null ? `€${seoResearch.keyword_data.cpc.toFixed(2)}` : '—'}
                    </p>
                  </div>
                  <div className="rounded-md border p-2 text-center">
                    <p className="text-xs text-muted-foreground">Concurrentie</p>
                    <p className="text-lg font-bold text-foreground">
                      {seoResearch.keyword_data.competition_level || (seoResearch.keyword_data.competition !== null
                        ? (seoResearch.keyword_data.competition < 0.3 ? 'Laag' : seoResearch.keyword_data.competition < 0.7 ? 'Middel' : 'Hoog')
                        : '—')}
                    </p>
                  </div>
                </div>
              )}

              {/* SERP results */}
              {seoResearch.serp_results?.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Globe className="h-3 w-3" /> Top concurrenten op dit keyword
                  </Label>
                  {seoResearch.serp_results.map((sr: any, i: number) => (
                    <div key={i} className="rounded-md border p-2 space-y-0.5">
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="text-xs shrink-0">#{sr.position}</Badge>
                        <div className="min-w-0 flex-1">
                          <a
                            href={sr.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                          >
                            {sr.title}
                            <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                          </a>
                          <p className="text-xs text-muted-foreground line-clamp-2">{sr.snippet}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Related keywords */}
              {seoResearch.related_keywords?.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Gerelateerde zoektermen</Label>
                  <div className="flex flex-wrap gap-1">
                    {seoResearch.related_keywords.filter((k: any) => k.search_volume !== null).slice(0, 10).map((k: any, i: number) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="text-xs cursor-pointer hover:bg-accent"
                        onClick={() => {
                          const currentKws = seo.secondary_keywords || [];
                          if (!currentKws.includes(k.keyword)) {
                            updateField('seo_strategy.secondary_keywords', [...currentKws, k.keyword]);
                            toast.success(`"${k.keyword}" toegevoegd aan secundaire keywords`);
                          }
                        }}
                      >
                        {k.keyword} <span className="text-muted-foreground ml-1">{k.search_volume}</span>
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Klik op een keyword om het toe te voegen als secundair keyword</p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>


      {structure.sections?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="h-4 w-4" /> Secties
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {structure.sections.map((section: any, i: number) => (
              <div key={i} className="rounded-md border p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-1">
                    <Input
                      value={section.heading || ''}
                      onChange={(e) => {
                        const sections = [...structure.sections];
                        sections[i] = { ...sections[i], heading: e.target.value };
                        updateField('article_structure.sections', sections);
                      }}
                      className="text-sm font-medium"
                    />
                    <p className="text-xs text-muted-foreground">{section.purpose}</p>
                    {section.key_points?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {section.key_points.map((kp: string, j: number) => (
                          <Badge key={j} variant="outline" className="text-xs">{kp}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const sections = structure.sections.filter((_: any, idx: number) => idx !== i);
                      updateField('article_structure.sections', sections);
                    }}
                  >
                    <X className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const sections = [
                  ...(structure.sections || []),
                  { heading: "Nieuwe sectie", purpose: "Beschrijf het doel", key_points: ["Punt 1"] },
                ];
                updateField('article_structure.sections', sections);
              }}
            >
              <Plus className="h-3 w-3 mr-1" />
              Sectie toevoegen
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Underlying questions - editable */}
      {b.underlying_questions?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="h-4 w-4" /> Onderliggende vragen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {b.underlying_questions.map((q: string, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm shrink-0">{i + 1}.</span>
                <Input
                  value={q}
                  onChange={(e) => {
                    const questions = [...b.underlying_questions];
                    questions[i] = e.target.value;
                    updateField('underlying_questions', questions);
                  }}
                  className="text-sm"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const questions = b.underlying_questions.filter((_: string, idx: number) => idx !== i);
                    updateField('underlying_questions', questions);
                  }}
                >
                  <X className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                updateField('underlying_questions', [...(b.underlying_questions || []), ""]);
              }}
            >
              <Plus className="h-3 w-3 mr-1" />
              Vraag toevoegen
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Saved article indicator */}
      {(briefing as any).article_data && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Artikel beschikbaar</span>
            <span className="text-xs text-muted-foreground">
              — klik "Schrijf artikel" om verder te werken met het opgeslagen concept
            </span>
          </CardContent>
        </Card>
      )}

      {/* Pipeline Audit Trail */}
      {pipelineLogs && pipelineLogs.length > 0 && (
        <Collapsible open={showLogs} onOpenChange={setShowLogs}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 rounded-t-lg">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <History className="h-4 w-4" /> Pipeline audit trail
                    <Badge variant="secondary" className="text-xs">{pipelineLogs.length}</Badge>
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showLogs ? 'rotate-180' : ''}`} />
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-2 max-h-64 overflow-y-auto">
                {pipelineLogs.map((log: any) => (
                  <div key={log.id} className="rounded-md border p-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs capitalize">{log.step}</Badge>
                      {log.model_id && (
                        <Badge variant="secondary" className="text-xs">{log.model_id.split('/').pop()}</Badge>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto">
                        {new Date(log.created_at).toLocaleString('nl-NL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {log.input_context && (
                      <p className="text-xs text-muted-foreground truncate">
                        Input: {JSON.stringify(log.input_context).substring(0, 120)}...
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Bottom action */}
      <div className="flex justify-end gap-2 pt-2">
        {hasEdits && (
          <Button variant="outline" size="lg" onClick={saveBriefing} disabled={saving}>
            <Save className="h-4 w-4 mr-2" /> Opslaan
          </Button>
        )}
        {briefing?.status === "written" && (
          <Button variant="outline" size="lg" onClick={() => setShowLinkedIn(true)}>
            <Linkedin className="h-4 w-4 mr-2" />
            LinkedIn post
          </Button>
        )}
        <Button size="lg" onClick={handleWriteArticle}>
          <PenLine className="h-4 w-4 mr-2" />
          {(briefing as any).article_data ? "Hervat artikel" : "Schrijf artikel op basis van deze briefing"}
        </Button>
      </div>

      {briefing?.status === "written" && (
        <LinkedInPostDialog
          open={showLinkedIn}
          onOpenChange={setShowLinkedIn}
          blogPost={{
            id: briefingId,
            title: (briefing.briefing_data as any)?.title || briefing.source_text,
            intro: (briefing.briefing_data as any)?.intro,
            summary: (briefing.briefing_data as any)?.summary,
            meta_keywords: (briefing.briefing_data as any)?.keywords,
            slug: "",
          }}
        />
      )}
    </div>
  );
}
