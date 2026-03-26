import { Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Pillar, PillarConfig, PILLAR_CONFIG } from "@/constants/orientation";

interface PillarProgress {
  total: number;
  completed: number;
  percentage: number;
}

interface OrientationPillarNavProps {
  pillars: PillarConfig[];
  progressByPillar: Record<Pillar, PillarProgress>;
  recommendedPillar?: Pillar | null;
  onPillarClick: (pillarKey: Pillar) => void;
  activePillar?: Pillar;
}

export function OrientationPillarNav({
  pillars,
  progressByPillar,
  recommendedPillar,
  onPillarClick,
  activePillar,
}: OrientationPillarNavProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">Kies een thema</h2>
        <p className="text-sm text-muted-foreground hidden sm:block">Klik om direct naar een thema te gaan</p>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {pillars.map((pillar) => {
          const progress = progressByPillar[pillar.key] || { total: 0, completed: 0, percentage: 0 };
          const IconComponent = pillar.icon;
          const colors = pillar.colors;
          const isComplete = progress.percentage === 100;
          const isRecommended = recommendedPillar === pillar.key;
          const isActive = activePillar === pillar.key;

          return (
            <button
              key={pillar.key}
              onClick={() => onPillarClick(pillar.key)}
              className={cn(
                "relative flex flex-col items-center p-4 md:p-5 rounded-xl border-2 transition-all duration-200",
                colors.bg,
                colors.hover,
                colors.border,
                isActive && "ring-2 ring-primary ring-offset-2",
                "group cursor-pointer"
              )}
            >
              {/* Recommended badge */}
              {isRecommended && !isComplete && (
                <div className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-medium shadow-md">
                  <Sparkles className="h-3 w-3" />
                  <span className="hidden sm:inline">Aanbevolen</span>
                </div>
              )}

              {/* Icon */}
              <div className={cn(
                "p-3 rounded-xl mb-3 transition-transform group-hover:scale-110",
                colors.iconBg
              )}>
                {isComplete ? (
                  <Check className="h-6 w-6 text-primary" />
                ) : (
                  <IconComponent className={cn("h-6 w-6", colors.text)} />
                )}
              </div>

              {/* Title */}
              <p className="font-semibold text-foreground text-sm md:text-base mb-2 text-center">
                {pillar.title}
              </p>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-muted/50 rounded-full overflow-hidden mb-1">
                <div 
                  className={cn("h-full rounded-full transition-all duration-500", colors.progress)}
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>

              {/* Progress text */}
              <p className="text-xs text-muted-foreground">
                {isComplete ? (
                  <span className="text-primary font-medium">Voltooid ✓</span>
                ) : (
                  `${progress.completed}/${progress.total} artikelen`
                )}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
