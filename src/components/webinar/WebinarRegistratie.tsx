import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Video, Calendar, Users, Shield, CheckCircle, Clock, TrendingUp, ArrowRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { trackEvent } from "@/lib/tracking";
import { useFutureWebinarEvents } from "@/hooks/useActiveWebinarEvents";

interface WebinarRegistratieProps {
  selectedEventId: string | null;
}

export function WebinarRegistratie({ selectedEventId }: WebinarRegistratieProps) {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showStickyCTA, setShowStickyCTA] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [formData, setFormData] = useState({
    eventId: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  // Sticky CTA visibility logic
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowStickyCTA(!entry.isIntersecting);
      },
      { threshold: 0 }
    );

    if (formRef.current) {
      observer.observe(formRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const { data: events } = useFutureWebinarEvents();

  // Filter available events (not full)
  const availableEvents = events?.filter(
    (e) => e.current_registrations < e.max_capacity
  );

  // Get selected event for urgency display
  const selectedEvent = events?.find(e => e.id === formData.eventId);
  const spotsLeft = selectedEvent ? selectedEvent.max_capacity - selectedEvent.current_registrations : null;
  const isLimited = spotsLeft !== null && spotsLeft <= 10;

  useEffect(() => {
    if (selectedEventId) {
      setFormData((prev) => ({ ...prev, eventId: selectedEventId }));
    }
  }, [selectedEventId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.eventId || !formData.firstName || !formData.lastName || !formData.email) {
      toast.error("Vul alle verplichte velden in");
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate client-side UUID for the registration
      const registrationId = crypto.randomUUID();
      const normalizedEmail = formData.email.trim().toLowerCase();

      // Get UTM params from URL
      const urlParams = new URLSearchParams(window.location.search);
      const utmSource = urlParams.get("utm_source");
      const utmMedium = urlParams.get("utm_medium");
      const utmCampaign = urlParams.get("utm_campaign");
      const utmContent = urlParams.get("utm_content");

      // Check for duplicate registration
      const { data: existingReg } = await supabase
        .from("webinar_registrations")
        .select("id")
        .eq("email", normalizedEmail)
        .eq("event_id", formData.eventId)
        .maybeSingle();

      if (existingReg) {
        toast.info("Je bent al ingeschreven voor dit webinar!");
        // Still navigate to confirmation with existing data
        navigate("/webinars/bevestiging", {
          state: {
            registrationId: existingReg.id,
            email: normalizedEmail,
            firstName: formData.firstName,
            lastName: formData.lastName,
            eventId: selectedEvent?.id,
            eventTitle: selectedEvent?.title || "Webinar Investeren in Spaans Vastgoed",
            eventDate: selectedEvent?.date,
            eventTime: selectedEvent?.time,
            durationMinutes: selectedEvent?.duration_minutes || 60,
          },
        });
        return;
      }

      // Insert registration with confirmed: true (no OTP needed)
      const { error: insertError } = await supabase
        .from("webinar_registrations")
        .insert({
          id: registrationId,
          event_id: formData.eventId,
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: normalizedEmail,
          phone: formData.phone || null,
          confirmed: true, // Direct confirmation - no OTP
          utm_source: utmSource,
          utm_medium: utmMedium,
          utm_campaign: utmCampaign,
          utm_content: utmContent,
        });

      if (insertError) throw insertError;

      // Track event
      trackEvent("webinar_registration", {
        event_id: formData.eventId,
        email: normalizedEmail,
      });

      // Trigger sync in background (non-blocking)
      supabase.functions.invoke("sync-webinar-registration", {
        body: {
          registration_id: registrationId,
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: normalizedEmail,
          phone: formData.phone || null,
          event_title: selectedEvent?.title || "Webinar Investeren in Spaans Vastgoed",
          event_date: selectedEvent?.date,
          event_time: selectedEvent?.time,
          event_duration_minutes: selectedEvent?.duration_minutes || 60,
        },
      }).catch((err) => {
        console.error("Sync failed (will retry):", err);
      });

      toast.success("Je bent ingeschreven!");

      // Navigate to confirmation page with state
      navigate("/webinars/bevestiging", {
        state: {
          registrationId,
          email: normalizedEmail,
          firstName: formData.firstName,
          lastName: formData.lastName,
          eventId: selectedEvent?.id,
          eventTitle: selectedEvent?.title || "Webinar Investeren in Spaans Vastgoed",
          eventDate: selectedEvent?.date,
          eventTime: selectedEvent?.time,
          durationMinutes: selectedEvent?.duration_minutes || 60,
        },
      });

    } catch (error) {
      console.error("Registration error:", error);
      toast.error("Er ging iets mis. Probeer het opnieuw.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="webinar-registratie" className="py-12 md:py-16 lg:py-24 bg-secondary/30">
      <div className="container px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-6 md:mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-primary/10 text-primary mb-3 md:mb-4">
              <Video className="h-3.5 w-3.5 md:h-4 md:w-4" />
              <span className="text-xs md:text-sm font-medium">Gratis inschrijven</span>
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-3 md:mb-4">
              Reserveer je plek
            </h2>
            <p className="text-sm md:text-base text-muted-foreground">
              Vul je gegevens in en ontvang direct je toegangslink
            </p>
          </div>

          {/* Q&A Highlight + Optional Urgency */}
          <div className="space-y-3 md:space-y-4 mb-4 md:mb-6">
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 md:p-4 flex items-start gap-3 md:gap-4">
              <MessageCircle className="h-6 w-6 md:h-8 md:w-8 text-primary flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-foreground text-xs md:text-sm mb-0.5 md:mb-1">Live vragen stellen</h4>
                <p className="text-[10px] md:text-xs text-muted-foreground">
                  Via de anonieme chat kun je tijdens het webinar al je vragen stellen — 
                  zonder verplichting om je te identificeren.
                </p>
              </div>
            </div>
            {isLimited && spotsLeft && (
              <div className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-warning/10 border border-warning/30 text-xs md:text-sm">
                <TrendingUp className="h-3.5 w-3.5 md:h-4 md:w-4 text-warning" />
                <span className="text-warning font-medium">Nog {spotsLeft} plaatsen beschikbaar</span>
              </div>
            )}
          </div>

          <form ref={formRef} onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-4 sm:p-6 md:p-8 shadow-elegant">
            <div className="space-y-4 md:space-y-6">
              {/* Event selection */}
              <div className="space-y-1.5 md:space-y-2">
                <Label htmlFor="event" className="text-xs md:text-sm">Kies een datum *</Label>
                <Select
                  value={formData.eventId}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, eventId: value }))}
                >
                  <SelectTrigger id="event" className="h-10 md:h-11 text-sm">
                    <SelectValue placeholder="Selecteer een datum" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableEvents?.map((event) => {
                      const eventSpotsLeft = event.max_capacity - event.current_registrations;
                      const eventIsLimited = eventSpotsLeft <= 10;
                      return (
                        <SelectItem key={event.id} value={event.id}>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4" />
                            <span>
                              {format(new Date(event.date), "EEE d MMM", { locale: nl })} om{" "}
                              {event.time.slice(0, 5)}
                            </span>
                            {eventIsLimited && (
                              <span className="text-[10px] md:text-xs text-warning font-medium ml-1">
                                (nog {eventSpotsLeft})
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Name fields */}
              <div className="grid sm:grid-cols-2 gap-3 md:gap-4">
                <div className="space-y-1.5 md:space-y-2">
                  <Label htmlFor="firstName" className="text-xs md:text-sm">Voornaam *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Je voornaam"
                    required
                    className="h-10 md:h-11 text-sm"
                  />
                </div>
                <div className="space-y-1.5 md:space-y-2">
                  <Label htmlFor="lastName" className="text-xs md:text-sm">Achternaam *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Je achternaam"
                    required
                    className="h-10 md:h-11 text-sm"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5 md:space-y-2">
                <Label htmlFor="email" className="text-xs md:text-sm">E-mailadres *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="je@email.com"
                  required
                  className="h-10 md:h-11 text-sm"
                />
                <p className="text-[10px] md:text-xs text-muted-foreground">
                  Hierop ontvang je de toegangslink
                </p>
              </div>

              {/* Phone (optional) */}
              <div className="space-y-1.5 md:space-y-2">
                <Label htmlFor="phone" className="text-xs md:text-sm">Telefoonnummer (optioneel)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="+31 6 12345678"
                  className="h-10 md:h-11 text-sm"
                />
              </div>

              <Button type="submit" size="lg" className="w-full h-11 md:h-12 text-sm md:text-base" disabled={isSubmitting}>
                {isSubmitting ? "Bezig met inschrijven..." : "Schrijf me in voor het webinar"}
              </Button>
            </div>

            {/* Trust badges */}
            <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-border">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
                <div className="flex flex-col items-center gap-1 text-center">
                  <Shield className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  <span className="text-[10px] md:text-xs text-muted-foreground">100% gratis</span>
                </div>
                <div className="flex flex-col items-center gap-1 text-center">
                  <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  <span className="text-[10px] md:text-xs text-muted-foreground">Geen verplichtingen</span>
                </div>
                <div className="flex flex-col items-center gap-1 text-center">
                  <Clock className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  <span className="text-[10px] md:text-xs text-muted-foreground">Tot 24u annuleren</span>
                </div>
                <div className="flex flex-col items-center gap-1 text-center">
                  <Users className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  <span className="text-[10px] md:text-xs text-muted-foreground">500+ deelnemers</span>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Sticky Mobile CTA */}
      {showStickyCTA && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-3 md:p-4 bg-background/95 backdrop-blur-sm border-t border-border md:hidden">
          <Button 
            onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="w-full group h-11"
            size="lg"
          >
            Schrijf je gratis in
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      )}
    </section>
  );
}
