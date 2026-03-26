import { format, parseISO, differenceInDays } from "date-fns";
import { nl } from "date-fns/locale";
import { 
  Plane, 
  Calendar, 
  MapPin, 
  Hotel, 
  Clock,
  CheckCircle2,
  FileText,
  Map
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { EnrichedViewingItem } from "@/components/EnrichedViewingItem";
import { ViewingTripMap } from "@/components/ViewingTripMap";
import { TripPreparationChecklist } from "@/components/TripPreparationChecklist";
import type { EnrichedTrip, EnrichedViewing } from "@/hooks/useEnrichedTrips";

interface EnrichedTripCardProps {
  trip: EnrichedTrip;
  showChecklist?: boolean;
}

function getTripStatusBadge(status: string | null) {
  switch (status) {
    case "confirmed":
      return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Bevestigd</Badge>;
    case "completed":
      return <Badge variant="secondary">Afgerond</Badge>;
    case "cancelled":
      return <Badge variant="destructive">Geannuleerd</Badge>;
    default:
      return <Badge variant="outline">Gepland</Badge>;
  }
}

function groupViewingsByDate(viewings: EnrichedViewing[]): Record<string, EnrichedViewing[]> {
  return viewings.reduce((acc, viewing) => {
    const date = viewing.date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(viewing);
    return acc;
  }, {} as Record<string, EnrichedViewing[]>);
}

export function EnrichedTripCard({ trip, showChecklist = true }: EnrichedTripCardProps) {
  const startDate = parseISO(trip.trip_start_date);
  const endDate = parseISO(trip.trip_end_date);
  const tripDuration = differenceInDays(endDate, startDate) + 1;
  const viewingsByDate = groupViewingsByDate(trip.scheduled_viewings);
  const sortedDates = Object.keys(viewingsByDate).sort();
  
  // Count unique projects
  const uniqueProjects = new Set(trip.scheduled_viewings.map(v => v.project_id));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Plane className="h-5 w-5 text-primary" />
                Bezichtigingsreis
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {format(startDate, "d MMMM", { locale: nl })} - {format(endDate, "d MMMM yyyy", { locale: nl })}
                <span className="mx-2">•</span>
                {tripDuration} {tripDuration === 1 ? "dag" : "dagen"}
                {uniqueProjects.size > 0 && (
                  <>
                    <span className="mx-2">•</span>
                    {uniqueProjects.size} {uniqueProjects.size === 1 ? "project" : "projecten"}
                  </>
                )}
              </p>
            </div>
            {getTripStatusBadge(trip.status)}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Reis Details */}
          <div className="grid gap-4 sm:grid-cols-2">
            {trip.airport && (
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Plane className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Luchthaven</p>
                  <p className="text-sm text-muted-foreground">{trip.airport}</p>
                </div>
              </div>
            )}

            {(trip.arrival_time || trip.departure_time) && (
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Vluchttijden</p>
                  <p className="text-sm text-muted-foreground">
                    {trip.arrival_time && `Aankomst: ${trip.arrival_time}`}
                    {trip.arrival_time && trip.departure_time && " • "}
                    {trip.departure_time && `Vertrek: ${trip.departure_time}`}
                  </p>
                </div>
              </div>
            )}

            {trip.flight_info && (
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Vluchtinfo</p>
                  <p className="text-sm text-muted-foreground">{trip.flight_info}</p>
                </div>
              </div>
            )}

            {trip.accommodation_info && (
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Hotel className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Accommodatie</p>
                  <p className="text-sm text-muted-foreground">{trip.accommodation_info}</p>
                </div>
              </div>
            )}
          </div>

          {/* Admin Notes (personalized guidance) */}
          {trip.admin_notes && (
            <div className="rounded-lg bg-primary/5 border border-primary/10 p-4">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-primary">Van Top Immo Spain</p>
                  <p className="text-sm text-muted-foreground mt-1">{trip.admin_notes}</p>
                </div>
              </div>
            </div>
          )}

          {/* Interactive Map */}
          {trip.scheduled_viewings.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Map className="h-4 w-4" />
                  Locaties Overzicht
                </h3>
                <ViewingTripMap viewings={trip.scheduled_viewings} />
              </div>
            </>
          )}

          {/* Scheduled Viewings */}
          {sortedDates.length > 0 && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Programma
                </h3>

                <div className="space-y-6">
                  {sortedDates.map((date) => (
                    <div key={date} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="h-px flex-1 bg-border" />
                        <span className="text-sm font-medium px-3 py-1 rounded-full bg-muted">
                          {format(parseISO(date), "EEEE d MMMM", { locale: nl })}
                        </span>
                        <div className="h-px flex-1 bg-border" />
                      </div>

                      <div className="space-y-3">
                        {viewingsByDate[date]
                          .sort((a, b) => a.time.localeCompare(b.time))
                          .map((viewing, idx) => (
                            <EnrichedViewingItem 
                              key={viewing.id} 
                              viewing={viewing} 
                              index={idx} 
                            />
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {sortedDates.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
              <Calendar className="h-4 w-4 text-primary/50 shrink-0" />
              <span>Je bezichtigingsschema wordt samengesteld — Lars neemt contact met je op.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preparation Checklist */}
      {showChecklist && (
        <TripPreparationChecklist 
          tripId={trip.id} 
          projectCount={uniqueProjects.size} 
        />
      )}
    </div>
  );
}
