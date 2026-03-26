import { useState, useEffect } from "react";
import { differenceInDays, differenceInHours, differenceInMinutes, parseISO } from "date-fns";
import { Clock } from "lucide-react";

interface EventCountdownProps {
  eventDate: string;
  eventTime: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
}

export const EventCountdown = ({ eventDate, eventTime }: EventCountdownProps) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      // Parse the event datetime
      const [hours, minutes] = eventTime.split(":").map(Number);
      const eventDateTime = parseISO(eventDate);
      eventDateTime.setHours(hours || 19, minutes || 0, 0, 0);

      const now = new Date();
      
      if (eventDateTime <= now) {
        setTimeLeft(null);
        return;
      }

      const totalMinutes = differenceInMinutes(eventDateTime, now);
      const days = Math.floor(totalMinutes / (60 * 24));
      const remainingHours = Math.floor((totalMinutes % (60 * 24)) / 60);
      const mins = totalMinutes % 60;

      setTimeLeft({
        days,
        hours: remainingHours,
        minutes: mins,
      });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [eventDate, eventTime]);

  if (!timeLeft) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/10">
      <Clock className="w-5 h-5 text-primary flex-shrink-0" />
      <div className="text-sm">
        <span className="text-muted-foreground">Nog </span>
        {timeLeft.days > 0 && (
          <>
            <span className="font-semibold text-foreground">{timeLeft.days}</span>
            <span className="text-muted-foreground"> {timeLeft.days === 1 ? "dag" : "dagen"}, </span>
          </>
        )}
        <span className="font-semibold text-foreground">{timeLeft.hours}</span>
        <span className="text-muted-foreground"> {timeLeft.hours === 1 ? "uur" : "uur"}</span>
        {timeLeft.days === 0 && (
          <>
            <span className="text-muted-foreground"> en </span>
            <span className="font-semibold text-foreground">{timeLeft.minutes}</span>
            <span className="text-muted-foreground"> min</span>
          </>
        )}
      </div>
    </div>
  );
};
