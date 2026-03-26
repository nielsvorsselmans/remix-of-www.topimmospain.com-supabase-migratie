import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Info, MessageCircle, Sofa, Wind } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useCalculatorTracking } from "@/hooks/useTrackCalculator";

type PropertyType = "nieuwbouw" | "bestaand";
type Region = "murcia" | "valencia";

interface CostBreakdown {
  btwOrItp: number;
  ajd: number;
  advocaat: number;
  notaris: number;
  registratie: number;
  volmacht: number;
  nutsvoorzieningen: number;
  bankkosten: number;
  administratie: number;
  nie: number;
  // Mortgage costs
  taxatie: number;
  hypotheekNotaris: number;
  bankCommissie: number;
  // Optional extras
  meubelpakket: number;
  airco: number;
}

// Improved tooltips with value propositions
const COST_TOOLTIPS = {
  btwNieuwbouw: "BTW (Belasting over de Toegevoegde Waarde) is de omzetbelasting voor nieuwbouwwoningen in Spanje. Dit is een eenmalige kost bij aankoop.",
  itp: "ITP (Impuesto de Transmisiones Patrimoniales) is de overdrachtsbelasting voor bestaande woningen. Het tarief verschilt per regio.",
  ajd: "AJD (Actos Jurídicos Documentados) is de zegelbelasting van 1,5% voor nieuwbouwwoningen. Bij bestaande bouw betaal je geen zegelbelasting.",
  advocaat: "Je advocaat controleert schulden, lasten en illegale verbouwingen. Ze begeleiden je bij de notaris en beschermen jouw juridische positie. Dit is je belangrijkste investering in zekerheid.",
  notaris: "De notaris maakt de officiële koopakte op en zorgt voor een rechtsgeldige overdracht. Zonder notaris geen eigendomsoverdracht in Spanje.",
  registratie: "Hier wordt jouw eigendom officieel geregistreerd in het Spaanse kadaster. Dit is je bewijs van eigendom en beschermt je tegen fraude.",
  volmacht: "Als je niet zelf naar Spanje kunt voor de ondertekening, kan iemand namens jou tekenen. Handig bij nieuwbouw of bij drukte in je agenda.",
  nutsNieuwbouw: "Aansluitkosten voor elektriciteit, water en gas bij nieuwbouw. Dit omvat de eerste aansluiting op het net.",
  nutsBestaand: "Kosten voor overname nutsvoorzieningen bij bestaande bouw. Meestal gaat het om administratieve wijzigingen.",
  bankkosten: "Administratieve kosten voor het openen van een Spaanse bankrekening. Dit is verplicht voor de aankoop.",
  administratie: "Algemene administratiekosten voor de aankoop, zoals vertalingen en legalisaties.",
  nie: "Dit is je Spaanse belastingnummer, verplicht voor elke financiële transactie. Zonder NIE geen aankoop mogelijk.",
  taxatie: "Een erkende taxateur bepaalt de waarde van de woning voor de bank. Dit is verplicht bij een hypotheek.",
  hypotheekNotaris: "Extra notariskosten voor het opstellen van de hypotheekakte. Dit komt bovenop de kosten voor de koopakte.",
  bankCommissie: "De bank rekent een openingscommissie voor de hypotheek. Dit is meestal 1% van het leningbedrag.",
  meubelpakket: "Veel nieuwbouwprojecten bieden een meubelpakket aan. Dit kan verplicht of optioneel zijn.",
  airco: "Airconditioning is in Spanje vaak een optie bij nieuwbouw. Check wat standaard is inbegrepen."
};

