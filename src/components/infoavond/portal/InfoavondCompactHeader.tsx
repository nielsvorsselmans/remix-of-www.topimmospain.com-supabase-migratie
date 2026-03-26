import { CheckCircle, Clock, Calendar, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { EventCountdown } from "@/components/infoavond/EventCountdown";
import { CalendarLinks } from "@/components/infoavond/CalendarLinks";

interface InfoavondCompactHeaderProps {
  firstName: string;
  isConfirmed: boolean;
  event: {
    id: string;
    title: string;
    date: string;
    time: string;
    location_name: string;
    location_address: string;
  };
  numberOfPersons: number | null;
}

export function InfoavondCompactHeader({ 
  firstName, 
  isConfirmed, 
  event,
  numberOfPersons 
}: InfoavondCompactHeaderProps) {
  const eventDate = parseISO(event.date);
  const formattedDate = format(eventDate, "EEEE d MMMM", { locale: nl });
  const formattedTime = event.time.substring(0, 5);

  return (
    <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl p-6 md:p-8 border border-primary/20">
      {/* Status & Greeting */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            {isConfirmed ? (
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-primary" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={isConfirmed ? "default" : "secondary"} className="text-xs">
                {isConfirmed ? "Bevestigd" : "Nog niet bevestigd"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {numberOfPersons || 1} {(numberOfPersons || 1) === 1 ? 'persoon' : 'personen'}
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">
              {isConfirmed 
                ? `Welkom ${firstName}!`
                : `Dag ${firstName}, bevestig je inschrijving`
              }
            </h1>
          </div>
        </div>
      </div>

      {/* Event Summary - Compact */}
      <div className="bg-background/50 rounded-xl p-4 mb-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="capitalize font-medium">{formattedDate}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <span className="font-medium">{formattedTime}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="font-medium">{event.location_name}</span>
          </div>
        </div>
      </div>

      {/* Countdown & Calendar Links */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <EventCountdown eventDate={event.date} eventTime={event.time} />
        <div className="flex-shrink-0">
          <CalendarLinks
            eventTitle={event.title}
            eventDate={event.date}
            eventTime={event.time}
            eventLocation={event.location_name}
            eventAddress={event.location_address}
          />
        </div>
      </div>
    </div>
  );
}
