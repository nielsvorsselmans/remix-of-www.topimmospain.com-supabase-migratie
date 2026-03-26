import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Loader2, CalendarDays, User, Mail, Phone, Users, Star, Check, Bell, CheckCircle2, Video, ArrowRight } from "lucide-react";
import { trackEvent } from "@/lib/tracking";
import { useFutureInfoEvents } from "@/hooks/useActiveInfoEvents";

interface InfoavondRegistratieProps {
  selectedEventId?: string | null;
  hasEvents?: boolean;
}

export function InfoavondRegistratie({ selectedEventId, hasEvents = true }: InfoavondRegistratieProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWaitlistSubmitted, setIsWaitlistSubmitted] = useState(false);
  const [waitlistForm, setWaitlistForm] = useState({ firstName: "", email: "" });
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    eventId: "",
    numberOfPersons: "1"
  });

  // Sync with external event selection from hero
  useEffect(() => {
    if (selectedEventId) {
      setFormData(prev => ({ ...prev, eventId: selectedEventId }));
    }
  }, [selectedEventId]);

  const { data: events = [] } = useFutureInfoEvents();

  const availableEvents = events.filter(e => e.current_registrations < e.max_capacity);

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistForm.firstName.trim() || !waitlistForm.email.trim()) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('info_evening_waitlist')
        .insert({
          first_name: waitlistForm.firstName.trim(),
          email: waitlistForm.email.trim().toLowerCase(),
          utm_source: searchParams.get('utm_source'),
          utm_medium: searchParams.get('utm_medium'),
          utm_campaign: searchParams.get('utm_campaign'),
        });

      if (error) throw error;
      setIsWaitlistSubmitted(true);
      trackEvent('info_evening_waitlist_signup', {
        utm_source: searchParams.get('utm_source'),
      });
      toast.success("Je staat op de lijst!");
    } catch {
      toast.error("Er ging iets mis. Probeer het opnieuw.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.eventId) {
      toast.error("Selecteer een datum");
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedEvent = events.find(e => e.id === formData.eventId);
      
      const { data: existingRegistration } = await supabase
        .from('info_evening_registrations')
        .select('id')
        .eq('event_id', formData.eventId)
        .ilike('email', formData.email)
        .maybeSingle();

      if (existingRegistration) {
        toast.error("Je bent al ingeschreven voor deze infoavond. Check je inbox voor de bevestigingsmail.");
        setIsSubmitting(false);
        return;
      }
      
      const registrationId = crypto.randomUUID();
      
      const { error } = await supabase
        .from('info_evening_registrations')
        .insert({
          id: registrationId,
          event_id: formData.eventId,
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone || null,
          number_of_persons: parseInt(formData.numberOfPersons),
          confirmed: true,
          utm_source: searchParams.get('utm_source'),
          utm_medium: searchParams.get('utm_medium'),
          utm_campaign: searchParams.get('utm_campaign'),
          utm_content: searchParams.get('utm_content')
        });

      if (error) throw error;

      trackEvent('info_evening_registration', {
        event_id: formData.eventId,
        utm_source: searchParams.get('utm_source'),
        utm_medium: searchParams.get('utm_medium'),
        utm_campaign: searchParams.get('utm_campaign')
      });

      supabase.functions.invoke('sync-infoavond-registration', {
        body: {
          registration_id: registrationId,
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone || null,
          event_id: selectedEvent?.id,
          event_title: selectedEvent?.title,
          event_date: selectedEvent?.date,
          event_time: selectedEvent?.time,
          event_location: selectedEvent?.location_name,
          ghl_dropdown_value: selectedEvent?.ghl_dropdown_value,
          number_of_persons: parseInt(formData.numberOfPersons),
        },
      }).catch((err) => {
        console.error('Background sync error:', err);
      });

      if (selectedEvent) {
        navigate('/infoavonden/bevestiging', {
          state: {
            email: formData.email,
            firstName: formData.firstName,
            lastName: formData.lastName,
            registrationId: registrationId,
            eventId: selectedEvent.id,
            eventTitle: selectedEvent.title,
            eventDate: selectedEvent.date,
            eventTime: selectedEvent.time,
            eventLocation: selectedEvent.location_name,
            eventAddress: '',
          }
        });
      }

    } catch (error) {
      console.error('Registration error:', error);
      toast.error("Er ging iets mis. Probeer het opnieuw.");
      setIsSubmitting(false);
    }
  };

  const selectedEvent = events.find(e => e.id === formData.eventId);
  const spotsLeft = selectedEvent ? selectedEvent.max_capacity - selectedEvent.current_registrations : null;

  return (
    <section id="registratie" className="py-16 md:py-24 bg-background relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="container max-w-5xl mx-auto px-4 relative z-10">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {hasEvents ? "Reserveer jouw gratis plaats" : "Nieuwe data worden binnenkort aangekondigd"}
          </h2>
          <p className="text-muted-foreground">
            {hasEvents 
              ? "Kies een datum en locatie bij jou in de buurt. De plaatsen zijn beperkt."
              : "Laat je gegevens achter en ontvang als eerste een uitnodiging voor de volgende infoavond."
            }
          </p>
        </div>
        
        <div className="grid lg:grid-cols-5 gap-8 items-start">
          {/* Form - Takes 3 columns */}
          <div className="lg:col-span-3 bg-card rounded-2xl shadow-xl border border-border p-6 md:p-8">
            {hasEvents ? (
              <>
                {/* Urgency indicator */}
                {spotsLeft !== null && spotsLeft <= 15 && (
                  <div className="mb-6 flex items-center gap-2 text-amber-600 bg-amber-50 rounded-lg px-4 py-3 border border-amber-200">
                    <Users className="h-5 w-5 flex-shrink-0" />
                    <span className="font-medium">
                      Nog {spotsLeft} {spotsLeft === 1 ? 'plaats' : 'plaatsen'} beschikbaar voor {selectedEvent?.location_name}
                    </span>
                  </div>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="event" className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-primary" />
                      Kies een datum *
                    </Label>
                    <Select
                      value={formData.eventId}
                      onValueChange={(value) => setFormData({ ...formData, eventId: value })}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Selecteer een infoavond" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableEvents.map((event) => (
                          <SelectItem key={event.id} value={event.id}>
                            {format(new Date(event.date), "d MMMM", { locale: nl })} - {event.location_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        Voornaam *
                      </Label>
                      <Input id="firstName" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} required placeholder="Jan" className="h-12" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Achternaam *</Label>
                      <Input id="lastName" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} required placeholder="Jansen" className="h-12" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-primary" />
                      E-mailadres *
                    </Label>
                    <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required placeholder="jan@voorbeeld.nl" className="h-12" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-primary" />
                      Telefoonnummer *
                    </Label>
                    <Input id="phone" type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+31 6 12345678" required className="h-12" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="numberOfPersons" className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      Aantal personen
                    </Label>
                    <Select value={formData.numberOfPersons} onValueChange={(value) => setFormData({ ...formData, numberOfPersons: value })}>
                      <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 persoon</SelectItem>
                        <SelectItem value="2">2 personen</SelectItem>
                        <SelectItem value="3">3 personen</SelectItem>
                        <SelectItem value="4">4 personen</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button type="submit" size="lg" className="w-full text-lg h-14 shadow-lg hover:shadow-xl transition-all duration-300" disabled={isSubmitting}>
                    {isSubmitting ? (<><Loader2 className="mr-2 h-5 w-5 animate-spin" />Bezig met inschrijven...</>) : "Schrijf je gratis in"}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    Door je in te schrijven ga je akkoord met onze privacyvoorwaarden. We delen je gegevens nooit met derden.
                  </p>
                </form>
              </>
            ) : (
              /* Waitlist form */
              isWaitlistSubmitted ? (
                <div className="text-center py-8 space-y-6">
                  <div>
                    <CheckCircle2 className="h-14 w-14 text-primary mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">Je staat op de lijst!</h3>
                    <p className="text-muted-foreground">We nemen contact op zodra er nieuwe infoavonden worden gepland.</p>
                  </div>
                  
                  {/* Follow-up: webinar cross-sell after submit */}
                  <div className="bg-primary/5 rounded-xl border border-primary/20 p-5 text-left">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Video className="h-5 w-5 text-primary" />
                      </div>
                      <div className="space-y-2">
                        <p className="font-semibold text-foreground">Kun je niet wachten?</p>
                        <p className="text-sm text-muted-foreground">
                          Bekijk ons gratis webinar en ontdek vanuit huis hoe investeren in Spaans vastgoed werkt.
                        </p>
                        <Button asChild variant="default" size="sm" className="mt-1 group">
                          <Link to="/webinars">
                            Bekijk het gratis webinar
                            <ArrowRight className="ml-1.5 h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleWaitlistSubmit} className="space-y-6">
                  <div className="text-center mb-2">
                    <Bell className="h-10 w-10 text-primary mx-auto mb-3" />
                    <p className="text-muted-foreground">
                      Vul je gegevens in en wij laten je als eerste weten wanneer de volgende infoavond plaatsvindt.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="waitlistFirstName" className="flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      Voornaam *
                    </Label>
                    <Input id="waitlistFirstName" value={waitlistForm.firstName} onChange={(e) => setWaitlistForm(prev => ({ ...prev, firstName: e.target.value }))} required placeholder="Jan" className="h-12" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="waitlistEmail" className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-primary" />
                      E-mailadres *
                    </Label>
                    <Input id="waitlistEmail" type="email" value={waitlistForm.email} onChange={(e) => setWaitlistForm(prev => ({ ...prev, email: e.target.value }))} required placeholder="jan@voorbeeld.nl" className="h-12" />
                  </div>

                  <Button type="submit" size="lg" className="w-full text-lg h-14 shadow-lg hover:shadow-xl transition-all duration-300" disabled={isSubmitting}>
                    {isSubmitting ? (<><Loader2 className="mr-2 h-5 w-5 animate-spin" />Even geduld...</>) : (<><Bell className="mr-2 h-5 w-5" />Hou me op de hoogte</>)}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    We delen je gegevens nooit met derden. Je ontvangt enkel een bericht wanneer er nieuwe data zijn.
                  </p>
                </form>
              )
            )}
          </div>
          
          {/* Trust badges - Takes 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
              <h3 className="font-semibold text-foreground mb-4">Wat je kunt verwachten:</h3>
              <div className="space-y-3">
                {["100% gratis, geen verborgen kosten", "Geen verkoopdruk, puur informatief", "Direct antwoord op al je vragen", "Persoonlijke aandacht in kleine groep"].map((text, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Check className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                    </div>
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl border border-primary/20 p-6">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="space-y-1">
                  <Users className="h-5 w-5 text-primary mx-auto" />
                  <div className="text-2xl font-bold text-primary">500+</div>
                  <div className="text-xs text-muted-foreground">Tevreden bezoekers</div>
                </div>
                <div className="space-y-1">
                  <Star className="h-5 w-5 text-primary mx-auto" />
                  <div className="text-2xl font-bold text-primary">4.9/5</div>
                  <div className="text-xs text-muted-foreground">Gemiddelde score</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Webinar alternative card - visible before submit when no events */}
        {!hasEvents && !isWaitlistSubmitted && (
          <div className="mt-10 max-w-3xl mx-auto">
            <div className="bg-card rounded-2xl border border-border p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Video className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  Ontdek het al vanuit huis
                </h3>
                <p className="text-sm text-muted-foreground">
                  In ons gratis online webinar leggen we in 60 minuten helder uit hoe investeren in Spaans vastgoed werkt — zonder verkoopdruk.
                </p>
              </div>
              <Button asChild variant="outline" className="flex-shrink-0 group">
                <Link to="/webinars">
                  Bekijk het webinar
                  <ArrowRight className="ml-1.5 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
