import { format, parseISO, differenceInDays, isFuture, startOfDay } from "date-fns";
import { nl } from "date-fns/locale";
import { Plane, Calendar, MapPin, ArrowRight, Clock, Building2, MessageCircle, Phone, CheckCircle, ListChecks, CalendarClock, Route } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useCustomerTrips, CustomerTrip } from "@/hooks/useCustomerTrips";
import { useEnrichedTrips, EnrichedTrip, ProjectDocument } from "@/hooks/useEnrichedTrips";
import { BezichtigingChecklist } from "./BezichtigingChecklist";
import { BezichtigingTips } from "./BezichtigingTips";
import { ViewingsPreview } from "./ViewingsPreview";

import { PersonalTravelGuide } from "./PersonalTravelGuide";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveCustomer } from "@/hooks/useEffectiveCustomer";
import { BEZICHTIGING_TEMPLATES } from "@/hooks/journeyChecklistTemplates";
import { useIsMobile } from "@/hooks/use-mobile";
import { useActiveReviews } from "@/hooks/useActiveReviews";
import { useMemo } from "react";

interface TripCountdownProps {
  trip: CustomerTrip;
  enrichedTrip?: EnrichedTrip;
  completedTasks: number;
  totalTasks: number;
}

function TripCountdown({ trip, enrichedTrip, completedTasks, totalTasks }: TripCountdownProps) {
  const startDate = parseISO(trip.trip_start_date);
  const today = startOfDay(new Date());
  const tripStart = startOfDay(startDate);
  const daysUntil = differenceInDays(tripStart, today);

  if (daysUntil < 0) return null;

  const progressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-primary/20 p-4">
              <Plane className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Jouw bezichtigingsreis</p>
              <p className="text-2xl font-bold">
                {daysUntil === 0 
                  ? "Vandaag!" 
                  : daysUntil === 1 
                    ? "Morgen" 
                    : `Nog ${daysUntil} dagen`}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-1">
                <span>{format(startDate, "d MMMM yyyy", { locale: nl })}</span>
                {trip.airport && (
                  <>
                    <span>•</span>
                    <span>{trip.airport}</span>
                  </>
                )}
                {enrichedTrip?.arrival_time && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {enrichedTrip.arrival_time}
                    </span>
                  </>
                )}
              </div>
              
              {/* Mini progress bar */}
              {totalTasks > 0 && (
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-1.5 w-24 bg-primary/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {completedTasks}/{totalTasks} voorbereidingen
                  </span>
                </div>
              )}
            </div>
          </div>
          <Button asChild className="hidden sm:flex">
            <Link to="/dashboard/bezichtiging">
              Bekijk planning
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <Button asChild className="w-full mt-4 sm:hidden">
          <Link to="/dashboard/bezichtiging">
            Bekijk planning
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

interface UpcomingTripSummaryProps {
  trip: CustomerTrip;
  enrichedTrip?: EnrichedTrip;
}

