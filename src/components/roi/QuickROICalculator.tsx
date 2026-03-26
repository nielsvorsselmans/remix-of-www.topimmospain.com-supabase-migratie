import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ChevronRight,
  Calculator,
  MessageCircle,
  Loader2,
  ExternalLink
} from "lucide-react";
import { ROIProjectSelector } from "./ROIProjectSelector";
import { ROIPresetSelector, PRESETS, ROIPreset } from "./ROIPresetSelector";
import { ROISocialProof } from "./ROISocialProof";
import { ROIEnhancedKPIs } from "./ROIEnhancedKPIs";
import { ROIRiskIndicator } from "./ROIRiskIndicator";
import { useProjectsWithRentalData, ProjectWithRental } from "@/hooks/useProjectsWithRentalData";
import { toast } from "sonner";

interface QuickROICalculatorProps {
  selectedProject: ProjectWithRental | null;
  onSelectProject: (project: ProjectWithRental | null) => void;
  manualPrice: number;
  onManualPriceChange: (price: number) => void;
  selectedPreset: string;
  presetValues: ROIPreset;
  onSelectPreset: (preset: ROIPreset) => void;
  onSwitchToAdvanced?: () => void;
}

interface QuickROIResults {
  totalInvestment: number;
  grossRental: number;
  netRental: number;
  netRentalYield: number;
  futureValue: number;
  totalProfit: number;
  totalROI: number;
  annualROI: number;
  annualCashflow: number;
}

