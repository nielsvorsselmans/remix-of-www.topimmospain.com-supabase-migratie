import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Route } from "lucide-react";
import { PartnerKlant } from "@/hooks/usePartnerKlant";

const JOURNEY_PHASES = [
  { key: "orientatie", label: "Oriëntatie", icon: "🔍" },
  { key: "selectie", label: "Selectie", icon: "📋" },
  { key: "bezichtiging", label: "Bezichtiging", icon: "✈️" },
  { key: "aankoop", label: "Aankoop", icon: "🏠" },
  { key: "overdracht", label: "Overdracht", icon: "🔑" },
  { key: "beheer", label: "Beheer", icon: "⚙️" },
];

interface PartnerKlantJourneyCardProps {
  klant: PartnerKlant;
}

export function PartnerKlantJourneyCard({ klant }: PartnerKlantJourneyCardProps) {
  const currentPhaseIndex = JOURNEY_PHASES.findIndex(p => p.key === klant.journey_phase);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Route className="h-4 w-4" />
          Klanttraject
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Progress Bar */}
        <div className="relative mb-4">
          <div className="flex justify-between mb-2">
            {JOURNEY_PHASES.map((phase, index) => {
              const isCompleted = index < currentPhaseIndex;
              const isCurrent = index === currentPhaseIndex;
              
              return (
                <div 
                  key={phase.key} 
                  className="flex flex-col items-center flex-1"
                >
                  <div 
                    className={`
                      h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium
                      ${isCompleted ? "bg-primary text-primary-foreground" : ""}
                      ${isCurrent ? "bg-primary/20 text-primary border-2 border-primary" : ""}
                      ${!isCompleted && !isCurrent ? "bg-muted text-muted-foreground" : ""}
                    `}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <span>{phase.icon}</span>
                    )}
                  </div>
                  <span className={`text-[10px] mt-1 text-center ${isCurrent ? "font-medium" : "text-muted-foreground"}`}>
                    {phase.label}
                  </span>
                </div>
              );
            })}
          </div>
          
          {/* Progress line */}
          <div className="absolute top-4 left-0 right-0 h-0.5 bg-muted -z-10 mx-8">
            <div 
              className="h-full bg-primary transition-all"
              style={{ width: `${(currentPhaseIndex / (JOURNEY_PHASES.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* Next step info */}
        {currentPhaseIndex < JOURNEY_PHASES.length - 1 && currentPhaseIndex >= 0 && (
          <div className="mt-3 p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium">Huidige fase</p>
            <p className="text-xs text-muted-foreground">
              {getPhaseDescription(klant.journey_phase)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getPhaseDescription(phase: string | null): string {
  switch (phase) {
    case "orientatie":
      return "Klant is zich aan het oriënteren op investeren in Spanje.";
    case "selectie":
      return "Klant bekijkt en vergelijkt projecten.";
    case "bezichtiging":
      return "Klant plant of maakt een bezichtigingsreis.";
    case "aankoop":
      return "Klant is in onderhandeling of heeft gekocht.";
    case "overdracht":
      return "Woning wordt overgedragen aan klant.";
    case "beheer":
      return "Klant heeft woning en is in beheer fase.";
    default:
      return "Klant is aan het starten met oriënteren.";
  }
}
