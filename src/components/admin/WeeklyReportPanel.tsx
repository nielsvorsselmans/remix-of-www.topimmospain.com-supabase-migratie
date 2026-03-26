import { useState, useEffect, useRef } from "react";
import { CMOTimeline } from "@/components/admin/CMOTimeline";
import { Brain, Sparkles, CheckCircle, AlertTriangle, TrendingUp, FileText, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  useWeeklyReports,
  useGenerateWeeklyReport,
  useApproveWeeklyReport,
  useRetryWeeklyReport,
  useResetWeeklyReport,
  type WeeklyReport,
  type WeeklyPlanItem,
} from "@/hooks/useWeeklyReports";

const dayOrder = ["maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag"];

function categoryColor(cat: string) {
  const map: Record<string, string> = {
    financiering: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    juridisch: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    regio: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    rendement: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    proces: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
    lifestyle: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
    duurzaamheid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
    belasting: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };
  return map[cat.toLowerCase()] || "bg-muted text-muted-foreground";
}

function WeekPlanView({ items }: { items: WeeklyPlanItem[] }) {
  const sorted = [...items].sort(
    (a, b) => dayOrder.indexOf(a.suggested_day) - dayOrder.indexOf(b.suggested_day)
  );

  return (
    <div className="space-y-3">
      {sorted.map((item, i) => (
        <Card key={i} className="border-l-4 border-l-primary/60">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs capitalize font-medium">
                    {item.suggested_day}
                  </Badge>
                  <Badge className={`text-xs ${categoryColor(item.category)}`}>
                    {item.category}
                  </Badge>
                  {item.search_volume && (
                    <span className="text-xs text-muted-foreground">
                      {item.search_volume.toLocaleString()} zoek/mnd
                    </span>
                  )}
                </div>
                 <p className="font-medium text-sm">{item.title}</p>
                 {item.linkedin_archetype && (
                   <Badge variant="outline" className="text-[10px] mt-1 w-fit">
                     {item.linkedin_archetype === "engagement" ? "🔥" : item.linkedin_archetype === "authority" ? "👑" : "📚"}{" "}
                     {item.linkedin_archetype.charAt(0).toUpperCase() + item.linkedin_archetype.slice(1)}
                   </Badge>
                 )}
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="font-medium">Keyword:</span> {item.keyword}
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Reden:</span> {item.priority_reason}
                </p>
                {item.source_question && (
                  <p className="text-xs text-muted-foreground italic mt-0.5">
                    Bron: "{item.source_question}"
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">Geen artikelen in het weekplan.</p>
      )}
    </div>
  );
}

function statusLabel(status: string) {
  switch (status) {
    case "generating": return "Wordt geschreven...";
    case "completed": return "Voltooid";
    case "partial": return "Deels voltooid";
    case "failed": return "Mislukt";
    case "approved": return "Goedgekeurd";
    default: return "Concept";
  }
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "completed": return "default";
    case "generating": return "outline";
    case "partial": return "secondary";
    case "failed": return "destructive";
    default: return "secondary";
  }
}

function ReportDetail({ report, onNavigateToPublish }: { report: WeeklyReport; onNavigateToPublish?: () => void }) {
  const approve = useApproveWeeklyReport();
  const retry = useRetryWeeklyReport();
  const reset = useResetWeeklyReport();
  const data = report.report_data;
  const articleCount = data.weekly_plan?.length || 0;
  const articlesCreated = data.articles_created || 0;
  const isGenerating = report.status === "generating";
  const isDone = report.status === "completed" || report.status === "partial";
  const prevStatusRef = useRef(report.status);

  // Show toast when status transitions from generating to done
  useEffect(() => {
    if (prevStatusRef.current === "generating" && isDone) {
      if (report.status === "completed") {
        toast.success(`${articlesCreated} artikelen geschreven en ingepland!`);
      } else if (report.status === "partial") {
        toast.warning(`${articlesCreated}/${articleCount} artikelen geschreven. Sommige zijn mislukt.`);
      }
    }
    prevStatusRef.current = report.status;
  }, [report.status, articlesCreated, articleCount, isDone]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={statusVariant(report.status)}>
            {isGenerating && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
            {statusLabel(report.status)}
          </Badge>
          <span className="text-sm text-muted-foreground">
            Week van {new Date(report.week_start).toLocaleDateString("nl-NL", { day: "numeric", month: "long" })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isDone && onNavigateToPublish && (
            <Button size="sm" variant="outline" onClick={onNavigateToPublish}>
              <FileText className="h-4 w-4 mr-1" />
              Bekijk concepten
            </Button>
          )}
          {isDone && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => reset.mutate(report.id)}
              disabled={reset.isPending}
            >
              {reset.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              Herschrijf artikelen
            </Button>
          )}
          {report.status === "draft" && (
            <Button
              size="sm"
              onClick={() => approve.mutate(report.id)}
              disabled={approve.isPending}
            >
              {approve.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-1" />
              )}
              Keur plan goed
            </Button>
          )}
        </div>
      </div>

      {isGenerating && (
        <Card className={`border-primary/30 ${report.is_stale ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300/50' : 'bg-primary/5'}`}>
          <CardContent className="p-4">
            {report.is_stale ? (
              <>
                <div className="flex items-center gap-3 mb-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <p className="text-sm font-medium">
                    Generatie lijkt vastgelopen ({articlesCreated}/{articleCount} artikelen)
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Het proces is langer dan 15 minuten bezig. Je kunt de resterende artikelen opnieuw proberen.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => retry.mutate(report.id)}
                  disabled={retry.isPending}
                >
                  {retry.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                  Opnieuw proberen
                </Button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <p className="text-sm font-medium">
                    {articlesCreated}/{articleCount} artikelen geschreven...
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  Dit gebeurt op de achtergrond. Je kunt gerust verder werken.
                </p>
                <Progress value={articleCount > 0 ? (articlesCreated / articleCount) * 100 : 0} className="h-2" />
              </>
            )}
          </CardContent>
        </Card>
      )}

      {(report.status === "partial" || report.status === "failed") && (
        <Card className="border-amber-300/50 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="p-4">
            {data.errors && data.errors.length > 0 && (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <p className="text-sm font-medium">{data.errors.length} fouten bij het genereren</p>
                </div>
                <ul className="text-xs text-muted-foreground space-y-1 mb-3">
                  {data.errors.map((err, i) => (
                    <li key={i}>• {err}</li>
                  ))}
                </ul>
              </>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => retry.mutate(report.id)}
              disabled={retry.isPending}
            >
              {retry.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
              Mislukte artikelen opnieuw proberen
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="weekplan" className="space-y-3">
        <TabsList className="grid w-full grid-cols-4 h-auto">
          <TabsTrigger value="weekplan" className="text-xs py-2">
            📅 Weekplan ({articleCount})
          </TabsTrigger>
          <TabsTrigger value="gaps" className="text-xs py-2">
            🔍 Gaps ({data.content_gaps?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="refresh" className="text-xs py-2">
            🔄 Refresh ({data.refresh_candidates?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="feedback" className="text-xs py-2">
            💡 Feedback
          </TabsTrigger>
        </TabsList>

        <TabsContent value="weekplan">
          <WeekPlanView items={data.weekly_plan || []} />
        </TabsContent>

        <TabsContent value="gaps">
          <div className="space-y-3">
            {(data.content_gaps || []).map((gap, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <Badge className={categoryColor(gap.category)}>{gap.category}</Badge>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-amber-500" />
                      <span className="text-xs font-medium">Score: {gap.opportunity_score <= 1 ? Math.round(gap.opportunity_score * 10) : Math.round(gap.opportunity_score)}/10</span>
                    </div>
                  </div>
                  <p className="text-sm mt-2">{gap.description}</p>
                  {gap.missing_count && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {gap.missing_count} ontbrekende artikelen
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
            {(data.content_gaps || []).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Geen content gaps gevonden.</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="refresh">
          <div className="space-y-3">
            {(data.refresh_candidates || []).map((item, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <p className="font-medium text-sm">{item.title}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {item.reasons.map((r, j) => (
                      <Badge key={j} variant="outline" className="text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1 text-amber-500" />
                        {r}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    <span className="font-medium">Actie:</span> {item.suggested_action}
                  </p>
                </CardContent>
              </Card>
            ))}
            {(data.refresh_candidates || []).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Geen refresh-kandidaten.</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="feedback">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Brain className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <p className="text-sm whitespace-pre-line">{data.cmo_feedback || "Geen feedback beschikbaar."}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function WeeklyReportPanel({ onNavigateToPublish }: { onNavigateToPublish?: () => void }) {
  const { data: reports, isLoading } = useWeeklyReports();
  const generate = useGenerateWeeklyReport();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [subTab, setSubTab] = useState("huidig");

  const latestReport = reports?.[selectedIndex];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-lg">AI CMO Weekrapport</CardTitle>
                <CardDescription>
                  Wekelijks SEO-gedreven content plan met gap-analyse en strategische feedback
                </CardDescription>
              </div>
            </div>
            <Button
              onClick={() => generate.mutate()}
              disabled={generate.isPending}
              size="sm"
            >
              {generate.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-1" />
              )}
              {generate.isPending ? "Genereert..." : "Genereer rapport"}
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={subTab} onValueChange={setSubTab} className="space-y-4">
            <TabsList className="grid w-full max-w-xs grid-cols-2 h-auto">
              <TabsTrigger value="huidig" className="text-xs py-2">
                📋 Huidig rapport
              </TabsTrigger>
              <TabsTrigger value="timeline" className="text-xs py-2">
                📊 Beslissingen
              </TabsTrigger>
            </TabsList>

            <TabsContent value="huidig">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !latestReport ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Nog geen rapporten. Genereer je eerste weekrapport.</p>
                </div>
              ) : (
                <>
                  {reports && reports.length > 1 && (
                    <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                      {reports.slice(0, 5).map((r, i) => (
                        <Button
                          key={r.id}
                          variant={i === selectedIndex ? "default" : "outline"}
                          size="sm"
                          className="text-xs whitespace-nowrap"
                          onClick={() => setSelectedIndex(i)}
                        >
                          Week {new Date(r.week_start).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
                          {r.status === "completed" && <CheckCircle className="h-3 w-3 ml-1" />}
                          {r.status === "generating" && <Loader2 className="h-3 w-3 ml-1 animate-spin" />}
                        </Button>
                      ))}
                    </div>
                  )}
                  <ReportDetail report={latestReport} onNavigateToPublish={onNavigateToPublish} />
                </>
              )}
            </TabsContent>

            <TabsContent value="timeline">
              <CMOTimeline />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
