import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserX, Calendar, RefreshCw, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { useReactivateDroppedLead, getDropOffReasonLabel } from "@/hooks/useDropOffLead";

interface KlantDroppedOffCardProps {
  klant: {
    id: string;
    dropped_off_at: string | null;
    dropped_off_phase: string | null;
    dropped_off_reason: string | null;
    dropped_off_notes: string | null;
    recontact_allowed: boolean | null;
    recontact_after: string | null;
  };
}

export function KlantDroppedOffCard({ klant }: KlantDroppedOffCardProps) {
  const reactivateMutation = useReactivateDroppedLead();

  if (!klant.dropped_off_at) return null;

  const reasonLabel = getDropOffReasonLabel(klant.dropped_off_reason);

  const canRecontactNow = klant.recontact_allowed && (
    !klant.recontact_after || new Date(klant.recontact_after) <= new Date()
  );

  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-destructive">
          <UserX className="h-4 w-4" />
          Afgehaakt
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* When and phase */}
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>
            {format(new Date(klant.dropped_off_at), "d MMMM yyyy", { locale: nl })}
            {klant.dropped_off_phase && (
              <span className="text-muted-foreground"> in fase {klant.dropped_off_phase}</span>
            )}
          </span>
        </div>

        {/* Reason */}
        <div>
          <span className="text-sm text-muted-foreground">Reden: </span>
          <Badge variant="outline">{reasonLabel}</Badge>
        </div>

        {/* Notes */}
        {klant.dropped_off_notes && (
          <div className="flex items-start gap-2 text-sm">
            <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
            <span className="text-muted-foreground">{klant.dropped_off_notes}</span>
          </div>
        )}

        {/* Recontact info */}
        <div className="pt-2 border-t">
          {klant.recontact_allowed ? (
            <div className="text-sm">
              {klant.recontact_after ? (
                <span>
                  Hercontact mogelijk vanaf{" "}
                  <span className="font-medium">
                    {format(new Date(klant.recontact_after), "d MMMM yyyy", { locale: nl })}
                  </span>
                </span>
              ) : (
                <span className="text-green-600">Mag opnieuw benaderd worden</span>
              )}
            </div>
          ) : (
            <span className="text-sm text-destructive">Niet opnieuw benaderen</span>
          )}
        </div>

        {/* Reactivate button */}
        {canRecontactNow && (
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-2"
            onClick={() => reactivateMutation.mutate(klant.id)}
            disabled={reactivateMutation.isPending}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {reactivateMutation.isPending ? "Bezig..." : "Reactiveer Lead"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
