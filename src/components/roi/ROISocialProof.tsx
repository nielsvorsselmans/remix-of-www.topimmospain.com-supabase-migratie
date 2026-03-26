import { Calculator, Star, TrendingUp } from "lucide-react";

export function ROISocialProof() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 py-3 px-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
      <div className="flex items-center gap-1.5">
        <Calculator className="h-4 w-4 text-primary" />
        <span>650+ berekeningen</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
        <span>Gebaseerd op echte data</span>
      </div>
      <div className="flex items-center gap-1.5">
        <TrendingUp className="h-4 w-4 text-emerald-500" />
        <span>Spaanse belastinglogica</span>
      </div>
    </div>
  );
}
