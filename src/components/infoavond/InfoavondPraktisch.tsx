import { Calendar, MapPin, Clock, Car, CheckCircle2, Gift, Users, CalendarCheck, Timer, ParkingCircle, FileCheck } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { useActiveInfoEvents, type ActiveInfoEvent } from "@/hooks/useActiveInfoEvents";

// Helper function to format time from HH:MM:SS to readable format
const formatScheduleTime = (time: string | null, defaultTime: string): string => {
  const timeStr = time || defaultTime;
  const [hours, minutes] = timeStr.split(':');
  return `${parseInt(hours)}u${minutes !== '00' ? minutes : ''}`;
};

const defaultScheduleItems = [
  { time: "19u30", label: "Ontvangst met koffie en thee" },
  { time: "20u", label: "Start infoavond" },
  { time: "21u15", label: "Gezellig napraten met team en andere deelnemers" }
];

const importantItems = [
  "Geen verplichtingen – je komt puur om te leren, niet om te kopen.",
  "Alle vragen zijn welkom – ook de kritische.",
  "Je ontvangt na afloop een checklist met volgende stappen."
];

interface InfoavondPraktischProps {
  hasEvents?: boolean;
}

export function InfoavondPraktisch({ hasEvents = true }: InfoavondPraktischProps) {
  const { data: events = [] } = useActiveInfoEvents();

  const scrollToRegistration = () => {
    const element = document.getElementById('registratie');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container max-w-4xl mx-auto px-4">
        <div className="text-center mb-12">
          <p className="text-primary font-medium mb-2">Praktische informatie</p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Dit moet je weten
          </h2>
        </div>
        
        <div className="space-y-6">
          {/* Data & Locaties - only show when events exist */}
          {hasEvents && events.length > 0 && (
            <div className="bg-background rounded-xl border border-border p-6">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground text-lg mb-4 flex items-center gap-2">
                    <CalendarCheck className="h-5 w-5 text-primary" /> Data & Locaties
                  </h3>
                  <div className="space-y-4">
                    {events.map((event) => (
                      <div key={event.id} className="flex items-start gap-3">
                        <Calendar className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        <div>
                          <div className="font-medium text-foreground">
                            {format(new Date(event.date), "EEEE d MMMM", { locale: nl })} • {event.location_name}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                            <MapPin className="h-3 w-3" />
                            {event.location_address}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tijdschema */}
          <div className="bg-background rounded-xl border border-border p-6">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground text-lg mb-4 flex items-center gap-2">
                  <Timer className="h-5 w-5 text-primary" /> Tijdschema
                </h3>
                <div className="space-y-3">
                  {(() => {
                    const firstEvent = events[0];
                    const scheduleItems = firstEvent ? [
                      { time: formatScheduleTime(firstEvent.doors_open_time, '19:30:00'), label: "Ontvangst met koffie en thee" },
                      { time: formatScheduleTime(firstEvent.presentation_start_time, '20:00:00'), label: "Start infoavond" },
                      { time: formatScheduleTime(firstEvent.presentation_end_time, '21:15:00'), label: "Gezellig napraten met team en andere deelnemers" }
                    ] : defaultScheduleItems;
                    
                    return scheduleItems.map((item, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <Clock className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        <div>
                          <span className="font-medium text-foreground">{item.time}</span>
                          <span className="text-muted-foreground"> – {item.label}</span>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Parkeergelegenheid */}
          <div className="bg-background rounded-xl border border-border p-6">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground text-lg mb-3 flex items-center gap-2">
                  <ParkingCircle className="h-5 w-5 text-primary" /> Parkeergelegenheid
                </h3>
                <div className="flex items-start gap-3">
                  <Car className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                  <p className="text-muted-foreground">
                    Gratis parkeergelegenheid bij de locatie. Je ontvangt per mail een volledig overzicht met routebeschrijving.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Belangrijk om te weten */}
          <div className="bg-background rounded-xl border border-border p-6">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground text-lg mb-4 flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-primary" /> Belangrijk om te weten
                </h3>
                <div className="space-y-3">
                  {importantItems.map((item, index) => (
                    <div key={index} className="flex items-start gap-3">
                      {index === 1 ? (
                        <Gift className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                      ) : (
                        <Users className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                      )}
                      <p className="text-muted-foreground">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <div className="pt-4">
            <Button 
              onClick={scrollToRegistration}
              size="lg"
              className="w-full py-6 text-lg font-semibold"
            >
              {hasEvents ? "Schrijf je gratis in" : "Hou me op de hoogte"}
            </Button>
            <p className="text-center text-sm text-muted-foreground mt-3 flex items-center justify-center gap-2">
              <span className="text-primary">✓</span> 100% informatief • Geen verkoopdruk
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
