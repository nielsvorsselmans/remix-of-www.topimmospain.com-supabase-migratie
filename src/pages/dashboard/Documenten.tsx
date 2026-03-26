import { LockedPhaseContent } from "@/components/LockedPhaseContent";
import { CustomerDocumentsGrid } from "@/components/CustomerDocumentsGrid";
import { useCustomerSale } from "@/hooks/useCustomerSale";
import { Loader2, FileText, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Documenten() {
  const { data: sale, isLoading } = useCustomerSale();

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // No active sale - show locked content
  if (!sale) {
    return (
      <LockedPhaseContent
        phaseName="Aankoop"
        phaseNumber={3}
        title="Mijn Documenten"
        description="Deze sectie wordt beschikbaar wanneer je officiële documenten hebt voor jouw aankoop."
        comingSoonFeatures={[
          "Veilige opslag van je persoonlijke documenten",
          "Contracten en aankoopaktes",
          "NIE-nummer en fiscale documenten",
          "Overzicht van ingediende documenten"
        ]}
        ctaText="Plan een oriëntatiegesprek"
        ctaLink="/afspraak"
      />
    );
  }

  const documents = sale.documents || [];

  return (
      <div className="space-y-6">
        {/* Mobile back button */}
        <div className="md:hidden">
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
            <Link to="/dashboard/mijn-woning">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Terug naar Mijn Woning
            </Link>
          </Button>
        </div>

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Mijn Documenten</h1>
            <p className="text-muted-foreground mt-1">
              Alle documenten voor jouw aankoop op één plek
            </p>
          </div>
        </div>

        {/* Sale context */}
        {sale.project && (
          <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg px-4 py-3">
            <span className="font-medium text-foreground">{sale.project.name}</span>
            {sale.project.city && <span> · {sale.project.city}</span>}
          </div>
        )}

        {/* Documents grid */}
        <CustomerDocumentsGrid documents={documents} />
      </div>
  );
}
