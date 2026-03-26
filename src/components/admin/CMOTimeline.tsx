import { useState } from "react";
import { Brain, CheckCircle, AlertTriangle, TrendingUp, ChevronDown, FileText, Loader2, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAllWeeklyReports, type WeeklyReport, type WeeklyReportData } from "@/hooks/useWeeklyReports";

function statusIcon(status: string) {
  switch (status) {
    case "completed": return <CheckCircle className="h-4 w-4 text-green-600" />;
    case "partial": return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    case "failed": return <XCircle className="h-4 w-4 text-destructive" />;
    case "generating": return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    default: return <FileText className="h-4 w-4 text-muted-foreground" />;
  }
}

function statusText(status: string, data: WeeklyReportData) {
  const total = data.weekly_plan?.length || 0;
  const created = data.articles_created || 0;
  switch (status) {
    case "completed": return `Voltooid (${created}/${total} artikelen)`;
    case "partial": return `Deels voltooid (${created}/${total} artikelen)`;
    case "failed": return "Mislukt";
    case "generating": return `Wordt geschreven (${created}/${total})...`;
    case "approved": return "Goedgekeurd — wacht op generatie";
    default: return "Concept";
  }
}

function categoryColor(cat: string) {
  const map: Record<string, string> = {
    financiering: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    juridisch: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    regio: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    rendement: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    proces: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
    lifestyle: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  };
  return map[cat.toLowerCase()] || "bg-muted text-muted-foreground";
}

function ReportTimelineCard({ report, defaultOpen }: { report: WeeklyReport; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const data = report.report_data;
  const completedIndices: number[] = (data as any).completed_indices || [];
  const weekLabel = new Date(report.week_start).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="relative pl-8">
      {/* Timeline dot */}
      <div className="absolute left-0 top-4 flex h-6 w-6 items-center justify-center rounded-full border-2 border-primary/30 bg-background">
        {statusIcon(report.status)}
      </div>

      <Collapsible open={open} onOpenChange={setOpen}>
        <Card className="border-l-0">
          <CollapsibleTrigger asChild>
            <button className="w-full text-left p-4 flex items-center justify-between gap-3 hover:bg-muted/50 transition-colors rounded-t-lg">
              <div className="flex items-center gap-3 min-w-0">
                <div>
                  <p className="font-medium text-sm">Week van {weekLabel}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {statusText(report.status, data)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {(data.content_gaps?.length || 0) > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {data.content_gaps.length} gaps
                  </Badge>
                )}
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
              </div>
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="p-4 pt-0 space-y-4">
              {/* Articles */}
              {data.weekly_plan && data.weekly_plan.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <FileText className="h-3 w-3" /> Geplande artikelen
                  </p>
                  <ul className="space-y-1.5">
                    {data.weekly_plan.map((item, i) => {
                      const isCompleted = completedIndices.includes(i) || report.status === "completed";
                      return (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          {isCompleted ? (
                            <CheckCircle className="h-3.5 w-3.5 text-green-600 mt-0.5 shrink-0" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-muted-foreground/40 mt-0.5 shrink-0" />
                          )}
                          <span className={isCompleted ? "" : "text-muted-foreground"}>
                            {item.title}
                          </span>
                          {item.linkedin_archetype && (
                            <Badge variant="outline" className="text-[10px] shrink-0">
                              {item.linkedin_archetype === "engagement" ? "🔥" : item.linkedin_archetype === "authority" ? "👑" : "📚"}
                            </Badge>
                          )}
                          <Badge className={`text-[10px] ml-auto shrink-0 ${categoryColor(item.category)}`}>
                            {item.category}
                          </Badge>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Content Gaps */}
              {data.content_gaps && data.content_gaps.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> Geïdentificeerde gaps
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {data.content_gaps.map((gap, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs bg-muted/50 rounded-md px-2 py-1">
                        <Badge className={`text-[10px] ${categoryColor(gap.category)}`}>
                          {gap.category}
                        </Badge>
                        <span className="text-muted-foreground">score {gap.opportunity_score <= 1 ? Math.round(gap.opportunity_score * 10) : Math.round(gap.opportunity_score)}/10</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Refresh candidates */}
              {data.refresh_candidates && data.refresh_candidates.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  🔄 {data.refresh_candidates.length} artikel(en) gemarkeerd voor verversing
                </p>
              )}

              {/* CMO Feedback */}
              {data.cmo_feedback && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                    <Brain className="h-3 w-3" /> CMO Feedback
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                    {data.cmo_feedback}
                  </p>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}

export function CMOTimeline() {
  const { data: reports, isLoading } = useAllWeeklyReports();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!reports || reports.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Brain className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p className="text-sm">Nog geen beslissingen. Genereer je eerste weekrapport.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Timeline line */}
      <div className="relative">
        <div className="absolute left-[11px] top-0 bottom-0 w-px bg-border" />
        <div className="space-y-4">
          {reports.map((report, i) => (
            <ReportTimelineCard key={report.id} report={report} defaultOpen={i < 2} />
          ))}
        </div>
      </div>
    </div>
  );
}
