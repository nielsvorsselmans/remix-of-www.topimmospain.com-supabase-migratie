import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Search, CheckCircle2, AlertCircle, XCircle,
  BookOpen, ChevronDown, ChevronUp, Zap, Check, Plus,
} from "lucide-react";
import { useContentQuestions, type ContentQuestion } from "@/hooks/useContentQuestions";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import type { CreatePagePrefill } from "./CreatePage";

function getAnswerStatus(q: ContentQuestion) {
  if (q.answer_count >= 2) return { label: "Beantwoord", icon: CheckCircle2, border: "border-l-green-500" };
  if (q.answer_count === 1) return { label: "Deels", icon: AlertCircle, border: "border-l-amber-500" };
  return { label: "Content gap", icon: XCircle, border: "border-l-destructive" };
}

function getPhaseLabel(phase: string) {
  const map: Record<string, string> = {
    ORIENTATIE: "Oriëntatie",
    VERGELIJKING: "Vergelijking",
    BESLISSING: "Beslissing",
  };
  return map[phase] || phase;
}

interface ContentQuestionsBoardProps {
  onNavigateToCreate?: (prefill: CreatePagePrefill) => void;
  onNavigateToBriefing?: (briefingId: string) => void;
}

type FilterKey = "all" | "gap" | "partial" | "answered" | "has_blog" | "no_blog";