// Cost breakdown visual bar component
function CostBreakdownBar({ 
  taxes, 
  legal, 
  other,
  formatCurrency
}: { 
  taxes: number; 
  legal: number; 
  other: number;
  formatCurrency: (amount: number) => string;
}) {
  const total = taxes + legal + other;
  if (total === 0) return null;

  const taxesPercent = (taxes / total) * 100;
  const legalPercent = (legal / total) * 100;
  const otherPercent = (other / total) * 100;

  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-sm">Kostenopbouw</h4>
      <div className="h-4 w-full rounded-full overflow-hidden flex bg-muted">
        <div 
          className="bg-primary h-full transition-all" 
          style={{ width: `${taxesPercent}%` }}
        />
        <div 
          className="bg-blue-400 h-full transition-all" 
          style={{ width: `${legalPercent}%` }}
        />
        <div 
          className="bg-slate-400 h-full transition-all" 
          style={{ width: `${otherPercent}%` }}
        />
      </div>
      <div className="flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span className="text-muted-foreground">Belastingen: {formatCurrency(taxes)}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-400" />
          <span className="text-muted-foreground">Juridisch: {formatCurrency(legal)}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-slate-400" />
          <span className="text-muted-foreground">Overig: {formatCurrency(other)}</span>
        </div>
      </div>
    </div>
  );
}

