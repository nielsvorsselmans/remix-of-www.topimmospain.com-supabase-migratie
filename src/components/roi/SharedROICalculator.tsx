import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Info, TrendingUp, Euro, Home, Calendar, Percent, Wallet, Calculator, Save, FolderOpen, Key, Building, FileDown } from "lucide-react";
import { useCalculatorTracking } from "@/hooks/useTrackCalculator";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useROIScenarios, ROIScenario, ROIScenarioInput } from "@/hooks/useROIScenarios";
import { SaveScenarioDialog } from "@/components/roi/SaveScenarioDialog";
import { ScenariosSheet } from "@/components/roi/ScenariosSheet";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { ROIPresetSelector, ROIPreset } from "@/components/roi/ROIPresetSelector";
import { ROILiveSummary } from "@/components/roi/ROILiveSummary";
import { ROICompactHeader } from "@/components/roi/ROICompactHeader";
import { useIsMobile } from "@/hooks/use-mobile";

type PropertyType = "nieuwbouw" | "bestaand";

const propertyTypePresets = {
  apartment: { lowSeason: 80, highSeason: 140 },
  penthouse: { lowSeason: 120, highSeason: 200 },
  villa: { lowSeason: 150, highSeason: 280 },
  townhouse: { lowSeason: 100, highSeason: 170 },
};

// Props for project-specific context
interface ProjectProperty {
  id: string;
  title: string;
  price?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  property_type?: string | null;
}

interface ProjectContext {
  projectId: string;
  projectName: string;
  properties: ProjectProperty[];
}

interface InitialRentalData {
  lowSeasonRate?: number;
  highSeasonRate?: number;
  occupancyRate?: number;
}

export interface ROIInputsForPdf {
  purchasePrice: number;
  yearlyAppreciation: number;
  rentalGrowthRate: number;
  costInflation: number;
  investmentYears: number;
  occupancyRate: number;
  lowSeasonRate: number;
  highSeasonRate: number;
  managementFee: number;
}

export interface SharedROICalculatorProps {
  // Initial values (for project-specific calculator)
  initialPurchasePrice?: number;
  initialPropertyType?: PropertyType;
  initialRegion?: "murcia" | "alicante";
  initialRentalData?: InitialRentalData;
  
  // Project context (for project-specific display)
  projectContext?: ProjectContext;
  
  // Feature flags
  showPropertySelector?: boolean;
  showMarketDataBadge?: boolean;
  isLoadingRental?: boolean;
  
  // PDF download callback - receives current ROI inputs
  onDownloadPdf?: (inputs: ROIInputsForPdf) => void;
  showPdfDownload?: boolean;
}

