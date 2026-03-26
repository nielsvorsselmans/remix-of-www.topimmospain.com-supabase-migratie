import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Calculator, ChevronRight, CheckCircle2 } from "lucide-react";
import { useCustomerHypotheekData } from "@/hooks/useCustomerHypotheekData";
import { cn } from "@/lib/utils";

export function BudgetCheckCard() {
  const { data: hypotheekData, isLoading } = useCustomerHypotheekData();
  const hasCompleted = !!(hypotheekData?.bruto_jaarinkomen && hypotheekData.bruto_jaarinkomen > 0);

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="h-16 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Link to="/dashboard/calculators/hypotheek">
      <Card className={cn(
        "group cursor-pointer border-primary/20 transition-all duration-200",
        "bg-gradient-to-br from-primary/5 via-accent/5 to-transparent",
        "hover:shadow-md hover:border-primary/30"
      )}>
        <CardContent className="p-5 md:p-6">
          <div className="flex items-center gap-4">
            {/* Icon */}
            <div className={cn(
              "p-3 rounded-xl shrink-0 transition-transform group-hover:scale-105",
              "bg-primary/10 text-primary"
            )}>
              <Calculator className="h-6 w-6" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="font-semibold text-base group-hover:text-primary transition-colors">
                  Wat kan ik lenen?
                </h3>
                {hasCompleted && (
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                )}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {hasCompleted
                  ? "Je hebt al een simulatie gedaan — bekijk of pas je resultaat aan"
                  : "Ontdek in 60 seconden je budget voor een woning in Spanje"
                }
              </p>
            </div>

            {/* Arrow */}
            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
