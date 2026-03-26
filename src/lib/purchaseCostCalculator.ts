/**
 * Purchase Cost Calculator Utility
 * Centralized logic for calculating Spanish property purchase costs
 * Used by DashboardPurchaseCostsCalculator, SharedROICalculator, and InvestmentDashboard
 */

export type PropertyType = "nieuwbouw" | "bestaand";

export interface PurchaseCostResult {
  totalCosts: number;
  percentage: number;
  totalInvestment: number;
}

export interface AnnualCostRange {
  minAnnual: number;
  maxAnnual: number;
}

export interface DetailedPurchaseCosts {
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
  total: number;
}

/**
 * Calculate total purchase costs for Spanish property
 * Matches exact logic from DashboardPurchaseCostsCalculator
 */
export function calculatePurchaseCosts(
  purchasePrice: number,
  propertyType: PropertyType = "nieuwbouw",
  itpRate: number = 7.75
): PurchaseCostResult {
  // BTW (10%) for nieuwbouw, ITP (variable %) for bestaand
  const btwOrItp = propertyType === "nieuwbouw" 
    ? purchasePrice * 0.10 
    : purchasePrice * (itpRate / 100);
  
  // AJD (Zegelbelasting) 1.5% only for nieuwbouw
  const ajd = propertyType === "nieuwbouw" ? purchasePrice * 0.015 : 0;
  
  // Advocaat: 1% + 21% BTW
  const advocaat = purchasePrice * 0.01 * 1.21;
  
  // Fixed costs
  const notaris = 2000;
  const registratie = 800;
  const volmacht = 700;
  const bankkosten = 200;
  const administratie = 250;
  const nie = 20;
  
  // Utilities setup
  const nutsvoorzieningen = propertyType === "nieuwbouw" ? 300 : 150;
  
  const totalCosts = btwOrItp + ajd + advocaat + notaris + registratie + 
                     volmacht + nutsvoorzieningen + bankkosten + administratie + nie;
  
  return {
    totalCosts: Math.round(totalCosts),
    percentage: (totalCosts / purchasePrice) * 100,
    totalInvestment: Math.round(purchasePrice + totalCosts)
  };
}

/**
 * Calculate detailed breakdown of purchase costs
 */
export function calculateDetailedPurchaseCosts(
  purchasePrice: number,
  propertyType: PropertyType = "nieuwbouw",
  itpRate: number = 7.75
): DetailedPurchaseCosts {
  const btwOrItp = propertyType === "nieuwbouw" 
    ? purchasePrice * 0.10 
    : purchasePrice * (itpRate / 100);
  
  const ajd = propertyType === "nieuwbouw" ? purchasePrice * 0.015 : 0;
  const advocaat = purchasePrice * 0.01 * 1.21;
  const nutsvoorzieningen = propertyType === "nieuwbouw" ? 300 : 150;
  
  const costs = {
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
  };
  
  return {
    ...costs,
    total: Object.values(costs).reduce((sum, val) => sum + val, 0)
  };
}

/**
 * Detailed annual costs with descriptions for PDF generation
 */
export interface DetailedAnnualCosts {
  ibi: { amount: number; description: string; calculation: string };
  insurance: { amount: number; description: string; calculation: string };
  comunidad: { amount: number; minMax: [number, number]; description: string };
  utilities: { amount: number; minMax: [number, number]; description: string };
  basura: { amount: number; description: string };
  maintenance: { amount: number; description: string; calculation: string };
  total: number;
  minTotal: number;
  maxTotal: number;
}

/**
 * Detailed purchase costs with descriptions for PDF generation
 */
export interface DetailedPurchaseCostsWithDescriptions {
  btwOrItp: { amount: number; label: string; description: string; percentage: number };
  ajd: { amount: number; label: string; description: string; percentage: number } | null;
  advocaat: { amount: number; label: string; description: string };
  notaris: { amount: number; label: string; description: string };
  registratie: { amount: number; label: string; description: string };
  volmacht: { amount: number; label: string; description: string };
  nutsvoorzieningen: { amount: number; label: string; description: string };
  bankkosten: { amount: number; label: string; description: string };
  administratie: { amount: number; label: string; description: string };
  nie: { amount: number; label: string; description: string };
  total: number;
  percentage: number;
}

/**
 * Calculate annual cost range for property ownership
 * Returns min/max range without individual breakdown
 * Based on SharedROICalculator logic
 */
export function calculateAnnualCostRange(purchasePrice: number): AnnualCostRange {
  // IBI (Gemeentetaks): ~0.18% of purchase price
  const ibiTax = Math.round(purchasePrice * 0.0018);
  
  // Insurance: ~0.09% of purchase price
  const insurance = Math.round(purchasePrice * 0.0009);
  
  // Waste tax (Basura): fixed ~€100/year
  const wasteTax = 100;
  
  // VvE (Comunidad): ranges from €600-1200/year
  const minVve = 600;
  const maxVve = 1200;
  
  // Utilities: ranges from €800-1500/year
  const minUtilities = 800;
  const maxUtilities = 1500;
  
  // Maintenance: 0.2-0.3% of purchase price
  const minMaintenance = Math.round(purchasePrice * 0.002);
  const maxMaintenance = Math.round(purchasePrice * 0.003);
  
  const minAnnual = ibiTax + insurance + wasteTax + minVve + minUtilities + minMaintenance;
  const maxAnnual = ibiTax + insurance + wasteTax + maxVve + maxUtilities + maxMaintenance;
  
  return { 
    minAnnual: Math.round(minAnnual), 
    maxAnnual: Math.round(maxAnnual) 
  };
}

