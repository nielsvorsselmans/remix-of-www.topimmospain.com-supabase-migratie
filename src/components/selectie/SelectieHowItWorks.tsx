import { ClipboardCheck, ThumbsUp, CalendarCheck } from "lucide-react";

interface SelectieHowItWorksProps {
  interestedCount: number;
  variant?: "horizontal" | "vertical";
}

export function SelectieHowItWorks({ interestedCount, variant = "horizontal" }: SelectieHowItWorksProps) {
  const steps = [
    {
      icon: ClipboardCheck,
      label: "Beoordeel",
      description: "Bekijk elk project",
      active: true,
    },
    {
      icon: ThumbsUp,
      label: "2-5 favorieten",
      description: "Kies je shortlist",
      active: interestedCount >= 1,
    },
    {
      icon: CalendarCheck,
      label: "Plan bezichtiging",
      description: "Wij regelen het",
      active: interestedCount >= 2,
    },
  ];

  if (variant === "vertical") {
    return (
      <div className="rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">
          Hoe werkt het?
        </h3>
        <div className="space-y-0">
          {steps.map((step, i) => (
            <div key={i} className="flex items-stretch">
              <div className="flex flex-col items-center mr-3">
                <div className={`h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                  step.active 
                    ? "bg-primary/15 text-primary" 
                    : "bg-muted text-muted-foreground"
                }`}>
                  <step.icon className="h-3.5 w-3.5" />
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-0.5 flex-1 min-h-[12px] ${
                    step.active ? "bg-primary/30" : "bg-border"
                  }`} />
                )}
              </div>
              <div className="flex-1 py-1 min-h-[36px]">
                <p className={`text-xs font-medium leading-tight ${
                  step.active ? "text-foreground" : "text-muted-foreground"
                }`}>
                  {step.label}
                </p>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3">
        Hoe werkt het?
      </h3>
      <div className="flex items-start justify-between gap-2">
        {steps.map((step, i) => (
          <div key={i} className="flex flex-1 flex-col items-center text-center gap-1.5 relative">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
              step.active 
                ? "bg-primary/15 text-primary" 
                : "bg-muted text-muted-foreground"
            }`}>
              <step.icon className="h-4 w-4" />
            </div>
            <p className={`text-[11px] font-medium leading-tight ${
              step.active ? "text-foreground" : "text-muted-foreground"
            }`}>
              {step.label}
            </p>
            <p className="text-[10px] text-muted-foreground leading-tight">
              {step.description}
            </p>
            {/* Connector line */}
            {i < steps.length - 1 && (
              <div className="absolute top-5 -right-1 w-2 h-px bg-border" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
