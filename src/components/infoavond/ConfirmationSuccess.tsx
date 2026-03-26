import { useEffect } from "react";
import { CheckCircle, Calendar } from "lucide-react";
import confetti from "canvas-confetti";
import { CalendarLinks } from "./CalendarLinks";
import { formatEventDateFull } from "@/lib/dateUtils";
interface ConfirmationSuccessProps {
  firstName: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  eventAddress: string;
}

export const ConfirmationSuccess = ({
  firstName,
  eventTitle,
  eventDate,
  eventTime,
  eventLocation,
  eventAddress,
}: ConfirmationSuccessProps) => {
  useEffect(() => {
    // Fire confetti on mount
    const duration = 2000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function () {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      
      // Launch confetti from both sides
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"],
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"],
      });
    }, 250);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="text-center space-y-6 animate-fade-in">
      {/* Success Icon */}
      <div className="relative">
        <div className="w-20 h-20 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center animate-scale-in">
          <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
        </div>
        {/* Pulsing ring */}
        <div className="absolute inset-0 w-20 h-20 mx-auto rounded-full bg-green-400/20 animate-ping" style={{ animationDuration: "1.5s" }} />
      </div>

      {/* Success Message */}
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          Yes {firstName}, je staat op de gastenlijst! 🥂
        </h1>
        <p className="text-muted-foreground">
          Wat leuk dat je erbij bent op {formatEventDateFull(eventDate)}. We zijn druk bezig met de voorbereidingen om je een helder beeld te geven van de mogelijkheden in Spanje.
        </p>
      </div>

      {/* Commitment & Reciprocity Notice */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-sm text-foreground">
        <p>We hebben een stoel voor je gereserveerd en de catering besteld.</p>
        <p className="mt-2 text-muted-foreground">
          Mocht er onverhoopt iets tussenkomen, laat het ons dan even weten. Zo niet: tot snel!
        </p>
      </div>

      {/* Calendar Links - Prominent */}
      <div className="bg-card border rounded-xl p-5">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">
            Zet het in je agenda
          </h3>
        </div>
        <CalendarLinks
          eventTitle={eventTitle}
          eventDate={eventDate}
          eventTime={eventTime}
          eventLocation={eventLocation}
          eventAddress={eventAddress}
        />
      </div>
    </div>
  );
};
