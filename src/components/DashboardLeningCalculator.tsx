import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { 
  Info, Landmark, Home, Euro, AlertTriangle, CheckCircle2, Calculator, 
  HelpCircle, XCircle, Calendar, PiggyBank, Wallet, ArrowRight
} from "lucide-react";
import { useCalculatorTracking } from "@/hooks/useTrackCalculator";
import { Link } from "react-router-dom";
import { formatCurrency } from "@/lib/utils";

// Helper: Calculate max loan from monthly payment (reverse annuity formula)
const calculateMaxLoanFromPayment = (
  maxMonthlyPayment: number,
  annualRate: number,
  termYears: number
): number => {
  if (maxMonthlyPayment <= 0 || termYears <= 0) return 0;
  const monthlyRate = annualRate / 100 / 12;
  const n = termYears * 12;
  if (monthlyRate === 0) return maxMonthlyPayment * n;
  return maxMonthlyPayment * ((1 - Math.pow(1 + monthlyRate, -n)) / monthlyRate);
};

type HomeCountry = "nl" | "be";
type PropertyType = "nieuwbouw" | "bestaand";

const calculateMonthlyPayment = (
  principal: number,
  annualRate: number,
  termYears: number,
  isInterestOnly: boolean = false
): number => {
  if (principal <= 0) return 0;
  const monthlyRate = annualRate / 100 / 12;
  const numPayments = termYears * 12;

  if (isInterestOnly) {
    return principal * monthlyRate;
  }

  if (monthlyRate === 0) return principal / numPayments;
  return (principal * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
    (Math.pow(1 + monthlyRate, numPayments) - 1);
};

const calculateTotalInterest = (
  principal: number,
  annualRate: number,
  termYears: number,
  isInterestOnly: boolean = false
): number => {
  if (principal <= 0) return 0;
  const monthlyPayment = calculateMonthlyPayment(principal, annualRate, termYears, isInterestOnly);
  const totalPaid = monthlyPayment * termYears * 12;

  if (isInterestOnly) {
    return totalPaid;
  }
  return totalPaid - principal;
};

// Calculate purchase costs based on property type
const calculatePurchaseCosts = (price: number, type: PropertyType, itpRate: number = 7.75) => {
  const btwOrItp = type === "nieuwbouw" ? price * 0.10 : price * (itpRate / 100);
  const ajd = type === "nieuwbouw" ? price * 0.015 : 0;
  const advocaat = price * 0.01 * 1.21;
  const fixedCosts = 2000 + 800 + 700 + 300 + 200 + 250 + 20;
  return {
    btwOrItp,
    ajd,
    advocaat,
    fixedCosts,
    total: Math.round(btwOrItp + ajd + advocaat + fixedCosts),
  };
};

interface AutoScenario {
  id: string;
  name: string;
  description: string;
  isFeasible: boolean;
  spainLoan: number;
  homeLoanAnnuity: number;
  homeLoanInterestOnly: number;
  totalLoan: number;
  equityRequired: number;
  monthlyPayment: number;
  totalInterest: number;
  recommendation?: string;
}

export function DashboardLeningCalculator() {
  const { trackCalculator } = useCalculatorTracking();
  // Property inputs
  const [propertyPrice, setPropertyPrice] = useState(300000);
  const [homeCountry, setHomeCountry] = useState<HomeCountry>("nl");
  const [propertyType, setPropertyType] = useState<PropertyType>("nieuwbouw");
  
  // Financial situation
  const [monthlyIncome, setMonthlyIncome] = useState(4000);
  const [currentMonthlyExpenses, setCurrentMonthlyExpenses] = useState(0);
  const [age, setAge] = useState(45);
  
  // Available capital (NEW: added availableSavings)
  const [availableSavings, setAvailableSavings] = useState(50000);
  const [homeEquity, setHomeEquity] = useState(100000);
  const [homePropertyValue, setHomePropertyValue] = useState(400000);
  
  // Selected scenario and custom configuration
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [customSpainLoan, setCustomSpainLoan] = useState(0);
  const [customHomeLoanAnnuity, setCustomHomeLoanAnnuity] = useState(0);
  const [customHomeLoanInterestOnly, setCustomHomeLoanInterestOnly] = useState(0);
  
  // Adjustable rates (with defaults)
  const [spainRate, setSpainRate] = useState(3.5);
  const [homeRateAnnuity, setHomeRateAnnuity] = useState(5.0);
  const [homeRateInterestOnly, setHomeRateInterestOnly] = useState(5.5);
  
  // Adjustable loan terms (with intelligent defaults based on age)
  const maxTermFromAge = Math.min(30, Math.max(10, 75 - age));
  const [spainTermYears, setSpainTermYears] = useState(Math.min(25, maxTermFromAge));
  const [homeTermYears, setHomeTermYears] = useState(Math.min(30, maxTermFromAge));
  
  // Update terms when age changes
  useEffect(() => {
    const newMaxTerm = Math.min(30, Math.max(10, 75 - age));
    if (spainTermYears > newMaxTerm) setSpainTermYears(Math.min(25, newMaxTerm));
    if (homeTermYears > newMaxTerm) setHomeTermYears(newMaxTerm);
  }, [age]);
  
  // Calculate purchase costs
  const calculatedCosts = useMemo(() => calculatePurchaseCosts(propertyPrice, propertyType), [propertyPrice, propertyType]);
  const purchaseCosts = calculatedCosts.total;
  const totalInvestment = propertyPrice + purchaseCosts;
  
  // Max refinanceable from home (80% LTV assumption - banks typically don't refinance 100%)
  const maxRefinanceableLTV = 0.80;
  const maxRefinanceableFromHome = Math.min(homeEquity, homePropertyValue * maxRefinanceableLTV);
  
  // Total available equity (savings + refinanceable home equity)
  const totalAvailableEquity = availableSavings + maxRefinanceableFromHome;

  // Calculate loan capacity
  const loanCapacity = useMemo(() => {
    const grossMaxMonthlyPayment = monthlyIncome * 0.35;
    const availableMonthlyPayment = Math.max(0, grossMaxMonthlyPayment - currentMonthlyExpenses);
    
    // Max loan from income (Spain)
    const maxLoanFromIncomeSpain = calculateMaxLoanFromPayment(
      availableMonthlyPayment,
      spainRate,
      spainTermYears
    );
    
    // Max loan from income (Home country)
    const maxLoanFromIncomeHome = calculateMaxLoanFromPayment(
      availableMonthlyPayment,
      homeRateAnnuity,
      homeTermYears
    );
    
    // Max loan from LTV (Spain: 70% for non-residents)
    const maxLoanFromLTV = propertyPrice * 0.7;
    
    // Max interest-only loan (NL: 50% of property value, BE: 40%), capped at refinanceable equity
    const maxInterestOnlyLoan = homeCountry === "nl" 
      ? Math.min(homePropertyValue * 0.5, maxRefinanceableFromHome)
      : Math.min(homePropertyValue * 0.4, maxRefinanceableFromHome);
    
    // Effective maximum Spain loan
    const effectiveMaxSpainLoan = Math.min(maxLoanFromIncomeSpain, maxLoanFromLTV);
    
    return {
      grossMaxMonthlyPayment,
      availableMonthlyPayment,
      maxLoanFromIncomeSpain,
      maxLoanFromIncomeHome,
      maxLoanFromLTV,
      maxInterestOnlyLoan,
      effectiveMaxSpainLoan,
    };
  }, [monthlyIncome, currentMonthlyExpenses, maxRefinanceableFromHome, propertyPrice, homePropertyValue, homeCountry, spainRate, homeRateAnnuity, spainTermYears, homeTermYears]);

  // Auto-generate 4 scenarios
  const autoScenarios = useMemo((): AutoScenario[] => {
    const scenarios: AutoScenario[] = [];
    const countryLabel = homeCountry === "nl" ? "NL" : "BE";
    
    // SCENARIO A: 100% Spanje (70% LTV)
    const spainLoanA = Math.min(loanCapacity.effectiveMaxSpainLoan, totalInvestment);
    const equityRequiredA = totalInvestment - spainLoanA;
    const monthlyA = calculateMonthlyPayment(spainLoanA, spainRate, spainTermYears);
    const interestA = calculateTotalInterest(spainLoanA, spainRate, spainTermYears);
    
    scenarios.push({
      id: "spain",
      name: "100% Spanje",
      description: "Maximaal lenen via Spaanse hypotheek (70% LTV)",
      isFeasible: equityRequiredA <= totalAvailableEquity,
      spainLoan: spainLoanA,
      homeLoanAnnuity: 0,
      homeLoanInterestOnly: 0,
      totalLoan: spainLoanA,
      equityRequired: equityRequiredA,
      monthlyPayment: monthlyA,
      totalInterest: interestA,
      recommendation: equityRequiredA > totalAvailableEquity 
        ? `Tekort: ${formatCurrency(equityRequiredA - totalAvailableEquity)}`
        : equityRequiredA > 0 ? `Eigen inbreng: ${formatCurrency(equityRequiredA)}` : undefined,
    });

    // SCENARIO B: 100% Eigen Land (met aflossing)
    if (maxRefinanceableFromHome > 0) {
      const homeLoanB = Math.min(maxRefinanceableFromHome, totalInvestment, loanCapacity.maxLoanFromIncomeHome);
      const equityRequiredB = Math.max(0, totalInvestment - homeLoanB);
      const monthlyB = calculateMonthlyPayment(homeLoanB, homeRateAnnuity, homeTermYears);
      const interestB = calculateTotalInterest(homeLoanB, homeRateAnnuity, homeTermYears);
      
      scenarios.push({
        id: "home-annuity",
        name: `100% ${countryLabel} (aflossing)`,
        description: "Via overwaarde met volledige aflossing",
        isFeasible: equityRequiredB <= totalAvailableEquity,
        spainLoan: 0,
        homeLoanAnnuity: homeLoanB,
        homeLoanInterestOnly: 0,
        totalLoan: homeLoanB,
        equityRequired: equityRequiredB,
        monthlyPayment: monthlyB,
        totalInterest: interestB,
        recommendation: homeLoanB < totalInvestment 
          ? "Overweeg aflossingsvrij voor lagere maandlasten"
          : undefined,
      });
    }

    // SCENARIO C: 100% Eigen Land (deels aflossingsvrij)
    if (maxRefinanceableFromHome > 0 && homePropertyValue > 0) {
      const maxInterestOnly = Math.min(loanCapacity.maxInterestOnlyLoan, maxRefinanceableFromHome);
      const interestOnlyMonthly = calculateMonthlyPayment(maxInterestOnly, homeRateInterestOnly, homeTermYears, true);
      
      const remainingMonthlyCapacity = Math.max(0, loanCapacity.availableMonthlyPayment - interestOnlyMonthly);
      const annuityPartFromIncome = calculateMaxLoanFromPayment(remainingMonthlyCapacity, homeRateAnnuity, homeTermYears);
      const annuityPartFromEquity = Math.max(0, maxRefinanceableFromHome - maxInterestOnly);
      const annuityPart = Math.min(annuityPartFromIncome, annuityPartFromEquity, Math.max(0, totalInvestment - maxInterestOnly));
      
      const totalHomeLoanC = maxInterestOnly + annuityPart;
      const equityRequiredC = Math.max(0, totalInvestment - totalHomeLoanC);
      const monthlyAnnuityC = calculateMonthlyPayment(annuityPart, homeRateAnnuity, homeTermYears);
      const monthlyC = interestOnlyMonthly + monthlyAnnuityC;
      const interestC = (maxInterestOnly * homeRateInterestOnly / 100 * homeTermYears) + 
                       calculateTotalInterest(annuityPart, homeRateAnnuity, homeTermYears);
      
      scenarios.push({
        id: "home-mixed",
        name: `100% ${countryLabel} (deels aflossingsvrij)`,
        description: `${formatCurrency(maxInterestOnly)} aflossingsvrij + ${formatCurrency(annuityPart)} aflossing`,
        isFeasible: equityRequiredC <= totalAvailableEquity,
        spainLoan: 0,
        homeLoanAnnuity: annuityPart,
        homeLoanInterestOnly: maxInterestOnly,
        totalLoan: totalHomeLoanC,
        equityRequired: equityRequiredC,
        monthlyPayment: monthlyC,
        totalInterest: interestC,
        recommendation: "Lagere maandlasten door aflossingsvrij deel",
      });
    }

    // SCENARIO D: Gecombineerd
    if (maxRefinanceableFromHome > 0) {
      const spainLoanD = Math.min(loanCapacity.effectiveMaxSpainLoan, totalInvestment);
      const shortfall = Math.max(0, totalInvestment - spainLoanD);
      
      let homeLoanAnnuityD = 0;
      let homeLoanInterestOnlyD = 0;
      
      if (shortfall > 0) {
        const spainMonthly = calculateMonthlyPayment(spainLoanD, spainRate, spainTermYears);
        const remainingCapacity = Math.max(0, loanCapacity.availableMonthlyPayment - spainMonthly);
        
        const maxAnnuityFromIncome = calculateMaxLoanFromPayment(remainingCapacity, homeRateAnnuity, homeTermYears);
        homeLoanAnnuityD = Math.min(maxAnnuityFromIncome, maxRefinanceableFromHome, shortfall);
        
        const remainingShortfall = shortfall - homeLoanAnnuityD;
        if (remainingShortfall > 0) {
          homeLoanInterestOnlyD = Math.min(loanCapacity.maxInterestOnlyLoan, maxRefinanceableFromHome - homeLoanAnnuityD, remainingShortfall);
        }
      }
      
      const totalLoanD = spainLoanD + homeLoanAnnuityD + homeLoanInterestOnlyD;
      const equityRequiredD = Math.max(0, totalInvestment - totalLoanD);
      const monthlyD = calculateMonthlyPayment(spainLoanD, spainRate, spainTermYears) +
                      calculateMonthlyPayment(homeLoanAnnuityD, homeRateAnnuity, homeTermYears) +
                      calculateMonthlyPayment(homeLoanInterestOnlyD, homeRateInterestOnly, homeTermYears, true);
      const interestD = calculateTotalInterest(spainLoanD, spainRate, spainTermYears) +
                       calculateTotalInterest(homeLoanAnnuityD, homeRateAnnuity, homeTermYears) +
                       (homeLoanInterestOnlyD * homeRateInterestOnly / 100 * homeTermYears);
      
      scenarios.push({
        id: "combined",
        name: "Gecombineerd",
        description: "Spaanse hypotheek + aanvulling via overwaarde",
        isFeasible: equityRequiredD <= totalAvailableEquity,
        spainLoan: spainLoanD,
        homeLoanAnnuity: homeLoanAnnuityD,
        homeLoanInterestOnly: homeLoanInterestOnlyD,
        totalLoan: totalLoanD,
        equityRequired: equityRequiredD,
        monthlyPayment: monthlyD,
        totalInterest: interestD,
        recommendation: "Combineert lage Spaanse rente met flexibiliteit",
      });
    }

    return scenarios;
  }, [totalInvestment, loanCapacity, maxRefinanceableFromHome, homePropertyValue, homeCountry, totalAvailableEquity, spainRate, homeRateAnnuity, homeRateInterestOnly, spainTermYears, homeTermYears]);

  // When scenario is selected, initialize custom values
  useEffect(() => {
    if (selectedScenarioId) {
      const scenario = autoScenarios.find(s => s.id === selectedScenarioId);
      if (scenario) {
        setCustomSpainLoan(scenario.spainLoan);
        setCustomHomeLoanAnnuity(scenario.homeLoanAnnuity);
        setCustomHomeLoanInterestOnly(scenario.homeLoanInterestOnly);
      }
    }
  }, [selectedScenarioId, autoScenarios]);

  // Calculate custom scenario results
  const customResults = useMemo(() => {
    const totalLoan = customSpainLoan + customHomeLoanAnnuity + customHomeLoanInterestOnly;
    const equityRequired = totalInvestment - totalLoan;
    
    const spainMonthly = calculateMonthlyPayment(customSpainLoan, spainRate, spainTermYears);
    const homeAnnuityMonthly = calculateMonthlyPayment(customHomeLoanAnnuity, homeRateAnnuity, homeTermYears);
    const homeInterestOnlyMonthly = calculateMonthlyPayment(customHomeLoanInterestOnly, homeRateInterestOnly, homeTermYears, true);
    const totalMonthly = spainMonthly + homeAnnuityMonthly + homeInterestOnlyMonthly;
    
    const totalInterest = calculateTotalInterest(customSpainLoan, spainRate, spainTermYears) +
                         calculateTotalInterest(customHomeLoanAnnuity, homeRateAnnuity, homeTermYears) +
                         (customHomeLoanInterestOnly * homeRateInterestOnly / 100 * homeTermYears);
    
    // Check all constraints
    const exceedsEquity = equityRequired > totalAvailableEquity;
    const exceedsSpainLTV = customSpainLoan > propertyPrice * 0.7;
    const exceedsHomeEquity = customHomeLoanAnnuity + customHomeLoanInterestOnly > maxRefinanceableFromHome;
    const exceedsInterestOnlyLimit = customHomeLoanInterestOnly > loanCapacity.maxInterestOnlyLoan;
    const exceedsMonthlyCapacity = totalMonthly > loanCapacity.availableMonthlyPayment;
    
    const isFeasible = !exceedsEquity && !exceedsSpainLTV && !exceedsHomeEquity && 
                       !exceedsInterestOnlyLimit && !exceedsMonthlyCapacity;
    
    let issues: string[] = [];
    if (exceedsEquity) issues.push(`Tekort eigen vermogen: ${formatCurrency(equityRequired - totalAvailableEquity)}`);
    if (exceedsSpainLTV) issues.push("Overschrijdt 70% LTV in Spanje");
    if (exceedsHomeEquity) issues.push("Overschrijdt herfinancierbare overwaarde (80% LTV)");
    if (exceedsInterestOnlyLimit) issues.push(`Max aflossingsvrij: ${formatCurrency(loanCapacity.maxInterestOnlyLoan)}`);
    if (exceedsMonthlyCapacity) issues.push("Overschrijdt maandelijkse capaciteit");
    
    return {
      totalLoan,
      equityRequired,
      monthlyPayment: totalMonthly,
      totalInterest,
      isFeasible,
      issues,
      spainMonthly,
      homeAnnuityMonthly,
      homeInterestOnlyMonthly
    };
  }, [customSpainLoan, customHomeLoanAnnuity, customHomeLoanInterestOnly, totalInvestment, 
      loanCapacity, totalAvailableEquity, propertyPrice, maxRefinanceableFromHome, spainRate, homeRateAnnuity, homeRateInterestOnly, spainTermYears, homeTermYears]);

  // Track calculator use
  useEffect(() => {
    const timeout = setTimeout(() => {
      trackCalculator("lening", {
        purchase_price: propertyPrice,
        property_type: propertyType,
        purchase_costs: purchaseCosts,
        total_investment: totalInvestment,
        home_country: homeCountry,
        monthly_income: monthlyIncome,
        age,
        available_savings: availableSavings,
        home_equity: homeEquity,
        home_property_value: homePropertyValue,
        selected_scenario: selectedScenarioId,
        custom_spain_loan: customSpainLoan,
        custom_home_annuity: customHomeLoanAnnuity,
        custom_home_interest_only: customHomeLoanInterestOnly,
      });
    }, 2000);
    return () => clearTimeout(timeout);
  }, [propertyPrice, propertyType, purchaseCosts, totalInvestment, homeCountry, monthlyIncome, 
      age, availableSavings, homeEquity, homePropertyValue, selectedScenarioId, 
      customSpainLoan, customHomeLoanAnnuity, customHomeLoanInterestOnly]);

  // Max slider values for custom configuration
  const maxSpainLoan = Math.min(propertyPrice * 0.7, loanCapacity.maxLoanFromIncomeSpain);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Intro */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Vul je gegevens in, kies een scenario als startpunt, en pas het daarna naar wens aan om je ideale balans te vinden.
          </AlertDescription>
        </Alert>

        {/* Input Cards */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Property Card */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Home className="h-5 w-5 text-primary" />
                Woning in Spanje
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Aankoopprijs</Label>
                  <span className="font-semibold">{formatCurrency(propertyPrice)}</span>
                </div>
                <Slider
                  value={[propertyPrice]}
                  onValueChange={([v]) => setPropertyPrice(v)}
                  min={100000}
                  max={1000000}
                  step={10000}
                />
              </div>

              <div className="space-y-2">
                <Label>Type woning</Label>
                <Select value={propertyType} onValueChange={(v: PropertyType) => setPropertyType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nieuwbouw">Nieuwbouw (10% BTW)</SelectItem>
                    <SelectItem value="bestaand">Bestaande bouw (±8% ITP)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Land van herkomst</Label>
                <Select value={homeCountry} onValueChange={(v: HomeCountry) => setHomeCountry(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nl">Nederland</SelectItem>
                    <SelectItem value="be">België</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Investment summary */}
              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Aankoopprijs</span>
                  <span>{formatCurrency(propertyPrice)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Bijkomende kosten (±{((purchaseCosts / propertyPrice) * 100).toFixed(0)}%)</span>
                  <span>{formatCurrency(purchaseCosts)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-semibold">
                  <span>Totale investering</span>
                  <span className="text-primary">{formatCurrency(totalInvestment)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Situation Card */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calculator className="h-5 w-5 text-primary" />
                Financiële Situatie
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    Netto maandinkomen
                    <Tooltip>
                      <TooltipTrigger><HelpCircle className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
                      <TooltipContent>Max 35% mag naar hypotheeklasten gaan</TooltipContent>
                    </Tooltip>
                  </Label>
                  <span className="font-semibold">{formatCurrency(monthlyIncome)}</span>
                </div>
                <Slider
                  value={[monthlyIncome]}
                  onValueChange={([v]) => setMonthlyIncome(v)}
                  min={1500}
                  max={15000}
                  step={250}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    Huidige maandlasten
                    <Tooltip>
                      <TooltipTrigger><HelpCircle className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
                      <TooltipContent>Bestaande hypotheek, leningen, alimentatie</TooltipContent>
                    </Tooltip>
                  </Label>
                  <span className="font-semibold">{formatCurrency(currentMonthlyExpenses)}</span>
                </div>
                <Slider
                  value={[currentMonthlyExpenses]}
                  onValueChange={([v]) => setCurrentMonthlyExpenses(v)}
                  min={0}
                  max={5000}
                  step={100}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Leeftijd</Label>
                  <span className="font-semibold">{age} jaar</span>
                </div>
                <Slider
                  value={[age]}
                  onValueChange={([v]) => setAge(v)}
                  min={25}
                  max={70}
                  step={1}
                />
                <p className="text-xs text-muted-foreground">
                  Max. looptijd tot 75 jaar: {maxTermFromAge} jaar
                </p>
              </div>

              {/* Capacity summary */}
              <div className="rounded-lg bg-primary/5 p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Beschikbaar voor maandlasten</span>
                  <span className="font-semibold text-primary">{formatCurrency(loanCapacity.availableMonthlyPayment)}/mnd</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Available Capital Card */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Wallet className="h-5 w-5 text-primary" />
                Beschikbaar Vermogen
              </CardTitle>
              <CardDescription>
                Hoeveel eigen geld kun je inzetten voor de aankoop?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <PiggyBank className="h-4 w-4" />
                      Beschikbaar spaargeld
                    </Label>
                    <span className="font-semibold">{formatCurrency(availableSavings)}</span>
                  </div>
                  <Slider
                    value={[availableSavings]}
                    onValueChange={([v]) => setAvailableSavings(v)}
                    min={0}
                    max={500000}
                    step={5000}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Home className="h-4 w-4" />
                      Overwaarde eigen woning
                      <Tooltip>
                        <TooltipTrigger><HelpCircle className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
                        <TooltipContent>Verschil tussen woningwaarde en restschuld</TooltipContent>
                      </Tooltip>
                    </Label>
                    <span className="font-semibold">{formatCurrency(homeEquity)}</span>
                  </div>
                  <Slider
                    value={[homeEquity]}
                    onValueChange={([v]) => setHomeEquity(v)}
                    min={0}
                    max={500000}
                    step={5000}
                  />
                </div>

                {homeEquity > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        Geschatte woningwaarde
                        <Tooltip>
                          <TooltipTrigger><HelpCircle className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
                          <TooltipContent>
                            Bepaalt max aflossingsvrij: {homeCountry === "nl" ? "50%" : "40%"} van waarde
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <span className="font-semibold">{formatCurrency(homePropertyValue)}</span>
                    </div>
                    <Slider
                      value={[homePropertyValue]}
                      onValueChange={([v]) => setHomePropertyValue(v)}
                      min={100000}
                      max={1500000}
                      step={10000}
                    />
                    <p className="text-xs text-muted-foreground">
                      Max. aflossingsvrij: {formatCurrency(loanCapacity.maxInterestOnlyLoan)}
                    </p>
                  </div>
                )}
              </div>

              {/* Total available with assumption note */}
              <div className="mt-6 space-y-2">
                <div className="rounded-lg bg-primary/10 p-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Totaal beschikbaar eigen vermogen</span>
                    <span className="text-xl font-bold text-primary">{formatCurrency(totalAvailableEquity)}</span>
                  </div>
                  {homeEquity > 0 && homeEquity > maxRefinanceableFromHome && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Herfinancierbaar via overwaarde: {formatCurrency(maxRefinanceableFromHome)} (80% van woningwaarde)
                    </p>
                  )}
                </div>
                {homeEquity > 0 && (
                  <p className="text-xs text-muted-foreground flex items-start gap-1">
                    <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    Aanname: banken financieren doorgaans max. 80% van de woningwaarde. De exacte mogelijkheden hangen af van je persoonlijke situatie.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Scenarios */}
        <Card>
          <CardHeader>
            <CardTitle>Kies een scenario als startpunt</CardTitle>
            <CardDescription>
              Klik op een scenario om het te selecteren en daarna aan te passen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {autoScenarios.map((scenario) => (
                <div
                  key={scenario.id}
                  onClick={() => setSelectedScenarioId(scenario.id)}
                  className={`
                    relative cursor-pointer rounded-lg border-2 p-4 transition-all hover:shadow-md
                    ${selectedScenarioId === scenario.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                    }
                  `}
                >
                  {/* Feasibility badge */}
                  <div className="absolute -top-2 -right-2">
                    {scenario.isFeasible ? (
                      <Badge className="bg-green-500 hover:bg-green-600 text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Haalbaar
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs">
                        <XCircle className="h-3 w-3 mr-1" />
                        Tekort
                      </Badge>
                    )}
                  </div>

                  <h4 className="font-semibold mb-1 pr-16">{scenario.name}</h4>
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{scenario.description}</p>

                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Lening</span>
                      <span className="font-medium">{formatCurrency(scenario.totalLoan)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Eigen inbreng</span>
                      <span className={`font-medium ${scenario.equityRequired > totalAvailableEquity ? 'text-destructive' : ''}`}>
                        {formatCurrency(scenario.equityRequired)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Maandlast</span>
                      <span className="font-medium">{formatCurrency(scenario.monthlyPayment)}</span>
                    </div>
                  </div>

                  {scenario.recommendation && (
                    <p className="mt-2 text-xs text-muted-foreground italic border-t pt-2">
                      {scenario.recommendation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Custom Configuration */}
        {selectedScenarioId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Landmark className="h-5 w-5 text-primary" />
                Pas je financiering aan
              </CardTitle>
              <CardDescription>
                Schuif om je ideale balans te vinden tussen maandlasten en eigen inbreng
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Sliders */}
              <div className="grid gap-6 md:grid-cols-3">
                {/* Spain loan */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Landmark className="h-4 w-4 text-primary" />
                      Lening Spanje
                    </Label>
                    <span className="font-semibold">{formatCurrency(customSpainLoan)}</span>
                  </div>
                  <Slider
                    value={[customSpainLoan]}
                    onValueChange={([v]) => setCustomSpainLoan(v)}
                    min={0}
                    max={maxSpainLoan}
                    step={5000}
                  />
                  <p className="text-xs text-muted-foreground">
                    Max: {formatCurrency(maxSpainLoan)} (70% LTV) · {spainRate}% rente
                  </p>
                </div>

                {/* Home annuity loan */}
                {maxRefinanceableFromHome > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <Home className="h-4 w-4 text-primary" />
                        {homeCountry.toUpperCase()} met aflossing
                      </Label>
                      <span className="font-semibold">{formatCurrency(customHomeLoanAnnuity)}</span>
                    </div>
                    <Slider
                      value={[customHomeLoanAnnuity]}
                      onValueChange={([v]) => {
                        const maxAllowed = maxRefinanceableFromHome - customHomeLoanInterestOnly;
                        setCustomHomeLoanAnnuity(Math.min(v, Math.max(0, maxAllowed)));
                      }}
                      min={0}
                      max={maxRefinanceableFromHome}
                      step={5000}
                    />
                    <p className="text-xs text-muted-foreground">
                      Max: {formatCurrency(maxRefinanceableFromHome)} (80% LTV) · {homeRateAnnuity}% rente
                    </p>
                  </div>
                )}

                {/* Home interest-only loan */}
                {maxRefinanceableFromHome > 0 && loanCapacity.maxInterestOnlyLoan > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <Home className="h-4 w-4 text-amber-500" />
                        {homeCountry.toUpperCase()} aflossingsvrij
                      </Label>
                      <span className="font-semibold">{formatCurrency(customHomeLoanInterestOnly)}</span>
                    </div>
                    <Slider
                      value={[customHomeLoanInterestOnly]}
                      onValueChange={([v]) => {
                        const maxAllowed = Math.min(loanCapacity.maxInterestOnlyLoan, maxRefinanceableFromHome - customHomeLoanAnnuity);
                        setCustomHomeLoanInterestOnly(Math.min(v, Math.max(0, maxAllowed)));
                      }}
                      min={0}
                      max={loanCapacity.maxInterestOnlyLoan}
                      step={5000}
                    />
                    <p className="text-xs text-muted-foreground">
                      Max: {formatCurrency(loanCapacity.maxInterestOnlyLoan)} · {homeRateInterestOnly}% rente
                    </p>
                  </div>
                )}
              </div>

              {/* Loan Conditions: Rates and Terms */}
              <div className="border-t pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold">Leningcondities aanpassen</h4>
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {/* Spain rate and term */}
                  {customSpainLoan > 0 && (
                    <div className="space-y-4 p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <Landmark className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm">Spanje</span>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Rente</Label>
                          <span className="font-semibold text-sm">{spainRate.toFixed(1)}%</span>
                        </div>
                        <Slider
                          value={[spainRate]}
                          onValueChange={([v]) => setSpainRate(v)}
                          min={2.5}
                          max={6.0}
                          step={0.1}
                        />
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Looptijd</Label>
                          <span className="font-semibold text-sm">{spainTermYears} jaar</span>
                        </div>
                        <Slider
                          value={[spainTermYears]}
                          onValueChange={([v]) => setSpainTermYears(v)}
                          min={10}
                          max={Math.min(25, maxTermFromAge)}
                          step={1}
                        />
                        <p className="text-xs text-muted-foreground">Max 25 jaar (tot leeftijd 75)</p>
                      </div>
                    </div>
                  )}

                  {/* Home country annuity rate and term */}
                  {customHomeLoanAnnuity > 0 && (
                    <div className="space-y-4 p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <Home className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm">{homeCountry.toUpperCase()} met aflossing</span>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Rente</Label>
                          <span className="font-semibold text-sm">{homeRateAnnuity.toFixed(1)}%</span>
                        </div>
                        <Slider
                          value={[homeRateAnnuity]}
                          onValueChange={([v]) => setHomeRateAnnuity(v)}
                          min={3.0}
                          max={7.0}
                          step={0.1}
                        />
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Looptijd</Label>
                          <span className="font-semibold text-sm">{homeTermYears} jaar</span>
                        </div>
                        <Slider
                          value={[homeTermYears]}
                          onValueChange={([v]) => setHomeTermYears(v)}
                          min={10}
                          max={Math.min(30, maxTermFromAge)}
                          step={1}
                        />
                        <p className="text-xs text-muted-foreground">Max 30 jaar (tot leeftijd 75)</p>
                      </div>
                    </div>
                  )}

                  {/* Home country interest-only rate */}
                  {customHomeLoanInterestOnly > 0 && (
                    <div className="space-y-4 p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <Home className="h-4 w-4 text-amber-500" />
                        <span className="font-medium text-sm">{homeCountry.toUpperCase()} aflossingsvrij</span>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Rente</Label>
                          <span className="font-semibold text-sm">{homeRateInterestOnly.toFixed(1)}%</span>
                        </div>
                        <Slider
                          value={[homeRateInterestOnly]}
                          onValueChange={([v]) => setHomeRateInterestOnly(v)}
                          min={3.5}
                          max={7.5}
                          step={0.1}
                        />
                        <p className="text-xs text-muted-foreground">Aflossingsvrij: geen looptijd</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Results */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className={`rounded-lg p-4 ${customResults.isFeasible ? 'bg-green-500/10 border border-green-500/20' : 'bg-destructive/10 border border-destructive/20'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {customResults.isFeasible ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span className="text-sm text-muted-foreground">Status</span>
                  </div>
                  <span className={`text-lg font-bold ${customResults.isFeasible ? 'text-green-600' : 'text-destructive'}`}>
                    {customResults.isFeasible ? 'Haalbaar' : 'Niet haalbaar'}
                  </span>
                  {customResults.issues.length > 0 && (
                    <p className="text-xs text-destructive mt-1">{customResults.issues[0]}</p>
                  )}
                </div>

                <div className="rounded-lg bg-muted/50 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Euro className="h-4 w-4 text-primary" />
                    <span className="text-sm text-muted-foreground">Totale lening</span>
                  </div>
                  <span className="text-lg font-bold">{formatCurrency(customResults.totalLoan)}</span>
                </div>

                <div className="rounded-lg bg-muted/50 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <PiggyBank className="h-4 w-4 text-primary" />
                    <span className="text-sm text-muted-foreground">Eigen inbreng</span>
                  </div>
                  <span className={`text-lg font-bold ${customResults.equityRequired > totalAvailableEquity ? 'text-destructive' : ''}`}>
                    {formatCurrency(customResults.equityRequired)}
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">
                    Beschikbaar: {formatCurrency(totalAvailableEquity)}
                  </p>
                </div>

                <div className="rounded-lg bg-muted/50 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="text-sm text-muted-foreground">Maandlasten</span>
                  </div>
                  <span className={`text-lg font-bold ${customResults.monthlyPayment > loanCapacity.availableMonthlyPayment ? 'text-destructive' : ''}`}>
                    {formatCurrency(customResults.monthlyPayment)}
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">
                    Max: {formatCurrency(loanCapacity.availableMonthlyPayment)}
                  </p>
                </div>
              </div>

              {/* Detailed breakdown */}
              <div className="rounded-lg border p-4">
                <h4 className="font-semibold mb-3">Verdeling</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 text-sm">
                    {customSpainLoan > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Spanje ({spainRate}%, {spainTermYears}j)</span>
                        <span>{formatCurrency(customSpainLoan)} → {formatCurrency(customResults.spainMonthly)}/mnd</span>
                      </div>
                    )}
                    {customHomeLoanAnnuity > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{homeCountry.toUpperCase()} aflossing ({homeRateAnnuity}%, {homeTermYears}j)</span>
                        <span>{formatCurrency(customHomeLoanAnnuity)} → {formatCurrency(customResults.homeAnnuityMonthly)}/mnd</span>
                      </div>
                    )}
                    {customHomeLoanInterestOnly > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{homeCountry.toUpperCase()} aflossingsvrij ({homeRateInterestOnly}%)</span>
                        <span>{formatCurrency(customHomeLoanInterestOnly)} → {formatCurrency(customResults.homeInterestOnlyMonthly)}/mnd</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Totale investering</span>
                      <span>{formatCurrency(totalInvestment)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Min: Totale lening</span>
                      <span>- {formatCurrency(customResults.totalLoan)}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-semibold">
                      <span>Eigen inbreng nodig</span>
                      <span>{formatCurrency(customResults.equityRequired)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Totale rentekosten</span>
                      <span>{formatCurrency(customResults.totalInterest)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Disclaimer */}
        <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            <strong>Belangrijk:</strong> Deze berekeningen zijn puur indicatief. Elke bank hanteert eigen criteria en de werkelijke financieringsmogelijkheden kunnen afwijken.
            <div className="mt-3">
              <Button asChild variant="outline" className="border-amber-300 hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900/50">
                <Link to="/afspraak" className="flex items-center gap-2">
                  Plan een Oriëntatiegesprek
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <span className="ml-3 text-sm">voor persoonlijk financieel advies</span>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    </TooltipProvider>
  );
}
