import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import CurrencyInput from "@/components/hypotheek/CurrencyInput";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Info, TrendingDown, ChevronDown } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useCalculatorTracking } from "@/hooks/useTrackCalculator";
import { formatCurrency } from "@/lib/utils";

interface ScenarioResult {
  totalAssets: number;
  totalDebts: number;
  rendementsgrondslag: number;
  forfaitairRendement: number;
  rendementSpaargeld: number;
  rendementBeleggingen: number;
  rendementEsVastgoed: number;
  rendementSchulden: number;
  rendementSchuldenNL: number;
  rendementSchuldenES: number;
  belastbareGrondslag: number;
  box3InkomenBruto: number;
  spaansRendementVastgoed: number;
  spaansRendementHypotheek: number;
  spaansRendementNetto: number;
  box3InkomenNetto: number;
  belasting: number;
}

const RATES = {
  2024: {
    vrijstelling: 57797,
    spaargeld: 1.03,
    beleggingen: 6.04,
    schulden: 2.47,
    schuldenDrempel: 3700,
    belastingPercentage: 36,
  },
  2025: {
    vrijstelling: 57684,
    spaargeld: 1.44,
    beleggingen: 5.88,
    schulden: 2.62,
    schuldenDrempel: 3800,
    belastingPercentage: 36,
  },
};

const calculateScenario = (
  taxYear: "2024" | "2025",
  fiscalPartner: boolean,
  nlSpaargeld: number,
  nlBeleggingen: number,
  nlSchulden: number,
  esVastgoed: number = 0,
  esHypotheek: number = 0,
  customRates?: { spaargeld: number; beleggingen: number; schulden: number },
  customThresholds?: { schuldenDrempel: number; vrijstelling: number }
): ScenarioResult => {
  const baseRates = RATES[taxYear];
  const rates = customRates 
    ? { ...baseRates, ...customRates }
    : baseRates;
  
  const thresholds = customThresholds || { 
    schuldenDrempel: rates.schuldenDrempel, 
    vrijstelling: rates.vrijstelling 
  };
  
  const debtThreshold = thresholds.schuldenDrempel * (fiscalPartner ? 2 : 1);
  const totalDebtsCalc = nlSchulden + esHypotheek;
  const deductibleDebts = totalDebtsCalc > debtThreshold ? totalDebtsCalc - debtThreshold : 0;
  
  const totalAssets = nlSpaargeld + nlBeleggingen + esVastgoed;
  const rendementsgrondslag = totalAssets - deductibleDebts;
  
  const rendementSpaargeld = nlSpaargeld * (rates.spaargeld / 100);
  const rendementBeleggingen = nlBeleggingen * (rates.beleggingen / 100);
  const rendementEsVastgoed = esVastgoed * (rates.beleggingen / 100);
  
  // Bereken NL en ES schulden rendement apart
  // De schuldendrempel wordt afgetrokken van totale schulden, dan proportioneel verdeeld
  const totalSchuldenRaw = nlSchulden + esHypotheek;
  
  let rendementSchuldenNL = 0;
  let rendementSchuldenES = 0;
  
  if (deductibleDebts > 0 && totalSchuldenRaw > 0) {
    // Verdeel aftrekbare schulden proportioneel
    const nlRatio = nlSchulden / totalSchuldenRaw;
    const esRatio = esHypotheek / totalSchuldenRaw;
    
    const deductibleNL = deductibleDebts * nlRatio;
    const deductibleES = deductibleDebts * esRatio;
    
    rendementSchuldenNL = deductibleNL * (rates.schulden / 100);
    rendementSchuldenES = deductibleES * (rates.schulden / 100);
  }
  
  const rendementSchulden = rendementSchuldenNL + rendementSchuldenES;
  
  const forfaitairRendement = rendementSpaargeld + rendementBeleggingen + rendementEsVastgoed - rendementSchulden;
  
  const vrijstelling = thresholds.vrijstelling * (fiscalPartner ? 2 : 1);
  const belastbareGrondslag = Math.max(0, rendementsgrondslag - vrijstelling);
  
  const effectiefRendementPercentage = rendementsgrondslag > 0 ? (forfaitairRendement / rendementsgrondslag) : 0;
  const box3InkomenBruto = belastbareGrondslag * effectiefRendementPercentage;
  
  const spaansRendementVastgoed = esVastgoed * (rates.beleggingen / 100);
  const spaansRendementHypotheek = esHypotheek * (rates.schulden / 100);
  const spaansRendementNetto = spaansRendementVastgoed - spaansRendementHypotheek;
  const box3InkomenNetto = box3InkomenBruto - spaansRendementNetto;
  
  const belasting = Math.max(0, box3InkomenNetto * (rates.belastingPercentage / 100));
  
  return {
    totalAssets,
    totalDebts: deductibleDebts,
    rendementsgrondslag,
    forfaitairRendement,
    rendementSpaargeld,
    rendementBeleggingen,
    rendementEsVastgoed,
    rendementSchulden,
    rendementSchuldenNL,
    rendementSchuldenES,
    belastbareGrondslag,
    box3InkomenBruto,
    spaansRendementVastgoed,
    spaansRendementHypotheek,
    spaansRendementNetto,
    box3InkomenNetto,
    belasting,
  };
};

