import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Video, CheckCircle, Calendar, Clock, CalendarPlus, Check, Wifi, Headphones, Mail, User, Phone, MessageCircle } from "lucide-react";
import { Helmet } from "react-helmet-async";
import confetti from "canvas-confetti";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { FAQCompact } from "@/components/webinar/confirmation/FAQCompact";
import larsProfile from "@/assets/lars-profile.webp";

interface LocationState {
  registrationId: string;
  email: string;
  firstName: string;
  lastName: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  durationMinutes: number;
}

const WebinarBevestiging = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;

  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [hasTriggeredConfetti, setHasTriggeredConfetti] = useState(false);

  // Redirect if no state
  useEffect(() => {
    if (!state?.registrationId) {
      navigate("/webinars");
    }
  }, [state, navigate]);

  // Trigger confetti on mount
  useEffect(() => {
    if (state?.registrationId && !hasTriggeredConfetti) {
      setHasTriggeredConfetti(true);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [state, hasTriggeredConfetti]);

  // Countdown timer to webinar
  useEffect(() => {
    if (!state?.eventDate || !state?.eventTime) return;

    const calculateCountdown = () => {
      const eventDateTime = new Date(`${state.eventDate}T${state.eventTime}`);
      const now = new Date();
      const diff = eventDateTime.getTime() - now.getTime();

      if (diff > 0) {
        setCountdown({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((diff % (1000 * 60)) / 1000),
        });
      }
    };

    calculateCountdown();
    const timer = setInterval(calculateCountdown, 1000);
    return () => clearInterval(timer);
  }, [state?.eventDate, state?.eventTime]);

  if (!state) return null;

  const displayName = state.firstName.charAt(0).toUpperCase() + state.firstName.slice(1).toLowerCase();
  const durationMinutes = state.durationMinutes || 60;

  // Calendar link generators
  const generateGoogleCalendarUrl = () => {
    const startDate = new Date(`${state.eventDate}T${state.eventTime}`);
    const endDate = new Date(startDate.getTime() + (durationMinutes * 60 * 1000));
    
    const formatDate = (date: Date) => date.toISOString().replace(/-|:|\.\d{3}/g, "");
    
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: "Webinar: Investeren in Spaans Vastgoed - Viva Vastgoed",
      dates: `${formatDate(startDate)}/${formatDate(endDate)}`,
      details: "Je ontvangt de Zoom/Whereby link per e-mail. Zorg dat je 5 minuten voor aanvang klaar zit.",
      location: "Online (link volgt per e-mail)",
    });
    
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  const generateIcsFile = () => {
    const startDate = new Date(`${state.eventDate}T${state.eventTime}`);
    const endDate = new Date(startDate.getTime() + (durationMinutes * 60 * 1000));
    
    const formatDate = (date: Date) => date.toISOString().replace(/-|:|\.\d{3}/g, "").slice(0, -1);
    
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Viva Vastgoed//Webinar//NL
BEGIN:VEVENT
DTSTART:${formatDate(startDate)}Z
DTEND:${formatDate(endDate)}Z
SUMMARY:Webinar: Investeren in Spaans Vastgoed - Viva Vastgoed
DESCRIPTION:Je ontvangt de Zoom/Waarbij link per e-mail. Zorg dat je 5 minuten voor aanvang klaar zit.
LOCATION:Online (link volgt per e-mail)
END:VEVENT
END:VCALENDAR`;
    
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "viva-vastgoed-webinar.ics";
    link.click();
    URL.revokeObjectURL(url);
  };

  const TimeBlock = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <div className="bg-primary/10 text-primary rounded-lg w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center font-bold text-lg sm:text-xl">
        {value.toString().padStart(2, "0")}
      </div>
      <span className="text-xs text-muted-foreground mt-1">{label}</span>
    </div>
  );

  const formattedDate = format(new Date(state.eventDate), "EEEE d MMMM yyyy", { locale: nl });
  const formattedDateShort = format(new Date(state.eventDate), "d MMMM", { locale: nl });
  const formattedTime = state.eventTime.slice(0, 5);

  return (
    <>
      <Helmet>
        <title>Je staat op de gastenlijst! | Webinar | Viva Vastgoed</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/20">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="container px-4">
            <div className="max-w-3xl mx-auto space-y-6">
              
              {/* ═══════════════════════════════════════════════════════════════ */}
              {/* SECTIE 1: DE HOOK (Success + Host Card + Details + Countdown)   */}
              {/* ═══════════════════════════════════════════════════════════════ */}
              
              {/* Success Header - Gastenlijst Framing */}
              <div className="text-center">
                <div className="inline-flex w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-green-500/10 items-center justify-center mb-4">
                  <CheckCircle className="h-8 w-8 sm:h-10 sm:w-10 text-green-500" />
                </div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2">
                  Hey {displayName}, je staat op mijn gastenlijst! 🎉
                </h1>
                <p className="text-muted-foreground text-sm sm:text-base">
                  Ik stuur je een persoonlijke link om in te loggen.
                </p>
              </div>

              {/* Host Card - Persoonlijke Boodschap van Lars */}
              <div className="bg-card border border-border rounded-xl p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
                  <Avatar className="h-16 w-16 sm:h-20 sm:w-20 ring-2 ring-primary/20 flex-shrink-0 mx-auto sm:mx-0">
                    <AvatarImage src={larsProfile} alt="Lars van Viva Vastgoed" />
                    <AvatarFallback>LV</AvatarFallback>
                  </Avatar>
                  <div className="text-center sm:text-left">
                    <p className="text-foreground text-base sm:text-lg leading-relaxed mb-3">
                      Leuk dat je erbij bent, {displayName}! Ik presenteer dit webinar persoonlijk en neem je mee in de realiteit van investeren in Spanje. Geen verkooppraatjes, wel eerlijke inzichten.
                    </p>
                    <p className="text-muted-foreground italic text-sm mb-3">
                      "Mijn doel? Dat je na dit uur precies weet of Spaans vastgoed bij je past — of niet."
                    </p>
                    <p className="text-foreground font-medium text-sm">
                      Tot {formattedDateShort}!<br />
                      <span className="text-muted-foreground font-normal">— Lars</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Commitment Trigger */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center">
                <p className="text-sm text-foreground">
                  <span className="font-medium">Ik heb tijd voor je vrijgemaakt</span> en je naam staat genoteerd.<br className="hidden sm:inline" />
                  <span className="text-muted-foreground"> Mocht er iets tussenkomen, laat het me even weten.</span>
                </p>
              </div>

              {/* Webinar Details Card */}
              <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Video className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-foreground text-base sm:text-lg mb-1">
                      {state.eventTitle}
                    </h2>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" />
                        {formattedDate}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        {formattedTime} uur
                      </span>
                    </div>
                    {/* Host Badge */}
                    <div className="mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 rounded-full px-3 py-1">
                      <User className="h-3.5 w-3.5" />
                      <span>Gepresenteerd door: Lars van Viva Vastgoed</span>
                    </div>
                  </div>
                </div>

                {/* Countdown - Persoonlijke Framing */}
                <div className="mt-6 pt-6 border-t border-border">
                  <p className="text-sm text-muted-foreground text-center mb-4">We spreken elkaar over:</p>
                  <div className="flex justify-center gap-3 sm:gap-4">
                    <TimeBlock value={countdown.days} label="dagen" />
                    <TimeBlock value={countdown.hours} label="uren" />
                    <TimeBlock value={countdown.minutes} label="min" />
                    <TimeBlock value={countdown.seconds} label="sec" />
                  </div>
                </div>
              </div>

              {/* Calendar Actions */}
              <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CalendarPlus className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Zet in je agenda</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Voorkom dat je het webinar mist door het direct aan je agenda toe te voegen.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => window.open(generateGoogleCalendarUrl(), "_blank")}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Google Agenda
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={generateIcsFile}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Apple / Outlook
                  </Button>
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════════════ */}
              {/* SECTIE 2: DE ZEKERHEID (Praktische Info + Contact + FAQ)        */}
              {/* ═══════════════════════════════════════════════════════════════ */}

              {/* Practical Info */}
              <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
                <h3 className="font-semibold text-foreground mb-4">Praktische informatie</h3>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <Mail className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Check je e-mail (ook spam) voor de toegangslink</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Clock className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Zorg dat je 5 minuten voor aanvang klaar zit</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Wifi className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Zorg voor een stabiele internetverbinding</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Headphones className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Koptelefoon aanbevolen voor betere geluidskwaliteit</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Je kunt anoniem vragen stellen via de chat</span>
                  </li>
                </ul>
              </div>

              {/* Persoonlijke Contact Sectie */}
              <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Heb je vooraf al een vraag?</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Ik beantwoord vragen graag persoonlijk, of neem ze mee in het webinar.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 text-sm">
                  <a 
                    href="mailto:lars@topimmospain.com" 
                    className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
                  >
                    <Mail className="h-4 w-4 text-primary" />
                    lars@topimmospain.com
                  </a>
                  <a 
                    href="tel:+32468132903" 
                    className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
                  >
                    <Phone className="h-4 w-4 text-primary" />
                    +32 468 132 903
                  </a>
                </div>
              </div>

              {/* FAQ Section */}
              <FAQCompact />

            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default WebinarBevestiging;
