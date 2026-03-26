import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Sun, TrendingUp, CheckCircle2 } from "lucide-react";
import { INVESTMENT_BLEND_FEEDBACK, getInvestmentGoalFromBlend } from "@/constants/gamifiedOnboarding";
import { GameCompleteBadge } from "./GameCompleteBadge";
import { GameSafetyNote } from "./GameSafetyNote";

interface InvestmentBlendSliderProps {
  onComplete: (blend: number, investmentGoal: string) => void;
  initialValue?: number;
}

// Quick-pick chips for faster mobile input
const QUICK_PICKS = [
  { label: "Max rendement", value: 90, emoji: "📈" },
  { label: "50/50 balans", value: 50, emoji: "⚖️" },
  { label: "Vooral genieten", value: 20, emoji: "☀️" },
];

export function InvestmentBlendSlider({ 
  onComplete, 
  initialValue = 50 
}: InvestmentBlendSliderProps) {
  const [value, setValue] = useState(initialValue);
  const [isComplete, setIsComplete] = useState(false);

  // Get feedback text based on current value
  const getFeedback = () => {
    for (const feedback of INVESTMENT_BLEND_FEEDBACK) {
      if (value >= feedback.min && value <= feedback.max) {
        return feedback;
      }
    }
    return INVESTMENT_BLEND_FEEDBACK[2]; // Default to middle
  };

  const feedback = getFeedback();

  const handleConfirm = () => {
    const investmentGoal = getInvestmentGoalFromBlend(value);
    setIsComplete(true);
    onComplete(value, investmentGoal);
  };

  if (isComplete) {
    return (
      <div className="space-y-4 text-center py-4">
        <GameCompleteBadge label="Balans bepaald!" />
        
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-foreground">
            {feedback.label}
          </h3>
          <p className="text-muted-foreground text-sm">
            {feedback.description}
          </p>
        </div>

        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setIsComplete(false)}
        >
          Aanpassen
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      {/* Quick-pick chips for faster input */}
      <div className="flex justify-center gap-2 flex-wrap">
        {QUICK_PICKS.map((pick) => (
          <Button
            key={pick.value}
            variant={value === pick.value ? "default" : "outline"}
            size="sm"
            onClick={() => setValue(pick.value)}
            className="text-xs gap-1"
          >
            <span>{pick.emoji}</span>
            {pick.label}
          </Button>
        ))}
      </div>

      {/* Slider with icons */}
      <div className="space-y-6">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-amber-600">
            <Sun className="h-5 w-5" />
            <span className="font-medium">Genieten</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-600">
            <span className="font-medium">Rendement</span>
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        <div className="px-2">
          <Slider
            value={[value]}
            onValueChange={(values) => setValue(values[0])}
            min={0}
            max={100}
            step={5}
            className="w-full"
          />
        </div>

        {/* Value indicator */}
        <div className="flex justify-center">
          <div className={cn(
            "px-4 py-2 rounded-full text-sm font-medium",
            "bg-gradient-to-r",
            value <= 40 
              ? "from-amber-100 to-amber-50 text-amber-700" 
              : value >= 60 
                ? "from-emerald-50 to-emerald-100 text-emerald-700"
                : "from-amber-50 via-secondary to-emerald-50 text-foreground"
          )}>
            {100 - value}% Genieten • {value}% Rendement
          </div>
        </div>
      </div>

      {/* Dynamic feedback */}
      <div className="bg-secondary/50 rounded-xl p-4 space-y-2">
        <h4 className="font-medium text-foreground">{feedback.label}</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {feedback.description}
        </p>
      </div>

      {/* Safety note */}
      <GameSafetyNote context="blend" />

      {/* Confirm button */}
      <Button 
        onClick={handleConfirm} 
        className="w-full"
        size="lg"
      >
        <CheckCircle2 className="h-4 w-4 mr-2" />
        Dit is mijn balans
      </Button>
    </div>
  );
}