export function QuickROICalculator({ 
  selectedProject,
  onSelectProject,
  manualPrice,
  onManualPriceChange,
  selectedPreset,
  presetValues,
  onSelectPreset,
  onSwitchToAdvanced 
}: QuickROICalculatorProps) {
  const { data, isLoading } = useProjectsWithRentalData();
  const [isDownloading, setIsDownloading] = useState(false);

  // Calculate ROI results
  const results = useMemo((): QuickROIResults => {
    const purchasePrice = selectedProject?.price_from || manualPrice;
    const rentalData = selectedProject?.rentalData;
    
    // Use rental data if available, otherwise use preset occupancy
    const occupancy = rentalData?.occupancy || presetValues.occupancyRate;
    const adr = rentalData?.average_daily_rate || 100;
    
    const { yearlyAppreciation, managementFee } = presetValues;
    const horizon = 10; // Fixed 10-year horizon for quick mode

    // Simplified calculations
    const totalInvestment = purchasePrice * 1.12; // ~12% additional costs
    const grossRental = (occupancy / 100) * 365 * adr;
    const netRental = grossRental * (1 - managementFee / 100) * 0.85; // After management + other costs
    const netRentalYield = (netRental / totalInvestment) * 100;

    const futureValue = purchasePrice * Math.pow(1 + yearlyAppreciation / 100, horizon);
    const cumulativeRental = netRental * horizon;
    const totalProfit = (futureValue - purchasePrice) + cumulativeRental;
    const totalROI = (totalProfit / totalInvestment) * 100;
    const annualROI = totalROI / horizon;

    // Calculate annual cashflow (assuming no mortgage in quick mode)
    const annualCosts = purchasePrice * 0.015; // ~1.5% annual costs
    const annualCashflow = netRental - annualCosts;

    return {
      totalInvestment,
      grossRental,
      netRental,
      netRentalYield,
      futureValue,
      totalProfit,
      totalROI,
      annualROI,
      annualCashflow,
    };
  }, [selectedProject, manualPrice, presetValues]);

  const myProjects = data?.myProjects || [];
  const scenarioLabel = selectedPreset ? PRESETS[selectedPreset as keyof typeof PRESETS]?.label : undefined;

  const handleDownloadPDF = () => {
    setIsDownloading(true);
    
    // Generate a simple print-friendly window with the ROI analysis
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>ROI Analyse - ${selectedProject?.name || 'Vastgoedinvestering'}</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          h1 { color: #1a365d; margin-bottom: 8px; }
          .subtitle { color: #666; margin-bottom: 32px; }
          .kpi-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px; }
          .kpi-card { background: #f8fafc; padding: 16px; border-radius: 8px; }
          .kpi-label { font-size: 12px; color: #666; text-transform: uppercase; }
          .kpi-value { font-size: 24px; font-weight: bold; color: #1a365d; }
          .kpi-value.highlight { color: #059669; }
          .section { margin-top: 24px; padding-top: 24px; border-top: 1px solid #e2e8f0; }
          .summary-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
          .footer { margin-top: 32px; font-size: 12px; color: #666; text-align: center; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <h1>ROI Analyse</h1>
        <p class="subtitle">
          ${selectedProject?.name || `Investering van €${results.totalInvestment.toLocaleString('nl-NL')}`}
          ${scenarioLabel ? ` · ${scenarioLabel} scenario` : ''}
        </p>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Jaarlijks Rendement</div>
            <div class="kpi-value highlight">${results.annualROI.toFixed(1)}%</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Netto Huurrendement</div>
            <div class="kpi-value">${results.netRentalYield.toFixed(1)}%</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Jaarlijkse Cashflow</div>
            <div class="kpi-value">€${results.annualCashflow.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Totale Winst (10 jaar)</div>
            <div class="kpi-value highlight">€${results.totalProfit.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}</div>
          </div>
        </div>

        <div class="section">
          <h3>Overzicht</h3>
          <div class="summary-row">
            <span>Totale investering</span>
            <strong>€${results.totalInvestment.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}</strong>
          </div>
          <div class="summary-row">
            <span>Verwachte waarde na 10 jaar</span>
            <strong>€${results.futureValue.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}</strong>
          </div>
          <div class="summary-row">
            <span>Bruto huurinkomsten per jaar</span>
            <strong>€${results.grossRental.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}</strong>
          </div>
        </div>

        <div class="section">
          <h3>Aannames</h3>
          <div class="summary-row">
            <span>Jaarlijkse waardestijging</span>
            <span>${presetValues.yearlyAppreciation}%</span>
          </div>
          <div class="summary-row">
            <span>Bezettingsgraad</span>
            <span>${presetValues.occupancyRate}%</span>
          </div>
          <div class="summary-row">
            <span>Huurgroei per jaar</span>
            <span>${presetValues.rentalGrowthRate}%</span>
          </div>
          <div class="summary-row">
            <span>Beheerkosten</span>
            <span>${presetValues.managementFee}%</span>
          </div>
        </div>

        <div class="footer">
          <p>Deze berekening is een indicatie gebaseerd op aannames. Werkelijke resultaten kunnen afwijken.</p>
          <p>Gegenereerd op ${new Date().toLocaleDateString('nl-NL')} · Viva Vastgoed</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      
      // Small delay to ensure content is rendered before print dialog
      setTimeout(() => {
        printWindow.print();
        setIsDownloading(false);
      }, 250);
    } else {
      toast.error("Kon print venster niet openen", {
        description: "Controleer of pop-ups zijn toegestaan"
      });
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Project Selector (now includes Hero Card when project selected) */}
      <ROIProjectSelector
        myProjects={myProjects}
        selectedProject={selectedProject}
        manualPrice={manualPrice}
        onSelectProject={onSelectProject}
        onManualPriceChange={onManualPriceChange}
        isLoading={isLoading}
      />

      {/* Preset Selector */}
      <ROIPresetSelector
        onSelectPreset={onSelectPreset}
        selectedPreset={selectedPreset}
      />

      {/* Enhanced KPIs Results */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <ROIEnhancedKPIs
            annualROI={results.annualROI}
            netRentalYield={results.netRentalYield}
            annualCashflow={results.annualCashflow}
            totalProfit={results.totalProfit}
            totalInvestment={results.totalInvestment}
            futureValue={results.futureValue}
            grossRental={results.grossRental}
            projectName={selectedProject?.name}
            scenarioLabel={scenarioLabel}
            onDownloadPDF={handleDownloadPDF}
            isDownloading={isDownloading}
          />

          {/* Risk Indicator */}
          <ROIRiskIndicator
            yearlyAppreciation={presetValues.yearlyAppreciation}
            occupancyRate={presetValues.occupancyRate}
            rentalGrowthRate={presetValues.rentalGrowthRate}
          />

          {/* Switch to Advanced */}
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={onSwitchToAdvanced}
          >
            <span className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Bekijk gedetailleerde analyse
            </span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </>
      )}

      {/* CTA */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <MessageCircle className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium mb-1">Wil je deze berekening bespreken?</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Onze adviseurs helpen je graag met het interpreteren van deze cijfers.
              </p>
              <Button asChild size="sm">
                <a 
                  href="https://api.leadconnectorhq.com/widget/bookings/viva-kennismakingsgesprek" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2"
                >
                  Plan een gesprek
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <p className="text-xs text-muted-foreground text-center px-4">
        Deze berekening is een indicatie gebaseerd op standaard aannames. 
        Werkelijke resultaten kunnen afwijken. Bekijk de{" "}
        <button 
          onClick={onSwitchToAdvanced} 
          className="underline hover:text-foreground"
        >
          gedetailleerde analyse
        </button>
        {" "}voor meer opties.
      </p>
    </div>
  );
}
