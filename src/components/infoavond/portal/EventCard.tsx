import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Calendar, Clock, MapPin, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface InfoEveningEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location_name: string;
  location_address: string;
  current_registrations: number | null;
  max_capacity: number | null;
}

interface EventCardProps {
  event: InfoEveningEvent;
  isExpanded: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}

export function EventCard({ event, isExpanded, onToggle, children }: EventCardProps) {
  const eventDate = new Date(event.date);
  const formattedDate = format(eventDate, "EEEE d MMMM yyyy", { locale: nl });
  const availableSpots = event.max_capacity 
    ? event.max_capacity - (event.current_registrations || 0)
    : null;
  const isFull = availableSpots !== null && availableSpots <= 0;

  return (
    <Card className={cn(
      "transition-all duration-200",
      isExpanded && "ring-2 ring-primary/20"
    )}>
      <CardContent className="p-6">
        <div className="flex flex-col gap-4">
          {/* Event Info */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <Calendar className="h-5 w-5" />
                <span className="font-semibold capitalize">{formattedDate}</span>
              </div>
              
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{event.time}</span>
              </div>
              
              <div className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium text-foreground">{event.location_name}</div>
                  <div className="text-sm">{event.location_address}</div>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-start sm:items-end gap-2">
              <Button
                onClick={onToggle}
                disabled={isFull}
                variant={isExpanded ? "outline" : "default"}
                className="w-full sm:w-auto"
              >
                {isFull ? (
                  "Volzet"
                ) : isExpanded ? (
                  <>
                    Sluiten
                    <ChevronUp className="ml-2 h-4 w-4" />
                  </>
                ) : (
                  <>
                    Schrijf je in
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Expanded Content */}
          {isExpanded && children && (
            <div className="pt-4 border-t">
              {children}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
