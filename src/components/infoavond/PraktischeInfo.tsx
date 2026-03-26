import { MapPin, Car, Clock, Coffee } from "lucide-react";

interface PraktischeInfoProps {
  eventLocation: string;
  eventAddress: string;
  doorsOpenTime?: string;
  presentationStartTime?: string;
  presentationEndTime?: string;
}

// Helper function to format time from HH:MM:SS to HH:MM
const formatTimeDisplay = (time: string | null | undefined, defaultTime: string): string => {
  const timeStr = time || defaultTime;
  return timeStr.substring(0, 5); // Take only HH:MM part
};

export const PraktischeInfo = ({ 
  eventLocation, 
  eventAddress, 
  doorsOpenTime,
  presentationStartTime,
  presentationEndTime
}: PraktischeInfoProps) => {
  const doorsOpen = formatTimeDisplay(doorsOpenTime, "19:30");
  const startTime = formatTimeDisplay(presentationStartTime, "20:00");
  const endTime = formatTimeDisplay(presentationEndTime, "21:15");

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(eventAddress)}`;

  return (
    <div className="bg-muted/30 rounded-xl p-6 space-y-4">
      <h3 className="font-semibold text-foreground flex items-center gap-2">
        <MapPin className="w-5 h-5 text-primary" />
        Praktische info voor de avond
      </h3>
      
      <div className="grid gap-3 text-sm">
        <div className="flex items-start gap-3">
          <Car className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <span className="text-muted-foreground">
            Gratis parkeren bij de locatie
          </span>
        </div>
        
        <div className="flex items-start gap-3">
          <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div>
            <span className="text-muted-foreground">{eventLocation}</span>
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-primary hover:underline text-xs mt-0.5"
            >
              Bekijk op Google Maps →
            </a>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <Clock className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <span className="text-muted-foreground">
            Deuren open om {doorsOpen}, presentatie van {startTime} tot {endTime}
          </span>
        </div>
        
        <div className="flex items-start gap-3">
          <Coffee className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <span className="text-muted-foreground">
            Niets meenemen nodig – koffie, thee en water aanwezig
          </span>
        </div>
      </div>
    </div>
  );
};
