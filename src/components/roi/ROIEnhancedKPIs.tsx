import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  Percent, 
  PiggyBank, 
  Wallet,
  Calculator,
  ArrowRight,
  Download
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { downloadFile } from "@/utils/downloadFile";

interface ROIEnhancedKPIsProps {
  annualROI: number;
  netRentalYield: number;
  annualCashflow: number;
  totalProfit: number;
  totalInvestment: number;
  futureValue: number;
  grossRental: number;
  projectName?: string;
  scenarioLabel?: string;
  onDownloadPDF?: () => void;
  isDownloading?: boolean;
}

const SAVINGS_RATE = 1.8; // Current average savings rate in NL/BE

export function ROIEnhancedKPIs({
  annualROI,
  netRentalYield,
  annualCashflow,
  totalProfit,
  totalInvestment,
  futureValue,
  grossRental,
  projectName,
  scenarioLabel,
  onDownloadPDF,
  isDownloading,
}: ROIEnhancedKPIsProps) {
  // Calculate progress percentages (capped at 100 for display)
  const roiProgress = Math.min((annualROI / 10) * 100, 100); // 10% as max
  const roiVsSavings = annualROI / SAVINGS_RATE;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          Resultaat over 10 jaar
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Op basis van {projectName || `€${totalInvestment.toLocaleString('nl-NL')}`}
          {scenarioLabel && ` · ${scenarioLabel} scenario`}
        </p>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* Hero KPI - Annual ROI with Progress Bar */}
        <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-4 border border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Jaarlijks Rendement
            </span>
          </div>
          
          <div className="flex items-end gap-3 mb-3">
            <span className="text-4xl font-bold text-primary">
              {annualROI.toFixed(1)}%
            </span>
            <div className="flex items-center gap-1 text-sm text-muted-foreground pb-1">
              <span>vs.</span>
              <span className="font-medium">{SAVINGS_RATE}%</span>
              <span>spaarrente</span>
            </div>
          </div>

          <Progress value={roiProgress} className="h-3 mb-2" />
          
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-green-600">{roiVsSavings.toFixed(1)}x</span> hoger dan een spaarrekening
          </p>
        </div>

        {/* Secondary KPIs Grid */}
        <div className="grid grid-cols-3 gap-3">
          <KPICard
            icon={<Percent className="h-4 w-4" />}
            label="Huurrendement"
            value={`${netRentalYield.toFixed(1)}%`}
            color="text-blue-600"
            bgColor="bg-blue-50"
          />
          <KPICard
            icon={<PiggyBank className="h-4 w-4" />}
            label="Cashflow/jaar"
            value={formatPrice(annualCashflow)}
            color="text-purple-600"
            bgColor="bg-purple-50"
            subValue={annualCashflow > 0 ? "positief" : "negatief"}
          />
          <KPICard
            icon={<Wallet className="h-4 w-4" />}
            label="Totale winst"
            value={formatPrice(totalProfit)}
            color="text-amber-600"
            bgColor="bg-amber-50"
            subValue="na 10 jaar"
          />
        </div>

        {/* Summary Table */}
        <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Totale investering:</span>
            <span className="font-medium">{formatPrice(totalInvestment)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground flex items-center gap-1">
              Verwachte waarde
              <ArrowRight className="h-3 w-3" />
            </span>
            <span className="font-medium text-green-600">{formatPrice(futureValue)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Bruto huurinkomsten/jaar:</span>
            <span className="font-medium">{formatPrice(grossRental)}</span>
          </div>
        </div>

        {/* Download PDF Button */}
        {onDownloadPDF && (
          <Button 
            onClick={onDownloadPDF} 
            disabled={isDownloading}
            className="w-full"
            variant="outline"
          >
            <Download className="h-4 w-4 mr-2" />
            {isDownloading ? "Bezig met genereren..." : "Download Analyse PDF"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

interface KPICardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  bgColor: string;
  subValue?: string;
}

function KPICard({ icon, label, value, color, bgColor, subValue }: KPICardProps) {
  return (
    <div className={`${bgColor} dark:bg-opacity-10 rounded-lg p-3 text-center`}>
      <div className={`flex justify-center mb-1.5 ${color}`}>
        {icon}
      </div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
      {subValue && (
        <div className="text-[10px] text-muted-foreground mt-0.5">{subValue}</div>
      )}
    </div>
  );
}
