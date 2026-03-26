import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PostRequest {
  projectId: string;
  platform: "linkedin" | "facebook" | "instagram";
  landingPageUrl?: string;
  model?: string;
  // Storytelling input fields (all optional)
  whyInteresting?: string;
  honestFlaw?: string;
  myOpinion?: string;
  usp?: string;
}

const VALID_MODELS = [
  "google/gemini-2.5-flash",
  "google/gemini-2.5-pro",
  "google/gemini-3-pro-preview",
  "openai/gpt-5",
  "openai/gpt-5-mini",
  "openai/gpt-5-nano",
];

const DEFAULT_MODEL = "google/gemini-2.5-flash";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { projectId, platform, landingPageUrl, model: requestedModel, whyInteresting, honestFlaw, myOpinion, usp } = await req.json() as PostRequest;
    
    // Validate and set model
    const selectedModel = requestedModel && VALID_MODELS.includes(requestedModel) 
      ? requestedModel 
      : DEFAULT_MODEL;
    
    console.log(`Using AI model: ${selectedModel} (requested: ${requestedModel || 'default'})`);
    console.log(`Generating ${platform} post for project ${projectId}`);

    // Fetch project data
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      throw new Error(`Project not found: ${projectError?.message}`);
    }

    // Fetch properties for this project
    const { data: properties } = await supabase
      .from("properties")
      .select("*")
      .eq("project_id", projectId)
      .limit(5);

    // Fetch rental data from correct table
    const { data: rentalCache } = await supabase
      .from("rental_comparables_cache")
      .select("comparables")
      .eq("project_id", projectId)
      .limit(1);

    // Calculate key metrics from comparables data
    const avgPrice = project.price_from || 0;
    let avgDailyRate = 0;
    let occupancy = 0;
    let annualRevenue = 0;
    let hasRealData = false;

    if (rentalCache && rentalCache.length > 0 && rentalCache[0].comparables) {
      const comparables = rentalCache[0].comparables as any[];
      if (comparables.length > 0) {
        hasRealData = true;
        
        const totals = comparables.reduce((acc, comp) => ({
          dailyRate: acc.dailyRate + (comp.pricing?.avg_nightly_rate || comp.avg_daily_rate || 0),
          occupancy: acc.occupancy + (comp.occupancy?.rate || comp.occupancy_rate || 0),
          revenue: acc.revenue + (comp.revenue?.annual || comp.annual_revenue || 0),
        }), { dailyRate: 0, occupancy: 0, revenue: 0 });
        
        avgDailyRate = totals.dailyRate / comparables.length;
        occupancy = totals.occupancy / comparables.length;
        annualRevenue = totals.revenue / comparables.length;
      }
    }

    // Calculate net yield (rental income after costs)
    const netRentalYield = avgPrice > 0 && annualRevenue > 0 
      ? ((annualRevenue * 0.65) / avgPrice) * 100 
      : 4.0;
    
    // Average annual appreciation rate for Costa Cálida/Murcia region
    const appreciationRate = 5.0;
    
    // Total annual yield = net rental yield + appreciation
    const totalAnnualYield = netRentalYield + appreciationRate;
    
    // Keep netYield for backwards compatibility
    const netYield = netRentalYield;

    // Get property features
    const features: string[] = [];
    if (properties?.length) {
      const prop = properties[0];
      if (prop.bedrooms) features.push(`${prop.bedrooms} slaapkamers`);
      if (prop.bathrooms) features.push(`${prop.bathrooms} badkamers`);
      if (prop.has_pool) features.push("zwembad");
      if (prop.has_terrace) features.push("terras");
      if (prop.has_parking) features.push("parking");
      if (prop.has_storage) features.push("berging");
    }

    const platformInstructions = {
      linkedin: `LINKEDIN STIJL:
- Professionele, zakelijke toon
- Data-gedreven maar menselijk
- Gebruik enters voor leesbaarheid (korte paragrafen)
- Gebruik GEEN hashtags
- Maximaal 1300 tekens voor optimale engagement
- Begin NIET met "Ik" of een vraag aan de lezer`,
      facebook: `FACEBOOK STIJL:
- Persoonlijker en warmer
- Storytelling mag uitgebreider
- Emoji's toegestaan (max 3-4)
- Vraag om reacties of tag een vriend
- Hashtags optioneel (max 3)`,
      instagram: `INSTAGRAM STIJL:
- Kort en puntig (onder 300 tekens voor de caption)
- Visueel beschrijvend (beschrijf wat ze op de foto zien)
- Emoji's toegestaan
- Hashtags apart (10-15 relevante)
- CTA naar bio/link`,
    };

    // Fetch custom prompt from database
    const { data: promptData } = await supabase
      .from("ai_prompts")
      .select("prompt_text")
      .eq("prompt_key", "social_post_generator")
      .single();

    // Build the final prompt by replacing placeholders
    const finalLandingUrl = landingPageUrl || `https://topimmospain.com/lp/project/${projectId}`;
    
    let systemPrompt: string;
    
    if (promptData?.prompt_text) {
      // Use custom prompt from database with placeholder replacement
      systemPrompt = promptData.prompt_text
        .replace(/\{\{platform\}\}/g, platform)
        .replace(/\{\{platformInstructions\}\}/g, platformInstructions[platform])
        .replace(/\{\{projectName\}\}/g, project.name)
        .replace(/\{\{city\}\}/g, project.city || "")
        .replace(/\{\{region\}\}/g, project.region || "")
        .replace(/\{\{priceFrom\}\}/g, avgPrice.toLocaleString("nl-NL"))
        .replace(/\{\{features\}\}/g, features.length > 0 ? features.join(", ") : "Moderne afwerking")
        .replace(/\{\{netYield\}\}/g, netYield > 0 ? netYield.toFixed(1) : "4-6")
        .replace(/\{\{totalAnnualYield\}\}/g, totalAnnualYield.toFixed(1))
        .replace(/\{\{avgDailyRate\}\}/g, avgDailyRate > 0 ? Math.round(avgDailyRate).toString() : "120-150")
        .replace(/\{\{occupancy\}\}/g, occupancy > 0 ? Math.round(occupancy).toString() : "60-70")
        .replace(/\{\{annualRevenue\}\}/g, annualRevenue > 0 ? Math.round(annualRevenue).toLocaleString("nl-NL") : "15.000-25.000")
        .replace(/\{\{landingPageUrl\}\}/g, finalLandingUrl)
        .replace(/\{\{projectDescription\}\}/g, project.description ? project.description.substring(0, 500) : "Geen beschrijving beschikbaar")
        .replace(/\{\{whyInteresting\}\}/g, whyInteresting || "Niet ingevuld")
        .replace(/\{\{honestFlaw\}\}/g, honestFlaw || "Niet ingevuld")
        .replace(/\{\{myOpinion\}\}/g, myOpinion || "Niet ingevuld")
        .replace(/\{\{USP\}\}/g, usp || "Niet ingevuld");
        
      console.log("Using custom prompt from database");
    } else {
      // Fallback to hardcoded prompt
      console.log("Using fallback prompt (no custom prompt found)");
      systemPrompt = `Je bent een expert social media copywriter gespecialiseerd in vastgoedinvesteringen in Spanje.
Je schrijft voor Top Immo Spain, een bedrijf dat Nederlandstalige investeerders begeleidt bij het kopen van vakantievastgoed in Spanje.

SCHRIJFSTIJL - DE INSPECTEUR:
- Wees eerlijk en transparant (noem ook minpunten)
- Geef je persoonlijke mening waar relevant
- Focus op de unieke kenmerken
- Creëer intriges door een verhaal te vertellen, niet door te verkopen

VERHALENDE INPUT (gebruik deze in je post als ze ingevuld zijn):
- Waarom nu interessant: ${whyInteresting || "Niet ingevuld"}
- Eerlijk minpunt: ${honestFlaw || "Niet ingevuld"}
- Mijn persoonlijke mening: ${myOpinion || "Niet ingevuld"}
- Unieke selling point: ${usp || "Niet ingevuld"}

CONVERSATIEGERICHTE COPYWRITING:
- Eindig met een vraag of call-to-action die reactie uitlokt
- Gebruik "Reageer [WOORD]" of stel een vraag
- Trigger engagement

${platformInstructions[platform]}

BELANGRIJK:
- Schrijf in het Nederlands
- Vermijd clichés als "Wat als ik je vertelde..." of "Stel je voor..."
- Wees specifiek, niet generiek
- Gebruik echte cijfers uit de data die je krijgt
- Schrijf 2 variaties van de post
- Voeg aan het einde van elke post een suggestie toe voor een trigger-woord

OUTPUT FORMAT:
Geef je antwoord als JSON met deze structuur:
{
  "variation1": {
    "content": "De volledige post tekst...",
    "triggerWord": "BEREKENING"
  },
  "variation2": {
    "content": "De volledige post tekst...",
    "triggerWord": "ANALYSE"
  }
}`;
    }

    // Build storytelling context
    const storytellingContext = [];
    if (whyInteresting) storytellingContext.push(`Waarom nu interessant: ${whyInteresting}`);
    if (honestFlaw) storytellingContext.push(`Eerlijk minpunt: ${honestFlaw}`);
    if (myOpinion) storytellingContext.push(`Mijn mening: ${myOpinion}`);
    if (usp) storytellingContext.push(`USP: ${usp}`);

    const userPrompt = `Schrijf 2 ${platform} posts over dit project:

PROJECT INFORMATIE:
- Naam: ${project.name}
- Locatie: ${project.city}, ${project.region}
- Land: Spanje
- Prijs vanaf: €${avgPrice.toLocaleString("nl-NL")}
- Type: ${project.property_types?.join(", ") || "Appartementen"}

FEATURES:
${features.length > 0 ? features.join(", ") : "Moderne afwerking, nabij strand en voorzieningen"}

VERHUURDATA (${hasRealData ? "Airbnb marktdata" : "Geschatte waarden"}):
- Gemiddelde nachtprijs: €${avgDailyRate > 0 ? Math.round(avgDailyRate) : "120-150"}
- Bezettingsgraad: ${occupancy > 0 ? Math.round(occupancy) + "%" : "60-70%"}
- Netto huurrendement: ${netYield > 0 ? netYield.toFixed(1) + "%" : "4-6%"}
- Gemiddeld jaarlijks rendement: ${totalAnnualYield.toFixed(1)}% (huur + waardestijging)
- Geschat jaarinkomen: €${annualRevenue > 0 ? Math.round(annualRevenue).toLocaleString("nl-NL") : "15.000-25.000"}

PROJECTBESCHRIJVING:
${project.description ? project.description.substring(0, 500) : "Geen beschrijving beschikbaar"}
${storytellingContext.length > 0 ? `\nVERHALENDE INPUT (gebruik deze in je post):\n${storytellingContext.join("\n")}` : ""}

BESCHIKBAARHEID:
- Beschikbare woningen: ${properties?.length || "meerdere"} woningen beschikbaar

LANDINGSPAGINA:
${finalLandingUrl}

PLATFORM: ${platform}

Genereer nu 2 variaties van de post volgens de formule.`;

    console.log("Calling Lovable AI Gateway...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit bereikt, probeer het later opnieuw." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Geen credits beschikbaar, voeg credits toe aan je workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content received from AI");
    }

    console.log("AI response received, parsing...");

    // Parse the JSON from the AI response
    let parsedContent;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
      parsedContent = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", content);
      // Return raw content as fallback
      parsedContent = {
        variation1: {
          content: content,
          triggerWord: "INFO",
        },
        variation2: {
          content: "Variatie niet beschikbaar - probeer opnieuw",
          triggerWord: "INFO",
        },
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        modelUsed: selectedModel,
        project: {
          name: project.name,
          city: project.city,
          region: project.region,
          priceFrom: avgPrice,
          avgDailyRate: Math.round(avgDailyRate),
          occupancy: Math.round(occupancy),
          netYield,
          totalAnnualYield,
          annualRevenue: Math.round(annualRevenue),
          features,
          landingPageUrl: finalLandingUrl,
          hasRealData,
          dataSource: hasRealData ? "Airbnb marktdata" : "Geschatte waarden",
          featuredImage: project.featured_image || null,
        },
        posts: parsedContent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating social post:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
