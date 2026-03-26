
import { useInfoEveningRegistration } from "@/hooks/useInfoEveningRegistration";
import { PortalInfoavondRegistratie } from "@/components/infoavond/portal/PortalInfoavondRegistratie";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { InfoavondCompactHeader } from "@/components/infoavond/portal/InfoavondCompactHeader";
import { InfoavondEditRegistration } from "@/components/infoavond/portal/InfoavondEditRegistration";
import { InfoavondPreparationTabs } from "@/components/infoavond/portal/InfoavondPreparationTabs";
import { InfoavondAfterEvent } from "@/components/infoavond/portal/InfoavondAfterEvent";
import { DashboardBackToOntdekken } from "@/components/dashboard/DashboardBackToOntdekken";

export default function Infoavond() {
  const { data: registration, isLoading } = useInfoEveningRegistration();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  // User is not registered - show simplified registration
  if (!registration) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4">
        <DashboardBackToOntdekken />
        <div className="mt-4">
          <PortalInfoavondRegistratie />
        </div>
      </div>
    );
  }

  // User is registered - Clean 3-phase layout
  return (
    <>
      <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
        {/* Back navigation */}
        <DashboardBackToOntdekken />

        {/* Phase 1: Je afspraak - Compact header with all essential info */}
        <InfoavondCompactHeader 
          firstName={registration.first_name}
          isConfirmed={registration.confirmed || false}
          event={registration.event}
          numberOfPersons={registration.number_of_persons}
        />

        {/* Quick actions - Edit registration */}
        <InfoavondEditRegistration
          registrationId={registration.id}
          currentPersons={registration.number_of_persons}
          eventTitle={registration.event.title}
        />

        {/* Phase 2: Bereid je voor - Main focus with tabs */}
        <InfoavondPreparationTabs event={registration.event} />

        {/* Phase 3: Na de avond - Winactie + Locked extras */}
        <InfoavondAfterEvent eventDate={registration.event.date} />
      </div>
    </>
  );
}