/**
 * Calculate detailed annual costs with descriptions for PDF
 */
export function calculateDetailedAnnualCosts(purchasePrice: number): DetailedAnnualCosts {
  const ibiAmount = Math.round(purchasePrice * 0.0018);
  const insuranceAmount = Math.round(purchasePrice * 0.0009);
  const basuraAmount = 100;
  const maintenanceAmount = Math.round(purchasePrice * 0.0025);
  
  const comunidadMin = 600;
  const comunidadMax = 1200;
  const comunidadAvg = 900;
  
  const utilitiesMin = 800;
  const utilitiesMax = 1500;
  const utilitiesAvg = 1150;
  
  const minTotal = ibiAmount + insuranceAmount + basuraAmount + comunidadMin + utilitiesMin + Math.round(purchasePrice * 0.002);
  const maxTotal = ibiAmount + insuranceAmount + basuraAmount + comunidadMax + utilitiesMax + Math.round(purchasePrice * 0.003);
  const avgTotal = ibiAmount + insuranceAmount + basuraAmount + comunidadAvg + utilitiesAvg + maintenanceAmount;
  
  return {
    ibi: {
      amount: ibiAmount,
      description: "De IBI (Impuesto sobre Bienes Inmuebles) is de Spaanse onroerendezaakbelasting, vergelijkbaar met de Nederlandse OZB. Dit is een jaarlijkse gemeentelijke belasting gebaseerd op de kadastrale waarde van uw woning.",
      calculation: "~0.18% van de aankoopwaarde"
    },
    insurance: {
      amount: insuranceAmount,
      description: "Een opstalverzekering is verplicht bij het afsluiten van een hypotheek en sterk aanbevolen voor elke eigenaar. Deze dekt schade aan het gebouw door brand, storm, waterschade en andere calamiteiten.",
      calculation: "~0.09% van de aankoopwaarde"
    },
    comunidad: {
      amount: comunidadAvg,
      minMax: [comunidadMin, comunidadMax],
      description: "De gemeenschapskosten (Comunidad de Propietarios) dekken het onderhoud van gemeenschappelijke voorzieningen zoals zwembaden, tuinen, liften en gemeenschappelijke verzekeringen. Het bedrag varieert sterk per complex."
    },
    utilities: {
      amount: utilitiesAvg,
      minMax: [utilitiesMin, utilitiesMax],
      description: "Nutsvoorzieningen omvatten elektriciteit, water, gas (indien aanwezig) en eventueel airconditioning. Het werkelijke verbruik hangt af van uw gebruikspatroon en of u de woning zelf bewoont of verhuurt."
    },
    basura: {
      amount: basuraAmount,
      description: "De basura is de gemeentelijke afvalheffing. Dit is een vast bedrag per woning dat jaarlijks door de gemeente wordt geïnd."
    },
    maintenance: {
      amount: maintenanceAmount,
      description: "Een verstandige reservering voor onderhoud en kleine reparaties. Dit dekt zaken als schilderwerk, loodgieterwerk, apparaten en andere onvoorziene kosten die bij vastgoedbezit komen kijken.",
      calculation: "~0.25% van de aankoopwaarde"
    },
    total: avgTotal,
    minTotal,
    maxTotal
  };
}

/**
 * Calculate detailed purchase costs with descriptions for PDF
 */
