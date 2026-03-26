import { Check, Mail, Key, User } from "lucide-react";
import { cn } from "@/lib/utils";

type Step = "email" | "code" | "name";

interface LoginProgressIndicatorProps {
  currentStep: Step;
  showNameStep?: boolean;
  variant?: "light" | "dark";
}

const steps = [
  { key: "email" as Step, label: "E-mail", icon: Mail },
  { key: "code" as Step, label: "Verificatie", icon: Key },
  { key: "name" as Step, label: "Profiel", icon: User },
];

export function LoginProgressIndicator({ 
  currentStep, 
  showNameStep = true,
  variant = "dark"
}: LoginProgressIndicatorProps) {
  const displaySteps = showNameStep ? steps : steps.slice(0, 2);
  const currentIndex = displaySteps.findIndex(s => s.key === currentStep);
  
  const isLight = variant === "light";
  
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {displaySteps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = step.key === currentStep;
        const Icon = step.icon;
        
        return (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300",
                  isCompleted && "bg-primary text-primary-foreground",
                  isCurrent && (isLight ? "bg-primary/10 text-primary ring-2 ring-primary" : "bg-white/20 text-white ring-2 ring-white/50"),
                  !isCompleted && !isCurrent && (isLight ? "bg-muted text-muted-foreground" : "bg-white/10 text-white/40")
                )}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <span 
                className={cn(
                  "text-xs mt-1 font-medium",
                  isCurrent && (isLight ? "text-foreground" : "text-white"),
                  isCompleted && (isLight ? "text-primary" : "text-primary"),
                  !isCompleted && !isCurrent && (isLight ? "text-muted-foreground" : "text-white/50")
                )}
              >
                {step.label}
              </span>
            </div>
            
            {index < displaySteps.length - 1 && (
              <div 
                className={cn(
                  "w-8 h-0.5 mx-1 mt-[-12px]",
                  index < currentIndex 
                    ? "bg-primary" 
                    : (isLight ? "bg-muted" : "bg-white/20")
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
