import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface WebinarCountdownProps {
  targetDate: Date;
  label?: string;
}

export function WebinarCountdown({ targetDate, label = "Volgende webinar start over" }: WebinarCountdownProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const target = targetDate.getTime();
      const difference = target - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  const TimeBlock = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <div className="bg-primary text-primary-foreground rounded-lg w-14 h-14 md:w-16 md:h-16 flex items-center justify-center font-bold text-xl md:text-2xl">
        {value.toString().padStart(2, "0")}
      </div>
      <span className="text-xs text-muted-foreground mt-1">{label}</span>
    </div>
  );

  return (
    <div className="bg-secondary/50 border border-border rounded-xl p-4 md:p-6">
      <div className="flex items-center justify-center gap-2 mb-4">
        <Clock className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-foreground">{label}</span>
      </div>
      <div className="flex items-center justify-center gap-2 md:gap-4">
        <TimeBlock value={timeLeft.days} label="dagen" />
        <span className="text-2xl font-bold text-muted-foreground">:</span>
        <TimeBlock value={timeLeft.hours} label="uren" />
        <span className="text-2xl font-bold text-muted-foreground">:</span>
        <TimeBlock value={timeLeft.minutes} label="min" />
        <span className="text-2xl font-bold text-muted-foreground">:</span>
        <TimeBlock value={timeLeft.seconds} label="sec" />
      </div>
    </div>
  );
}