export function SharedROICalculator({
  initialPurchasePrice,
  initialPropertyType = "nieuwbouw",
  initialRegion = "murcia",
  initialRentalData,
  projectContext,
  showPropertySelector = false,
  showMarketDataBadge = false,
  isLoadingRental = false,
  onDownloadPdf,
  showPdfDownload = false,
}: SharedROICalculatorProps) {
  // Auth & Scenarios
  const { user } = useAuth();
  const { scenarios, isLoading: scenariosLoading, saveScenario, deleteScenario, canSave } = useROIScenarios();
  const { trackCalculator } = useCalculatorTracking();
  const isMobile = useIsMobile();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [scenariosSheetOpen, setScenariosSheetOpen] = useState(false);
  
  // Chart view state
  const [chartView, setChartView] = useState<'wealth' | 'cashflow' | 'yearly' | 'combined'>('combined');
  const [costInflation, setCostInflation] = useState(2.5);
  const [showYearlyBreakdown, setShowYearlyBreakdown] = useState(false);
  
  // Project-specific: selected property
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(
    projectContext?.properties[0]?.id || ''
  );
  const selectedProperty = projectContext?.properties.find(p => p.id === selectedPropertyId) 
    || projectContext?.properties[0];
  
  // Determine initial purchase price
  const defaultPrice = initialPurchasePrice 
    || selectedProperty?.price 
    || 300000;
  
  // Sectie 1: Aankoop & Aankoopkosten
  const [purchasePrice, setPurchasePrice] = useState(defaultPrice);
  const [propertyType, setPropertyType] = useState<PropertyType>(initialPropertyType);
  const [region, setRegion] = useState<"murcia" | "alicante">(initialRegion);
  const [itpRate, setItpRate] = useState(region === "murcia" ? 7.75 : 10);

  // Sectie 2: Jaarlijkse Kosten
  const [communityFees, setCommunityFees] = useState(900);
  const [utilities, setUtilities] = useState(1200);
  const [wasteTax, setWasteTax] = useState(100);
  const [maintenance, setMaintenance] = useState(750);

  // Sectie 3: Verhuur & Bezetting
  const [rentalPropertyType, setRentalPropertyType] = useState("apartment");
  const [lowSeasonRate, setLowSeasonRate] = useState(initialRentalData?.lowSeasonRate || 80);
  const [highSeasonRate, setHighSeasonRate] = useState(initialRentalData?.highSeasonRate || 140);
  const [occupancyRate, setOccupancyRate] = useState(initialRentalData?.occupancyRate || 65);
  const [managementFee, setManagementFee] = useState(20);

  // Sectie 4: Waardestijging & Horizon (conservative defaults)
  const [yearlyAppreciation, setYearlyAppreciation] = useState(4);
  const [investmentYears, setInvestmentYears] = useState(10);
  const [rentalGrowthRate, setRentalGrowthRate] = useState(4);
  
  // Preset tracking
  const [selectedPreset, setSelectedPreset] = useState<string | null>("moderate");
  // Sectie 5: Financiering (Hypotheek)
  const [useMortgage, setUseMortgage] = useState(false);
  const [loanToValue, setLoanToValue] = useState(60);
  const [interestRate, setInterestRate] = useState(3.5);
  const [loanTermYears, setLoanTermYears] = useState(20);

  // Update purchase price when selected property changes
  useEffect(() => {
    if (selectedProperty?.price) {
      setPurchasePrice(selectedProperty.price);
    }
  }, [selectedProperty]);

  // Update rental data when initialRentalData changes
  useEffect(() => {
    if (initialRentalData) {
      if (initialRentalData.lowSeasonRate) setLowSeasonRate(initialRentalData.lowSeasonRate);
      if (initialRentalData.highSeasonRate) setHighSeasonRate(initialRentalData.highSeasonRate);
      if (initialRentalData.occupancyRate) setOccupancyRate(initialRentalData.occupancyRate);
    }
  }, [initialRentalData]);

  // Update ITP rate when region changes
  useEffect(() => {
    if (propertyType === "bestaand") {
      setItpRate(region === "murcia" ? 7.75 : 10);
    }
  }, [region, propertyType]);

  // Apply presets when rental property type changes (only if no initialRentalData)
  useEffect(() => {
    if (!initialRentalData) {
      const preset = propertyTypePresets[rentalPropertyType as keyof typeof propertyTypePresets];
      if (preset) {
        setLowSeasonRate(preset.lowSeason);
        setHighSeasonRate(preset.highSeason);
      }
    }
  }, [rentalPropertyType, initialRentalData]);

  // === BEREKENINGEN ===

  // Aankoopkosten
  const btwOrItp = propertyType === "nieuwbouw" ? purchasePrice * 0.10 : purchasePrice * (itpRate / 100);
  const ajd = propertyType === "nieuwbouw" ? purchasePrice * 0.015 : 0;
  const advocaatBaseFee = purchasePrice * 0.01;
  const advocaatBTW = advocaatBaseFee * 0.21;
  const advocaatTotal = advocaatBaseFee + advocaatBTW;
  const notarisFee = 2000;
  const registrationFee = 800;
  const volmacht = 700;
  const utilitiesSetup = propertyType === "nieuwbouw" ? 300 : 150;
  const bankFees = 200;
  const adminFees = 250;
  const nieFee = 20;

  const totalPurchaseCosts = 
    btwOrItp + ajd + advocaatTotal + notarisFee + registrationFee + 
    volmacht + utilitiesSetup + bankFees + adminFees + nieFee;
  
  const totalInvestment = purchasePrice + totalPurchaseCosts;

  // Jaarlijkse kosten
  const ibiTax = Math.round(purchasePrice * 0.0018);
  const insurance = Math.round(purchasePrice * 0.0009);
  const totalAnnualCosts = ibiTax + insurance + communityFees + utilities + wasteTax + maintenance;

  // Verhuur berekeningen met Spaanse belastinglogica
  const availableDays = 365;
  const occupiedDays = Math.round(availableDays * (occupancyRate / 100));
  const unrentedDays = 365 - occupiedDays;
  const highSeasonDays = Math.round(occupiedDays * 0.4);
  const lowSeasonDays = Math.round(occupiedDays * 0.6);
  
  const highSeasonIncome = highSeasonDays * highSeasonRate;
  const lowSeasonIncome = lowSeasonDays * lowSeasonRate;
  const grossAnnualIncome = highSeasonIncome + lowSeasonIncome;
  const managementCosts = grossAnnualIncome * (managementFee / 100);
  
  // Pro rata aftrekbare kosten (alleen voor verhuurde periode)
  const deductibleCosts = totalAnnualCosts * (occupancyRate / 100);
  const nonDeductibleCosts = totalAnnualCosts - deductibleCosts;
  
  // Netto voor belastingen
  const netBeforeTax = grossAnnualIncome - managementCosts - deductibleCosts;
  
  // Spaanse inkomstenbelasting (19% over netto huurinkomen)
  const spanishIncomeTax = Math.max(0, netBeforeTax * 0.19);
  
  // Niet-residentbelasting voor onverhuurde periode
  const cadastralValue = purchasePrice * 0.5;
  const imputedIncome = cadastralValue * 0.011 * (unrentedDays / 365);
  const nonResidentTax = imputedIncome * 0.19;
  
  // Netto jaarinkomen na alle belastingen en kosten
  const netAnnualIncome = netBeforeTax - spanishIncomeTax - nonDeductibleCosts - nonResidentTax;

  // Hypotheek berekeningen
  const mortgageAmount = useMortgage ? purchasePrice * (loanToValue / 100) : 0;
  const equityInvestment = totalInvestment - mortgageAmount;
  
  // Helper functies
  const calculateAnnuityPayment = (principal: number, rate: number, years: number) => {
    const monthlyRate = rate / 100 / 12;
    const payments = years * 12;
    if (monthlyRate === 0) return principal / payments;
    return principal * (monthlyRate * Math.pow(1 + monthlyRate, payments)) / (Math.pow(1 + monthlyRate, payments) - 1);
  };
  
  const calculateRemainingMortgage = (principal: number, rate: number, termYears: number, yearsPassed: number) => {
    if (!useMortgage || yearsPassed >= termYears) return 0;
    
    const monthlyRate = rate / 100 / 12;
    const paymentsMade = yearsPassed * 12;
    const monthlyPayment = calculateAnnuityPayment(principal, rate, termYears);
    
    if (monthlyRate === 0) {
      return principal - (monthlyPayment * paymentsMade);
    }
    
    const remaining = principal * Math.pow(1 + monthlyRate, paymentsMade) - 
                     monthlyPayment * ((Math.pow(1 + monthlyRate, paymentsMade) - 1) / monthlyRate);
    return Math.max(0, remaining);
  };

  const calculateYearlyInterestAndPrincipal = (
    principal: number, 
    rate: number, 
    termYears: number, 
    year: number
  ): { interest: number; principal: number } => {
    if (!useMortgage || year === 0) return { interest: 0, principal: 0 };
    
    const monthlyRate = rate / 100 / 12;
    const monthlyPayment = calculateAnnuityPayment(principal, rate, termYears);
    const remainingAtYearStart = calculateRemainingMortgage(principal, rate, termYears, year - 1);
    
    let yearlyInterest = 0;
    let yearlyPrincipal = 0;
    let remainingBalance = remainingAtYearStart;
    
    for (let month = 0; month < 12; month++) {
      if (remainingBalance <= 0) break;
      const monthInterest = remainingBalance * monthlyRate;
      const monthPrincipal = Math.min(monthlyPayment - monthInterest, remainingBalance);
      yearlyInterest += monthInterest;
      yearlyPrincipal += monthPrincipal;
      remainingBalance -= monthPrincipal;
    }
    
    return { 
      interest: Math.round(yearlyInterest), 
      principal: Math.round(yearlyPrincipal) 
    };
  };
  
  const monthlyMortgagePayment = useMortgage 
    ? calculateAnnuityPayment(mortgageAmount, interestRate, loanTermYears)
    : 0;
  
  const yearlyMortgagePayment = monthlyMortgagePayment * 12;
  const remainingMortgageAtSale = calculateRemainingMortgage(mortgageAmount, interestRate, loanTermYears, investmentYears);

  // === YEARLY BREAKDOWN ===
  const yearlyBreakdown = Array.from({ length: investmentYears }, (_, i) => {
    const year = i + 1;
    
    const grossRentalIncome = grossAnnualIncome * Math.pow(1 + rentalGrowthRate / 100, year - 1);
    const managementCostsYear = grossRentalIncome * (managementFee / 100);
    const annualCostsYear = totalAnnualCosts * Math.pow(1 + costInflation / 100, year - 1);
    
    const mortgageData = useMortgage 
      ? calculateYearlyInterestAndPrincipal(mortgageAmount, interestRate, loanTermYears, year)
      : { interest: 0, principal: 0 };
    
    const deductibleCostsYear = annualCostsYear * (occupancyRate / 100);
    const deductibleInterestYear = mortgageData.interest * (occupancyRate / 100);
    const netBeforeTaxYear = grossRentalIncome - managementCostsYear - deductibleCostsYear - deductibleInterestYear;
    const spanishIncomeTaxYear = Math.max(0, netBeforeTaxYear * 0.19);
    const nonResidentTaxYear = nonResidentTax * Math.pow(1 + costInflation / 100, year - 1);
    
    const propertyValueStart = purchasePrice * Math.pow(1 + yearlyAppreciation / 100, year - 1);
    const propertyValueEnd = purchasePrice * Math.pow(1 + yearlyAppreciation / 100, year);
    const appreciationThisYear = propertyValueEnd - propertyValueStart;
    
    const netCashflow = grossRentalIncome 
      - managementCostsYear 
      - annualCostsYear 
      - spanishIncomeTaxYear 
      - nonResidentTaxYear
      - (useMortgage ? yearlyMortgagePayment : 0);
    
    return {
      year,
      grossRentalIncome,
      managementCostsYear,
      annualCostsYear,
      spanishIncomeTaxYear,
      nonResidentTaxYear,
      appreciationThisYear,
      propertyValueEnd,
      netCapitalPosition: propertyValueEnd - totalInvestment,
      mortgageInterest: mortgageData.interest,
      mortgagePrincipal: mortgageData.principal,
      mortgageTotal: mortgageData.interest + mortgageData.principal,
      netCashflow,
    };
  });
  
  const breakEvenYear = yearlyBreakdown.findIndex(row => row.netCapitalPosition >= 0) + 1;
  const hasBreakEven = breakEvenYear > 0 && breakEvenYear <= investmentYears;

  // Totalen
  const totalGrossRentalBreakdown = yearlyBreakdown.reduce((sum, row) => sum + row.grossRentalIncome, 0);
  const totalManagementBreakdown = yearlyBreakdown.reduce((sum, row) => sum + row.managementCostsYear, 0);
  const totalAnnualCostsBreakdown = yearlyBreakdown.reduce((sum, row) => sum + row.annualCostsYear, 0);
  const totalSpanishTaxBreakdown = yearlyBreakdown.reduce((sum, row) => sum + row.spanishIncomeTaxYear, 0);
  const totalNonResidentTaxBreakdown = yearlyBreakdown.reduce((sum, row) => sum + row.nonResidentTaxYear, 0);
  const totalInterestBreakdown = yearlyBreakdown.reduce((sum, row) => sum + row.mortgageInterest, 0);
  const totalPrincipalBreakdown = yearlyBreakdown.reduce((sum, row) => sum + row.mortgagePrincipal, 0);
  const totalNetCashflowBreakdown = yearlyBreakdown.reduce((sum, row) => sum + row.netCashflow, 0);
  
  // ROI Berekeningen
  const firstYearCashflow = yearlyBreakdown[0]?.netCashflow || 0;
  const lastYearCashflow = yearlyBreakdown[yearlyBreakdown.length - 1]?.netCashflow || 0;
  const averageCashflow = totalNetCashflowBreakdown / investmentYears;
  const futureValue = purchasePrice * Math.pow(1 + yearlyAppreciation / 100, investmentYears);
  
  // === CASH SCENARIO CALCULATIONS ===
  const grossCapitalGain = futureValue - totalInvestment;
  const capitalGainsTax = Math.max(0, grossCapitalGain * 0.19);
  const netCapitalGain = grossCapitalGain - capitalGainsTax;
  
  const totalReturnCash = totalNetCashflowBreakdown + netCapitalGain;
  const totalROICash = ((totalReturnCash / totalInvestment) * 100);
  
  // === MORTGAGE SCENARIO CALCULATIONS ===
  // Net proceeds after selling and paying off mortgage
  const netProceedsAfterMortgage = futureValue - remainingMortgageAtSale;
  
  // Capital gains tax for mortgage scenario (consistent with cash scenario)
  // Gain is calculated on the net proceeds minus the original equity investment
  const grossCapitalGainMortgage = netProceedsAfterMortgage - equityInvestment;
  const capitalGainsTaxMortgage = Math.max(0, grossCapitalGainMortgage * 0.19);
  const netCapitalGainMortgage = grossCapitalGainMortgage - capitalGainsTaxMortgage;
  
  // CORRECTED: Total return with mortgage uses equityInvestment, not totalInvestment
  // The mortgage amount is borrowed money, not your own investment
  const totalReturnWithMortgage = totalNetCashflowBreakdown + netCapitalGainMortgage;
  
  // Return on Equity (ROE) - return relative to your actual money invested
  const returnOnEquity = useMortgage && equityInvestment > 0
    ? ((totalReturnWithMortgage / equityInvestment) * 100)
    : totalROICash;
  
  // === ADDITIONAL MORTGAGE KPIs ===
  // Cashflow yield on equity - annual cashflow as % of your own investment
  const cashflowYieldOnEquity = useMortgage && equityInvestment > 0
    ? (averageCashflow / equityInvestment) * 100
    : (averageCashflow / totalInvestment) * 100;
  
  // Net rental yield on equity after mortgage payments
  const netRentalYieldOnEquity = useMortgage && equityInvestment > 0
    ? ((netAnnualIncome - yearlyMortgagePayment) / equityInvestment) * 100
    : (netAnnualIncome / totalInvestment) * 100;
  
  // === FINAL ROI METRICS ===
  const totalReturn = useMortgage ? totalReturnWithMortgage : totalReturnCash;
  const totalROI = useMortgage 
    ? ((totalReturnWithMortgage / totalInvestment) * 100)
    : totalROICash;
  const annualROI = totalROI / investmentYears;
  const annualROE = returnOnEquity / investmentYears;
  const annualROICash = totalROICash / investmentYears;
  const netRentalYield = (netAnnualIncome / totalInvestment) * 100;
  
  const annualLeverageEffect = useMortgage ? annualROE - annualROICash : 0;

  // Chart data
  const chartData = Array.from({ length: investmentYears + 1 }, (_, i) => {
    const year = i;
    
    if (year === 0) {
      return { year: 0, wealth: 0, cashflow: 0, yearlyCashflow: 0, rentalIncome: 0, appreciation: 0 };
    }
    
    const cumulativeCashflow = yearlyBreakdown
      .slice(0, year)
      .reduce((sum, row) => sum + row.netCashflow, 0);
    
    const cumulativeAppreciation = yearlyBreakdown
      .slice(0, year)
      .reduce((sum, row) => sum + row.appreciationThisYear, 0);
    
    const currentYearData = yearlyBreakdown[year - 1];
    const propertyValueAtYear = purchasePrice * Math.pow(1 + yearlyAppreciation / 100, year);
    const remainingMortgageAtYear = calculateRemainingMortgage(mortgageAmount, interestRate, loanTermYears, year);
    const equityAtYear = propertyValueAtYear - remainingMortgageAtYear;
    const netCapitalPosition = propertyValueAtYear - totalInvestment;
    
    return {
      year,
      wealth: Math.round(useMortgage ? equityAtYear : (cumulativeCashflow + cumulativeAppreciation)),
      cashflow: Math.round(cumulativeCashflow),
      yearlyCashflow: Math.round(currentYearData?.netCashflow || 0),
      rentalIncome: Math.round(cumulativeCashflow),
      appreciation: Math.round(netCapitalPosition),
    };
  });

  // Track calculator usage
  useEffect(() => {
    trackCalculator("roi", {
      purchase_price: purchasePrice,
      property_type: propertyType,
      region,
      rental_property_type: rentalPropertyType,
      occupancy_rate: occupancyRate,
      yearly_appreciation: yearlyAppreciation,
      investment_years: investmentYears,
    }, {
      total_investment: totalInvestment,
      total_purchase_costs: totalPurchaseCosts,
      total_annual_costs: totalAnnualCosts,
      net_annual_income: netAnnualIncome,
      total_roi: totalROI,
      annual_roi: annualROI,
      net_rental_yield: netRentalYield,
      total_return: totalReturn,
    });
  }, [purchasePrice, propertyType, region, rentalPropertyType, occupancyRate, yearlyAppreciation, investmentYears, totalInvestment, totalPurchaseCosts, totalAnnualCosts, netAnnualIncome, totalROI, annualROI, netRentalYield, totalReturn]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Scenario functions
  const handleSaveScenario = (name: string) => {
    const scenarioData: ROIScenarioInput = {
      name,
      purchase_price: purchasePrice,
      property_type: propertyType,
      rental_property_type: rentalPropertyType,
      region,
      itp_rate: itpRate,
      ibi_yearly: purchasePrice * 0.004,
      insurance_yearly: purchasePrice * 0.002,
      community_fees_monthly: communityFees / 12,
      utilities_monthly: utilities / 12,
      maintenance_yearly: maintenance,
      garbage_tax_yearly: wasteTax,
      low_season_rate: lowSeasonRate,
      high_season_rate: highSeasonRate,
      occupancy_rate: occupancyRate,
      owner_use_days: 0,
      management_fee_rate: managementFee,
      use_mortgage: useMortgage,
      mortgage_amount: mortgageAmount,
      mortgage_rate: interestRate,
      mortgage_term: loanTermYears,
      appreciation_rate: yearlyAppreciation,
      investment_years: investmentYears,
      inflation_rate: costInflation,
      total_roi: totalROI,
      annual_roi: annualROI,
      return_on_equity: returnOnEquity,
      annual_roe: annualROE,
      net_rental_yield: netRentalYield,
      total_return: totalReturn,
    };
    
    saveScenario.mutate(scenarioData, {
      onSuccess: () => setSaveDialogOpen(false),
    });
  };

  const handleLoadScenario = (scenario: ROIScenario) => {
    setPurchasePrice(scenario.purchase_price);
    setPropertyType(scenario.property_type as PropertyType);
    if (scenario.rental_property_type) setRentalPropertyType(scenario.rental_property_type);
    if (scenario.region) setRegion(scenario.region as "murcia" | "alicante");
    if (scenario.itp_rate != null) setItpRate(scenario.itp_rate);
    if (scenario.community_fees_monthly != null) setCommunityFees(scenario.community_fees_monthly * 12);
    if (scenario.utilities_monthly != null) setUtilities(scenario.utilities_monthly * 12);
    if (scenario.garbage_tax_yearly != null) setWasteTax(scenario.garbage_tax_yearly);
    if (scenario.maintenance_yearly != null) setMaintenance(scenario.maintenance_yearly);
    if (scenario.low_season_rate != null) setLowSeasonRate(scenario.low_season_rate);
    if (scenario.high_season_rate != null) setHighSeasonRate(scenario.high_season_rate);
    if (scenario.occupancy_rate != null) setOccupancyRate(scenario.occupancy_rate);
    if (scenario.management_fee_rate != null) setManagementFee(scenario.management_fee_rate);
    setUseMortgage(scenario.use_mortgage);
    if (scenario.mortgage_amount != null) setLoanToValue((scenario.mortgage_amount / scenario.purchase_price) * 100);
    if (scenario.mortgage_rate != null) setInterestRate(scenario.mortgage_rate);
    if (scenario.mortgage_term != null) setLoanTermYears(scenario.mortgage_term);
    if (scenario.appreciation_rate != null) setYearlyAppreciation(scenario.appreciation_rate);
    if (scenario.investment_years != null) setInvestmentYears(scenario.investment_years);
    if (scenario.inflation_rate != null) setCostInflation(scenario.inflation_rate);
    setSelectedPreset(null); // Clear preset when loading scenario
  };

  // Handle preset selection
  const handlePresetSelect = (preset: ROIPreset) => {
    setYearlyAppreciation(preset.yearlyAppreciation);
    setOccupancyRate(preset.occupancyRate);
    setRentalGrowthRate(preset.rentalGrowthRate);
    setManagementFee(preset.managementFee);
    
    // Determine which preset was selected
    if (preset.yearlyAppreciation === 3) setSelectedPreset("conservative");
    else if (preset.yearlyAppreciation === 4) setSelectedPreset("moderate");
    else setSelectedPreset("optimistic");
  };

  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Main Content */}
        <div className="space-y-6 min-w-0">
        {/* Header with project context or scenario buttons */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {projectContext && (
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Calculator className="w-6 h-6 text-primary" />
                Rendementsanalyse
              </h2>
              <p className="text-muted-foreground">{projectContext.projectName}</p>
            </div>
          )}
          
          <div className="flex items-center gap-2 flex-wrap ml-auto">
            {showMarketDataBadge && (
              <Badge variant="secondary" className="gap-1">
                <TrendingUp className="w-3 h-3" />
                Airbnb marktdata
              </Badge>
            )}
            {isLoadingRental && (
              <Badge variant="outline" className="gap-1">
                Laden verhuurdata...
              </Badge>
            )}
            
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSaveDialogOpen(true)}
                    disabled={!canSave}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Opslaan
                  </Button>
                </span>
              </TooltipTrigger>
              {!canSave && (
                <TooltipContent>
                  Log in om scenario's op te slaan
                </TooltipContent>
              )}
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setScenariosSheetOpen(true)}
                    disabled={!canSave}
                    className="gap-2"
                  >
                    <FolderOpen className="h-4 w-4" />
                    Scenario's
                    {scenarios.length > 0 && (
                      <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {scenarios.length}
                      </span>
                    )}
                  </Button>
                </span>
              </TooltipTrigger>
              {!canSave && (
                <TooltipContent>
                  Log in om scenario's te bekijken
                </TooltipContent>
              )}
            </Tooltip>
            
            {showPdfDownload && onDownloadPdf && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDownloadPdf({
                  purchasePrice,
                  yearlyAppreciation,
                  rentalGrowthRate,
                  costInflation,
                  investmentYears,
                  occupancyRate,
                  lowSeasonRate,
                  highSeasonRate,
                  managementFee,
                })}
                className="gap-2"
              >
                <FileDown className="h-4 w-4" />
                Download PDF
              </Button>
            )}
          </div>
        </div>

        {/* Property selector (project-specific) */}
        {showPropertySelector && projectContext && projectContext.properties.length > 1 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Home className="w-4 h-4 text-primary" />
                Selecteer woningtype
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Kies een woning" />
                </SelectTrigger>
                <SelectContent>
                  {projectContext.properties.filter(p => p.price).map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      <span className="flex items-center justify-between w-full gap-4">
                        <span className="truncate">{property.title}</span>
                        <span className="font-semibold text-primary">
                          {formatCurrency(property.price || 0)}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {/* Quick-Start Presets */}
        <ROIPresetSelector 
          onSelectPreset={handlePresetSelect}
          selectedPreset={selectedPreset}
        />

        {/* Compact KPI Header */}
        <ROICompactHeader
          annualROI={annualROI}
          averageCashflow={averageCashflow}
          futureValue={futureValue}
          totalReturn={totalReturn}
          investmentYears={investmentYears}
          useMortgage={useMortgage}
          annualROE={annualROE}
          equityInvestment={equityInvestment}
          formatCurrency={formatCurrency}
        />

        {/* Chart with view tabs */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Vermogensopbouw
                </CardTitle>
                <CardDescription>Projectie over {investmentYears} jaar</CardDescription>
              </div>
              <div className="flex gap-1 flex-wrap">
                {(['combined', 'wealth', 'cashflow', 'yearly'] as const).map((view) => (
                  <Button
                    key={view}
                    variant={chartView === view ? "default" : "outline"}
                    size="sm"
                    onClick={() => setChartView(view)}
                    className="text-xs"
                  >
                    {view === 'combined' && 'Gecombineerd'}
                    {view === 'wealth' && (useMortgage ? 'Vermogen' : 'Totaal')}
                    {view === 'cashflow' && 'Cashflow'}
                    {view === 'yearly' && 'Per Jaar'}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              {chartView === 'yearly' ? (
                <BarChart data={chartData.filter(d => d.year > 0)}>
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
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'Jaarlijkse Cashflow']}
                    labelFormatter={(label) => `Jaar ${label}`}
                  />
                  <Bar 
                    dataKey="yearlyCashflow" 
                    fill="hsl(var(--chart-2))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              ) : (
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorWealth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="colorCashflow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="colorRental" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="colorAppreciation" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
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
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number, name: string) => {
                      const labels: Record<string, string> = {
                        wealth: useMortgage ? 'Eigen Vermogen' : 'Totale Vermogensgroei',
                        cashflow: 'Netto Cashflow',
                        rentalIncome: 'Huurinkomsten',
                        appreciation: 'Waardestijging',
                      };
                      return [formatCurrency(value), labels[name] || name];
                    }}
                    labelFormatter={(label) => `Jaar ${label}`}
                  />
                  
                  {chartView === 'wealth' && (
                    <Area
                      type="monotone"
                      dataKey="wealth"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#colorWealth)"
                    />
                  )}
                  
                  {chartView === 'cashflow' && (
                    <Area
                      type="monotone"
                      dataKey="cashflow"
                      stroke="hsl(var(--chart-2))"
                      strokeWidth={2}
                      fill="url(#colorCashflow)"
                    />
                  )}
                  
                  {chartView === 'combined' && (
                    <>
                      <Area
                        type="monotone"
                        dataKey="rentalIncome"
                        stackId="1"
                        stroke="hsl(var(--chart-2))"
                        strokeWidth={2}
                        fill="url(#colorRental)"
                      />
                      <Area
                        type="monotone"
                        dataKey="appreciation"
                        stackId="1"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fill="url(#colorAppreciation)"
                      />
                    </>
                  )}
                </AreaChart>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Input Sections in Tabs */}
        <Tabs defaultValue="purchase" className="w-full">
          <TabsList className="grid w-full grid-cols-5 h-auto p-1">
            <TabsTrigger value="purchase" className="flex items-center gap-2 py-2.5 data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Aankoop</span>
            </TabsTrigger>
            <TabsTrigger value="financing" className="flex items-center gap-2 py-2.5 data-[state=active]:bg-violet-500 data-[state=active]:text-white">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">Financiering</span>
            </TabsTrigger>
            <TabsTrigger value="costs" className="flex items-center gap-2 py-2.5 data-[state=active]:bg-amber-500 data-[state=active]:text-white">
              <Calculator className="h-4 w-4" />
              <span className="hidden sm:inline">Kosten</span>
            </TabsTrigger>
            <TabsTrigger value="rental" className="flex items-center gap-2 py-2.5 data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
              <Key className="h-4 w-4" />
              <span className="hidden sm:inline">Verhuur</span>
            </TabsTrigger>
            <TabsTrigger value="appreciation" className="flex items-center gap-2 py-2.5 data-[state=active]:bg-teal-500 data-[state=active]:text-white">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Groei</span>
            </TabsTrigger>
          </TabsList>

          {/* Sectie 1: Aankoop & Aankoopkosten */}
          <TabsContent value="purchase" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Aankoop & Aankoopkosten</CardTitle>
                <CardDescription>Voer de aankoopprijs en type woning in</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="purchase-price-input">Aankoopprijs</Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          De aankoopprijs bepaalt je totale investering. Reken op 10-15% extra kosten bovenop dit bedrag voor belastingen, notaris en juridische begeleiding.
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="purchase-price-input"
                      type="number"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(Number(e.target.value))}
                      className="w-32 text-right"
                      min={100000}
                      max={1000000}
                      step={10000}
                    />
                  </div>
                  <Slider
                    value={[purchasePrice]}
                    onValueChange={(value) => setPurchasePrice(value[0])}
                    min={100000}
                    max={1000000}
                    step={10000}
                  />
                  <p className="text-sm text-muted-foreground">{formatCurrency(purchasePrice)}</p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="property-type">Type woning</Label>
                    <Select value={propertyType} onValueChange={(value) => setPropertyType(value as PropertyType)}>
                      <SelectTrigger id="property-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nieuwbouw">Nieuwbouw</SelectItem>
                        <SelectItem value="bestaand">Bestaande bouw</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {propertyType === "bestaand" && (
                    <div className="space-y-2">
                      <Label htmlFor="region">Regio</Label>
                      <Select value={region} onValueChange={(value) => setRegion(value as "murcia" | "alicante")}>
                        <SelectTrigger id="region">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="murcia">Costa Cálida (Murcia) - 7.75% ITP</SelectItem>
                          <SelectItem value="alicante">Costa Blanca Zuid (Alicante) - 10% ITP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="space-y-3 p-4 rounded-lg bg-muted">
                  <h4 className="font-semibold text-sm">Berekende Aankoopkosten</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {propertyType === "nieuwbouw" ? "BTW (10%)" : `ITP (${itpRate}%)`}
                      </span>
                      <span>{formatCurrency(btwOrItp)}</span>
                    </div>
                    {propertyType === "nieuwbouw" && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Zegelbelasting AJD (1.5%)</span>
                        <span>{formatCurrency(ajd)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Advocaat</span>
                      <span>{formatCurrency(advocaatTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Notaris & Registratie</span>
                      <span>{formatCurrency(notarisFee + registrationFee)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Overige kosten</span>
                      <span>{formatCurrency(volmacht + utilitiesSetup + bankFees + adminFees + nieFee)}</span>
                    </div>
                    <div className="h-px bg-border my-2" />
                    <div className="flex justify-between font-semibold">
                      <span>Totale aankoopkosten</span>
                      <span className="text-primary">{formatCurrency(totalPurchaseCosts)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Percentage van aankoopprijs</span>
                      <span>{((totalPurchaseCosts / purchasePrice) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="h-px bg-border my-2" />
                    <div className="flex justify-between text-base font-bold">
                      <span>Totale investering</span>
                      <span className="text-primary">{formatCurrency(totalInvestment)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sectie 2: Financiering (Hypotheek) */}
          <TabsContent value="financing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Financiering</CardTitle>
                <CardDescription>Configureer hypotheek financiering</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                  <div className="space-y-1">
                    <Label htmlFor="use-mortgage" className="text-base font-medium">
                      Financieren met hypotheek
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Gebruik een hypotheek om het hefboomeffect te berekenen
                    </p>
                  </div>
                  <Switch
                    id="use-mortgage"
                    checked={useMortgage}
                    onCheckedChange={setUseMortgage}
                  />
                </div>

                {useMortgage && (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="ltv-input">Loan-to-Value (LTV)</Label>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              Het hefboomeffect vergroot je rendement, maar ook je risico. Bij 60% LTV en 3.5% rente: elke 1% waardestijging levert circa 2.5% rendement op je eigen vermogen.
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Input
                          id="ltv-input"
                          type="number"
                          value={loanToValue}
                          onChange={(e) => setLoanToValue(Number(e.target.value))}
                          className="w-24 text-right"
                          min={0}
                          max={80}
                          step={5}
                        />
                      </div>
                      <Slider
                        value={[loanToValue]}
                        onValueChange={(value) => setLoanToValue(value[0])}
                        min={0}
                        max={80}
                        step={5}
                      />
                      <p className="text-sm text-muted-foreground">
                        {loanToValue}% van aankoopprijs = {formatCurrency(mortgageAmount)}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="interest-input">Hypotheekrente</Label>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              Spaanse hypotheken voor niet-residenten: 3-4.5% variabel. Vaste rente is 0.5-1% hoger. Vergelijk altijd meerdere banken.
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Input
                          id="interest-input"
                          type="number"
                          value={interestRate}
                          onChange={(e) => setInterestRate(Number(e.target.value))}
                          className="w-24 text-right"
                          min={2}
                          max={8}
                          step={0.1}
                        />
                      </div>
                      <Slider
                        value={[interestRate]}
                        onValueChange={(value) => setInterestRate(value[0])}
                        min={2}
                        max={8}
                        step={0.1}
                      />
                      <p className="text-sm text-muted-foreground">{interestRate.toFixed(1)}% per jaar</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="term-input">Looptijd hypotheek</Label>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              Een langere looptijd verlaagt de maandlast maar verhoogt de totale rentekosten. Bij 20 jaar betaal je circa 40% van de lening extra aan rente.
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Input
                          id="term-input"
                          type="number"
                          value={loanTermYears}
                          onChange={(e) => setLoanTermYears(Number(e.target.value))}
                          className="w-24 text-right"
                          min={5}
                          max={30}
                        />
                      </div>
                      <Slider
                        value={[loanTermYears]}
                        onValueChange={(value) => setLoanTermYears(value[0])}
                        min={5}
                        max={30}
                        step={1}
                      />
                      <p className="text-sm text-muted-foreground">{loanTermYears} jaar</p>
                    </div>

                    <div className="space-y-2 p-4 rounded-lg bg-muted">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Leenbedrag</span>
                        <span>{formatCurrency(mortgageAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Eigen inleg</span>
                        <span>{formatCurrency(equityInvestment)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Maandlast</span>
                        <span>{formatCurrency(monthlyMortgagePayment)}</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>Jaarlijkse hypotheeklast</span>
                        <span className="text-primary">{formatCurrency(yearlyMortgagePayment)}</span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sectie 3: Jaarlijkse Kosten */}
          <TabsContent value="costs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Jaarlijkse Kosten</CardTitle>
                <CardDescription>Vaste kosten die jaarlijks terugkeren</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-3 p-4 rounded-lg bg-muted/50">
                    <h4 className="font-medium text-sm">Automatisch berekend</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">IBI (onroerende zaakbelasting)</span>
                        <span>{formatCurrency(ibiTax)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Opstalverzekering</span>
                        <span>{formatCurrency(insurance)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>VvE kosten: €{communityFees}/jaar</Label>
                    <Slider
                      value={[communityFees]}
                      onValueChange={(value) => setCommunityFees(value[0])}
                      min={300}
                      max={3000}
                      step={50}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Nutsvoorzieningen: €{utilities}/jaar</Label>
                    <Slider
                      value={[utilities]}
                      onValueChange={(value) => setUtilities(value[0])}
                      min={600}
                      max={3000}
                      step={100}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Afvalstoffenheffing: €{wasteTax}/jaar</Label>
                    <Slider
                      value={[wasteTax]}
                      onValueChange={(value) => setWasteTax(value[0])}
                      min={50}
                      max={300}
                      step={10}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Onderhoud & reserves: €{maintenance}/jaar</Label>
                    <Slider
                      value={[maintenance]}
                      onValueChange={(value) => setMaintenance(value[0])}
                      min={300}
                      max={2000}
                      step={50}
                    />
                  </div>
                </div>

                <div className="space-y-2 p-4 rounded-lg bg-muted">
                  <div className="flex justify-between font-semibold">
                    <span>Totaal jaarlijkse kosten</span>
                    <span className="text-primary">{formatCurrency(totalAnnualCosts)}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      Jaarlijkse kostenstijging (inflatie)
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          Percentage waarmee de jaarlijkse kosten stijgen door inflatie
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <span className="text-sm font-medium">{costInflation}%</span>
                  </div>
                  <Slider
                    value={[costInflation]}
                    onValueChange={(value) => setCostInflation(value[0])}
                    min={0}
                    max={5}
                    step={0.5}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sectie 4: Verhuur & Bezetting */}
          <TabsContent value="rental" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Verhuurinkomsten & Bezetting</CardTitle>
                <CardDescription>
                  Stel je verwachte huurprijzen en bezettingsgraad in
                  {showMarketDataBadge && (
                    <span className="ml-2 text-xs text-primary">(automatisch ingevuld met Airbnb marktdata)</span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {!projectContext && (
                  <div className="space-y-2">
                    <Label htmlFor="rental-property-type">Type woning (voor prijsschatting)</Label>
                    <Select value={rentalPropertyType} onValueChange={setRentalPropertyType}>
                      <SelectTrigger id="rental-property-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="apartment">Appartement</SelectItem>
                        <SelectItem value="penthouse">Penthouse</SelectItem>
                        <SelectItem value="villa">Villa</SelectItem>
                        <SelectItem value="townhouse">Townhouse</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="low-season-input">Laagseizoen nachtprijs</Label>
                    <Input
                      id="low-season-input"
                      type="number"
                      value={lowSeasonRate}
                      onChange={(e) => setLowSeasonRate(Number(e.target.value))}
                      className="w-24 text-right"
                      min={50}
                      max={300}
                    />
                  </div>
                  <Slider
                    value={[lowSeasonRate]}
                    onValueChange={(value) => setLowSeasonRate(value[0])}
                    min={50}
                    max={300}
                    step={5}
                  />
                  <p className="text-sm text-muted-foreground">€{lowSeasonRate} per nacht (8 maanden)</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="high-season-input">Hoogseizoen nachtprijs</Label>
                    <Input
                      id="high-season-input"
                      type="number"
                      value={highSeasonRate}
                      onChange={(e) => setHighSeasonRate(Number(e.target.value))}
                      className="w-24 text-right"
                      min={75}
                      max={500}
                    />
                  </div>
                  <Slider
                    value={[highSeasonRate]}
                    onValueChange={(value) => setHighSeasonRate(value[0])}
                    min={75}
                    max={500}
                    step={5}
                  />
                  <p className="text-sm text-muted-foreground">€{highSeasonRate} per nacht (4 maanden)</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>Bezettingsgraad: {occupancyRate}%</Label>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        Een realistische bezettingsgraad ligt tussen 50-70%. Factoren: locatie, seizoen, concurrentie. Hogere percentages vragen actief verhuurbeleid en goede reviews.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Slider
                    value={[occupancyRate]}
                    onValueChange={(value) => setOccupancyRate(value[0])}
                    min={40}
                    max={85}
                    step={5}
                  />
                  <p className="text-sm text-muted-foreground">{occupiedDays} bezette dagen per jaar</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>Beheerkosten: {managementFee}%</Label>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        Full-service beheer (20-25%) omvat marketing, boekingen, schoonmaak en onderhoud. Zelf beheren bespaart geld maar vraagt tijd en lokale aanwezigheid.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Slider
                    value={[managementFee]}
                    onValueChange={(value) => setManagementFee(value[0])}
                    min={15}
                    max={30}
                    step={1}
                  />
                  <p className="text-sm text-muted-foreground">{formatCurrency(managementCosts)} per jaar</p>
                </div>

                <div className="space-y-3 p-4 rounded-lg bg-muted">
                  <h4 className="font-semibold text-sm">Berekende Huurinkomsten</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bruto jaarinkomen</span>
                      <span className="font-medium">{formatCurrency(grossAnnualIncome)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Beheerkosten ({managementFee}%)</span>
                      <span className="text-destructive">-{formatCurrency(managementCosts)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Aftrekbare kosten (pro rata {occupancyRate}%)</span>
                      <span className="text-destructive">-{formatCurrency(deductibleCosts)}</span>
                    </div>
                    <div className="h-px bg-border my-2" />
                    <div className="flex justify-between font-medium">
                      <span>Netto voor belastingen</span>
                      <span>{formatCurrency(netBeforeTax)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Spaanse inkomstenbelasting (19%)</span>
                      <span className="text-destructive">-{formatCurrency(spanishIncomeTax)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Niet-aftrekbare kosten</span>
                      <span className="text-destructive">-{formatCurrency(nonDeductibleCosts)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Niet-residentbelasting ({unrentedDays}d onverhuurd)</span>
                      <span className="text-destructive">-{formatCurrency(nonResidentTax)}</span>
                    </div>
                    <div className="h-px bg-border my-2" />
                    <div className="flex justify-between font-semibold">
                      <span>Netto jaarinkomen (basis, jaar 1)</span>
                      <span className="text-primary">{formatCurrency(netAnnualIncome)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sectie 5: Waardestijging & Horizon */}
          <TabsContent value="appreciation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Waardestijging & Beleggingshorizon</CardTitle>
                <CardDescription>Verwachtingen voor de lange termijn</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="appreciation-input">Verwachte jaarlijkse waardestijging</Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          De Costa's kennen de afgelopen jaren sterke groei (5-8%), maar vastgoed blijft cyclisch. Conservatief rekenen (3-4%) beschermt tegen teleurstelling. Historisch gemiddelde: 3-5%.
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="appreciation-input"
                      type="number"
                      value={yearlyAppreciation}
                      onChange={(e) => setYearlyAppreciation(Number(e.target.value))}
                      className="w-24 text-right"
                      min={0}
                      max={15}
                      step={0.5}
                    />
                  </div>
                  <Slider
                    value={[yearlyAppreciation]}
                    onValueChange={(value) => setYearlyAppreciation(value[0])}
                    min={0}
                    max={15}
                    step={0.5}
                  />
                  <p className="text-sm text-muted-foreground">{yearlyAppreciation}% per jaar</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="rental-growth-input">Jaarlijkse huurprijsstijging</Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          Korte termijn verhuur stijgt mee met vraag en inflatie. In populaire gebieden 4-6%/jaar, maar kan fluctueren met de economie. Start conservatief.
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="rental-growth-input"
                      type="number"
                      value={rentalGrowthRate}
                      onChange={(e) => setRentalGrowthRate(Number(e.target.value))}
                      className="w-24 text-right"
                      min={0}
                      max={15}
                      step={0.5}
                    />
                  </div>
                  <Slider
                    value={[rentalGrowthRate]}
                    onValueChange={(value) => setRentalGrowthRate(value[0])}
                    min={0}
                    max={15}
                    step={0.5}
                  />
                  <p className="text-sm text-muted-foreground">{rentalGrowthRate}% per jaar</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="horizon-input">Beleggingshorizon</Label>
                    <Input
                      id="horizon-input"
                      type="number"
                      value={investmentYears}
                      onChange={(e) => setInvestmentYears(Number(e.target.value))}
                      className="w-24 text-right"
                      min={5}
                      max={30}
                    />
                  </div>
                  <Slider
                    value={[investmentYears]}
                    onValueChange={(value) => setInvestmentYears(value[0])}
                    min={5}
                    max={30}
                    step={1}
                  />
                  <p className="text-sm text-muted-foreground">{investmentYears} jaar</p>
                </div>

                <div className="space-y-3 p-4 rounded-lg bg-muted">
                  <h4 className="font-semibold text-sm">Berekende Waardestijging</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Totale investering</span>
                      <span>{formatCurrency(totalInvestment)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Toekomstige woningwaarde (na {investmentYears} jaar)</span>
                      <span>{formatCurrency(futureValue)}</span>
                    </div>
                    <div className="h-px bg-border my-2" />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bruto meerwaarde</span>
                      <span>{formatCurrency(grossCapitalGain)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Meerwaarde belasting (19%)</span>
                      <span className="text-destructive">-{formatCurrency(capitalGainsTax)}</span>
                    </div>
                    <div className="h-px bg-border my-2" />
                    <div className="flex justify-between font-semibold">
                      <span>Netto meerwaarde na belasting</span>
                      <span className="text-primary">{formatCurrency(netCapitalGain)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Yearly Breakdown Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Jaarlijkse Breakdown</CardTitle>
                <CardDescription>Gedetailleerd overzicht per jaar</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowYearlyBreakdown(!showYearlyBreakdown)}
              >
                {showYearlyBreakdown ? 'Verbergen' : 'Tonen'}
              </Button>
            </div>
          </CardHeader>
          {showYearlyBreakdown && (
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jaar</TableHead>
                    <TableHead className="text-right">Bruto Huur</TableHead>
                    <TableHead className="text-right">Management</TableHead>
                    <TableHead className="text-right">Kosten</TableHead>
                    <TableHead className="text-right">Verhuurbelasting</TableHead>
                    <TableHead className="text-right">Niet-resident</TableHead>
                    {useMortgage && (
                      <>
                        <TableHead className="text-right">Rente</TableHead>
                        <TableHead className="text-right">Aflossing</TableHead>
                      </>
                    )}
                    <TableHead className="text-right">Netto Cashflow</TableHead>
                    <TableHead className="text-right">Vermogenswinst</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {yearlyBreakdown.map((row) => (
                    <TableRow key={row.year}>
                      <TableCell className="font-medium">{row.year}</TableCell>
                      <TableCell className="text-right text-green-600 dark:text-green-400">
                        {formatCurrency(row.grossRentalIncome)}
                      </TableCell>
                      <TableCell className="text-right text-red-600 dark:text-red-400">
                        -{formatCurrency(row.managementCostsYear)}
                      </TableCell>
                      <TableCell className="text-right text-red-600 dark:text-red-400">
                        -{formatCurrency(row.annualCostsYear)}
                      </TableCell>
                      <TableCell className="text-right text-red-600 dark:text-red-400">
                        -{formatCurrency(row.spanishIncomeTaxYear)}
                      </TableCell>
                      <TableCell className="text-right text-red-600 dark:text-red-400">
                        -{formatCurrency(row.nonResidentTaxYear)}
                      </TableCell>
                      {useMortgage && (
                        <>
                          <TableCell className="text-right text-orange-600 dark:text-orange-400">
                            -{formatCurrency(row.mortgageInterest)}
                          </TableCell>
                          <TableCell className="text-right text-orange-600 dark:text-orange-400">
                            -{formatCurrency(row.mortgagePrincipal)}
                          </TableCell>
                        </>
                      )}
                      <TableCell className={`text-right font-semibold ${row.netCashflow >= 0 ? 'text-primary' : 'text-destructive'}`}>
                        {formatCurrency(row.netCashflow)}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${row.netCapitalPosition >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {row.netCapitalPosition >= 0 ? '+' : ''}{formatCurrency(row.netCapitalPosition)}
                        {hasBreakEven && row.year === breakEvenYear && (
                          <span className="ml-1 text-xs text-primary">(break-even)</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="font-semibold bg-muted">
                    <TableCell>Totaal</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalGrossRentalBreakdown)}</TableCell>
                    <TableCell className="text-right">-{formatCurrency(totalManagementBreakdown)}</TableCell>
                    <TableCell className="text-right">-{formatCurrency(totalAnnualCostsBreakdown)}</TableCell>
                    <TableCell className="text-right">-{formatCurrency(totalSpanishTaxBreakdown)}</TableCell>
                    <TableCell className="text-right">-{formatCurrency(totalNonResidentTaxBreakdown)}</TableCell>
                    {useMortgage && (
                      <>
                        <TableCell className="text-right">-{formatCurrency(totalInterestBreakdown)}</TableCell>
                        <TableCell className="text-right">-{formatCurrency(totalPrincipalBreakdown)}</TableCell>
                      </>
                    )}
                    <TableCell className={`text-right ${totalNetCashflowBreakdown >= 0 ? 'text-primary' : 'text-destructive'}`}>
                      {formatCurrency(totalNetCashflowBreakdown)}
                    </TableCell>
                    <TableCell className={`text-right ${(yearlyBreakdown[investmentYears - 1]?.netCapitalPosition || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {(yearlyBreakdown[investmentYears - 1]?.netCapitalPosition || 0) >= 0 ? '+' : ''}
                      {formatCurrency(yearlyBreakdown[investmentYears - 1]?.netCapitalPosition || 0)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
              
              {hasBreakEven && (
                <div className="mt-4 p-3 bg-primary/10 rounded-md border border-primary/20">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="text-sm font-semibold text-primary">
                        Break-even in jaar {breakEvenYear}
                      </span>
                      <p className="text-sm text-muted-foreground">
                        Binnen {breakEvenYear} jaar is de woning voldoende in waarde gestegen om de aankoopkosten 
                        ({formatCurrency(totalPurchaseCosts)}) terug te verdienen.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          )}
        </Card>


        {/* Disclaimer */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Disclaimer:</strong> Deze berekening is een indicatie gebaseerd op de ingevulde gegevens. 
            Bij financiering is de hypotheekrente aftrekbaar van de verhuurbelasting (pro rata bezettingsgraad). 
            Werkelijke resultaten kunnen afwijken door marktomstandigheden, wisselende huurprijzen, 
            onvoorziene kosten en andere factoren. Raadpleeg altijd een financieel adviseur voor persoonlijk advies.
          </AlertDescription>
        </Alert>

        {/* Scenario Dialogs */}
        <SaveScenarioDialog
          open={saveDialogOpen}
          onOpenChange={setSaveDialogOpen}
          onSave={handleSaveScenario}
          isLoading={saveScenario.isPending}
        />
        
        <ScenariosSheet
          open={scenariosSheetOpen}
          onOpenChange={setScenariosSheetOpen}
          scenarios={scenarios}
          onLoad={handleLoadScenario}
          onDelete={(id) => deleteScenario.mutate(id)}
          isLoading={scenariosLoading}
        />
        </div>
        
        {/* Live Summary Sidebar - Desktop Only */}
        {!isMobile && (
          <div className="lg:sticky lg:top-4 h-fit">
            <ROILiveSummary
              annualROI={annualROI}
              totalROI={totalROI}
              investmentYears={investmentYears}
              netRentalYield={netRentalYield}
              averageCashflow={averageCashflow}
              totalReturn={totalReturn}
              futureValue={futureValue}
              totalInvestment={totalInvestment}
              useMortgage={useMortgage}
              annualROE={annualROE}
              returnOnEquity={returnOnEquity}
              equityInvestment={equityInvestment}
              formatCurrency={formatCurrency}
              yearlyAppreciation={yearlyAppreciation}
              occupancyRate={occupancyRate}
              rentalGrowthRate={rentalGrowthRate}
            />
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
