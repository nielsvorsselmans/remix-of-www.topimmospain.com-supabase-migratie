import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Calculator, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCustomerHypotheekData } from "@/hooks/useCustomerHypotheekData";
import { cn } from "@/lib/utils";

export function BudgetNudgeCard() {
  const { data: hypotheekData, isLoading } = useCustomerHypotheekData();
  const hasCompleted = !!(hypotheekData?.bruto_jaarinkomen && hypotheekData.bruto_jaarinkomen > 0);

  if (isLoading) return null;

  // Already completed → compact summary
  if (hasCompleted) {
    const inkomen = Number(hypotheekData.bruto_jaarinkomen);
    const formatted = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(inkomen);

    return (
      <Link to="/dashboard/calculators/hypotheek">
        <Card className="group cursor-pointer hover:shadow-sm hover:border-primary/20 transition-all">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Budget berekend</p>
              <p className="text-xs text-muted-foreground">Bruto inkomen: {formatted} — bekijk of pas je rapport aan</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
          </CardContent>
        </Card>
      </Link>
    );
  }

  // Not completed → nudge
  return (
    <Card className={cn(
      "border-primary/20",
      "bg-gradient-to-br from-primary/5 via-accent/5 to-transparent"
    )}>
      <CardContent className="p-5 md:p-6">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
            <Calculator className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="font-semibold text-base mb-1">Je eerste stap: ontdek je budget</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Bereken in 60 seconden hoeveel je kunt lenen voor een woning in Spanje — volledig vrijblijvend.
              </p>
            </div>
            <Button asChild size="sm" className="gap-1.5">
              <Link to="/dashboard/calculators/hypotheek">
                Budget berekenen
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
