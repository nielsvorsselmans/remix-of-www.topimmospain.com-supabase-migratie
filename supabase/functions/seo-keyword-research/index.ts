import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DATAFORSEO_API = 'https://api.dataforseo.com/v3';

interface SeoRequest {
  keyword: string;
  language_code?: string; // default: nl
  location_code?: number; // default: 2528 (Netherlands)
  include_serp?: boolean; // default: true
}

interface KeywordData {
  keyword: string;
  search_volume: number | null;
  cpc: number | null;
  competition: number | null;
  competition_level: string | null;
}

interface SerpResult {
  position: number;
  title: string;
  url: string;
  snippet: string;
}

interface SeoResearchResult {
  keyword_data: KeywordData;
  related_keywords: KeywordData[];
  serp_results: SerpResult[];
  timestamp: string;
}

async function callDataForSEO(endpoint: string, body: any[]): Promise<any> {
  const login = Deno.env.get('DATAFORSEO_LOGIN');
  const password = Deno.env.get('DATAFORSEO_PASSWORD');
  
  if (!login || !password) {
    throw new Error('DATAFORSEO credentials not configured');
  }

  const credentials = btoa(`${login}:${password}`);
  
  const response = await fetch(`${DATAFORSEO_API}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`DataForSEO error [${response.status}]:`, errorText);
    throw new Error(`DataForSEO API error: ${response.status}`);
  }

  return await response.json();
}

async function getKeywordOverview(keyword: string, languageCode: string, locationCode: number): Promise<KeywordData> {
  try {
    const result = await callDataForSEO('/keywords_data/google_ads/search_volume/live', [{
      keywords: [keyword],
      language_code: languageCode,
      location_code: locationCode,
    }]);

    const item = result?.tasks?.[0]?.result?.[0];
    if (!item) {
      return { keyword, search_volume: null, cpc: null, competition: null, competition_level: null };
    }

    return {
      keyword: item.keyword || keyword,
      search_volume: item.search_volume ?? null,
      cpc: item.cpc ?? null,
      competition: item.competition ?? null,
      competition_level: item.competition_level ?? null,
    };
  } catch (e) {
    console.error('Keyword overview failed:', e);
    return { keyword, search_volume: null, cpc: null, competition: null, competition_level: null };
  }
}

async function getKeywordSuggestions(keyword: string, languageCode: string, locationCode: number): Promise<KeywordData[]> {
  try {
    const result = await callDataForSEO('/keywords_data/google_ads/keywords_for_keywords/live', [{
      keywords: [keyword],
      language_code: languageCode,
      location_code: locationCode,
      sort_by: "search_volume",
      limit: 10,
    }]);

    const items = result?.tasks?.[0]?.result || [];
    return items.slice(0, 10).map((item: any) => ({
      keyword: item.keyword || '',
      search_volume: item.search_volume ?? null,
      cpc: item.cpc ?? null,
      competition: item.competition ?? null,
      competition_level: item.competition_level ?? null,
    }));
  } catch (e) {
    console.error('Keyword suggestions failed:', e);
    return [];
  }
}

async function getSerpResults(keyword: string, languageCode: string, locationCode: number): Promise<SerpResult[]> {
  try {
    const result = await callDataForSEO('/serp/google/organic/live/regular', [{
      keyword,
      language_code: languageCode,
      location_code: locationCode,
      depth: 10,
    }]);

    const items = result?.tasks?.[0]?.result?.[0]?.items || [];
    return items
      .filter((item: any) => item.type === 'organic')
      .slice(0, 5)
      .map((item: any, i: number) => ({
        position: item.rank_absolute || i + 1,
        title: item.title || '',
        url: item.url || '',
        snippet: item.description || '',
      }));
  } catch (e) {
    console.error('SERP results failed:', e);
    return [];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { keyword, language_code = 'nl', location_code = 2528, include_serp = true } = await req.json() as SeoRequest;

    if (!keyword || keyword.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: 'Keyword is required (min 2 characters)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`SEO research for: "${keyword}" (${language_code}, ${location_code})`);

    // Run all 3 API calls in parallel
    const [keywordData, relatedKeywords, serpResults] = await Promise.all([
      getKeywordOverview(keyword.trim(), language_code, location_code),
      getKeywordSuggestions(keyword.trim(), language_code, location_code),
      include_serp ? getSerpResults(keyword.trim(), language_code, location_code) : Promise.resolve([]),
    ]);

    const result: SeoResearchResult = {
      keyword_data: keywordData,
      related_keywords: relatedKeywords,
      serp_results: serpResults,
      timestamp: new Date().toISOString(),
    };

    console.log(`SEO research complete: vol=${keywordData.search_volume}, ${relatedKeywords.length} related, ${serpResults.length} SERP`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('SEO keyword research error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
