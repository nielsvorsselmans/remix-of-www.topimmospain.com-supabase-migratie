import { cn } from "@/lib/utils";

interface CharacterCounterProps {
  current: number;
  max: number;
  className?: string;
}

export function CharacterCounter({ current, max, className }: CharacterCounterProps) {
  const percentage = (current / max) * 100;
  
  const getColor = () => {
    if (percentage >= 100) return "text-destructive";
    if (percentage >= 85) return "text-amber-500";
    return "text-muted-foreground";
  };

  const getBarColor = () => {
    if (percentage >= 100) return "bg-destructive";
    if (percentage >= 85) return "bg-amber-500";
    return "bg-primary";
  };

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className={getColor()}>
          {current.toLocaleString("nl-NL")} / {max.toLocaleString("nl-NL")} karakters
        </span>
        {percentage >= 100 && (
          <span className="text-destructive font-medium">Te lang!</span>
        )}
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn("h-full transition-all duration-200", getBarColor())}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}

export const PLATFORM_LIMITS = {
  linkedin: 3000,
  facebook: 63206,
  instagram: 2200,
} as const;
