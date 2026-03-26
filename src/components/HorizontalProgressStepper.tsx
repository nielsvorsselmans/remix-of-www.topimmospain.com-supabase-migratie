import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const PHASES = [
  { key: 'reservatie', label: 'Reservatie', shortLabel: 'Res.' },
  { key: 'koopcontract', label: 'Koopcontract', shortLabel: 'Koop.' },
  { key: 'voorbereiding', label: 'Voorbereiding', shortLabel: 'Voorb.' },
  { key: 'akkoord', label: 'Akkoord', shortLabel: 'Akk.' },
  { key: 'overdracht', label: 'Overdracht', shortLabel: 'Overdr.' },
] as const;

interface PhaseProgress {
  total: number;
  completed: number;
  isComplete: boolean;
  completedAt: string | null;
}

interface HorizontalProgressStepperProps {
  phaseProgress: Record<string, PhaseProgress>;
  activePhaseIndex: number;
  onPhaseClick?: (phaseKey: string, index: number) => void;
}

export function HorizontalProgressStepper({ 
  phaseProgress, 
  activePhaseIndex,
  onPhaseClick 
}: HorizontalProgressStepperProps) {
  return (
    <div className="w-full">
      {/* Desktop version */}
      <div className="hidden sm:flex items-center justify-between relative">
        {/* Progress line background */}
        <div className="absolute left-0 right-0 top-4 h-0.5 bg-muted" />
        
        {/* Completed progress line */}
        <div 
          className="absolute left-0 top-4 h-0.5 bg-primary transition-all duration-500"
          style={{ 
            width: `${Math.max(0, (activePhaseIndex / (PHASES.length - 1)) * 100)}%` 
          }}
        />

        {PHASES.map((phase, index) => {
          const progress = phaseProgress[phase.key];
          const isCompleted = progress?.isComplete || false;
          const isActive = index === activePhaseIndex;
          const isFuture = index > activePhaseIndex;

          return (
            <button
              key={phase.key}
              onClick={() => onPhaseClick?.(phase.key, index)}
              className={cn(
                "relative z-10 flex flex-col items-center gap-2 transition-all",
                onPhaseClick && "cursor-pointer hover:scale-105",
                !onPhaseClick && "cursor-default"
              )}
            >
              {/* Dot/Circle */}
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300",
                  isCompleted && "bg-green-500 text-white",
                  isActive && !isCompleted && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                  isFuture && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <span className="text-sm font-semibold">{index + 1}</span>
                )}
              </div>

              {/* Label */}
              <span
                className={cn(
                  "text-xs font-medium transition-colors",
                  isCompleted && "text-green-600 dark:text-green-400",
                  isActive && !isCompleted && "text-primary",
                  isFuture && "text-muted-foreground"
                )}
              >
                {phase.label}
              </span>

              {/* Progress indicator for active */}
              {isActive && progress && progress.total > 0 && (
                <span className="text-xs text-muted-foreground">
                  {progress.completed}/{progress.total}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Mobile version - vertical stepper */}
      <div className="sm:hidden space-y-0">
        {PHASES.map((phase, index) => {
          const progress = phaseProgress[phase.key];
          const isCompleted = progress?.isComplete || false;
          const isActive = index === activePhaseIndex;
          const isFuture = index > activePhaseIndex;
          const isLast = index === PHASES.length - 1;

          return (
            <div key={phase.key} className="flex items-stretch">
              {/* Left: circle + vertical line */}
              <div className="flex flex-col items-center mr-3">
                <div
                  className={cn(
                    "h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
                    isCompleted && "bg-green-500 text-white",
                    isActive && !isCompleted && "bg-primary text-primary-foreground ring-3 ring-primary/20",
                    isFuture && "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <span className="text-xs font-semibold">{index + 1}</span>
                  )}
                </div>
                {!isLast && (
                  <div
                    className={cn(
                      "w-0.5 flex-1 min-h-[12px]",
                      index < activePhaseIndex ? "bg-green-500" : "bg-muted"
                    )}
                  />
                )}
              </div>

              {/* Right: label + status */}
              <div
                className={cn(
                  "flex-1 flex items-center justify-between py-1.5 min-h-[36px]",
                  isActive && !isCompleted && "bg-primary/5 -mx-2 px-2 rounded-lg"
                )}
              >
                <span
                  className={cn(
                    "text-sm font-medium",
                    isCompleted && "text-green-600 dark:text-green-400",
                    isActive && !isCompleted && "text-primary",
                    isFuture && "text-muted-foreground"
                  )}
                >
                  {phase.label}
                </span>
                {isCompleted && (
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                    Afgerond
                  </span>
                )}
                {isActive && progress && progress.total > 0 && (
                  <span className="text-xs font-medium text-primary">
                    {progress.completed}/{progress.total}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
