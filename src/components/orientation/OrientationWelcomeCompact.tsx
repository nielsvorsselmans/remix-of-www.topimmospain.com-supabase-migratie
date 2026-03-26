import { Progress } from "@/components/ui/progress";

interface OrientationWelcomeCompactProps {
  firstName?: string;
  completedCount: number;
  totalSteps: number;
  progressPercentage: number;
}

function getGreeting(name: string, percentage: number): string {
  if (percentage === 0) return `Welkom, ${name}!`;
  if (percentage <= 30) return `Goed bezig, ${name}!`;
  if (percentage <= 60) return `Lekker op weg, ${name}!`;
  if (percentage < 100) return `Bijna klaar, ${name}!`;
  return `Compleet, ${name}!`;
}

function getSubtext(percentage: number): string {
  if (percentage === 0) return "Samen ontdekken we of investeren in Spanje bij je past.";
  if (percentage <= 30) return "Je legt een mooie basis voor een weloverwogen keuze.";
  if (percentage <= 60) return "Steeds meer puzzelstukjes vallen op hun plek.";
  if (percentage < 100) return "Nog even en je hebt alle inzichten voor een goed gesprek.";
  return "Je hebt je uitstekend voorbereid. Tijd voor een persoonlijk gesprek?";
}

export function OrientationWelcomeCompact({
  firstName,
  completedCount,
  totalSteps,
  progressPercentage,
}: OrientationWelcomeCompactProps) {
  const name = firstName || "daar";

  return (
    <div className="space-y-2">
      <div>
        <h1 className="text-base font-semibold text-foreground">
          {getGreeting(name, progressPercentage)}
        </h1>
        <p className="text-xs text-muted-foreground">
          {getSubtext(progressPercentage)}
        </p>
      </div>
      <div className="flex items-center justify-between gap-2">
        <Progress value={progressPercentage} className="h-1.5 flex-1" />
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {Math.round(progressPercentage)}% — {completedCount} van {totalSteps}
        </span>
      </div>
    </div>
  );
}
