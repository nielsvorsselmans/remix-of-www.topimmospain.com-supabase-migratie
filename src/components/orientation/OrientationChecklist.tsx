import { Check, ChevronRight, ChevronDown, Sparkles, ExternalLink, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useOrientationProgress } from "@/hooks/useOrientationProgress";
import { ORIENTATION_STEP_CONFIG, isExternalLink } from "@/constants/orientationSteps";
import confetti from "canvas-confetti";
import { useEffect, useRef, useState } from "react";

interface OrientationChecklistProps {
  onStartOnboarding?: () => void;
}

export function OrientationChecklist({ onStartOnboarding }: OrientationChecklistProps) {
  const { steps, completedCount, totalSteps, progressPercentage, nextStep } = useOrientationProgress();
  const prevCompletedRef = useRef(completedCount);
  const [justCompleted, setJustCompleted] = useState<Set<string>>(new Set());
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    if (completedCount === totalSteps && prevCompletedRef.current < totalSteps) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
    if (completedCount > prevCompletedRef.current) {
      const newlyCompleted = steps.filter(s => s.completed).map(s => s.id);
      setJustCompleted(new Set(newlyCompleted));
      setShowCompleted(true);
      setTimeout(() => {
        setJustCompleted(new Set());
        setShowCompleted(false);
      }, 1500);
    }
    prevCompletedRef.current = completedCount;
  }, [completedCount, totalSteps, steps]);

  const allCompleted = completedCount === totalSteps;
  const nextStepConfig = nextStep ? ORIENTATION_STEP_CONFIG[nextStep.id] : null;
  const NextStepIcon = nextStepConfig?.icon || Sparkles;

  const completedSteps = steps.filter(s => s.completed);
  const pendingSteps = steps.filter(s => !s.completed);

  const handleStepClick = (stepId: string, completed: boolean, e: React.MouseEvent) => {
    // Only intercept for profile step when not completed (trigger onboarding)
    if (stepId === "profile" && !completed && onStartOnboarding) {
      e.preventDefault();
      onStartOnboarding();
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Jouw oriëntatie checklist
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Integrated Next Step CTA at top */}
        {nextStep && nextStepConfig && !allCompleted && nextStep.id !== 'meeting' && (
          <div className="mb-4 p-4 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center">
                <NextStepIcon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-primary uppercase tracking-wide mb-1">Volgende stap</p>
                <h4 className="font-semibold text-sm mb-1">{nextStepConfig.title}</h4>
                <p className="text-xs text-muted-foreground mb-3">{nextStepConfig.description}</p>
                {nextStep.id === "profile" && onStartOnboarding ? (
                  <Button onClick={onStartOnboarding} size="sm" className="group">
                    {nextStepConfig.cta}
                    <ArrowRight className="ml-2 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </Button>
                ) : (
                  <Button asChild size="sm" className="group">
                    <Link 
                      to={nextStep.link}
                      target={isExternalLink(nextStep.link) ? "_blank" : undefined}
                      rel={isExternalLink(nextStep.link) ? "noopener noreferrer" : undefined}
                    >
                      {nextStepConfig.cta}
                      {isExternalLink(nextStep.link) ? (
                        <ExternalLink className="ml-2 h-3.5 w-3.5" />
                      ) : (
                        <ArrowRight className="ml-2 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                      )}
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Collapsible completed steps */}
        {completedSteps.length > 0 && !allCompleted && (
          <Collapsible open={showCompleted} onOpenChange={setShowCompleted}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors group">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1">
                  {completedSteps.map((_, i) => (
                    <div key={i} className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  ))}
                </div>
                <span className="text-sm font-medium text-muted-foreground ml-1">
                  {completedCount} van {totalSteps} stappen voltooid
                </span>
              </div>
              <ChevronDown className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                showCompleted && "rotate-180"
              )} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 mt-1">
              {completedSteps.map((step) => {
                const external = isExternalLink(step.link);
                const isPulsing = justCompleted.has(step.id);
                return (
                  <Link
                    key={step.id}
                    to={step.link}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noopener noreferrer" : undefined}
                    className="flex items-center gap-3 p-2 rounded-lg bg-primary/5 text-muted-foreground hover:bg-primary/10 transition-all group"
                  >
                    <div className={cn(
                      "flex-shrink-0 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center",
                      isPulsing && "animate-[pulse_0.6s_ease-in-out_2]"
                    )}>
                      <Check className="h-3 w-3" />
                    </div>
                    <p className="font-medium text-xs line-through opacity-70 flex-1">{step.label}</p>
                  </Link>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Pending steps - always visible (exclude active step shown in CTA above) */}
        {pendingSteps.filter(s => s.id !== nextStep?.id && s.id !== 'meeting').map((step, index) => {
          const external = isExternalLink(step.link);
          const stepConfig = ORIENTATION_STEP_CONFIG[step.id];

          return (
            <Link
              key={step.id}
              to={step.link}
              target={external ? "_blank" : undefined}
              rel={external ? "noopener noreferrer" : undefined}
              onClick={(e) => handleStepClick(step.id, step.completed, e)}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg transition-all group",
                step.id === nextStep?.id
                  ? "bg-primary/10 border border-primary/30 hover:bg-primary/15"
                  : "hover:bg-muted"
              )}
            >
              <div
                className={cn(
                  "flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium",
                  step.id === nextStep?.id
                    ? "bg-primary/20 text-primary border-2 border-primary"
                    : "bg-muted text-muted-foreground border border-border"
                )}
              >
                {step.priority}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{stepConfig?.title || step.label}</p>
                {stepConfig && (
                  <p className="text-xs text-muted-foreground mt-0.5">{stepConfig.description}</p>
                )}
              </div>

              {external ? (
                <ExternalLink
                  className={cn(
                    "h-4 w-4 flex-shrink-0",
                    step.id === nextStep?.id
                      ? "text-primary"
                      : "text-muted-foreground opacity-0 group-hover:opacity-100"
                  )}
                />
              ) : (
                <ChevronRight
                  className={cn(
                    "h-4 w-4 flex-shrink-0 transition-transform",
                    step.id === nextStep?.id
                      ? "text-primary group-hover:translate-x-1"
                      : "text-muted-foreground opacity-0 group-hover:opacity-100"
                  )}
                />
              )}
            </Link>
          );
        })}

        {allCompleted && (
          <div className="mt-4 p-4 rounded-lg bg-primary/10 text-center">
            <p className="font-semibold text-primary">🎉 Gefeliciteerd!</p>
            <p className="text-sm text-muted-foreground mt-1">
              Je hebt alle oriëntatiestappen voltooid. Tijd voor de volgende fase!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
