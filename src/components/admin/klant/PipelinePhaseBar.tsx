import { JOURNEY_PHASES } from "@/hooks/useKlanten";
import type { Klant } from "@/hooks/useKlanten";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface PipelinePhaseBarProps {
  klanten: Klant[];
  activePhase: string;
  onPhaseClick: (phase: string) => void;
}

export function PipelinePhaseBar({ klanten, activePhase, onPhaseClick }: PipelinePhaseBarProps) {
  const phaseMetrics = useMemo(() => {
    const metrics: Record<string, number> = {};
    JOURNEY_PHASES.forEach(phase => {
      metrics[phase.key] = klanten.filter(k => k.journey_phase === phase.key && k.follow_up_status !== 'dropped_off').length;
    });
    return metrics;
  }, [klanten]);

  const total = Object.values(phaseMetrics).reduce((sum, v) => sum + v, 0);

  return (
    <div className="flex flex-wrap gap-1.5">
      {/* "Alle" chip */}
      <button
        onClick={() => onPhaseClick("all")}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border",
          activePhase === "all"
            ? "bg-primary text-primary-foreground border-primary shadow-sm"
            : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground"
        )}
      >
        Alle
        <span className={cn(
          "text-xs px-1.5 py-0.5 rounded-full",
          activePhase === "all" ? "bg-primary-foreground/20" : "bg-muted-foreground/20"
        )}>
          {total}
        </span>
      </button>

      {JOURNEY_PHASES.map(phase => {
        const count = phaseMetrics[phase.key] || 0;
        const isActive = activePhase === phase.key;

        return (
          <button
            key={phase.key}
            onClick={() => onPhaseClick(phase.key === activePhase ? "all" : phase.key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border",
              isActive
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground"
            )}
          >
            <span>{phase.icon}</span>
            <span className="hidden sm:inline">{phase.label}</span>
            <span className={cn(
              "text-xs px-1.5 py-0.5 rounded-full",
              isActive ? "bg-primary-foreground/20" : "bg-muted-foreground/20"
            )}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
