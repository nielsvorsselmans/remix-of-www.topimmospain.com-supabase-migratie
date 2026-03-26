import { LockedPhaseContent } from "@/components/LockedPhaseContent";
import { HorizontalProgressStepper } from "@/components/HorizontalProgressStepper";
import { ActivePhaseCard } from "@/components/ActivePhaseCard";
import { useCustomerSale } from "@/hooks/useCustomerSale";
import { useActiveSale } from "@/contexts/ActiveSaleContext";
import { Loader2, MapPin, Home, Euro, Calendar, FileText, Download, ClipboardCheck, Camera } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Link, useSearchParams } from "react-router-dom";
import { useEffect } from "react";

const PHASE_ORDER = ['reservatie', 'koopcontract', 'voorbereiding', 'akkoord', 'overdracht'] as const;

const statusConfig: Record<string, { label: string; color: string }> = {
  reservation: { label: "Reservatie", color: "bg-amber-500" },
  contract_signed: { label: "Contract Getekend", color: "bg-blue-500" },
  financing: { label: "Financiering", color: "bg-purple-500" },
  notary_scheduled: { label: "Notaris Gepland", color: "bg-indigo-500" },
  completed: { label: "Afgerond", color: "bg-green-500" },
  cancelled: { label: "Geannuleerd", color: "bg-destructive" },
};

const documentTypeLabels: Record<string, string> = {
  contract: "Contract",
  financial: "Financieel",
  technical: "Technisch",
  legal: "Juridisch",
  other: "Overig",
};

export default function Aankoop() {
  const [searchParams] = useSearchParams();
  const saleIdFromUrl = searchParams.get('saleId');
  const { setActiveSaleId } = useActiveSale();
  
  // Sync URL saleId with context
  useEffect(() => {
    if (saleIdFromUrl) {
      setActiveSaleId(saleIdFromUrl);
    }
  }, [saleIdFromUrl, setActiveSaleId]);
  
  const { data: sale, isLoading } = useCustomerSale(saleIdFromUrl || undefined);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!sale) {
    return (
      <LockedPhaseContent
        phaseName="Aankoop"
        phaseNumber={3}
        title="Aankoopproces"
        description="Deze sectie wordt beschikbaar wanneer je begint met het aankoopproces van jouw woning."
        comingSoonFeatures={[
          "Stap-voor-stap begeleiding door het proces",
          "Belangrijke deadlines en actiepunten",
          "Contactgegevens van betrokken partijen",
          "Checklist voor de aankoop"
        ]}
        ctaText="Plan een oriëntatiegesprek"
        ctaLink="/afspraak"
      />
    );
  }

  const status = statusConfig[sale.status] || statusConfig.reservation;

  // Determine active phase index
  const activePhaseIndex = PHASE_ORDER.findIndex(phaseKey => {
    const progress = sale.phaseProgress[phaseKey];
    return !progress?.isComplete;
  });
  const effectiveActiveIndex = activePhaseIndex >= 0 ? activePhaseIndex : PHASE_ORDER.length - 1;
  const activePhaseKey = PHASE_ORDER[effectiveActiveIndex];

  // Get important dates for mini timeline
  const keyDates = [
    { label: 'Reservatie', date: sale.reservation_date },
    { label: 'Contract', date: sale.contract_date },
    { label: 'Oplevering', date: sale.expected_delivery_date },
  ].filter(d => d.date);

  // Group documents by type
  const documentsByType = sale.documents.reduce((acc, doc) => {
    const type = doc.document_type || 'other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(doc);
    return acc;
  }, {} as Record<string, typeof sale.documents>);

  return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Hero Section with integrated timeline */}
        <div className="relative rounded-xl overflow-hidden">
          {sale.project?.featured_image && (
            <div className="absolute inset-0">
              <img 
                src={sale.project.featured_image} 
                alt={sale.project?.name || 'Property'} 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />
            </div>
          )}
          <div className={`relative ${sale.project?.featured_image ? 'text-white' : ''} p-6 pb-4`}>
            <div className="flex items-center gap-3 mb-3">
              <Badge className={`${status.color} text-white`}>
                {status.label}
              </Badge>
            </div>
            
            <h1 className="text-2xl md:text-3xl font-bold mb-2">
              {sale.project?.name || 'Jouw Aankoop'}
            </h1>
            
            <div className="flex flex-wrap items-center gap-3 text-sm opacity-90 mb-4">
              {sale.project?.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {sale.project.city}
                </span>
              )}
              {sale.property?.property_type && (
                <span className="flex items-center gap-1">
                  <Home className="h-4 w-4" />
                  {sale.property.property_type}
                </span>
              )}
              {sale.sale_price && (
                <span className="flex items-center gap-1">
                  <Euro className="h-4 w-4" />
                  €{sale.sale_price.toLocaleString('nl-NL')}
                </span>
              )}
            </div>

            {/* Mini Timeline in Hero */}
            {keyDates.length > 0 && (
              <div className="flex items-center gap-4 pt-3 border-t border-white/20">
                {keyDates.map((item, idx) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 opacity-70" />
                    <div>
                      <p className="text-xs opacity-70">{item.label}</p>
                      <p className="text-sm font-medium">
                        {format(new Date(item.date!), 'd MMM yyyy', { locale: nl })}
                      </p>
                    </div>
                    {idx < keyDates.length - 1 && (
                      <div className="hidden sm:block w-8 h-px bg-white/30 ml-2" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Horizontal Progress Stepper */}
        <Card className="p-6">
          <HorizontalProgressStepper
            phaseProgress={sale.phaseProgress}
            activePhaseIndex={effectiveActiveIndex}
          />
        </Card>

        {/* Active Phase Card */}
        <ActivePhaseCard
          phaseKey={activePhaseKey}
          milestones={sale.milestonesByPhase[activePhaseKey] || []}
          progress={sale.phaseProgress[activePhaseKey] || { total: 0, completed: 0, isComplete: false }}
          saleId={sale.id}
          documents={sale.documents}
        />

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
            <Link to="/dashboard/documenten">
              <FileText className="h-5 w-5" />
              <span className="text-sm">Documenten</span>
            </Link>
          </Button>
          <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
            <Link to="/dashboard/betalingen">
              <Euro className="h-5 w-5" />
              <span className="text-sm">Betalingen</span>
            </Link>
          </Button>
          <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
            <Link to="/dashboard/specificaties">
              <ClipboardCheck className="h-5 w-5" />
              <span className="text-sm">Specificaties</span>
            </Link>
          </Button>
          <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
            <Link to="/dashboard/bouwupdates">
              <Camera className="h-5 w-5" />
              <span className="text-sm">Bouwupdates</span>
            </Link>
          </Button>
        </div>


        {/* Customer Notes from Admin */}
        {sale.customer_visible_notes && (
          <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">📝 Notitie van Top Immo Spain</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {sale.customer_visible_notes}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Contact CTA */}
        <Card className="bg-muted/30">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold">Vragen over je aankoop?</h3>
                <p className="text-sm text-muted-foreground">
                  We helpen je graag verder.
                </p>
              </div>
              <Button asChild>
                <a href="/contact">Contact opnemen</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
  );
}
