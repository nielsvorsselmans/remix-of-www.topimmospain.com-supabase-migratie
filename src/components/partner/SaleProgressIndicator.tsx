import { CheckCircle2, Clock, FileText, Settings, CheckSquare, Key, XCircle, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

const STAGES = [
  { key: "geblokkeerd", label: "Geblokkeerd", icon: Lock },
  { key: "reservatie", label: "Reservatie", icon: Clock },
  { key: "koopcontract", label: "Koopcontract", icon: FileText },
  { key: "voorbereiding", label: "Voorbereiding", icon: Settings },
  { key: "akkoord", label: "Akkoord", icon: CheckSquare },
  { key: "overdracht", label: "Overdracht", icon: Key },
  { key: "afgerond", label: "Afgerond", icon: CheckCircle2 },
];

interface SaleProgressIndicatorProps {
  currentStatus: string;
}

export function SaleProgressIndicator({ currentStatus }: SaleProgressIndicatorProps) {
  // Handle cancelled status separately
  if (currentStatus === "geannuleerd") {
    return (
      <div className="flex items-center justify-center gap-2 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
        <XCircle className="h-5 w-5 text-destructive" />
        <span className="font-medium text-destructive">Geannuleerd</span>
      </div>
    );
  }

  const currentIndex = STAGES.findIndex(s => s.key === currentStatus);

  return (
    <div className="w-full">
      {/* Desktop view */}
      <div className="hidden md:flex items-center justify-between relative">
        {/* Progress line background */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted" />
        
        {/* Active progress line */}
        <div 
          className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-300"
          style={{ 
            width: currentIndex >= 0 
              ? `${(currentIndex / (STAGES.length - 1)) * 100}%` 
              : '0%' 
          }}
        />

        {STAGES.map((stage, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const Icon = stage.icon;

          return (
            <div 
              key={stage.key}
              className="flex flex-col items-center relative z-10"
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                  isCompleted && "bg-primary text-primary-foreground",
                  isCurrent && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                  !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <span 
                className={cn(
                  "text-xs mt-2 font-medium text-center",
                  (isCompleted || isCurrent) ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Mobile view - compact */}
      <div className="md:hidden">
        <div className="flex items-center gap-2 mb-2">
          {STAGES.map((stage, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;

            return (
              <div 
                key={stage.key}
                className={cn(
                  "flex-1 h-2 rounded-full transition-all",
                  isCompleted && "bg-primary",
                  isCurrent && "bg-primary",
                  !isCompleted && !isCurrent && "bg-muted"
                )}
              />
            );
          })}
        </div>
        <p className="text-sm text-center">
          <span className="text-muted-foreground">Stap {currentIndex + 1} van {STAGES.length}:</span>{" "}
          <span className="font-medium">{STAGES[currentIndex]?.label || "Onbekend"}</span>
        </p>
      </div>
    </div>
  );
}
