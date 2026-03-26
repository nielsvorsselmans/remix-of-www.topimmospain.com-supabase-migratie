import { AlertTriangle, Calendar, Clock, Ban } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, isPast, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { PartnerKlant } from "@/hooks/usePartnerKlant";
import { getDropOffReasonLabel } from "@/hooks/useDropOffLead";

interface PartnerKlantDroppedOffCardProps {
  klant: PartnerKlant;
}

function getJourneyPhaseLabel(phase: string | null): string {
  const phases: Record<string, string> = {
    orientatie: "Oriëntatie",
    selectie: "Selectie",
    bezichtiging: "Bezichtiging",
    aankoop: "Aankoop",
  };
  return phases[phase || ""] || phase || "Onbekend";
}

export function PartnerKlantDroppedOffCard({ klant }: PartnerKlantDroppedOffCardProps) {
  // Only show if client has dropped off
  if (!klant.dropped_off_at) {
    return null;
  }

  const droppedOffDate = parseISO(klant.dropped_off_at);
  const recontactDate = klant.recontact_after ? parseISO(klant.recontact_after) : null;
  const canRecontact = recontactDate && isPast(recontactDate);

  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <CardTitle className="text-lg text-destructive">Afgehaakt</CardTitle>
          <Badge variant="destructive" className="ml-auto">
            {format(droppedOffDate, "d MMM yyyy", { locale: nl })}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Phase when dropped off */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Fase bij afhaken:</span>
          <Badge variant="secondary">{getJourneyPhaseLabel(klant.dropped_off_phase)}</Badge>
        </div>

        {/* Reason */}
        <div className="space-y-1">
          <span className="text-sm text-muted-foreground">Reden:</span>
          <p className="text-sm font-medium">{getDropOffReasonLabel(klant.dropped_off_reason)}</p>
        </div>

        {/* Notes if any */}
        {klant.dropped_off_notes && (
          <div className="space-y-1">
            <span className="text-sm text-muted-foreground">Notities:</span>
            <p className="text-sm bg-muted/50 p-2 rounded-md">{klant.dropped_off_notes}</p>
          </div>
        )}

        {/* Recontact info */}
        <div className="pt-2 border-t">
          {klant.recontact_allowed ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Hercontact toegestaan</span>
              </div>
              {recontactDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {canRecontact ? (
                      <span className="text-primary font-medium">
                        Kan opnieuw benaderd worden (vanaf {format(recontactDate, "d MMM yyyy", { locale: nl })})
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        Hercontact mogelijk vanaf {format(recontactDate, "d MMM yyyy", { locale: nl })}
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Ban className="h-4 w-4" />
              <span>Geen hercontact gewenst</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
