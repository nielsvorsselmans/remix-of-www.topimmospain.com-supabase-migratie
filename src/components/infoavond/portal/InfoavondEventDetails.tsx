import { Calendar, Clock, MapPin, Users, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { EventCountdown } from "@/components/infoavond/EventCountdown";
import { CalendarLinks } from "@/components/infoavond/CalendarLinks";

interface InfoavondEventDetailsProps {
  event: {
    id: string;
    title: string;
    date: string;
    time: string;
    doors_open_time?: string | null;
    presentation_start_time?: string | null;
    presentation_end_time?: string | null;
    location_name: string;
    location_address: string;
    current_registrations: number | null;
  };
  numberOfPersons: number | null;
}

export function InfoavondEventDetails({ event, numberOfPersons }: InfoavondEventDetailsProps) {
  const eventDate = parseISO(event.date);
  const formattedDate = format(eventDate, "EEEE d MMMM yyyy", { locale: nl });
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location_address)}`;

  // Format times for display
  const formatTime = (time: string | null | undefined, defaultTime: string): string => {
    const timeStr = time || defaultTime;
    return timeStr.substring(0, 5); // Take only HH:MM part
  };

  const doorsOpen = formatTime(event.doors_open_time, "19:30");
  const startTime = formatTime(event.presentation_start_time, "20:00");
  const endTime = formatTime(event.presentation_end_time, "21:15");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          {event.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Countdown */}
        <EventCountdown eventDate={event.date} eventTime={event.time} />

        {/* Date & Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium capitalize">{formattedDate}</p>
              <p className="text-sm text-muted-foreground">Datum</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">Deuren open om {doorsOpen}</p>
              <p className="text-sm text-muted-foreground">Presentatie van {startTime} tot {endTime}</p>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-start gap-3">
          <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">{event.location_name}</p>
            <p className="text-sm text-muted-foreground">{event.location_address}</p>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 mt-1"
              asChild
            >
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                Bekijk op Google Maps
                <ExternalLink className="w-3 h-3" />
              </a>
            </Button>
          </div>
        </div>

        {/* Registration info */}
        <div className="flex items-start gap-3">
          <Users className="w-5 h-5 text-muted-foreground mt-0.5" />
          <div>
            <p className="font-medium">{numberOfPersons || 1} {(numberOfPersons || 1) === 1 ? 'persoon' : 'personen'}</p>
            <p className="text-sm text-muted-foreground">Jouw registratie</p>
            {event.current_registrations && (
              <p className="text-xs text-muted-foreground mt-1">
                {event.current_registrations} deelnemers ingeschreven
              </p>
            )}
          </div>
        </div>

        {/* Calendar Links */}
        <div className="pt-4 border-t">
          <p className="text-sm font-medium mb-3">Voeg toe aan je agenda</p>
          <CalendarLinks
            eventTitle={event.title}
            eventDate={event.date}
            eventTime={event.time}
            eventLocation={event.location_name}
            eventAddress={event.location_address}
          />
        </div>
      </CardContent>
    </Card>
  );
}
