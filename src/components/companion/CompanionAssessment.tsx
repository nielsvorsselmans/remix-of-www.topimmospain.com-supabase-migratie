import { cn } from "@/lib/utils";

interface CompanionAssessmentProps {
  interestLevel: string | null;
  budgetFit: boolean | null;
  followUpAction: string | null;
  onInterestChange: (value: string) => void;
  onBudgetFitChange: (value: boolean | null) => void;
  onFollowUpChange: (value: string) => void;
}

const INTEREST_LEVELS = [
  { value: "high", label: "Hoog", color: "bg-green-100 text-green-800 ring-green-300" },
  { value: "medium", label: "Midden", color: "bg-amber-100 text-amber-800 ring-amber-300" },
  { value: "low", label: "Laag", color: "bg-red-100 text-red-800 ring-red-300" },
] as const;

const FOLLOW_UP_OPTIONS = [
  { value: "offerte", label: "Offerte" },
  { value: "tweede_bezoek", label: "2e bezoek" },
  { value: "geen", label: "Geen" },
] as const;

// Smart suggestion: derive recommended follow-up from interest + budget
function getSuggestedFollowUp(interest: string | null, budget: boolean | null): string | null {
  if (interest === "high" && budget === true) return "offerte";
  if (interest === "high" && budget === false) return "tweede_bezoek";
  if (interest === "medium" && budget === true) return "tweede_bezoek";
  return null;
}

export function CompanionAssessment({
  interestLevel,
  budgetFit,
  followUpAction,
  onInterestChange,
  onBudgetFitChange,
  onFollowUpChange,
}: CompanionAssessmentProps) {
  const suggestion = getSuggestedFollowUp(interestLevel, budgetFit);
  const showSuggestion = suggestion && !followUpAction;

  // Auto-suggest follow-up when interest + budget are set but follow-up is empty
  const handleInterestChange = (value: string) => {
    onInterestChange(value);
  };

  const handleBudgetChange = (value: boolean | null) => {
    onBudgetFitChange(value);
  };

  return (
    <div className="space-y-4">
      {/* Interest level */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Interesse-niveau
        </p>
        <div className="flex gap-2">
          {INTEREST_LEVELS.map((level) => (
            <button
              key={level.value}
              onClick={() => handleInterestChange(interestLevel === level.value ? "" : level.value)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                interestLevel === level.value
                  ? `${level.color} ring-2`
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              {level.label}
            </button>
          ))}
        </div>
      </div>

      {/* Budget fit */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Budget passend?
        </p>
        <div className="flex gap-2">
          {([
            { value: true, label: "✓ Ja" },
            { value: false, label: "✗ Nee" },
          ] as const).map((opt) => (
            <button
              key={String(opt.value)}
              onClick={() => handleBudgetChange(budgetFit === opt.value ? null : opt.value)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                budgetFit === opt.value
                  ? opt.value
                    ? "bg-green-100 text-green-800 ring-2 ring-green-300"
                    : "bg-red-100 text-red-800 ring-2 ring-red-300"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Follow-up action */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Vervolgactie
          </p>
          {showSuggestion && (
            <button
              onClick={() => onFollowUpChange(suggestion)}
              className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors animate-in fade-in"
            >
              💡 Suggestie: {FOLLOW_UP_OPTIONS.find(o => o.value === suggestion)?.label}
            </button>
          )}
        </div>
        <div className="flex gap-2">
          {FOLLOW_UP_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onFollowUpChange(followUpAction === opt.value ? "" : opt.value)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                followUpAction === opt.value
                  ? "bg-primary/10 text-primary ring-2 ring-primary/30"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
