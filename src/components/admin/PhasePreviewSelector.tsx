import { useState } from "react";
import { Compass, CheckSquare, Plane, FileText, Key, Building, Wrench, X, Play, Home, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "react-router-dom";
import { useAdminPhasePreview } from "@/contexts/AdminPhasePreviewContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { JourneyPhase } from "@/hooks/useUserJourneyPhase";

const PHASES = [
  { id: "orientatie" as JourneyPhase, label: "Oriëntatie", icon: Compass },
  { id: "selectie" as JourneyPhase, label: "Selectie", icon: CheckSquare },
  { id: "bezichtiging" as JourneyPhase, label: "Bezichtiging", icon: Plane },
  { id: "aankoop" as JourneyPhase, label: "Aankoop", icon: FileText },
  { id: "overdracht" as JourneyPhase, label: "Overdracht", icon: Key },
  { id: "beheer" as JourneyPhase, label: "Beheer", icon: Building },
];

export function PhasePreviewSelector() {
  const { isAdmin } = useAuth();
  const location = useLocation();
  const {
    isPhasePreviewMode,
    previewPhase,
    previewHasSale,
    setPreviewPhase,
    setPreviewHasSale,
    exitPhasePreview,
    startOnboardingPreview,
  } = useAdminPhasePreview();

  // Local state for onboarding preview options
  const [withProjectContext, setWithProjectContext] = useState(true);
  const [withUserName, setWithUserName] = useState(true);

  // Only show for admins on dashboard routes
  if (!isAdmin || !location.pathname.startsWith("/dashboard")) {
    return null;
  }

  const handleStartOnboardingPreview = () => {
    startOnboardingPreview({
      withProjectContext,
      withUserName,
    });
  };

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardHeader className="py-3 px-3">
        <CardTitle className="text-xs font-medium flex items-center gap-2 text-amber-800">
          <Wrench className="h-3.5 w-3.5" />
          Fase Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-0 space-y-3">
        <RadioGroup
          value={previewPhase || ""}
          onValueChange={(value) => setPreviewPhase(value as JourneyPhase)}
          className="space-y-1"
        >
          {PHASES.map((phase) => (
            <div key={phase.id} className="flex items-center space-x-2">
              <RadioGroupItem
                value={phase.id}
                id={`phase-${phase.id}`}
                className="h-3.5 w-3.5"
              />
              <Label
                htmlFor={`phase-${phase.id}`}
                className="text-xs cursor-pointer flex items-center gap-1.5 text-amber-900"
              >
                <phase.icon className="h-3 w-3 text-amber-700" />
                {phase.label}
              </Label>
            </div>
          ))}
        </RadioGroup>

        <Separator className="bg-amber-200" />

        <div className="flex items-center space-x-2">
          <Checkbox
            id="simulate-sale"
            checked={previewHasSale}
            onCheckedChange={(checked) => setPreviewHasSale(checked as boolean)}
            className="h-3.5 w-3.5"
          />
          <Label
            htmlFor="simulate-sale"
            className="text-xs cursor-pointer text-amber-900"
          >
            Simuleer actieve sale
          </Label>
        </div>

        {isPhasePreviewMode && (
          <Button
            variant="outline"
            size="sm"
            onClick={exitPhasePreview}
            className="w-full h-7 text-xs border-amber-300 text-amber-800 hover:bg-amber-100"
          >
            <X className="h-3 w-3 mr-1" />
            Reset preview
          </Button>
        )}

        <Separator className="bg-amber-200" />

        {/* Onboarding Preview Section */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-amber-800">Onboarding Preview</p>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="onboarding-project"
              checked={withProjectContext}
              onCheckedChange={(checked) => setWithProjectContext(checked as boolean)}
              className="h-3.5 w-3.5"
            />
            <Label
              htmlFor="onboarding-project"
              className="text-xs cursor-pointer text-amber-900 flex items-center gap-1"
            >
              <Home className="h-3 w-3 text-amber-700" />
              Met project context
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="onboarding-name"
              checked={withUserName}
              onCheckedChange={(checked) => setWithUserName(checked as boolean)}
              className="h-3.5 w-3.5"
            />
            <Label
              htmlFor="onboarding-name"
              className="text-xs cursor-pointer text-amber-900 flex items-center gap-1"
            >
              <User className="h-3 w-3 text-amber-700" />
              Met gebruikersnaam
            </Label>
          </div>
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleStartOnboardingPreview}
            className="w-full h-7 text-xs border-amber-300 text-amber-800 hover:bg-amber-100"
          >
            <Play className="h-3 w-3 mr-1" />
            Start Onboarding Preview
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
