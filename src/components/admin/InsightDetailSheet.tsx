import { useState } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { MessageSquareQuote, Calendar, Link as LinkIcon, Target, SkipForward, Loader2, TrendingUp, User, Compass, CheckCircle2, XCircle, Clock, AlertTriangle, Sparkles, ShieldCheck, HelpCircle, Search } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Insight, useInsightConversations } from "@/hooks/useInsights";
import { useValidateInsight, useSkipValidation } from "@/hooks/useIcpValidation";

interface InsightDetailSheetProps {
  insight: Insight | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const themeStyles: Record<string, string> = {
  JURIDISCH: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  FINANCIEEL: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  LOCATIE: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  PROCES: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  EMOTIE: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400",
  BOUWTECHNISCH: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  VERHUUR: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
  BELASTING: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const impactStyles: Record<string, string> = {
  High: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  Medium: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  Low: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

const typeLabels: Record<string, string> = {
  Angst: "😰 Angst",
  Verlangen: "✨ Verlangen",
  Misvatting: "❌ Misvatting",
  Blokkade: "🚧 Blokkade",
  Quote: "💬 Quote",
};

const sourceTypeLabels: Record<string, string> = {
  manual_event: "Handmatig",
  ghl_note: "GHL Notitie",
  ghl_appointment: "GHL Afspraak",
};

function ExtractionConfidenceBadge({ confidence }: { confidence: number }) {
  const config = confidence >= 0.8
    ? { label: "Directe quote", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", dot: "bg-green-500" }
    : confidence >= 0.5
    ? { label: "Afgeleide observatie", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400", dot: "bg-amber-500" }
    : { label: "AI-interpretatie", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400", dot: "bg-gray-500" };

  return (
    <Badge variant="secondary" className={`${config.color} gap-1.5 text-xs`}>
      <span className={`h-2 w-2 rounded-full ${config.dot}`} />
      {config.label}
    </Badge>
  );
}

function IcpScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-muted-foreground">-</span>;

  const config = {
    1: { label: "Ruis", color: "bg-red-100 text-red-800", icon: XCircle },
    2: { label: "Niche", color: "bg-orange-100 text-orange-800", icon: AlertTriangle },
    3: { label: "Deels", color: "bg-yellow-100 text-yellow-800", icon: AlertTriangle },
    4: { label: "Goed", color: "bg-emerald-100 text-emerald-800", icon: CheckCircle2 },
    5: { label: "Kern", color: "bg-green-100 text-green-800", icon: Sparkles },
  }[score] || { label: `${score}`, color: "bg-muted", icon: Target };

  const Icon = config.icon;

  return (
    <Badge variant="secondary" className={`${config.color} gap-1`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

export function InsightDetailSheet({ insight, open, onOpenChange }: InsightDetailSheetProps) {
  const { data: linkedConversations, isLoading: conversationsLoading } = useInsightConversations(insight?.id || null);
  const validateMutation = useValidateInsight();
  const skipMutation = useSkipValidation();
  const [isValidating, setIsValidating] = useState(false);

  if (!insight) return null;

  const needsValidation = !insight.icp_validated;
  const icpStatus = insight.icp_validated 
    ? (insight.icp_score && insight.icp_score >= 3 ? "validated" : "rejected")
    : "pending";

  const handleValidate = async () => {
    setIsValidating(true);
    try {
      await validateMutation.mutateAsync(insight.id);
    } finally {
      setIsValidating(false);
    }
  };

  const handleSkip = async () => {
    await skipMutation.mutateAsync({ insightId: insight.id, reason: "Handmatig overgeslagen" });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-left">{insight.label}</SheetTitle>
          <SheetDescription className="text-left">
            <code className="text-xs bg-muted px-2 py-1 rounded">
              {insight.normalized_insight}
            </code>
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            {insight.theme && (
              <Badge className={themeStyles[insight.theme] || "bg-gray-100 text-gray-800"}>
                {insight.theme}
              </Badge>
            )}
            {insight.subtheme && (
              <Badge variant="outline">{insight.subtheme}</Badge>
            )}
            {insight.impact_score && (
              <Badge className={impactStyles[insight.impact_score] || "bg-gray-100 text-gray-800"}>
                {insight.impact_score} Impact
              </Badge>
            )}
            <Badge variant="secondary">
              {typeLabels[insight.type] || insight.type}
            </Badge>
            {insight.suggested_archetype && (
              <Badge variant="outline" className="gap-1 text-xs">
                <Sparkles className="h-3 w-3" />
                {insight.suggested_archetype}
              </Badge>
            )}
          </div>

          <Separator />

          {/* ICP Validation Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">ICP Validatie</h4>
              <div className="flex items-center gap-2">
                {icpStatus === "pending" && (
                  <Badge variant="outline" className="gap-1">
                    <Clock className="h-3 w-3" />
                    Te valideren
                  </Badge>
                )}
                {icpStatus === "validated" && (
                  <Badge className="bg-green-100 text-green-800 gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Gevalideerd
                  </Badge>
                )}
                {icpStatus === "rejected" && (
                  <Badge className="bg-red-100 text-red-800 gap-1">
                    <XCircle className="h-3 w-3" />
                    Afgekeurd
                  </Badge>
                )}
              </div>
            </div>

            {/* Show ICP score and matched personas if validated */}
            {insight.icp_validated && (
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">ICP Score</span>
                  <IcpScoreBadge score={insight.icp_score ?? null} />
                </div>
                {insight.icp_persona_match && insight.icp_persona_match.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">Matchende persona's</span>
                    <div className="flex flex-wrap gap-2">
                      {insight.icp_persona_match.map((persona) => (
                        <Badge key={persona} variant="secondary" className="capitalize">
                          {persona}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {insight.refined_insight && (
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">Hervormd inzicht</span>
                    <p className="text-sm font-medium">{insight.refined_insight}</p>
                  </div>
                )}
              </div>
            )}

            {/* Persona reference for unvalidated insights */}
            {needsValidation && (
              <>
                <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium text-sm">Doelgroep Referentie</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <TrendingUp className="h-4 w-4 mt-0.5 text-emerald-600" />
                      <div>
                        <span className="font-medium">Rendementsgerichte Investeerder:</span>
                        <span className="text-muted-foreground"> Zoekt zekerheid en slim rendement</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <User className="h-4 w-4 mt-0.5 text-amber-600" />
                      <div>
                        <span className="font-medium">Genieter-Investeerder:</span>
                        <span className="text-muted-foreground"> Wil investeren én genieten</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Compass className="h-4 w-4 mt-0.5 text-blue-600" />
                      <div>
                        <span className="font-medium">Oriënterende Ontdekker:</span>
                        <span className="text-muted-foreground"> Wil rustig leren zonder druk</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Validation Actions */}
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={handleValidate}
                    disabled={isValidating || skipMutation.isPending}
                  >
                    {isValidating ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Target className="h-4 w-4 mr-2" />
                    )}
                    Valideer met AI
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSkip}
                    disabled={isValidating || skipMutation.isPending}
                  >
                    {skipMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <SkipForward className="h-4 w-4 mr-2" />
                    )}
                    Overslaan
                  </Button>
                </div>
              </>
            )}
          </div>

          <Separator />

          {/* Raw Quote + Extraction Confidence */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <MessageSquareQuote className="h-4 w-4" />
                Originele Quote
              </div>
              {insight.extraction_confidence != null && (
                <ExtractionConfidenceBadge confidence={insight.extraction_confidence} />
              )}
            </div>
            <blockquote className="border-l-4 border-primary/50 pl-4 italic text-foreground bg-muted/50 py-3 rounded-r-md">
              "{insight.raw_quote}"
            </blockquote>
          </div>

          <Separator />

          {/* Structured Questions */}
          {insight.structured_questions && insight.structured_questions.length > 0 && (
            <>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <HelpCircle className="h-4 w-4" />
                  Gekoppelde Vragen ({insight.structured_questions.length})
                </div>
                <div className="space-y-2">
                  {insight.structured_questions.map((sq, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <Search className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div className="space-y-1 min-w-0">
                        <p className="text-sm font-medium">{sq.question}</p>
                        <Badge variant="outline" className="text-xs capitalize">
                          {sq.search_intent}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Frequency */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Frequentie</span>
            <Badge variant="outline" className="text-lg font-semibold">
              {insight.frequency || 1}x
            </Badge>
          </div>

          <Separator />

          {/* Linked Conversations */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <LinkIcon className="h-4 w-4" />
              Gekoppelde Gesprekken
            </div>
            
            {conversationsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : linkedConversations && linkedConversations.length > 0 ? (
              <div className="space-y-2">
                {linkedConversations.map((link) => (
                  <div
                    key={link.conversation_id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {link.conversations?.created_at
                          ? format(new Date(link.conversations.created_at), "dd MMM yyyy", { locale: nl })
                          : "Onbekend"}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {sourceTypeLabels[link.conversations?.source_type || ""] || link.conversations?.source_type}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Geen gekoppelde gesprekken</p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