export function ContentQuestionsBoard({ onNavigateToCreate, onNavigateToBriefing }: ContentQuestionsBoardProps) {
  const { data: questions, isLoading } = useContentQuestions();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [pendingQuestion, setPendingQuestion] = useState<{ question: ContentQuestion; fastTrack: boolean } | null>(null);
  const [extraNotes, setExtraNotes] = useState("");

  const filtered = (questions || []).filter((q) => {
    if (filter === "answered") return q.answer_count >= 2;
    if (filter === "partial") return q.answer_count === 1;
    if (filter === "gap") return q.answer_count === 0;
    if (filter === "has_blog") return q.has_blog;
    if (filter === "no_blog") return !q.has_blog;
    return true;
  });

  const stats = {
    total: questions?.length || 0,
    gap: questions?.filter(q => q.answer_count === 0).length || 0,
    partial: questions?.filter(q => q.answer_count === 1).length || 0,
    answered: questions?.filter(q => q.answer_count >= 2).length || 0,
    hasBlog: questions?.filter(q => q.has_blog).length || 0,
    noBlog: questions?.filter(q => !q.has_blog).length || 0,
  };

  const coveragePercent = stats.total > 0 ? Math.round((stats.hasBlog / stats.total) * 100) : 0;

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const buildPrefill = (q: ContentQuestion, fastTrack = false, customInstructions?: string): CreatePagePrefill => ({
    question: q.question,
    questionId: q.id,
    answerFragments: q.all_answers.length > 0 ? q.all_answers : undefined,
    insightTheme: q.insight_theme || undefined,
    buyerPhases: q.buyer_phases || undefined,
    searchIntent: q.search_intent || undefined,
    frequency: q.frequency || undefined,
    fastTrack,
    customInstructions,
  });

  const handleOpenDialog = (q: ContentQuestion, fastTrack: boolean) => {
    setPendingQuestion({ question: q, fastTrack });
    setExtraNotes("");
  };

  const handleConfirmDialog = () => {
    if (!pendingQuestion) return;
    const { question, fastTrack } = pendingQuestion;
    onNavigateToCreate?.(buildPrefill(question, fastTrack, extraNotes.trim() || undefined));
    setPendingQuestion(null);
    setExtraNotes("");
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
      </div>
    );
  }

  if (!questions?.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nog geen content-vragen gevonden.</p>
          <p className="text-xs mt-1">Analyseer eerst gesprekken in de Bronnen tab.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Coverage summary bar */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium">
              Blog-dekking: {stats.hasBlog} van {stats.total} vragen
            </span>
            <span className="text-xs text-muted-foreground">{coveragePercent}%</span>
          </div>
          <Progress value={coveragePercent} className="h-2" />
        </CardContent>
      </Card>

      {/* Filter row */}
      <div className="flex items-center gap-2 flex-wrap">
        {([
          { key: "all" as const, label: `Alle (${stats.total})` },
          { key: "no_blog" as const, label: `Geen blog (${stats.noBlog})` },
          { key: "has_blog" as const, label: `Heeft blog (${stats.hasBlog})` },
          { key: "gap" as const, label: `Gaps (${stats.gap})` },
          { key: "partial" as const, label: `Deels (${stats.partial})` },
          { key: "answered" as const, label: `Beantwoord (${stats.answered})` },
        ] as const).map(({ key, label }) => (
          <Button
            key={key}
            size="sm"
            variant={filter === key ? "default" : "outline"}
            className="text-xs h-7"
            onClick={() => setFilter(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Question cards */}
      <div className="space-y-2">
        {filtered.map((q) => {
          const status = getAnswerStatus(q);
          const isExpanded = expandedIds.has(q.id);

          return (
            <Collapsible key={q.id} open={isExpanded} onOpenChange={() => toggleExpand(q.id)}>
              <Card className={`border-l-4 ${status.border} overflow-hidden`}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0">
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </Button>
                      </CollapsibleTrigger>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium truncate">{q.question}</span>
                        {q.has_blog && (
                          <Badge variant="secondary" className="text-xs shrink-0 text-green-600 gap-1">
                            <Check className="h-3 w-3" />
                            Blog
                          </Badge>
                        )}
                      </div>
                      {(q.frequency || 0) > 1 && (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {q.frequency}×
                        </Badge>
                      )}
                    </div>

                    <div className="shrink-0">
                      {q.has_blog ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenDialog(q, false)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Nieuw artikel
                        </Button>
                      ) : q.answer_count === 0 ? (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleOpenDialog(q, true)}
                        >
                          <Zap className="h-4 w-4 mr-1" />
                          Snel blog
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenDialog(q, false)}
                        >
                          <BookOpen className="h-4 w-4 mr-1" />
                          Blog
                        </Button>
                      )}
                    </div>
                  </div>

                  <CollapsibleContent className="mt-3 space-y-2 border-t pt-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {q.search_intent}
                      </Badge>
                      {q.buyer_phases?.map((phase) => (
                        <Badge key={phase} variant="outline" className="text-xs">
                          {getPhaseLabel(phase)}
                        </Badge>
                      ))}
                      {q.source_count > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {q.source_count} bron{q.source_count !== 1 ? 'nen' : ''}
                        </Badge>
                      )}
                      {q.search_volume_hint && (
                        <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                          🔍 {q.search_volume_hint}
                        </Badge>
                      )}
                    </div>
                    {q.best_answer && (
                      <div className="rounded-md bg-muted/50 px-3 py-2 text-xs">
                        <span className="font-medium text-muted-foreground">Beste antwoord: </span>
                        <span>{q.best_answer.length > 200 ? q.best_answer.slice(0, 200) + "…" : q.best_answer}</span>
                      </div>
                    )}
                  </CollapsibleContent>
                </CardContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>

      {/* Extra notes dialog */}
      <Dialog open={!!pendingQuestion} onOpenChange={(open) => { if (!open) setPendingQuestion(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Extra instructies</DialogTitle>
            <DialogDescription className="text-sm">
              {pendingQuestion?.question.question}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Optioneel: voeg specifieke instructies toe, bijv. focus op kosten, vergelijk met Nederland, schrijf voor beginners..."
            value={extraNotes}
            onChange={(e) => setExtraNotes(e.target.value)}
            rows={4}
            className="text-sm"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingQuestion(null)}>
              Annuleren
            </Button>
            <Button onClick={handleConfirmDialog}>
              {pendingQuestion?.fastTrack ? (
                <><Zap className="h-4 w-4 mr-1" /> Volgende</>
              ) : (
                "Volgende"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
