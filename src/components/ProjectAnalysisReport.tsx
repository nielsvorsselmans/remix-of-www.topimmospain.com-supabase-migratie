import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Home, Euro, Calculator, PiggyBank, Calendar, MapPin, Building } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";

interface ProjectAnalysisReportProps {
  project: {
    name: string;
    display_title?: string | null;
    city?: string | null;
    region?: string | null;
    price_from?: number | null;
    featured_image?: string | null;
  };
  purchasePrice: number;
  investmentYears?: number;
}

// Cost percentages (based on Spanish property purchase)
const COSTS = {
  btw: 0.10, // 10% IVA for new builds
  notaris: 0.01, // ~1% notary costs
  registro: 0.005, // 0.5% registry
  advocaat: 0.01, // 1% lawyer
  zegelrecht: 0.015, // 1.5% stamp duty (AJD)
};

// Investment assumptions
const ASSUMPTIONS = {
  rentalYieldGross: 0.055, // 5.5% gross rental yield
  managementFee: 0.15, // 15% of rental for management
  maintenanceReserve: 0.01, // 1% of property value per year
  insuranceYearly: 300, // Approx €300/year
  ibiTax: 0.004, // 0.4% of cadastral value (estimate)
  communityFees: 1200, // €100/month average
  appreciationRate: 0.04, // 4% annual appreciation
};

