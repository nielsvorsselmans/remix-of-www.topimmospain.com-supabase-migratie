import { cn } from "@/lib/utils";
import type { CompanionNote } from "@/hooks/useCompanionNotes";

interface CompanionCompletenessIndicatorProps {
  note: CompanionNote | undefined;
}

const STEPS = [
  { key: "rating", label: "Score", check: (n?: CompanionNote) => !!n?.rating && n.rating > 0 },
  { key: "assessment", label: "Beoordeling", check: (n?: CompanionNote) => !!n?.interest_level },
  { key: "notes", label: "Notities", check: (n?: CompanionNote) => !!n?.note_text?.trim() },
] as const;

export function CompanionCompletenessIndicator({ note }: CompanionCompletenessIndicatorProps) {
  const completed = STEPS.filter((s) => s.check(note)).length;

  return (
    <div className="flex items-center gap-3">
      {STEPS.map((step) => {
        const done = step.check(note);
        return (
          <div key={step.key} className="flex items-center gap-1.5">
            <div
              className={cn(
                "h-2 w-2 rounded-full transition-colors",
                done ? "bg-primary" : "bg-muted-foreground/25"
              )}
            />
            <span className={cn(
              "text-xs",
              done ? "text-foreground font-medium" : "text-muted-foreground"
            )}>
              {step.label}
            </span>
          </div>
        );
      })}
      {completed === STEPS.length && (
        <span className="text-xs text-primary font-medium ml-1">✓ Compleet</span>
      )}
    </div>
  );
}
