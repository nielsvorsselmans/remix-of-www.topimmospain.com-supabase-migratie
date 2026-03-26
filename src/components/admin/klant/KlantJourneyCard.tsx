import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { JOURNEY_PHASES } from "@/hooks/useKlanten";
import { Klant, useUpdateKlantPhase } from "@/hooks/useKlant";
import { toast } from "sonner";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { CheckCircle2 } from "lucide-react";

interface KlantJourneyCardProps {
  klant: Klant;
}

export function KlantJourneyCard({ klant }: KlantJourneyCardProps) {
  const updatePhase = useUpdateKlantPhase();
  const currentPhaseIndex = JOURNEY_PHASES.findIndex(p => p.key === klant.journey_phase);

  const handlePhaseChange = async (newPhase: string) => {
    try {
      await updatePhase.mutateAsync({ id: klant.id, phase: newPhase });
      toast.success("Journey fase bijgewerkt");
    } catch (error) {
      toast.error("Kon fase niet bijwerken");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Klanttraject</CardTitle>
          <Select value={klant.journey_phase || "orientatie"} onValueChange={handlePhaseChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {JOURNEY_PHASES.map((phase) => (
                <SelectItem key={phase.key} value={phase.key}>
                  <div className="flex items-center gap-2">
                    <span>{phase.icon}</span>
                    {phase.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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

        {/* Last update */}
        {klant.journey_phase_updated_at && (
          <p className="text-xs text-muted-foreground">
            Laatst bijgewerkt: {format(new Date(klant.journey_phase_updated_at), "d MMMM yyyy 'om' HH:mm", { locale: nl })}
          </p>
        )}

        {/* Next step suggestion */}
        {currentPhaseIndex < JOURNEY_PHASES.length - 1 && (
          <div className="mt-3 p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium">Volgende stap</p>
            <p className="text-xs text-muted-foreground">
              {getNextStepSuggestion(klant.journey_phase)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getNextStepSuggestion(phase: string | null): string {
  switch (phase) {
    case "orientatie":
      return "Plan een oriëntatiegesprek om behoeften en budget te bespreken.";
    case "selectie":
      return "Wijs passende projecten toe en bespreek opties.";
    case "bezichtiging":
      return "Plan een bezichtigingsreis naar Spanje.";
    case "aankoop":
      return "Begeleid bij de onderhandelingen en juridische zaken.";
    case "overdracht":
      return "Coördineer de sleuteloverdracht en documentatie.";
    case "beheer":
      return "Klant is in beheer fase - onderhoud de relatie.";
    default:
      return "Neem contact op om de volgende stappen te bespreken.";
  }
}
