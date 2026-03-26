import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChevronLeft, ChevronRight, PenLine, Globe, Target, Lightbulb,
  ExternalLink, Loader2, CheckCircle2,
} from "lucide-react";

interface CompetitiveAnalysis {
  content_gaps?: string[];
  competitive_advantage?: string;
  positioning_tip?: string;
}

interface SerpResult {
  title: string;
  url: string;
  snippet: string;
}

interface CompetitiveAnalysisStepProps {
  serpResults: SerpResult[];
  competitiveAnalysis: CompetitiveAnalysis | null;
  onBack: () => void;
  onWriteArticle: () => void;
  onApplyGaps: () => void;
  gapsApplied: boolean;
  loading: boolean;
}

export function CompetitiveAnalysisStep({
  serpResults,
  competitiveAnalysis,
  onBack,
  onWriteArticle,
  onApplyGaps,
  gapsApplied,
  loading,
}: CompetitiveAnalysisStepProps) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold">Stap 3: Concurrentiepositie</h3>
        <p className="text-sm text-muted-foreground">
          Bekijk wat de concurrentie doet en hoe jij je kunt onderscheiden
        </p>
      </div>

      {/* SERP Results */}
      {serpResults.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-primary" />
              Top {serpResults.length} Google resultaten
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {serpResults.map((result, i) => (
              <div key={i} className="rounded-md border p-2.5 text-xs space-y-0.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-foreground line-clamp-1">
                    {i + 1}. {result.title}
                  </span>
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-muted-foreground hover:text-primary"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <p className="text-muted-foreground line-clamp-2">{result.snippet}</p>
                <p className="text-muted-foreground/60 truncate">{result.url}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Competitive Analysis */}
      {competitiveAnalysis && (
        <div className="space-y-3">
          {/* Competitive Advantage */}
          {competitiveAnalysis.competitive_advantage && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5 text-primary">
                  <Target className="h-3.5 w-3.5" />
                  Ons voordeel
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground">
                  {competitiveAnalysis.competitive_advantage}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Content Gaps */}
          {competitiveAnalysis.content_gaps?.length ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                  Content gaps bij concurrenten
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-1.5">
                  {competitiveAnalysis.content_gaps.map((gap, i) => (
                    <li key={i} className="text-sm text-foreground flex items-start gap-2">
                      <Lightbulb className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                      {gap}
                    </li>
                  ))}
                </ul>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onApplyGaps}
                  disabled={gapsApplied}
                  className="w-full"
                >
                  {gapsApplied ? (
                    <><CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-primary" />Verwerkt in briefing</>
                  ) : (
                    <><Target className="h-3.5 w-3.5 mr-1.5" />Verwerk gaps in briefing</>
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {/* Positioning Tip */}
          {competitiveAnalysis.positioning_tip && (
            <Card className="border-dashed">
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">💡 Schrijftip:</span>{" "}
                  {competitiveAnalysis.positioning_tip}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!competitiveAnalysis && serpResults.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Geen concurrentiedata beschikbaar. Ga verder naar het schrijven van het artikel.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Terug
        </Button>
        <Button onClick={onWriteArticle} disabled={loading}>
          {loading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Schrijven...</>
          ) : (
            <><PenLine className="h-4 w-4 mr-2" />Schrijf Artikel</>
          )}
        </Button>
      </div>
    </div>
  );
}