interface ScenarioInputs {
  spaargeld: number;
  beleggingen: number;
  schuldenNL: number;
  vastgoedES: number;
  hypotheekES: number;
}

export function DashboardBox3Calculator() {
  const { trackCalculator } = useCalculatorTracking();
  const [hasCalculated, setHasCalculated] = useState(false);
  const selectedYear = "2025"; // Alleen 2025 berekeningen
  const [hasFiscalPartner, setHasFiscalPartner] = useState(false);
  
  const [scenarioA, setScenarioA] = useState<ScenarioInputs>({
    spaargeld: 300000,
    beleggingen: 600000,
    schuldenNL: 200000,
    vastgoedES: 0,
    hypotheekES: 0,
  });
  
  const [scenarioB, setScenarioB] = useState<ScenarioInputs>({
    spaargeld: 300000,
    beleggingen: 300000,
    schuldenNL: 200000,
    vastgoedES: 300000,
    hypotheekES: 0,
  });
  
  const rates = RATES[selectedYear];
  
  const [useCustomRates, setUseCustomRates] = useState(false);
  const [customSpaargeldRate, setCustomSpaargeldRate] = useState(rates.spaargeld);
  const [customBeleggingenRate, setCustomBeleggingenRate] = useState(rates.beleggingen);
  const [customSchuldenRate, setCustomSchuldenRate] = useState(rates.schulden);
  
  const [useCustomThresholds, setUseCustomThresholds] = useState(false);
  const [customSchuldenDrempel, setCustomSchuldenDrempel] = useState(rates.schuldenDrempel);
  const [customVrijstelling, setCustomVrijstelling] = useState(rates.vrijstelling);
  
  useEffect(() => {
    const newRates = RATES[selectedYear];
    setCustomSpaargeldRate(newRates.spaargeld);
    setCustomBeleggingenRate(newRates.beleggingen);
    setCustomSchuldenRate(newRates.schulden);
    setCustomSchuldenDrempel(newRates.schuldenDrempel);
    setCustomVrijstelling(newRates.vrijstelling);
  }, []);
  
  const activeRates = useCustomRates 
    ? { spaargeld: customSpaargeldRate, beleggingen: customBeleggingenRate, schulden: customSchuldenRate }
    : undefined;
  
  const activeThresholds = useCustomThresholds
    ? { schuldenDrempel: customSchuldenDrempel, vrijstelling: customVrijstelling }
    : undefined;
  
  const resultA = calculateScenario(
    selectedYear, 
    hasFiscalPartner, 
    scenarioA.spaargeld, 
    scenarioA.beleggingen, 
    scenarioA.schuldenNL, 
    0, 
    0, 
    activeRates, 
    activeThresholds
  );
  
  const resultB = calculateScenario(
    selectedYear, 
    hasFiscalPartner, 
    scenarioB.spaargeld, 
    scenarioB.beleggingen, 
    scenarioB.schuldenNL, 
    scenarioB.vastgoedES, 
    scenarioB.hypotheekES, 
    activeRates, 
    activeThresholds
  );
  
  const besparing = resultA.belasting - resultB.belasting;
  
  const handleCalculate = () => {
    setHasCalculated(true);
    trackCalculator("box3", {
      tax_year: selectedYear,
      fiscal_partner: hasFiscalPartner,
      scenario_a_total: scenarioA.spaargeld + scenarioA.beleggingen - scenarioA.schuldenNL,
      scenario_b_total: scenarioB.spaargeld + scenarioB.beleggingen + scenarioB.vastgoedES - scenarioB.schuldenNL - scenarioB.hypotheekES,
      spanish_property_value: scenarioB.vastgoedES,
      spanish_mortgage: scenarioB.hypotheekES,
    }, {
      scenario_a_tax: resultA.belasting,
      scenario_b_tax: resultB.belasting,
      yearly_savings: besparing,
    });
  };
  
  return (
    <div className="space-y-6">
      {/* Compacte Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="flex-1">
          <h3 className="font-semibold">Box 3 Vermogensbelasting Calculator 2025</h3>
          <p className="text-sm text-muted-foreground">
            Bereken het effect van je Spaanse vastgoed op je Nederlandse Box 3 belasting
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="partner"
            checked={hasFiscalPartner}
            onCheckedChange={setHasFiscalPartner}
          />
          <Label htmlFor="partner" className="text-sm whitespace-nowrap">Fiscaal partner</Label>
        </div>
      </div>

      {/* Compacte Vermogensinvoer */}
      <Card>
        <CardHeader>
          <CardTitle>Vermogenspositie</CardTitle>
          <CardDescription>
            Vul je vermogen in voor beide scenario's
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium">Categorie</th>
                  <th className="text-left py-3 px-2 font-medium">
                    <div className="flex flex-col">
                      <span>Scenario A</span>
                      <span className="text-xs font-normal text-muted-foreground">Zonder Spaans vastgoed</span>
                    </div>
                  </th>
                  <th className="text-left py-3 px-2 font-medium">
                    <div className="flex flex-col">
                      <span>Scenario B</span>
                      <span className="text-xs font-normal text-muted-foreground">Met Spaans vastgoed</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-4 px-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Spaargeld</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Saldi op spaarrekeningen en betaalrekeningen</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </td>
                  <td className="py-4 px-2">
                    <CurrencyInput
                      value={scenarioA.spaargeld}
                      onChange={(val) => {
                        setHasCalculated(false);
                        setScenarioA({ ...scenarioA, spaargeld: val });
                      }}
                      className="max-w-[180px]"
                    />
                  </td>
                  <td className="py-4 px-2">
                    <CurrencyInput
                      value={scenarioB.spaargeld}
                      onChange={(val) => {
                        setHasCalculated(false);
                        setScenarioB({ ...scenarioB, spaargeld: val });
                      }}
                      className="max-w-[180px]"
                    />
                  </td>
                </tr>

                <tr className="border-b">
                  <td className="py-4 px-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Beleggingen</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Aandelen, obligaties, ETFs, etc.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </td>
                  <td className="py-4 px-2">
                    <CurrencyInput
                      value={scenarioA.beleggingen}
                      onChange={(val) => {
                        setHasCalculated(false);
                        setScenarioA({ ...scenarioA, beleggingen: val });
                      }}
                      className="max-w-[180px]"
                    />
                  </td>
                  <td className="py-4 px-2">
                    <CurrencyInput
                      value={scenarioB.beleggingen}
                      onChange={(val) => {
                        setHasCalculated(false);
                        setScenarioB({ ...scenarioB, beleggingen: val });
                      }}
                      className="max-w-[180px]"
                    />
                  </td>
                </tr>

                <tr className="border-b">
                  <td className="py-4 px-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">NL Schulden</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Nederlandse privéleningen (excl. eigen woning hypotheek)</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </td>
                  <td className="py-4 px-2">
                    <CurrencyInput
                      value={scenarioA.schuldenNL}
                      onChange={(val) => {
                        setHasCalculated(false);
                        setScenarioA({ ...scenarioA, schuldenNL: val });
                      }}
                      className="max-w-[180px]"
                    />
                  </td>
                  <td className="py-4 px-2">
                    <CurrencyInput
                      value={scenarioB.schuldenNL}
                      onChange={(val) => {
                        setHasCalculated(false);
                        setScenarioB({ ...scenarioB, schuldenNL: val });
                      }}
                      className="max-w-[180px]"
                    />
                  </td>
                </tr>

                <tr className="border-b bg-muted/30">
                  <td className="py-4 px-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">ES Vastgoed</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>WOZ-waarde van je Spaanse vastgoed</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </td>
                  <td className="py-4 px-2 text-muted-foreground">-</td>
                  <td className="py-4 px-2">
                    <CurrencyInput
                      value={scenarioB.vastgoedES}
                      onChange={(val) => {
                        setHasCalculated(false);
                        setScenarioB({ ...scenarioB, vastgoedES: val });
                      }}
                      className="max-w-[180px]"
                    />
                  </td>
                </tr>

                <tr className="border-b bg-muted/30">
                  <td className="py-4 px-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">ES Hypotheek</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Openstaande hypotheek op je Spaanse vastgoed</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </td>
                  <td className="py-4 px-2 text-muted-foreground">-</td>
                  <td className="py-4 px-2">
                    <CurrencyInput
                      value={scenarioB.hypotheekES}
                      onChange={(val) => {
                        setHasCalculated(false);
                        setScenarioB({ ...scenarioB, hypotheekES: val });
                      }}
                      className="max-w-[180px]"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Bereken Button */}
      <div className="flex justify-center">
        <Button 
          onClick={handleCalculate}
          size="lg"
          className="min-w-[200px]"
        >
          Bereken
        </Button>
      </div>

      {/* Results Section - Only shown after calculation */}
      {hasCalculated && (
        <>
          {/* Resultaat Banner */}
          <Card className={besparing > 0 ? "border-2 border-primary" : "border-2 border-muted"}>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-2">
                  {besparing > 0 ? (
                    <>
                      <TrendingDown className="h-6 w-6 text-primary" />
                      <h3 className="text-2xl font-bold">Jaarlijkse Besparing</h3>
                    </>
                  ) : (
                    <>
                      <Info className="h-6 w-6 text-muted-foreground" />
                      <h3 className="text-2xl font-bold">Geen belastingbesparing in dit scenario</h3>
                    </>
                  )}
                </div>
                <div className={`text-4xl font-bold ${besparing > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                  {formatCurrency(Math.abs(besparing))}
                </div>
                {besparing <= 0 && (
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Op basis van deze berekening levert Spaans vastgoed geen Box 3 voordeel op. Er zijn andere interessante manieren om je aankoop te structureren — neem gerust contact op voor persoonlijk advies.
                  </p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto pt-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="text-sm text-muted-foreground mb-1">Scenario A</div>
                    <div className={`text-xl font-semibold ${besparing > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {formatCurrency(resultA.belasting)}
                    </div>
                    <div className="text-xs text-muted-foreground">Box 3 belasting</div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="text-sm text-muted-foreground mb-1">Scenario B</div>
                    <div className={`text-xl font-semibold ${besparing > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                      {formatCurrency(resultB.belasting)}
                    </div>
                    <div className="text-xs text-muted-foreground">Box 3 belasting</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

      {/* Accordions voor Geavanceerde Opties */}
      <Accordion type="multiple" className="w-full">
        {/* Forfaitaire Rendementen */}
        <AccordionItem value="rates">
          <AccordionTrigger className="text-lg font-semibold">
            📊 Forfaitaire Rendementen Aanpassen
          </AccordionTrigger>
          <AccordionContent>
            <Card className="border-0 shadow-none">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-muted-foreground">
                    Pas de percentages aan om verschillende scenario's door te rekenen
                  </p>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="custom-rates" className="text-sm">Aangepaste percentages</Label>
                    <Switch
                      id="custom-rates"
                      checked={useCustomRates}
                      onCheckedChange={setUseCustomRates}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Spaargeld</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          value={useCustomRates ? customSpaargeldRate : rates.spaargeld}
                          onChange={(e) => setCustomSpaargeldRate(Number(e.target.value) || 0)}
                          disabled={!useCustomRates}
                          className="w-20 text-right h-9"
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                    </div>
                    <Slider
                      value={[useCustomRates ? customSpaargeldRate : rates.spaargeld]}
                      onValueChange={([v]) => setCustomSpaargeldRate(v)}
                      min={0}
                      max={10}
                      step={0.01}
                      disabled={!useCustomRates}
                    />
                    <p className="text-xs text-muted-foreground">
                      Standaard 2025: {rates.spaargeld}%
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Beleggingen</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          value={useCustomRates ? customBeleggingenRate : rates.beleggingen}
                          onChange={(e) => setCustomBeleggingenRate(Number(e.target.value) || 0)}
                          disabled={!useCustomRates}
                          className="w-20 text-right h-9"
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                    </div>
                    <Slider
                      value={[useCustomRates ? customBeleggingenRate : rates.beleggingen]}
                      onValueChange={([v]) => setCustomBeleggingenRate(v)}
                      min={0}
                      max={15}
                      step={0.01}
                      disabled={!useCustomRates}
                    />
                    <p className="text-xs text-muted-foreground">
                      Standaard 2025: {rates.beleggingen}%
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Schulden</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          value={useCustomRates ? customSchuldenRate : rates.schulden}
                          onChange={(e) => setCustomSchuldenRate(Number(e.target.value) || 0)}
                          disabled={!useCustomRates}
                          className="w-20 text-right h-9"
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                    </div>
                    <Slider
                      value={[useCustomRates ? customSchuldenRate : rates.schulden]}
                      onValueChange={([v]) => setCustomSchuldenRate(v)}
                      min={0}
                      max={10}
                      step={0.01}
                      disabled={!useCustomRates}
                    />
                    <p className="text-xs text-muted-foreground">
                      Standaard 2025: {rates.schulden}%
                    </p>
                  </div>
                </div>

                {useCustomRates && (
                  <Alert className="mt-4">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Je gebruikt aangepaste percentages. Alle berekeningen zijn gebaseerd op deze waarden.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* Drempels & Vrijstelling */}
        <AccordionItem value="thresholds">
          <AccordionTrigger className="text-lg font-semibold">
            ⚙️ Drempels & Vrijstelling Aanpassen
          </AccordionTrigger>
          <AccordionContent>
            <Card className="border-0 shadow-none">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-muted-foreground">
                    Pas de schuldendrempel en heffingsvrije vermogen aan
                  </p>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="custom-thresholds" className="text-sm">Aangepaste waardes</Label>
                    <Switch
                      id="custom-thresholds"
                      checked={useCustomThresholds}
                      onCheckedChange={setUseCustomThresholds}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Schuldendrempel</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="100"
                          value={useCustomThresholds ? customSchuldenDrempel : rates.schuldenDrempel}
                          onChange={(e) => setCustomSchuldenDrempel(Number(e.target.value) || 0)}
                          disabled={!useCustomThresholds}
                          className="w-28 text-right h-9"
                        />
                      </div>
                    </div>
                    <Slider
                      value={[useCustomThresholds ? customSchuldenDrempel : rates.schuldenDrempel]}
                      onValueChange={([v]) => setCustomSchuldenDrempel(v)}
                      min={0}
                      max={10000}
                      step={100}
                      disabled={!useCustomThresholds}
                    />
                    <p className="text-xs text-muted-foreground">
                      Standaard 2025: {formatCurrency(rates.schuldenDrempel)}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Heffingsvrij vermogen</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="1000"
                          value={useCustomThresholds ? customVrijstelling : rates.vrijstelling}
                          onChange={(e) => setCustomVrijstelling(Number(e.target.value) || 0)}
                          disabled={!useCustomThresholds}
                          className="w-28 text-right h-9"
                        />
                      </div>
                    </div>
                    <Slider
                      value={[useCustomThresholds ? customVrijstelling : rates.vrijstelling]}
                      onValueChange={([v]) => setCustomVrijstelling(v)}
                      min={0}
                      max={100000}
                      step={1000}
                      disabled={!useCustomThresholds}
                    />
                    <p className="text-xs text-muted-foreground">
                      Standaard 2025: {formatCurrency(rates.vrijstelling)}
                    </p>
                  </div>
                </div>

                {useCustomThresholds && (
                  <Alert className="mt-4">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Je gebruikt aangepaste drempels{hasFiscalPartner ? " (× 2 voor fiscaal partners)" : ""}.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* Gedetailleerde Berekening */}
        <AccordionItem value="calculation">
          <AccordionTrigger className="text-lg font-semibold">
            📋 Gedetailleerde Berekening Bekijken
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
              {/* Scenario A */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Scenario A</CardTitle>
                  <CardDescription>Zonder Spaans vastgoed</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Totaal bezittingen:</span>
                    <span className="font-medium">{formatCurrency(resultA.totalAssets)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Aftrekbare schulden:</span>
                    <span className="font-medium">{formatCurrency(resultA.totalDebts)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="font-semibold">Grondslag:</span>
                    <span className="font-semibold">{formatCurrency(resultA.rendementsgrondslag)}</span>
                  </div>

                  <div className="bg-muted/50 p-3 rounded-lg space-y-1.5 mt-2">
                    <div className="font-medium text-xs mb-2">Forfaitair rendement:</div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Spaargeld:</span>
                      <span>{formatCurrency(resultA.rendementSpaargeld)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Beleggingen:</span>
                      <span>{formatCurrency(resultA.rendementBeleggingen)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Schulden:</span>
                      <span>-{formatCurrency(resultA.rendementSchulden)}</span>
                    </div>
                    <div className="flex justify-between text-xs pt-1.5 border-t">
                      <span className="font-semibold">Totaal:</span>
                      <span className="font-semibold">{formatCurrency(resultA.forfaitairRendement)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vrijstelling:</span>
                    <span>-{formatCurrency((useCustomThresholds ? customVrijstelling : rates.vrijstelling) * (hasFiscalPartner ? 2 : 1))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Box 3 inkomen:</span>
                    <span>{formatCurrency(resultA.box3InkomenNetto)}</span>
                  </div>
                  <div className="flex justify-between pt-3 border-t">
                    <span className="font-bold">Te betalen ({rates.belastingPercentage}%):</span>
                    <span className="font-bold text-destructive">{formatCurrency(resultA.belasting)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Scenario B */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Scenario B</CardTitle>
                  <CardDescription>Met Spaans vastgoed</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Totaal bezittingen:</span>
                    <span className="font-medium">{formatCurrency(resultB.totalAssets)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Aftrekbare schulden:</span>
                    <span className="font-medium">{formatCurrency(resultB.totalDebts)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="font-semibold">Grondslag:</span>
                    <span className="font-semibold">{formatCurrency(resultB.rendementsgrondslag)}</span>
                  </div>

                  <div className="bg-muted/50 p-3 rounded-lg space-y-1.5 mt-2">
                    <div className="font-medium text-xs mb-2">Forfaitair rendement:</div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Spaargeld:</span>
                      <span>{formatCurrency(resultB.rendementSpaargeld)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Beleggingen:</span>
                      <span>{formatCurrency(resultB.rendementBeleggingen)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">ES Vastgoed:</span>
                      <span>{formatCurrency(resultB.rendementEsVastgoed)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Schulden NL:</span>
                      <span>-{formatCurrency(resultB.rendementSchuldenNL)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Schulden ES:</span>
                      <span>-{formatCurrency(resultB.rendementSchuldenES)}</span>
                    </div>
                    <div className="flex justify-between text-xs pt-1.5 border-t">
                      <span className="font-semibold">Totaal:</span>
                      <span className="font-semibold">{formatCurrency(resultB.forfaitairRendement)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vrijstelling:</span>
                    <span>-{formatCurrency((useCustomThresholds ? customVrijstelling : rates.vrijstelling) * (hasFiscalPartner ? 2 : 1))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Box 3 inkomen bruto:</span>
                    <span>{formatCurrency(resultB.box3InkomenBruto)}</span>
                  </div>
                  <div className="bg-primary/10 p-2 rounded space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Spaans rendement (vrijgesteld):</span>
                      <span className="text-primary font-medium">-{formatCurrency(resultB.spaansRendementNetto)}</span>
                    </div>
                    <div className="flex justify-between text-xs pl-4">
                      <span className="text-muted-foreground">• ES Vastgoed rendement:</span>
                      <span>{formatCurrency(resultB.spaansRendementVastgoed)}</span>
                    </div>
                    <div className="flex justify-between text-xs pl-4">
                      <span className="text-muted-foreground">• ES Hypotheek rendement:</span>
                      <span>-{formatCurrency(resultB.spaansRendementHypotheek)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Box 3 inkomen netto:</span>
                    <span>{formatCurrency(resultB.box3InkomenNetto)}</span>
                  </div>
                  <div className="flex justify-between pt-3 border-t">
                    <span className="font-bold">Te betalen ({rates.belastingPercentage}%):</span>
                    <span className="font-bold text-primary">{formatCurrency(resultB.belasting)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Alert className="mt-4">
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Progressievoorbehoud:</strong> Door het belastingverdrag tussen Nederland en Spanje wordt het rendement 
                op Spaans vastgoed vrijgesteld van Box 3 belasting, maar wel meegenomen in de grondslag voor het bepalen van 
                het tarief (progressievoorbehoud). Dit zorgt ervoor dat je effectief minder Box 3 belasting betaalt.
              </AlertDescription>
            </Alert>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
        </>
      )}
    </div>
  );
}