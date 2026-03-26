import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Search, TrendingUp, ChevronDown, Plus, BarChart3 } from "lucide-react";
import { useState } from "react";


interface SeoResearchData {
  keyword?: string;
  search_volume?: number;
  cpc?: number;
  competition?: number;
  competition_level?: string;
  related_keywords?: { keyword: string; search_volume: number }[];
}

interface SeoDataPanelProps {
  seoResearch: SeoResearchData | null;
  isLoading?: boolean;
  onAddKeyword?: (keyword: string) => void;
}

export function SeoDataPanel({ seoResearch, isLoading, onAddKeyword }: SeoDataPanelProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (isLoading) {
    return (
      <Card className="border-dashed border-primary/30 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex items-center gap-2 text-sm text-primary animate-pulse">
            <Search className="h-4 w-4 animate-spin" />
            DataForSEO marktdata ophalen...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!seoResearch) return null;

  const competitionColor = (level?: string) => {
    if (!level) return "text-muted-foreground";
    if (level === "LOW") return "text-green-600 dark:text-green-400";
    if (level === "MEDIUM") return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5 text-primary" />
                SEO Marktdata
                {seoResearch.search_volume != null && (
                  <Badge variant="secondary" className="text-xs ml-2">
                    {seoResearch.search_volume.toLocaleString()} zoekvolume/mnd
                  </Badge>
                )}
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Primary keyword metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MetricCard
                label="Zoekvolume"
                value={seoResearch.search_volume?.toLocaleString() ?? "—"}
                icon={<TrendingUp className="h-3.5 w-3.5" />}
              />
              <MetricCard
                label="CPC"
                value={seoResearch.cpc != null ? `€${seoResearch.cpc.toFixed(2)}` : "—"}
                icon={<span className="text-xs font-bold">€</span>}
              />
              <MetricCard
                label="Concurrentie"
                value={seoResearch.competition_level || "—"}
                icon={<BarChart3 className="h-3.5 w-3.5" />}
                valueClassName={competitionColor(seoResearch.competition_level)}
              />
              <MetricCard
                label="Score"
                value={seoResearch.competition != null ? `${(seoResearch.competition * 100).toFixed(0)}%` : "—"}
                icon={<Search className="h-3.5 w-3.5" />}
              />
            </div>

            {/* Related keywords */}
            {seoResearch.related_keywords?.length ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Gerelateerde keywords</p>
                <div className="flex flex-wrap gap-1.5">
                  {seoResearch.related_keywords.map((rk, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="text-xs cursor-pointer hover:bg-primary/10 transition-colors group"
                      onClick={() => onAddKeyword?.(rk.keyword)}
                    >
                      {rk.keyword}
                      <span className="text-muted-foreground ml-1">
                        ({rk.search_volume?.toLocaleString()})
                      </span>
                      {onAddKeyword && (
                        <Plus className="h-2.5 w-2.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function MetricCard({ label, value, icon, valueClassName }: {
  label: string;
  value: string;
  icon: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-md border p-2 text-center">
      <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
        {icon}
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-sm font-semibold ${valueClassName || ""}`}>{value}</p>
    </div>
  );
}
