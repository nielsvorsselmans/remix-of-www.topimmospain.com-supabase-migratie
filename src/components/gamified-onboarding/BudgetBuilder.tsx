import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { CheckCircle2, Euro } from "lucide-react";
import { BUDGET_BUILDER_OPTIONS, BudgetBuilderResult } from "@/constants/gamifiedOnboarding";
import { GameCompleteBadge } from "./GameCompleteBadge";
import { GameProjectPreview } from "./GameProjectPreview";

interface BudgetBuilderProps {
  onComplete: (result: BudgetBuilderResult) => void;
  initialSelections?: string[];
}

export function BudgetBuilder({ onComplete, initialSelections = ["bed_2", "pool_shared", "sea_15min"] }: BudgetBuilderProps) {
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set(initialSelections));
  const [isComplete, setIsComplete] = useState(false);

  // Group options by category
  const optionsByCategory = useMemo(() => {
    const groups: Record<string, typeof BUDGET_BUILDER_OPTIONS> = {};
    for (const option of BUDGET_BUILDER_OPTIONS) {
      if (!groups[option.category]) {
        groups[option.category] = [];
      }
      groups[option.category].push(option);
    }
    return groups;
  }, []);

  // Category labels
  const categoryLabels: Record<string, string> = {
    bedrooms: "Slaapkamers",
    pool: "Zwembad",
    sea: "Afstand tot zee",
  };

  // Calculate total price
  const priceRange = useMemo(() => {
    let basePrice = 0;
    let additions = 0;

    for (const optionId of selectedOptions) {
      const option = BUDGET_BUILDER_OPTIONS.find((o) => o.id === optionId);
      if (option) {
        if (option.basePrice) {
          basePrice = option.basePrice;
        }
        additions += option.priceImpact;
      }
    }

    const min = basePrice + additions;
    const max = min + 75000; // Add range for variation
    return { min, max };
  }, [selectedOptions]);

  // Current amenity preferences for preview
  const currentAmenityPreferences = useMemo(() => ({
    pool: selectedOptions.has("pool_private") 
      ? "private" 
      : selectedOptions.has("pool_shared") 
        ? "shared" 
        : "none",
    sea_distance: selectedOptions.has("sea_walk") ? "walking" : "driving",
  }), [selectedOptions]);

  const handleToggle = (optionId: string) => {
    const option = BUDGET_BUILDER_OPTIONS.find((o) => o.id === optionId);
    if (!option) return;

    const newSelected = new Set(selectedOptions);

    if (newSelected.has(optionId)) {
      // Don't allow deselecting if it's the only option in its category
      const categoryOptions = optionsByCategory[option.category];
      const selectedInCategory = categoryOptions.filter((o) => newSelected.has(o.id));
      if (selectedInCategory.length <= 1) return;
      
      newSelected.delete(optionId);
    } else {
      // Handle exclusive options
      if (option.exclusive) {
        for (const excludeId of option.exclusive) {
          newSelected.delete(excludeId);
        }
      }
      newSelected.add(optionId);
    }

    setSelectedOptions(newSelected);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleConfirm = () => {
    setIsComplete(true);
    
    // Extract preferences from selections
    const result: BudgetBuilderResult = {
      budget_min: priceRange.min,
      budget_max: priceRange.max,
      bedrooms_min: selectedOptions.has("bed_3") ? 3 : 2,
      pool: selectedOptions.has("pool_private") ? "private" : selectedOptions.has("pool_shared") ? "shared" : "none",
      sea_distance: selectedOptions.has("sea_walk") ? "walking" : "driving",
    };
    
    onComplete(result);
  };

  if (isComplete) {
    return (
      <div className="space-y-4 text-center py-4">
        <GameCompleteBadge label="Budget bepaald!" />
        
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-foreground">
            {formatPrice(priceRange.min)} - {formatPrice(priceRange.max)}
          </h3>
          <p className="text-muted-foreground text-sm">
            We zoeken projecten die binnen dit budget passen.
          </p>
        </div>

        {/* Show matching projects */}
        <div className="pt-4 border-t">
          <GameProjectPreview
            amenityPreferences={currentAmenityPreferences}
            budgetMin={priceRange.min}
            budgetMax={priceRange.max}
            title="✨ Projecten binnen jouw budget"
            maxProjects={3}
          />
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
    <div className="space-y-6 py-2">
      {/* Options by category */}
      {Object.entries(optionsByCategory).map(([category, options]) => (
        <div key={category} className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">
            {categoryLabels[category]}
          </h4>
          <div className="space-y-2">
            {options.map((option) => {
              const isSelected = selectedOptions.has(option.id);
              const priceText = option.basePrice
                ? `Basis: ${formatPrice(option.basePrice)}`
                : option.priceImpact > 0
                ? `+ ${formatPrice(option.priceImpact)}`
                : "Inbegrepen";

              return (
                <div
                  key={option.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg transition-all",
                    "border cursor-pointer",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                  onClick={() => handleToggle(option.id)}
                >
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={isSelected}
                      onCheckedChange={() => handleToggle(option.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Label className="cursor-pointer">{option.label}</Label>
                  </div>
                  <span
                    className={cn(
                      "text-sm",
                      option.priceImpact > 0
                        ? "text-amber-600 font-medium"
                        : "text-muted-foreground"
                    )}
                  >
                    {priceText}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Price summary */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Euro className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">Geschatte investering</span>
          </div>
          <span className="text-lg font-bold text-foreground">
            {formatPrice(priceRange.min)} - {formatPrice(priceRange.max)}
          </span>
        </div>
      </div>

      {/* Live project preview */}
      <div className="pt-2 border-t">
        <GameProjectPreview
          amenityPreferences={currentAmenityPreferences}
          budgetMin={priceRange.min}
          budgetMax={priceRange.max}
          title="🎯 Projecten die nu al passen"
          maxProjects={3}
        />
      </div>

      {/* Confirm button */}
      <Button onClick={handleConfirm} className="w-full" size="lg">
        <CheckCircle2 className="h-4 w-4 mr-2" />
        Dit past bij mij
      </Button>
    </div>
  );
}
