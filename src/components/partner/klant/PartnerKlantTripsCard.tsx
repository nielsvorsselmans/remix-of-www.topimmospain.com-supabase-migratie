import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plane, Plus, Calendar, ChevronRight } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { nl } from "date-fns/locale";
import { PartnerKlant, PartnerKlantTrip } from "@/hooks/usePartnerKlant";
import { PartnerTripFormDialog, PartnerTripFormData } from "./PartnerTripFormDialog";
import { PartnerTripDetailSheet } from "./PartnerTripDetailSheet";
import { useCreateTrip, useUpdateTrip, useUpdateTripViewings } from "@/hooks/useTripMutations";
import { ScheduledViewing } from "@/components/admin/klant/TripDetailSheet";
import { toast } from "sonner";

interface PartnerKlantTripsCardProps {
  klant: PartnerKlant;
}

function getTripStatusBadge(status: string | null) {
  switch (status) {
    case "confirmed":
      return <Badge className="bg-green-500 text-xs">Bevestigd</Badge>;
    case "completed":
      return <Badge variant="secondary" className="text-xs">Afgerond</Badge>;
    case "cancelled":
      return <Badge variant="destructive" className="text-xs">Geannuleerd</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">Gepland</Badge>;
  }
}

function TripCard({
  trip,
  onClick,
}: {
  trip: PartnerKlantTrip;
  onClick: () => void;
}) {
  const startDate = new Date(trip.trip_start_date);
  const endDate = new Date(trip.trip_end_date);
  const tripDays = differenceInDays(endDate, startDate) + 1;

  const viewingsCount = trip.scheduled_viewings
    ? Array.isArray(trip.scheduled_viewings)
      ? trip.scheduled_viewings.length
      : 0
    : 0;

  return (
    <div
      className="p-3 rounded-lg border hover:border-primary/50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-medium text-sm">
              {format(startDate, "d MMM", { locale: nl })} -{" "}
              {format(endDate, "d MMM yyyy", { locale: nl })}
            </span>
            {getTripStatusBadge(trip.status)}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span>{tripDays} dagen</span>
            {viewingsCount > 0 && <span>{viewingsCount} bezichtiging(en)</span>}
            {trip.airport && (
              <span className="flex items-center gap-1">
                <Plane className="h-3 w-3" />
                {trip.airport}
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
      </div>
    </div>
  );
}

export function PartnerKlantTripsCard({ klant }: PartnerKlantTripsCardProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<PartnerKlantTrip | null>(null);
  const [editingTrip, setEditingTrip] = useState<PartnerKlantTrip | null>(null);

  const createTrip = useCreateTrip();
  const updateTrip = useUpdateTrip();
  const updateViewings = useUpdateTripViewings();

  const handleOpenNew = () => {
    setEditingTrip(null);
    setFormOpen(true);
  };

  const handleOpenEdit = () => {
    setEditingTrip(selectedTrip);
    setDetailOpen(false);
    setFormOpen(true);
  };

  const handleOpenDetail = (trip: PartnerKlantTrip) => {
    setSelectedTrip(trip);
    setDetailOpen(true);
  };

  const handleSubmit = async (data: PartnerTripFormData) => {
    try {
      if (editingTrip) {
        await updateTrip.mutateAsync({
          tripId: editingTrip.id,
          crmLeadId: klant.id,
          updates: data,
        });
        toast.success("Reis bijgewerkt");
      } else {
        await createTrip.mutateAsync({
          crmLeadId: klant.id,
          data,
        });
        toast.success("Reis aangemaakt");
      }
      setFormOpen(false);
      setEditingTrip(null);
    } catch (error) {
      toast.error("Kon reis niet opslaan");
    }
  };

  const handleUpdateViewings = async (viewings: ScheduledViewing[]) => {
    if (!selectedTrip) return;
    try {
      await updateViewings.mutateAsync({
        tripId: selectedTrip.id,
        crmLeadId: klant.id,
        viewings,
      });
    } catch (error) {
      toast.error("Kon bezichtigingen niet opslaan");
    }
  };

  const now = new Date();
  const upcomingTrips = klant.trips.filter((t) => new Date(t.trip_end_date) >= now);
  const pastTrips = klant.trips.filter((t) => new Date(t.trip_end_date) < now);

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Plane className="h-4 w-4" />
              Bezichtigingsreizen
              {klant.trips.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {klant.trips.length}
                </Badge>
              )}
            </CardTitle>
            <Button size="sm" variant="outline" onClick={handleOpenNew}>
              <Plus className="h-3 w-3 mr-1" />
              Nieuwe reis
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {klant.trips.length === 0 ? (
            <div className="text-center py-6">
              <Plane className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Nog geen reizen gepland</p>
              <Button variant="link" size="sm" onClick={handleOpenNew} className="mt-2">
                Plan de eerste reis
              </Button>
            </div>
          ) : (
            <>
              {upcomingTrips.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Aankomende ({upcomingTrips.length})
                  </h4>
                  {upcomingTrips.map((trip) => (
                    <TripCard key={trip.id} trip={trip} onClick={() => handleOpenDetail(trip)} />
                  ))}
                </div>
              )}

              {pastTrips.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Afgerond ({pastTrips.length})
                  </h4>
                  {pastTrips.slice(0, 3).map((trip) => (
                    <TripCard key={trip.id} trip={trip} onClick={() => handleOpenDetail(trip)} />
                  ))}
                  {pastTrips.length > 3 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{pastTrips.length - 3} eerdere reizen
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <PartnerTripFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        trip={editingTrip}
        isLoading={createTrip.isPending || updateTrip.isPending}
      />

      <PartnerTripDetailSheet
        trip={selectedTrip}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={handleOpenEdit}
        onUpdateViewings={handleUpdateViewings}
        assignedProjects={klant.assigned_projects}
        isUpdating={updateViewings.isPending}
      />
    </>
  );
}
