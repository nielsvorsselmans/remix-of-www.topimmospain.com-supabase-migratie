import { useParams, Link } from "react-router-dom";
import { usePartnerKlant } from "@/hooks/usePartnerKlant";

import { PartnerKlantHeader } from "@/components/partner/klant/PartnerKlantHeader";
import { PartnerKlantContactCard } from "@/components/partner/klant/PartnerKlantContactCard";
import { PartnerKlantEngagementCard } from "@/components/partner/klant/PartnerKlantEngagementCard";
import { PartnerKlantProjectenTabs } from "@/components/partner/klant/PartnerKlantProjectenTabs";
import { PartnerKlantTripsCard } from "@/components/partner/klant/PartnerKlantTripsCard";
import { PartnerKlantNotitiesCard } from "@/components/partner/klant/PartnerKlantNotitiesCard";
import { PartnerKlantJourneyCard } from "@/components/partner/klant/PartnerKlantJourneyCard";
import { PartnerKlantPreferencesCard } from "@/components/partner/klant/PartnerKlantPreferencesCard";
import { PartnerKlantAccountStatusCard } from "@/components/partner/klant/PartnerKlantAccountStatusCard";
import { PartnerKlantVerkopenCard } from "@/components/partner/klant/PartnerKlantVerkopenCard";
import { PartnerKlantAfsprakenCard } from "@/components/partner/klant/PartnerKlantAfsprakenCard";
import { PartnerKlantJourneyChecklistCard } from "@/components/partner/klant/PartnerKlantJourneyChecklistCard";
import { PartnerKlantDroppedOffCard } from "@/components/partner/klant/PartnerKlantDroppedOffCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function PartnerKlantDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = usePartnerKlant(id || "");

  if (isLoading) {
    return (
      <>
        <div className="container mx-auto p-6 space-y-6">
          <Skeleton className="h-16 w-full" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto p-6">
        <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground mb-4">Klant niet gevonden of geen toegang</p>
              <Button variant="outline" asChild>
                <Link to="/partner/dashboard">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Terug naar dashboard
                </Link>
              </Button>
            </CardContent>
          </Card>
      </div>
    );
  }

  const { klant, partnerId } = data;

  return (
    <>
      <div className="container mx-auto p-6 space-y-6">
        {/* Back button */}
        <Button variant="ghost" size="sm" asChild className="mb-2">
          <Link to="/partner/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Terug naar dashboard
          </Link>
        </Button>

        {/* Header */}
        <PartnerKlantHeader klant={klant} />

        {/* Drop-off Warning (if applicable) */}
        <PartnerKlantDroppedOffCard klant={klant} />

        {/* Main Content - Same structure as admin */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Action sections (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Journey Card */}
            <PartnerKlantJourneyCard klant={klant} />

            {/* Journey Checklist (read-only) */}
            <PartnerKlantJourneyChecklistCard klant={klant} />

            {/* Projecten Tabs - with AI suggestions and favorites */}
            <PartnerKlantProjectenTabs klant={klant} partnerId={partnerId} />

            {/* Verkopen/Aankopen */}
            <PartnerKlantVerkopenCard klant={klant} />

            {/* Bezichtigingsreizen */}
            <PartnerKlantTripsCard klant={klant} />

            {/* Afspraken */}
            <PartnerKlantAfsprakenCard klant={klant} />
          </div>

          {/* Right Column - Info sections (1/3 width) */}
          <div className="space-y-6">
            <PartnerKlantContactCard klant={klant} />
            <PartnerKlantAccountStatusCard klant={klant} />
            <PartnerKlantPreferencesCard klant={klant} />
            <PartnerKlantEngagementCard klant={klant} />
            <PartnerKlantNotitiesCard klant={klant} partnerId={partnerId} />
          </div>
        </div>
      </div>
    </>
  );
}
