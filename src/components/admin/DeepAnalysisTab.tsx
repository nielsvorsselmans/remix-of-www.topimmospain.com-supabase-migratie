import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Brain, Check, AlertTriangle, X, RefreshCw, Save, ChevronDown, ChevronUp, Database, MapPin, Home, TrendingUp, Settings, Wand2, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { DeepAnalysisSettingsDialog } from "./DeepAnalysisSettingsDialog";
import { useDeepAnalysisConfig } from "@/hooks/useDeepAnalysisConfig";

interface DataSourcesStatus {
  project: boolean;
  properties: number;
  locationIntelligence: boolean;
  rentalData: number;
}

export interface StructuredDeepAnalysis {
  personas: {
    vakantie: { title: string; description: string; highlights: string[] };
    investering: { title: string; description: string; highlights: string[]; estimatedYield: string; yieldNote: string };
    wonen: { title: string; description: string; highlights: string[] };
  };
  unfairAdvantage: { headline: string; details: string[] };
  goldenNuggets: string[];
  warnings: Array<{ text: string; severity: "info" | "warning" }>;
  audienceScores: { investor: string; holidaymaker: string; permanent: string };
}

interface DeepAnalysisTabProps {
  projectId: string;
  projectName: string;
  latitude?: number | null;
  longitude?: number | null;
  existingAnalysis?: string | null;
  existingStructured?: StructuredDeepAnalysis | null;
  analysisUpdatedAt?: string | null;
  onSave?: () => void;
}

