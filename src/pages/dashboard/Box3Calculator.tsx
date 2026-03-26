import { DashboardBox3Calculator } from "@/components/DashboardBox3Calculator";
import { DashboardBackToOntdekken } from "@/components/dashboard/DashboardBackToOntdekken";

export default function Box3Calculator() {
  return (
    <div className="space-y-6">
      <DashboardBackToOntdekken />
      
      <div>
        <h1 className="text-3xl font-bold">Box 3 Vermogensbelasting Calculator</h1>
        <p className="text-muted-foreground">
          Bereken je Nederlandse vermogensbelasting met Spaans vastgoed
        </p>
      </div>

      <DashboardBox3Calculator />
    </div>
  );
}
