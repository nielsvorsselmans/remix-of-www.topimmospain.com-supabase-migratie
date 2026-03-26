import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Info, TrendingDown, Calculator, RefreshCw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { SignupDialog } from "@/components/SignupDialog";
import { useCalculatorTracking } from "@/hooks/useTrackCalculator";
import { trackEvent } from "@/lib/tracking";
import larsProfile from "@/assets/lars-profile.webp";

const formatCurrencyLocal = (amount: number): string => {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

interface ScenarioResult {
  totalAssets: number;
  totalDebts: number;
  rendementsgrondslag: number;
  forfaitairRendement: number;
  rendementSpaargeld: number;
  rendementBeleggingen: number;
  rendementEsVastgoed: number;
  rendementSchulden: number;
  belastbareGrondslag: number;
  box3InkomenBruto: number;
  spaansRendementVastgoed: number;
  spaansRendementHypotheek: number;
  spaansRendementNetto: number;
  box3InkomenNetto: number;
  belasting: number;
}

const RATES_2025 = {
  vrijstelling: 57684,
  spaargeld: 1.44,
  beleggingen: 5.88,
  schulden: 2.62,
  schuldenDrempel: 3800,
  belastingPercentage: 36,
};

const calculateScenario = (
  fiscalPartner: boolean,
  nlSpaargeld: number,
  nlBeleggingen: number,
  nlSchulden: number,
  esVastgoed: number = 0,
  esHypotheek: number = 0
): ScenarioResult => {
  const rates = RATES_2025;
  
  const debtThreshold = rates.schuldenDrempel * (fiscalPartner ? 2 : 1);
  const totalDebtsCalc = nlSchulden + esHypotheek;
  const deductibleDebts = totalDebtsCalc > debtThreshold ? totalDebtsCalc - debtThreshold : 0;
  
  const totalAssets = nlSpaargeld + nlBeleggingen + esVastgoed;
  const rendementsgrondslag = totalAssets - deductibleDebts;
  
  const rendementSpaargeld = nlSpaargeld * (rates.spaargeld / 100);
  const rendementBeleggingen = nlBeleggingen * (rates.beleggingen / 100);
  const rendementEsVastgoed = esVastgoed * (rates.beleggingen / 100);
  const rendementSchulden = deductibleDebts * (rates.schulden / 100);
  
  const forfaitairRendement = rendementSpaargeld + rendementBeleggingen + rendementEsVastgoed - rendementSchulden;
  
  const vrijstelling = rates.vrijstelling * (fiscalPartner ? 2 : 1);
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
    belastbareGrondslag,
    box3InkomenBruto,
    spaansRendementVastgoed,
    spaansRendementHypotheek,
    spaansRendementNetto,
    box3InkomenNetto,
    belasting,
  };
};

// Default example scenario
const DEFAULT_SCENARIO_A = {
  spaargeld: 300000,
  beleggingen: 600000,
  schuldenNL: 200000,
  vastgoedES: 0,
  hypotheekES: 0,
};

const DEFAULT_SCENARIO_B = {
  spaargeld: 300000,
  beleggingen: 300000,
  schuldenNL: 200000,
  vastgoedES: 300000,
  hypotheekES: 0,
};

// Calculate default results once
const DEFAULT_RESULT_A = calculateScenario(
  false,
  DEFAULT_SCENARIO_A.spaargeld,
  DEFAULT_SCENARIO_A.beleggingen,
  DEFAULT_SCENARIO_A.schuldenNL,
  0,
  0
);

const DEFAULT_RESULT_B = calculateScenario(
  false,
  DEFAULT_SCENARIO_B.spaargeld,
  DEFAULT_SCENARIO_B.beleggingen,
  DEFAULT_SCENARIO_B.schuldenNL,
  DEFAULT_SCENARIO_B.vastgoedES,
  DEFAULT_SCENARIO_B.hypotheekES
);

