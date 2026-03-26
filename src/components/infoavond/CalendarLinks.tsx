import { Calendar, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";

interface CalendarLinksProps {
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  eventAddress: string;
}

export const CalendarLinks = ({
  eventTitle,
  eventDate,
  eventTime,
  eventLocation,
  eventAddress,
}: CalendarLinksProps) => {
  // Parse the event date and time
  const [hours, minutes] = eventTime.split(":").map(Number);
  const startDate = parseISO(eventDate);
  startDate.setHours(hours || 19, minutes || 0, 0, 0);
  
  // End time is 2.5 hours later by default
  const endDate = new Date(startDate.getTime() + 2.5 * 60 * 60 * 1000);

  const formatDateForGoogle = (date: Date) => {
    return format(date, "yyyyMMdd'T'HHmmss");
  };

  const formatDateForICS = (date: Date) => {
    return format(date, "yyyyMMdd'T'HHmmss");
  };

  const description = `Infoavond Investeren in Spanje bij Viva Vastgoed.

Locatie: ${eventLocation}
Adres: ${eventAddress}

Tot dan!`;

  const googleCalendarUrl = () => {
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: eventTitle,
      dates: `${formatDateForGoogle(startDate)}/${formatDateForGoogle(endDate)}`,
      details: description,
      location: `${eventLocation}, ${eventAddress}`,
      sf: "true",
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  const outlookCalendarUrl = () => {
    const params = new URLSearchParams({
      path: "/calendar/action/compose",
      rru: "addevent",
      subject: eventTitle,
      startdt: startDate.toISOString(),
      enddt: endDate.toISOString(),
      body: description,
      location: `${eventLocation}, ${eventAddress}`,
    });
    return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
  };

  const downloadICS = () => {
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Viva Vastgoed//Infoavond//NL
BEGIN:VEVENT
DTSTART:${formatDateForICS(startDate)}
DTEND:${formatDateForICS(endDate)}
SUMMARY:${eventTitle}
DESCRIPTION:${description.replace(/\n/g, "\\n")}
LOCATION:${eventLocation}, ${eventAddress}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `infoavond-${format(startDate, "yyyy-MM-dd")}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground text-center">
        Voeg toe aan je agenda zodat je het niet vergeet:
      </p>
      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(googleCalendarUrl(), "_blank")}
          className="gap-2"
        >
          <Calendar className="w-4 h-4" />
          Google Calendar
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(outlookCalendarUrl(), "_blank")}
          className="gap-2"
        >
          <Calendar className="w-4 h-4" />
          Outlook
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={downloadICS}
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          Download .ics
        </Button>
      </div>
    </div>
  );
};
