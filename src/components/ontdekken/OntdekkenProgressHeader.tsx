import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useOntdekkenProgress, phaseLabels } from "@/hooks/useOntdekkenProgress";

interface ProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
}

function ProgressRing({ percentage, size = 72, strokeWidth = 6 }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background circle */}
        <circle
          className="text-muted"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress circle */}
        <circle
          className="text-primary transition-all duration-500 ease-out"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      {/* Percentage text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-semibold">{percentage}%</span>
      </div>
    </div>
  );
}

function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Goedemorgen";
  if (hour < 18) return "Goedemiddag";
  return "Goedenavond";
}

export function OntdekkenProgressHeader() {
  const { score, phase, firstName, completedItems, isLoading } = useOntdekkenProgress();
  
  if (isLoading) {
    return (
      <div className="flex items-center gap-6 p-6 rounded-xl bg-gradient-to-r from-primary/5 via-primary/3 to-transparent border animate-pulse">
        <div className="w-[72px] h-[72px] rounded-full bg-muted" />
        <div className="space-y-2 flex-1">
          <div className="h-7 w-48 bg-muted rounded" />
          <div className="h-5 w-64 bg-muted rounded" />
        </div>
      </div>
    );
  }
  
  const greeting = firstName 
    ? `${getTimeBasedGreeting()}, ${firstName}`
    : getTimeBasedGreeting();
  
  // Show CTA button if profile is incomplete
  const showProfileCTA = !completedItems.hasBudget || !completedItems.hasRegion;
  
  return (
    <div className={cn(
      "flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6",
      "p-5 sm:p-6 rounded-xl",
      "bg-gradient-to-r from-primary/8 via-primary/4 to-transparent",
      "border border-primary/10"
    )}>
      <ProgressRing percentage={score} />
      
      <div className="flex-1 min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">
          {greeting}
        </h1>
        <p className="text-muted-foreground mt-1">
          Hoe completer je profiel, hoe beter we projecten kunnen matchen
        </p>
        <p className="text-sm text-muted-foreground/80 mt-0.5">
          {phaseLabels[phase]} · <span className="font-semibold text-foreground">{score}%</span> ingevuld
        </p>
      </div>
      
      {showProfileCTA && (
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <Link to="/onboarding">
            Vul aan voor betere matches
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      )}
    </div>
  );
}
