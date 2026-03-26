import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

interface ProjectDocument {
  id: string;
  document_type: string;
  title: string;
  file_url: string;
}

interface ProjectVideo {
  id: string;
  title: string;
  video_url?: string;
  video_type?: string;
}

interface ROIInputs {
  purchasePrice?: number;
  yearlyAppreciation?: number;
  rentalGrowthRate?: number;
  costInflation?: number;
  investmentYears?: number;
  occupancyRate?: number;
  lowSeasonRate?: number;
  highSeasonRate?: number;
  managementFee?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, roiInputs } = await req.json();
    
    if (!projectId) {
      throw new Error("Project ID is required");
    }

    console.log(`[PDF] Starting generation for project: ${projectId}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch project data
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      throw new Error(`Project not found: ${projectError?.message}`);
    }

    console.log(`[PDF] Found project: ${project.name}`);

    // Fetch properties
    const { data: properties, error: propertiesError } = await supabase
      .from("properties")
      .select("*")
      .eq("project_id", projectId)
      .in("status", ["available", "sold"])
      .order("price", { ascending: true });

    if (propertiesError) {
      console.error("[PDF] Error fetching properties:", propertiesError);
    }

    const propertyList = properties || [];
    console.log(`[PDF] Found ${propertyList.length} properties`);

    // Fetch cached rental data from rental_comparables_cache
    let rentalData: RentalData | null = null;
    if (propertyList.length > 0) {
      const firstProp = propertyList[0];
      const { data: rentalCache, error: rentalError } = await supabase
        .from("rental_comparables_cache")
        .select("data, comparables")
        .eq("project_id", projectId)
        .eq("bedrooms", firstProp.bedrooms || 2)
        .maybeSingle();

      if (rentalError) {
        console.error("[PDF] Error fetching rental cache:", rentalError);
      }

      if (rentalCache && rentalCache.data) {
        const cacheData = rentalCache.data as any;
        rentalData = {
          avgMonthlyRevenue: cacheData.monthly_avg_revenue,
          occupancyRate: cacheData.occupancy,
          avgDailyRate: cacheData.average_daily_rate,
          annualRevenue: cacheData.annual_revenue,
          currency: cacheData.currency || "EUR",
          comparables: rentalCache.comparables as any[] || [],
          monthlyDistributions: cacheData.monthly_revenue_distributions || [],
        };
        console.log(`[PDF] Found rental data: €${rentalData.avgMonthlyRevenue}/month, ${rentalData.occupancyRate}% occupancy`);
        console.log(`[PDF] Found ${rentalData.comparables?.length || 0} comparables`);
        console.log(`[PDF] Monthly distributions: ${rentalData.monthlyDistributions?.length || 0} months`);
      } else {
        console.log("[PDF] No rental cache found for project");
      }
    }

    // Fetch project documents with correct column names
    const { data: documents, error: docError } = await supabase
      .from("project_documents")
      .select("id, document_type, title, file_url")
      .eq("project_id", projectId)
      .eq("visible_portal", true)
      .order("order_index", { ascending: true });

    if (docError) {
      console.error("[PDF] Error fetching documents:", docError);
    }

    const documentList = (documents || []) as ProjectDocument[];
    console.log(`[PDF] Found ${documentList.length} documents`);

    // Fetch project videos via project_video_links JOIN
    const { data: videoLinks, error: videoError } = await supabase
      .from("project_video_links")
      .select(`
        video_id,
        order_index,
        project_videos!inner (
          id,
          title,
          video_url,
          video_type
        )
      `)
      .eq("project_id", projectId)
      .eq("visible_portal", true)
      .order("order_index", { ascending: true })
      .limit(5);

    if (videoError) {
      console.error("[PDF] Error fetching videos:", videoError);
    }

    const videoList: ProjectVideo[] = (videoLinks || []).map((link: any) => ({
      id: link.project_videos.id,
      title: link.project_videos.title,
      video_url: link.project_videos.video_url,
      video_type: link.project_videos.video_type,
    }));
    console.log(`[PDF] Found ${videoList.length} videos`);

    // Generate HTML with ROI inputs
    const html = generatePdfHtml(project, propertyList, rentalData, documentList, videoList, roiInputs);
    const htmlBase64 = btoa(unescape(encodeURIComponent(html)));

    console.log("[PDF] HTML generated successfully");

    return new Response(
      JSON.stringify({ htmlBase64 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[PDF] Error generating PDF:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generatePdfHtml(
  project: any, 
  properties: Property[], 
  rentalData: RentalData | null,
  documents: ProjectDocument[],
  videos: ProjectVideo[],
  roiInputs?: ROIInputs
): string {
  const today = new Date().toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const availableProps = properties.filter(p => p.status === "available");
  const minPrice = properties.length > 0 ? Math.min(...properties.map(p => p.price || 0)) : 0;
  const maxPrice = properties.length > 0 ? Math.max(...properties.map(p => p.price || 0)) : 0;
  const priceRange = properties.length > 0
    ? `€${minPrice.toLocaleString("nl-NL")} - €${maxPrice.toLocaleString("nl-NL")}`
    : "Prijs op aanvraag";

  const bedroomRange = properties.length > 0
    ? `${Math.min(...properties.map(p => p.bedrooms || 0))} - ${Math.max(...properties.map(p => p.bedrooms || 0))}`
    : "-";

  // Calculate ROI data with DYNAMIC formulas (same as frontend SharedROICalculator)
  const avgPrice = roiInputs?.purchasePrice || (properties.length > 0 
    ? properties.reduce((sum, p) => sum + (p.price || 0), 0) / properties.length 
    : 300000);
  
  // Determine if nieuwbouw (newbuild) - from project or property type
  const isNieuwbouw = project.property_type === 'nieuwbouw' || 
                      project.construction_status === 'under_construction' || 
                      project.construction_status === 'planned' ||
                      true; // Default to nieuwbouw for Costa Cálida projects
  
  // Determine ITP rate based on region (Murcia = 8%, Alicante/Valencia = 10%)
  const regionLower = (project.region || '').toLowerCase();
  const itpRate = regionLower.includes('murcia') ? 0.08 : 0.10;
  
  // === DYNAMIC ROI PARAMETERS FROM CALCULATOR ===
  const yearlyAppreciation = (roiInputs?.yearlyAppreciation || 3) / 100;
  const rentalGrowthRate = (roiInputs?.rentalGrowthRate || 3) / 100;
  const costInflation = (roiInputs?.costInflation || 2.5) / 100;
  const investmentYears = roiInputs?.investmentYears || 10;
  const managementFee = (roiInputs?.managementFee || 20) / 100;
  
  // === DYNAMIC PURCHASE COSTS (same formulas as DashboardPurchaseCostsCalculator) ===
  const btwOrItp = isNieuwbouw 
    ? avgPrice * 0.10  // 10% BTW for new build
    : avgPrice * itpRate;  // ITP for existing
  const ajd = isNieuwbouw ? avgPrice * 0.015 : 0; // 1.5% zegelrecht only for new build
  const advocaatBase = avgPrice * 0.01;
  const advocaatTotal = advocaatBase * 1.21; // incl. 21% BTW
  const notarisKosten = 2000;
  const registratieKosten = 800;
  const volmachtKosten = 700;
  const nutsaansluitingen = 300;
  const bankKosten = 200;
  const administratieKosten = 250;
  const nieKosten = 20;
  
  const totalPurchaseCosts = btwOrItp + ajd + advocaatTotal + notarisKosten + 
    registratieKosten + volmachtKosten + nutsaansluitingen + bankKosten + 
    administratieKosten + nieKosten;
  const purchaseCostsPercentage = (totalPurchaseCosts / avgPrice) * 100;
  
  // === DYNAMIC ANNUAL COSTS (same formulas as SharedROICalculator) ===
  const ibiTax = Math.round(avgPrice * 0.0018); // ~0.18% onroerendgoedbelasting
  const verzekering = Math.round(avgPrice * 0.0009); // ~0.09%
  const vveKosten = 900; // Gemeenschapskosten - varies by complex
  const nutsVoorzieningen = 1200; // Utilities
  const afvalheffing = 100; // Basura
  const onderhoudReserve = Math.round(avgPrice * 0.0025); // ~0.25% maintenance reserve
  
  const baseAnnualCosts = ibiTax + verzekering + vveKosten + nutsVoorzieningen + afvalheffing + onderhoudReserve;
  
  // === RENTAL INCOME CALCULATIONS ===
  const baseAnnualRentalIncome = rentalData?.annualRevenue || (rentalData?.avgMonthlyRevenue || 0) * 12;
  const totalInvestment = avgPrice + totalPurchaseCosts;
  const baseManagementCosts = baseAnnualRentalIncome * managementFee;
  const baseNetIncome = baseAnnualRentalIncome - baseManagementCosts - baseAnnualCosts;
  const grossYield = avgPrice > 0 ? (baseAnnualRentalIncome / totalInvestment) * 100 : 0;
  const netYield = avgPrice > 0 ? (baseNetIncome / totalInvestment) * 100 : 0;
  
  // === GENERATE PROJECTION WITH GROWTH AND INFLATION ===
  // Milestone years: 1, 5, and the selected investment horizon
  const milestoneYears = investmentYears === 10 
    ? [1, 5, 10] 
    : investmentYears === 5 
      ? [1, 3, 5]
      : [1, Math.ceil(investmentYears / 2), investmentYears];
  
  const milestones = milestoneYears.map(year => {
    // Property value with appreciation
    const appreciatedValue = avgPrice * Math.pow(1 + yearlyAppreciation, year);
    
    // Cumulative rental income with growth, costs with inflation
    let cumulativeGrossRental = 0;
    let cumulativeManagement = 0;
    let cumulativeCosts = 0;
    
    for (let y = 1; y <= year; y++) {
      const yearlyGrossRental = baseAnnualRentalIncome * Math.pow(1 + rentalGrowthRate, y - 1);
      const yearlyManagement = yearlyGrossRental * managementFee;
      const yearlyCosts = baseAnnualCosts * Math.pow(1 + costInflation, y - 1);
      
      cumulativeGrossRental += yearlyGrossRental;
      cumulativeManagement += yearlyManagement;
      cumulativeCosts += yearlyCosts;
    }
    
    const cumulativeNetRental = cumulativeGrossRental - cumulativeManagement - cumulativeCosts;
    const appreciation = appreciatedValue - avgPrice;
    const totalReturn = appreciation + cumulativeNetRental;
    
    return {
      year,
      value: Math.round(appreciatedValue),
      cumGrossRental: Math.round(cumulativeGrossRental),
      cumManagement: Math.round(cumulativeManagement),
      cumCosts: Math.round(cumulativeCosts),
      cumNetRental: Math.round(cumulativeNetRental),
      appreciation: Math.round(appreciation),
      totalReturn: Math.round(totalReturn),
    };
  });
  
  // Legacy compatibility
  const totalAnnualCosts = baseAnnualCosts;
  const annualRentalIncome = baseAnnualRentalIncome;
  const netIncome = baseNetIncome;

  // Quarterly data instead of monthly
  const monthlyDist = rentalData?.monthlyDistributions || [];
  const quarterlyData = [
    { label: 'Q1', months: 'Jan - Mrt', revenue: 0, percentage: 0, season: 'Laagseizoen' },
    { label: 'Q2', months: 'Apr - Jun', revenue: 0, percentage: 0, season: 'Schouderseizoen' },
    { label: 'Q3', months: 'Jul - Sep', revenue: 0, percentage: 0, season: 'Hoogseizoen' },
    { label: 'Q4', months: 'Okt - Dec', revenue: 0, percentage: 0, season: 'Laagseizoen' },
  ];
  
  if (monthlyDist.length >= 12) {
    const annualRev = rentalData?.annualRevenue || 0;
    quarterlyData[0].percentage = (monthlyDist[0] + monthlyDist[1] + monthlyDist[2]) * 100;
    quarterlyData[0].revenue = Math.round(annualRev * (monthlyDist[0] + monthlyDist[1] + monthlyDist[2]));
    quarterlyData[1].percentage = (monthlyDist[3] + monthlyDist[4] + monthlyDist[5]) * 100;
    quarterlyData[1].revenue = Math.round(annualRev * (monthlyDist[3] + monthlyDist[4] + monthlyDist[5]));
    quarterlyData[2].percentage = (monthlyDist[6] + monthlyDist[7] + monthlyDist[8]) * 100;
    quarterlyData[2].revenue = Math.round(annualRev * (monthlyDist[6] + monthlyDist[7] + monthlyDist[8]));
    quarterlyData[3].percentage = (monthlyDist[9] + monthlyDist[10] + monthlyDist[11]) * 100;
    quarterlyData[3].revenue = Math.round(annualRev * (monthlyDist[9] + monthlyDist[10] + monthlyDist[11]));
  }
  
  // Cost breakdown for display
  const purchaseCostsBreakdown = [
    { label: isNieuwbouw ? 'BTW (IVA) 10%' : `ITP ${(itpRate * 100)}%`, amount: btwOrItp, percentage: isNieuwbouw ? 10 : itpRate * 100 },
    ...(isNieuwbouw ? [{ label: 'Zegelrecht (AJD) 1.5%', amount: ajd, percentage: 1.5 }] : []),
    { label: 'Advocaat (1% + BTW)', amount: advocaatTotal, percentage: (advocaatTotal / avgPrice) * 100 },
    { label: 'Notariskosten', amount: notarisKosten, percentage: (notarisKosten / avgPrice) * 100 },
    { label: 'Kadaster/Registratie', amount: registratieKosten, percentage: (registratieKosten / avgPrice) * 100 },
    { label: 'Volmacht', amount: volmachtKosten, percentage: (volmachtKosten / avgPrice) * 100 },
    { label: 'Nutsaansluitingen', amount: nutsaansluitingen, percentage: (nutsaansluitingen / avgPrice) * 100 },
    { label: 'Bankkosten', amount: bankKosten, percentage: (bankKosten / avgPrice) * 100 },
    { label: 'Administratie', amount: administratieKosten, percentage: (administratieKosten / avgPrice) * 100 },
    { label: 'NIE-nummer', amount: nieKosten, percentage: (nieKosten / avgPrice) * 100 },
  ];
  
  const annualCostsBreakdown = [
    { label: 'IBI (onroerendgoedbelasting)', amount: ibiTax, description: '~0.18% van aankoopwaarde' },
    { label: 'Opstalverzekering', amount: verzekering, description: '~0.09% van aankoopwaarde' },
    { label: 'VvE/Gemeenschapskosten', amount: vveKosten, description: 'Afhankelijk van complex' },
    { label: 'Nutsvoorzieningen', amount: nutsVoorzieningen, description: 'Elektra, water, gas' },
    { label: 'Afvalheffing (Basura)', amount: afvalheffing, description: 'Gemeentelijke heffing' },
    { label: 'Onderhoud reserve', amount: onderhoudReserve, description: '~0.25% van waarde' },
  ];

  // Project image URL
  const projectImageUrl = project.image_url || null;

  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.display_title || project.name} - Investeringsbrochure | Top Immo Spain</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    :root {
      --viva-primary: #0ea5e9;
      --viva-primary-dark: #0284c7;
      --viva-warm: #f59e0b;
      --viva-warm-light: #fef3c7;
      --viva-sand: #f5f0e8;
      --viva-text: #1a1a1a;
      --viva-text-muted: #64748b;
      --viva-success: #10b981;
      --viva-success-light: #dcfce7;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: var(--viva-text);
      background: white;
      counter-reset: page-counter;
    }
    
    @page {
      size: A4;
      margin: 18mm 20mm 25mm 20mm;
      @bottom-center {
        content: "Pagina " counter(page);
        font-size: 9pt;
        color: #64748b;
      }
    }
    
    @media print {
      body { 
        print-color-adjust: exact; 
        -webkit-print-color-adjust: exact; 
      }
      .page-break { page-break-before: always; }
      .no-break { page-break-inside: avoid; }
      table { page-break-inside: avoid; }
      .stat-card { page-break-inside: avoid; }
      .info-box { page-break-inside: avoid; }
      .disclaimer-box { page-break-inside: avoid; }
      .faq-item { page-break-inside: avoid; }
      .summary-card { page-break-inside: avoid; }
      .comparable-card { page-break-inside: avoid; }
      .page-footer { 
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        height: 20mm;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 8pt;
        color: var(--viva-text-muted);
        border-top: 1px solid #e2e8f0;
        padding: 0 20mm;
      }
    }
    
    /* Top Immo Spain Branding */
    .viva-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 2px solid var(--viva-primary);
      margin-bottom: 24px;
    }
    
    .viva-logo {
      font-size: 14pt;
      font-weight: 700;
      color: var(--viva-primary);
      letter-spacing: -0.5px;
    }
    
    .viva-tagline {
      font-size: 9pt;
      color: var(--viva-text-muted);
    }
    
    /* Cover Page with Project Image */
    .cover {
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      text-align: center;
      background: white;
      position: relative;
    }
    
    .cover-image {
      width: 100%;
      height: 45vh;
      background-size: cover;
      background-position: center;
      position: relative;
    }
    
    .cover-image::after {
      content: "";
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 120px;
      background: linear-gradient(to top, white, transparent);
    }
    
    .cover-image-placeholder {
      width: 100%;
      height: 45vh;
      background: linear-gradient(135deg, var(--viva-sand) 0%, #e8e0d5 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      border-bottom: 6px solid var(--viva-primary);
    }
    
    .cover-image-placeholder::before {
      content: "🏠";
      font-size: 80pt;
      opacity: 0.3;
    }
    
    .cover-content {
      padding: 40px;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    
    .cover-logo {
      font-size: 16pt;
      font-weight: 700;
      color: var(--viva-primary);
      letter-spacing: -0.5px;
      margin-bottom: 40px;
    }
    
    .cover-logo span {
      font-weight: 400;
      color: var(--viva-text-muted);
    }
    
    .cover h1 {
      font-size: 32pt;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 8px;
      line-height: 1.2;
    }
    
    .cover .subtitle {
      font-size: 14pt;
      color: var(--viva-text-muted);
      margin-bottom: 24px;
    }
    
    .cover .badge {
      display: inline-block;
      background: var(--viva-primary);
      color: white;
      padding: 10px 24px;
      border-radius: 24px;
      font-size: 10pt;
      font-weight: 600;
      margin-bottom: 32px;
    }
    
    .cover .date {
      font-size: 10pt;
      color: var(--viva-text-muted);
    }
    
    .cover-footer {
      padding: 20px 40px;
      background: var(--viva-sand);
      text-align: center;
    }
    
    .cover-footer p {
      font-size: 10pt;
      color: var(--viva-text-muted);
    }
    
    .cover-footer strong {
      color: var(--viva-text);
    }
    
    /* Executive Summary - Key Metrics Cards */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-bottom: 32px;
    }
    
    .summary-card {
      background: #f8fafc;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      padding: 24px;
      text-align: center;
    }
    
    .summary-card-highlight {
      background: var(--viva-success-light);
      border-color: var(--viva-success);
    }
    
    .summary-card-primary {
      background: #e0f2fe;
      border-color: var(--viva-primary);
    }
    
    .summary-value {
      font-size: 28pt;
      font-weight: 700;
      color: var(--viva-primary);
      line-height: 1.1;
    }
    
    .summary-value-success {
      color: var(--viva-success);
    }
    
    .summary-label {
      font-size: 11pt;
      color: var(--viva-text-muted);
      margin-top: 8px;
      font-weight: 500;
    }
    
    .summary-sublabel {
      font-size: 9pt;
      color: var(--viva-text-muted);
      margin-top: 4px;
    }
    
    /* Section Styling */
    .section {
      margin-bottom: 30px;
    }
    
    .section-title {
      font-size: 16pt;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 3px solid var(--viva-primary);
      position: relative;
    }
    
    .section-title::after {
      content: "";
      position: absolute;
      bottom: -3px;
      left: 0;
      width: 60px;
      height: 3px;
      background: var(--viva-warm);
    }
    
    .section-subtitle {
      font-size: 12pt;
      font-weight: 600;
      color: #334155;
      margin-bottom: 12px;
    }
    
    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }
    
    .stats-grid-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    
    .stat-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-top: 3px solid var(--viva-primary);
      border-radius: 8px;
      padding: 20px 16px;
      text-align: center;
    }
    
    .stat-card-highlight {
      border-top-color: var(--viva-success);
    }
    
    .stat-value {
      font-size: 18pt;
      font-weight: 700;
      color: var(--viva-primary);
    }
    
    .stat-value-sm {
      font-size: 14pt;
      font-weight: 700;
      color: var(--viva-primary);
    }
    
    .stat-value-success {
      color: var(--viva-success);
    }
    
    .stat-label {
      font-size: 9pt;
      color: var(--viva-text-muted);
      margin-top: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .description {
      color: #334155;
      margin-bottom: 24px;
    }
    
    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      font-size: 10pt;
    }
    
    th {
      background: #f1f5f9;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #334155;
      border-bottom: 2px solid var(--viva-primary);
    }
    
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    
    tr:nth-child(even) { background: #f8fafc; }
    
    .status-available {
      display: inline-block;
      background: var(--viva-success-light);
      color: #166534;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 9pt;
      font-weight: 600;
    }
    
    .status-sold {
      display: inline-block;
      background: #fecaca;
      color: #991b1b;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 9pt;
      font-weight: 600;
    }
    
    /* Boxes */
    .disclaimer-box {
      background: var(--viva-warm-light);
      border: 1px solid #fcd34d;
      border-left: 4px solid var(--viva-warm);
      border-radius: 8px;
      padding: 16px;
      margin: 20px 0;
      font-size: 9pt;
    }
    
    .disclaimer-box strong {
      color: #92400e;
    }
    
    .info-box {
      background: #f0f9ff;
      border: 1px solid var(--viva-primary);
      border-left: 4px solid var(--viva-primary);
      border-radius: 8px;
      padding: 16px;
      margin: 20px 0;
    }
    
    .info-box h4 {
      color: var(--viva-primary-dark);
      margin-bottom: 8px;
      font-size: 11pt;
    }
    
    .viva-usp-box {
      background: var(--viva-sand);
      border: 2px solid var(--viva-primary);
      border-radius: 12px;
      padding: 24px;
      margin: 24px 0;
    }
    
    .viva-usp-box h3 {
      color: var(--viva-primary);
      margin-bottom: 16px;
      font-size: 14pt;
    }
    
    .usp-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
    
    .usp-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }
    
    .usp-icon {
      font-size: 20pt;
    }
    
    .usp-text h4 {
      font-size: 10pt;
      font-weight: 600;
      color: var(--viva-text);
      margin-bottom: 4px;
    }
    
    .usp-text p {
      font-size: 9pt;
      color: var(--viva-text-muted);
    }
    
    /* CTA Section */
    .cta-section {
      background: var(--viva-primary);
      color: white;
      padding: 32px;
      border-radius: 16px;
      text-align: center;
      margin: 40px 0;
    }
    
    .cta-section h3 {
      font-size: 18pt;
      margin-bottom: 12px;
    }
    
    .cta-section p {
      font-size: 11pt;
      opacity: 0.9;
      margin-bottom: 20px;
    }
    
    .cta-buttons {
      display: flex;
      justify-content: center;
      gap: 16px;
      flex-wrap: wrap;
    }
    
    .cta-button {
      background: white;
      color: var(--viva-primary);
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      text-decoration: none;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    
    /* Footer */
    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      font-size: 9pt;
      color: var(--viva-text-muted);
    }
    
    .footer-legal {
      background: #f8fafc;
      padding: 20px;
      border-radius: 8px;
      margin-top: 20px;
    }
    
    .footer-branding {
      margin-top: 32px;
      text-align: center;
      padding: 24px;
      background: var(--viva-sand);
      border-radius: 12px;
      border: 1px solid #e2e8f0;
    }
    
    .footer-branding .logo {
      font-size: 16pt;
      font-weight: 700;
      color: var(--viva-primary);
      margin-bottom: 8px;
    }
    
    .two-column {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }
    
    .highlight-list {
      list-style: none;
      padding: 0;
    }
    
    .highlight-list li {
      padding: 8px 0;
      padding-left: 28px;
      position: relative;
    }
    
    .highlight-list li::before {
      content: "✓";
      position: absolute;
      left: 0;
      color: var(--viva-success);
      font-weight: bold;
      font-size: 14pt;
    }
    
    .roi-table td:last-child {
      text-align: right;
      font-weight: 600;
    }
    
    .faq-item {
      margin-bottom: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid #e2e8f0;
    }
    
    .faq-question {
      font-weight: 600;
      color: #0f172a;
      margin-bottom: 8px;
    }
    
    .faq-answer {
      color: #475569;
      font-size: 10pt;
    }
    
    /* Quarterly Revenue Bars */
    .quarter-grid {
      display: grid;
      gap: 16px;
      margin-bottom: 24px;
    }
    
    .quarter-row {
      display: grid;
      grid-template-columns: 100px 1fr 80px 100px;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: #f8fafc;
      border-radius: 8px;
    }
    
    .quarter-row.high-season {
      background: var(--viva-success-light);
      border: 1px solid var(--viva-success);
    }
    
    .quarter-label {
      font-weight: 600;
      color: var(--viva-text);
    }
    
    .quarter-months {
      font-size: 9pt;
      color: var(--viva-text-muted);
    }
    
    .quarter-bar-container {
      background: #e2e8f0;
      height: 24px;
      border-radius: 12px;
      overflow: hidden;
    }
    
    .quarter-bar {
      height: 100%;
      background: var(--viva-primary);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding-right: 8px;
      font-size: 9pt;
      font-weight: 600;
      color: white;
      min-width: 40px;
    }
    
    .quarter-bar.high-season-bar {
      background: var(--viva-success);
    }
    
    .quarter-revenue {
      font-weight: 600;
      color: var(--viva-text);
      text-align: right;
    }
    
    .quarter-season {
      font-size: 9pt;
      padding: 4px 10px;
      border-radius: 6px;
      font-weight: 500;
    }
    
    .quarter-season.high {
      background: var(--viva-success-light);
      color: #166534;
    }
    
    .quarter-season.low {
      background: #f1f5f9;
      color: var(--viva-text-muted);
    }
    
    /* Milestone Cards */
    .milestone-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 24px;
    }
    
    .milestone-card {
      background: white;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
    }
    
    .milestone-card:last-child {
      border-color: var(--viva-success);
      background: var(--viva-success-light);
    }
    
    .milestone-year {
      font-size: 24pt;
      font-weight: 700;
      color: var(--viva-primary);
      margin-bottom: 4px;
    }
    
    .milestone-year-label {
      font-size: 10pt;
      color: var(--viva-text-muted);
      margin-bottom: 16px;
    }
    
    .milestone-stat {
      margin-bottom: 12px;
    }
    
    .milestone-stat-label {
      font-size: 9pt;
      color: var(--viva-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .milestone-stat-value {
      font-size: 14pt;
      font-weight: 600;
      color: var(--viva-text);
    }
    
    .milestone-stat-value.success {
      color: var(--viva-success);
    }
    
    /* Comparable Cards */
    .comparables-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }
    
    .comparable-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 16px;
    }
    
    .comparable-title {
      font-weight: 600;
      color: var(--viva-text);
      margin-bottom: 12px;
      font-size: 10pt;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .comparable-stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    
    .comparable-stat {
      text-align: center;
      padding: 8px;
      background: white;
      border-radius: 6px;
    }
    
    .comparable-stat-value {
      font-weight: 600;
      color: var(--viva-primary);
      font-size: 11pt;
    }
    
    .comparable-stat-label {
      font-size: 8pt;
      color: var(--viva-text-muted);
    }
    
    /* Progress Bar */
    .progress-visual {
      margin-top: 24px;
      padding: 20px;
      background: #f8fafc;
      border-radius: 12px;
    }
    
    .progress-title {
      font-size: 11pt;
      font-weight: 600;
      color: var(--viva-text);
      margin-bottom: 16px;
    }
    
    .progress-item {
      margin-bottom: 12px;
    }
    
    .progress-item-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
      font-size: 10pt;
    }
    
    .progress-item-label {
      color: var(--viva-text-muted);
    }
    
    .progress-item-value {
      font-weight: 600;
      color: var(--viva-success);
    }
    
    .progress-bar-bg {
      height: 10px;
      background: #e2e8f0;
      border-radius: 5px;
      overflow: hidden;
    }
    
    .progress-bar-fill {
      height: 100%;
      background: var(--viva-success);
      border-radius: 5px;
    }
  </style>
</head>
<body>

  <!-- COVER PAGE -->
  <div class="cover">
    ${projectImageUrl ? `
    <div class="cover-image" style="background-image: url('${projectImageUrl}');"></div>
    ` : `
    <div class="cover-image-placeholder"></div>
    `}
    <div class="cover-content">
      <div class="cover-logo">Top Immo Spain <span>| Uw partner in Spanje</span></div>
      <div class="badge">Persoonlijke Investeringsbrochure</div>
      <h1>${project.display_title || project.name}</h1>
      <p class="subtitle">${project.city || ""}, ${project.region || "Costa Cálida"}</p>
      <p class="date">Gegenereerd op ${today}</p>
    </div>
    <div class="cover-footer">
      <p><strong>Top Immo Spain</strong> | Persoonlijke begeleiding van A tot Z</p>
      <p>www.topimmospain.com | info@topimmospain.com</p>
    </div>
  </div>

  <!-- EXECUTIVE SUMMARY PAGE -->
  <div class="page-break"></div>
  <div class="viva-header">
    <div class="viva-logo">Top Immo Spain</div>
    <div class="viva-tagline">Samenvatting</div>
  </div>
  
  <div class="section">
    <h2 class="section-title">Op Één Blik</h2>
    
    <p class="description">
      De belangrijkste cijfers van ${project.display_title || project.name} op een rij. 
      ${rentalData ? 'Gebaseerd op marktdata en vergelijkbare woningen in de regio.' : ''}
    </p>
    
    <div class="summary-grid">
      <div class="summary-card summary-card-primary no-break">
        <div class="summary-value">€${Math.round(avgPrice).toLocaleString("nl-NL")}</div>
        <div class="summary-label">Gemiddelde Aankoopprijs</div>
        <div class="summary-sublabel">Range: ${priceRange}</div>
      </div>
      <div class="summary-card no-break">
        <div class="summary-value">€${Math.round(totalInvestment).toLocaleString("nl-NL")}</div>
        <div class="summary-label">Totale Investering</div>
        <div class="summary-sublabel">Incl. ${purchaseCostsPercentage.toFixed(1)}% bijkomende kosten</div>
      </div>
      ${rentalData ? `
      <div class="summary-card no-break">
        <div class="summary-value">€${Math.round(annualRentalIncome).toLocaleString("nl-NL")}</div>
        <div class="summary-label">Bruto Huurinkomen per Jaar</div>
        <div class="summary-sublabel">Gebaseerd op Airbnb marktdata</div>
      </div>
      <div class="summary-card summary-card-highlight no-break">
        <div class="summary-value summary-value-success">${netYield.toFixed(1)}%</div>
        <div class="summary-label">Netto Rendement</div>
        <div class="summary-sublabel">Na aftrek jaarlijkse kosten</div>
      </div>
      ` : `
      <div class="summary-card no-break">
        <div class="summary-value">${bedroomRange}</div>
        <div class="summary-label">Slaapkamers</div>
        <div class="summary-sublabel">${availableProps.length} woningen beschikbaar</div>
      </div>
      <div class="summary-card no-break">
        <div class="summary-value">${project.city || 'Costa Cálida'}</div>
        <div class="summary-label">Locatie</div>
        <div class="summary-sublabel">${project.region || 'Zuidoost Spanje'}</div>
      </div>
      `}
    </div>
    
    ${rentalData ? `
    <div class="stats-grid">
      <div class="stat-card no-break">
        <div class="stat-value">${Math.round(rentalData.occupancyRate || 0)}%</div>
        <div class="stat-label">Bezettingsgraad</div>
      </div>
      <div class="stat-card no-break">
        <div class="stat-value">€${Math.round(rentalData.avgDailyRate || 0)}</div>
        <div class="stat-label">Gem. Nachtprijs</div>
      </div>
      <div class="stat-card no-break stat-card-highlight">
        <div class="stat-value stat-value-success">${availableProps.length}</div>
        <div class="stat-label">Beschikbaar</div>
      </div>
    </div>
    ` : ''}
    
    <div class="info-box">
      <h4>📍 Over de Locatie</h4>
      <p style="font-size: 10pt; margin: 0;">
        ${project.city || 'Dit project'} ligt in ${project.region || 'de Costa Cálida regio'}, 
        een van de snelst groeiende vastgoedregio's van Spanje met meer dan 300 zonnige dagen per jaar.
        ${project.distance_beach ? `Afstand tot strand: ${project.distance_beach}.` : ''}
        ${project.distance_airport ? `Afstand tot vliegveld: ${project.distance_airport}.` : ''}
      </p>
    </div>
  </div>

  <!-- WHY TOP IMMO SPAIN -->
  <div class="page-break"></div>
  <div class="viva-header">
    <div class="viva-logo">Top Immo Spain</div>
    <div class="viva-tagline">Persoonlijke begeleiding van A tot Z</div>
  </div>
  
  <div class="section">
    <h2 class="section-title">Waarom Top Immo Spain?</h2>
    
    <p class="description">
      Al meer dan 10 jaar begeleiden wij Nederlandse en Belgische investeerders bij het vinden 
      en aankopen van vastgoed in Spanje. Ons team combineert lokale expertise met persoonlijke 
      aandacht voor uw specifieke wensen en doelen.
    </p>
    
    <div class="viva-usp-box">
      <h3>Onze Kernwaarden</h3>
      <div class="usp-grid">
        <div class="usp-item">
          <div class="usp-icon">🤝</div>
          <div class="usp-text">
            <h4>Persoonlijke Begeleiding</h4>
            <p>Eén vast aanspreekpunt gedurende het hele traject</p>
          </div>
        </div>
        <div class="usp-item">
          <div class="usp-icon">🏠</div>
          <div class="usp-text">
            <h4>Lokale Expertise</h4>
            <p>Team ter plaatse met kennis van de regio</p>
          </div>
        </div>
        <div class="usp-item">
          <div class="usp-icon">📋</div>
          <div class="usp-text">
            <h4>Volledig Ontzorgd</h4>
            <p>Van oriëntatie tot sleuteloverdracht en verhuur</p>
          </div>
        </div>
        <div class="usp-item">
          <div class="usp-icon">🔍</div>
          <div class="usp-text">
            <h4>Transparantie</h4>
            <p>Heldere communicatie over kosten en proces</p>
          </div>
        </div>
      </div>
    </div>
    
    <div class="info-box">
      <h4>📊 Het Viva 6-Fasenmodel</h4>
      <p style="font-size: 10pt; margin: 0;">
        Wij begeleiden u door zes duidelijke fases: <strong>1. Oriëntatie</strong> → 
        <strong>2. Selectie</strong> → <strong>3. Bezichtiging</strong> → 
        <strong>4. Aankoop</strong> → <strong>5. Oplevering</strong> → 
        <strong>6. Verhuur & Beheer</strong>. In elke fase weet u precies wat er gebeurt.
      </p>
    </div>
  </div>

  <!-- PROJECT OVERVIEW -->
  <div class="page-break"></div>
  <div class="viva-header">
    <div class="viva-logo">Top Immo Spain</div>
    <div class="viva-tagline">${project.display_title || project.name}</div>
  </div>
  
  <div class="section">
    <h2 class="section-title">Projectoverzicht</h2>
    
    <div class="stats-grid">
      <div class="stat-card no-break">
        <div class="stat-value">${priceRange}</div>
        <div class="stat-label">Prijsrange</div>
      </div>
      <div class="stat-card no-break">
        <div class="stat-value">${bedroomRange}</div>
        <div class="stat-label">Slaapkamers</div>
      </div>
      <div class="stat-card no-break stat-card-highlight">
        <div class="stat-value stat-value-success">${availableProps.length}</div>
        <div class="stat-label">Beschikbaar</div>
      </div>
    </div>
    
    ${project.description ? `<div class="description">${project.description}</div>` : ""}
    
    ${project.highlights && Array.isArray(project.highlights) ? `
    <h3 class="section-subtitle">Highlights van dit Project</h3>
    <ul class="highlight-list">
      ${project.highlights.slice(0, 6).map((h: string) => `<li>${h}</li>`).join("")}
    </ul>
    ` : ""}
  </div>

  <!-- AVAILABLE PROPERTIES -->
  ${properties.length > 0 ? `
  <div class="page-break"></div>
  <div class="viva-header">
    <div class="viva-logo">Top Immo Spain</div>
    <div class="viva-tagline">${project.display_title || project.name}</div>
  </div>
  
  <div class="section">
    <h2 class="section-title">Beschikbare Woningen</h2>
    
    <table>
      <thead>
        <tr>
          <th>Type</th>
          <th>Prijs</th>
          <th>Slpk</th>
          <th>Badk</th>
          <th>Opp.</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${properties.slice(0, 15).map(p => `
        <tr>
          <td>${p.property_type || "Woning"}</td>
          <td>€${(p.price || 0).toLocaleString("nl-NL")}</td>
          <td>${p.bedrooms || "-"}</td>
          <td>${p.bathrooms || "-"}</td>
          <td>${p.area_sqm ? `${p.area_sqm} m²` : "-"}</td>
          <td><span class="status-${p.status}">${p.status === "available" ? "Beschikbaar" : "Verkocht"}</span></td>
        </tr>
        `).join("")}
      </tbody>
    </table>
    
    ${properties.length > 15 ? `<p style="font-size: 10pt; color: var(--viva-text-muted);">En nog ${properties.length - 15} andere woningen. Bekijk alle opties in uw portaal.</p>` : ""}
    
    <div class="disclaimer-box">
      <strong>Let op:</strong> Prijzen en beschikbaarheid zijn onder voorbehoud van wijzigingen. 
      Neem contact op met uw adviseur voor de meest actuele informatie.
    </div>
  </div>
  ` : ""}

  <!-- RENTAL POTENTIAL -->
  ${rentalData ? `
  <div class="page-break"></div>
  <div class="viva-header">
    <div class="viva-logo">Top Immo Spain</div>
    <div class="viva-tagline">Verhuurpotentieel</div>
  </div>
  
  <div class="section">
    <h2 class="section-title">Verhuurpotentieel & Marktanalyse</h2>
    
    <div class="info-box">
      <h4>📊 Over Deze Data</h4>
      <p style="font-size: 10pt; margin: 0;">
        Onderstaande cijfers zijn gebaseerd op <strong>echte verhuurdata van Airbnb</strong>. 
        De analyse is gebaseerd op historische prestaties van <strong>${rentalData.comparables?.length || 0} vergelijkbare woningen</strong> binnen 5 kilometer van dit project.
      </p>
    </div>
    
    <div class="stats-grid">
      ${rentalData.avgMonthlyRevenue ? `
      <div class="stat-card no-break">
        <div class="stat-value">€${Math.round(rentalData.avgMonthlyRevenue).toLocaleString("nl-NL")}</div>
        <div class="stat-label">Gem. Maandomzet</div>
      </div>
      ` : ""}
      ${rentalData.occupancyRate ? `
      <div class="stat-card no-break stat-card-highlight">
        <div class="stat-value stat-value-success">${Math.round(rentalData.occupancyRate)}%</div>
        <div class="stat-label">Bezettingsgraad</div>
      </div>
      ` : ""}
      ${rentalData.avgDailyRate ? `
      <div class="stat-card no-break">
        <div class="stat-value">€${Math.round(rentalData.avgDailyRate)}</div>
        <div class="stat-label">Gem. Nachtprijs</div>
      </div>
      ` : ""}
    </div>

    <!-- Quarterly Revenue Bars -->
    ${quarterlyData[0].revenue > 0 ? `
    <h3 class="section-subtitle">Seizoensverdeling Omzet</h3>
    <p style="font-size: 10pt; color: var(--viva-text-muted); margin-bottom: 16px;">
      Jaarlijkse omzet: <strong>€${Math.round(rentalData.annualRevenue || 0).toLocaleString("nl-NL")}</strong>
    </p>
    <div class="quarter-grid">
      ${quarterlyData.map(q => `
      <div class="quarter-row ${q.season === 'Hoogseizoen' ? 'high-season' : ''} no-break">
        <div>
          <div class="quarter-label">${q.label}</div>
          <div class="quarter-months">${q.months}</div>
        </div>
        <div class="quarter-bar-container">
          <div class="quarter-bar ${q.season === 'Hoogseizoen' ? 'high-season-bar' : ''}" style="width: ${Math.max(q.percentage * 2.5, 15)}%;">
            ${q.percentage.toFixed(0)}%
          </div>
        </div>
        <div class="quarter-revenue">€${q.revenue.toLocaleString("nl-NL")}</div>
        <div><span class="quarter-season ${q.season === 'Hoogseizoen' ? 'high' : 'low'}">${q.season}</span></div>
      </div>
      `).join("")}
    </div>
    ` : ""}

    <!-- Comparable Cards -->
    ${rentalData.comparables && rentalData.comparables.length > 0 ? `
    <h3 class="section-subtitle" style="margin-top: 24px;">Vergelijkbare Woningen in de Buurt</h3>
    <div class="comparables-grid">
      ${rentalData.comparables.slice(0, 4).map((c: any) => `
      <div class="comparable-card no-break">
        <div class="comparable-title">${(c.name || 'Vergelijkbare woning').substring(0, 35)}${(c.name || '').length > 35 ? '...' : ''}</div>
        <div class="comparable-stats">
          <div class="comparable-stat">
            <div class="comparable-stat-value">${c.bedrooms || '-'} slpk</div>
            <div class="comparable-stat-label">Slaapkamers</div>
          </div>
          <div class="comparable-stat">
            <div class="comparable-stat-value">€${Math.round(c.pricing?.avg_nightly_rate || c.adr || 0)}/n</div>
            <div class="comparable-stat-label">Nachtprijs</div>
          </div>
          <div class="comparable-stat">
            <div class="comparable-stat-value">${Math.round(c.occupancy?.rate || c.occupancy || 0)}%</div>
            <div class="comparable-stat-label">Bezet</div>
          </div>
          <div class="comparable-stat">
            <div class="comparable-stat-value">€${Math.round(c.revenue?.monthly_avg || c.monthlyRevenue || 0).toLocaleString("nl-NL")}</div>
            <div class="comparable-stat-label">Per maand</div>
          </div>
        </div>
      </div>
      `).join("")}
    </div>
    <p style="font-size: 9pt; color: var(--viva-text-muted);">Bron: Airbnb. Gebaseerd op actuele verhuurdata van vergelijkbare woningen.</p>
    ` : ""}
    
    <div class="disclaimer-box">
      <strong>Belangrijke disclaimer:</strong> Dit zijn indicatieve schattingen op basis van 
      historische marktdata. Werkelijke verhuurinkomsten kunnen hoger of lager uitvallen afhankelijk 
      van factoren zoals: kwaliteit van de woning en inrichting, prijsstrategie, marketing, 
      beheer en onderhoud, en algemene marktomstandigheden. Deze cijfers vormen geen garantie.
    </div>
  </div>
  ` : ""}

  <!-- ROI CALCULATION -->
  ${rentalData ? `
  <div class="page-break"></div>
  <div class="viva-header">
    <div class="viva-logo">Top Immo Spain</div>
    <div class="viva-tagline">Rendementsanalyse</div>
  </div>
  
  <div class="section">
    <h2 class="section-title">Indicatieve Rendementsberekening</h2>
    
    <p class="description">
      Onderstaande berekening is gebaseerd op een gemiddelde woningprijs van €${Math.round(avgPrice).toLocaleString("nl-NL")} 
      en de verhuurdata uit de vorige sectie. Dit is een indicatief voorbeeld ter oriëntatie.
    </p>
    
    <div class="stats-grid-4">
      <div class="stat-card no-break">
        <div class="stat-value-sm">€${Math.round(avgPrice).toLocaleString("nl-NL")}</div>
        <div class="stat-label">Aankoopprijs</div>
      </div>
      <div class="stat-card no-break">
        <div class="stat-value-sm">€${Math.round(annualRentalIncome).toLocaleString("nl-NL")}</div>
        <div class="stat-label">Bruto Jaar</div>
      </div>
      <div class="stat-card no-break">
        <div class="stat-value-sm">${grossYield.toFixed(1)}%</div>
        <div class="stat-label">Bruto Rendement</div>
      </div>
      <div class="stat-card no-break stat-card-highlight">
        <div class="stat-value-sm stat-value-success">${netYield.toFixed(1)}%</div>
        <div class="stat-label">Netto Rendement</div>
      </div>
    </div>

    <h3 class="section-subtitle">Vermogensgroei op Belangrijke Momenten</h3>
    <p style="font-size: 10pt; color: var(--viva-text-muted); margin-bottom: 16px;">
      Gebaseerd op 3% jaarlijkse waardestijging en constante verhuurinkomsten
    </p>
    
    <div class="milestone-grid">
      ${milestones.map(m => `
      <div class="milestone-card no-break">
        <div class="milestone-year">${m.year}</div>
        <div class="milestone-year-label">jaar</div>
        <div class="milestone-stat">
          <div class="milestone-stat-label">Woningwaarde</div>
          <div class="milestone-stat-value">€${m.value.toLocaleString("nl-NL")}</div>
        </div>
        <div class="milestone-stat">
          <div class="milestone-stat-label">Cum. Netto Huur</div>
          <div class="milestone-stat-value">€${m.cumNetRental.toLocaleString("nl-NL")}</div>
        </div>
        <div class="milestone-stat">
          <div class="milestone-stat-label">Totaal Rendement</div>
          <div class="milestone-stat-value success">+€${m.totalReturn.toLocaleString("nl-NL")}</div>
        </div>
      </div>
      `).join("")}
    </div>
    
    <div class="progress-visual no-break">
      <div class="progress-title">Vermogensgroei Visualisatie</div>
      ${milestones.map(m => {
        const maxReturn = milestones[milestones.length - 1].totalReturn;
        const percentage = (m.totalReturn / maxReturn) * 100;
        return `
        <div class="progress-item">
          <div class="progress-item-header">
            <span class="progress-item-label">Na ${m.year} jaar</span>
            <span class="progress-item-value">+€${m.totalReturn.toLocaleString("nl-NL")}</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width: ${percentage}%;"></div>
          </div>
        </div>
        `;
      }).join("")}
    </div>
    
    <div class="info-box no-break">
      <strong>Gebruikte Parameters:</strong><br>
      • Verwachte waardestijging: <strong>${(yearlyAppreciation * 100).toFixed(1)}%</strong> per jaar<br>
      • Huurprijsstijging: <strong>${(rentalGrowthRate * 100).toFixed(1)}%</strong> per jaar<br>
      • Kostenstijging (inflatie): <strong>${(costInflation * 100).toFixed(1)}%</strong> per jaar<br>
      • Beleggingshorizon: <strong>${investmentYears} jaar</strong><br>
      • Verhuurmanagement: <strong>${(managementFee * 100).toFixed(0)}%</strong> van bruto huurinkomsten
    </div>
    
    <div class="disclaimer-box">
      <strong>Let op:</strong> Dit is een gepersonaliseerde berekening op basis van uw ingevoerde parameters. 
      Werkelijke resultaten kunnen afwijken. De verhuurdata is gebaseerd op Airbnb marktdata. 
      Raadpleeg een financieel adviseur voor een persoonlijke analyse.
    </div>
  </div>
  ` : ""}

  <!-- DETAILED COSTS BREAKDOWN -->
  <div class="page-break"></div>
  <div class="viva-header">
    <div class="viva-logo">Top Immo Spain</div>
    <div class="viva-tagline">Kostenstructuur</div>
  </div>
  
  <div class="section">
    <h2 class="section-title">Gedetailleerde Kostenberekening</h2>
    
    <p class="description">
      Onderstaande berekening is specifiek voor dit project, gebaseerd op een gemiddelde aankoopprijs 
      van <strong>€${Math.round(avgPrice).toLocaleString("nl-NL")}</strong>.
    </p>
    
    <div class="two-column">
      <div class="no-break">
        <h3 class="section-subtitle">Eenmalige Aankoopkosten</h3>
        <table class="roi-table">
          ${purchaseCostsBreakdown.map(c => `
          <tr>
            <td>${c.label}</td>
            <td>€${Math.round(c.amount).toLocaleString("nl-NL")}</td>
          </tr>
          `).join("")}
          <tr style="background: var(--viva-success-light);">
            <td><strong>Totaal Bijkomend</strong></td>
            <td><strong>€${Math.round(totalPurchaseCosts).toLocaleString("nl-NL")} (${purchaseCostsPercentage.toFixed(1)}%)</strong></td>
          </tr>
          <tr style="background: #f1f5f9;">
            <td><strong>Totale Investering</strong></td>
            <td><strong>€${Math.round(totalInvestment).toLocaleString("nl-NL")}</strong></td>
          </tr>
        </table>
      </div>
      
      <div class="no-break">
        <h3 class="section-subtitle">Jaarlijkse Exploitatiekosten</h3>
        <table class="roi-table">
          ${annualCostsBreakdown.map(c => `
          <tr>
            <td>${c.label}<br><span style="font-size: 8pt; color: var(--viva-text-muted);">${c.description}</span></td>
            <td>€${Math.round(c.amount).toLocaleString("nl-NL")}</td>
          </tr>
          `).join("")}
          <tr style="background: var(--viva-warm-light);">
            <td><strong>Totaal per Jaar</strong></td>
            <td><strong>€${Math.round(totalAnnualCosts).toLocaleString("nl-NL")}</strong></td>
          </tr>
        </table>
      </div>
    </div>
    
    <div class="info-box" style="margin-top: 24px;">
      <h4>💡 Goed om te weten</h4>
      <p style="font-size: 10pt; margin: 0;">
        Bij verhuur kunt u bepaalde kosten aftrekken van de Spaanse belasting op huurinkomsten. 
        Denk aan: onderhoud, beheerkosten, verzekering en afschrijving. Een fiscaal adviseur kan 
        helpen met optimalisatie.
      </p>
    </div>
    
    <div class="disclaimer-box">
      <strong>Fiscale disclaimer:</strong> Bovenstaande bedragen zijn indicatief en berekend op basis 
      van een aankoopprijs van €${Math.round(avgPrice).toLocaleString("nl-NL")}. Werkelijke kosten kunnen variëren 
      per gemeente, notaris en specifieke situatie. Raadpleeg altijd een fiscaal adviseur.
    </div>
  </div>

  <!-- DOCUMENTS & VIDEOS -->
  ${(documents.length > 0 || videos.length > 0) ? `
  <div class="page-break"></div>
  <div class="viva-header">
    <div class="viva-logo">Top Immo Spain</div>
    <div class="viva-tagline">Documenten & Media</div>
  </div>
  
  <div class="section">
    <h2 class="section-title">Beschikbare Documenten en Media</h2>
    
    ${documents.length > 0 ? `
    <h3 class="section-subtitle">Projectdocumenten</h3>
    <table>
      <thead>
        <tr>
          <th>Document</th>
          <th>Type</th>
          <th>Beschikbaar via</th>
        </tr>
      </thead>
      <tbody>
        ${documents.slice(0, 10).map(d => `
        <tr>
          <td>${d.title || translateDocType(d.document_type)}</td>
          <td>${translateDocType(d.document_type)}</td>
          <td>Viva Portaal</td>
        </tr>
        `).join("")}
      </tbody>
    </table>
    <p style="font-size: 10pt; color: var(--viva-text-muted);">
      Log in op uw persoonlijke portaal om deze documenten te bekijken en te downloaden.
    </p>
    ` : ""}
    
    ${videos.length > 0 ? `
    <h3 class="section-subtitle" style="margin-top: 24px;">Video's</h3>
    <table>
      <thead>
        <tr>
          <th>Titel</th>
          <th>Type</th>
          <th>Link</th>
        </tr>
      </thead>
      <tbody>
        ${videos.map(v => `
        <tr>
          <td>${v.title}</td>
          <td>${translateVideoType(v.video_type || '')}</td>
          <td>${v.video_url || 'Bekijk in portaal'}</td>
        </tr>
        `).join("")}
      </tbody>
    </table>
    ` : ""}
  </div>
  ` : ""}

  <!-- FAQ SECTION -->
  <div class="page-break"></div>
  <div class="viva-header">
    <div class="viva-logo">Top Immo Spain</div>
    <div class="viva-tagline">Veelgestelde Vragen</div>
  </div>
  
  <div class="section">
    <h2 class="section-title">Veelgestelde Vragen</h2>
    
    <h3 class="section-subtitle">Financiering</h3>
    
    <div class="faq-item no-break">
      <div class="faq-question">Kan ik als buitenlander een hypotheek krijgen in Spanje?</div>
      <div class="faq-answer">
        Ja, Spaanse banken verstrekken hypotheken aan niet-residenten. Typisch kun je 60-70% van de 
        aankoopprijs financieren met een looptijd tot 20-25 jaar. De rente ligt momenteel rond 3-4% 
        (variabel of vast). Top Immo Spain werkt samen met hypotheekadviseurs die gespecialiseerd zijn 
        in financiering voor buitenlanders.
      </div>
    </div>
    
    <div class="faq-item no-break">
      <div class="faq-question">Hoeveel kan ik maximaal financieren?</div>
      <div class="faq-answer">
        Als niet-resident kun je doorgaans 60-70% van de taxatiewaarde financieren. De exacte hoogte 
        hangt af van je inkomen, bestaande verplichtingen en de bank. Een hypotheekadviseur kan een 
        indicatie geven op basis van jouw situatie.
      </div>
    </div>

    <h3 class="section-subtitle" style="margin-top: 24px;">Juridisch</h3>
    
    <div class="faq-item no-break">
      <div class="faq-question">Hoe verloopt het aankoopproces in Spanje?</div>
      <div class="faq-answer">
        Het proces bestaat uit: 1) Bezichtiging en selectie, 2) Reserveringsovereenkomst met aanbetaling, 
        3) Due diligence en voorbereiding, 4) Ondertekening koopakte bij de notaris, 5) Registratie op 
        uw naam. Bij nieuwbouw volgt u daarnaast het bouwproces met termijnbetalingen.
      </div>
    </div>
    
    <div class="faq-item no-break">
      <div class="faq-question">Wat is een NIE en heb ik die nodig?</div>
      <div class="faq-answer">
        Een NIE (Número de Identificación de Extranjero) is een identificatienummer voor buitenlanders 
        in Spanje. U heeft dit nodig voor alle officiële transacties, waaronder de aankoop van een woning, 
        het openen van een bankrekening en het betalen van belastingen. Wij begeleiden u bij de aanvraag.
      </div>
    </div>

    <h3 class="section-subtitle" style="margin-top: 24px;">Belastingen</h3>
    
    <div class="faq-item no-break">
      <div class="faq-question">Welke belastingen betaal ik bij aankoop?</div>
      <div class="faq-answer">
        Bij nieuwbouw betaal je 10% BTW (IVA) plus ongeveer 1.5% aan documentenbelasting (AJD). 
        Bij bestaande bouw betaal je 8% overdrachtsbelasting (ITP) in de regio Murcia. 
        Daarnaast komen notaris- en registratiekosten.
      </div>
    </div>

    <h3 class="section-subtitle" style="margin-top: 24px;">Verhuur</h3>
    
    <div class="faq-item no-break">
      <div class="faq-question">Heb ik een licentie nodig voor vakantieverhuur?</div>
      <div class="faq-answer">
        Ja, voor kortetermijnverhuur in de regio Murcia heb je een toeristische verhuurlicentie 
        (VUT) nodig. De aanvraagprocedure verschilt per gemeente. Wij kunnen je in contact brengen 
        met specialisten die dit regelen.
      </div>
    </div>
    
    <div class="faq-item no-break">
      <div class="faq-question">Wat zijn de kosten van verhuurbeheer?</div>
      <div class="faq-answer">
        Professionele verhuurmanagers rekenen doorgaans 15-25% van de huurinkomsten. Dit omvat 
        gastencommunicatie, check-in/out, schoonmaak coördinatie, en prijsbeheer. Sommige bieden 
        ook onderhoudscoördinatie als extra service.
      </div>
    </div>
  </div>

  <!-- CTA SECTION -->
  <div class="page-break"></div>
  <div class="viva-header">
    <div class="viva-logo">Top Immo Spain</div>
    <div class="viva-tagline">Volgende Stappen</div>
  </div>
  
  <div class="section">
    <h2 class="section-title">Klaar voor de Volgende Stap?</h2>
    
    <p class="description" style="margin-bottom: 24px;">
      Heeft u interesse in dit project of wilt u meer weten over investeren in Spanje? 
      Er zijn verschillende manieren waarop we u verder kunnen helpen:
    </p>
    
    <div class="cta-section">
      <h3>Neem Contact Op met Uw Adviseur</h3>
      <p>
        Plan een vrijblijvend oriëntatiegesprek met een van onze adviseurs 
        om uw wensen en mogelijkheden te bespreken.
      </p>
      <div class="cta-buttons">
        <span class="cta-button">📞 Plan een Videogesprek</span>
        <span class="cta-button">✈️ Bezichtigingsreis Info</span>
      </div>
    </div>
    
    <div class="two-column" style="margin-top: 32px;">
      <div class="no-break">
        <h3 class="section-subtitle">🎥 Oriënterend Videogesprek</h3>
        <p class="description">
          Bespreek dit project vrijblijvend met een adviseur. In een gesprek van 30-45 minuten 
          beantwoorden we al uw vragen en bespreken we of dit project bij uw situatie past.
        </p>
      </div>
      
      <div class="no-break">
        <h3 class="section-subtitle">✈️ Bezichtigingsreis</h3>
        <p class="description">
          Ervaar de regio en bekijk projecten ter plaatse. Wij regelen een op maat gemaakt 
          programma met bezichtigingen, ontmoetingen met lokale experts en tijd om de omgeving 
          te verkennen.
        </p>
      </div>
    </div>
    
    <div class="info-box" style="margin-top: 32px;">
      <h4>🌐 Bezoek Uw Persoonlijk Portaal</h4>
      <p style="font-size: 10pt; margin: 0;">
        In uw persoonlijke omgeving kunt u alle projecten vergelijken, favorieten opslaan, 
        documenten bekijken en uw adviseur bereiken. Log in op <strong>topimmospain.com/dashboard</strong>
      </p>
    </div>
  </div>

  <!-- LEGAL DISCLAIMER -->
  <div class="page-break"></div>
  <div class="footer">
    <h2 class="section-title">Disclaimer en Juridische Informatie</h2>
    
    <div class="footer-legal">
      <p style="margin-bottom: 12px;">
        <strong>Algemene disclaimer:</strong> Dit document is uitsluitend bedoeld ter informatie 
        en vormt geen aanbod, advies of aanbeveling tot aankoop van onroerend goed of het doen 
        van een investering. Alle informatie is met zorg samengesteld maar Top Immo Spain 
        aanvaardt geen aansprakelijkheid voor de volledigheid, juistheid of actualiteit van 
        de verstrekte informatie.
      </p>
      
      <p style="margin-bottom: 12px;">
        <strong>Rendementsdisclaimer:</strong> Genoemde rendementen, verhuurinkomsten en 
        waardeprojecties zijn indicatief en gebaseerd op historische data en aannames. 
        In het verleden behaalde resultaten bieden geen garantie voor de toekomst. 
        De waarde van onroerend goed kan fluctueren.
      </p>
      
      <p style="margin-bottom: 12px;">
        <strong>Fiscale disclaimer:</strong> De fiscale informatie in dit document is algemeen 
        van aard. Belastingwetgeving kan wijzigen en is afhankelijk van individuele omstandigheden. 
        Raadpleeg altijd een gekwalificeerd fiscaal adviseur.
      </p>
      
      <p style="margin-bottom: 12px;">
        <strong>Prijzen en beschikbaarheid:</strong> Alle genoemde prijzen zijn onder voorbehoud 
        van wijzigingen door de projectontwikkelaar. Beschikbaarheid kan wijzigen zonder 
        voorafgaande kennisgeving.
      </p>
      
      <p>
        <strong>Geldigheid:</strong> Dit document is gegenereerd op ${today} en geeft de situatie 
        weer zoals bekend op dat moment. Voor de meest actuele informatie, neem contact op met 
        uw adviseur.
      </p>
    </div>
    
    <div class="footer-branding">
      <div class="logo">Top Immo Spain</div>
      <p style="font-size: 10pt; color: var(--viva-text-muted);">Persoonlijke begeleiding van A tot Z</p>
      <p style="font-size: 10pt; margin-top: 12px;">www.topimmospain.com | info@topimmospain.com</p>
      <p style="font-size: 9pt; margin-top: 16px; color: var(--viva-text-muted);">
        © ${new Date().getFullYear()} Top Immo Spain. Alle rechten voorbehouden.
      </p>
    </div>
  </div>

</body>
</html>`;
}

function translateDocType(type: string): string {
  const translations: Record<string, string> = {
    'floor_plan': 'Plattegrond',
    'brochure': 'Brochure',
    'specifications': 'Specificaties',
    'price_list': 'Prijslijst',
    'pricelist': 'Prijslijst',
    'legal': 'Juridisch',
    'contract': 'Contract',
    'other': 'Overig',
  };
  return translations[type] || type;
}

function translateVideoType(type: string): string {
  const translations: Record<string, string> = {
    'project_tour': 'Projecttour',
    'area_tour': 'Omgevingstour',
    'showhouse': 'Showhouse',
    'construction_update': 'Bouwupdate',
    'drone': 'Drone',
    'interview': 'Interview',
    'other': 'Video',
  };
  return translations[type] || type || 'Video';
}
