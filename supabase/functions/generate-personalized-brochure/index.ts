import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BrochureRequest {
  projectId: string;
  recipientName: string;
  recipientEmail?: string;
  purchasePrice?: number;
  yearlyAppreciation?: number;
  rentalGrowthRate?: number;
  costInflation?: number;
  investmentYears?: number;
  managementFee?: number;
}

interface Property {
  id: string;
  title: string;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  area_sqm?: number;
  property_type?: string;
  status?: string;
}

interface RentalData {
  avgMonthlyRevenue?: number;
  occupancyRate?: number;
  avgDailyRate?: number;
  annualRevenue?: number;
  currency?: string;
  comparables?: any[];
  monthlyDistributions?: number[];
}

interface FinancingScenario {
  name: string;
  description: string;
  ltv: number;
  mortgageAmount: number;
  ownCapital: number;
  monthlyPayment: number;
  yearlyInterest: number;
  netMonthlyCashflow: number;
  roeYear1: number;
  roeYear10: number;
  advantages: string[];
  disadvantages: string[];
}

interface TenYearProjection {
  year: number;
  propertyValue: number;
  mortgageBalance: number;
  cumulativeRentalIncome: number;
  cumulativeAppreciation: number;
  totalEquity: number;
  cumulativeROI: number;
}

// ============= CALCULATION FUNCTIONS =============

function calculateAnnuityPayment(principal: number, annualRate: number, years: number): number {
  const monthlyRate = annualRate / 100 / 12;
  const payments = years * 12;
  if (monthlyRate === 0) return principal / payments;
  return principal * ((monthlyRate * Math.pow(1 + monthlyRate, payments)) / (Math.pow(1 + monthlyRate, payments) - 1));
}

function calculateMortgageBalance(principal: number, annualRate: number, years: number, yearsElapsed: number): number {
  if (yearsElapsed >= years) return 0;
  const monthlyRate = annualRate / 100 / 12;
  const paymentsMade = yearsElapsed * 12;
  if (monthlyRate === 0) return principal * (1 - paymentsMade / (years * 12));
  const monthlyPayment = calculateAnnuityPayment(principal, annualRate, years);
  const balance = principal * Math.pow(1 + monthlyRate, paymentsMade) -
    monthlyPayment * ((Math.pow(1 + monthlyRate, paymentsMade) - 1) / monthlyRate);
  return Math.max(0, balance);
}

function calculateFirstYearInterest(principal: number, annualRate: number, years: number): number {
  const monthlyRate = annualRate / 100 / 12;
  const monthlyPayment = calculateAnnuityPayment(principal, annualRate, years);
  let totalInterest = 0;
  let balance = principal;
  for (let month = 0; month < 12; month++) {
    const interestPayment = balance * monthlyRate;
    totalInterest += interestPayment;
    balance -= (monthlyPayment - interestPayment);
  }
  return totalInterest;
}

function calculateFinancingScenarios(
  purchasePrice: number,
  purchaseCosts: number,
  netAnnualRentalIncome: number,
  annualCosts: number,
  yearlyAppreciation: number = 0.03,
  interestRate: number = 3.5,
  loanTermYears: number = 20
): { scenarios: FinancingScenario[]; projections: Record<string, TenYearProjection[]> } {
  const ltvOptions = [0.70, 0.50, 0.30];
  const scenarioNames = [
    { name: "Maximaal Lenen (70%)", desc: "Maximaliseer uw hefboomwerking met de laagste eigen inleg" },
    { name: "Gebalanceerd (50%)", desc: "Evenwicht tussen hefboom en financiële zekerheid" },
    { name: "Conservatief (30%)", desc: "Minimale schuld met maximale cashflow zekerheid" },
  ];
  const advantages = [
    ["Laagste eigen inleg", "Hoogste ROE bij waardestijging", "Maximaal hefboomeffect"],
    ["Goede balans risico/rendement", "Lagere maandlasten", "Flexibiliteit behouden"],
    ["Hoogste cashflow", "Laagste renterisico", "Meeste financiële rust"],
  ];
  const disadvantages = [
    ["Hogere maandlasten", "Meer renterisico", "Minder cashflow buffer"],
    ["Hogere eigen inleg nodig", "Minder hefboom", "Gematigder rendement"],
    ["Hoogste eigen inleg", "Laagste ROE", "Kapitaal gebonden"],
  ];

  const scenarios: FinancingScenario[] = ltvOptions.map((ltv, index) => {
    const mortgageAmount = purchasePrice * ltv;
    const ownCapital = purchasePrice * (1 - ltv) + purchaseCosts;
    const monthlyPayment = calculateAnnuityPayment(mortgageAmount, interestRate, loanTermYears);
    const yearlyMortgagePayment = monthlyPayment * 12;
    const yearlyInterest = calculateFirstYearInterest(mortgageAmount, interestRate, loanTermYears);
    const netYearlyCashflow = netAnnualRentalIncome - yearlyMortgagePayment - annualCosts;
    const year1Appreciation = purchasePrice * yearlyAppreciation;
    const roeYear1 = ((netAnnualRentalIncome - yearlyMortgagePayment - annualCosts + year1Appreciation) / ownCapital) * 100;
    const year10PropertyValue = purchasePrice * Math.pow(1 + yearlyAppreciation, 10);
    const year10MortgageBalance = calculateMortgageBalance(mortgageAmount, interestRate, loanTermYears, 10);
    let cumulativeRental = 0;
    for (let y = 1; y <= 10; y++) {
      cumulativeRental += (netAnnualRentalIncome - annualCosts - yearlyMortgagePayment) * Math.pow(1.03, y - 1);
    }
    const year10Equity = year10PropertyValue - year10MortgageBalance + Math.max(0, cumulativeRental);
    const roeYear10 = ((year10Equity - ownCapital) / ownCapital) * 100;

    return {
      name: scenarioNames[index].name,
      description: scenarioNames[index].desc,
      ltv,
      mortgageAmount: Math.round(mortgageAmount),
      ownCapital: Math.round(ownCapital),
      monthlyPayment: Math.round(monthlyPayment),
      yearlyInterest: Math.round(yearlyInterest),
      netMonthlyCashflow: Math.round(netYearlyCashflow / 12),
      roeYear1: Math.round(roeYear1 * 10) / 10,
      roeYear10: Math.round(roeYear10 * 10) / 10,
      advantages: advantages[index],
      disadvantages: disadvantages[index],
    };
  });

  // Generate 10-year projections
  const projections: Record<string, TenYearProjection[]> = {};
  ["scenario70", "scenario50", "scenario30"].forEach((key, index) => {
    const ltv = ltvOptions[index];
    const mortgageAmount = purchasePrice * ltv;
    const ownCapital = purchasePrice * (1 - ltv) + purchaseCosts;
    projections[key] = [];
    for (let year = 1; year <= 10; year++) {
      const propertyValue = purchasePrice * Math.pow(1 + yearlyAppreciation, year);
      const mortgageBalance = calculateMortgageBalance(mortgageAmount, interestRate, loanTermYears, year);
      let cumulativeRental = 0;
      for (let y = 1; y <= year; y++) {
        cumulativeRental += (netAnnualRentalIncome - annualCosts) * Math.pow(1.03, y - 1);
      }
      const cumulativeAppreciation = propertyValue - purchasePrice;
      const totalEquity = propertyValue - mortgageBalance + cumulativeRental;
      projections[key].push({
        year,
        propertyValue: Math.round(propertyValue),
        mortgageBalance: Math.round(mortgageBalance),
        cumulativeRentalIncome: Math.round(cumulativeRental),
        cumulativeAppreciation: Math.round(cumulativeAppreciation),
        totalEquity: Math.round(totalEquity),
        cumulativeROI: Math.round(((totalEquity - ownCapital) / ownCapital) * 1000) / 10,
      });
    }
  });

  return { scenarios, projections };
}

