import { CheckCircle2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface GameCompleteBadgeProps {
  label?: string;
  className?: string;
  showSparkles?: boolean;
}

export function GameCompleteBadge({ 
  label = "Voltooid", 
  className,
  showSparkles = true,
}: GameCompleteBadgeProps) {
  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full",
      "bg-primary/10 text-primary text-sm font-medium",
      "animate-in fade-in-0 zoom-in-95 duration-300",
      className
    )}>
      {showSparkles && <Sparkles className="h-3.5 w-3.5" />}
      <CheckCircle2 className="h-4 w-4" />
      <span>{label}</span>
    </div>
  );
}