export function DeepAnalysisTab({
  projectId,
  projectName,
  latitude,
  longitude,
  existingAnalysis,
  existingStructured,
  analysisUpdatedAt,
  onSave
}: DeepAnalysisTabProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isStructuring, setIsStructuring] = useState(false);
  const [brainstormOutput, setBrainstormOutput] = useState<string>(existingAnalysis || "");
  const [savedBaseline, setSavedBaseline] = useState<string>(existingAnalysis || "");
  const [structuredData, setStructuredData] = useState<StructuredDeepAnalysis | null>(existingStructured || null);
  const [showStructuredPreview, setShowStructuredPreview] = useState(false);
  const [contextData, setContextData] = useState<Record<string, unknown> | null>(null);
  const [dataSourcesStatus, setDataSourcesStatus] = useState<DataSourcesStatus | null>(null);
  const [showContextData, setShowContextData] = useState(false);
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<string | null>(analysisUpdatedAt || null);
  const [showSettings, setShowSettings] = useState(false);

  const { data: config } = useDeepAnalysisConfig();

  const hasCoordinates = latitude && longitude;
  const hasChanges = brainstormOutput !== savedBaseline;
  
  // Get model short name for display
  const modelShortName = config?.model_id?.split('/')[1] || "gemini-2.5-pro";

  // Load data sources status on mount
  useEffect(() => {
    const checkDataSources = async () => {
      try {
        // Check properties count
        const { count: propertiesCount } = await supabase
          .from("properties")
          .select("*", { count: "exact", head: true })
          .eq("project_id", projectId);

        // Check location intelligence
        const { data: projectData } = await supabase
          .from("projects")
          .select("location_intelligence")
          .eq("id", projectId)
          .single();

        // Check rental cache
        const { count: rentalCount } = await supabase
          .from("rental_comparables_cache")
          .select("*", { count: "exact", head: true })
          .eq("project_id", projectId);

        const locationIntel = projectData?.location_intelligence as Record<string, unknown> | null;
        const hasLocationData = !!(locationIntel?.nearbyAmenities && 
          Object.keys(locationIntel.nearbyAmenities as Record<string, unknown>).length > 0);

        setDataSourcesStatus({
          project: true,
          properties: propertiesCount || 0,
          locationIntelligence: hasLocationData,
          rentalData: rentalCount || 0
        });
      } catch (error) {
        console.error("Error checking data sources:", error);
      }
    };

    checkDataSources();
  }, [projectId]);

  const handleStartAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-project-deep", {
        body: { projectId, saveToDatabase: false }
      });

      if (error) throw error;

      if (data.error) {
        if (data.error.includes("Rate limit")) {
          toast.error("Rate limit bereikt", { description: "Probeer het over enkele minuten opnieuw." });
        } else if (data.error.includes("credits")) {
          toast.error("AI credits op", { description: "Voeg credits toe aan je workspace." });
        } else {
          throw new Error(data.error);
        }
        return;
      }

      setBrainstormOutput(data.brainstormInsights);
      setContextData(data.contextData);
      setDataSourcesStatus(data.dataSourcesStatus);
      toast.success("Analyse voltooid!", { description: "Review de output en sla op indien gewenst." });
    } catch (error) {
      console.error("Deep analysis error:", error);
      toast.error("Analyse mislukt", { 
        description: error instanceof Error ? error.message : "Onbekende fout" 
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("projects")
        .update({
          deep_analysis_brainstorm: brainstormOutput,
          deep_analysis_updated_at: new Date().toISOString()
        })
        .eq("id", projectId);

      if (error) throw error;

      // Update baseline zodat hasChanges = false wordt
      setSavedBaseline(brainstormOutput);
      setLastAnalyzedAt(new Date().toISOString());
      toast.success("Analyse opgeslagen!");
      onSave?.();
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Opslaan mislukt");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setBrainstormOutput(savedBaseline);
  };

  const handleStructure = async () => {
    if (!savedBaseline) {
      toast.error("Sla eerst de analyse op voordat je structureert");
      return;
    }
    
    setIsStructuring(true);
    try {
      const { data, error } = await supabase.functions.invoke("structure-deep-analysis", {
        body: { projectId, brainstormText: savedBaseline }
      });

      if (error) throw error;

      if (data.error) {
        if (data.error.includes("Rate limit")) {
          toast.error("Rate limit bereikt", { description: "Probeer het over enkele minuten opnieuw." });
        } else if (data.error.includes("credits")) {
          toast.error("AI credits op", { description: "Voeg credits toe aan je workspace." });
        } else {
          throw new Error(data.error);
        }
        return;
      }

      setStructuredData(data.structured);
      setShowStructuredPreview(true);
      toast.success("Analyse gestructureerd!", { description: "De data is opgeslagen en beschikbaar op de detailpagina." });
      onSave?.();
    } catch (error) {
      console.error("Structure error:", error);
      toast.error("Structureren mislukt", { 
        description: error instanceof Error ? error.message : "Onbekende fout" 
      });
    } finally {
      setIsStructuring(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Deep Analysis</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {modelShortName}
              </Badge>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setShowSettings(true);
            }}
            className="h-8 w-8"
          >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <CardDescription>
            Grondige analyse van {projectName} met alle beschikbare data
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Settings Dialog */}
      <DeepAnalysisSettingsDialog 
        open={showSettings} 
        onOpenChange={setShowSettings} 
      />

      {/* Data Sources Status */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Database className="h-4 w-4" />
            Data Bronnen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Project Data */}
            <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
              <Check className="h-4 w-4 text-green-500" />
              <span className="text-sm">Project Data</span>
            </div>

            {/* Properties */}
            <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
              {dataSourcesStatus?.properties ? (
                <>
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">
                    <Home className="h-3 w-3 inline mr-1" />
                    {dataSourcesStatus.properties} types
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="text-sm text-muted-foreground">Properties</span>
                </>
              )}
            </div>

            {/* Location Intelligence */}
            <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
              {hasCoordinates ? (
                dataSourcesStatus?.locationIntelligence ? (
                  <>
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">
                      <MapPin className="h-3 w-3 inline mr-1" />
                      Location Intel
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span className="text-sm text-muted-foreground">
                      Location Intel
                    </span>
                  </>
                )
              ) : (
                <>
                  <X className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-muted-foreground">Geen coördinaten</span>
                </>
              )}
            </div>

            {/* Rental Data */}
            <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
              {dataSourcesStatus?.rentalData ? (
                <>
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">
                    <TrendingUp className="h-3 w-3 inline mr-1" />
                    {dataSourcesStatus.rentalData} verhuur
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="text-sm text-muted-foreground">Verhuur Data</span>
                </>
              )}
            </div>
          </div>

          {/* Start Analysis Button */}
          <div className="mt-4 flex items-center gap-3">
            <Button 
              onClick={handleStartAnalysis} 
              disabled={isAnalyzing}
              className="gap-2"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Analyseren...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4" />
                  Start Deep Analysis
                </>
              )}
            </Button>

            {lastAnalyzedAt && (
              <span className="text-xs text-muted-foreground">
                Laatste analyse: {format(new Date(lastAnalyzedAt), "d MMM yyyy 'om' HH:mm", { locale: nl })}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Brainstorm Output */}
      {(brainstormOutput || existingAnalysis) && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Analyse Output</CardTitle>
              <div className="flex items-center gap-2">
                {hasChanges && (
                  <Badge variant="secondary" className="text-xs">
                    Niet opgeslagen
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  disabled={!hasChanges}
                  className="h-7 text-xs"
                >
                  Reset
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              value={brainstormOutput}
              onChange={(e) => setBrainstormOutput(e.target.value)}
              className="min-h-[400px] font-mono text-sm leading-relaxed whitespace-pre-wrap break-words"
              placeholder="De analyse output verschijnt hier..."
            />

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button
                onClick={handleSave}
                disabled={isSaving || !brainstormOutput}
                className="gap-2"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Opslaan...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Opslaan
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={handleStartAnalysis}
                disabled={isAnalyzing}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Opnieuw Analyseren
              </Button>

              <div className="w-px h-6 bg-border" />

              <Button
                variant="secondary"
                onClick={handleStructure}
                disabled={isStructuring || hasChanges || !savedBaseline}
                className="gap-2"
                title={hasChanges ? "Sla eerst de analyse op" : structuredData ? "Herstructureer de data" : "Structureer voor de website"}
              >
                {isStructuring ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Structureren...
                  </>
                ) : structuredData ? (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Opnieuw Structureren
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4" />
                    Structureer voor website
                  </>
                )}
              </Button>

              {structuredData && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Globe className="h-3 w-3" />
                  Live op detailpagina
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Context Data Debug */}
      {contextData && (
        <Collapsible open={showContextData} onOpenChange={setShowContextData}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Context Data (Debug)
                  </CardTitle>
                  {showContextData ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
                <CardDescription className="text-xs">
                  De data die naar de AI is gestuurd
                </CardDescription>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <pre className="text-xs bg-muted p-4 rounded-md overflow-auto max-h-[400px]">
                  {JSON.stringify(contextData, null, 2)}
                </pre>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Structured Data Preview */}
      {structuredData && (
        <Collapsible open={showStructuredPreview} onOpenChange={setShowStructuredPreview}>
          <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-green-100/50 dark:hover:bg-green-900/20 transition-colors pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Globe className="h-4 w-4 text-green-600" />
                    Gestructureerde Data (Live op website)
                  </CardTitle>
                  {showStructuredPreview ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
                <CardDescription className="text-xs">
                  Deze data wordt getoond op de detailpagina
                </CardDescription>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-4">
                {/* Personas Preview */}
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground">Personas</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {Object.entries(structuredData.personas).map(([key, persona]) => (
                      <div key={key} className="p-3 bg-white dark:bg-background rounded-md border">
                        <p className="font-medium text-sm">{persona.title}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{persona.description}</p>
                        {key === "investering" && "estimatedYield" in persona && (
                          <Badge variant="secondary" className="mt-2 text-xs">
                            {persona.estimatedYield} rendement
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Golden Nuggets */}
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground">Golden Nuggets</h4>
                  <div className="flex flex-wrap gap-2">
                    {structuredData.goldenNuggets.map((nugget, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {nugget}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Audience Scores */}
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground">Doelgroep Scores</h4>
                  <div className="flex gap-4">
                    <span className="text-xs">
                      Investor: <Badge variant={structuredData.audienceScores.investor === "hoog" ? "default" : "secondary"} className="text-xs ml-1">{structuredData.audienceScores.investor}</Badge>
                    </span>
                    <span className="text-xs">
                      Vakantie: <Badge variant={structuredData.audienceScores.holidaymaker === "hoog" ? "default" : "secondary"} className="text-xs ml-1">{structuredData.audienceScores.holidaymaker}</Badge>
                    </span>
                    <span className="text-xs">
                      Wonen: <Badge variant={structuredData.audienceScores.permanent === "hoog" ? "default" : "secondary"} className="text-xs ml-1">{structuredData.audienceScores.permanent}</Badge>
                    </span>
                  </div>
                </div>

                {/* Warnings */}
                {structuredData.warnings.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground">Waarschuwingen</h4>
                    <div className="space-y-1">
                      {structuredData.warnings.map((warning, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <AlertTriangle className={`h-3 w-3 mt-0.5 ${warning.severity === "warning" ? "text-amber-500" : "text-blue-500"}`} />
                          <span>{warning.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
    </div>
  );
}
