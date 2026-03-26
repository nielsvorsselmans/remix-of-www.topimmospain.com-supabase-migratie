import { DashboardLeningCalculator } from "@/components/DashboardLeningCalculator";
import { DashboardBackToOntdekken } from "@/components/dashboard/DashboardBackToOntdekken";

export default function LeningCalculator() {
  return (
    <div className="space-y-6">
      <DashboardBackToOntdekken />
      
      <div>
        <h1 className="text-3xl font-bold">Lening Calculator</h1>
        <p className="text-muted-foreground">
          Vergelijk financieringsopties in Spanje en je eigen land
        </p>
      </div>

      <DashboardLeningCalculator />
    </div>
  );
}
