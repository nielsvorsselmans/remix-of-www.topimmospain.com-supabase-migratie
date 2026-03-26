import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, X, Lightbulb, ChevronDown, ChevronUp } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface SelectionProgressProps {
  totalProjects: number;
  interestedCount: number;
  rejectedCount: number;
  pendingCount: number;
  externalCount?: number;
  externalInterestedCount?: number;
}

export function SelectionProgress({
  totalProjects,
  interestedCount,
  rejectedCount,
  pendingCount,
  externalCount = 0,
  externalInterestedCount = 0,
}: SelectionProgressProps) {
  const isMobile = useIsMobile();
  const [showDetails, setShowDetails] = useState(false);
  
  const combinedTotal = totalProjects + externalCount;
  const combinedInterested = interestedCount + externalInterestedCount;
  const reviewedCount = interestedCount + rejectedCount;
  const progressPercent = combinedTotal > 0 ? (reviewedCount / combinedTotal) * 100 : 0;
  const interestedPercent = combinedTotal > 0 ? (combinedInterested / combinedTotal) * 100 : 0;

  const motivationalText = useMemo(() => {
    if (progressPercent === 0) {
      return "Begin met het beoordelen van projecten om je shortlist samen te stellen.";
    }
    if (progressPercent < 25) {
      return "Je bent goed begonnen! Beoordeel projecten om je shortlist samen te stellen.";
    }
    if (progressPercent < 75) {
      return `Goed bezig! Nog ${pendingCount} project${pendingCount !== 1 ? 'en' : ''} te beoordelen.`;
    }
    if (progressPercent < 100) {
      return "Bijna klaar! Bekijk je interessante projecten.";
    }
    return interestedCount > 0 
      ? `Klaar! Je hebt ${interestedCount} interessante project${interestedCount !== 1 ? 'en' : ''} gevonden.`
      : "Je hebt alle projecten beoordeeld.";
  }, [progressPercent, pendingCount, interestedCount]);

  // Mobile: compact sticky progress bar
  if (isMobile) {
    return (
      <div className="sticky top-0 z-40 -mx-4 px-4 py-2 bg-background/95 backdrop-blur border-b">
        <div 
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => setShowDetails(!showDetails)}
        >
          {/* Progress bar */}
          <div className="flex-1 relative h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="absolute left-0 top-0 h-full bg-muted-foreground/30 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
            <div 
              className="absolute left-0 top-0 h-full bg-green-500 transition-all"
              style={{ width: `${interestedPercent}%` }}
            />
          </div>
          
          {/* Count badge */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap">
            <span className="font-medium">{reviewedCount}/{combinedTotal}</span>
            {showDetails ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </div>
        
        {/* Expandable details on mobile */}
        {showDetails && (
          <div className="mt-2 pt-2 border-t border-dashed space-y-2 animate-in slide-in-from-top-1">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Heart className="h-3 w-3 text-green-500" />
                <span>{interestedCount} interessant</span>
              </div>
              <div className="flex items-center gap-1">
                <X className="h-3 w-3 text-muted-foreground" />
                <span>{rejectedCount} afgewezen</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Lightbulb className="h-3 w-3 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">{motivationalText}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Desktop: full card
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Voortgang</span>
          <span className="text-sm text-muted-foreground">
            {reviewedCount} van {combinedTotal} beoordeeld
          </span>
        </div>
        
        {/* Dual progress bar */}
        <div className="space-y-2">
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            {/* Rejected portion */}
            <div 
              className="absolute left-0 top-0 h-full bg-muted-foreground/30 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
            {/* Interested portion (overlays rejected) */}
            <div 
              className="absolute left-0 top-0 h-full bg-green-500 transition-all"
              style={{ width: `${interestedPercent}%` }}
            />
          </div>
          
          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Heart className="h-3 w-3 text-green-500" />
              <span>{interestedCount} interessant</span>
            </div>
            <div className="flex items-center gap-1">
              <X className="h-3 w-3 text-muted-foreground" />
              <span>{rejectedCount} afgewezen</span>
            </div>
          </div>
        </div>

        {/* Motivational text */}
        <div className="flex items-start gap-2 pt-1">
          <Lightbulb className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">{motivationalText}</p>
        </div>
      </CardContent>
    </Card>
  );
}
