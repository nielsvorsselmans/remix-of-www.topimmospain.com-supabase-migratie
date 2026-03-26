import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarHeart, CheckCircle, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useFutureInfoEvents } from "@/hooks/useActiveInfoEvents";
import { useAuth } from "@/hooks/useAuth";
import { useEffectiveCustomer } from "@/hooks/useEffectiveCustomer";
import { useCustomerPreview } from "@/contexts/CustomerPreviewContext";
import { EventCard } from "./EventCard";
import { QuickRegistrationForm } from "./QuickRegistrationForm";
import { InfoavondWinactiePreview } from "./InfoavondWinactiePreview";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { SocialProofStrip } from "@/components/shared/SocialProofStrip";
import { MicroTestimonial } from "@/components/shared/MicroTestimonial";
import { ReplayFallback } from "@/components/shared/ReplayFallback";

interface InfoEveningEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location_name: string;
  location_address: string;
  current_registrations: number | null;
  max_capacity: number | null;
}

// Concrete takeaways for info evening
const INFOAVOND_TAKEAWAYS = [
  "Persoonlijk advies over jouw situatie",
  "Hypotheek- en financieringsopties uitgelegd",
  "Concrete volgende stappen voor jouw traject",
];

// Testimonial data
const INFOAVOND_TESTIMONIAL = {
  quote: "De infoavond gaf me het vertrouwen om de volgende stap te zetten. Eindelijk iemand die eerlijk is.",
  author: "Sandra & Koen",
  location: "Utrecht"
};

export function PortalInfoavondRegistratie() {
  const { user, profile } = useAuth();
  const { crmLeadId, isLoading: isLoadingCustomer } = useEffectiveCustomer();
  const { isPreviewMode, previewCustomer } = useCustomerPreview();
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const navigate = useNavigate();

  // Fetch CRM lead data based on effective customer (supports admin preview)
  const { data: crmLead } = useQuery({
    queryKey: ["crm-lead-for-registration", crmLeadId],
    queryFn: async () => {
      if (!crmLeadId) return null;
      const { data, error } = await supabase
        .from("crm_leads")
        .select("phone, first_name, last_name")
        .eq("id", crmLeadId)
        .maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!crmLeadId,
  });

  // Fetch available future events from shared cache
  const { data: events, isLoading } = useFutureInfoEvents();

  // Use preview customer data when in preview mode, otherwise use profile/crmLead
  const firstName = isPreviewMode 
    ? previewCustomer?.first_name || ""
    : profile?.first_name || crmLead?.first_name || "";
  const lastName = isPreviewMode 
    ? previewCustomer?.last_name || ""
    : profile?.last_name || crmLead?.last_name || "";
  const email = isPreviewMode 
    ? previewCustomer?.email || ""
    : profile?.email || user?.email || "";

  const handleWebinarFallback = () => {
    navigate("/dashboard/webinar");
  };

  if (isLoading || isLoadingCustomer) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <CalendarHeart className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              {firstName ? `Hoi ${firstName}, kom je ook?` : "Kom naar onze infoavond"}
            </h1>
            <p className="text-muted-foreground">
              Ontdek alles over investeren in Spaans vastgoed
            </p>
          </div>
        </div>

        {/* Social Proof Strip */}
        <SocialProofStrip />

        {/* Concrete Takeaways */}
        <div className="grid sm:grid-cols-1 gap-2">
          {INFOAVOND_TAKEAWAYS.map((takeaway, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-primary shrink-0" />
              <span>{takeaway}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Micro Testimonial */}
      <MicroTestimonial 
        quote={INFOAVOND_TESTIMONIAL.quote}
        author={INFOAVOND_TESTIMONIAL.author}
        location={INFOAVOND_TESTIMONIAL.location}
      />

      {/* Available Events */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Beschikbare infoavonden
        </h2>

        {!events || events.length === 0 ? (
          <div className="space-y-4">
            <div className="text-center py-6 text-muted-foreground bg-muted/30 rounded-lg">
              <p className="font-medium">Er zijn momenteel geen infoavonden gepland.</p>
              <p className="text-sm">Maar je kunt wel ons online webinar volgen!</p>
            </div>
            <ReplayFallback type="infoavond" onRequestReplay={handleWebinarFallback} />
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                isExpanded={expandedEventId === event.id}
                onToggle={() => 
                  setExpandedEventId(
                    expandedEventId === event.id ? null : event.id
                  )
                }
              >
                <QuickRegistrationForm
                  eventId={event.id}
                  firstName={firstName}
                  lastName={lastName}
                  email={email}
                  phone={crmLead?.phone}
                  onSuccess={() => setExpandedEventId(null)}
                />
              </EventCard>
            ))}

            {/* Webinar Fallback - for those who can't attend physically */}
            <ReplayFallback type="infoavond" onRequestReplay={handleWebinarFallback} />
          </div>
        )}
      </div>

      {/* Winactie Preview */}
      <InfoavondWinactiePreview />
    </div>
  );
}
