import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProgressStepsProps {
  currentStep: 1 | 2 | 3;
}

const steps = [
  { id: 1, label: "Inschrijven" },
  { id: 2, label: "Bevestigen" },
  { id: 3, label: "Klaar!" },
];

export const ProgressSteps = ({ currentStep }: ProgressStepsProps) => {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300",
                step.id < currentStep && "bg-primary text-primary-foreground",
                step.id === currentStep && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                step.id > currentStep && "bg-muted text-muted-foreground"
              )}
            >
              {step.id < currentStep ? (
                <Check className="w-5 h-5" />
              ) : step.id === currentStep ? (
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-foreground opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-primary-foreground"></span>
                </span>
              ) : (
                step.id
              )}
            </div>
            <span
              className={cn(
                "mt-2 text-xs font-medium",
                step.id <= currentStep ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {step.label}
            </span>
          </div>
          
          {index < steps.length - 1 && (
            <div
              className={cn(
                "w-12 md:w-20 h-0.5 mx-2 transition-all duration-300",
                step.id < currentStep ? "bg-primary" : "bg-muted"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
};
