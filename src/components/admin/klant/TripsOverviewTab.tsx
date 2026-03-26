import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays, addDays, isWithinInterval, isBefore } from "date-fns";
import { nl } from "date-fns/locale";
import { Plane, Calendar, MapPin, ChevronDown, ChevronRight, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface TripWithLead {
  id: string;
  crm_lead_id: string;
  trip_start_date: string;
  trip_end_date: string;
  airport: string | null;
  status: string | null;
  trip_type: string;
  scheduled_viewings: any;
  first_name: string | null;
  last_name: string | null;
  journey_phase: string | null;
}

function useAllTrips() {
  return useQuery({
    queryKey: ["admin-all-trips"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_viewing_trips")
        .select(`
          id, crm_lead_id, trip_start_date, trip_end_date, airport, status, trip_type, scheduled_viewings,
          crm_leads!customer_viewing_trips_crm_lead_id_fkey ( first_name, last_name, journey_phase )
        `)
        .order("trip_start_date", { ascending: true });

      if (error) throw error;

      return (data || []).map((t: any) => ({
        id: t.id,
        crm_lead_id: t.crm_lead_id,
        trip_start_date: t.trip_start_date,
        trip_end_date: t.trip_end_date,
        airport: t.airport,
        status: t.status,
        trip_type: t.trip_type || "bezichtiging",
        scheduled_viewings: t.scheduled_viewings,
        first_name: t.crm_leads?.first_name ?? null,
        last_name: t.crm_leads?.last_name ?? null,
        journey_phase: t.crm_leads?.journey_phase ?? null,
      })) as TripWithLead[];
    },
  });
}

const JOURNEY_LABELS: Record<string, string> = {
  orientatie: "Oriëntatie",
  orienteren: "Oriëntatie",
  selectie: "Selectie",
  bezichtiging: "Bezichtiging",
  aankoop: "Aankoop",
  overdracht: "Overdracht",
  beheer: "Beheer",
};

function getStatusBadge(status: string | null) {
  switch (status) {
    case "confirmed":
      return <Badge className="bg-green-600 text-xs">Bevestigd</Badge>;
    case "completed":
      return <Badge variant="secondary" className="text-xs">Afgerond</Badge>;
    case "cancelled":
      return <Badge variant="destructive" className="text-xs">Geannuleerd</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">Gepland</Badge>;
  }
}

function getJourneyBadge(phase: string | null) {
  if (!phase) return null;
  const label = JOURNEY_LABELS[phase] || phase;
  
  switch (phase) {
    case "aankoop":
      return <Badge className="bg-amber-700 text-white text-xs">{label}</Badge>;
    case "overdracht":
      return <Badge className="bg-purple-600 text-white text-xs">{label}</Badge>;
    case "beheer":
      return <Badge className="bg-teal-600 text-white text-xs">{label}</Badge>;
    case "selectie":
      return <Badge className="bg-blue-600 text-white text-xs">{label}</Badge>;
    default:
      return <Badge variant="secondary" className="text-xs">{label}</Badge>;
  }
}

function TripRow({ trip, onClick }: { trip: TripWithLead; onClick: () => void }) {
  const start = new Date(trip.trip_start_date);
  const end = new Date(trip.trip_end_date);
  const days = differenceInDays(end, start) + 1;
  const viewingsCount = Array.isArray(trip.scheduled_viewings) ? trip.scheduled_viewings.length : 0;
  const name = [trip.first_name, trip.last_name].filter(Boolean).join(" ") || "Onbekend";

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg border hover:border-primary/50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{name}</span>
          {trip.trip_type === "terugkeer" ? (
            <Badge className="bg-teal-600 text-xs">Koper ✓</Badge>
          ) : (
            getJourneyBadge(trip.journey_phase)
          )}
          {getStatusBadge(trip.status)}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(start, "d MMM", { locale: nl })} – {format(end, "d MMM yyyy", { locale: nl })}
          </span>
          <span>{days} dagen</span>
          {trip.airport && (
            <span className="flex items-center gap-1">
              <Plane className="h-3 w-3" />
              {trip.airport}
            </span>
          )}
          {viewingsCount > 0 && (
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {viewingsCount} bezichtiging{viewingsCount !== 1 ? "en" : ""}
            </span>
          )}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </div>
  );
}

function TripSection({
  title,
  trips,
  defaultOpen = true,
  onTripClick,
  icon,
}: {
  title: string;
  trips: TripWithLead[];
  defaultOpen?: boolean;
  onTripClick: (trip: TripWithLead) => void;
  icon?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (trips.length === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 group">
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        {icon}
        <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
          {title} ({trips.length})
        </h3>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 mt-2">
        {trips.map((trip) => (
          <TripRow key={trip.id} trip={trip} onClick={() => onTripClick(trip)} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function TripsOverviewTab() {
  const navigate = useNavigate();
  const { data: trips, isLoading } = useAllTrips();

  const groups = useMemo(() => {
    if (!trips) return { now: [], soon: [], later: [], done: [] };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in30Days = addDays(today, 30);

    const now: TripWithLead[] = [];
    const soon: TripWithLead[] = [];
    const later: TripWithLead[] = [];
    const done: TripWithLead[] = [];

    for (const trip of trips) {
      if (trip.status === "cancelled") continue;

      const start = new Date(trip.trip_start_date);
      const end = new Date(trip.trip_end_date);

      if (isBefore(end, today)) {
        done.push(trip);
      } else if (isWithinInterval(today, { start, end })) {
        now.push(trip);
      } else if (isBefore(start, in30Days)) {
        soon.push(trip);
      } else {
        later.push(trip);
      }
    }

    // Done: most recent first, limit 10
    done.sort((a, b) => new Date(b.trip_end_date).getTime() - new Date(a.trip_end_date).getTime());
    return { now, soon, later, done: done.slice(0, 10) };
  }, [trips]);

  const handleClick = (trip: TripWithLead) => {
    navigate(`/admin/klanten/${trip.crm_lead_id}/reis/${trip.id}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-4 mt-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  const totalActive = groups.now.length + groups.soon.length + groups.later.length;

  if (!trips?.length) {
    return (
      <Card className="mt-4">
        <CardContent className="py-12 text-center">
          <Plane className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nog geen bezichtigingsreizen ingepland.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 mt-4">
      <TripSection
        title="Nu in Spanje"
        trips={groups.now}
        onTripClick={handleClick}
        icon={<MapPin className="h-4 w-4 text-green-600" />}
      />
      <TripSection
        title="Komende 30 dagen"
        trips={groups.soon}
        onTripClick={handleClick}
        icon={<Calendar className="h-4 w-4 text-blue-600" />}
      />
      <TripSection
        title="Later gepland"
        trips={groups.later}
        onTripClick={handleClick}
        icon={<Plane className="h-4 w-4 text-muted-foreground" />}
      />
      <TripSection
        title="Afgeronde reizen"
        trips={groups.done}
        defaultOpen={false}
        onTripClick={handleClick}
      />
    </div>
  );
}
