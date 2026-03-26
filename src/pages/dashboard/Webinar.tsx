import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMyWebinarRegistration } from "@/hooks/useMyWebinarRegistration";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { DashboardBackToOntdekken } from "@/components/dashboard/DashboardBackToOntdekken";
import { PortalWebinarRegistratie } from "@/components/webinar/portal/PortalWebinarRegistratie";
import { 
  Video, 
  Calendar, 
  Clock, 
  CalendarPlus, 
  Share2, 
  BookOpen, 
  Calculator, 
  Phone,
  CheckCircle,
  ArrowRight,
  Sparkles,
  PartyPopper
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import confetti from "canvas-confetti";

export default function DashboardWebinar() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();
  const { registration, webinarEvent, isUpcoming, isToday, isPast, timeUntil, isLoading } = useMyWebinarRegistration();
  
  const isFromRegistration = searchParams.get("from") === "webinar";

  // Confetti effect when coming from registration
  useEffect(() => {
    if (isFromRegistration && registration) {
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      }, 500);
    }
  }, [isFromRegistration, registration]);

  // Calendar link generators
  const generateGoogleCalendarUrl = () => {
    if (!webinarEvent) return "#";
    const startDate = new Date(`${webinarEvent.date}T${webinarEvent.time}`);
    const endDate = new Date(startDate.getTime() + (webinarEvent.duration_minutes * 60 * 1000));
    
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
    if (!webinarEvent) return;
    const startDate = new Date(`${webinarEvent.date}T${webinarEvent.time}`);
    const endDate = new Date(startDate.getTime() + (webinarEvent.duration_minutes * 60 * 1000));
    
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

  // Social share
  const shareText = "Ik heb me ingeschreven voor het gratis webinar over investeren in Spaans vastgoed van Viva Vastgoed! 🏠☀️";
  const shareUrl = "https://vivavastgoed.com/webinars";

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`, "_blank");
  };

  const TimeBlock = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <div className="bg-primary/10 text-primary rounded-lg w-14 h-14 flex items-center justify-center font-bold text-xl">
        {value.toString().padStart(2, "0")}
      </div>
      <span className="text-xs text-muted-foreground mt-1">{label}</span>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  // No registration found - show inline registration
  if (!registration || !webinarEvent) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4">
        <DashboardBackToOntdekken />
        <div className="mt-4">
          <PortalWebinarRegistratie />
        </div>
      </div>
    );
  }

  const bonuses = [
    {
      icon: BookOpen,
      title: "Oriëntatiegids",
      description: "Complete gids voor investeren in Spanje",
      link: "/dashboard/gidsen",
      available: true,
    },
    {
      icon: Calculator,
      title: "Rendementstools",
      description: "Bereken kosten, opbrengsten en rendement",
      link: "/dashboard/calculators",
      available: true,
    },
    {
      icon: Phone,
      title: "Adviesgesprek",
      description: "Plan een gratis oriënterend gesprek",
      link: "/afspraak",
      available: true,
    },
  ];

  return (
      <div className="max-w-3xl mx-auto py-4 space-y-6">
        {/* Back navigation */}
        <DashboardBackToOntdekken />

        {/* Welcome Header */}
        {isFromRegistration && (
          <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
            <CardContent className="py-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <PartyPopper className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground mb-1">
                    Welkom{profile?.first_name ? `, ${profile.first_name}` : ""}! 🎉
                  </h1>
                  <p className="text-muted-foreground">
                    Je inschrijving is bevestigd. Je hebt nu toegang tot alle oriëntatie-tools in het Viva Portaal.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Webinar Details Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Video className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Jouw Webinar</CardTitle>
                  {isToday && (
                    <Badge className="mt-1 bg-green-500/10 text-green-600 border-green-500/20">
                      Vandaag!
                    </Badge>
                  )}
                  {isPast && (
                    <Badge variant="secondary" className="mt-1">
                      Afgelopen
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Event Details */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-sm">
                  {format(new Date(webinarEvent.date), "EEEE d MMMM yyyy", { locale: nl })}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-sm">
                  {webinarEvent.time.slice(0, 5)} uur • {webinarEvent.duration_minutes} minuten
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Video className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-sm">Online (link volgt per e-mail)</span>
              </div>
            </div>

            {/* Countdown */}
            {!isPast && (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-4">
                  {isToday ? "Het webinar start over:" : "Nog te gaan:"}
                </p>
                <div className="flex items-center justify-center gap-3">
                  <TimeBlock value={timeUntil.days} label="dagen" />
                  <span className="text-2xl font-bold text-muted-foreground">:</span>
                  <TimeBlock value={timeUntil.hours} label="uren" />
                  <span className="text-2xl font-bold text-muted-foreground">:</span>
                  <TimeBlock value={timeUntil.minutes} label="min" />
                  <span className="text-2xl font-bold text-muted-foreground">:</span>
                  <TimeBlock value={timeUntil.seconds} label="sec" />
                </div>
              </div>
            )}

            {/* Calendar Buttons */}
            {!isPast && (
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => window.open(generateGoogleCalendarUrl(), "_blank")}
                >
                  <CalendarPlus className="h-4 w-4 mr-2" />
                  Google Calendar
                </Button>
                <Button variant="outline" className="flex-1" onClick={generateIcsFile}>
                  <CalendarPlus className="h-4 w-4 mr-2" />
                  Outlook / iCal
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bonuses Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Jouw Bonussen</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Direct toegang tot deze tools
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {bonuses.map((bonus) => (
                <button
                  key={bonus.title}
                  onClick={() => navigate(bonus.link)}
                  className="w-full flex items-center gap-4 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-all text-left group"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <bonus.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{bonus.title}</span>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {bonus.description}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Share Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Share2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Deel met vrienden</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Ken je iemand die ook geïnteresseerd is?
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={shareWhatsApp} className="w-full sm:w-auto">
              <Share2 className="h-4 w-4 mr-2" />
              Deel via WhatsApp
            </Button>
          </CardContent>
        </Card>

        {/* Explore Portal CTA */}
        <Card className="bg-muted/30">
          <CardContent className="py-6">
            <div className="text-center">
              <h3 className="font-semibold text-foreground mb-2">
                Ontdek het Viva Portaal
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Bekijk projecten, gebruik onze calculators en bereid je voor op je oriëntatie.
              </p>
              <Button onClick={() => navigate("/dashboard")}>
                Ga naar dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
  );
}
