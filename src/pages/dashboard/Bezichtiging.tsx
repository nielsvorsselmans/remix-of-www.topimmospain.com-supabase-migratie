import { useEnrichedTrips } from "@/hooks/useEnrichedTrips";
import { EnrichedTripCard } from "@/components/EnrichedTripCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { parseISO, differenceInDays } from "date-fns";
import { 
  Plane, 
  Calendar, 
  CheckCircle2,
  Lightbulb,
  MessageCircle,
  Phone,
  Sun
} from "lucide-react";
import { PersonalTravelGuide } from "@/components/bezichtiging/PersonalTravelGuide";

function TripCountdownHeader({ trips }: { trips: ReturnType<typeof useEnrichedTrips>["data"] }) {
  const upcomingTrips = trips?.filter(
    (trip) => trip.status !== "completed" && trip.status !== "cancelled"
  ) || [];

  if (upcomingTrips.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Bezichtigingsreis</h1>
        <p className="text-muted-foreground">
          Plan je bezoek aan Spanje en bekijk je geselecteerde projecten
        </p>
      </div>
    );
  }

  const nextTrip = upcomingTrips[0];
  const startDate = parseISO(nextTrip.trip_start_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysUntil = differenceInDays(startDate, today);

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
        <Sun className="h-6 w-6 text-amber-500" />
        Je reis naar Spanje
      </h1>
      {daysUntil > 0 ? (
        <p className="text-muted-foreground">
          Nog <span className="font-semibold text-primary">{daysUntil} {daysUntil === 1 ? "dag" : "dagen"}</span> — dan ga je je toekomstige investering ontdekken
        </p>
      ) : daysUntil === 0 ? (
        <p className="text-muted-foreground">
          <span className="font-semibold text-primary">Vandaag is het zover!</span> Geniet van je bezichtigingsreis
        </p>
      ) : (
        <p className="text-muted-foreground">
          Bekijk je geplande bezichtigingen en bereid je voor
        </p>
      )}
    </div>
  );
}

function ContactCTA() {
  const whatsappMessage = encodeURIComponent("Hallo Lars, ik heb een vraag over mijn bezichtigingsreis.");
  const whatsappUrl = `https://wa.me/32468122903?text=${whatsappMessage}`;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <MessageCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Vragen over je reis?</h3>
              <p className="text-sm text-muted-foreground">
                Bereik Lars direct via WhatsApp of telefoon
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="mr-2 h-4 w-4" />
                WhatsApp
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="tel:+32468122903">
                <Phone className="mr-2 h-4 w-4" />
                Bel Lars
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BezichtigingContent() {
  const { data: trips, isLoading } = useEnrichedTrips();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const upcomingTrips = trips?.filter(
    (trip) => trip.status !== "completed" && trip.status !== "cancelled"
  ) || [];
  
  const pastTrips = trips?.filter(
    (trip) => trip.status === "completed"
  ) || [];

  if (upcomingTrips.length === 0 && pastTrips.length === 0) {
    return (
      <div className="space-y-6">
        <TripCountdownHeader trips={trips} />

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <Plane className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Nog geen reis gepland</h2>
            <p className="text-muted-foreground max-w-md mb-6">
              Zodra je genoeg projecten hebt geselecteerd, plannen we samen een bezichtigingsreis 
              naar Spanje. We regelen alles: van projectselectie tot bezichtigingsschema.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button asChild>
                <Link to="/dashboard/projecten">
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Bekijk geselecteerde projecten
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/afspraak">
                  <Calendar className="mr-2 h-4 w-4" />
                  Plan een gesprek
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <PersonalTravelGuide />

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-amber-500/10 p-2">
                <Lightbulb className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold mb-2">Tips voor je bezichtigingsreis</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    Plan minimaal 2-3 dagen voor een goede bezichtigingsronde
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    Vluchten naar Alicante of Murcia zijn het meest praktisch
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    Wij plannen maximaal 4-5 bezichtigingen per dag
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    Een huurauto is aan te raden voor flexibiliteit
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TripCountdownHeader trips={trips} />

      {upcomingTrips.length > 0 && (
        <div className="space-y-6">
          {upcomingTrips.map((trip) => (
            <EnrichedTripCard key={trip.id} trip={trip} showChecklist={true} />
          ))}
        </div>
      )}

      {pastTrips.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-muted-foreground">
            Eerdere Reizen
          </h2>
          <div className="space-y-4 opacity-75">
            {pastTrips.map((trip) => (
              <EnrichedTripCard key={trip.id} trip={trip} showChecklist={false} />
            ))}
          </div>
        </div>
      )}

      <ContactCTA />

      <PersonalTravelGuide />
    </div>
  );
}

export default function Bezichtiging() {
  return <BezichtigingContent />;
}