function UpcomingTripSummary({ trip, enrichedTrip }: UpcomingTripSummaryProps) {
  const isMobile = useIsMobile();
  const startDate = parseISO(trip.trip_start_date);
  const endDate = parseISO(trip.trip_end_date);
  const tripDuration = differenceInDays(endDate, startDate) + 1;
  const viewingsCount = trip.scheduled_viewings?.length || 0;

  const summaryContent = (
    <>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <Plane className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold leading-none tracking-tight">Geplande Bezichtigingsreis</h3>
        </div>
        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
          {trip.status === 'confirmed' ? 'Bevestigd' : 'Gepland'}
        </Badge>
      </div>

      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Periode</p>
              <p className="text-sm font-medium">
                {format(startDate, "d MMM", { locale: nl })} - {format(endDate, "d MMM", { locale: nl })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Duur</p>
              <p className="text-sm font-medium">{tripDuration} {tripDuration === 1 ? 'dag' : 'dagen'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <MapPin className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Bezichtigingen</p>
              <p className="text-sm font-medium">
                {viewingsCount > 0 ? `${viewingsCount} gepland` : 'Wordt nog ingepland'}
              </p>
            </div>
          </div>
        </div>

        {(trip.airport || enrichedTrip?.accommodation_info) && (
          <div className="pt-3 border-t space-y-3">
            {trip.airport && (
              <div className="flex items-start gap-3">
                <Plane className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Luchthaven</p>
                  <p className="text-sm">{trip.airport}</p>
                  {enrichedTrip?.arrival_time && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Aankomst: {enrichedTrip.arrival_time}
                      {enrichedTrip.departure_time && ` • Vertrek: ${enrichedTrip.departure_time}`}
                    </p>
                  )}
                </div>
              </div>
            )}
            
            {enrichedTrip?.accommodation_info && (
              <div className="flex items-start gap-3">
                <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Accommodatie</p>
                  <p className="text-sm">{enrichedTrip.accommodation_info}</p>
                </div>
              </div>
            )}
          </div>
        )}

        <Button asChild className="w-full">
          <Link to="/dashboard/bezichtiging">
            Bekijk volledige planning
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <div className="pb-4 border-b">
        {summaryContent}
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        {summaryContent}
      </CardContent>
    </Card>
  );
}

// --- VERBETERPUNT 1: Activatieroadmap voor "Geen reis gepland" ---
const ROADMAP_STEPS = [
  {
    number: 1,
    title: "Shortlist afronden",
    description: "Markeer je favoriete projecten zodat we weten welke woningen je wilt bezichtigen.",
    icon: ListChecks,
    actionLabel: "Bekijk projecten",
    actionLink: "/dashboard/projecten",
  },
  {
    number: 2,
    title: "Datum bespreken",
    description: "Neem contact op met Lars om samen een reisperiode te kiezen die bij jou past.",
    icon: CalendarClock,
    actionType: "contact" as const,
  },
  {
    number: 3,
    title: "Volledige planning",
    description: "Wij regelen de route, bezichtigingen en accommodatie — jij hoeft alleen je koffer te pakken.",
    icon: Route,
  },
];

function NoTripPlanned() {
  const isMobile = useIsMobile();
  const whatsappMessage = encodeURIComponent("Hallo Lars, ik wil graag een bezichtigingsreis plannen.");
  const whatsappUrl = `https://wa.me/32468122903?text=${whatsappMessage}`;

  const stepsContent = (
    <div className="space-y-1">
      <div className="flex items-center gap-2 mb-4">
        <Plane className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Je bezichtigingsreis voorbereiden</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        In drie stappen plannen we samen jouw bezichtigingsreis naar Spanje.
      </p>

      <div className="space-y-4">
        {ROADMAP_STEPS.map((step, index) => {
          const Icon = step.icon;
          const isLast = index === ROADMAP_STEPS.length - 1;

          return (
            <div key={step.number} className="flex gap-3">
              {/* Step indicator + connector line */}
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                  {step.number}
                </div>
                {!isLast && (
                  <div className="w-px flex-1 bg-border mt-1" />
                )}
              </div>

              {/* Content */}
              <div className={`flex-1 min-w-0 ${!isLast ? 'pb-4' : ''}`}>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Icon className="h-4 w-4 text-primary" />
                  <p className="font-medium text-sm">{step.title}</p>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{step.description}</p>

                {step.actionLink && (
                  <Button variant="outline" size="sm" asChild>
                    <Link to={step.actionLink}>
                      {step.actionLabel}
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                )}

                {step.actionType === "contact" && (
                  <div className="flex gap-2">
                    <Button size="sm" asChild>
                      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                        WhatsApp Lars
                      </a>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <a href="tel:+32468122903">
                        <Phone className="mr-1.5 h-3.5 w-3.5" />
                        Bellen
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  if (isMobile) {
    return stepsContent;
  }

  return (
    <Card>
      <CardContent className="p-6">
        {stepsContent}
      </CardContent>
    </Card>
  );
}

function BezichtigingLarsCTA() {
  const isMobile = useIsMobile();
  const whatsappMessage = encodeURIComponent("Hallo Lars, ik heb een vraag over mijn bezichtigingsreis.");
  const whatsappUrl = `https://wa.me/32468122903?text=${whatsappMessage}`;

  if (isMobile) {
    return (
      <div className="flex items-center gap-3 py-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">Vragen over je reis?</p>
          <p className="text-xs text-muted-foreground">Bereik Lars direct</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" asChild>
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
              WhatsApp
            </a>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <a href="tel:+32468122903">
              <Phone className="h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      </div>
    );
  }

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

function BezichtigingSocialProof() {
  // Dynamic sales count
  const { data: salesCount } = useQuery({
    queryKey: ['bezichtiging-social-proof-sales'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('sales')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'geannuleerd');
      if (error) return null;
      return count;
    },
  });

  // Random active review with image - from shared cache
  const { data: allActiveReviews } = useActiveReviews();
  const review = useMemo(() => {
    if (!allActiveReviews) return null;
    const withImage = allActiveReviews.filter(r => r.image_url);
    if (withImage.length === 0) return null;
    return withImage[Math.floor(Math.random() * withImage.length)];
  }, [allActiveReviews]);

  // Round down to nearest 10
  const displayCount = salesCount 
    ? `${Math.floor(salesCount / 10) * 10}+` 
    : '30+';

  return (
    <div className="space-y-3 py-2">
      {/* Dynamic fact */}
      <div className="flex items-center gap-2">
        <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
        <p className="text-sm font-medium text-foreground">
          Al {displayCount} families vonden hun droomwoning na een bezichtiging
        </p>
      </div>

      {/* Micro-testimonial */}
      {review && (
        <div className="flex items-start gap-3 pl-6">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={review.image_url} alt={review.customer_name} />
            <AvatarFallback className="text-xs">
              {review.customer_name?.charAt(0) || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm italic text-muted-foreground line-clamp-2">
              "{review.quote}"
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              — {review.customer_name}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function BezichtigingDashboardContent() {
  const { data: trips, isLoading } = useCustomerTrips();
  const { data: enrichedTrips, isLoading: isLoadingEnriched } = useEnrichedTrips();
  const { crmLeadId } = useEffectiveCustomer();

  // Fetch milestone progress for countdown
  const { data: milestones } = useQuery({
    queryKey: ["bezichtiging-milestones-count", crmLeadId],
    queryFn: async () => {
      if (!crmLeadId) return { completed: 0, total: 0 };
      
      const { data, error } = await supabase
        .from("journey_milestones")
        .select("template_key, completed_at")
        .eq("crm_lead_id", crmLeadId)
        .eq("phase", "bezichtiging");

      if (error) return { completed: 0, total: 0 };

      const visibleTemplates = BEZICHTIGING_TEMPLATES.filter(t => t.customerVisible);
      const completedCount = data.filter(m => !!m.completed_at && visibleTemplates.some(t => t.key === m.template_key)).length;
      
      return { 
        completed: completedCount, 
        total: visibleTemplates.length 
      };
    },
    enabled: !!crmLeadId,
  });

  if (isLoading || isLoadingEnriched) {
    return (
      <div className="space-y-6">
        <div className="h-32 rounded-lg bg-muted animate-pulse" />
        <div className="h-48 rounded-lg bg-muted animate-pulse" />
      </div>
    );
  }

  // Find upcoming trip (future start date) - use calendar days, not exact hours
  const todayStart = startOfDay(new Date());
  const upcomingTrip = trips?.find(trip => {
    const tripStart = startOfDay(parseISO(trip.trip_start_date));
    return isFuture(tripStart) || differenceInDays(tripStart, todayStart) >= 0;
  });

  // Check if there's an ongoing trip
  const today = new Date();
  const ongoingTrip = trips?.find(trip => {
    const startDate = parseISO(trip.trip_start_date);
    const endDate = parseISO(trip.trip_end_date);
    return startDate <= today && endDate >= today;
  });

  const activeTrip = ongoingTrip || upcomingTrip;
  
  // Find corresponding enriched trip
  const enrichedActiveTrip = enrichedTrips?.find(t => t.id === activeTrip?.id);
  
  // Calculate days until trip for showing tips - use calendar days
  const daysUntilTrip = activeTrip 
    ? differenceInDays(startOfDay(parseISO(activeTrip.trip_start_date)), todayStart)
    : null;

  // Collect all documents from enriched viewings
  const allDocuments: ProjectDocument[] = [];
  enrichedActiveTrip?.scheduled_viewings?.forEach(viewing => {
    viewing.documents?.forEach(doc => {
      if (!allDocuments.find(d => d.id === doc.id)) {
        allDocuments.push(doc);
      }
    });
  });

  return (
    <div className="space-y-6">
      {/* Trip summary or activation roadmap */}
      {activeTrip ? (
        <>
          <UpcomingTripSummary trip={activeTrip} enrichedTrip={enrichedActiveTrip} />
        </>
      ) : (
        <NoTripPlanned />
      )}

      {/* VERBETERPUNT 2: Social proof direct na trip summary / roadmap */}
      <BezichtigingSocialProof />

      {/* Preview of viewings (alleen bij actieve reis) */}
      {activeTrip && enrichedActiveTrip?.scheduled_viewings && enrichedActiveTrip.scheduled_viewings.length > 0 && (
        <ViewingsPreview 
          viewings={enrichedActiveTrip.scheduled_viewings}
          totalCount={enrichedActiveTrip.scheduled_viewings.length}
        />
      )}


      {/* Lars contact CTA */}
      <BezichtigingLarsCTA />

      {/* Bezichtiging Checklist */}
      <BezichtigingChecklist />

      {/* VERBETERPUNT 4: Tips eerder tonen — 21 dagen i.p.v. 7 */}
      {activeTrip && daysUntilTrip !== null && daysUntilTrip <= 21 && daysUntilTrip >= 0 && (
        <BezichtigingTips />
      )}

      {/* VERBETERPUNT 3: Persoonlijke Reisgids op dashboard */}
      <PersonalTravelGuide />
    </div>
  );
}
