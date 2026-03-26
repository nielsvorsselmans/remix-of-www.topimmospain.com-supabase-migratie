import { Check, ArrowRight, ExternalLink, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useOrientationProgress, OrientationStep } from "@/hooks/useOrientationProgress";
import { ORIENTATION_STEP_CONFIG, isExternalLink } from "@/constants/orientationSteps";
import confetti from "canvas-confetti";
import { useEffect, useRef, useState } from "react";

interface MobileOrientationJourneyProps {
  onStartOnboarding?: () => void;
}

export function MobileOrientationJourney({ onStartOnboarding }: MobileOrientationJourneyProps) {
  const { steps, completedCount, totalSteps, progressPercentage, nextStep } = useOrientationProgress();
  const prevCompletedRef = useRef(completedCount);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [justCompleted, setJustCompleted] = useState<Set<string>>(new Set());
  const [completedOpen, setCompletedOpen] = useState(false);

  useEffect(() => {
    if (completedCount === totalSteps && prevCompletedRef.current < totalSteps) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
    if (completedCount > prevCompletedRef.current) {
      const newlyCompleted = steps.filter(s => s.completed).map(s => s.id);
      setJustCompleted(new Set(newlyCompleted));
      setTimeout(() => setJustCompleted(new Set()), 1500);
    }
    prevCompletedRef.current = completedCount;
  }, [completedCount, totalSteps, steps]);

  useEffect(() => {
    if (nextStep) setExpandedStep(nextStep.id);
  }, [nextStep?.id]);

  const allCompleted = completedCount === totalSteps;

  const toggleStep = (stepId: string) => {
    setExpandedStep(prev => prev === stepId ? null : stepId);
  };

  // Split steps (excluding meeting) into completed and incomplete
  const filteredSteps = steps.filter(s => s.id !== 'meeting');
  const completedSteps = filteredSteps.filter(s => s.completed);
  const incompleteSteps = filteredSteps.filter(s => !s.completed);
  const useCollapsedGroup = completedSteps.length >= 2;

  return (
    <div className="space-y-4">
      <div className="relative pl-7">
        {/* Vertical line */}
        <div className="absolute left-[11px] top-3 bottom-3 w-px bg-border/60" />

        <div className="space-y-1">
          {/* Collapsed completed group */}
          {useCollapsedGroup && (
            <Collapsible open={completedOpen} onOpenChange={setCompletedOpen}>
              <CollapsibleTrigger className="w-full text-left rounded-md px-2 py-2 transition-all hover:bg-muted/50">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {completedSteps.length} stappen voltooid
                  </p>
                  <ChevronDown className={cn(
                    "h-3.5 w-3.5 text-muted-foreground transition-transform",
                    completedOpen && "rotate-180"
                  )} />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="ml-3 space-y-0.5 pb-1">
                  {completedSteps.map((step) => {
                    const external = isExternalLink(step.link);
                    return (
                      <Link
                        key={step.id}
                        to={step.link}
                        target={external ? "_blank" : undefined}
                        rel={external ? "noopener noreferrer" : undefined}
                        className="block rounded-md px-2 py-1.5 transition-all opacity-60 hover:opacity-90 hover:bg-muted/50"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs">{step.label}</p>
                          <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-2">Klaar</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Single completed step (no grouping) */}
          {!useCollapsedGroup && completedSteps.map((step) => {
            const external = isExternalLink(step.link);
            return (
              <div key={step.id} className="relative">
                <div className="absolute -left-7 top-3 z-10 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3 w-3" />
                </div>
                <Link
                  to={step.link}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noopener noreferrer" : undefined}
                  className="block w-full text-left rounded-lg p-3 transition-all opacity-70 hover:opacity-90 hover:bg-muted/50"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{step.label}</p>
                    <span className="text-xs text-muted-foreground font-medium flex-shrink-0 ml-2">Klaar</span>
                  </div>
                </Link>
              </div>
            );
          })}

          {/* Incomplete steps */}
          {incompleteSteps.map((step) => {
            const config = ORIENTATION_STEP_CONFIG[step.id];
            const Icon = config?.icon;
            const isActive = step.id === nextStep?.id;
            const isExpanded = expandedStep === step.id;
            const isPulsing = justCompleted.has(step.id);

            return (
              <div key={step.id} className="relative">
                <div className={cn(
                  "absolute -left-7 top-3 z-10 flex h-[22px] w-[22px] items-center justify-center rounded-full border transition-all",
                  isActive
                    ? "bg-background border-primary text-primary"
                    : "bg-background border-border text-muted-foreground",
                  isPulsing && "animate-[pulse_0.6s_ease-in-out_2]"
                )}>
                  {Icon && <Icon className="h-3 w-3" />}
                </div>

                <button
                  onClick={() => toggleStep(step.id)}
                  className={cn(
                    "w-full text-left rounded-lg p-3 transition-all",
                    isActive && "border-l-2 border-primary",
                    !isActive && "hover:bg-muted/50"
                  )}
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{step.label}</p>
                    {step.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{step.description}</p>
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="ml-3 mt-1 mb-2 pl-2 animate-in slide-in-from-top-2 duration-200">
                    <p className="text-xs text-muted-foreground mb-2">{step.description}</p>
                    <StepCTA step={step} config={config} onStartOnboarding={onStartOnboarding} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {allCompleted && (
        <div className="p-4 rounded-lg bg-primary/10 text-center">
          <p className="font-semibold text-primary">🎉 Gefeliciteerd!</p>
          <p className="text-sm text-muted-foreground mt-1">
            Je hebt alle oriëntatiestappen voltooid. Tijd voor de volgende fase!
          </p>
        </div>
      )}
    </div>
  );
}

function StepCTA({ step, config, onStartOnboarding }: { step: OrientationStep; config: typeof ORIENTATION_STEP_CONFIG[string]; onStartOnboarding?: () => void }) {
  const ctaText = config?.cta || "Ga aan de slag";

  if (step.id === "profile" && onStartOnboarding) {
    return (
      <Button onClick={onStartOnboarding} size="sm" className="w-full group">
        {ctaText}
        <ArrowRight className="ml-2 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
      </Button>
    );
  }

  const external = isExternalLink(step.link);
  return (
    <Button asChild size="sm" variant="outline" className="w-full group">
      <Link
        to={step.link}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
      >
        {ctaText}
        {external ? (
          <ExternalLink className="ml-2 h-3.5 w-3.5" />
        ) : (
          <ArrowRight className="ml-2 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
        )}
      </Link>
    </Button>
  );
}
