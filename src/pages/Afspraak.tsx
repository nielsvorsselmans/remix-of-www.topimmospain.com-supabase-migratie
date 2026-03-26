import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useEffectiveCustomer } from '@/hooks/useEffectiveCustomer';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Helmet } from 'react-helmet-async';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { BookingStepIndicator } from '@/components/booking/BookingStepIndicator';
import { WeekAgendaView } from '@/components/booking/WeekAgendaView';
import { ContactFormStep } from '@/components/booking/ContactFormStep';
import { BookingSummaryCard } from '@/components/booking/BookingSummaryCard';
import { useAppointmentBooking } from '@/hooks/useAppointmentBooking';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, Download, Video, CalendarPlus, Search, Euro, Home, MapPin, HelpCircle, CheckCircle, User, Calculator, Heart } from 'lucide-react';
import larsProfile from '@/assets/lars-profile.webp';
import confetti from 'canvas-confetti';
import { format, addDays } from 'date-fns';
import { nl } from 'date-fns/locale';
import { trackEvent } from '@/lib/tracking';
import { SignupDialog } from '@/components/SignupDialog';
interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string;
}
export default function Afspraak() {
  const { profile, user } = useAuth();
  const { crmLeadId } = useEffectiveCustomer();

  // Fetch CRM lead data for name/phone fallback
  const { data: crmLead } = useQuery({
    queryKey: ["crm-lead-contact", crmLeadId],
    queryFn: async () => {
      if (!crmLeadId) return null;
      const { data } = await supabase
        .from("crm_leads")
        .select("first_name, last_name, email, phone")
        .eq("id", crmLeadId)
        .maybeSingle();
      return data;
    },
    enabled: !!crmLeadId,
  });
  const agendaRef = useRef<HTMLDivElement>(null);
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [selectedSlot, setSelectedSlot] = useState<{
    date: Date;
    slot: {
      start: string;
      end: string;
    };
  } | null>(null);
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    message: ''
  });
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [slotChangeCount, setSlotChangeCount] = useState(0);
  const [pageLoadTime] = useState(Date.now());
  const [showSignupDialog, setShowSignupDialog] = useState(false);
  const {
    fetchAllSlotsForRange,
    bookAppointment,
    isLoadingSlots,
    isBooking
  } = useAppointmentBooking();
  const [availableSlotsByDate, setAvailableSlotsByDate] = useState<Map<string, Array<{
    start: string;
    end: string;
  }>>>(new Map());

  // Fetch slots for the next 14 days on mount
  useEffect(() => {
    const loadSlots = async () => {
      const startDate = new Date();
      const endDate = addDays(startDate, 14);
      const slotsMap = await fetchAllSlotsForRange(startDate, endDate);
      setAvailableSlotsByDate(slotsMap);
    };
    loadSlots();
  }, []);

  // Auto-fill form data for logged-in users (profile > CRM lead > auth session)
  useEffect(() => {
    if (profile || user || crmLead) {
      setFormData(prev => ({
        ...prev,
        firstName: prev.firstName || profile?.first_name || crmLead?.first_name || '',
        lastName: prev.lastName || profile?.last_name || crmLead?.last_name || '',
        email: prev.email || profile?.email || crmLead?.email || user?.email || '',
        phone: prev.phone || crmLead?.phone || '',
      }));
    }
  }, [profile, user, crmLead]);

  // Track form abandonment
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentStep === 2 && !isConfirmed && selectedSlot) {
        trackEvent("appointment_form_abandoned", {
          abandoned_at_step: currentStep,
          had_slot_selected: true,
          form_fields_filled: {
            firstName: formData.firstName.length > 0,
            lastName: formData.lastName.length > 0,
            email: formData.email.length > 0,
            phone: formData.phone.length > 0
          },
          partial_data_completeness: (formData.firstName.length > 0 ? 25 : 0) + (formData.lastName.length > 0 ? 25 : 0) + (formData.email.length > 0 ? 25 : 0) + (formData.phone.length > 0 ? 25 : 0)
        });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentStep, selectedSlot, formData, isConfirmed]);

  // Track account nudge shown for non-logged-in users
  useEffect(() => {
    if (isConfirmed && !localStorage.getItem('viva_user_id') && selectedSlot) {
      trackEvent("account_nudge_shown", {
        appointment_date: format(selectedSlot.date, 'yyyy-MM-dd')
      });
    }
  }, [isConfirmed, selectedSlot]);
  const handleSelectSlot = (date: Date, slot: {
    start: string;
    end: string;
  }) => {
    // Track slot changes
    if (selectedSlot) {
      setSlotChangeCount(prev => prev + 1);
    }
    setSelectedSlot({
      date,
      slot
    });

    // Track slot selection
    trackEvent("appointment_slot_selected", {
      selected_date: format(date, 'yyyy-MM-dd'),
      selected_time: format(new Date(slot.start), 'HH:mm'),
      day_of_week: format(date, 'EEEE', {
        locale: nl
      }),
      is_morning: new Date(slot.start).getHours() < 12
    });
  };
  const handleNextFromAgenda = () => {
    setCurrentStep(2);

    // Track form progression
    if (selectedSlot) {
      trackEvent("appointment_form_started", {
        selected_date: format(selectedSlot.date, 'yyyy-MM-dd'),
        selected_time: formatTime(selectedSlot.slot.start)
      });
    }
  };
  const formatTime = (isoString: string) => {
    return format(new Date(isoString), 'HH:mm', {
      locale: nl
    });
  };
  const handleSubmitBooking = async () => {
    if (!selectedSlot) return;
    const success = await bookAppointment({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      message: formData.message,
      startTime: selectedSlot.slot.start,
      endTime: selectedSlot.slot.end,
      meetingUrl: 'https://whereby.com/topimmospain'
    });
    if (success) {
      setIsConfirmed(true);

      // Store name in sessionStorage for Meeting page auto-fill
      sessionStorage.setItem('meeting_user_name', `${formData.firstName} ${formData.lastName}`);

      // Track appointment booking via central tracking system with enriched context
      trackEvent("appointment_booked", {
        appointment_date: format(selectedSlot.date, 'yyyy-MM-dd'),
        appointment_time: formatTime(selectedSlot.slot.start),
        day_of_week: format(selectedSlot.date, 'EEEE', {
          locale: nl
        }),
        is_morning: new Date(selectedSlot.slot.start).getHours() < 12,
        has_message: formData.message.length > 0,
        message_length: formData.message.length,
        is_logged_in: !!localStorage.getItem('viva_user_id'),
        time_on_page_seconds: Math.floor((Date.now() - pageLoadTime) / 1000),
        slot_changes_count: slotChangeCount
      });

      // Trigger confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: {
          y: 0.6
        }
      });
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };
  const formatDateForCalendar = (date: Date) => {
    return format(date, "yyyyMMdd'T'HHmmss'Z'");
  };
  const generateGoogleCalendarUrl = () => {
    if (!selectedSlot) return '';
    const startDate = new Date(selectedSlot.slot.start);
    const endDate = new Date(selectedSlot.slot.end);
    const title = encodeURIComponent('Oriëntatiegesprek - Viva Vastgoed');
    const details = encodeURIComponent(`Videogesprek met ${formData.firstName} ${formData.lastName}\n\nEmail: ${formData.email}\nTelefoon: ${formData.phone}`);
    const dates = `${formatDateForCalendar(startDate)}/${formatDateForCalendar(endDate)}`;
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${dates}`;
  };
  const generateOutlookCalendarUrl = () => {
    if (!selectedSlot) return '';
    const startDate = new Date(selectedSlot.slot.start);
    const endDate = new Date(selectedSlot.slot.end);
    const title = encodeURIComponent('Oriëntatiegesprek - Viva Vastgoed');
    const body = encodeURIComponent(`Videogesprek met ${formData.firstName} ${formData.lastName}\n\nEmail: ${formData.email}\nTelefoon: ${formData.phone}`);
    const start = startDate.toISOString();
    const end = endDate.toISOString();
    return `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&body=${body}&startdt=${start}&enddt=${end}`;
  };
  const generateICSFile = () => {
    if (!selectedSlot) return;
    const startDate = new Date(selectedSlot.slot.start);
    const endDate = new Date(selectedSlot.slot.end);
    const icsContent = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT', `DTSTART:${formatDateForCalendar(startDate)}`, `DTEND:${formatDateForCalendar(endDate)}`, 'SUMMARY:Oriëntatiegesprek - Viva Vastgoed', `DESCRIPTION:Videogesprek met ${formData.firstName} ${formData.lastName}\\n\\nEmail: ${formData.email}\\nTelefoon: ${formData.phone}`, 'END:VEVENT', 'END:VCALENDAR'].join('\n');
    const blob = new Blob([icsContent], {
      type: 'text/calendar'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'viva-vastgoed-gesprek.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  if (isConfirmed && selectedSlot) {
    return <div className="min-h-screen flex flex-col">
        <Helmet>
          <title>Afspraak Bevestigd - Viva Vastgoed</title>
          <meta name="description" content="Je oriëntatiegesprek is bevestigd" />
        </Helmet>
        <Navbar />
        <main className="flex-1 pt-32 pb-16 px-4">
          <div className="container max-w-2xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Video className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold">
                Je afspraak is bevestigd! 🎉
              </h1>
              <p className="text-lg text-muted-foreground">
                We hebben je een bevestigingsmail gestuurd naar <strong>{formData.email}</strong>
              </p>
            </div>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-3 text-left">
                  <Calendar className="h-5 w-5 text-primary flex-shrink-0" />
                  <div>
                    <div className="font-medium">
                      {format(selectedSlot.date, 'EEEE d MMMM yyyy', {
                      locale: nl
                    })}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(selectedSlot.slot.start), 'HH:mm', {
                      locale: nl
                    })} - {format(new Date(selectedSlot.slot.end), 'HH:mm', {
                      locale: nl
                    })}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 text-left">
                  <Video className="h-5 w-5 text-primary flex-shrink-0" />
                  <div>
                    <div className="font-medium">Videogesprek</div>
                    <div className="text-sm text-muted-foreground">
                      Je ontvangt de meeting link per email
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Account Nudge - alleen voor niet-ingelogde gebruikers */}
            {!localStorage.getItem('viva_user_id') && <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 rounded-xl p-6 md:p-8 space-y-6">
                <div className="text-center space-y-2">
                  <span className="inline-block px-3 py-1 bg-primary/20 text-primary text-sm font-medium rounded-full">
                    Aanbevolen
                  </span>
                  <h3 className="text-xl font-semibold">
                    Bereid je optimaal voor op het gesprek
                  </h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Met een gratis account krijg je toegang tot handige tools die je helpen om het meeste uit je oriëntatiegesprek te halen.
                  </p>
                </div>

                {/* Benefits Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                      <Calculator className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-sm font-medium">Rendement berekenen</p>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                      <Home className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-sm font-medium">Projecten vergelijken</p>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                      <Euro className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-sm font-medium">Kosten inzicht</p>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                      <Heart className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-sm font-medium">Favorieten opslaan</p>
                  </div>
                </div>

                {/* CTA */}
                <div className="text-center space-y-3">
                  <Button size="lg" onClick={() => {
                setShowSignupDialog(true);
                trackEvent("account_nudge_clicked", {
                  appointment_date: format(selectedSlot.date, 'yyyy-MM-dd')
                });
              }}>
                    Krijg toegang
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    ✓ Gratis · ✓ Geen creditcard nodig · ✓ Direct toegang
                  </p>
                </div>
              </div>}

            {/* Lars Welkomstkaart */}
            <Card className="overflow-hidden">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                  {/* Lars's foto */}
                  <Avatar className="w-20 h-20 border-2 border-primary/20 flex-shrink-0">
                    <AvatarImage src={larsProfile} alt="Lars van Viva Vastgoed" className="object-cover" />
                    <AvatarFallback>LV</AvatarFallback>
                  </Avatar>
                  
                  <div className="space-y-3">
                    {/* Persoonlijk bericht */}
                    <div>
                      <p className="text-muted-foreground italic">
                        "Leuk dat je een afspraak hebt gemaakt! Ik kijk ernaar uit om kennis te maken en al je vragen over investeren in Spanje te beantwoorden."
                      </p>
                      <p className="text-sm font-medium mt-2">— Lars, Top Immo Spain</p>
                    </div>
                    
                    {/* Zachte account reminder - alleen voor niet-ingelogde */}
                    {!localStorage.getItem('viva_user_id') && <p className="text-sm text-muted-foreground">
                        💡 Tip: <button onClick={() => setShowSignupDialog(true)} className="text-primary hover:underline font-medium">
                          Krijg alvast toegang
                        </button> zodat ik je tijdens ons gesprek direct kan helpen met concrete projecten en berekeningen.
                      </p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h3 className="font-semibold">Voeg toe aan je agenda</h3>
              <div className="flex flex-wrap gap-3 justify-center">
                <Button variant="outline" onClick={() => {
                window.open(generateGoogleCalendarUrl(), '_blank');
                trackEvent("appointment_calendar_added", {
                  calendar_type: 'google',
                  appointment_date: format(selectedSlot.date, 'yyyy-MM-dd')
                });
              }}>
                  <CalendarPlus className="h-4 w-4 mr-2" />
                  Google Calendar
                </Button>
                <Button variant="outline" onClick={() => {
                window.open(generateOutlookCalendarUrl(), '_blank');
                trackEvent("appointment_calendar_added", {
                  calendar_type: 'outlook',
                  appointment_date: format(selectedSlot.date, 'yyyy-MM-dd')
                });
              }}>
                  <CalendarPlus className="h-4 w-4 mr-2" />
                  Outlook
                </Button>
                <Button variant="outline" onClick={() => {
                generateICSFile();
                trackEvent("appointment_calendar_added", {
                  calendar_type: 'apple',
                  appointment_date: format(selectedSlot.date, 'yyyy-MM-dd')
                });
              }}>
                  <Download className="h-4 w-4 mr-2" />
                  Apple Calendar
                </Button>
              </div>
            </div>

            <div className="pt-8">
              <Button variant="outline" onClick={() => {
              setIsConfirmed(false);
              setCurrentStep(1);
              setSelectedSlot(null);
              setFormData({
                firstName: '',
                lastName: '',
                email: '',
                phone: '',
                message: ''
              });
            }}>
                Plan nog een afspraak
              </Button>
            </div>

            <SignupDialog open={showSignupDialog} onOpenChange={setShowSignupDialog} defaultValues={{
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email
          }} onSuccess={() => {
            trackEvent("account_created_post_booking", {
              appointment_date: format(selectedSlot.date, 'yyyy-MM-dd')
            });
          }} />
          </div>
        </main>
        <Footer />
      </div>;
  }
  return <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>Plan een Oriëntatiegesprek - Viva Vastgoed</title>
        <meta name="description" content="Plan een gratis oriëntatiegesprek over investeren in Spaans vastgoed. 30 minuten persoonlijk advies zonder verkooppraatje." />
      </Helmet>
      
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-24 pb-6 px-4 bg-gradient-to-b from-primary/5 to-background">
        <div className="container max-w-4xl mx-auto text-center space-y-4">
          <h1 className="text-3xl md:text-4xl font-bold">
            Plan een Oriëntatiegesprek
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            30 minuten persoonlijk advies over investeren in Spaans vastgoed. Geen verkooppraatje, puur advies op basis van jouw situatie.
          </p>
        </div>
      </section>

      {/* Booking Form */}
      <main className="flex-1 py-12 px-4">
        <div className="container max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              <BookingStepIndicator currentStep={currentStep} />

              {currentStep === 1 && <>
                  <div ref={agendaRef}>
                    <WeekAgendaView availableSlotsByDate={availableSlotsByDate} selectedSlot={selectedSlot} isLoading={isLoadingSlots} onSelectSlot={handleSelectSlot} onNext={handleNextFromAgenda} />
                  </div>

                  {/* Voor wie interessant sectie */}
                  <div className="mt-16 mb-8">
                    <h2 className="text-2xl font-semibold text-foreground mb-3 text-center">
                      Voor wie is dit gesprek interessant?
                    </h2>
                    <p className="text-muted-foreground text-center mb-8 max-w-2xl mx-auto">
                      Een oriëntatiegesprek helpt je om duidelijkheid te krijgen over investeren in Spaans vastgoed.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                      <Card className="p-5 hover:shadow-md transition-shadow">
                        <div className="flex gap-3">
                          <Search className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                          <div>
                            <h3 className="font-semibold text-foreground mb-1">Oriëntatiefase</h3>
                            <p className="text-sm text-muted-foreground">
                              Je wilt ontdekken hoe investeren in Spaans vastgoed werkt en wat de mogelijkheden zijn.
                            </p>
                          </div>
                        </div>
                      </Card>

                      <Card className="p-5 hover:shadow-md transition-shadow">
                        <div className="flex gap-3">
                          <Euro className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                          <div>
                            <h3 className="font-semibold text-foreground mb-1">Budget & financiering</h3>
                            <p className="text-sm text-muted-foreground">
                              Je hebt vragen over hypotheek, eigen middelen of financieringsopties voor je investering.
                            </p>
                          </div>
                        </div>
                      </Card>

                      <Card className="p-5 hover:shadow-md transition-shadow">
                        <div className="flex gap-3">
                          <Home className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                          <div>
                            <h3 className="font-semibold text-foreground mb-1">Project interesse</h3>
                            <p className="text-sm text-muted-foreground">
                              Je hebt specifieke projecten gezien op onze website en wilt meer informatie.
                            </p>
                          </div>
                        </div>
                      </Card>

                      <Card className="p-5 hover:shadow-md transition-shadow">
                        <div className="flex gap-3">
                          <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                          <div>
                            <h3 className="font-semibold text-foreground mb-1">Regio keuze</h3>
                            <p className="text-sm text-muted-foreground">
                              Je twijfelt tussen regio's zoals Costa Blanca Zuid, Costa Cálida of andere gebieden.
                            </p>
                          </div>
                        </div>
                      </Card>

                      <Card className="p-5 hover:shadow-md transition-shadow">
                        <div className="flex gap-3">
                          <HelpCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                          <div>
                            <h3 className="font-semibold text-foreground mb-1">Twijfels wegnemen</h3>
                            <p className="text-sm text-muted-foreground">
                              Je hebt specifieke vragen of zorgen over het aankoopproces, risico's of juridische aspecten.
                            </p>
                          </div>
                        </div>
                      </Card>

                      <Card className="p-5 hover:shadow-md transition-shadow">
                        <div className="flex gap-3">
                          <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                          <div>
                            <h3 className="font-semibold text-foreground mb-1">Volgende stappen</h3>
                            <p className="text-sm text-muted-foreground">
                              Je wilt weten wat de concrete stappen zijn in het aankoopproces en hoe wij je begeleiden.
                            </p>
                          </div>
                        </div>
                      </Card>
                    </div>

                    {/* CTA to scroll back to agenda */}
                    <div className="mt-8 text-center">
                      <Button size="lg" onClick={() => {
                    agendaRef.current?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start'
                    });
                  }}>
                        <Calendar className="mr-2 h-5 w-5" />
                        Plan nu je gesprek
                      </Button>
                    </div>
                  </div>
                </>}

              {currentStep === 2 && selectedSlot && <ContactFormStep formData={formData} isLoading={isBooking} onUpdateFormData={setFormData} onSubmit={handleSubmitBooking} onBack={() => setCurrentStep(1)} />}
            </div>

            {/* Summary Sidebar - Desktop Only */}
            <div className="hidden lg:block">
              <BookingSummaryCard selectedDate={selectedSlot?.date} selectedSlot={selectedSlot?.slot || null} currentStep={currentStep} />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>;
}