export function PublicBox3Calculator() {
  const { trackCalculator } = useCalculatorTracking();
  const { user } = useAuth();
  const [showSignup, setShowSignup] = useState(false);
  const [hasFiscalPartner, setHasFiscalPartner] = useState(false);
  
  // Input state (editable by everyone)
  const [scenarioA, setScenarioA] = useState(DEFAULT_SCENARIO_A);
  const [scenarioB, setScenarioB] = useState(DEFAULT_SCENARIO_B);
  
  // Calculated results state (only updated after "Herbereken" click)
  const [calculatedResultA, setCalculatedResultA] = useState<ScenarioResult | null>(null);
  const [calculatedResultB, setCalculatedResultB] = useState<ScenarioResult | null>(null);
  const [hasCalculated, setHasCalculated] = useState(false);
  
  // Display results: use calculated results if available, otherwise default
  const resultA = calculatedResultA || DEFAULT_RESULT_A;
  const resultB = calculatedResultB || DEFAULT_RESULT_B;
  const besparing = resultA.belasting - resultB.belasting;
  
  const handleCalculate = () => {
    if (!user) {
      // Not logged in: open signup dialog
      trackEvent("calculator_upgrade_click", { calculator_type: "box3" });
      setShowSignup(true);
      return;
    }
    
    // Logged in: perform calculation
    const newResultA = calculateScenario(
      hasFiscalPartner,
      scenarioA.spaargeld,
      scenarioA.beleggingen,
      scenarioA.schuldenNL,
      0,
      0
    );
    
    const newResultB = calculateScenario(
      hasFiscalPartner,
      scenarioB.spaargeld,
      scenarioB.beleggingen,
      scenarioB.schuldenNL,
      scenarioB.vastgoedES,
      scenarioB.hypotheekES
    );
    
    setCalculatedResultA(newResultA);
    setCalculatedResultB(newResultB);
    setHasCalculated(true);
    
    // Track calculator usage
    trackCalculator("box3", {
      fiscal_partner: hasFiscalPartner,
      scenario_a_total: scenarioA.spaargeld + scenarioA.beleggingen - scenarioA.schuldenNL,
      scenario_b_total: scenarioB.spaargeld + scenarioB.beleggingen + scenarioB.vastgoedES - scenarioB.schuldenNL - scenarioB.hypotheekES,
      spanish_property_value: scenarioB.vastgoedES,
      spanish_mortgage: scenarioB.hypotheekES,
    }, {
      scenario_a_tax: newResultA.belasting,
      scenario_b_tax: newResultB.belasting,
      yearly_savings: newResultA.belasting - newResultB.belasting,
    });
  };
  
  return (
    <div className="space-y-6">
      {/* Results Summary - Always visible */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Resultaat {hasCalculated ? "Jouw Berekening" : "Voorbeeldberekening"} 2025
            </CardTitle>
            {!hasCalculated && (
              <Badge variant="secondary" className="text-xs">
                Voorbeeldberekening
              </Badge>
            )}
          </div>
          <CardDescription>
            {hasCalculated 
              ? "Op basis van jouw ingevoerde vermogenspositie"
              : "Vergelijking: €900.000 vermogen zonder vs. met €300.000 Spaans vastgoed"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Scenario A: Zonder Spaans vastgoed</p>
              <p className="text-2xl font-bold">{formatCurrencyLocal(resultA.belasting)}</p>
              <p className="text-xs text-muted-foreground">Box 3 belasting per jaar</p>
            </div>
            
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Scenario B: Met Spaans vastgoed</p>
              <p className="text-2xl font-bold">{formatCurrencyLocal(resultB.belasting)}</p>
              <p className="text-xs text-muted-foreground">Box 3 belasting per jaar</p>
            </div>
            
            <div className="text-center p-4 bg-primary/10 rounded-lg border border-primary/20">
              <p className="text-sm text-muted-foreground mb-1">Jaarlijkse Besparing</p>
              <p className="text-3xl font-bold text-primary flex items-center justify-center gap-2">
                <TrendingDown className="h-6 w-6" />
                {formatCurrencyLocal(besparing)}
              </p>
              <p className="text-xs text-muted-foreground">minder belasting</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calculator Inputs - Freely editable */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Vermogenspositie Invoeren</CardTitle>
              <CardDescription>
                Pas de bedragen aan en klik op "Herbereken" om je eigen situatie te berekenen
              </CardDescription>
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
                    <Input
                      type="text"
                      value={formatCurrencyLocal(scenarioA.spaargeld)}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^\d]/g, '');
                        setScenarioA({ ...scenarioA, spaargeld: Number(value) || 0 });
                      }}
                      className="max-w-[180px]"
                    />
                  </td>
                  <td className="py-4 px-2">
                    <Input
                      type="text"
                      value={formatCurrencyLocal(scenarioB.spaargeld)}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^\d]/g, '');
                        setScenarioB({ ...scenarioB, spaargeld: Number(value) || 0 });
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
                    <Input
                      type="text"
                      value={formatCurrencyLocal(scenarioA.beleggingen)}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^\d]/g, '');
                        setScenarioA({ ...scenarioA, beleggingen: Number(value) || 0 });
                      }}
                      className="max-w-[180px]"
                    />
                  </td>
                  <td className="py-4 px-2">
                    <Input
                      type="text"
                      value={formatCurrencyLocal(scenarioB.beleggingen)}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^\d]/g, '');
                        setScenarioB({ ...scenarioB, beleggingen: Number(value) || 0 });
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
                    <Input
                      type="text"
                      value={formatCurrencyLocal(scenarioA.schuldenNL)}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^\d]/g, '');
                        setScenarioA({ ...scenarioA, schuldenNL: Number(value) || 0 });
                      }}
                      className="max-w-[180px]"
                    />
                  </td>
                  <td className="py-4 px-2">
                    <Input
                      type="text"
                      value={formatCurrencyLocal(scenarioB.schuldenNL)}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^\d]/g, '');
                        setScenarioB({ ...scenarioB, schuldenNL: Number(value) || 0 });
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
                    <Input
                      type="text"
                      value={formatCurrencyLocal(scenarioB.vastgoedES)}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^\d]/g, '');
                        setScenarioB({ ...scenarioB, vastgoedES: Number(value) || 0 });
                      }}
                      className="max-w-[180px]"
                    />
                  </td>
                </tr>

                <tr className="bg-muted/30">
                  <td className="py-4 px-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">ES Hypotheek</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Hypotheekschuld op je Spaanse vastgoed</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </td>
                  <td className="py-4 px-2 text-muted-foreground">-</td>
                  <td className="py-4 px-2">
                    <Input
                      type="text"
                      value={formatCurrencyLocal(scenarioB.hypotheekES)}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^\d]/g, '');
                        setScenarioB({ ...scenarioB, hypotheekES: Number(value) || 0 });
                      }}
                      className="max-w-[180px]"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div className="mt-6 flex justify-center">
            <Button onClick={handleCalculate} size="lg" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Herbereken
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Explanation */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Let op:</strong> Deze berekening is indicatief en gebaseerd op de forfaitaire rendementen van 2025. 
          De werkelijke belasting kan afwijken op basis van je persoonlijke situatie. 
          Raadpleeg altijd een belastingadviseur voor definitief advies.
        </AlertDescription>
      </Alert>

      <SignupDialog 
        open={showSignup} 
        onOpenChange={setShowSignup}
        onSuccess={handleCalculate}
      />
    </div>
  );
}
