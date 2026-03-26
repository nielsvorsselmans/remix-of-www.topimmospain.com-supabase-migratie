import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { CheckCircle2, ArrowRight, RotateCcw } from "lucide-react";
import { STYLE_MATCHER_ROUNDS, StyleMatcherResult, getStyleResultLabel } from "@/constants/gamifiedOnboarding";
import { GameCompleteBadge } from "./GameCompleteBadge";
import { GameProjectPreview } from "./GameProjectPreview";
import { GameSafetyNote } from "./GameSafetyNote";

// Import style images
import modernVilla from "@/assets/style/modern-villa.jpg";
import traditionalFinca from "@/assets/style/traditional-finca.jpg";
import seaView from "@/assets/style/sea-view.jpg";
import golfView from "@/assets/style/golf-view.jpg";
import coastalTown from "@/assets/style/coastal-town.jpg";
import inlandVillage from "@/assets/style/inland-village.jpg";

// Map image keys to imports
const IMAGE_MAP: Record<string, string> = {
  "modern-villa": modernVilla,
  "traditional-finca": traditionalFinca,
  "sea-view": seaView,
  "golf-view": golfView,
  "coastal-town": coastalTown,
  "inland-village": inlandVillage,
};

interface StyleMatcherProps {
  onComplete: (result: StyleMatcherResult) => void;
  initialValues?: StyleMatcherResult;
}

export function StyleMatcher({ onComplete, initialValues }: StyleMatcherProps) {
  const [currentRound, setCurrentRound] = useState(0);
  const [selections, setSelections] = useState<Record<string, string>>(() => {
    if (initialValues) {
      return Object.fromEntries(
        Object.entries(initialValues).filter(([_, v]) => v !== undefined)
      ) as Record<string, string>;
    }
    return {};
  });
  const [isComplete, setIsComplete] = useState(false);
  const [hoveredOption, setHoveredOption] = useState<"a" | "b" | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const round = STYLE_MATCHER_ROUNDS[currentRound];
  const totalRounds = STYLE_MATCHER_ROUNDS.length;
  const progress = ((currentRound + 1) / totalRounds) * 100;

  // Convert selections to StyleMatcherResult format for preview
  const currentPreferences: Partial<StyleMatcherResult> = {
    architecture: selections.architecture as StyleMatcherResult["architecture"],
    view: selections.view as StyleMatcherResult["view"],
    location_type: selections.location_type as StyleMatcherResult["location_type"],
  };

  const handleSelect = (roundId: string, value: string) => {
    const newSelections = { ...selections, [roundId]: value };
    setSelections(newSelections);

    // Show preview after each selection
    setShowPreview(true);

    // Short delay for animation feedback, then advance
    setTimeout(() => {
      if (currentRound < totalRounds - 1) {
        setCurrentRound((prev) => prev + 1);
        // Keep preview visible between rounds
      } else {
        // All rounds complete
        setIsComplete(true);
        onComplete(newSelections as StyleMatcherResult);
      }
    }, 800); // Slightly longer to show preview
  };

  const handleReset = () => {
    setSelections({});
    setCurrentRound(0);
    setIsComplete(false);
    setShowPreview(false);
  };

  // Get label for a selection value (including both/none)
  const getSelectionLabel = (roundId: string, value: string) => {
    if (value === "both") return "Beide prima";
    if (value === "none") return "Geen voorkeur";
    const roundData = STYLE_MATCHER_ROUNDS.find((r) => r.id === roundId);
    if (!roundData) return value;
    return roundData.optionA.value === value 
      ? roundData.optionA.label 
      : roundData.optionB.label;
  };

  if (isComplete) {
    const resultLabel = getStyleResultLabel(selections as StyleMatcherResult);
    
    return (
      <div className="space-y-6 text-center py-4">
        <GameCompleteBadge label="Stijl bepaald!" />
        
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-foreground">
            Jouw stijl: {resultLabel}
          </h3>
          <p className="text-muted-foreground text-sm">
            We gebruiken dit om projecten te vinden die bij jouw smaak passen.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {Object.entries(selections).map(([key, value]) => (
            <span
              key={key}
              className="px-3 py-1 bg-secondary rounded-full text-sm"
            >
              {getSelectionLabel(key, value)}
            </span>
          ))}
        </div>

        {/* Show matching projects */}
        <div className="pt-4 border-t">
          <GameProjectPreview
            stylePreferences={currentPreferences}
            title="✨ Projecten die bij jouw stijl passen"
            maxProjects={3}
          />
        </div>

        <Button variant="ghost" size="sm" onClick={handleReset}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Opnieuw kiezen
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Vraag {currentRound + 1} van {totalRounds}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question */}
      <h3 className="text-lg font-medium text-center">{round.question}</h3>

      {/* This or That options */}
      <div className="grid grid-cols-2 gap-4 relative">
        {/* Option A */}
        <button
          onClick={() => handleSelect(round.id, round.optionA.value)}
          onMouseEnter={() => setHoveredOption("a")}
          onMouseLeave={() => setHoveredOption(null)}
          className={cn(
            "group relative rounded-xl overflow-hidden transition-all duration-300",
            "border-2 border-transparent hover:border-primary",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
            hoveredOption === "a" && "scale-[1.02] shadow-lg",
            hoveredOption === "b" && "opacity-70 scale-[0.98]"
          )}
        >
          <div className="aspect-[4/3] relative">
            <img
              src={IMAGE_MAP[round.optionA.image]}
              alt={round.optionA.label}
              className="w-full h-full object-cover"
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            {/* Label */}
            <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
              <span className="font-medium text-sm md:text-base">
                {round.optionA.label}
              </span>
            </div>
          </div>
        </button>

        {/* "OF" divider - centered between cards */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <span className="bg-background px-2 py-1 rounded-full text-xs font-medium text-muted-foreground border shadow-sm">
            OF
          </span>
        </div>

        {/* Option B */}
        <button
          onClick={() => handleSelect(round.id, round.optionB.value)}
          onMouseEnter={() => setHoveredOption("b")}
          onMouseLeave={() => setHoveredOption(null)}
          className={cn(
            "group relative rounded-xl overflow-hidden transition-all duration-300",
            "border-2 border-transparent hover:border-primary",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
            hoveredOption === "b" && "scale-[1.02] shadow-lg",
            hoveredOption === "a" && "opacity-70 scale-[0.98]"
          )}
        >
          <div className="aspect-[4/3] relative">
            <img
              src={IMAGE_MAP[round.optionB.image]}
              alt={round.optionB.label}
              className="w-full h-full object-cover"
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            {/* Label */}
            <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
              <span className="font-medium text-sm md:text-base">
                {round.optionB.label}
              </span>
            </div>
          </div>
        </button>
      </div>

      {/* "Beide prima" and "Geen voorkeur" options */}
      <div className="flex justify-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleSelect(round.id, "both")}
          className="text-muted-foreground"
        >
          Beide prima
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleSelect(round.id, "none")}
          className="text-muted-foreground"
        >
          Geen voorkeur
        </Button>
      </div>

      {/* Safety note */}
      <GameSafetyNote context="style" />

      {/* Live project preview after making selections */}
      {showPreview && Object.keys(selections).length > 0 && (
        <div className="pt-4 border-t animate-in fade-in slide-in-from-bottom-2 duration-300">
          <GameProjectPreview
            stylePreferences={currentPreferences}
            title="✨ Projecten die al passen bij je keuze"
            maxProjects={3}
          />
        </div>
      )}
    </div>
  );
}