export function calculateDetailedPurchaseCostsWithDescriptions(
  purchasePrice: number,
  propertyType: PropertyType = "nieuwbouw",
  itpRate: number = 7.75,
  region: string = "murcia"
): DetailedPurchaseCostsWithDescriptions {
  const isNieuwbouw = propertyType === "nieuwbouw";
  const actualItpRate = region.toLowerCase().includes("alicante") ? 10 : itpRate;
  
  const btwOrItpAmount = isNieuwbouw 
    ? purchasePrice * 0.10 
    : purchasePrice * (actualItpRate / 100);
  
  const ajdAmount = isNieuwbouw ? purchasePrice * 0.015 : 0;
  const advocaatAmount = purchasePrice * 0.01 * 1.21;
  const notarisAmount = 2000;
  const registratieAmount = 800;
  const volmachtAmount = 700;
  const nutsvoorzieningenAmount = isNieuwbouw ? 300 : 150;
  const bankkostenAmount = 200;
  const administratieAmount = 250;
  const nieAmount = 20;
  
  const total = btwOrItpAmount + ajdAmount + advocaatAmount + notarisAmount + 
                registratieAmount + volmachtAmount + nutsvoorzieningenAmount + 
                bankkostenAmount + administratieAmount + nieAmount;
  
  return {
    btwOrItp: {
      amount: Math.round(btwOrItpAmount),
      label: isNieuwbouw ? "BTW (IVA) 10%" : `ITP ${actualItpRate}%`,
      description: isNieuwbouw 
        ? "Bij nieuwbouw betaalt u 10% BTW (IVA - Impuesto sobre el Valor Añadido) over de aankoopprijs. Dit is vergelijkbaar met de Nederlandse situatie bij nieuwbouwwoningen."
        : `Bij bestaande bouw betaalt u overdrachtsbelasting (ITP - Impuesto de Transmisiones Patrimoniales). In ${region.toLowerCase().includes("alicante") ? "de Comunidad Valenciana" : "de regio Murcia"} is dit ${actualItpRate}%.`,
      percentage: isNieuwbouw ? 10 : actualItpRate
    },
    ajd: isNieuwbouw ? {
      amount: Math.round(ajdAmount),
      label: "Zegelrecht (AJD) 1.5%",
      description: "De AJD (Actos Jurídicos Documentados) is een belasting op officiële documenten en akten. Deze is alleen verschuldigd bij nieuwbouwaankopen en bedraagt 1.5% in de regio Murcia.",
      percentage: 1.5
    } : null,
    advocaat: {
      amount: Math.round(advocaatAmount),
      label: "Advocaat (1% + 21% BTW)",
      description: "Uw advocaat (abogado) controleert de juridische status van de woning, het bouwvergunningentraject, de urbanisatiestatus en begeleidt u bij de notaris. Dit is een essentiële investering voor uw juridische zekerheid en gemoedsrust."
    },
    notaris: {
      amount: notarisAmount,
      label: "Notariskosten",
      description: "De notaris (notario) stelt de officiële koopakte (escritura pública) op en zorgt voor de juridische overdracht van het eigendom. De kosten zijn gebaseerd op wettelijke tarieven."
    },
    registratie: {
      amount: registratieAmount,
      label: "Kadaster/Registratie",
      description: "Het Registro de la Propiedad registreert uw eigendomsrecht officieel. Deze inschrijving is essentieel voor uw rechtspositie als eigenaar."
    },
    volmacht: {
      amount: volmachtAmount,
      label: "Volmacht (Poder)",
      description: "Een notariële volmacht geeft uw advocaat de bevoegdheid om namens u te handelen bij de overdracht en andere administratieve handelingen. Dit is vooral handig als u niet fysiek aanwezig kunt zijn."
    },
    nutsvoorzieningen: {
      amount: nutsvoorzieningenAmount,
      label: isNieuwbouw ? "Nutsaansluitingen" : "Overschrijving nutsbedrijven",
      description: isNieuwbouw
        ? "Bij nieuwbouw moeten de aansluitingen voor elektriciteit, water en eventueel gas worden gerealiseerd. Dit zijn eenmalige aansluitkosten."
        : "Bij bestaande bouw worden de contracten van nutsbedrijven op uw naam gezet. Dit brengt administratiekosten met zich mee."
    },
    bankkosten: {
      amount: bankkostenAmount,
      label: "Bankkosten",
      description: "Kosten voor het openen van een Spaanse bankrekening en de administratieve afhandeling van de transactie."
    },
    administratie: {
      amount: administratieAmount,
      label: "Administratie & Gestoría",
      description: "De gestoría handelt alle administratieve formaliteiten af, zoals belastingaangiften, overschrijvingen en communicatie met Spaanse instanties."
    },
    nie: {
      amount: nieAmount,
      label: "NIE-nummer",
      description: "Het NIE (Número de Identificación de Extranjero) is uw Spaanse identificatienummer voor buitenlanders. Dit is verplicht voor elke vastgoedtransactie in Spanje."
    },
    total: Math.round(total),
    percentage: (total / purchasePrice) * 100
  };
}

/**
 * Calculate monthly mortgage payment using annuity formula
 * Based on SharedROICalculator logic
 */
export function calculateAnnuityPayment(
  principal: number, 
  annualRate: number, 
  years: number
): number {
  const monthlyRate = annualRate / 100 / 12;
  const payments = years * 12;
  
  if (monthlyRate === 0) {
    return principal / payments;
  }
  
  return principal * (monthlyRate * Math.pow(1 + monthlyRate, payments)) / 
         (Math.pow(1 + monthlyRate, payments) - 1);
}

/**
 * Calculate standard mortgage scenario
 * 70% LTV, 3.5% interest, 20 years
 */
export function calculateStandardMortgage(purchasePrice: number, purchaseCosts: number) {
  const ltv = 0.70;
  const interestRate = 3.5;
  const years = 20;
  
  const mortgageAmount = purchasePrice * ltv;
  const ownCapital = purchasePrice * (1 - ltv) + purchaseCosts;
  const monthlyPayment = calculateAnnuityPayment(mortgageAmount, interestRate, years);
  
  return {
    mortgageAmount: Math.round(mortgageAmount),
    ownCapital: Math.round(ownCapital),
    monthlyPayment: Math.round(monthlyPayment),
    interestRate,
    years,
    ltv: ltv * 100
  };
}