export function DashboardPurchaseCostsCalculator() {
  const { trackCalculator } = useCalculatorTracking();
  const [purchasePrice, setPurchasePrice] = useState<number>(250000);
  const [propertyType, setPropertyType] = useState<PropertyType>("nieuwbouw");
  const [region, setRegion] = useState<Region>("murcia");
  const [withMortgage, setWithMortgage] = useState<boolean>(false);
  const [mortgageAmount, setMortgageAmount] = useState<number>(150000);
  const [includeFurniture, setIncludeFurniture] = useState<boolean>(false);
  const [includeAirco, setIncludeAirco] = useState<boolean>(false);
  
  const [costs, setCosts] = useState<CostBreakdown>({
    btwOrItp: 0,
    ajd: 0,
    advocaat: 0,
    notaris: 2000,
    registratie: 800,
    volmacht: 700,
    nutsvoorzieningen: 0,
    bankkosten: 200,
    administratie: 250,
    nie: 20,
    taxatie: 0,
    hypotheekNotaris: 0,
    bankCommissie: 0,
    meubelpakket: 0,
    airco: 0,
  });

  // Get ITP rate based on region
  const getItpRate = (region: Region) => {
    switch (region) {
      case "murcia": return 7.75;
      case "valencia": return 10;
      default: return 7.75;
    }
  };

  useEffect(() => {
    let btwOrItp = 0;
    let ajd = 0;
    let nutsvoorzieningen = 0;
    let taxatie = 0;
    let hypotheekNotaris = 0;
    let bankCommissie = 0;
    let meubelpakket = 0;
    let airco = 0;

    if (propertyType === "nieuwbouw") {
      btwOrItp = purchasePrice * 0.10; // 10% BTW
      ajd = purchasePrice * 0.015; // 1.5% AJD
      nutsvoorzieningen = 300;
    } else {
      const itpRate = getItpRate(region);
      btwOrItp = purchasePrice * (itpRate / 100); // ITP variable by region
      ajd = 0; // No AJD for bestaande bouw
      nutsvoorzieningen = 150;
    }

    // Calculate advocaat costs: 1% + 21% BTW
    const advocaatBase = purchasePrice * 0.01;
    const advocaat = advocaatBase * 1.21;

    // Mortgage costs
    if (withMortgage) {
      taxatie = 400;
      hypotheekNotaris = 750;
      bankCommissie = mortgageAmount * 0.01; // 1% of mortgage amount
    }

    // Optional extras (only for nieuwbouw)
    if (propertyType === "nieuwbouw") {
      if (includeFurniture) {
        meubelpakket = 10000; // Average estimate
      }
      if (includeAirco) {
        airco = 4000; // Average estimate
      }
    }

    setCosts({
      btwOrItp,
      ajd,
      advocaat,
      notaris: 2000,
      registratie: 800,
      volmacht: 700,
      nutsvoorzieningen,
      bankkosten: 200,
      administratie: 250,
      nie: 20,
      taxatie,
      hypotheekNotaris,
      bankCommissie,
      meubelpakket,
      airco,
    });

    // Track calculator usage
    const baseCosts = btwOrItp + ajd + advocaat + 2000 + 800 + 700 + nutsvoorzieningen + 200 + 250 + 20;
    const mortgageCosts = taxatie + hypotheekNotaris + bankCommissie;
    const extrasCosts = meubelpakket + airco;
    const totalCosts = baseCosts + mortgageCosts + extrasCosts;

    trackCalculator("costs", {
      purchase_price: purchasePrice,
      property_type: propertyType,
      region: region,
      with_mortgage: withMortgage,
      mortgage_amount: withMortgage ? mortgageAmount : undefined,
    }, {
      total_costs: totalCosts,
      percentage: (totalCosts / purchasePrice) * 100,
    });
  }, [purchasePrice, propertyType, region, withMortgage, mortgageAmount, includeFurniture, includeAirco]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate totals
  const baseCosts = costs.btwOrItp + costs.ajd + costs.advocaat + costs.notaris + 
    costs.registratie + costs.volmacht + costs.nutsvoorzieningen + 
    costs.bankkosten + costs.administratie + costs.nie;
  const mortgageCosts = costs.taxatie + costs.hypotheekNotaris + costs.bankCommissie;
  const extrasCosts = costs.meubelpakket + costs.airco;
  const totalAdditionalCosts = baseCosts + mortgageCosts + extrasCosts;
  const totalInvestment = purchasePrice + totalAdditionalCosts;
  const percentageOfPrice = (totalAdditionalCosts / purchasePrice) * 100;

  // Calculate breakdown for visual bar
  const taxesCosts = costs.btwOrItp + costs.ajd;
  const legalCosts = costs.advocaat + costs.notaris + costs.registratie + costs.volmacht;
  const otherCosts = costs.nutsvoorzieningen + costs.bankkosten + costs.administratie + costs.nie + mortgageCosts + extrasCosts;

  const CostRow = ({ 
    label, 
    amount, 
    tooltip 
  }: { 
    label: string; 
    amount: number; 
    tooltip: string;
  }) => (
    <div className="flex justify-between items-center text-sm py-2">
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground">{label}</span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-3 w-3 text-muted-foreground/50" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-xs">{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <span className="font-medium">{formatCurrency(amount)}</span>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aankoopkosten Calculator</CardTitle>
        <CardDescription>
          Bereken alle kosten bij de aankoop van je woning in Spanje
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Section */}
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label htmlFor="purchase-price">Aankoopprijs</Label>
              <Input
                id="purchase-price"
                type="number"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(Number(e.target.value))}
                className="w-32"
              />
            </div>
            <Slider
              value={[purchasePrice]}
              onValueChange={(value) => setPurchasePrice(value[0])}
              min={100000}
              max={1000000}
              step={10000}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>€100.000</span>
              <span>€1.000.000</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="property-type">Type woning</Label>
              <Select
                value={propertyType}
                onValueChange={(value) => setPropertyType(value as PropertyType)}
              >
                <SelectTrigger id="property-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nieuwbouw">Nieuwbouw</SelectItem>
                  <SelectItem value="bestaand">Bestaande bouw</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="region">Regio</Label>
              <Select
                value={region}
                onValueChange={(value) => setRegion(value as Region)}
              >
                <SelectTrigger id="region">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="murcia">Murcia (Regio Murcia)</SelectItem>
                  <SelectItem value="valencia">Alicante (Comunidad Valenciana)</SelectItem>
                </SelectContent>
              </Select>
              {propertyType === "bestaand" && (
                <p className="text-xs text-muted-foreground">
                  ITP tarief: {getItpRate(region)}%
                </p>
              )}
            </div>
          </div>

          {/* Mortgage Toggle */}
          <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="with-mortgage" 
                checked={withMortgage}
                onCheckedChange={(checked) => setWithMortgage(checked === true)}
              />
              <Label htmlFor="with-mortgage" className="font-medium cursor-pointer">
                Ik financier met een Spaanse hypotheek
              </Label>
            </div>
            
            {withMortgage && (
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="mortgage-amount">Leningbedrag</Label>
                  <Input
                    id="mortgage-amount"
                    type="number"
                    value={mortgageAmount}
                    onChange={(e) => setMortgageAmount(Number(e.target.value))}
                    className="w-32"
                  />
                </div>
                <Slider
                  value={[mortgageAmount]}
                  onValueChange={(value) => setMortgageAmount(value[0])}
                  min={50000}
                  max={Math.min(purchasePrice * 0.7, 700000)}
                  step={10000}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Max 70% van aankoopprijs voor niet-residenten
                </p>
              </div>
            )}
          </div>

          {/* Nieuwbouw Extras */}
          {propertyType === "nieuwbouw" && (
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
              <h4 className="font-medium flex items-center gap-2">
                <Sofa className="h-4 w-4" />
                Optionele extras (nieuwbouw)
              </h4>
              <p className="text-xs text-muted-foreground">
                Check met de projectontwikkelaar welke opties verplicht of optioneel zijn.
              </p>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="furniture" 
                      checked={includeFurniture}
                      onCheckedChange={(checked) => setIncludeFurniture(checked === true)}
                    />
                    <Label htmlFor="furniture" className="cursor-pointer flex items-center gap-2">
                      <Sofa className="h-4 w-4 text-muted-foreground" />
                      Meubelpakket
                    </Label>
                  </div>
                  <span className="text-sm text-muted-foreground">€8.000 - €15.000</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="airco" 
                      checked={includeAirco}
                      onCheckedChange={(checked) => setIncludeAirco(checked === true)}
                    />
                    <Label htmlFor="airco" className="cursor-pointer flex items-center gap-2">
                      <Wind className="h-4 w-4 text-muted-foreground" />
                      Airconditioning
                    </Label>
                  </div>
                  <span className="text-sm text-muted-foreground">€3.000 - €5.000</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Visual Cost Breakdown */}
        <CostBreakdownBar 
          taxes={taxesCosts}
          legal={legalCosts}
          other={otherCosts}
          formatCurrency={formatCurrency}
        />

        <Separator />

        {/* Results Section */}
        <div className="space-y-4">
          <h4 className="font-semibold text-sm">Kostenposten</h4>

          <div className="bg-muted/30 p-4 rounded-lg space-y-1">
            <div className="flex justify-between text-sm pb-2">
              <span className="text-muted-foreground">Aankoopprijs</span>
              <span className="font-semibold">{formatCurrency(purchasePrice)}</span>
            </div>

            <Separator className="my-2" />

            <CostRow
              label={propertyType === "nieuwbouw" ? "BTW (10%)" : `ITP (${getItpRate(region)}%)`}
              amount={costs.btwOrItp}
              tooltip={propertyType === "nieuwbouw" ? COST_TOOLTIPS.btwNieuwbouw : COST_TOOLTIPS.itp}
            />

            {propertyType === "nieuwbouw" && (
              <CostRow
                label="Zegelbelasting (AJD 1,5%)"
                amount={costs.ajd}
                tooltip={COST_TOOLTIPS.ajd}
              />
            )}

            <CostRow
              label="Advocaatkosten"
              amount={costs.advocaat}
              tooltip={COST_TOOLTIPS.advocaat}
            />

            <CostRow
              label="Notariskosten"
              amount={costs.notaris}
              tooltip={COST_TOOLTIPS.notaris}
            />

            <CostRow
              label="Registratiekantoor"
              amount={costs.registratie}
              tooltip={COST_TOOLTIPS.registratie}
            />

            <CostRow
              label="Volmacht (optioneel)"
              amount={costs.volmacht}
              tooltip={COST_TOOLTIPS.volmacht}
            />

            <CostRow
              label="Nutsaansluitingen"
              amount={costs.nutsvoorzieningen}
              tooltip={propertyType === "nieuwbouw" ? COST_TOOLTIPS.nutsNieuwbouw : COST_TOOLTIPS.nutsBestaand}
            />

            <CostRow
              label="Bankkosten"
              amount={costs.bankkosten}
              tooltip={COST_TOOLTIPS.bankkosten}
            />

            <CostRow
              label="Administratie"
              amount={costs.administratie}
              tooltip={COST_TOOLTIPS.administratie}
            />

            <CostRow
              label="NIE-nummer"
              amount={costs.nie}
              tooltip={COST_TOOLTIPS.nie}
            />

            {/* Mortgage costs */}
            {withMortgage && (
              <>
                <Separator className="my-2" />
                <div className="text-xs font-medium text-muted-foreground pt-2 pb-1">
                  Hypotheekkosten
                </div>
                <CostRow
                  label="Taxatiekosten"
                  amount={costs.taxatie}
                  tooltip={COST_TOOLTIPS.taxatie}
                />
                <CostRow
                  label="Hypotheekakte notaris"
                  amount={costs.hypotheekNotaris}
                  tooltip={COST_TOOLTIPS.hypotheekNotaris}
                />
                <CostRow
                  label="Bankcommissie (1%)"
                  amount={costs.bankCommissie}
                  tooltip={COST_TOOLTIPS.bankCommissie}
                />
              </>
            )}

            {/* Optional extras */}
            {(costs.meubelpakket > 0 || costs.airco > 0) && (
              <>
                <Separator className="my-2" />
                <div className="text-xs font-medium text-muted-foreground pt-2 pb-1">
                  Optionele extras
                </div>
                {costs.meubelpakket > 0 && (
                  <CostRow
                    label="Meubelpakket"
                    amount={costs.meubelpakket}
                    tooltip={COST_TOOLTIPS.meubelpakket}
                  />
                )}
                {costs.airco > 0 && (
                  <CostRow
                    label="Airconditioning"
                    amount={costs.airco}
                    tooltip={COST_TOOLTIPS.airco}
                  />
                )}
              </>
            )}

            <Separator className="my-3" />

            <div className="flex justify-between pt-2">
              <div>
                <div className="font-semibold">Totaal bijkomende kosten</div>
                <div className="text-xs text-muted-foreground">
                  {percentageOfPrice.toFixed(1)}% van aankoopprijs
                </div>
              </div>
              <span className="font-bold text-primary text-lg">
                {formatCurrency(totalAdditionalCosts)}
              </span>
            </div>

            <Separator className="my-3" />

            <div className="flex justify-between pt-2">
              <div className="font-bold text-lg">Totale investering</div>
              <span className="font-bold text-lg">
                {formatCurrency(totalInvestment)}
              </span>
            </div>
          </div>

          {/* CTA Card */}
          <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <MessageCircle className="h-5 w-5 text-primary mt-0.5" />
              <div className="space-y-2 flex-1">
                <h4 className="font-semibold text-sm">
                  Wil je deze berekening bespreken?
                </h4>
                <p className="text-xs text-muted-foreground">
                  Plan een vrijblijvend gesprek met je adviseur om de kosten voor jouw specifieke situatie door te nemen.
                </p>
                <Button 
                  variant="default" 
                  size="sm"
                  className="mt-2"
                  onClick={() => window.open("https://topimmo.lovable.app/gesprek", "_blank")}
                >
                  Plan een gesprek
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 p-3 rounded-lg">
            <p className="text-xs text-blue-900 dark:text-blue-100">
              💡 <strong>Let op:</strong> Dit is een indicatieve berekening. Werkelijke kosten kunnen variëren
              afhankelijk van je specifieke situatie en de regio in Spanje.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
