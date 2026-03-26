import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plane, Edit } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { nl } from "date-fns/locale";
import { PartnerKlantTrip, PartnerKlantProject } from "@/hooks/usePartnerKlant";
import { ScheduledViewing } from "@/components/admin/klant/TripDetailSheet";

interface PartnerTripDetailSheetProps {
  trip: PartnerKlantTrip | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onUpdateViewings: (viewings: ScheduledViewing[]) => Promise<void>;
  assignedProjects: PartnerKlantProject[];
  isUpdating?: boolean;
}

function getTripStatusBadge(status: string | null) {
  switch (status) {
    case "confirmed":
      return <Badge className="bg-green-500">Bevestigd</Badge>;
    case "completed":
      return <Badge variant="secondary">Afgerond</Badge>;
    case "cancelled":
      return <Badge variant="destructive">Geannuleerd</Badge>;
    default:
      return <Badge variant="outline">Gepland</Badge>;
  }
}

export function PartnerTripDetailSheet({
  trip,
  open,
  onOpenChange,
  onEdit,
  assignedProjects,
}: PartnerTripDetailSheetProps) {
  if (!trip) return null;

  const startDate = new Date(trip.trip_start_date);
  const endDate = new Date(trip.trip_end_date);
  const tripDays = differenceInDays(endDate, startDate) + 1;

  const viewings = Array.isArray(trip.scheduled_viewings) ? trip.scheduled_viewings : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Bezichtigingsreis
            </SheetTitle>
            <Button size="sm" variant="outline" onClick={onEdit}>
              <Edit className="h-4 w-4 mr-1" />
              Bewerken
            </Button>
          </div>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Trip info */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold">
                  {format(startDate, "d MMMM", { locale: nl })} -{" "}
                  {format(endDate, "d MMMM yyyy", { locale: nl })}
                </p>
                <p className="text-sm text-muted-foreground">{tripDays} dagen</p>
              </div>
              {getTripStatusBadge(trip.status)}
            </div>

            {trip.airport && (
              <div className="flex items-center gap-2 text-sm">
                <Plane className="h-4 w-4 text-muted-foreground" />
                <span>{trip.airport}</span>
              </div>
            )}
          </div>

          {/* Viewings */}
          <div className="space-y-3">
            <h3 className="font-medium">Bezichtigingen ({viewings.length})</h3>
            {viewings.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nog geen bezichtigingen gepland
              </p>
            ) : (
              <div className="space-y-2">
                {viewings.map((viewing: any, index: number) => {
                  const project = assignedProjects.find(
                    (p) => p.project_id === viewing.project_id
                  );
                  return (
                    <div key={index} className="p-3 rounded-lg border">
                      <p className="font-medium">{project?.project?.name || "Onbekend project"}</p>
                      <p className="text-sm text-muted-foreground">
                        {viewing.date} om {viewing.time}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
