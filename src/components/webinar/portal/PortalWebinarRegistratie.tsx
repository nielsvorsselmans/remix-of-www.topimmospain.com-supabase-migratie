import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Video, CheckCircle, Calendar, Clock, Users, User, Mail, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { SocialProofStrip } from "@/components/shared/SocialProofStrip";
import { MicroTestimonial } from "@/components/shared/MicroTestimonial";
import { ReplayFallback } from "@/components/shared/ReplayFallback";
import { toast } from "sonner";
import { trackEvent } from "@/lib/tracking";
import confetti from "canvas-confetti";
import { cn } from "@/lib/utils";
import { useFutureWebinarEvents } from "@/hooks/useActiveWebinarEvents";

// Concrete takeaways for the webinar
const WEBINAR_TAKEAWAYS = [
  "Welke regio past bij jouw budget en doelen",
  "Realistisch rendement: wat kun je verwachten",
  "De 5 grootste valkuilen bij aankoop vermijden",
];

// Testimonial data
const WEBINAR_TESTIMONIAL = {
  quote: "Na het webinar wist ik precies waar ik moest beginnen. Helder, eerlijk en zonder verkooppraat.",
  author: "Johan",
  location: "Antwerpen"
};

export function PortalWebinarRegistratie() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [numberOfPersons, setNumberOfPersons] = useState<string>("1");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: events, isLoading } = useFutureWebinarEvents();

  // Filter available events (not full)
  const availableEvents = events?.filter(
    (e) => e.current_registrations < e.max_capacity
  );

  const selectedEvent = events?.find(e => e.id === selectedEventId);
  
  const firstName = profile?.first_name || "";
  const lastName = profile?.last_name || "";
  const email = profile?.email || user?.email || "";

  const handleSelectEvent = (eventId: string) => {
    setSelectedEventId(eventId === selectedEventId ? null : eventId);
  };

  const handleRequestReplay = () => {
    trackEvent('webinar_replay_request', {
      user_id: user?.id,
      source: 'portal',
    });
    toast.success("We sturen je de replay binnen 24 uur per e-mail!");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id || !selectedEventId) {
      toast.error("Selecteer eerst een webinar datum");
      return;
    }

    setIsSubmitting(true);

    try {
      const registrationId = crypto.randomUUID();
      const normalizedEmail = email.trim().toLowerCase();

      // Check for duplicate registration
      const { data: existingReg } = await supabase
        .from("webinar_registrations")
        .select("id")
        .eq("email", normalizedEmail)
        .eq("event_id", selectedEventId)
        .maybeSingle();

      if (existingReg) {
        toast.info("Je bent al ingeschreven voor dit webinar!");
        await queryClient.invalidateQueries({ queryKey: ["my-webinar-registration"] });
        return;
      }

      // Insert registration
      const { error: insertError } = await supabase
        .from("webinar_registrations")
        .insert({
          id: registrationId,
          event_id: selectedEventId,
          first_name: firstName,
          last_name: lastName,
          email: normalizedEmail,
          phone: phone || null,
          confirmed: true,
          user_id: user.id,
          registration_source: 'portal',
          number_of_persons: parseInt(numberOfPersons, 10),
        });

      if (insertError) {
        if (insertError.code === "23505") {
          toast.error("Je bent al ingeschreven voor dit webinar");
        } else {
          throw insertError;
        }
        return;
      }

      // Sync to GHL (non-blocking)
      try {
        await supabase.functions.invoke('sync-webinar-registration', {
          body: {
            registration_id: registrationId,
            first_name: firstName,
            last_name: lastName,
            email: normalizedEmail,
            phone: phone || null,
            event_id: selectedEventId,
            event_title: selectedEvent?.title || "Webinar Investeren in Spaans Vastgoed",
            event_date: selectedEvent?.date,
            event_time: selectedEvent?.time,
          },
        });
        console.log('GHL sync successful for portal webinar registration');
      } catch (syncError) {
        console.error('GHL sync failed (non-blocking):', syncError);
      }

      // Track the registration
      trackEvent('webinar_registration', {
        event_id: selectedEventId,
        registration_source: 'portal',
        user_id: user.id,
        number_of_persons: parseInt(numberOfPersons, 10),
      });

      // Success confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      toast.success("Gelukt! Je bent ingeschreven voor het webinar.");
      
      // Refresh registration data to show the dashboard view
      await queryClient.invalidateQueries({ queryKey: ["my-webinar-registration"] });
    } catch (error) {
      console.error("Error registering for webinar:", error);
      toast.error("Er ging iets mis bij het inschrijven. Probeer het opnieuw.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
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
            <Video className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              {firstName ? `Hoi ${firstName}, volg je het webinar?` : "Schrijf je in voor een webinar"}
            </h1>
            <p className="text-muted-foreground">
              Leer hoe investeren in Spanje écht werkt
            </p>
          </div>
        </div>

        {/* Social Proof Strip */}
        <SocialProofStrip />

        {/* Concrete Takeaways */}
        <div className="grid sm:grid-cols-1 gap-2">
          {WEBINAR_TAKEAWAYS.map((takeaway, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-primary shrink-0" />
              <span>{takeaway}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Micro Testimonial */}
      <MicroTestimonial 
        quote={WEBINAR_TESTIMONIAL.quote}
        author={WEBINAR_TESTIMONIAL.author}
        location={WEBINAR_TESTIMONIAL.location}
      />

      {/* Available Events */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Beschikbare webinars
        </h2>

        {!availableEvents || availableEvents.length === 0 ? (
          <div className="space-y-4">
            <div className="text-center py-6 text-muted-foreground bg-muted/30 rounded-lg">
              <p className="font-medium">Er zijn momenteel geen webinars gepland.</p>
              <p className="text-sm">Maar je kunt wel de replay bekijken!</p>
            </div>
            <ReplayFallback type="webinar" onRequestReplay={handleRequestReplay} />
          </div>
        ) : (
          <div className="space-y-4">
            {availableEvents.map((event) => {
              const eventDate = new Date(event.date);
              const formattedDate = format(eventDate, "EEEE d MMMM yyyy", { locale: nl });
              const availableSpots = event.max_capacity - event.current_registrations;
              const isSelected = selectedEventId === event.id;

              return (
                <Card 
                  key={event.id}
                  className={cn(
                    "transition-all duration-200 cursor-pointer",
                    isSelected && "ring-2 ring-primary/20"
                  )}
                  onClick={() => handleSelectEvent(event.id)}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-primary">
                          <Calendar className="h-5 w-5" />
                          <span className="font-semibold capitalize">{formattedDate}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{event.time.slice(0, 5)} uur • {event.duration_minutes || 60} minuten</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Video className="h-4 w-4" />
                          <span>Online (link volgt per e-mail)</span>
                        </div>

                        {availableSpots <= 10 && (
                          <div className="flex items-center gap-2 text-sm">
                            <Users className="h-4 w-4 text-amber-500" />
                            <span className="text-amber-600 font-medium">
                              Nog {availableSpots} {availableSpots === 1 ? 'plek' : 'plekken'} beschikbaar
                            </span>
                          </div>
                        )}
                      </div>

                      <Button
                        variant={isSelected ? "outline" : "default"}
                        className="w-full sm:w-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectEvent(event.id);
                        }}
                      >
                        {isSelected ? "Geselecteerd ✓" : "Kies deze datum"}
                      </Button>
                    </div>

                    {/* Registration Form (when selected) */}
                    {isSelected && (
                      <div className="pt-4 mt-4 border-t">
                        <form onSubmit={handleSubmit} className="space-y-4">
                          {/* User Info Display */}
                          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                            <p className="text-sm text-muted-foreground">Je schrijft je in als:</p>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-primary" />
                              <span className="font-medium">{firstName} {lastName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-primary" />
                              <span className="text-sm text-muted-foreground">{email}</span>
                            </div>
                          </div>

                          <div className="grid sm:grid-cols-2 gap-4">
                            {/* Phone (optional) */}
                            <div className="space-y-2">
                              <Label htmlFor="phone">
                                Telefoonnummer <span className="text-muted-foreground">(optioneel)</span>
                              </Label>
                              <Input
                                id="phone"
                                type="tel"
                                placeholder="+31 6 12345678"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>

                            {/* Partner option */}
                            <div className="space-y-2">
                              <Label htmlFor="persons" className="flex items-center gap-1.5">
                                <UserPlus className="h-4 w-4" />
                                Kijkt er iemand mee?
                              </Label>
                              <Select 
                                value={numberOfPersons} 
                                onValueChange={setNumberOfPersons}
                              >
                                <SelectTrigger 
                                  id="persons"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1">Alleen ik</SelectItem>
                                  <SelectItem value="2">Met partner</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Submit */}
                          <Button 
                            type="submit" 
                            className="w-full" 
                            disabled={isSubmitting}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {isSubmitting ? (
                              "Bezig met inschrijven..."
                            ) : (
                              <>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Bevestig inschrijving
                              </>
                            )}
                          </Button>

                          {/* Email expectations */}
                          <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 space-y-1">
                            <p className="font-medium text-foreground">Na inschrijving ontvang je:</p>
                            <ul className="space-y-0.5">
                              <li>• Bevestiging met datum & tijd</li>
                              <li>• Reminder 24 uur van tevoren</li>
                              <li>• Link naar het webinar 1 uur voor start</li>
                            </ul>
                          </div>
                        </form>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {/* Replay Fallback - always shown as soft option */}
            <ReplayFallback type="webinar" onRequestReplay={handleRequestReplay} />
          </div>
        )}
      </div>
    </div>
  );
}