export const ProjectAnalysisReport = ({
  project,
  purchasePrice,
  investmentYears = 10,
}: ProjectAnalysisReportProps) => {
  const projectName = project.display_title || project.name;

  // Calculate purchase costs
  const purchaseCosts = {
    btw: purchasePrice * COSTS.btw,
    notaris: purchasePrice * COSTS.notaris,
    registro: purchasePrice * COSTS.registro,
    advocaat: purchasePrice * COSTS.advocaat,
    zegelrecht: purchasePrice * COSTS.zegelrecht,
  };
  const totalPurchaseCosts = Object.values(purchaseCosts).reduce((a, b) => a + b, 0);
  const totalInvestment = purchasePrice + totalPurchaseCosts;
  const purchaseCostsPercent = ((totalPurchaseCosts / purchasePrice) * 100).toFixed(1);

  // Calculate rental income
  const grossRentalIncome = purchasePrice * ASSUMPTIONS.rentalYieldGross;
  const managementCosts = grossRentalIncome * ASSUMPTIONS.managementFee;
  const maintenanceCosts = purchasePrice * ASSUMPTIONS.maintenanceReserve;
  const yearlyOperatingCosts = managementCosts + maintenanceCosts + ASSUMPTIONS.insuranceYearly + 
    (purchasePrice * ASSUMPTIONS.ibiTax) + ASSUMPTIONS.communityFees;
  const netRentalIncome = grossRentalIncome - yearlyOperatingCosts;
  const netRentalYield = ((netRentalIncome / totalInvestment) * 100).toFixed(2);

  // Calculate appreciation and total return
  const generateChartData = () => {
    const data = [];
    let cumulativeRental = 0;
    let propertyValue = purchasePrice;
    
    for (let year = 0; year <= investmentYears; year++) {
      if (year > 0) {
        cumulativeRental += netRentalIncome;
        propertyValue *= (1 + ASSUMPTIONS.appreciationRate);
      }
      
      const appreciation = propertyValue - purchasePrice;
      const totalValue = propertyValue + cumulativeRental;
      const totalReturn = totalValue - totalInvestment;
      
      data.push({
        year,
        propertyValue: Math.round(propertyValue),
        cumulativeRental: Math.round(cumulativeRental),
        totalValue: Math.round(totalValue),
        totalReturn: Math.round(totalReturn),
        appreciation: Math.round(appreciation),
      });
    }
    
    return data;
  };

  const chartData = generateChartData();
  const finalData = chartData[chartData.length - 1];
  const totalROI = ((finalData.totalReturn / totalInvestment) * 100).toFixed(1);
  const annualROI = (parseFloat(totalROI) / investmentYears).toFixed(1);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        {project.featured_image && (
          <img
            src={project.featured_image}
            alt={projectName}
            className="w-24 h-24 rounded-lg object-cover"
          />
        )}
        <div>
          <h2 className="text-2xl font-bold">{projectName}</h2>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{project.city}, {project.region || "Spanje"}</span>
          </div>
          <Badge className="mt-2">Investerings Analyse</Badge>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Home className="h-4 w-4" />
              <span className="text-sm">Aankoopprijs</span>
            </div>
            <p className="text-xl font-bold">{formatCurrency(purchasePrice)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Calculator className="h-4 w-4" />
              <span className="text-sm">Totale Investering</span>
            </div>
            <p className="text-xl font-bold">{formatCurrency(totalInvestment)}</p>
            <p className="text-xs text-muted-foreground">+{purchaseCostsPercent}% kosten</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <PiggyBank className="h-4 w-4" />
              <span className="text-sm">Netto Huurrendement</span>
            </div>
            <p className="text-xl font-bold text-primary">{netRentalYield}%</p>
            <p className="text-xs text-muted-foreground">{formatCurrency(netRentalIncome)}/jaar</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">Totaal Rendement ({investmentYears}j)</span>
            </div>
            <p className="text-xl font-bold text-green-600">{totalROI}%</p>
            <p className="text-xs text-muted-foreground">~{annualROI}% per jaar</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Waardeontwikkeling over {investmentYears} jaar</CardTitle>
          <CardDescription>
            Inclusief cumulatieve huurinkomsten en waardestijging
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="year" 
                  tickFormatter={(year) => `Jaar ${year}`}
                  className="text-xs"
                />
                <YAxis 
                  tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                  className="text-xs"
                />
                <Tooltip 
                  formatter={(value: number, name: string) => {
                    const labels: Record<string, string> = {
                      propertyValue: "Woningwaarde",
                      cumulativeRental: "Cumulatieve huur",
                      totalValue: "Totale waarde",
                    };
                    return [formatCurrency(value), labels[name] || name];
                  }}
                  labelFormatter={(year) => `Jaar ${year}`}
                />
                <Area 
                  type="monotone" 
                  dataKey="propertyValue" 
                  stackId="1"
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary) / 0.3)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="cumulativeRental" 
                  stackId="1"
                  stroke="hsl(142 76% 36%)" 
                  fill="hsl(142 76% 36% / 0.3)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Cost Breakdown */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Euro className="h-5 w-5" />
              Aankoopkosten
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">BTW (10%)</span>
              <span className="font-medium">{formatCurrency(purchaseCosts.btw)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Notariskosten</span>
              <span className="font-medium">{formatCurrency(purchaseCosts.notaris)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Kadaster</span>
              <span className="font-medium">{formatCurrency(purchaseCosts.registro)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Advocaat</span>
              <span className="font-medium">{formatCurrency(purchaseCosts.advocaat)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Zegelrecht (AJD)</span>
              <span className="font-medium">{formatCurrency(purchaseCosts.zegelrecht)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold">
              <span>Totaal aankoopkosten</span>
              <span className="text-primary">{formatCurrency(totalPurchaseCosts)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Jaarlijkse Kosten
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Verhuurbeheer (15%)</span>
              <span className="font-medium">{formatCurrency(managementCosts)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Onderhoud reserve</span>
              <span className="font-medium">{formatCurrency(maintenanceCosts)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Verzekeringen</span>
              <span className="font-medium">{formatCurrency(ASSUMPTIONS.insuranceYearly)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">IBI (onroerendgoedbelasting)</span>
              <span className="font-medium">{formatCurrency(purchasePrice * ASSUMPTIONS.ibiTax)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gemeenschapskosten (VvE)</span>
              <span className="font-medium">{formatCurrency(ASSUMPTIONS.communityFees)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold">
              <span>Totaal jaarlijkse kosten</span>
              <span className="text-destructive">{formatCurrency(yearlyOperatingCosts)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold">Samenvatting na {investmentYears} jaar</h3>
            <p className="text-muted-foreground">
              Op basis van een investering van {formatCurrency(totalInvestment)} in {projectName}
            </p>
            <div className="flex justify-center gap-8 mt-4">
              <div>
                <p className="text-sm text-muted-foreground">Geschatte eindwaarde</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(finalData.totalValue)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Totaal rendement</p>
                <p className="text-2xl font-bold text-green-600">+{formatCurrency(finalData.totalReturn)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <p className="text-xs text-muted-foreground text-center">
        * Deze berekening is indicatief en gebaseerd op aannames. Werkelijke resultaten kunnen afwijken. 
        Neem contact op voor een persoonlijke analyse.
      </p>
    </div>
  );
};
