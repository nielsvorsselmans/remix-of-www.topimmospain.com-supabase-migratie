/**
 * Financing Scenarios Calculator
 * Calculates 3 different financing scenarios (70%, 50%, 30% LTV)
 * with cashflow analysis, ROE projections, and break-even calculations
 */

export interface FinancingScenario {
  name: string;
  description: string;
  ltv: number;                    // 0.70, 0.50, 0.30
  mortgageAmount: number;
  ownCapital: number;             // Includes purchase costs
  interestRate: number;           // Annual percentage
  years: number;                  // Loan term
  monthlyPayment: number;
  yearlyInterest: number;         // First year interest payment
  yearlyPrincipal: number;        // First year principal payment
  netMonthlyCashflow: number;     // After rental income - costs
  breakEvenOccupancy: number;     // Occupancy % needed to break even
  roeYear1: number;               // Return on Equity year 1
  roeYear10: number;              // Return on Equity year 10
  advantages: string[];
  disadvantages: string[];
}

export interface TenYearProjection {
  year: number;
  propertyValue: number;
  mortgageBalance: number;
  cumulativeRentalIncome: number;
  cumulativeAppreciation: number;
  totalEquity: number;
  cumulativeROI: number;
}

export interface FinancingScenariosResult {
  scenarios: FinancingScenario[];
  projections: {
    scenario70: TenYearProjection[];
    scenario50: TenYearProjection[];
    scenario30: TenYearProjection[];
  };
  summary: {
    purchasePrice: number;
    purchaseCosts: number;
    totalInvestment: number;
    netAnnualRentalIncome: number;
    yearlyAppreciation: number;
  };
}

/**
 * Calculate monthly mortgage payment using annuity formula
 */
function calculateAnnuityPayment(
  principal: number,
  annualRate: number,
  years: number
): number {
  const monthlyRate = annualRate / 100 / 12;
  const payments = years * 12;

  if (monthlyRate === 0) {
    return principal / payments;
  }

  return (
    principal *
    ((monthlyRate * Math.pow(1 + monthlyRate, payments)) /
      (Math.pow(1 + monthlyRate, payments) - 1))
  );
}

/**
 * Calculate mortgage balance after N years
 */
function calculateMortgageBalance(
  principal: number,
  annualRate: number,
  years: number,
  yearsElapsed: number
): number {
  if (yearsElapsed >= years) return 0;
  
  const monthlyRate = annualRate / 100 / 12;
  const totalPayments = years * 12;
  const paymentsMade = yearsElapsed * 12;
  
  if (monthlyRate === 0) {
    return principal * (1 - paymentsMade / totalPayments);
  }
  
  const monthlyPayment = calculateAnnuityPayment(principal, annualRate, years);
  const balance = 
    principal * Math.pow(1 + monthlyRate, paymentsMade) -
    monthlyPayment * ((Math.pow(1 + monthlyRate, paymentsMade) - 1) / monthlyRate);
  
  return Math.max(0, balance);
}

/**
 * Calculate first year interest payment
 */
function calculateFirstYearInterest(
  principal: number,
  annualRate: number,
  years: number
): number {
  const monthlyRate = annualRate / 100 / 12;
  const monthlyPayment = calculateAnnuityPayment(principal, annualRate, years);
  
  let totalInterest = 0;
  let balance = principal;
  
  for (let month = 0; month < 12; month++) {
    const interestPayment = balance * monthlyRate;
    const principalPayment = monthlyPayment - interestPayment;
    totalInterest += interestPayment;
    balance -= principalPayment;
  }
  
  return totalInterest;
}

/**
 * Generate 10-year projection for a single scenario
 */
function generateProjection(
  purchasePrice: number,
  purchaseCosts: number,
  mortgageAmount: number,
  ownCapital: number,
  interestRate: number,
  years: number,
  netAnnualRentalIncome: number,
  yearlyAppreciation: number,
  rentalGrowthRate: number = 0.03
): TenYearProjection[] {
  const projections: TenYearProjection[] = [];
  
  for (let year = 1; year <= 10; year++) {
    const propertyValue = purchasePrice * Math.pow(1 + yearlyAppreciation, year);
    const mortgageBalance = calculateMortgageBalance(mortgageAmount, interestRate, years, year);
    
    // Cumulative rental income with growth
    let cumulativeRental = 0;
    for (let y = 1; y <= year; y++) {
      cumulativeRental += netAnnualRentalIncome * Math.pow(1 + rentalGrowthRate, y - 1);
    }
    
    const cumulativeAppreciation = propertyValue - purchasePrice;
    const totalEquity = propertyValue - mortgageBalance + cumulativeRental;
    const cumulativeROI = ((totalEquity - ownCapital) / ownCapital) * 100;
    
    projections.push({
      year,
      propertyValue: Math.round(propertyValue),
      mortgageBalance: Math.round(mortgageBalance),
      cumulativeRentalIncome: Math.round(cumulativeRental),
      cumulativeAppreciation: Math.round(cumulativeAppreciation),
      totalEquity: Math.round(totalEquity),
      cumulativeROI: Math.round(cumulativeROI * 10) / 10,
    });
  }
  
  return projections;
}

/**
 * Calculate 3 financing scenarios with full analysis
 */
