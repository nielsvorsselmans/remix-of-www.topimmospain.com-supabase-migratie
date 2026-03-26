import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface Step {
  label: string;
}

interface Props {
  steps: Step[];
  currentStep: number;
  onStepClick: (index: number) => void;
}

const StepIndicator = ({ steps, currentStep, onStepClick }: Props) => {
  return (
    <div className="mb-8">
      {/* Mobile: compact text indicator */}
      <p className="text-xs text-muted-foreground text-center mb-3 sm:hidden">
        Stap {currentStep + 1} van {steps.length} — <span className="font-medium text-foreground">{steps[currentStep]?.label}</span>
      </p>

      <div className="flex items-center justify-between w-full">
        {steps.map((step, i) => {
          const isCompleted = i < currentStep;
          const isCurrent = i === currentStep;
          const isClickable = i <= currentStep;

          return (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <button
                type="button"
                onClick={() => isClickable && onStepClick(i)}
                disabled={!isClickable}
                className="flex flex-col items-center gap-1.5 group"
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300",
                    isCompleted && "bg-accent text-accent-foreground",
                    isCurrent && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                    !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium hidden sm:block transition-colors",
                    isCurrent ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </button>

              {i < steps.length - 1 && (
                <div className="flex-1 mx-1.5">
                  <div
                    className={cn(
                      "h-0.5 rounded-full transition-colors duration-300",
                      i < currentStep ? "bg-accent" : "bg-border"
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StepIndicator;
