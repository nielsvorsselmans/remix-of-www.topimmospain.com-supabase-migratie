import { Progress } from "@/components/ui/progress";
import { Sun } from "lucide-react";

interface BezichtigingWelcomeCompactProps {
  firstName?: string;
  daysUntilTrip: number | null;
  completedTasks: number;
  totalTasks: number;
  hasTrip: boolean;
}

function getGreeting(name: string, daysUntil: number | null, hasTrip: boolean): string {
  if (!hasTrip) return `Welkom, ${name}!`;
  if (daysUntil === null) return `Welkom, ${name}!`;
  if (daysUntil === 0) return `${name}, vandaag is het zover!`;
  if (daysUntil === 1) return `${name}, morgen vertrek je!`;
  if (daysUntil <= 7) return `${name}, nog ${daysUntil} dagen!`;
  return `Welkom, ${name}!`;
}

function getSubtext(daysUntil: number | null, hasTrip: boolean): string {
  if (!hasTrip) return "Je bezichtigingsreis wordt voorbereid door je adviseur.";
  if (daysUntil === null) return "Je reis naar Spanje staat gepland.";
  if (daysUntil === 0) return "Geniet van je bezichtigingsreis in Spanje.";
  if (daysUntil === 1) return "Alles klaar voor morgen? Check hieronder je voorbereidingen.";
  if (daysUntil <= 7) return `Nog ${daysUntil} dagen tot je bezichtigingsreis naar Spanje.`;
  if (daysUntil <= 14) return `Over ${daysUntil} dagen ontdek je je toekomstige investering.`;
  return "Je bezichtigingsreis staat gepland. Bereid je rustig voor.";
}

export function BezichtigingWelcomeCompact({
  firstName,
  daysUntilTrip,
  completedTasks,
  totalTasks,
  hasTrip,
}: BezichtigingWelcomeCompactProps) {
  const name = firstName || "daar";
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-2">
      <div>
        <h1 className="text-base font-semibold text-foreground flex items-center gap-1.5">
          {hasTrip && daysUntilTrip !== null && daysUntilTrip <= 14 && (
            <Sun className="h-4 w-4 text-amber-500" />
          )}
          {getGreeting(name, daysUntilTrip, hasTrip)}
        </h1>
        <p className="text-xs text-muted-foreground">
          {getSubtext(daysUntilTrip, hasTrip)}
        </p>
      </div>
      {totalTasks > 0 && (
        <div className="flex items-center justify-between gap-2">
          <Progress value={progressPercent} className="h-1.5 flex-1" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {completedTasks} van {totalTasks} voorbereid
          </span>
        </div>
      )}
    </div>
  );
}
