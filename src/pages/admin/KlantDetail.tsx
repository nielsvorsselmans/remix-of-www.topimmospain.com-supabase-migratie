import { useParams } from "react-router-dom";
import { useKlant } from "@/hooks/useKlant";

import { KlantHeader } from "@/components/admin/klant/KlantHeader";
import { KlantJourneyCard } from "@/components/admin/klant/KlantJourneyCard";
import { KlantJourneyChecklistCard } from "@/components/admin/klant/KlantJourneyChecklistCard";
import { KlantContactCard } from "@/components/admin/klant/KlantContactCard";
import { KlantEngagementCard } from "@/components/admin/klant/KlantEngagementCard";
import { KlantNotitiesCard } from "@/components/admin/klant/KlantNotitiesCard";
import { KlantEvenementenCard } from "@/components/admin/klant/KlantEvenementenCard";
import { KlantProjectenTabs } from "@/components/admin/klant/KlantProjectenTabs";
import { KlantTripsCard } from "@/components/admin/klant/KlantTripsCard";
import { KlantVerkopenCard } from "@/components/admin/klant/KlantVerkopenCard";
import { KlantAccountStatusCard } from "@/components/admin/klant/KlantAccountStatusCard";
import { KlantReviewsCard } from "@/components/admin/klant/KlantReviewsCard";
import { KlantPreferencesCard } from "@/components/admin/klant/KlantPreferencesCard";
import { KlantDroppedOffCard } from "@/components/admin/klant/KlantDroppedOffCard";
import { KlantPartnerCard } from "@/components/admin/klant/KlantPartnerCard";
import { KlantNurtureTestCard } from "@/components/admin/klant/KlantNurtureTestCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { useQueryClient } from "@tanstack/react-query";

export default function KlantDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data: klant, isLoading, error } = useKlant(id || "");

  const handleMagicLinkSent = () => {
    queryClient.invalidateQueries({ queryKey: ["klant", id] });
  };

  if (isLoading) {
    return (
      <>
        <div className="space-y-6">
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

  if (error || !klant) {
    return (
      <>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Klant niet gevonden</p>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <KlantHeader klant={klant} />

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Action sections */}
          <div className="lg:col-span-2 space-y-6">
            {/* Journey Card */}
            <KlantJourneyCard klant={klant} />

            {/* Journey Checklist - Pre-sales milestones */}
            <KlantJourneyChecklistCard 
              crmLeadId={klant.id} 
              currentPhase={klant.journey_phase || 'orientatie'}
              hasAccount={!!klant.user_id}
            />

            {/* Projecten Tabs - Combines Assigned, Suggested, and Favorites */}
            <KlantProjectenTabs klant={klant} />

            {/* Evenementen - Afspraken, Webinars, Infoavonden */}
            <KlantEvenementenCard klant={klant} />

            {/* Bezichtigingsreizen */}
            <KlantTripsCard klant={klant} />

            {/* Aankopen */}
            <KlantVerkopenCard klant={klant} />

          </div>

          {/* Right Column - Info sections */}
          <div className="space-y-6">
            {/* Show dropped off card if applicable */}
            {klant.dropped_off_at && (
              <KlantDroppedOffCard klant={klant} />
            )}
            <KlantNurtureTestCard klant={klant} />
            <KlantPartnerCard klant={klant} />
            <KlantAccountStatusCard
              klant={klant} 
              onMagicLinkSent={handleMagicLinkSent}
            />
            <KlantPreferencesCard klant={klant} />
            <KlantContactCard klant={klant} />
            <KlantReviewsCard klant={klant} />
            <KlantNotitiesCard klant={klant} />
            <KlantEngagementCard klant={klant} />
          </div>
        </div>
      </div>
    </>
  );
}
