import { DashboardPurchaseCostsCalculator } from "@/components/DashboardPurchaseCostsCalculator";
import { DashboardBackToOntdekken } from "@/components/dashboard/DashboardBackToOntdekken";

export default function AankoopkostenCalculator() {
  return (
    <div className="space-y-6">
      <DashboardBackToOntdekken />
      
      <div>
        <h1 className="text-3xl font-bold">Aankoopkosten Calculator</h1>
        <p className="text-muted-foreground">
          Bereken alle kosten bij de aankoop van je woning in Spanje
        </p>
      </div>

      <DashboardPurchaseCostsCalculator />
    </div>
  );
}
