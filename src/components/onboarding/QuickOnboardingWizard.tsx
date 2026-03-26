import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, TrendingUp, Sun, RefreshCw, MapPin, ArrowRight, ArrowLeft, Sparkles, HelpCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  INVESTMENT_GOALS, 
  QUICK_ONBOARDING_REGIONS, 
  NO_PREFERENCE_REGION 
} from "@/constants/onboardingOptions";
import { logOnboardingEvent } from "@/lib/analytics/onboardingEvents";

interface ProjectContext {
  id: string;
  name: string;
  city?: string;
  image?: string;
}

interface QuickOnboardingWizardProps {
  projectContext?: ProjectContext;
  userName?: string;
  onComplete: (data: OnboardingData) => void;
  onSkip: () => void;
  /** Direct skip to analysis page - bypasses all steps */
  onDirectToAnalysis?: () => void;
}

interface OnboardingData {
  investmentGoal: string | null;
  goalClarity: "clear" | "exploring";
  investmentGoalSource: "user_explicit";
  preferredRegions: string[];
}

type Step = "welcome" | "goal" | "region" | "complete";

// Map icon names to components
const ICON_MAP: Record<string, typeof TrendingUp> = {
  TrendingUp,
  Sun,
  RefreshCw,
  HelpCircle,
};

