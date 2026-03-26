import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, Euro } from "lucide-react";
interface PurchaseCostsBreakdownProps {
  propertyPrice: number;
  onAccordionOpen?: (accordionId: string) => void;
}
interface CostItem {
  label: string;
  amount: number;
  isPercentage: boolean;
  percentage?: number;
  tooltip: string;
  isOptional?: boolean;
}
interface YearlyCostItem {
  label: string;
  minAmount: number;
  maxAmount: number;
  tooltip: string;
  disclaimer?: string;
}
export function PurchaseCostsBreakdown({
  propertyPrice,
  onAccordionOpen
}: PurchaseCostsBreakdownProps) {
  const calculatePercentage = (price: number, percentage: number) => {
    return price * percentage / 100;
  };
  const costItems: CostItem[] = [{
    label: "BTW",
    amount: calculatePercentage(propertyPrice, 10),
    isPercentage: true,
    percentage: 10,
    tooltip: "Belasting over de Toegevoegde Waarde voor nieuwbouwwoningen in Spanje"
  }, {
    label: "Zegelrechten (AJD)",
    amount: calculatePercentage(propertyPrice, 1.5),
    isPercentage: true,
    percentage: 1.5,
    tooltip: "Actos Jurídicos Documentados - registratiebelasting voor officiële documenten"
  }, {
    label: "Erelonen advocaat",
    amount: calculatePercentage(propertyPrice, 1) * 1.21,
    isPercentage: true,
    percentage: 1,
    tooltip: "Juridische begeleiding door advocaat: 1% van aankoopprijs + 21% BTW"
  }, {
    label: "Notariskosten Spanje",
    amount: 2000,
    isPercentage: false,
    tooltip: "Kosten voor de Spaanse notaris bij het passeren van de akte"
  }, {
    label: "Registratiekantoor",
    amount: 800,
    isPercentage: false,
    tooltip: "Inschrijving van het eigendom in het Spaanse kadaster"
  }, {
    label: "Notariële volmacht",
    amount: 700,
    isPercentage: false,
    tooltip: "Volmacht voor vertegenwoordiging bij de notaris (optioneel)",
    isOptional: true
  }, {
    label: "Aansluiting nutsvoorzieningen",
    amount: 300,
    isPercentage: false,
    tooltip: "Aansluitkosten voor water, elektriciteit en gas"
  }, {
    label: "Bankkosten",
    amount: 200,
    isPercentage: false,
    tooltip: "Kosten voor bankcheque en/of internationale overschrijving"
  }, {
    label: "Administratie- en diverse kosten",
    amount: 250,
    isPercentage: false,
    tooltip: "Overige administratieve kosten en vertalingen"
  }, {
    label: "NIE-nummer",
    amount: 20,
    isPercentage: false,
    tooltip: "Número de Identificación de Extranjero - verplicht fiscaal nummer (€10 per persoon)"
  }];
  const calculateIBI = (price: number) => {
    const baseIBI = calculatePercentage(price, 0.15);
    return {
      min: Math.max(0, baseIBI - 50),
      max: baseIBI + 50
    };
  };
  const calculateInsurance = (price: number) => {
    const baseInsurance = calculatePercentage(price, 0.1);
    return {
      min: Math.max(0, baseInsurance - 50),
      max: baseInsurance + 100
    };
  };
  const ibiRange = calculateIBI(propertyPrice);
  const insuranceRange = calculateInsurance(propertyPrice);
  const yearlyCostItems: YearlyCostItem[] = [{
    label: "IBI (Onroerende voorheffing)",
    minAmount: ibiRange.min,
    maxAmount: ibiRange.max,
    tooltip: "Gemeentebelasting op onroerend goed (Impuesto sobre Bienes Inmuebles)",
    disclaimer: "Varieert per gemeente en kadastrale waarde van het pand"
  }, {
    label: "Gemeenschapskosten",
    minAmount: 840,
    maxAmount: 1200,
    tooltip: "Jaarlijkse kosten voor onderhoud gemeenschappelijke delen, tuinen, zwembad, parking en lift",
    disclaimer: "Afhankelijk van voorzieningen: basis (tuin, zwembad, parking, lift). Extra voorzieningen zoals fitness, sauna, security, verwarmd zwembad verhogen de kosten. Bij villa's mogelijk geen gemeenschapskosten maar wel eigen onderhoud zwembad en tuin"
  }, {
    label: "Verzekeringen",
    minAmount: insuranceRange.min,
    maxAmount: insuranceRange.max,
    tooltip: "Woonverzekering inclusief aansprakelijkheid en schade",
    disclaimer: "Varieert per gekozen dekking, waarde inboedel en eventuele aanvullende verzekering voor kortetermijnverhuur"
  }, {
    label: "Nutsvoorzieningen",
    minAmount: 600,
    maxAmount: 1800,
    tooltip: "Water, elektriciteit, gas, internet/TV - gebaseerd op gemiddeld gebruik",
    disclaimer: "Sterk afhankelijk van gebruik en seizoen"
  }, {
    label: "Afvalbelasting",
    minAmount: 70,
    maxAmount: 150,
    tooltip: "Gemeentelijke heffing voor afvalinzameling",
    disclaimer: "Verschilt per gemeente en type woning"
  }, {
    label: "Onderhoud & reserves",
    minAmount: 500,
    maxAmount: 1500,
    tooltip: "Budgetteer voor regelmatig onderhoud, reparaties en vervanging apparatuur",
    disclaimer: "Reserveer budget voor onverwacht onderhoud en vervangingen"
  }];
  const totalYearlyMin = yearlyCostItems.reduce((sum, item) => sum + item.minAmount, 0);
  const totalYearlyMax = yearlyCostItems.reduce((sum, item) => sum + item.maxAmount, 0);
  const totalCosts = costItems.reduce((sum, item) => sum + item.amount, 0);
  const totalWithProperty = propertyPrice + totalCosts;
  const percentageOfPrice = (totalCosts / propertyPrice * 100).toFixed(2);
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };
  return <Card className="shadow-elegant">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Euro className="w-5 h-5 text-primary" />
          Volledige Kosten Overzicht
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Alle kosten bij aankoop van dit onroerend goed - dit is een schatting naargelang de bedragen die we doorgaans
          tegenkomen
        </p>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full space-y-2">
          {/* Eenmalige aankoopkosten */}
          <AccordionItem value="costs" className="border rounded-lg px-4">
            <AccordionTrigger 
              className="hover:no-underline"
              onClick={() => onAccordionOpen?.('costs')}
            >
              <div className="flex justify-between items-center w-full pr-4">
                <span className="font-semibold">Bekijk gedetailleerde aankoopkosten</span>
                <span className="text-primary font-bold">{formatCurrency(totalCosts)}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-4">
                {/* Aankoopprijs */}
                <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Aankoopprijs</span>
                  </div>
                  <span className="font-bold text-lg">{formatCurrency(propertyPrice)}</span>
                </div>

                {/* Bijkomende kosten */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-muted-foreground mb-3">Bijkomende kosten:</h4>
                  <TooltipProvider>
                    {costItems.map((item, index) => <div key={index} className="flex justify-between items-center p-2 hover:bg-muted/20 rounded-lg transition-colors">
                        <div className="flex items-center gap-2">
                          <span className={item.isOptional ? "text-muted-foreground italic" : ""}>
                            {item.label}
                            {item.isPercentage && item.percentage && <span className="text-xs text-muted-foreground ml-1">({item.percentage}%)</span>}
                            {item.isOptional && <span className="text-xs text-muted-foreground ml-1">(optioneel)</span>}
                          </span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-sm">{item.tooltip}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <span className="font-medium">{formatCurrency(item.amount)}</span>
                      </div>)}
                  </TooltipProvider>
                </div>

                {/* Totalen */}
                <div className="space-y-2 pt-4 border-t">
                  <div className="flex justify-between items-center p-3 bg-accent/10 rounded-lg">
                    <span className="font-semibold">Totale bijkomende kosten</span>
                    <span className="font-bold text-primary">{formatCurrency(totalCosts)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg">
                    <span className="font-bold text-lg">Totale investering</span>
                    <span className="font-bold text-lg text-primary">{formatCurrency(totalWithProperty)}</span>
                  </div>
                  <p className="text-xs text-center text-muted-foreground pt-2">
                    Bijkomende kosten: {percentageOfPrice}% van de aankoopprijs
                  </p>
                </div>

                {/* Disclaimer */}
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    <strong>Let op:</strong> Dit is een indicatieve berekening gebaseerd op nieuwbouw in Murcia. De
                    exacte kosten kunnen variëren afhankelijk van uw specifieke situatie. Neem contact op met onze
                    adviseurs voor een persoonlijke berekening.
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Jaarlijkse terugkerende kosten */}
          <AccordionItem value="yearly-costs" className="border rounded-lg px-4">
            <AccordionTrigger 
              className="hover:no-underline"
              onClick={() => onAccordionOpen?.('yearly-costs')}
            >
              <div className="flex justify-between items-center w-full pr-4">
                <span className="font-semibold">Jaarlijkse terugkerende kosten </span>
                <span className="text-primary font-bold">
                  {formatCurrency(totalYearlyMin)} - {formatCurrency(totalYearlyMax)}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-4">
                {/* Algemene disclaimer bovenaan */}
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-xs text-amber-900 dark:text-amber-200">
                    <strong>⚠️ Belangrijke opmerking:</strong> Deze cijfers zijn schattingen en kunnen aanzienlijk variëren per project, gemeente, en gekozen voorzieningen. Vraag altijd de specifieke kosten voor uw situatie op.
                  </p>
                </div>

                {/* Jaarlijkse kostenposten */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-muted-foreground mb-3">Jaarlijkse kosten:</h4>
                  <TooltipProvider>
                    {yearlyCostItems.map((item, index) => <div key={index} className="space-y-1">
                        <div className="flex justify-between items-center p-2 hover:bg-muted/20 rounded-lg transition-colors">
                          <div className="flex items-center gap-2">
                            <span>
                              {item.label}
                            </span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-sm">{item.tooltip}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <span className="font-medium text-primary">
                            {formatCurrency(item.minAmount)} - {formatCurrency(item.maxAmount)}
                          </span>
                        </div>
                        {item.disclaimer && <p className="text-xs text-muted-foreground italic pl-2 pb-1">
                            💡 {item.disclaimer}
                          </p>}
                      </div>)}
                  </TooltipProvider>
                </div>

                {/* Totaal range */}
                <div className="space-y-2 pt-4 border-t">
                  <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg">
                    <span className="font-bold text-lg">Totaal per jaar (schatting)</span>
                    <span className="font-bold text-lg text-primary">
                      {formatCurrency(totalYearlyMin)} - {formatCurrency(totalYearlyMax)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-accent/10 rounded-lg">
                    <span className="font-semibold">Gemiddeld per maand</span>
                    <span className="font-bold text-primary">
                      {formatCurrency(totalYearlyMin / 12)} - {formatCurrency(totalYearlyMax / 12)}
                    </span>
                  </div>
                </div>

                {/* Slotdisclaimer */}
                <div className="mt-4 p-3 bg-muted/50 rounded-lg space-y-2">
                  <p className="text-xs text-muted-foreground">
                    <strong>Let op:</strong> Bovenstaande cijfers zijn indicatief en gebaseerd op gemiddelde kosten in de regio Murcia.
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1 pl-4">
                    <li>• IBI varieert per gemeente en kadastrale waarde</li>
                    <li>• Gemeenschapskosten hangen af van voorzieningen (zwembad, beveiliging, tuinen)</li>
                    <li>• Nutsvoorzieningen zijn sterk afhankelijk van gebruik en seizoen</li>
                    <li>• Verhuurmanagement alleen indien u verhuurt</li>
                  </ul>
                  <p className="text-xs text-muted-foreground pt-2">
                    Neem contact op voor een exacte berekening op basis van uw specifieke project en situatie.
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>;
}