function calculatePurchaseCosts(purchasePrice: number, isNieuwbouw: boolean, itpRate: number = 7.75) {
  const btwOrItp = isNieuwbouw ? purchasePrice * 0.10 : purchasePrice * (itpRate / 100);
  const ajd = isNieuwbouw ? purchasePrice * 0.015 : 0;
  const advocaat = purchasePrice * 0.01 * 1.21;
  const notaris = 2000;
  const registratie = 800;
  const volmacht = 700;
  const nutsvoorzieningen = isNieuwbouw ? 300 : 150;
  const bankkosten = 200;
  const administratie = 250;
  const nie = 20;
  const total = btwOrItp + ajd + advocaat + notaris + registratie + volmacht + nutsvoorzieningen + bankkosten + administratie + nie;
  
  return {
    items: [
      { label: isNieuwbouw ? "BTW (IVA) 10%" : `ITP ${itpRate}%`, amount: btwOrItp, desc: isNieuwbouw ? "Verplichte omzetbelasting bij nieuwbouw" : "Overdrachtsbelasting bij bestaande bouw" },
      ...(isNieuwbouw ? [{ label: "Zegelrecht (AJD) 1.5%", amount: ajd, desc: "Belasting op officiële documenten" }] : []),
      { label: "Advocaat (1% + BTW)", amount: advocaat, desc: "Juridische begeleiding en controle" },
      { label: "Notariskosten", amount: notaris, desc: "Officiële akte van overdracht" },
      { label: "Kadaster/Registratie", amount: registratie, desc: "Inschrijving eigendomsrecht" },
      { label: "Volmacht (Poder)", amount: volmacht, desc: "Notariële volmacht voor vertegenwoordiging" },
      { label: isNieuwbouw ? "Nutsaansluitingen" : "Overschrijving nutsbedrijven", amount: nutsvoorzieningen, desc: "Elektra, water, gas" },
      { label: "Bankkosten", amount: bankkosten, desc: "Spaanse bankrekening" },
      { label: "Administratie", amount: administratie, desc: "Gestoría en formaliteiten" },
      { label: "NIE-nummer", amount: nie, desc: "Spaans identificatienummer" },
    ],
    total: Math.round(total),
    percentage: (total / purchasePrice) * 100
  };
}

function calculateAnnualCosts(purchasePrice: number) {
  const ibi = Math.round(purchasePrice * 0.0018);
  const insurance = Math.round(purchasePrice * 0.0009);
  const comunidad = 900;
  const utilities = 1150;
  const basura = 100;
  const maintenance = Math.round(purchasePrice * 0.0025);
  const total = ibi + insurance + comunidad + utilities + basura + maintenance;
  
  return {
    items: [
      { label: "IBI (onroerendezaakbelasting)", amount: ibi, desc: "~0.18% van aankoopwaarde" },
      { label: "Opstalverzekering", amount: insurance, desc: "~0.09% van aankoopwaarde" },
      { label: "VvE/Gemeenschapskosten", amount: comunidad, range: [600, 1200], desc: "Zwembad, tuinen, onderhoud" },
      { label: "Nutsvoorzieningen", amount: utilities, range: [800, 1500], desc: "Elektra, water, gas" },
      { label: "Afvalheffing (Basura)", amount: basura, desc: "Gemeentelijke heffing" },
      { label: "Onderhoud reserve", amount: maintenance, desc: "~0.25% van waarde" },
    ],
    total,
    minTotal: ibi + insurance + 600 + 800 + basura + Math.round(purchasePrice * 0.002),
    maxTotal: ibi + insurance + 1200 + 1500 + basura + Math.round(purchasePrice * 0.003),
  };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

function formatDate(): string {
  return new Date().toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

// ============= AI TRANSFORMATION =============

function cleanLatexNotation(text: string): string {
  return text
    // Remove LaTeX underline commands: \underline{74m²} → 74m²
    .replace(/\\underline\{([^}]+)\}/g, '$1')
    // Remove display math $$...$$ wrappers
    .replace(/\$\$([^$]+)\$\$/g, '$1')
    // Handle euro + number patterns with dollar signs: $€2.851/m²$ → €2.851/m²
    .replace(/\$€\s*([0-9.,]+)\s*\/?\s*m\s*\^\s*\{?\s*2\s*\}?\s*\$/g, '€$1/m²')
    .replace(/\$€\s*([0-9.,]+)\s*\$/g, '€$1')
    // Handle various m² notations with dollar signs
    .replace(/\$\s*(\d+)\s*m\s*\^\s*\{?\s*2\s*\}?\s*\$/g, '$1 m²')
    .replace(/\$\s*(\d+)\s*m²\s*\$/g, '$1 m²')
    .replace(/\$(\d+)m\^2\$/g, '$1 m²')
    .replace(/\$(\d+)\s*m\^\{2\}\$/g, '$1 m²')
    // Handle xi symbol (sometimes appears as \xi or ξ)
    .replace(/\$\\?xi\s*([0-9.,]+)\$/gi, '€$1')
    .replace(/ξ\s*([0-9.,]+)/g, '€$1')
    // Handle m² notations without dollar signs
    .replace(/(\d+)\s*m\^\{?2\}?/g, '$1 m²')
    .replace(/(\d+)\s*m\^2/g, '$1 m²')
    // Clean up /m² patterns
    .replace(/\/m\^\{?2\}?/g, '/m²')
    .replace(/\/m\^2/g, '/m²')
    // Remove remaining $ wrappers (inline math)
    .replace(/\$([^$]+)\$/g, '$1')
    // Remove stray LaTeX commands like \textbf{...} → ...
    .replace(/\\([a-zA-Z]+)\{([^}]+)\}/g, '$2')
    // Remove stray backslashes
    .replace(/\\/g, '');
}

async function transformToExecutiveSummary(
  deepAnalysisBrainstorm: string,
  projectName: string
): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY || !deepAnalysisBrainstorm || deepAnalysisBrainstorm.length < 100) {
    console.log("[Brochure] Skipping AI transformation - no API key or insufficient input");
    return "";
  }

  try {
    const prompt = `Je bent een Senior Investment Copywriter bij Top Immo Spain.

CONTEXT:
Je krijgt een interne strategische analyse van vastgoedproject "${projectName}".

OPDRACHT:
Transformeer dit naar een zakelijke Executive Summary voor een investeringsmemorandum.
Maximaal 400 woorden.

STRUCTUUR (gebruik deze exacte koppen):

INVESTERINGSPROFIEL: ${projectName.toUpperCase()}

DE KANS
Begin met een SAMENVATTING IN 3 BULLETS van de belangrijkste USPs:
• [USP 1 - bijv. "Extreme buitenruimtes tot 159 m²"]
• [USP 2 - bijv. "Strategische ligging bij golf én strand"]
• [USP 3 - bijv. "Laagste prijs per m² in de regio"]

Daarna 2-3 zinnen context over wat dit project uniek maakt.

FINANCIËLE LOGICA
[100 woorden: Waarom is dit een slimme investering? Noem concrete voordelen met cijfers waar mogelijk.]

VOOR WIE IS DIT GESCHIKT?
[75 woorden: Welk type investeerder? Wat zijn de ideale doelen?]

AANDACHTSPUNTEN
[50 woorden: Eerlijke nuances - timing, locatie-afhankelijkheden, etc.]

STIJLREGELS:
- Schrijf direct tot de lezer ("U profiteert van...", niet "Ik analyseer...")
- VERWIJDER alle meta-tekst ("Hier is de analyse", "Oké, laten we kijken", "Ik heb de data...")
- Gebruik bullets (•) voor opsommingen
- Geen Markdown headers (###), gebruik alleen HOOFDLETTERS voor koppen
- Zakelijk, High-End, maar eerlijk
- Nederlandse taal
- BELANGRIJK: Gebruik gewone tekst voor oppervlaktes (bijvoorbeeld "74 m²" niet "$74m^{2}$")
- BELANGRIJK: Gebruik € symbool voor bedragen (bijvoorbeeld "€2.851/m²" niet "$\\xi2.851/m^{2}$")

INPUT ANALYSE:
${deepAnalysisBrainstorm.substring(0, 4000)}`;

    console.log("[Brochure] Calling AI for Executive Summary transformation...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "user", content: prompt }
        ],
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      console.error("[Brochure] AI API error:", response.status);
      return "";
    }

    const result = await response.json();
    let transformedText = result.choices?.[0]?.message?.content || "";
    
    // Clean up any LaTeX-style notation the AI might have used
    transformedText = cleanLatexNotation(transformedText);
    
    console.log("[Brochure] AI transformation successful, length:", transformedText.length);
    return transformedText;
  } catch (error) {
    console.error("[Brochure] AI transformation failed:", error);
    return "";
  }
}

