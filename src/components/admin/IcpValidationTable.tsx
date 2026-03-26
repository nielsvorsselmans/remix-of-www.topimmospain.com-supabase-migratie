import { useState } from "react";
import { Target, CheckCircle2, XCircle, SkipForward, Loader2, Sparkles, User, TrendingUp, Compass, AlertTriangle, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useInsightsToValidate,
  useValidateInsight,
  useSkipValidation,
  useBulkValidateInsights,
  type IcpInsight,
} from "@/hooks/useIcpValidation";
import { IcpPromptDialog } from "./IcpPromptDialog";

const personaConfig: Record<string, { label: string; icon: typeof User; color: string }> = {
  rendement: { label: "Rendement", icon: TrendingUp, color: "bg-emerald-100 text-emerald-800" },
  genieter: { label: "Genieter", icon: User, color: "bg-amber-100 text-amber-800" },
  ontdekker: { label: "Ontdekker", icon: Compass, color: "bg-blue-100 text-blue-800" },
};

const themeStyles: Record<string, string> = {
  trust: "bg-blue-100 text-blue-800",
  process: "bg-purple-100 text-purple-800",
  finance: "bg-emerald-100 text-emerald-800",
  location: "bg-amber-100 text-amber-800",
  lifestyle: "bg-rose-100 text-rose-800",
};

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

export function IcpValidationTable() {
  const { data: insights, isLoading } = useInsightsToValidate();
  const validateMutation = useValidateInsight();
  const skipMutation = useSkipValidation();
  const bulkValidateMutation = useBulkValidateInsights();
  
  const [selectedInsight, setSelectedInsight] = useState<IcpInsight | null>(null);
  const [validatingIds, setValidatingIds] = useState<Set<string>>(new Set());

  const handleValidate = async (insight: IcpInsight) => {
    setValidatingIds(prev => new Set(prev).add(insight.id));
    try {
      await validateMutation.mutateAsync(insight.id);
    } finally {
      setValidatingIds(prev => {
        const next = new Set(prev);
        next.delete(insight.id);
        return next;
      });
    }
  };

  const handleSkip = async (insightId: string) => {
    await skipMutation.mutateAsync({ insightId, reason: "Handmatig overgeslagen" });
  };

  const handleBulkValidate = async () => {
    if (!insights?.length) return;
    const ids = insights.slice(0, 10).map(i => i.id); // Max 10 at a time
    await bulkValidateMutation.mutateAsync(ids);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (!insights?.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">Alle inzichten zijn gevalideerd</p>
        <p className="text-sm">Nieuwe inzichten verschijnen hier automatisch</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {insights.length} inzicht{insights.length !== 1 ? "en" : ""} te valideren
        </p>
        <div className="flex items-center gap-2">
          <IcpPromptDialog />
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkValidate}
            disabled={bulkValidateMutation.isPending}
          >
            {bulkValidateMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Valideer eerste 10
          </Button>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Thema</TableHead>
              <TableHead>Inzicht</TableHead>
              <TableHead className="w-[100px]">Frequentie</TableHead>
              <TableHead className="w-[150px] text-right">Acties</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {insights.map((insight) => {
              const isValidating = validatingIds.has(insight.id);
              
              return (
                <TableRow
                  key={insight.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedInsight(insight)}
                >
                  <TableCell>
                    {insight.theme && (
                      <Badge
                        variant="secondary"
                        className={themeStyles[insight.theme] || "bg-muted"}
                      >
                        {insight.theme}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium">{insight.label}</p>
                    {insight.normalized_insight && insight.normalized_insight !== insight.label && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {insight.normalized_insight}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">{insight.frequency ?? 1}x</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        onClick={() => handleValidate(insight)}
                        disabled={isValidating}
                      >
                        {isValidating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Target className="h-4 w-4 mr-1" />
                            Valideer
                          </>
                        )}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleSkip(insight.id)}>
                            <SkipForward className="h-4 w-4 mr-2" />
                            Overslaan
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selectedInsight} onOpenChange={() => setSelectedInsight(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedInsight && (
            <>
              <SheetHeader>
                <SheetTitle>ICP Validatie</SheetTitle>
                <SheetDescription>
                  Valideer dit inzicht tegen de doelgroep
                </SheetDescription>
              </SheetHeader>
              
              <div className="mt-6 space-y-6">
                {/* Insight details */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground">Inzicht</h4>
                  <p className="font-medium">{selectedInsight.label}</p>
                  {selectedInsight.normalized_insight && (
                    <p className="text-sm text-muted-foreground">
                      {selectedInsight.normalized_insight}
                    </p>
                  )}
                </div>

                {/* Theme & Impact */}
                <div className="flex gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">Thema</h4>
                    <Badge variant="secondary" className={themeStyles[selectedInsight.theme || ""] || "bg-muted"}>
                      {selectedInsight.theme || "Geen"}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">Impact</h4>
                    <Badge variant="outline">{selectedInsight.impact_score || "Onbekend"}</Badge>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">Frequentie</h4>
                    <Badge variant="outline">{selectedInsight.frequency || 1}x</Badge>
                  </div>
                </div>

                {/* Persona reference */}
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

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    className="flex-1"
                    onClick={() => {
                      handleValidate(selectedInsight);
                      setSelectedInsight(null);
                    }}
                    disabled={validatingIds.has(selectedInsight.id)}
                  >
                    {validatingIds.has(selectedInsight.id) ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Target className="h-4 w-4 mr-2" />
                    )}
                    Valideer met AI
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleSkip(selectedInsight.id);
                      setSelectedInsight(null);
                    }}
                  >
                    <SkipForward className="h-4 w-4 mr-2" />
                    Overslaan
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
