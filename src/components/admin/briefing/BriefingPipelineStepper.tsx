import { cn } from "@/lib/utils";
import { CheckCircle2, Brain, Edit3, Target, Sparkles, FileText, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export type PipelineStep = 1 | 2 | 3 | 4 | 5;

interface StepConfig {
  id: PipelineStep;
  key: string;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  description: string;
}

const PIPELINE_STEPS: StepConfig[] = [
  { 
    id: 1, 
    key: 'brainstorm', 
    label: 'Brainstorm', 
    shortLabel: 'Brain',
    icon: Brain,
    description: 'AI analyseert het project'
  },
  { 
    id: 2, 
    key: 'review', 
    label: 'Review', 
    shortLabel: 'Review',
    icon: Edit3,
    description: 'Bewerk de ruwe inzichten'
  },
  { 
    id: 3, 
    key: 'strategy', 
    label: 'Strategie', 
    shortLabel: 'Strat.',
    icon: Target,
    description: 'Kies angle, specs, CTA'
  },
  { 
    id: 4, 
    key: 'hooks', 
    label: 'Hooks', 
    shortLabel: 'Hooks',
    icon: Sparkles,
    description: 'Selecteer virale openingen'
  },
  { 
    id: 5, 
    key: 'preview', 
    label: 'Preview', 
    shortLabel: 'Prev.',
    icon: FileText,
    description: 'Finale gepolitoerde posts'
  },
];

interface BriefingPipelineStepperProps {
  currentStep: PipelineStep;
  completedSteps: PipelineStep[];
  onNavigateToStep: (step: PipelineStep) => void;
  onRestartStep?: (step: PipelineStep) => void;
  isProcessing?: boolean;
}

export function BriefingPipelineStepper({
  currentStep,
  completedSteps,
  onNavigateToStep,
  onRestartStep,
  isProcessing = false,
}: BriefingPipelineStepperProps) {
  const canNavigateTo = (step: PipelineStep): boolean => {
    if (isProcessing) return false;
    // Can always go back to completed steps
    if (completedSteps.includes(step)) return true;
    // Can go to current step
    if (step === currentStep) return true;
    return false;
  };

  const getStepStatus = (step: PipelineStep): 'completed' | 'active' | 'locked' => {
    if (completedSteps.includes(step) && step !== currentStep) return 'completed';
    if (step === currentStep) return 'active';
    return 'locked';
  };

  return (
    <TooltipProvider>
      <div className="w-full bg-card border rounded-lg p-4">
        {/* Desktop version */}
        <div className="hidden md:flex items-center justify-between relative">
          {/* Progress line background */}
          <div className="absolute left-8 right-8 top-6 h-0.5 bg-muted" />
          
          {/* Completed progress line */}
          <div 
            className="absolute left-8 top-6 h-0.5 bg-primary transition-all duration-500"
            style={{ 
              width: `calc(${Math.max(0, ((Math.max(...completedSteps, currentStep) - 1) / (PIPELINE_STEPS.length - 1)) * 100)}% - 64px)` 
            }}
          />

          {PIPELINE_STEPS.map((step) => {
            const status = getStepStatus(step.id);
            const canClick = canNavigateTo(step.id);
            const Icon = step.icon;

            return (
              <Tooltip key={step.key}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => canClick && onNavigateToStep(step.id)}
                    disabled={!canClick}
                    className={cn(
                      "relative z-10 flex flex-col items-center gap-2 transition-all group",
                      canClick && "cursor-pointer",
                      !canClick && "cursor-not-allowed opacity-60"
                    )}
                  >
                    {/* Circle */}
                    <div
                      className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 border-2",
                        status === 'completed' && "bg-green-500 border-green-500 text-white",
                        status === 'active' && "bg-primary border-primary text-primary-foreground ring-4 ring-primary/20",
                        status === 'locked' && "bg-muted border-muted text-muted-foreground"
                      )}
                    >
                      {status === 'completed' ? (
                        <CheckCircle2 className="h-6 w-6" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>

                    {/* Label */}
                    <span
                      className={cn(
                        "text-xs font-medium transition-colors text-center",
                        status === 'completed' && "text-green-600 dark:text-green-400",
                        status === 'active' && "text-primary font-semibold",
                        status === 'locked' && "text-muted-foreground"
                      )}
                    >
                      {step.label}
                    </span>

                    {/* Restart button for completed steps */}
                    {status === 'completed' && onRestartStep && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute -top-1 -right-1 h-5 w-5 p-0 rounded-full bg-background border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRestartStep(step.id);
                        }}
                      >
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{step.label}</p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                  {status === 'completed' && (
                    <p className="text-xs text-green-600 mt-1">✓ Voltooid - klik om terug te gaan</p>
                  )}
                  {status === 'locked' && (
                    <p className="text-xs text-amber-600 mt-1">⏳ Voltooi eerst de vorige stappen</p>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Mobile version - compact */}
        <div className="md:hidden">
          <div className="flex items-center gap-1 justify-center mb-2">
            {PIPELINE_STEPS.map((step, index) => {
              const status = getStepStatus(step.id);
              const canClick = canNavigateTo(step.id);

              return (
                <div key={step.key} className="flex items-center">
                  <button
                    onClick={() => canClick && onNavigateToStep(step.id)}
                    disabled={!canClick}
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all",
                      status === 'completed' && "bg-green-500 text-white",
                      status === 'active' && "bg-primary text-primary-foreground ring-2 ring-primary/20",
                      status === 'locked' && "bg-muted text-muted-foreground",
                      canClick && "cursor-pointer",
                      !canClick && "cursor-not-allowed"
                    )}
                  >
                    {status === 'completed' ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      step.id
                    )}
                  </button>
                  {index < PIPELINE_STEPS.length - 1 && (
                    <div 
                      className={cn(
                        "w-4 h-0.5",
                        index < currentStep - 1 ? "bg-green-500" : "bg-muted"
                      )} 
                    />
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Current step label */}
          <p className="text-center text-sm font-medium text-primary">
            {PIPELINE_STEPS[currentStep - 1]?.label}
            <span className="text-muted-foreground font-normal ml-2">
              - {PIPELINE_STEPS[currentStep - 1]?.description}
            </span>
          </p>
        </div>
      </div>
    </TooltipProvider>
  );
}
