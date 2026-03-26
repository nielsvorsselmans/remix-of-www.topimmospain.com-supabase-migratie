import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DATAFORSEO_API = "https://api.dataforseo.com/v3";

interface KeywordData {
  keyword: string;
  search_volume: number | null;
  cpc: number | null;
  competition: number | null;
  competition_level: string | null;
}

interface RelatedQuestion {
  question: string;
  answer: string;
}

async function callDataForSEO(endpoint: string, body: any[]): Promise<any> {
  const login = Deno.env.get("DATAFORSEO_LOGIN");
  const password = Deno.env.get("DATAFORSEO_PASSWORD");

  if (!login || !password) {
    throw new Error("DATAFORSEO credentials not configured");
  }

  const credentials = btoa(`${login}:${password}`);

  const response = await fetch(`${DATAFORSEO_API}${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`DataForSEO error [${response.status}]:`, errorText.substring(0, 300));
    throw new Error(`DataForSEO API error: ${response.status}`);
  }

  return await response.json();
}

async function getKeywordData(keywords: string[], languageCode: string, locationCode: number): Promise<KeywordData[]> {
  try {
    const result = await callDataForSEO("/keywords_data/google_ads/search_volume/live", [{
      keywords,
      language_code: languageCode,
      location_code: locationCode,
    }]);

    const items = result?.tasks?.[0]?.result || [];
    return items.map((item: any) => ({
      keyword: item.keyword || "",
      search_volume: item.search_volume ?? null,
      cpc: item.cpc ?? null,
      competition: item.competition ?? null,
      competition_level: item.competition_level ?? null,
    }));
  } catch (e) {
    console.error("Keyword data fetch failed:", e);
    return [];
  }
}

async function getRelatedQuestions(keyword: string, languageCode: string, locationCode: number): Promise<RelatedQuestion[]> {
  try {
    const result = await callDataForSEO("/serp/google/organic/live/regular", [{
      keyword,
      language_code: languageCode,
      location_code: locationCode,
      depth: 10,
    }]);

    const items = result?.tasks?.[0]?.result?.[0]?.items || [];
    
    // Extract "People Also Ask" questions
    const paaItems = items.filter((item: any) => item.type === "people_also_ask");
    const questions: RelatedQuestion[] = [];
    
    for (const paa of paaItems) {
      if (paa.items) {
        for (const q of paa.items) {
          if (q.title && q.description) {
            questions.push({
              question: q.title,
              answer: q.description,
            });
          }
        }
      }
    }

    return questions.slice(0, 5);
  } catch (e) {
    console.error("Related questions fetch failed:", e);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth check
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { error: authError } = await authClient.auth.getClaims(authHeader.replace("Bearer ", ""));
  if (authError) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { projectId, forceRefresh = false } = await req.json();

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: "projectId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, name, city, region, property_types, seo_data")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return new Response(
        JSON.stringify({ error: "Project niet gevonden" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return cached data if exists and not forcing refresh
    if (project.seo_data && !forceRefresh) {
      console.log(`[EnrichSEO] Returning cached SEO data for ${project.name}`);
      return new Response(
        JSON.stringify({ seo_data: project.seo_data, cached: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const city = project.city || "Spanje";
    const propertyTypes = (project.property_types as string[]) || [];
    const typeLabel = propertyTypes.length > 0 ? propertyTypes[0].toLowerCase() : "woning";

    // Generate target keywords
    const targetKeywords = [
      `${typeLabel} kopen ${city}`,
      `nieuwbouw ${city}`,
      `investeren vastgoed ${city}`,
      `huis kopen ${city} spanje`,
      `${city} costa calida`,
    ];

    console.log(`[EnrichSEO] Fetching SEO data for: ${targetKeywords.join(", ")}`);

    // Fetch keyword data and related questions in parallel
    const [keywordResults, relatedQuestions] = await Promise.all([
      getKeywordData(targetKeywords, "nl", 2528),
      getRelatedQuestions(`${typeLabel} kopen ${city} spanje`, "nl", 2528),
    ]);

    // Find the best keyword (highest search volume)
    const bestKeyword = keywordResults
      .filter(k => k.search_volume !== null)
      .sort((a, b) => (b.search_volume || 0) - (a.search_volume || 0))[0];

    const seoData = {
      target_keywords: keywordResults,
      primary_keyword: bestKeyword?.keyword || targetKeywords[0],
      primary_search_volume: bestKeyword?.search_volume || null,
      related_questions: relatedQuestions,
      enriched_at: new Date().toISOString(),
    };

    // Save to database
    const { error: updateError } = await supabase
      .from("projects")
      .update({ seo_data: seoData })
      .eq("id", projectId);

    if (updateError) {
      console.error("[EnrichSEO] Failed to save SEO data:", updateError);
    }

    console.log(
      `[EnrichSEO] Complete: primary="${seoData.primary_keyword}" vol=${seoData.primary_search_volume}, ${relatedQuestions.length} questions`
    );

    return new Response(
      JSON.stringify({ seo_data: seoData, cached: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[EnrichSEO] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