export function calculateFinancingScenarios(
  purchasePrice: number,
  purchaseCosts: number,
  netAnnualRentalIncome: number,
  annualCosts: number,
  yearlyAppreciation: number = 0.03,
  interestRate: number = 3.5,
  loanTermYears: number = 20,
  rentalGrowthRate: number = 0.03
): FinancingScenariosResult {
  const ltvOptions = [0.70, 0.50, 0.30];
  const totalInvestment = purchasePrice + purchaseCosts;
  
  const scenarios: FinancingScenario[] = ltvOptions.map((ltv, index) => {
    const mortgageAmount = purchasePrice * ltv;
    const ownCapital = purchasePrice * (1 - ltv) + purchaseCosts;
    const monthlyPayment = calculateAnnuityPayment(mortgageAmount, interestRate, loanTermYears);
    const yearlyMortgagePayment = monthlyPayment * 12;
    const yearlyInterest = calculateFirstYearInterest(mortgageAmount, interestRate, loanTermYears);
    const yearlyPrincipal = yearlyMortgagePayment - yearlyInterest;
    
    // Net cashflow = rental income - mortgage - annual costs
    const netYearlyCashflow = netAnnualRentalIncome - yearlyMortgagePayment - annualCosts;
    const netMonthlyCashflow = netYearlyCashflow / 12;
    
    // Break-even occupancy: what occupancy is needed to cover all costs
    // Assuming netAnnualRentalIncome is based on 100% occupancy baseline
    const totalYearlyCosts = yearlyMortgagePayment + annualCosts;
    const breakEvenOccupancy = netAnnualRentalIncome > 0 
      ? Math.min(100, Math.round((totalYearlyCosts / (netAnnualRentalIncome * 1.5)) * 100))
      : 100;
    
    // ROE Year 1: (rental income + appreciation - mortgage costs - annual costs) / own capital
    const year1Appreciation = purchasePrice * yearlyAppreciation;
    const roeYear1 = ((netAnnualRentalIncome - yearlyMortgagePayment - annualCosts + year1Appreciation) / ownCapital) * 100;
    
    // ROE Year 10: Total accumulated value vs initial investment
    const year10PropertyValue = purchasePrice * Math.pow(1 + yearlyAppreciation, 10);
    const year10MortgageBalance = calculateMortgageBalance(mortgageAmount, interestRate, loanTermYears, 10);
    let cumulativeRental = 0;
    for (let y = 1; y <= 10; y++) {
      cumulativeRental += (netAnnualRentalIncome - annualCosts - yearlyMortgagePayment * Math.pow(0.98, y - 1)) * Math.pow(1 + rentalGrowthRate, y - 1);
    }
    const year10Equity = year10PropertyValue - year10MortgageBalance + Math.max(0, cumulativeRental);
    const roeYear10 = ((year10Equity - ownCapital) / ownCapital) * 100;
    
    const scenarioNames = [
      { name: "Maximaal Lenen (70%)", desc: "Maximaliseer uw hefboomwerking met de laagste eigen inleg" },
      { name: "Gebalanceerd (50%)", desc: "Evenwicht tussen hefboom en financiële zekerheid" },
      { name: "Conservatief (30%)", desc: "Minimale schuld met maximale cashflow zekerheid" },
    ];
    
    const advantages: string[][] = [
      ["Laagste eigen inleg", "Hoogste ROE bij waardestijging", "Maximaal hefboomeffect"],
      ["Goede balans risico/rendement", "Lagere maandlasten", "Flexibiliteit behouden"],
      ["Hoogste cashflow", "Laagste renterisico", "Meeste financiële rust"],
    ];
    
    const disadvantages: string[][] = [
      ["Hogere maandlasten", "Meer renterisico", "Minder cashflow buffer"],
      ["Hogere eigen inleg nodig", "Minder hefboom", "Gematigder rendement"],
      ["Hoogste eigen inleg", "Laagste ROE", "Kapitaal gebonden"],
    ];
    
    return {
      name: scenarioNames[index].name,
      description: scenarioNames[index].desc,
      ltv,
      mortgageAmount: Math.round(mortgageAmount),
      ownCapital: Math.round(ownCapital),
      interestRate,
      years: loanTermYears,
      monthlyPayment: Math.round(monthlyPayment),
      yearlyInterest: Math.round(yearlyInterest),
      yearlyPrincipal: Math.round(yearlyPrincipal),
      netMonthlyCashflow: Math.round(netMonthlyCashflow),
      breakEvenOccupancy,
      roeYear1: Math.round(roeYear1 * 10) / 10,
      roeYear10: Math.round(roeYear10 * 10) / 10,
      advantages: advantages[index],
      disadvantages: disadvantages[index],
    };
  });
  
  // Generate 10-year projections for each scenario
  const projections = {
    scenario70: generateProjection(
      purchasePrice, purchaseCosts, scenarios[0].mortgageAmount, scenarios[0].ownCapital,
      interestRate, loanTermYears, netAnnualRentalIncome - annualCosts, yearlyAppreciation, rentalGrowthRate
    ),
    scenario50: generateProjection(
      purchasePrice, purchaseCosts, scenarios[1].mortgageAmount, scenarios[1].ownCapital,
      interestRate, loanTermYears, netAnnualRentalIncome - annualCosts, yearlyAppreciation, rentalGrowthRate
    ),
    scenario30: generateProjection(
      purchasePrice, purchaseCosts, scenarios[2].mortgageAmount, scenarios[2].ownCapital,
      interestRate, loanTermYears, netAnnualRentalIncome - annualCosts, yearlyAppreciation, rentalGrowthRate
    ),
  };
  
  return {
    scenarios,
    projections,
    summary: {
      purchasePrice,
      purchaseCosts: Math.round(purchaseCosts),
      totalInvestment: Math.round(totalInvestment),
      netAnnualRentalIncome: Math.round(netAnnualRentalIncome),
      yearlyAppreciation,
    },
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}
