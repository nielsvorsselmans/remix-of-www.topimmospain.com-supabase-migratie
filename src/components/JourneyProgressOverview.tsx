import { Lock, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useUserJourneyPhase } from "@/hooks/useUserJourneyPhase";

const journeyPhasesConfig = [
  {
    phase: 1,
    key: 'orientatie',
    name: "Oriëntatie",
    description: "Verken mogelijkheden en lees je in",
  },
  {
    phase: 2,
    key: 'selectie',
    name: "Selectie",
    description: "Vergelijk en selecteer jouw favoriet project",
  },
  {
    phase: 3,
    key: 'bezichtiging',
    name: "Bezichtiging",
    description: "Plan een bezichtiging en ontdek ter plekke",
  },
  {
    phase: 4,
    key: 'aankoop',
    name: "Aankoop",
    description: "Contracten, financiering en reservering",
  },
  {
    phase: 5,
    key: 'overdracht',
    name: "Overdracht",
    description: "Notaris en sleuteloverdracht",
  },
  {
    phase: 6,
    key: 'beheer',
    name: "Nazorg",
    description: "Verhuur en onderhoud",
  },
];

export function JourneyProgressOverview() {
  const { phaseNumber, isPhaseUnlocked, isPhaseActive, isLoading } = useUserJourneyPhase();

  if (isLoading) {
    return (
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Jouw investeringsreis</h2>
        <div className="animate-pulse h-24 bg-muted rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold mb-3">Jouw investeringsreis</h2>
      
      {/* Desktop: Compact horizontal timeline */}
      <div className="hidden md:flex items-center justify-between gap-1 bg-muted/30 rounded-lg p-3">
        {journeyPhasesConfig.map((phaseConfig, index) => {
          const isActive = isPhaseActive(phaseConfig.phase);
          const isUnlocked = isPhaseUnlocked(phaseConfig.phase);
          const isCompleted = phaseConfig.phase < phaseNumber;
          
          return (
            <div key={phaseConfig.phase} className="flex-1 flex items-center gap-2 group relative">
              {/* Phase circle */}
              <div
                className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 flex-shrink-0 transition-all ${
                  isActive
                    ? "bg-primary border-primary text-primary-foreground scale-110"
                    : isCompleted
                    ? "bg-primary/20 border-primary text-primary"
                    : "bg-card border-border text-muted-foreground"
                }`}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : !isUnlocked ? (
                  <Lock className="h-3.5 w-3.5" />
                ) : (
                  <span className="font-medium text-sm">{phaseConfig.phase}</span>
                )}
              </div>
              
              {/* Phase name */}
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-sm truncate ${isActive ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"}`}>
                  {phaseConfig.name}
                </p>
                {isActive && (
                  <p className="text-xs text-muted-foreground truncate">
                    {phaseConfig.description}
                  </p>
                )}
              </div>
              
              {/* Connection line */}
              {index < journeyPhasesConfig.length - 1 && (
                <div 
                  className={`w-4 h-0.5 flex-shrink-0 ${isCompleted ? 'bg-primary' : 'bg-border'}`} 
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: Compact vertical timeline - only show active phase expanded */}
      <div className="md:hidden">
      <div className="flex items-center gap-1.5 max-w-full overflow-hidden pb-2">
          {journeyPhasesConfig.map((phaseConfig, index) => {
            const isActive = isPhaseActive(phaseConfig.phase);
            const isUnlocked = isPhaseUnlocked(phaseConfig.phase);
            const isCompleted = phaseConfig.phase < phaseNumber;
            
            return (
              <div key={phaseConfig.phase} className="flex items-center gap-1">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                    isActive
                      ? "bg-primary border-primary text-primary-foreground"
                      : isCompleted
                      ? "bg-primary/20 border-primary text-primary"
                      : "bg-card border-border text-muted-foreground"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="h-3 w-3" />
                  ) : !isUnlocked ? (
                    <Lock className="h-2.5 w-2.5" />
                  ) : (
                    <span className="font-medium text-[10px]">{phaseConfig.phase}</span>
                  )}
                </div>
                {isActive && (
                  <span className="text-xs font-medium text-primary">{phaseConfig.name}</span>
                )}
                {index < journeyPhasesConfig.length - 1 && (
                  <div className={`w-2 h-0.5 ${isCompleted ? 'bg-primary' : 'bg-border'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
