import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BookingStepIndicatorProps {
  currentStep: 1 | 2;
}

const steps = [
  { number: 1, label: 'Kies Moment' },
  { number: 2, label: 'Jouw Gegevens' },
];

export function BookingStepIndicator({ currentStep }: BookingStepIndicatorProps) {
  return (
    <div className="relative">
      {/* Progress Line */}
      <div className="absolute top-5 left-0 right-0 h-0.5 bg-border" />
      <div 
        className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-500"
        style={{ width: `${((currentStep - 1) / 1) * 100}%` }}
      />
      
      {/* Steps */}
      <div className="relative flex justify-between">
        {steps.map((step) => {
          const isCompleted = step.number < currentStep;
          const isActive = step.number === currentStep;
          
          return (
            <div key={step.number} className="flex flex-col items-center">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 border-2",
                  isCompleted && "bg-primary text-primary-foreground border-primary",
                  isActive && "bg-background text-primary border-primary scale-110",
                  !isCompleted && !isActive && "bg-background text-muted-foreground border-border"
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  step.number
                )}
              </div>
              <span
                className={cn(
                  "mt-2 text-xs font-medium transition-colors",
                  (isActive || isCompleted) ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
