import { cn } from "@/lib/utils";
import { useUserJourneyPhase, JourneyPhase } from "@/hooks/useUserJourneyPhase";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const phaseLabels: Record<JourneyPhase, string> = {
  orientatie: "Oriëntatie",
  selectie: "Selectie",
  bezichtiging: "Bezichtiging",
  aankoop: "Aankoop",
  overdracht: "Overdracht",
  beheer: "Beheer",
};

const phaseDescriptions: Record<JourneyPhase, string> = {
  orientatie: "Je leert over investeren in Spanje en ontdekt wat bij je past.",
  selectie: "Je krijgt toegang tot projecten die matchen met jouw wensen.",
  bezichtiging: "Je bezoekt Spanje om projecten in het echt te bekijken.",
  aankoop: "Je rondt de aankoop af met begeleiding van ons team.",
  overdracht: "De sleuteloverdracht en laatste inspecties.",
  beheer: "Je woning wordt verhuurd en je volgt het rendement.",
};

export function JourneyTimelineTracker() {
  const { phaseNumber, PHASE_ORDER, isLoading } = useUserJourneyPhase();
  
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm animate-pulse">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-muted" />
            <div className="h-4 w-16 bg-muted rounded hidden sm:block" />
            {i < 6 && <span className="text-muted-foreground hidden sm:inline">—</span>}
          </div>
        ))}
      </div>
    );
  }
  
  return (
    <TooltipProvider>
      <div className="flex flex-wrap items-center gap-x-1 gap-y-2 text-sm">
        {PHASE_ORDER.map((phase, index) => {
          const isCompleted = index + 1 < phaseNumber;
          const isCurrent = index + 1 === phaseNumber;
          const isFuture = index + 1 > phaseNumber;
          
          return (
            <div key={phase} className="flex items-center gap-1 sm:gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 sm:gap-2 cursor-help">
                    <div className={cn(
                      "w-2.5 h-2.5 rounded-full transition-colors",
                      isCompleted && "bg-primary",
                      isCurrent && "bg-primary ring-2 ring-primary/30 ring-offset-1 ring-offset-background",
                      isFuture && "bg-muted"
                    )} />
                    <span className={cn(
                      "hidden sm:inline transition-colors",
                      isCurrent && "font-semibold text-primary",
                      isCompleted && "text-foreground",
                      isFuture && "text-muted-foreground"
                    )}>
                      {phaseLabels[phase]}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[200px]">
                  <p className="font-semibold">{phaseLabels[phase]}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {phaseDescriptions[phase]}
                  </p>
                  {isCurrent && (
                    <p className="text-xs text-primary mt-1 font-medium">
                      ← Je bent hier
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
              
              {index < PHASE_ORDER.length - 1 && (
                <span className={cn(
                  "hidden sm:inline",
                  isCompleted ? "text-primary/50" : "text-muted-foreground/50"
                )}>—</span>
              )}
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
