import { X } from "lucide-react";
import { toast } from "sonner";
import { useAdminPhasePreview } from "@/contexts/AdminPhasePreviewContext";
import { QuickOnboardingWizard } from "@/components/onboarding/QuickOnboardingWizard";
import { Button } from "@/components/ui/button";

const MOCK_PROJECT = {
  id: "preview-project-001",
  name: "Residencial Costa Cálida",
  city: "Los Alcázares",
  image: "https://fotos15.apinmo.com/7515/21997614/3-1.jpg",
};

export function OnboardingPreviewOverlay() {
  const { 
    isOnboardingPreview, 
    onboardingPreviewOptions,
    exitOnboardingPreview 
  } = useAdminPhasePreview();
  
  if (!isOnboardingPreview) return null;
  
  const mockProject = onboardingPreviewOptions.withProjectContext ? MOCK_PROJECT : undefined;
  const userName = onboardingPreviewOptions.withUserName ? "Jan" : undefined;
  
  const handleComplete = () => {
    toast.info("Preview: Onboarding zou nu worden opgeslagen", {
      description: "In productie worden de voorkeuren opgeslagen in de database.",
    });
    exitOnboardingPreview();
  };

  const handleSkip = () => {
    toast.info("Preview: Gebruiker heeft onboarding overgeslagen");
    exitOnboardingPreview();
  };

  const handleDirectToAnalysis = () => {
    toast.info("Preview: Direct naar analyse gegaan");
    exitOnboardingPreview();
  };
  
  return (
    <div className="fixed inset-0 z-50 bg-background overflow-auto">
      {/* Close button */}
      <Button 
        type="button"
        variant="outline"
        size="sm"
        className="absolute top-4 right-4 z-[60] bg-white shadow-lg"
        onClick={exitOnboardingPreview}
      >
        <X className="h-4 w-4 mr-1" />
        Sluit Preview
      </Button>
      
      {/* Preview badge */}
      <div className="absolute top-4 left-4 z-[60] bg-amber-500 text-white px-3 py-1.5 rounded-full text-sm font-medium shadow-lg">
        Preview Modus
      </div>
      
      {/* Options indicator */}
      <div className="absolute top-16 left-4 z-[60] bg-amber-100 text-amber-800 px-3 py-1.5 rounded-lg text-xs space-y-0.5">
        <div>Project: {onboardingPreviewOptions.withProjectContext ? "Ja" : "Nee"}</div>
        <div>Naam: {onboardingPreviewOptions.withUserName ? "Ja" : "Nee"}</div>
      </div>
      
      <QuickOnboardingWizard
        projectContext={mockProject}
        userName={userName}
        onComplete={handleComplete}
        onSkip={handleSkip}
        onDirectToAnalysis={mockProject ? handleDirectToAnalysis : undefined}
      />
    </div>
  );
}
