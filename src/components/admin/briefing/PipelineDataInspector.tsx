import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Database, Clock, Cpu } from "lucide-react";

interface PipelineDataInspectorProps {
  stepLabel: string;
  modelId?: string;
  modelLabel?: string;
  seoResearchAvailable?: boolean;
  seoSearchVolume?: number;
  inputSummary?: Record<string, string | number | boolean | null>;
  rawBrainstorm?: string;
  briefingId?: string;
}

export function PipelineDataInspector({
  stepLabel,
  modelId,
  modelLabel,
  seoResearchAvailable,
  seoSearchVolume,
  inputSummary,
  rawBrainstorm,
  briefingId,
}: PipelineDataInspectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const hasData = modelId || inputSummary || rawBrainstorm || seoResearchAvailable != null;
  if (!hasData) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center justify-between rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground hover:bg-muted/50 transition-colors">
          <span className="flex items-center gap-1.5">
            <Database className="h-3 w-3" />
            Pipeline data — {stepLabel}
          </span>
          <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <Card className="mt-1 bg-muted/30">
          <CardContent className="py-3 space-y-3 text-xs">
            {/* Model info */}
            {modelId && (
              <div className="flex items-center gap-2">
                <Cpu className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Model:</span>
                <Badge variant="secondary" className="text-[10px]">
                  {modelLabel || modelId}
                </Badge>
              </div>
            )}

            {/* SEO research status */}
            {seoResearchAvailable != null && (
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">SEO research:</span>
                <Badge variant={seoResearchAvailable ? "default" : "outline"} className="text-[10px]">
                  {seoResearchAvailable
                    ? `Ja${seoSearchVolume != null ? ` (${seoSearchVolume.toLocaleString()} vol.)` : ""}`
                    : "Niet opgehaald"}
                </Badge>
              </div>
            )}

            {/* Briefing ID */}
            {briefingId && (
              <div className="flex items-center gap-2">
                <Database className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Briefing ID:</span>
                <code className="bg-muted px-1 rounded text-[10px] font-mono">{briefingId.slice(0, 8)}…</code>
              </div>
            )}

            {/* Input summary */}
            {inputSummary && Object.keys(inputSummary).length > 0 && (
              <div className="space-y-1">
                <p className="text-muted-foreground font-medium">Input context:</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                  {Object.entries(inputSummary).map(([key, val]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-muted-foreground">{key}:</span>
                      <span className="font-mono">{String(val ?? "—")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Raw brainstorm excerpt */}
            {rawBrainstorm && (
              <div className="space-y-1">
                <p className="text-muted-foreground font-medium">Raw AI output (excerpt):</p>
                <pre className="bg-muted rounded p-2 text-[10px] max-h-32 overflow-y-auto whitespace-pre-wrap font-mono">
                  {rawBrainstorm.slice(0, 1000)}
                  {rawBrainstorm.length > 1000 && "…"}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}