export function QuickOnboardingWizard({
  projectContext,
  userName,
  onComplete,
  onSkip,
  onDirectToAnalysis,
}: QuickOnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState<Step>("welcome");
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);

  const steps: Step[] = ["welcome", "goal", "region", "complete"];
  const currentStepIndex = steps.indexOf(currentStep);

  const handleGoalSelect = (goalId: string) => {
    setSelectedGoal(goalId);
  };

  const handleRegionToggle = (regionLabel: string) => {
    // Handle "no preference" - clears other selections
    if (regionLabel === NO_PREFERENCE_REGION.label) {
      setSelectedRegions([NO_PREFERENCE_REGION.label]);
      return;
    }
    
    setSelectedRegions(prev => {
      // Remove "no preference" if selecting a real region
      const filtered = prev.filter(r => r !== NO_PREFERENCE_REGION.label);
      if (filtered.includes(regionLabel)) {
        return filtered.filter(r => r !== regionLabel);
      }
      return [...filtered, regionLabel];
    });
  };

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex]);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex]);
    }
  };

  const handleSkipStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex]);
    }
  };

  const handleDirectToAnalysis = () => {
    if (onDirectToAnalysis) {
      onDirectToAnalysis();
    } else {
      onSkip();
    }
  };

  const handleComplete = () => {
    // Filter out "no preference" - store empty array instead
    const regions = selectedRegions.includes(NO_PREFERENCE_REGION.label) 
      ? [] 
      : selectedRegions; // Already stored as labels
    
    // Determine goal clarity based on selection
    const isExploring = selectedGoal === "exploring";
    
    // Log the completion event
    logOnboardingEvent("quick_wizard_completed", {
      hasGoal: !!selectedGoal && !isExploring,
      goalClarity: isExploring ? "exploring" : "clear",
      regionCount: regions.length,
    });
    
    onComplete({
      investmentGoal: isExploring ? null : selectedGoal,
      goalClarity: isExploring ? "exploring" : "clear",
      investmentGoalSource: "user_explicit",
      preferredRegions: regions,
    });
  };

  const canProceed = () => {
    switch (currentStep) {
      case "welcome":
        return true;
      case "goal":
        return selectedGoal !== null;
      case "region":
        return selectedRegions.length > 0;
      case "complete":
        return true;
      default:
        return false;
    }
  };

  const hasAnyData = selectedGoal || (selectedRegions.length > 0 && !selectedRegions.includes(NO_PREFERENCE_REGION.label));

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col">
      {/* Progress Indicator */}
      <div className="w-full max-w-md mx-auto pt-8 px-4">
        <div className="flex items-center justify-center gap-2">
          {steps.map((step, index) => (
            <div
              key={step}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                index === currentStepIndex
                  ? "w-8 bg-primary"
                  : index < currentStepIndex
                  ? "w-2 bg-primary"
                  : "w-2 bg-muted-foreground/30"
              )}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg">
          {/* Welcome Step */}
          {currentStep === "welcome" && (
            <div className="text-center space-y-6 animate-fade-in">
              {projectContext?.image && (
                <div className="relative w-full h-48 rounded-xl overflow-hidden mb-6 shadow-elegant">
                  <img
                    src={projectContext.image}
                    alt={projectContext.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute bottom-4 left-4 text-white">
                    <p className="text-sm opacity-90">Je interesse</p>
                    <p className="font-semibold">{projectContext.name}</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-foreground">
                  Welkom{userName ? `, ${userName}` : ""}! 👋
                </h1>
                <p className="text-muted-foreground text-lg">
                  {projectContext
                    ? `Je hebt interesse getoond in ${projectContext.name}${projectContext.city ? ` in ${projectContext.city}` : ""}.`
                    : "Fijn dat je er bent!"}
                </p>
              </div>

              <div className="space-y-3 text-left bg-muted/50 rounded-xl p-5">
                <p className="font-medium text-foreground mb-3">In jouw persoonlijke portaal krijg je toegang tot:</p>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">Volledige projectanalyses met rendementsprognoses</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">Projecten vergelijken op basis van jouw criteria</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">Persoonlijke begeleiding door onze experts</span>
                </div>
              </div>

              <Button size="lg" onClick={handleNext} className="w-full gap-2">
                Laten we beginnen
                <ArrowRight className="w-4 h-4" />
              </Button>
              
              {projectContext && (
                <button
                  onClick={handleDirectToAnalysis}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Direct naar mijn analyse →
                </button>
              )}
              
              {!projectContext && (
                <button
                  onClick={onSkip}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Later invullen
                </button>
              )}
            </div>
          )}

          {/* Goal Step */}
          {currentStep === "goal" && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-foreground">
                  Wat is je doel?
                </h2>
                <p className="text-muted-foreground">
                  Ben je op zoek naar een investering, voor eigen gebruik of een combinatie?
                </p>
                {/* Microcopy - waarom vragen we dit */}
                <p className="text-xs text-muted-foreground/70 flex items-center justify-center gap-1 mt-2">
                  <Info className="h-3 w-3" />
                  Zodat we projecten tonen die passen bij jouw plan en risico-profiel
                </p>
              </div>

              <div className="space-y-3">
                {INVESTMENT_GOALS.map((goal) => {
                  const Icon = ICON_MAP[goal.icon] || TrendingUp;
                  const isSelected = selectedGoal === goal.id;
                  
                  return (
                    <Card
                      key={goal.id}
                      className={cn(
                        "cursor-pointer transition-all duration-200 hover:shadow-md",
                        isSelected
                          ? "border-2 border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                      onClick={() => handleGoalSelect(goal.id)}
                    >
                      <CardContent className="p-4 flex items-center gap-4">
                        <div
                          className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center shrink-0",
                            isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                          )}
                        >
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">{goal.shortLabel}</p>
                          <p className="text-sm text-muted-foreground">{goal.description}</p>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <Button
                  size="lg"
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="w-full gap-2"
                >
                  Ga verder
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={handleBack}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    Terug
                  </button>
                  <button
                    onClick={handleSkipStep}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Overslaan
                  </button>
                  {projectContext && (
                    <button
                      onClick={handleDirectToAnalysis}
                      className="text-sm text-primary hover:text-primary/80 transition-colors font-medium"
                    >
                      Direct naar analyse →
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Region Step */}
          {currentStep === "region" && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-foreground">
                  Welke regio's spreken je aan?
                </h2>
                <p className="text-muted-foreground">
                  Je kunt meerdere regio's selecteren
                </p>
                {/* Microcopy - waarom vragen we dit */}
                <p className="text-xs text-muted-foreground/70 flex items-center justify-center gap-1 mt-2">
                  <Info className="h-3 w-3" />
                  Elke regio heeft eigen kenmerken voor rendement en leefstijl
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {QUICK_ONBOARDING_REGIONS.map((region) => {
                  const isSelected = selectedRegions.includes(region.label);
                  
                  return (
                    <Card
                      key={region.id}
                      className={cn(
                        "cursor-pointer transition-all duration-200 hover:shadow-md",
                        isSelected
                          ? "border-2 border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                      onClick={() => handleRegionToggle(region.label)}
                    >
                      <CardContent className="p-4 flex items-center gap-3">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                            isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                          )}
                        >
                          <MapPin className="w-5 h-5" />
                        </div>
                        <p className="font-medium text-foreground flex-1">{region.label}</p>
                        {isSelected && (
                          <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
                
                {/* No preference option - spans full width */}
                <Card
                  className={cn(
                    "cursor-pointer transition-all duration-200 hover:shadow-md sm:col-span-2",
                    selectedRegions.includes(NO_PREFERENCE_REGION.label)
                      ? "border-2 border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                  onClick={() => handleRegionToggle(NO_PREFERENCE_REGION.label)}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                        selectedRegions.includes(NO_PREFERENCE_REGION.label) 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted"
                      )}
                    >
                      <HelpCircle className="w-5 h-5" />
                    </div>
                    <p className="font-medium text-foreground flex-1">{NO_PREFERENCE_REGION.label}</p>
                    {selectedRegions.includes(NO_PREFERENCE_REGION.label) && (
                      <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <Button
                  size="lg"
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="w-full gap-2"
                >
                  Ga verder
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={handleBack}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    Terug
                  </button>
                  <button
                    onClick={handleSkipStep}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Overslaan
                  </button>
                  {projectContext && (
                    <button
                      onClick={handleDirectToAnalysis}
                      className="text-sm text-primary hover:text-primary/80 transition-colors font-medium"
                    >
                      Direct naar analyse →
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Complete Step */}
          {currentStep === "complete" && (
            <div className="text-center space-y-6 animate-fade-in">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Sparkles className="w-10 h-10 text-primary" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">
                  {hasAnyData 
                    ? "Perfect! We hebben je voorkeuren opgeslagen"
                    : "Je bent klaar om te beginnen"
                  }
                </h2>
                <p className="text-muted-foreground">
                  {hasAnyData
                    ? "Je bent helemaal klaar om je persoonlijke portaal te ontdekken."
                    : "Je kunt later nog je voorkeuren aanpassen in je profiel."
                  }
                </p>
              </div>

              {projectContext && (
                <div className="bg-muted/50 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm text-muted-foreground">Toegevoegd aan je favorieten</p>
                    <p className="font-medium text-foreground">{projectContext.name}</p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {projectContext ? (
                  <Button size="lg" onClick={handleComplete} className="w-full gap-2">
                    Bekijk de analyse van {projectContext.name}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : selectedGoal === "exploring" || !selectedGoal ? (
                  <>
                    <Button size="lg" onClick={handleComplete} className="w-full gap-2">
                      Doe het Investeringskompas (2 min)
                      <Sparkles className="w-4 h-4" />
                    </Button>
                    <p className="text-sm text-muted-foreground text-center">
                      Ontdek spelenderwijs wat bij jou past
                    </p>
                  </>
                ) : hasAnyData ? (
                  <Button size="lg" onClick={handleComplete} className="w-full gap-2">
                    Ontdek projecten die bij je passen
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button size="lg" onClick={handleComplete} className="w-full gap-2">
                    Naar mijn portaal
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                )}
                
                {!hasAnyData && (
                  <button
                    onClick={handleBack}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 mx-auto"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    Toch nog voorkeuren invullen
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
