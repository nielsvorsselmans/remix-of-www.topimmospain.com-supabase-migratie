import { Link } from "react-router-dom";
import { Calculator, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectBudgetCTAProps {
  aankoopsom: number;
  provincie?: string;
  className?: string;
}

export function ProjectBudgetCTA({ aankoopsom, provincie, className }: ProjectBudgetCTAProps) {
  if (!aankoopsom || aankoopsom <= 0) return null;

  const params = new URLSearchParams();
  params.set("aankoopsom", String(aankoopsom));
  if (provincie) params.set("provincie", provincie);

  const formatted = new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(aankoopsom);

  return (
    <Link
      to={`/dashboard/calculators/hypotheek?${params.toString()}`}
      className={cn(
        "block rounded-xl border border-primary/15 p-5 group",
        "bg-gradient-to-r from-primary/5 to-transparent",
        "hover:border-primary/25 hover:shadow-sm transition-all",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
          <Calculator className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
            Past dit project in je budget?
          </p>
          <p className="text-xs text-muted-foreground">
            Bereken je hypotheek voor {formatted}
          </p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
      </div>
    </Link>
  );
}