// ============= MAIN HANDLER =============

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: BrochureRequest = await req.json();
    const { projectId, recipientName, purchasePrice: inputPrice, yearlyAppreciation = 3, managementFee = 20 } = body;

    if (!projectId || !recipientName) {
      throw new Error("projectId and recipientName are required");
    }

    console.log(`[Brochure] Generating for ${recipientName}, project: ${projectId}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all data in parallel
    const [projectResult, propertiesResult, rentalResult] = await Promise.all([
      supabase.from("projects").select("*").eq("id", projectId).single(),
      supabase.from("properties").select("*").eq("project_id", projectId).in("status", ["available", "sold"]).order("price", { ascending: true }),
      supabase.from("rental_comparables_cache").select("data, comparables").eq("project_id", projectId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

    if (projectResult.error || !projectResult.data) {
      throw new Error(`Project not found: ${projectResult.error?.message}`);
    }

    const project = projectResult.data;
    const properties: Property[] = propertiesResult.data || [];
    
    // Extract rental data
    let rentalData: RentalData | null = null;
    if (rentalResult.data?.data) {
      const cacheData = rentalResult.data.data as any;
      rentalData = {
        avgMonthlyRevenue: cacheData.monthly_avg_revenue,
        occupancyRate: cacheData.occupancy,
        avgDailyRate: cacheData.average_daily_rate,
        annualRevenue: cacheData.annual_revenue,
        currency: cacheData.currency || "EUR",
        comparables: rentalResult.data.comparables as any[] || [],
        monthlyDistributions: cacheData.monthly_revenue_distributions || [],
      };
    }

    // Calculate base values
    const avgPrice = inputPrice || (properties.length > 0 ? properties.reduce((sum, p) => sum + (p.price || 0), 0) / properties.length : 300000);
    const isNieuwbouw = project.property_type === "nieuwbouw" || project.construction_status === "under_construction" || true;
    const regionLower = (project.region || "").toLowerCase();
    const itpRate = regionLower.includes("murcia") ? 8 : 10;

    const purchaseCosts = calculatePurchaseCosts(avgPrice, isNieuwbouw, itpRate);
    const annualCosts = calculateAnnualCosts(avgPrice);
    
    // Log rental data for debugging discrepancies
    console.log(`[Brochure] Found ${properties.length} properties, rental data: ${rentalData ? `annualRevenue=${rentalData.annualRevenue}, avgDailyRate=${rentalData.avgDailyRate}, occupancy=${rentalData.occupancyRate}` : "null - using fallback"}`);
    console.log(`[Brochure] Fallback calculation would be: avgPrice=${avgPrice} × 5% = ${avgPrice * 0.05}`);
    
    const baseAnnualRentalIncome = rentalData?.annualRevenue || (rentalData?.avgMonthlyRevenue || 0) * 12 || avgPrice * 0.05;
    const managementCosts = baseAnnualRentalIncome * (managementFee / 100);
    const netAnnualRentalIncome = baseAnnualRentalIncome - managementCosts;

    const { scenarios, projections } = calculateFinancingScenarios(
      avgPrice,
      purchaseCosts.total,
      netAnnualRentalIncome,
      annualCosts.total,
      yearlyAppreciation / 100
    );

    // Transform deep analysis to Executive Summary
    // BUG FIX: Use project.name (real project name) as primary, display_title as fallback
    const projectName = project.name || project.display_title || "Dit Project";
    const deepAnalysisBrainstorm = cleanLatexNotation(project.deep_analysis_brainstorm || "");
    const executiveSummary = await transformToExecutiveSummary(deepAnalysisBrainstorm, projectName);

    // Generate HTML
    const html = generateBrochureHtml({
      project,
      properties,
      rentalData,
      recipientName,
      purchasePrice: avgPrice,
      purchaseCosts,
      annualCosts,
      scenarios,
      projections,
      netAnnualRentalIncome,
      managementFee,
      yearlyAppreciation,
      executiveSummary,
    });

    const htmlBase64 = btoa(unescape(encodeURIComponent(html)));
    console.log("[Brochure] Generated successfully");

    return new Response(JSON.stringify({ htmlBase64 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("[Brochure] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ============= SEASONAL CURVE SVG GENERATOR =============

function generateSeasonalCurveSvg(monthlyDist: number[], quarterlyData: any[]): string {
  // Monthly data - realistic Costa Cálida pattern
  const monthlyData = [
    { month: "Jan", pct: 5 }, { month: "Feb", pct: 6 }, { month: "Mrt", pct: 7 },
    { month: "Apr", pct: 9 }, { month: "Mei", pct: 10 }, { month: "Jun", pct: 12 },
    { month: "Jul", pct: 14 }, { month: "Aug", pct: 14 }, { month: "Sep", pct: 9 },
    { month: "Okt", pct: 7 }, { month: "Nov", pct: 4 }, { month: "Dec", pct: 3 }
  ];
  
  // Override with real monthly data if available
  if (monthlyDist && Array.isArray(monthlyDist) && monthlyDist.length >= 12) {
    const total = monthlyDist.reduce((s, v) => s + (v || 0), 0);
    if (total > 0) {
      monthlyData.forEach((m, i) => {
        m.pct = Math.round(((monthlyDist[i] || 0) / total) * 100);
      });
    }
  }
  
  // Generate smooth curve points
  const width = 380;
  const height = 100;
  const padding = 10;
  const maxPct = Math.max(...monthlyData.map(m => m.pct));
  
  const points = monthlyData.map((d, i) => ({
    x: padding + (i / 11) * width,
    y: height - (d.pct / maxPct) * (height - 20) - 10
  }));
  
  // Catmull-Rom to Bezier conversion for ultra-smooth curve
  function catmullRomToBezier(pts: {x: number, y: number}[]): string {
    if (pts.length < 2) return '';
    
    let path = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      
      // Tension factor (0.5 for Catmull-Rom)
      const t = 0.5;
      
      const cp1x = p1.x + (p2.x - p0.x) * t / 3;
      const cp1y = p1.y + (p2.y - p0.y) * t / 3;
      const cp2x = p2.x - (p3.x - p1.x) * t / 3;
      const cp2y = p2.y - (p3.y - p1.y) * t / 3;
      
      path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    
    return path;
  }
  
  const curvePath = catmullRomToBezier(points);
  const areaPath = curvePath + ` L ${points[points.length-1].x.toFixed(1)} ${height} L ${points[0].x.toFixed(1)} ${height} Z`;
  
  // Find peak month
  const peakIdx = monthlyData.reduce((maxI, m, i, arr) => m.pct > arr[maxI].pct ? i : maxI, 0);
  const peakPoint = points[peakIdx];
  const peakPct = monthlyData[peakIdx].pct;
  
  // Generate month labels
  const monthLabels = monthlyData.map((m, i) => {
    const x = padding + (i / 11) * width;
    return `<text x="${x.toFixed(1)}" y="125" class="month-label" text-anchor="middle">${m.month}</text>`;
  }).join('\n      ');
  
  return `
    <svg viewBox="0 0 400 140" class="seasonal-curve">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0ea5e9" stop-opacity="0.4"/>
          <stop offset="100%" stop-color="#0ea5e9" stop-opacity="0.05"/>
        </linearGradient>
      </defs>
      
      <!-- Smooth area under curve -->
      <path d="${areaPath}" fill="url(#areaGrad)"/>
      
      <!-- Smooth curve line -->
      <path d="${curvePath}" stroke="#0ea5e9" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      
      <!-- Peak indicator -->
      <circle cx="${peakPoint.x.toFixed(1)}" cy="${peakPoint.y.toFixed(1)}" r="6" fill="#10b981"/>
      <text x="${peakPoint.x.toFixed(1)}" y="${(peakPoint.y - 12).toFixed(1)}" text-anchor="middle" class="peak-label">Piek: ${peakPct}%</text>
      
      <!-- Month labels -->
      ${monthLabels}
    </svg>
  `;
}

// ============= HTML TEMPLATE =============

interface BrochureData {
  project: any;
  properties: Property[];
  rentalData: RentalData | null;
  recipientName: string;
  purchasePrice: number;
  purchaseCosts: ReturnType<typeof calculatePurchaseCosts>;
  annualCosts: ReturnType<typeof calculateAnnualCosts>;
  scenarios: FinancingScenario[];
  projections: Record<string, TenYearProjection[]>;
  netAnnualRentalIncome: number;
  managementFee: number;
  yearlyAppreciation: number;
  executiveSummary: string;
}

function generateBrochureHtml(data: BrochureData): string {
  const { project, properties, rentalData, recipientName, purchasePrice, purchaseCosts, annualCosts, scenarios, projections, netAnnualRentalIncome, managementFee, yearlyAppreciation, executiveSummary } = data;

  const totalInvestment = purchasePrice + purchaseCosts.total;
  const grossYield = ((rentalData?.annualRevenue || netAnnualRentalIncome) / totalInvestment) * 100;
  const netYield = (netAnnualRentalIncome / totalInvestment) * 100;
  const comparables = (rentalData?.comparables || []).slice(0, 6);
  const monthlyDist = rentalData?.monthlyDistributions || [];

  // Quarterly breakdown with REALISTIC DEFAULTS for Costa Cálida
  const quarterlyData = [
    { label: "Q1", months: "Jan - Mrt", percentage: 17, season: "Laagseizoen" },
    { label: "Q2", months: "Apr - Jun", percentage: 24, season: "Schouderseizoen" },
    { label: "Q3", months: "Jul - Sep", percentage: 35, season: "Hoogseizoen" },
    { label: "Q4", months: "Okt - Dec", percentage: 24, season: "Schouderseizoen" },
  ];
  
  // Only override if we have COMPLETE monthly data
  if (monthlyDist && Array.isArray(monthlyDist) && monthlyDist.length >= 12) {
    const q1 = (monthlyDist[0] || 0) + (monthlyDist[1] || 0) + (monthlyDist[2] || 0);
    const q2 = (monthlyDist[3] || 0) + (monthlyDist[4] || 0) + (monthlyDist[5] || 0);
    const q3 = (monthlyDist[6] || 0) + (monthlyDist[7] || 0) + (monthlyDist[8] || 0);
    const q4 = (monthlyDist[9] || 0) + (monthlyDist[10] || 0) + (monthlyDist[11] || 0);
    
    const sum = q1 + q2 + q3 + q4;
    
    // Only use if we have meaningful data (sum should be ~1.0 or close)
    if (sum > 0.5) {
      quarterlyData[0].percentage = Math.round((q1 / sum) * 100);
      quarterlyData[1].percentage = Math.round((q2 / sum) * 100);
      quarterlyData[2].percentage = Math.round((q3 / sum) * 100);
      quarterlyData[3].percentage = Math.round((q4 / sum) * 100);
      
      // Ensure they sum to 100
      const total = quarterlyData.reduce((s, q) => s + q.percentage, 0);
      if (total !== 100) {
        const diff = 100 - total;
        quarterlyData[2].percentage += diff; // Add difference to highest quarter
      }
    }
  }

  const projectImageUrl = project.image_url || null;
  const locationIntel = project.location_intelligence || {};
  const structuredAnalysis = project.deep_analysis_structured || {};

  // Format executive summary for HTML (convert line breaks to paragraphs)
  const formattedExecutiveSummary = executiveSummary
    ? executiveSummary
        .replace(/\n\n/g, '</p><p>')
        .replace(/^(.*)$/gm, (match) => {
          // Make section headers bold
          if (match.match(/^(INVESTERINGSPROFIEL|DE KANS|FINANCIËLE LOGICA|VOOR WIE|AANDACHTSPUNTEN)/i)) {
            return `<strong class="section-header">${match}</strong>`;
          }
          return match;
        })
    : "";

  // BUG FIX: Use project.name as primary source for project title
  const displayProjectName = project.name || project.display_title || "Project";
  const displayLocation = project.location || project.municipality || "";
  const displayRegion = project.region || "Costa Cálida";

  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${displayProjectName} - Persoonlijke Investeringsanalyse | Top Immo Spain</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    :root {
      --primary: #0ea5e9;
      --primary-dark: #0284c7;
      --primary-light: #e0f2fe;
      --warm: #f59e0b;
      --warm-light: #fef3c7;
      --sand: #f8fafc;
      --sand-dark: #f1f5f9;
      --text: #1e293b;
      --text-muted: #64748b;
      --success: #10b981;
      --success-light: #d1fae5;
      --danger: #ef4444;
      --border: #e2e8f0;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 10pt;
      line-height: 1.6;
      color: var(--text);
      background: white;
    }
    
    @page {
      size: A4;
      margin: 15mm 18mm 20mm 18mm;
    }
    
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .page-break { page-break-before: always; }
      .no-break { page-break-inside: avoid; }
    }
    
    /* ===== HEADER ===== */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 3px solid var(--primary);
      margin-bottom: 24px;
    }
    
    .logo { 
      font-size: 16pt; 
      font-weight: 700; 
      color: var(--primary-dark);
      letter-spacing: -0.5px;
    }
    .date { font-size: 9pt; color: var(--text-muted); }
    
    /* ===== COVER SECTION ===== */
    .cover-section {
      position: relative;
      text-align: center;
      margin-bottom: 30px;
      border-radius: 16px;
      overflow: hidden;
    }
    
    .cover-hero-container {
      position: relative;
      width: 100%;
      height: 220px;
      background: linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 100%);
      border-radius: 16px;
      overflow: hidden;
    }
    
    .cover-hero-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0.9;
    }
    
    .cover-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 24px;
      background: linear-gradient(0deg, rgba(0,0,0,0.7) 0%, transparent 100%);
      color: white;
    }
    
    .exclusive-badge {
      display: inline-block;
      background: var(--warm);
      color: white;
      padding: 8px 20px;
      border-radius: 20px;
      font-size: 10pt;
      font-weight: 600;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .cover-title {
      font-size: 24pt;
      font-weight: 700;
      margin-bottom: 6px;
      text-shadow: 0 2px 4px rgba(0,0,0,0.3);
    }
    
    .cover-subtitle {
      font-size: 12pt;
      opacity: 0.9;
    }
    
    .cover-fallback {
      padding: 40px 20px;
      background: linear-gradient(135deg, var(--sand) 0%, white 100%);
      border-radius: 16px;
      border: 2px solid var(--border);
    }
    
    .cover-fallback h1 {
      font-size: 22pt;
      color: var(--primary-dark);
      margin-bottom: 8px;
    }
    
    .cover-fallback .subtitle {
      font-size: 12pt;
      color: var(--text-muted);
    }
    
    /* ===== PERSONAL INTRO ===== */
    .personal-intro {
      background: linear-gradient(135deg, var(--primary-light) 0%, white 100%);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 30px;
      border: 1px solid var(--primary);
    }
    
    .personal-intro p {
      margin-bottom: 12px;
      line-height: 1.7;
    }
    
    .personal-intro .greeting {
      font-size: 12pt;
      font-weight: 600;
      color: var(--primary-dark);
    }
    
    .signature {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--border);
      font-weight: 600;
      color: var(--primary-dark);
    }
    
    /* ===== HEADINGS ===== */
    h2 { 
      font-size: 14pt; 
      color: var(--primary-dark); 
      margin: 28px 0 16px; 
      padding-bottom: 8px;
      border-bottom: 2px solid var(--primary-light);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    h3 { 
      font-size: 11pt; 
      color: var(--text); 
      margin: 20px 0 12px;
      font-weight: 600;
    }
    
    /* ===== STATS GRID ===== */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    
    .stat-card {
      background: linear-gradient(135deg, var(--sand) 0%, white 100%);
      padding: 16px 12px;
      border-radius: 12px;
      text-align: center;
      border: 1px solid var(--border);
      transition: all 0.2s;
    }
    
    .stat-card .value { 
      font-size: 18pt; 
      font-weight: 700; 
      color: var(--primary-dark);
      line-height: 1.2;
    }
    .stat-card .label { 
      font-size: 8pt; 
      color: var(--text-muted); 
      margin-top: 6px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    
    /* ===== INFO & DISCLAIMER BOXES ===== */
    .info-box {
      background: var(--primary-light);
      border-left: 4px solid var(--primary);
      padding: 14px 18px;
      margin: 18px 0;
      border-radius: 0 12px 12px 0;
      font-size: 9pt;
      line-height: 1.6;
    }
    
    .disclaimer-box {
      background: var(--warm-light);
      border-left: 4px solid var(--warm);
      padding: 14px 18px;
      margin: 18px 0;
      border-radius: 0 12px 12px 0;
      font-size: 9pt;
    }
    
    /* ===== TABLES - MODERN STYLE ===== */
    table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin: 16px 0;
      font-size: 9pt;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    
    th, td {
      padding: 12px 14px;
      text-align: left;
    }
    
    th {
      background: var(--primary-dark);
      color: white;
      font-weight: 600;
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    tbody tr:nth-child(odd) { background: white; }
    tbody tr:nth-child(even) { background: var(--sand); }
    
    .amount { text-align: right; font-weight: 600; }
    
    .total-row { 
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%) !important; 
      color: white; 
      font-weight: 700; 
    }
    .total-row td { border-bottom: none; }
    
    /* ===== SCENARIOS GRID ===== */
    .scenarios-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
      margin: 20px 0;
    }
    
    .scenario-card {
      border: 2px solid var(--border);
      border-radius: 16px;
      padding: 18px;
      text-align: center;
      background: white;
    }
    
    .scenario-card.highlight {
      border-color: var(--primary);
      background: linear-gradient(135deg, var(--primary-light) 0%, white 100%);
      box-shadow: 0 4px 12px rgba(14, 165, 233, 0.15);
      position: relative;
    }
    
    .recommended-badge {
      position: absolute;
      top: -12px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--success);
      color: white;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 8pt;
      font-weight: 600;
      white-space: nowrap;
    }
    
    .scenario-card h4 {
      font-size: 10pt;
      color: var(--primary-dark);
      margin-bottom: 6px;
    }
    
    .scenario-card .desc {
      font-size: 8pt;
      color: var(--text-muted);
      margin-bottom: 12px;
    }
    
    .scenario-card .metric {
      margin: 8px 0;
    }
    
    .scenario-card .metric-value {
      font-size: 14pt;
      font-weight: 700;
    }
    
    .scenario-card .metric-label {
      font-size: 7pt;
      color: var(--text-muted);
      text-transform: uppercase;
    }
    
    .pros-cons {
      font-size: 8pt;
      text-align: left;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--border);
    }
    
    .pros-cons .pro { color: var(--success); }
    .pros-cons .con { color: var(--danger); }
    
    /* ===== COMPARABLES ===== */
    .comparable-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin: 16px 0;
    }
    
    .comparable-card {
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 14px;
      font-size: 9pt;
      background: white;
    }
    
    .comparable-card .name {
      font-weight: 600;
      color: var(--primary-dark);
      margin-bottom: 6px;
    }
    
    .comparable-card .meta {
      color: var(--text-muted);
      font-size: 8pt;
    }
    
    /* ===== SEASONAL CURVE (SVG) ===== */
    .seasonal-curve-container {
      background: var(--sand);
      border-radius: 12px;
      padding: 20px;
      margin: 16px 0;
    }
    
    .seasonal-curve {
      width: 100%;
      height: 150px;
    }
    
    .seasonal-curve .month-label {
      font-size: 8pt;
      fill: var(--text-muted);
    }
    
    .seasonal-curve .peak-label {
      font-size: 9pt;
      fill: var(--success);
      font-weight: 600;
    }
    
    /* ===== GROWTH CHART (SVG) ===== */
    .growth-chart-container {
      background: var(--sand);
      border-radius: 12px;
      padding: 20px;
      margin: 16px 0;
    }
    
    .growth-chart {
      width: 100%;
      height: 180px;
    }
    
    .growth-chart .year-label {
      font-size: 8pt;
      fill: var(--text-muted);
    }
    
    .growth-chart .value-label {
      font-size: 9pt;
      fill: var(--primary-dark);
      font-weight: 600;
    }
    
    /* ===== FALLBACK SEASONAL BARS ===== */
    .seasonal-bars {
      display: flex;
      justify-content: space-around;
      align-items: flex-end;
      height: 140px;
      padding: 20px 0;
      background: var(--sand);
      border-radius: 12px;
      margin: 16px 0;
    }
    
    .bar-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }
    
    .bar {
      width: 50px;
      border-radius: 6px 6px 0 0;
      transition: height 0.3s;
      min-height: 20px;
    }
    
    .bar-label {
      font-size: 12pt;
      font-weight: 700;
      color: var(--primary-dark);
    }
    
    .bar-quarter {
      font-size: 10pt;
      font-weight: 600;
      color: var(--text);
    }
    
    .bar-season {
      font-size: 7pt;
      color: var(--text-muted);
      text-align: center;
    }
    
    /* ===== GOLDEN NUGGETS WITH HERO IMAGE ===== */
    .golden-nuggets-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin: 20px 0;
    }
    
    .golden-nuggets-hero-image {
      width: 100%;
      height: 200px;
      object-fit: cover;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    
    /* ===== PROJECTION TABLE ===== */
    .projection-table th { font-size: 7pt; }
    .projection-table td { font-size: 8pt; padding: 10px 12px; }
    
    /* ===== LOCATION SCORECARD ===== */
    .location-scorecard {
      background: var(--sand);
      border-radius: 12px;
      padding: 20px;
      margin: 16px 0;
    }
    
    .scorecard-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }
    
    .scorecard-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      background: white;
      border-radius: 8px;
      border: 1px solid var(--border);
    }
    
    .scorecard-icon {
      font-size: 16pt;
    }
    
    .scorecard-name {
      flex: 1;
      font-size: 9pt;
      font-weight: 500;
      color: var(--text);
    }
    
    .scorecard-distance {
      font-size: 9pt;
      font-weight: 600;
      color: var(--primary-dark);
      background: var(--primary-light);
      padding: 4px 8px;
      border-radius: 4px;
    }
    
    .scorecard-conclusion {
      margin-top: 16px;
      padding: 12px 16px;
      background: linear-gradient(135deg, var(--success-light) 0%, #a7f3d0 100%);
      border-radius: 8px;
      font-size: 10pt;
      text-align: center;
      color: #065f46;
    }
    
    /* ===== BREAK-EVEN BOX ===== */
    .breakeven-box {
      background: linear-gradient(135deg, var(--success-light) 0%, #a7f3d0 100%);
      border: 2px solid var(--success);
      border-radius: 12px;
      padding: 16px 20px;
      margin: 16px 0;
      text-align: center;
    }
    
    .breakeven-box .highlight {
      font-size: 14pt;
      font-weight: 700;
      color: #065f46;
    }
    
    .breakeven-box .subtext {
      font-size: 9pt;
      color: #047857;
      margin-top: 6px;
    }
    
    /* ===== GOLDEN NUGGETS ===== */
    .golden-nuggets {
      background: linear-gradient(135deg, var(--warm-light) 0%, #fef9c3 100%);
      border-radius: 12px;
      padding: 16px 20px;
      border: 1px solid var(--warm);
    }
    
    .golden-nuggets h4 {
      color: #92400e;
      font-size: 10pt;
      margin-bottom: 10px;
    }
    
    .golden-nuggets ul {
      margin-left: 18px;
      font-size: 9pt;
    }
    
    .golden-nuggets li {
      margin-bottom: 6px;
    }
    
    /* ===== EXECUTIVE SUMMARY WITH IMAGE ===== */
    .executive-with-image {
      display: grid;
      grid-template-columns: 1fr 200px;
      gap: 20px;
      align-items: start;
      margin: 20px 0;
    }
    
    .executive-with-image.no-image {
      grid-template-columns: 1fr;
    }
    
    .executive-image img {
      width: 100%;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    
    .executive-image .image-caption {
      font-size: 8pt;
      color: var(--text-muted);
      text-align: center;
      margin-top: 8px;
    }
    
    @media print {
      .executive-with-image {
        grid-template-columns: 1fr 180px;
      }
    }
    
    /* ===== MULTI-CTA OPTIONS ===== */
    .cta-options-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin: 24px 0;
    }
    
    .cta-option {
      background: white;
      border: 2px solid var(--border);
      border-radius: 16px;
      padding: 20px;
      text-align: center;
    }
    
    .cta-option.lifestyle { border-color: var(--success); }
    .cta-option.numbers { border-color: var(--primary); }
    .cta-option.visit { border-color: var(--warm); }
    
    .cta-option .cta-icon { font-size: 28pt; margin-bottom: 12px; }
    .cta-option h4 { font-size: 11pt; color: var(--text); margin-bottom: 8px; font-weight: 600; }
    .cta-option p { font-size: 9pt; color: var(--text-muted); margin-bottom: 14px; line-height: 1.5; }
    
    .cta-option .cta-button {
      display: inline-block;
      background: var(--primary);
      color: white;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 9pt;
      font-weight: 600;
    }
    
    .cta-option.lifestyle .cta-button { background: var(--success); }
    .cta-option.visit .cta-button { background: var(--warm); }
    
    .footer-cta-simple {
      text-align: center;
      margin-top: 20px;
      padding: 16px;
      background: var(--sand);
      border-radius: 12px;
    }
    
    .footer-cta-simple p {
      margin-bottom: 8px;
      color: var(--text-muted);
      font-size: 9pt;
    }
    
    .footer-cta-simple .contact {
      font-size: 10pt;
      font-weight: 600;
      color: var(--primary-dark);
    }
    
    /* ===== EXECUTIVE SUMMARY ===== */
    .executive-summary {
      background: white;
      border: 2px solid var(--primary-light);
      border-radius: 16px;
      padding: 24px;
      margin: 20px 0;
    }
    
    .executive-summary p {
      margin-bottom: 14px;
      line-height: 1.7;
    }
    
    .executive-summary .section-header {
      display: block;
      font-size: 11pt;
      color: var(--primary-dark);
      margin-top: 16px;
      margin-bottom: 8px;
      font-weight: 700;
    }
    
    .executive-summary .section-header:first-child {
      margin-top: 0;
      font-size: 13pt;
      text-align: center;
      padding-bottom: 12px;
      border-bottom: 2px solid var(--primary-light);
      margin-bottom: 16px;
    }
    
    /* ===== FOOTER CTA ===== */
    .footer-cta {
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
      color: white;
      padding: 28px;
      border-radius: 16px;
      text-align: center;
      margin-top: 30px;
    }
    
    .footer-cta h3 { 
      color: white; 
      font-size: 14pt; 
      margin-bottom: 10px;
      border: none;
    }
    .footer-cta p { opacity: 0.95; margin-bottom: 14px; }
    .footer-cta .contact { 
      font-size: 11pt; 
      font-weight: 600;
      background: rgba(255,255,255,0.15);
      padding: 10px 20px;
      border-radius: 8px;
      display: inline-block;
    }
    
    /* ===== LEGAL ===== */
    .legal {
      font-size: 7pt;
      color: var(--text-muted);
      margin-top: 30px;
      padding-top: 16px;
      border-top: 1px solid var(--border);
      line-height: 1.6;
    }
    
    /* ===== WHY US SECTION ===== */
    .why-us-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
      margin: 16px 0;
    }
    
    .why-us-card {
      background: var(--sand);
      border-radius: 12px;
      padding: 16px;
      text-align: center;
    }
    
    .why-us-card .icon {
      font-size: 24pt;
      margin-bottom: 8px;
    }
    
    .why-us-card h4 {
      font-size: 10pt;
      color: var(--primary-dark);
      margin-bottom: 6px;
    }
    
    .why-us-card p {
      font-size: 8pt;
      color: var(--text-muted);
    }
  </style>
</head>
<body>
  <!-- HEADER -->
  <div class="header">
    <div class="logo">Top Immo Spain</div>
    <div class="date">${formatDate()}</div>
  </div>

  <!-- COVER SECTION WITH IMAGE -->
  ${projectImageUrl ? `
  <div class="cover-section no-break">
    <div class="cover-hero-container">
      <img src="${projectImageUrl}" alt="${displayProjectName}" class="cover-hero-image" />
      <div class="cover-overlay">
        <div class="exclusive-badge">✨ Exclusief voor ${recipientName}</div>
        <div class="cover-title">${displayProjectName}</div>
        <div class="cover-subtitle">${displayLocation} • ${displayRegion}</div>
      </div>
    </div>
  </div>
  ` : `
  <div class="cover-section no-break">
    <div class="cover-fallback">
      <div class="exclusive-badge">✨ Exclusief voor ${recipientName}</div>
      <h1>${displayProjectName}</h1>
      <div class="subtitle">${displayLocation} • ${displayRegion}</div>
    </div>
  </div>
  `}

  <!-- PERSONAL INTRODUCTION -->
  <div class="personal-intro no-break">
    <p class="greeting">Beste ${recipientName},</p>
    <p>Op basis van uw interesse in <strong>${displayProjectName}</strong> hebben wij deze persoonlijke investeringsanalyse voor u samengesteld. Hierin vindt u een volledig overzicht van de financiële aspecten, verhuurpotentieel en een 10-jarige rendementsprojectie.</p>
    <p>Mocht u vragen hebben of meer informatie wensen, neem dan gerust contact met ons op.</p>
    <div class="signature">Het Top Immo Spain Team</div>
  </div>

  <!-- QUICK STATS -->
  <h2>📊 Kerncijfers op een Rij</h2>
  <div class="stats-grid no-break">
    <div class="stat-card">
      <div class="value">${formatCurrency(purchasePrice)}</div>
      <div class="label">Vanaf-prijs</div>
    </div>
    <div class="stat-card">
      <div class="value">${netYield.toFixed(1)}%</div>
      <div class="label">Netto Rendement</div>
    </div>
    <div class="stat-card">
      <div class="value">${rentalData?.occupancyRate || 65}%</div>
      <div class="label">Bezettingsgraad</div>
    </div>
    <div class="stat-card">
      <div class="value">+${(Math.pow(1 + yearlyAppreciation / 100, 10) * 100 - 100).toFixed(0)}%</div>
      <div class="label">Waardestijging 10 jaar</div>
    </div>
  </div>

  ${structuredAnalysis.goldenNuggets?.length ? `
  <div class="golden-nuggets-container no-break">
    ${projectImageUrl ? `<img src="${projectImageUrl}" alt="${displayProjectName}" class="golden-nuggets-hero-image" />` : ''}
    <div class="golden-nuggets">
      <h4>✨ Unieke Investeringskansen</h4>
      <ul>
        ${(structuredAnalysis.goldenNuggets as string[]).slice(0, 4).map((n: string) => `<li>${cleanLatexNotation(n)}</li>`).join("")}
      </ul>
    </div>
  </div>
  ` : ""}

  <!-- EXECUTIVE SUMMARY (AI TRANSFORMED) WITH IMAGE -->
  <div class="page-break"></div>
  <h2>📋 Executive Summary</h2>
  ${executiveSummary ? `
  <div class="executive-with-image ${projectImageUrl ? '' : 'no-image'} no-break">
    <div class="executive-content">
      <div class="executive-summary">
        <p>${formattedExecutiveSummary}</p>
      </div>
    </div>
    ${projectImageUrl ? `
    <div class="executive-image">
      <img src="${projectImageUrl}" alt="${displayProjectName}" />
      <div class="image-caption">${displayProjectName} - Artist Impression</div>
    </div>
    ` : ''}
  </div>
  ` : `
  <div class="info-box">
    <p>${project.description || "Dit project in " + (project.location || project.region || "Spanje") + " biedt een aantrekkelijke investeringskans met stabiel huurrendement en groeipotentieel in een gewilde vakantiebestemming."}</p>
  </div>
  `}

  ${locationIntel.nearbyAmenities ? `
  <h3>📍 Locatie Scorecard</h3>
  <div class="location-scorecard">
    ${(() => {
      const amenities = locationIntel.nearbyAmenities as any;
      const formatDistance = (meters: number): string => {
        if (!meters) return '';
        if (meters < 1000) return `${meters}m`;
        return `${(meters / 1000).toFixed(1)}km`;
      };
      
      const items: string[] = [];
      
      // Beaches with distances
      if (amenities.beaches?.length > 0) {
        amenities.beaches.slice(0, 2).forEach((b: any) => {
          const dist = b.distance_meters ? formatDistance(b.distance_meters) : '';
          items.push(`<div class="scorecard-item"><span class="scorecard-icon">🏖️</span><span class="scorecard-name">${b.name}</span>${dist ? `<span class="scorecard-distance">${dist}</span>` : ''}</div>`);
        });
      }
      
      // Golf with distances  
      if (amenities.golf?.length > 0) {
        amenities.golf.slice(0, 2).forEach((g: any) => {
          const dist = g.distance_meters ? formatDistance(g.distance_meters) : '';
          items.push(`<div class="scorecard-item"><span class="scorecard-icon">⛳</span><span class="scorecard-name">${g.name}</span>${dist ? `<span class="scorecard-distance">${dist}</span>` : ''}</div>`);
        });
      }
      
      // Supermarkets with distances
      if (amenities.supermarkets?.length > 0) {
        amenities.supermarkets.slice(0, 2).forEach((s: any) => {
          const dist = s.distance_meters ? formatDistance(s.distance_meters) : '';
          items.push(`<div class="scorecard-item"><span class="scorecard-icon">🛒</span><span class="scorecard-name">${s.name}</span>${dist ? `<span class="scorecard-distance">${dist}</span>` : ''}</div>`);
        });
      }
      
      // Restaurants with distances
      if (amenities.restaurants?.length > 0) {
        amenities.restaurants.slice(0, 2).forEach((r: any) => {
          const dist = r.distance_meters ? formatDistance(r.distance_meters) : '';
          items.push(`<div class="scorecard-item"><span class="scorecard-icon">🍽️</span><span class="scorecard-name">${r.name}</span>${dist ? `<span class="scorecard-distance">${dist}</span>` : ''}</div>`);
        });
      }
      
      // Hospitals with distances
      if (amenities.hospitals?.length > 0) {
        amenities.hospitals.slice(0, 1).forEach((h: any) => {
          const dist = h.distance_meters ? formatDistance(h.distance_meters) : '';
          items.push(`<div class="scorecard-item"><span class="scorecard-icon">🏥</span><span class="scorecard-name">${h.name}</span>${dist ? `<span class="scorecard-distance">${dist}</span>` : ''}</div>`);
        });
      }
      
      // Calculate a simple location score
      const hasBeach = amenities.beaches?.some((b: any) => b.distance_meters && b.distance_meters < 2000);
      const hasGolf = amenities.golf?.some((g: any) => g.distance_meters && g.distance_meters < 5000);
      const hasShops = amenities.supermarkets?.some((s: any) => s.distance_meters && s.distance_meters < 1000);
      const score = (hasBeach ? 3 : 0) + (hasGolf ? 3 : 0) + (hasShops ? 2 : 0) + 2; // Base score of 2
      const displayScore = Math.min(10, score);
      
      if (items.length === 0) {
        return '<p>Voorzieningen informatie wordt binnenkort toegevoegd.</p>';
      }
      
      return `
        <div class="scorecard-grid">${items.join('')}</div>
        <div class="scorecard-conclusion">
          <strong>Locatie-rating: ${displayScore}/10</strong> ${hasBeach && hasShops ? '— Auto-vrij leven mogelijk' : hasGolf ? '— Ideaal voor golfliefhebbers' : ''}
        </div>
      `;
    })()}
  </div>
  ` : ""}

  <!-- PURCHASE COSTS -->
  <div class="page-break"></div>
  <h2>💶 Aankoopkosten in Detail</h2>
  <p>Bij de aankoop van vastgoed in Spanje komen diverse eenmalige kosten kijken. Hieronder vindt u een volledige uitsplitsing.</p>
  
  <table class="no-break">
    <thead>
      <tr>
        <th>Kostenpost</th>
        <th>Toelichting</th>
        <th class="amount">Bedrag</th>
      </tr>
    </thead>
    <tbody>
      ${purchaseCosts.items.map(item => `
      <tr>
        <td><strong>${item.label}</strong></td>
        <td>${item.desc}</td>
        <td class="amount">${formatCurrency(item.amount)}</td>
      </tr>
      `).join("")}
      <tr class="total-row">
        <td colspan="2"><strong>Totale Aankoopkosten (${purchaseCosts.percentage.toFixed(1)}%)</strong></td>
        <td class="amount">${formatCurrency(purchaseCosts.total)}</td>
      </tr>
    </tbody>
  </table>

  <div class="info-box">
    <strong>Totale Investering:</strong> ${formatCurrency(purchasePrice)} (aankoopprijs) + ${formatCurrency(purchaseCosts.total)} (kosten) = <strong>${formatCurrency(purchasePrice + purchaseCosts.total)}</strong>
  </div>

  <!-- ANNUAL COSTS -->
  <h2>📅 Jaarlijkse Kosten</h2>
  <p>Als eigenaar van Spaans vastgoed heeft u te maken met jaarlijks terugkerende kosten. De werkelijke kosten variëren afhankelijk van uw specifieke situatie.</p>

  <table class="no-break">
    <thead>
      <tr>
        <th>Kostenpost</th>
        <th>Toelichting</th>
        <th class="amount">Geschat Bedrag</th>
      </tr>
    </thead>
    <tbody>
      ${annualCosts.items.map(item => `
      <tr>
        <td><strong>${item.label}</strong></td>
        <td>${item.desc}${(item as any).range ? ` (${formatCurrency((item as any).range[0])} - ${formatCurrency((item as any).range[1])})` : ""}</td>
        <td class="amount">${formatCurrency(item.amount)}</td>
      </tr>
      `).join("")}
      <tr class="total-row">
        <td colspan="2"><strong>Geschatte Jaarlijkse Kosten</strong></td>
        <td class="amount">${formatCurrency(annualCosts.total)}</td>
      </tr>
    </tbody>
  </table>

  <div class="disclaimer-box">
    <strong>Let op:</strong> Bovenstaande bedragen zijn schattingen gebaseerd op gemiddelden. De werkelijke kosten kunnen variëren van ${formatCurrency(annualCosts.minTotal)} tot ${formatCurrency(annualCosts.maxTotal)} per jaar, afhankelijk van het specifieke complex en uw gebruikspatroon.
  </div>

  <!-- BREAK-EVEN ANALYSIS -->
  ${(() => {
    const weeklyHighSeasonRate = rentalData?.avgDailyRate ? rentalData.avgDailyRate * 7 * 1.3 : 1100; // 30% premium for high season
    const weeksToBreakEven = Math.ceil(annualCosts.total / weeklyHighSeasonRate);
    return `
    <div class="breakeven-box no-break">
      <div class="highlight">🎯 Break-even: slechts ${weeksToBreakEven} weken verhuur in het hoogseizoen</div>
      <div class="subtext">Met een gemiddelde weekprijs van ${formatCurrency(weeklyHighSeasonRate)} in het hoogseizoen zijn al uw vaste jaarlijkse kosten (${formatCurrency(annualCosts.total)}) gedekt. De overige ${52 - weeksToBreakEven} weken zijn pure winst of eigen gebruik.</div>
    </div>
    `;
  })()}

  <!-- FINANCING SCENARIOS -->
  <div class="page-break"></div>
  <h2>🏦 Financieringsscenario's Vergeleken</h2>
  <p>Hieronder vergelijken we drie veelvoorkomende financieringsstructuren. In Spanje kunnen niet-residenten doorgaans maximaal 70% van de aankoopwaarde lenen.</p>

  <div class="scenarios-grid">
    ${scenarios.map((s, i) => `
    <div class="scenario-card ${i === 0 ? "highlight" : ""} no-break">
      ${i === 0 ? '<div class="recommended-badge">✓ Aanbevolen</div>' : ''}
      <h4>${s.name}</h4>
      <div class="desc">${s.description}</div>
      
      <div class="metric">
        <div class="metric-value">${formatCurrency(s.mortgageAmount)}</div>
        <div class="metric-label">Hypotheek</div>
      </div>
      <div class="metric">
        <div class="metric-value">${formatCurrency(s.ownCapital)}</div>
        <div class="metric-label">Eigen Inleg</div>
      </div>
      <div class="metric">
        <div class="metric-value">${formatCurrency(s.monthlyPayment)}</div>
        <div class="metric-label">Maandlasten</div>
      </div>
      <div class="metric">
        <div class="metric-value" style="color: ${s.netMonthlyCashflow >= 0 ? "var(--success)" : "var(--danger)"}">${s.netMonthlyCashflow >= 0 ? "+" : ""}${formatCurrency(s.netMonthlyCashflow)}</div>
        <div class="metric-label">Netto Cashflow/mnd</div>
      </div>
      <div class="metric">
        <div class="metric-value">${s.roeYear1}%</div>
        <div class="metric-label">ROE Jaar 1</div>
      </div>
      <div class="metric">
        <div class="metric-value">${s.roeYear10}%</div>
        <div class="metric-label">ROE Jaar 10</div>
      </div>
      
      <div class="pros-cons">
        <div class="pro">✓ ${s.advantages[0]}</div>
        <div class="con">✗ ${s.disadvantages[0]}</div>
      </div>
    </div>
    `).join("")}
  </div>

  <div class="info-box">
    <strong>ROE (Return on Equity):</strong> Het rendement op uw eigen geïnvesteerde vermogen. Een hogere hefboom (meer lenen) verhoogt het ROE bij positieve waardeontwikkeling, maar vergroot ook het risico.
  </div>

  <!-- RENTAL ANALYSIS -->
  <div class="page-break"></div>
  <h2>🏖️ Verhuuranalyse</h2>
  
  <div class="stats-grid no-break">
    <div class="stat-card">
      <div class="value">${formatCurrency(rentalData?.avgDailyRate || 120)}</div>
      <div class="label">Gem. Nachtprijs</div>
    </div>
    <div class="stat-card">
      <div class="value">${rentalData?.occupancyRate || 65}%</div>
      <div class="label">Bezettingsgraad</div>
    </div>
    <div class="stat-card">
      <div class="value">${formatCurrency(rentalData?.annualRevenue || netAnnualRentalIncome * 1.25)}</div>
      <div class="label">Bruto Jaaromzet</div>
    </div>
    <div class="stat-card">
      <div class="value">${formatCurrency(netAnnualRentalIncome)}</div>
      <div class="label">Netto na Management</div>
    </div>
  </div>

  <h3>📈 Seizoenspatroon</h3>
  <!-- SVG Smooth 12-Month Curve with Catmull-Rom Spline -->
  <div class="seasonal-curve-container">
    ${generateSeasonalCurveSvg(monthlyDist, quarterlyData)}
    
    <div style="display: flex; justify-content: space-around; margin-top: 12px; font-size: 9pt;">
      ${quarterlyData.map(q => `
      <div style="text-align: center;">
        <div style="font-weight: 600; color: ${q.label === 'Q3' ? '#10b981' : '#0284c7'}">${q.percentage}%</div>
        <div style="color: #64748b; font-size: 8pt;">${q.label} • ${q.season}</div>
      </div>
      `).join('')}
    </div>
  </div>

  <!-- SEASONAL DYNAMICS EXPLANATION -->
  <div class="info-box" style="margin-top: 16px;">
    <strong>🌊 Seizoens-Dynamiek:</strong> Dankzij de strategische ligging bij zowel golf als strand profiteert dit project van een <strong>dubbel hoogseizoen</strong>. Q1/Q4 trekken Noord-Europese golfers (milde winters), terwijl Q2/Q3 gedomineerd worden door gezinnen en strandgasten (Mar Menor). Dit verklaart de stabiele bezetting van ${rentalData?.occupancyRate || 65}% over het hele jaar.
  </div>

  ${comparables.length > 0 ? `
  <h3>🏠 Vergelijkbare Verhuurobjecten</h3>
  <div class="comparable-grid">
    ${comparables.map((c: any) => `
    <div class="comparable-card no-break">
      <div class="name">${c.title || c.name || "Vergelijkbaar Object"}</div>
      <div class="meta">
        ${c.bedrooms || "2"} slaapkamers • 
        ${formatCurrency(c.adr || c.average_daily_rate || 100)}/nacht • 
        ${c.occupancy || c.occupancy_rate || 60}% bezetting
      </div>
      <div class="meta">
        Maandomzet: ${formatCurrency((c.monthly_revenue || (c.adr || 100) * 30 * ((c.occupancy || 60) / 100)))}
      </div>
    </div>
    `).join("")}
  </div>
  ` : ""}

  <div class="disclaimer-box">
    <strong>Disclaimer:</strong> Bovenstaande verhuurcijfers zijn gebaseerd op marktdata van vergelijkbare woningen in de regio. Werkelijke opbrengsten kunnen afwijken afhankelijk van uw verhuurstrategie, seizoen en marktomstandigheden. Management fee van ${managementFee}% is al verrekend in de netto cijfers.
  </div>

  <!-- 10-YEAR PROJECTION -->
  <div class="page-break"></div>
  <h2>📈 10-Jarige Rendementsprojectie</h2>
  <p>Onderstaande visualisatie toont de verwachte vermogensopbouw over 10 jaar voor het 70% financieringsscenario, uitgaande van ${yearlyAppreciation}% jaarlijkse waardestijging en 3% huurgroei.</p>

  <!-- SVG Growth Chart -->
  <div class="growth-chart-container">
    <svg viewBox="0 0 500 180" class="growth-chart">
      <defs>
        <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0ea5e9" stop-opacity="0.5"/>
          <stop offset="100%" stop-color="#0ea5e9" stop-opacity="0.1"/>
        </linearGradient>
      </defs>
      
      <!-- Grid lines -->
      <line x1="40" y1="20" x2="40" y2="140" stroke="#e2e8f0" stroke-width="1"/>
      <line x1="40" y1="140" x2="480" y2="140" stroke="#e2e8f0" stroke-width="1"/>
      <line x1="40" y1="80" x2="480" y2="80" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="4"/>
      <line x1="40" y1="50" x2="480" y2="50" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="4"/>
      
      <!-- Area under curve -->
      ${(() => {
        const proj = projections.scenario70;
        const startY = 140;
        const maxEquity = proj[9]?.totalEquity || 1;
        const minEquity = scenarios[0]?.ownCapital || 1;
        const range = maxEquity - minEquity;
        const scale = 100 / range;
        
        const points = proj.map((p, i) => {
          const x = 40 + (i + 1) * 44;
          const y = 140 - ((p.totalEquity - minEquity) * scale);
          return { x, y, equity: p.totalEquity };
        });
        
        const pathData = points.map((p, i) => {
          if (i === 0) return `M 40 140 L ${p.x} ${p.y}`;
          return `L ${p.x} ${p.y}`;
        }).join(' ');
        
        return `
          <path d="${pathData} L ${points[points.length-1].x} 140 Z" fill="url(#equityGrad)"/>
          <path d="M 40 140 ${points.map(p => `L ${p.x} ${p.y}`).join(' ')}" stroke="#0ea5e9" stroke-width="3" fill="none"/>
          ${points.filter((_, i) => [0, 2, 4, 6, 9].includes(i)).map(p => `
            <circle cx="${p.x}" cy="${p.y}" r="4" fill="#0284c7"/>
            <text x="${p.x}" y="${p.y - 10}" text-anchor="middle" class="value-label">${formatCurrency(p.equity)}</text>
          `).join('')}
        `;
      })()}
      
      <!-- Year labels -->
      ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((year, i) => `
        <text x="${40 + (i + 1) * 44}" y="155" text-anchor="middle" class="year-label">Jaar ${year}</text>
      `).join('')}
      
      <!-- Y-axis labels -->
      <text x="35" y="145" text-anchor="end" class="year-label">${formatCurrency(scenarios[0]?.ownCapital || 0)}</text>
      <text x="35" y="25" text-anchor="end" class="year-label">${formatCurrency(projections.scenario70[9]?.totalEquity || 0)}</text>
    </svg>
  </div>

  <table class="projection-table no-break" style="font-size: 8pt;">
    <thead>
      <tr>
        <th>Jaar</th>
        <th class="amount">Woningwaarde</th>
        <th class="amount">Hypotheekrest</th>
        <th class="amount">Cum. Huurinkomen</th>
        <th class="amount">Totaal Vermogen</th>
        <th class="amount">ROI</th>
      </tr>
    </thead>
    <tbody>
      ${[1, 3, 5, 7, 10].map(year => {
        const proj = projections.scenario70[year - 1];
        return proj ? `
        <tr>
          <td><strong>${year}</strong></td>
          <td class="amount">${formatCurrency(proj.propertyValue)}</td>
          <td class="amount">${formatCurrency(proj.mortgageBalance)}</td>
          <td class="amount">${formatCurrency(proj.cumulativeRentalIncome)}</td>
          <td class="amount"><strong>${formatCurrency(proj.totalEquity)}</strong></td>
          <td class="amount" style="color: #10b981"><strong>${proj.cumulativeROI}%</strong></td>
        </tr>
        ` : "";
      }).join("")}
    </tbody>
  </table>

  <div class="info-box">
    <strong>Interpretatie:</strong> Na 10 jaar heeft u bij het 70% scenario een verwacht totaal vermogen van <strong>${formatCurrency(projections.scenario70[9]?.totalEquity || 0)}</strong>, opgebouwd uit waardestijging, aflossing van de hypotheek, en netto huurinkomsten. Dit komt neer op een cumulatief rendement van <strong>${projections.scenario70[9]?.cumulativeROI || 0}%</strong> op uw initiële investering van ${formatCurrency(scenarios[0]?.ownCapital || 0)}.
  </div>

  <!-- WHY TOP IMMO SPAIN -->
  <h2>🤝 Waarom Top Immo Spain</h2>
  <div class="why-us-grid">
    <div class="why-us-card no-break">
      <div class="icon">🎯</div>
      <h4>Persoonlijke Begeleiding</h4>
      <p>Van oriëntatie tot nazorg - wij staan naast u bij elke stap</p>
    </div>
    <div class="why-us-card no-break">
      <div class="icon">🏠</div>
      <h4>Lokale Expertise</h4>
      <p>Diepgaande kennis van de Costa Cálida en regio Murcia</p>
    </div>
    <div class="why-us-card no-break">
      <div class="icon">📊</div>
      <h4>Data-Gedreven Advies</h4>
      <p>Analyses gebaseerd op actuele markt- en verhuurdata</p>
    </div>
  </div>

  <!-- MULTI-CTA SECTION -->
  <div class="page-break"></div>
  <h2>🎯 Wat is uw Volgende Stap, ${recipientName}?</h2>
  
  <div class="cta-options-grid">
    <div class="cta-option lifestyle no-break">
      <div class="cta-icon">🏖️</div>
      <h4>1. Ik wil de sfeer proeven</h4>
      <p>Ontdek de omgeving met onze uitgebreide reisgids voor ${displayRegion}. Restaurants, stranden, en verborgen parels.</p>
      <div class="cta-button">Download Reisgids</div>
    </div>
    
    <div class="cta-option numbers no-break">
      <div class="cta-icon">📊</div>
      <h4>2. Ik wil de cijfers verifiëren</h4>
      <p>Plan een korte call om deze berekening aan te passen aan uw eigen vermogen en wensen.</p>
      <div class="cta-button">Plan Zoom Call</div>
    </div>
    
    <div class="cta-option visit no-break">
      <div class="cta-icon">✈️</div>
      <h4>3. Ik wil komen kijken</h4>
      <p>Organiseer uw bezichtigingstrip met hotelsuggesties, planning en persoonlijke begeleiding.</p>
      <div class="cta-button">Plan mijn Trip</div>
    </div>
  </div>
  
  <div class="footer-cta-simple no-break">
    <p>Of neem direct contact op:</p>
    <div class="contact">📧 info@topimmospain.com • 📞 +32 3 123 45 67</div>
  </div>

  <!-- LEGAL -->
  <div class="legal">
    <strong>Disclaimer:</strong> Dit document is uitsluitend bedoeld ter informatie en vormt geen bindend aanbod of financieel advies. Alle cijfers zijn schattingen en kunnen afwijken van de werkelijkheid. Historische rendementen bieden geen garantie voor toekomstige resultaten. Raadpleeg altijd een onafhankelijk financieel adviseur voordat u investeringsbeslissingen neemt. Top Immo Spain aanvaardt geen aansprakelijkheid voor beslissingen gebaseerd op dit document.
    <br><br>
    <strong>© ${new Date().getFullYear()} Top Immo Spain</strong> • Alle rechten voorbehouden • Gegenereerd op ${formatDate()}
  </div>
</body>
</html>`;
}
