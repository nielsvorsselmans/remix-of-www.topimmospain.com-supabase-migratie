import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Calculator, Info, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface Property {
  id: string;
  title: string;
  price?: number | null;
  property_type?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
}

interface CostsTabContentProps {
  properties: Property[];
  averagePrice: number;
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

export function CostsTabContent({ 
  properties, 
  averagePrice,
  onAccordionOpen 
}: CostsTabContentProps) {
  // Filter available properties with prices and sort by price
  const availableProperties = properties
    .filter(p => p.price && p.price > 0)
    .sort((a, b) => (a.price || 0) - (b.price || 0));
  
  // Default to first (cheapest) property
  const [selectedPropertyId, setSelectedPropertyId] = useState(
    availableProperties.length > 0 ? availableProperties[0].id : null
  );

  const selectedProperty = availableProperties.find(p => p.id === selectedPropertyId);
  const displayPrice = selectedProperty?.price || averagePrice;
  
  // Calculate costs exactly as in PurchaseCostsBreakdown
  const calculatePercentage = (price: number, percentage: number) => {
    return price * percentage / 100;
  };

  const costItems: CostItem[] = [
    {
      label: "BTW",
      amount: calculatePercentage(displayPrice, 10),
      isPercentage: true,
      percentage: 10,
      tooltip: "Belasting over de Toegevoegde Waarde voor nieuwbouwwoningen in Spanje"
    },
    {
      label: "Zegelrechten (AJD)",
      amount: calculatePercentage(displayPrice, 1.5),
      isPercentage: true,
      percentage: 1.5,
      tooltip: "Actos Jurídicos Documentados - registratiebelasting voor officiële documenten"
    },
    {
      label: "Erelonen advocaat",
      amount: calculatePercentage(displayPrice, 1) * 1.21,
      isPercentage: true,
      percentage: 1,
      tooltip: "Juridische begeleiding door advocaat: 1% van aankoopprijs + 21% BTW"
    },
    {
      label: "Notariskosten Spanje",
      amount: 2000,
      isPercentage: false,
      tooltip: "Kosten voor de Spaanse notaris bij het passeren van de akte"
    },
    {
      label: "Registratiekantoor",
      amount: 800,
      isPercentage: false,
      tooltip: "Inschrijving van het eigendom in het Spaanse kadaster"
    },
    {
      label: "Notariële volmacht",
      amount: 700,
      isPercentage: false,
      tooltip: "Volmacht voor vertegenwoordiging bij de notaris (optioneel)",
      isOptional: true
    },
    {
      label: "Aansluiting nutsvoorzieningen",
      amount: 300,
      isPercentage: false,
      tooltip: "Aansluitkosten voor water, elektriciteit en gas"
    },
    {
      label: "Bankkosten",
      amount: 200,
      isPercentage: false,
      tooltip: "Kosten voor bankcheque en/of internationale overschrijving"
    },
    {
      label: "Administratie- en diverse kosten",
      amount: 250,
      isPercentage: false,
      tooltip: "Overige administratieve kosten en vertalingen"
    },
    {
      label: "NIE-nummer",
      amount: 20,
      isPercentage: false,
      tooltip: "Número de Identificación de Extranjero - verplicht fiscaal nummer (€10 per persoon)"
    }
  ];

  const totalBijkomendeKosten = costItems.reduce((sum, item) => sum + item.amount, 0);
  const totaleInvestering = displayPrice + totalBijkomendeKosten;
  const percentageOfPrice = (totalBijkomendeKosten / displayPrice * 100).toFixed(1);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Calculate IBI and insurance ranges
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

  const ibiRange = calculateIBI(displayPrice);
  const insuranceRange = calculateInsurance(displayPrice);

  const yearlyCostItems = [
    {
      label: "IBI (Onroerende voorheffing)",
      minAmount: ibiRange.min,
      maxAmount: ibiRange.max,
      tooltip: "Gemeentebelasting op onroerend goed (Impuesto sobre Bienes Inmuebles)",
      disclaimer: "Varieert per gemeente en kadastrale waarde van het pand"
    },
    {
      label: "Gemeenschapskosten",
      minAmount: 840,
      maxAmount: 1200,
      tooltip: "Jaarlijkse kosten voor onderhoud gemeenschappelijke delen, tuinen, zwembad, parking en lift",
      disclaimer: "Afhankelijk van voorzieningen: basis (tuin, zwembad, parking, lift)"
    },
    {
      label: "Verzekeringen",
      minAmount: insuranceRange.min,
      maxAmount: insuranceRange.max,
      tooltip: "Woonverzekering inclusief aansprakelijkheid en schade",
      disclaimer: "Varieert per gekozen dekking en waarde inboedel"
    },
    {
      label: "Nutsvoorzieningen",
      minAmount: 600,
      maxAmount: 1800,
      tooltip: "Water, elektriciteit, gas, internet/TV - gebaseerd op gemiddeld gebruik",
      disclaimer: "Sterk afhankelijk van gebruik en seizoen"
    },
    {
      label: "Afvalbelasting",
      minAmount: 70,
      maxAmount: 150,
      tooltip: "Gemeentelijke heffing voor afvalinzameling",
      disclaimer: "Verschilt per gemeente en type woning"
    },
    {
      label: "Onderhoud & reserves",
      minAmount: 500,
      maxAmount: 1500,
      tooltip: "Budgetteer voor regelmatig onderhoud, reparaties en vervanging apparatuur",
      disclaimer: "Reserveer budget voor onverwacht onderhoud"
    }
  ];

  const totalYearlyMin = yearlyCostItems.reduce((sum, item) => sum + item.minAmount, 0);
  const totalYearlyMax = yearlyCostItems.reduce((sum, item) => sum + item.maxAmount, 0);

  // Create tab label
  const getPropertyLabel = (property: Property) => {
    const type = property.property_type || "Pand";
    const beds = property.bedrooms ? `${property.bedrooms} slk` : "";
    const baths = property.bathrooms ? `${property.bathrooms} bdk` : "";
    const price = property.price ? formatCurrency(property.price) : "";
    
    const parts = [type];
    if (beds) parts.push(beds);
    if (baths) parts.push(baths);
    
    return {
      label: parts.join(" - "),
      price: price
    };
  };

  return (
    <div className="space-y-6">
      {/* Introductie Sectie */}
      <div className="prose prose-sm max-w-none">
        <p className="text-muted-foreground leading-relaxed">
          Bij de aankoop van vastgoed in Spanje komen er extra kosten bovenop de aankoopprijs. 
          Hieronder hebben we deze <strong>bij benadering</strong> voor je uitgerekend en wat deze ongeveer inhouden. 
          Daarnaast vind je ook de geschatte <strong>jaarlijkse kosten</strong>. 
          Wil je deze meer gedetailleerd? Neem gerust persoonlijk contact op.
        </p>
      </div>

      {/* Pand Selectie Tabs */}
      {availableProperties.length > 1 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Kies een pand voor de berekening</h3>
          <Tabs value={selectedPropertyId || ""} onValueChange={setSelectedPropertyId}>
            <TabsList className="w-full justify-start h-auto flex-wrap gap-2 bg-muted/50">
              {availableProperties.map((property) => {
                const { label, price } = getPropertyLabel(property);
                return (
                  <TabsTrigger
                    key={property.id}
                    value={property.id}
                    className="flex flex-col items-start gap-1 px-4 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    <span className="font-medium text-sm">{label}</span>
                    <span className="text-xs opacity-80">{price}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* Geïntegreerd Kostenoverzicht */}
      <Card className="border-2 border-primary/20">
        <CardContent className="p-4 sm:pt-6 sm:px-6">
          <div className="space-y-3 sm:space-y-4">
            {/* Aankoopprijs */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b gap-1">
              <span className="text-muted-foreground text-sm sm:text-base">Aankoopprijs</span>
              <span className="text-lg sm:text-xl font-semibold">{formatCurrency(displayPrice)}</span>
            </div>

            {/* Bijkomende Kosten - Direct als Accordeon */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="additional-costs" className="border-0">
                <AccordionTrigger 
                  className="hover:no-underline pb-3 border-b"
                  onClick={() => onAccordionOpen?.("additional-costs")}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full pr-4 gap-1 text-left">
                    <span className="text-muted-foreground text-sm sm:text-base">Bijkomende kosten</span>
                    <span className="text-base sm:text-xl font-semibold text-primary">
                      ~{percentageOfPrice}% · + {formatCurrency(totalBijkomendeKosten)}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-1 sm:space-y-2 pt-3 pb-2">
                    <TooltipProvider>
                      {costItems.map((item, index) => (
                        <div key={index} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 hover:bg-muted/20 rounded-lg transition-colors gap-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs sm:text-sm ${item.isOptional ? "text-muted-foreground italic" : ""}`}>
                              {item.label}
                              {item.isPercentage && item.percentage && (
                                <span className="text-xs text-muted-foreground ml-1">({item.percentage}%)</span>
                              )}
                              {item.isOptional && (
                                <span className="text-xs text-muted-foreground ml-1">(optioneel)</span>
                              )}
                            </span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground cursor-help shrink-0" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-sm">{item.tooltip}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <span className="font-medium text-xs sm:text-sm text-right">{formatCurrency(item.amount)}</span>
                        </div>
                      ))}
                    </TooltipProvider>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Totale Investering - Prominent */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-2 pb-3 sm:pb-4 border-b-2 border-primary/30 gap-1">
              <span className="text-base sm:text-lg font-bold">Totale Investering</span>
              <span className="text-2xl sm:text-3xl font-bold text-primary">{formatCurrency(totaleInvestering)}</span>
            </div>

            {/* Jaarlijkse Kosten Accordeon */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="annual-costs" className="border-0">
                <AccordionTrigger 
                  className="hover:no-underline pt-2"
                  onClick={() => onAccordionOpen?.("annual-costs")}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full pr-4 gap-1 text-left">
                    <span className="font-semibold text-sm sm:text-base">Jaarlijkse kosten</span>
                    <span className="text-sm sm:text-lg font-semibold text-primary">
                      {formatCurrency(totalYearlyMin)} - {formatCurrency(totalYearlyMax)}/jr
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 sm:space-y-4 pt-3 sm:pt-4">
                    {/* Algemene disclaimer */}
                    <div className="p-2 sm:p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <p className="text-xs text-amber-900 dark:text-amber-200">
                        <strong>⚠️ Belangrijk:</strong> Deze cijfers zijn schattingen en kunnen variëren per project en gemeente.
                      </p>
                    </div>

                    {/* Jaarlijkse kostenposten */}
                    <div className="space-y-1 sm:space-y-2">
                      <TooltipProvider>
                        {yearlyCostItems.map((item, index) => (
                          <div key={index} className="space-y-0.5 sm:space-y-1">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 hover:bg-muted/20 rounded-lg transition-colors gap-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs sm:text-sm">{item.label}</span>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground cursor-help shrink-0" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p className="text-sm">{item.tooltip}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <span className="font-medium text-xs sm:text-sm text-primary">
                                {formatCurrency(item.minAmount)} - {formatCurrency(item.maxAmount)}
                              </span>
                            </div>
                            {item.disclaimer && (
                              <p className="text-[10px] sm:text-xs text-muted-foreground italic pl-2 pb-0.5 sm:pb-1 hidden sm:block">
                                💡 {item.disclaimer}
                              </p>
                            )}
                          </div>
                        ))}
                      </TooltipProvider>
                    </div>

                    {/* Totaal per maand */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 sm:p-3 bg-accent/10 rounded-lg mt-3 sm:mt-4 gap-1">
                      <span className="font-semibold text-xs sm:text-sm">Gemiddeld per maand</span>
                      <span className="font-bold text-primary text-sm sm:text-base">
                        {formatCurrency(totalYearlyMin / 12)} - {formatCurrency(totalYearlyMax / 12)}
                      </span>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </CardContent>
      </Card>

      {/* Tab-Specific CTA voor Kosten */}
      <div className="mt-8 p-6 bg-muted/30 rounded-lg border border-border/50">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-lg font-semibold text-foreground mb-2">
            <Calculator className="w-5 h-5 text-primary" />
            <span>Wil je een persoonlijke berekening op basis van jouw situatie?</span>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Onze adviseurs kunnen je helpen met een exacte kostenopstelling, inclusief financieringsmogelijkheden en belastingadvies specifiek voor jouw situatie.
          </p>
          <Button asChild variant="default" className="gap-2 mt-4">
            <Link to="/afspraak">
              Plan een persoonlijk gesprek
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
