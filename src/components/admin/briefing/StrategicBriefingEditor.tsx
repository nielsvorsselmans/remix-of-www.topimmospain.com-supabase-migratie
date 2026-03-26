import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Loader2, Lightbulb, FileText, MapPin, MessageSquare, AlertCircle, ArrowLeft } from "lucide-react";
import { StrategicAngleCard, type StrategicAngle } from "./StrategicAngleCard";
import { SpecsAccordion, type SpecItem } from "./SpecsAccordion";
import type { StrategicBriefingState } from "@/pages/admin/ProjectBriefing";

interface StrategicBriefingEditorProps {
  briefingState: StrategicBriefingState;
  onStateChange: (state: StrategicBriefingState) => void;
  projectName: string;
  onSubmit: () => void;
  onBackToReview?: () => void;
  isGenerating?: boolean;
}

export function StrategicBriefingEditor({ 
  briefingState, 
  onStateChange,
  projectName,
  onSubmit,
  onBackToReview,
  isGenerating = false
}: StrategicBriefingEditorProps) {
  const analysisResult = briefingState.analysisResult;
  
  if (!analysisResult) {
    return null;
  }

  const handleAngleSelect = (angle: StrategicAngle) => {
    onStateChange({
      ...briefingState,
      selectedAngle: briefingState.selectedAngle?.id === angle.id ? null : angle,
    });
  };

  const handleToggleSpec = (specText: string) => {
    const currentSpecs = briefingState.selectedSpecs;
    const updated = currentSpecs.includes(specText)
      ? currentSpecs.filter(s => s !== specText)
      : [...currentSpecs, specText];
    onStateChange({
      ...briefingState,
      selectedSpecs: updated,
    });
  };

  // Validation: need angle, some context, and CTA
  const isComplete = 
    briefingState.selectedAngle !== null &&
    briefingState.editedContextNotes.trim().length > 0 &&
    briefingState.ctaKeyword.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* LAYER 1: Strategic Angles */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Kies je Strategie
          </CardTitle>
          <CardDescription>
            Selecteer de invalshoek die het beste past bij dit project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {analysisResult.strategicAngles.map((angle) => (
              <StrategicAngleCard
                key={angle.id}
                angle={angle}
                isSelected={briefingState.selectedAngle?.id === angle.id}
                onSelect={() => handleAngleSelect(angle)}
              />
            ))}
          </div>
          {!briefingState.selectedAngle && (
            <p className="text-sm text-muted-foreground mt-3 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              Selecteer een strategie om door te gaan
            </p>
          )}
        </CardContent>
      </Card>

      {/* LAYER 2: Analyst Context Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-blue-500" />
            Briefing Context & Nuance
          </CardTitle>
          <CardDescription>
            Dit wordt integraal naar de Writer gestuurd. Bewerk vrij om eigen inzichten toe te voegen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={briefingState.editedContextNotes}
            onChange={(e) => onStateChange({
              ...briefingState,
              editedContextNotes: e.target.value,
            })}
            placeholder="De strategische context voor de post writer..."
            className="min-h-[180px] font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground mt-2">
            💡 Tip: Voeg specifieke instructies toe zoals "Benadruk ook: 900m naar strand" of "Vermijd het woord 'exclusief'"
          </p>
        </CardContent>
      </Card>

      {/* LAYER 3: Specs Checklist */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Badge variant="outline" className="text-xs">
              {briefingState.selectedSpecs.length}/{analysisResult.specsChecklist.length}
            </Badge>
            Onderbouwing (Specs)
          </CardTitle>
          <CardDescription>
            Selecteer de feiten die je in de post wilt verwerken
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SpecsAccordion
            specs={analysisResult.specsChecklist}
            selectedSpecs={briefingState.selectedSpecs}
            onToggleSpec={handleToggleSpec}
          />
        </CardContent>
      </Card>

      {/* LAYER 4: Location & CTA */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Afronden</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Location Hint */}
            <div className="space-y-2">
              <Label className="font-medium flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                Locatie Hint
              </Label>
              <Input
                placeholder="Bv. 15 min wandelen van strand"
                value={briefingState.locationHint}
                onChange={(e) => onStateChange({
                  ...briefingState,
                  locationHint: e.target.value,
                })}
              />
              <p className="text-xs text-muted-foreground">
                Gebruik dit i.p.v. de stadsnaam
              </p>
            </div>

            {/* CTA Keyword */}
            <div className="space-y-2">
              <Label className="font-medium flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                CTA Keyword
              </Label>
              <div className="space-y-2">
                <Input
                  placeholder="Bv. Spanje, Info, Brochure"
                  value={briefingState.ctaKeyword}
                  onChange={(e) => onStateChange({
                    ...briefingState,
                    ctaKeyword: e.target.value,
                  })}
                />
                {analysisResult.suggestedCTAs.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {analysisResult.suggestedCTAs.map((cta, index) => (
                      <Badge
                        key={index}
                        variant={briefingState.ctaKeyword === cta ? "default" : "outline"}
                        className="cursor-pointer text-xs"
                        onClick={() => onStateChange({
                          ...briefingState,
                          ctaKeyword: cta,
                        })}
                      >
                        {cta}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          {onBackToReview && (
            <Button 
              variant="outline"
              size="lg"
              onClick={onBackToReview}
              disabled={isGenerating}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Review
            </Button>
          )}
          <Button 
            className="flex-1" 
            size="lg"
            disabled={!isComplete || isGenerating}
            onClick={onSubmit}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Post genereren...
              </>
            ) : (
              <>
                🚀 Genereer Post
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
