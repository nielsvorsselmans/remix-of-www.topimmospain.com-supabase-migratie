import { useState, useEffect } from "react";
import { Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFutureWebinarEvents } from "@/hooks/useActiveWebinarEvents";

export function WebinarStickyCountdown() {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const { data: futureEvents } = useFutureWebinarEvents();
  const nextEvent = futureEvents?.[0] ?? null;

  useEffect(() => {
    if (!nextEvent) return;

    const calculateTimeLeft = () => {
      const eventDateTime = new Date(`${nextEvent.date}T${nextEvent.time}`);
      const now = new Date();
      const difference = eventDateTime.getTime() - now.getTime();

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [nextEvent]);

  const scrollToRegistration = () => {
    document.getElementById("webinar-registratie")?.scrollIntoView({ behavior: "smooth" });
  };

  if (!nextEvent) return null;

  return (
    <div className="sticky top-0 z-50 bg-primary text-primary-foreground py-2 md:py-2.5 px-3 md:px-4">
      <div className="container mx-auto flex items-center justify-between gap-2 md:gap-4">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <Clock className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0" />
          <span className="text-xs md:text-sm font-medium truncate">
            <span className="hidden sm:inline">Volgende webinar over: </span>
            <span className="font-bold tabular-nums">
              {timeLeft.days}d {timeLeft.hours}u {timeLeft.minutes}m
              <span className="hidden md:inline"> {timeLeft.seconds}s</span>
            </span>
          </span>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={scrollToRegistration}
          className="shrink-0 group h-7 md:h-8 text-xs md:text-sm px-2 md:px-3"
        >
          <span className="hidden sm:inline">Schrijf je gratis in</span>
          <span className="sm:hidden">Inschrijven</span>
          <ArrowRight className="ml-1 h-3 w-3 md:h-3.5 md:w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Button>
      </div>
    </div>
  );
}