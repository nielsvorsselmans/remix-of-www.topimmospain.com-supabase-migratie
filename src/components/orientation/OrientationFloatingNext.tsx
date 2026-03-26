import { ArrowRight, BookOpen, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface OrientationFloatingNextProps {
  nextArticleTitle: string;
  pillarTitle: string;
  readTimeMinutes: number;
  onContinue: () => void;
  show: boolean;
}

export function OrientationFloatingNext({
  nextArticleTitle,
  pillarTitle,
  readTimeMinutes,
  onContinue,
  show,
}: OrientationFloatingNextProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (!show || isDismissed) return null;

  return (
    <div className={cn(
      "fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-lg",
      "animate-in slide-in-from-bottom-4 fade-in duration-300"
    )}>
      <div className="bg-card border border-border shadow-lg rounded-xl p-3 flex items-center gap-3">
        {/* Icon */}
        <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
          <BookOpen className="h-4 w-4 text-primary" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">Volgende artikel</p>
          <p className="font-medium text-foreground text-sm truncate">
            {nextArticleTitle}
          </p>
          <p className="text-xs text-muted-foreground">
            {pillarTitle} · {readTimeMinutes} min
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button 
            size="sm" 
            onClick={onContinue}
            className="group h-9 px-3"
          >
            Lezen
            <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </Button>
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            aria-label="Sluiten"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}
