import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { TrendingUp, Home, Calendar, Percent } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/utils";

interface ROICalculatorProps {
  initialPurchasePrice?: number;
  initialMonthlyRent?: number;
  className?: string;
}

export const ROICalculator = ({
  initialPurchasePrice = 250000,
  initialMonthlyRent = 1500,
  className = "",
}: ROICalculatorProps) => {
  const [purchasePrice, setPurchasePrice] = useState(initialPurchasePrice);
  const [monthlyRent, setMonthlyRent] = useState(initialMonthlyRent);
  const [yearlyAppreciation, setYearlyAppreciation] = useState(4); // percentage
  const [purchaseCosts, setPurchaseCosts] = useState(12); // percentage
  const [yearlyExpenses, setYearlyExpenses] = useState(15); // percentage van huurinkomsten
  const [investmentYears, setInvestmentYears] = useState(10);

  // Berekeningen
  const totalPurchaseCost = purchasePrice * (1 + purchaseCosts / 100);
  const yearlyRentIncome = monthlyRent * 12;
  const yearlyNetRent = yearlyRentIncome * (1 - yearlyExpenses / 100);
  const totalNetRent = yearlyNetRent * investmentYears;
  const futureValue = purchasePrice * Math.pow(1 + yearlyAppreciation / 100, investmentYears);
  const valueAppreciation = futureValue - purchasePrice;
  const totalReturn = totalNetRent + valueAppreciation;
  const roi = ((totalReturn / totalPurchaseCost) * 100);
  const annualROI = roi / investmentYears;
  const rentalYield = (yearlyRentIncome / purchasePrice) * 100;

  // Data voor chart
  const chartData = Array.from({ length: investmentYears + 1 }, (_, i) => {
    const year = i;
    const cumulativeRent = yearlyNetRent * year;
    const propertyValue = purchasePrice * Math.pow(1 + yearlyAppreciation / 100, year);
    const totalValue = propertyValue + cumulativeRent - totalPurchaseCost;
    
    return {
      year,
      value: Math.round(totalValue),
    };
  });


  return (
    <div className={`space-y-6 ${className}`}>
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            ROI Calculator
          </CardTitle>
          <CardDescription>
            Bereken je verwachte rendement op basis van huurinkomsten en waardestijging
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Aankoopprijs */}
          <div className="space-y-2">
            <Label htmlFor="purchase-price">Aankoopprijs</Label>
            <div className="flex gap-4 items-center">
              <Input
                id="purchase-price"
                type="number"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(Number(e.target.value))}
                className="w-32"
              />
              <Slider
                value={[purchasePrice]}
                onValueChange={([value]) => setPurchasePrice(value)}
                min={100000}
                max={1000000}
                step={10000}
                className="flex-1"
              />
            </div>
          </div>

          {/* Maandelijkse huur */}
          <div className="space-y-2">
            <Label htmlFor="monthly-rent">Maandelijkse huurinkomsten</Label>
            <div className="flex gap-4 items-center">
              <Input
                id="monthly-rent"
                type="number"
                value={monthlyRent}
                onChange={(e) => setMonthlyRent(Number(e.target.value))}
                className="w-32"
              />
              <Slider
                value={[monthlyRent]}
                onValueChange={([value]) => setMonthlyRent(value)}
                min={500}
                max={5000}
                step={50}
                className="flex-1"
              />
            </div>
          </div>

          {/* Waardestijging per jaar */}
          <div className="space-y-2">
            <Label htmlFor="appreciation">Verwachte waardestijging per jaar (%)</Label>
            <div className="flex gap-4 items-center">
              <Input
                id="appreciation"
                type="number"
                value={yearlyAppreciation}
                onChange={(e) => setYearlyAppreciation(Number(e.target.value))}
                className="w-32"
              />
              <Slider
                value={[yearlyAppreciation]}
                onValueChange={([value]) => setYearlyAppreciation(value)}
                min={0}
                max={10}
                step={0.5}
                className="flex-1"
              />
            </div>
          </div>

          {/* Aankoopkosten */}
          <div className="space-y-2">
            <Label htmlFor="purchase-costs">Aankoopkosten (%)</Label>
            <div className="flex gap-4 items-center">
              <Input
                id="purchase-costs"
                type="number"
                value={purchaseCosts}
                onChange={(e) => setPurchaseCosts(Number(e.target.value))}
                className="w-32"
              />
              <Slider
                value={[purchaseCosts]}
                onValueChange={([value]) => setPurchaseCosts(value)}
                min={8}
                max={15}
                step={0.5}
                className="flex-1"
              />
            </div>
          </div>

          {/* Jaarlijkse kosten */}
          <div className="space-y-2">
            <Label htmlFor="yearly-expenses">Jaarlijkse kosten (% van huurinkomsten)</Label>
            <div className="flex gap-4 items-center">
              <Input
                id="yearly-expenses"
                type="number"
                value={yearlyExpenses}
                onChange={(e) => setYearlyExpenses(Number(e.target.value))}
                className="w-32"
              />
              <Slider
                value={[yearlyExpenses]}
                onValueChange={([value]) => setYearlyExpenses(value)}
                min={10}
                max={40}
                step={1}
                className="flex-1"
              />
            </div>
          </div>

          {/* Beleggingshorizon */}
          <div className="space-y-2">
            <Label htmlFor="investment-years">Beleggingshorizon (jaren)</Label>
            <div className="flex gap-4 items-center">
              <Input
                id="investment-years"
                type="number"
                value={investmentYears}
                onChange={(e) => setInvestmentYears(Number(e.target.value))}
                className="w-32"
              />
              <Slider
                value={[investmentYears]}
                onValueChange={([value]) => setInvestmentYears(value)}
                min={5}
                max={30}
                step={1}
                className="flex-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="text-2xl">Verwacht Rendement</CardTitle>
          <CardDescription>Projectie voor de komende {investmentYears} jaar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1 p-4 rounded-lg bg-background border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Percent className="h-4 w-4" />
                Totaal Rendement (ROI)
              </div>
              <div className="text-3xl font-bold text-primary">
                {roi.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">
                {formatCurrency(totalReturn)} winst
              </div>
            </div>

            <div className="space-y-1 p-4 rounded-lg bg-background border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Jaarlijks Gemiddeld
              </div>
              <div className="text-3xl font-bold text-primary">
                {annualROI.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">
                {formatCurrency(totalReturn / investmentYears)} per jaar
              </div>
            </div>

            <div className="space-y-1 p-4 rounded-lg bg-background border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Home className="h-4 w-4" />
                Bruto Huurrendement
              </div>
              <div className="text-3xl font-bold text-primary">
                {rentalYield.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">
                {formatCurrency(yearlyRentIncome)} per jaar
              </div>
            </div>

            <div className="space-y-1 p-4 rounded-lg bg-background border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                Waardestijging
              </div>
              <div className="text-3xl font-bold text-primary">
                {formatCurrency(valueAppreciation)}
              </div>
              <div className="text-sm text-muted-foreground">
                {yearlyAppreciation}% per jaar
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="space-y-2">
            <h3 className="font-semibold">Vermogensgroei over tijd</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="year" 
                  stroke="hsl(var(--muted-foreground))"
                  label={{ value: 'Jaren', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Netto Vermogen']}
                  labelFormatter={(label) => `Jaar ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#colorValue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Breakdown */}
          <div className="space-y-3 p-4 rounded-lg bg-background border">
            <h3 className="font-semibold">Gedetailleerde Breakdown</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Totale investering:</span>
                <span className="font-medium">{formatCurrency(totalPurchaseCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Aankoopprijs:</span>
                <span>{formatCurrency(purchasePrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Aankoopkosten ({purchaseCosts}%):</span>
                <span>{formatCurrency(totalPurchaseCost - purchasePrice)}</span>
              </div>
              <div className="h-px bg-border my-2" />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Totale netto huurinkomsten:</span>
                <span className="font-medium text-primary">{formatCurrency(totalNetRent)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Waardestijging onroerend goed:</span>
                <span className="font-medium text-primary">{formatCurrency(valueAppreciation)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Toekomstige waarde woning:</span>
                <span>{formatCurrency(futureValue)}</span>
              </div>
              <div className="h-px bg-border my-2" />
              <div className="flex justify-between text-base">
                <span className="font-semibold">Totaal rendement:</span>
                <span className="font-bold text-primary">{formatCurrency(totalReturn)}</span>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="text-xs text-muted-foreground p-4 bg-muted/30 rounded-lg">
            <strong>Let op:</strong> Deze berekening is een schatting gebaseerd op de ingevulde gegevens. 
            Werkelijke resultaten kunnen afwijken door marktomstandigheden, wisselende huurprijzen, 
            onvoorziene kosten en andere factoren. Belastingen en financieringskosten zijn niet meegenomen 
            in deze berekening. Raadpleeg altijd een financieel adviseur voor persoonlijk advies.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
