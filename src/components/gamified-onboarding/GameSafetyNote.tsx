import { cn } from "@/lib/utils";

interface GameSafetyNoteProps {
  context: "style" | "blend" | "budget";
  className?: string;
}

const SAFETY_MESSAGES: Record<string, string> = {
  style: "Je kunt dit later aanpassen — dit helpt ons enkel beter voorstellen.",
  blend: "Dit is geen definitieve keuze — je situatie kan veranderen.",
  budget: "Indicatie: exacte prijzen verschillen per unit en moment.",
};

/**
 * Trust-first safety note component for gamified onboarding
 * Reassures users that their choices are not binding
 */
export function GameSafetyNote({ context, className }: GameSafetyNoteProps) {
  return (
    <p className={cn(
      "text-xs text-muted-foreground/70 text-center py-2 border-t border-dashed border-muted",
      className
    )}>
      {SAFETY_MESSAGES[context]}
    </p>
  );
}
