const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const PROPERTY_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    title_citation: { type: 'string', description: 'Source URL for title' },
    price: { type: 'number' },
    price_citation: { type: 'string' },
    currency: { type: 'string' },
    currency_citation: { type: 'string', description: 'Source URL for currency' },
    city: { type: 'string' },
    city_citation: { type: 'string', description: 'Source URL for city' },
    region: { type: 'string' },
    region_citation: { type: 'string', description: 'Source URL for region' },
    bedrooms: { type: 'number' },
    bedrooms_citation: { type: 'string' },
    bathrooms: { type: 'number' },
    bathrooms_citation: { type: 'string', description: 'Source URL for bathrooms' },
    area_sqm: { type: 'number' },
    area_sqm_citation: { type: 'string' },
    description: { type: 'string' },
    description_citation: { type: 'string' },
    images: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          value: { type: 'string' },
          value_citation: { type: 'string', description: 'Source URL for this value' },
        },
        required: ['value'],
      },
    },
    features: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          value: { type: 'string' },
          value_citation: { type: 'string' },
        },
        required: ['value', 'value_citation'],
      },
    },
    agent_name: { type: 'string' },
    agent_name_citation: { type: 'string' },
    agent_phone: { type: 'string' },
    agent_phone_citation: { type: 'string', description: 'Source URL for agent_phone' },
    agent_email: { type: 'string' },
    agent_email_citation: { type: 'string', description: 'Source URL for agent_email' },
    agent_website: { type: 'string' },
    agent_website_citation: { type: 'string', description: 'Source URL for agent_website' },
    reference_number: { type: 'string' },
    reference_number_citation: { type: 'string', description: 'Source URL for reference_number' },
    construction_year: { type: 'number' },
    construction_year_citation: { type: 'string', description: 'Source URL for construction_year' },
    energy_rating_citation: { type: 'string' },
    floor_level: { type: 'number' },
    floor_level_citation: { type: 'string', description: 'Source URL for floor_level' },
    has_elevator: { type: 'boolean' },
    has_elevator_citation: { type: 'string', description: 'Source URL for has_elevator' },
    has_pool: { type: 'boolean' },
    has_pool_citation: { type: 'string', description: 'Source URL for has_pool' },
    has_garage: { type: 'boolean' },
    has_garage_citation: { type: 'string', description: 'Source URL for has_garage' },
    has_aircon: { type: 'boolean' },
    has_aircon_citation: { type: 'string', description: 'Source URL for has_aircon' },
    published_date: { type: 'string' },
    published_date_citation: { type: 'string', description: 'Source URL for published_date' },
    price_history: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          value: { type: 'string' },
          value_citation: { type: 'string', description: 'Source URL for this value' },
        },
        required: ['value'],
      },
    },
  },
  required: [
    'title', 'price', 'currency', 'city',
    'bedrooms', 'bathrooms', 'description', 'images',
  ],
};

const AGENT_PROMPT = `Extract property details from this real estate listing page.

Required information:
- Title of the listing
- Asking price (number only) and currency
- City
- Number of bedrooms and bathrooms
- Full property description
- All property photo/image URLs

Optional (include if visible on the page, do not search further if not found):
- Region/province
- Built area in square meters
- All listed features and amenities
- Agent/agency name, phone number, email address, and website URL
- Listing reference number
- Construction year, energy rating
- Floor level, elevator, pool, garage, air conditioning
- Date first published, price history

Return what is directly visible on the page. Do NOT spend extra time searching for optional fields.`;

const ENRICHMENT_SCHEMA = {
  type: 'object',
  properties: {
    description: { type: 'string' },
    images: { type: 'array', items: { type: 'object', properties: { value: { type: 'string' } }, required: ['value'] } },
    area_sqm: { type: 'number' },
    features: { type: 'array', items: { type: 'object', properties: { value: { type: 'string' } }, required: ['value'] } },
    construction_year: { type: 'number' },
    agent_name: { type: 'string' },
    agent_phone: { type: 'string' },
    agent_email: { type: 'string' },
  },
  required: ['images'],
};

const ENRICHMENT_PROMPT = `Extract these specific fields from this real estate listing page:

1. description: Full property description text
2. images: All property photo URLs as an array of objects: [{ "value": "https://..." }]
3. area_sqm: Built area in square meters (number)
4. features: Property features/amenities as array of objects: [{ "value": "Swimming pool" }]
5. construction_year: Year built (number)
6. agent_name: Real estate agent or agency name
7. agent_phone: Agent phone number
8. agent_email: Agent email address

Return ONLY what is directly visible on the page. Skip any field that is not clearly present.`;

// Helper: cancel an active Firecrawl agent job
async function cancelAgentJob(jobId: string, apiKey: string) {
  try {
    await fetch(`https://api.firecrawl.dev/v2/agent/${jobId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    console.log(`Cancelled agent job: ${jobId}`);
  } catch (e) {
    console.warn('Failed to cancel job:', e);
  }
}

// Single poll check — does NOT loop. Returns current status.
async function checkAgentStatus(jobId: string, apiKey: string): Promise<any> {
  const res = await fetch(`https://api.firecrawl.dev/v2/agent/${jobId}`, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  });
  const data = await res.json();
  console.log(`Agent job ${jobId} status: ${data.status}`);
  return data;
}

function buildFeaturesObject(extracted: Record<string, any>, featureItems: Array<string | { value: string; value_citation?: string }>) {
  const normalizedItems = featureItems.map(item =>
    typeof item === 'string' ? { value: item } : item
  );
  return {
    items: normalizedItems,
    agent_name: extracted.agent_name || null,
    agent_phone: extracted.agent_phone || null,
    agent_email: extracted.agent_email || null,
    agent_website: extracted.agent_website || null,
    reference_number: extracted.reference_number || null,
    construction_year: typeof extracted.construction_year === 'number' ? extracted.construction_year : null,
    energy_rating_citation: extracted.energy_rating_citation || null,
    floor_level: typeof extracted.floor_level === 'number' ? extracted.floor_level : null,
    has_elevator: typeof extracted.has_elevator === 'boolean' ? extracted.has_elevator : null,
    has_pool: typeof extracted.has_pool === 'boolean' ? extracted.has_pool : null,
    has_garage: typeof extracted.has_garage === 'boolean' ? extracted.has_garage : null,
    has_aircon: typeof extracted.has_aircon === 'boolean' ? extracted.has_aircon : null,
    published_date: extracted.published_date || null,
    price_history: Array.isArray(extracted.price_history) ? extracted.price_history : [],
  };
}

function isCaptchaOrEmpty(extracted: Record<string, any>): boolean {
  const desc = (extracted.description || '').toLowerCase();
  if (desc.includes('captcha-delivery.com') || desc.includes('geo.captcha-delivery.com')) return true;
  if (!extracted.title && !extracted.price && !extracted.bedrooms && !extracted.area_sqm) return true;
  return false;
}

function mergeExtracted(primary: Record<string, any>, secondary: Record<string, any>): Record<string, any> {
  const merged = { ...primary };

  const scalarFields = [
    'title', 'price', 'currency', 'city', 'region',
    'bedrooms', 'bathrooms', 'area_sqm', 'description',
  ];
  for (const field of scalarFields) {
    if ((merged[field] === null || merged[field] === undefined) && secondary[field] != null) {
      merged[field] = secondary[field];
    }
  }

  const featureFields = [
    'agent_name', 'agent_phone', 'agent_email', 'agent_website',
    'reference_number', 'construction_year', 'energy_rating_citation',
    'floor_level', 'has_elevator', 'has_pool', 'has_garage', 'has_aircon',
    'published_date',
  ];
  if (merged.features && secondary) {
    for (const field of featureFields) {
      if ((merged.features[field] === null || merged.features[field] === undefined) && secondary[field] != null) {
        merged.features[field] = secondary[field];
      }
    }
  }

  if (Array.isArray(secondary.images) && secondary.images.length > 0) {
    const existingUrls = new Set((merged.images || []).map((u: string) => u));
    const newImages = secondary.images.filter((img: string) => !existingUrls.has(img));
    merged.images = [...(merged.images || []), ...newImages].slice(0, 30);
  }

  if (merged.features?.items && Array.isArray(secondary.features)) {
    const existingValues = new Set(merged.features.items.map((i: any) => i.value?.toLowerCase()));
    const secondaryItems = secondary.features
      .map((item: any) => typeof item === 'string' ? { value: item } : item)
      .filter((item: any) => !existingValues.has(item.value?.toLowerCase()));
    merged.features.items = [...merged.features.items, ...secondaryItems].slice(0, 30);
  }

  if (merged.features && Array.isArray(secondary.price_history) && secondary.price_history.length > 0) {
    const existing = merged.features.price_history || [];
    if (existing.length === 0) {
      merged.features.price_history = secondary.price_history;
    }
  }

  return merged;
}

// Enrichment: fire-and-forget background task (non-blocking)
// Returns the job ID so frontend can optionally poll later
async function startEnrichmentAsync(agentWebsite: string, apiKey: string): Promise<string | null> {
  try {
    let enrichUrl = agentWebsite.trim();
    if (!enrichUrl.startsWith('http')) enrichUrl = `https://${enrichUrl}`;

    console.log('Starting enrichment scrape (async) for:', enrichUrl);

    const res = await fetch('https://api.firecrawl.dev/v2/agent', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: ENRICHMENT_PROMPT,
        urls: [enrichUrl],
        schema: ENRICHMENT_SCHEMA,
        model: 'spark-1-mini',
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.warn('Enrichment agent start failed:', data);
      return null;
    }

    const jobId = data.id || data.jobId;
    console.log('Enrichment job started (fire-and-forget):', jobId);
    return jobId || null;
  } catch (err) {
    console.warn('Enrichment start failed (non-blocking):', err instanceof Error ? err.message : err);
    return null;
  }
}

// Quick enrichment poll: try once, return data if ready, null otherwise
async function quickEnrichmentPoll(jobId: string, apiKey: string): Promise<Record<string, any> | null> {
  try {
    const status = await checkAgentStatus(jobId, apiKey);
    if (status.status === 'completed') {
      const extracted = status.data?.json || status.data?.output || status.output || status.data || {};
      if (isCaptchaOrEmpty(extracted)) {
        console.warn('Enrichment returned CAPTCHA or empty data, skipping');
        await cancelAgentJob(jobId, apiKey);
        return null;
      }
      const images = Array.isArray(extracted.images)
        ? extracted.images.map((img: any) => typeof img === 'string' ? img : img.value).filter(Boolean)
        : [];
      console.log('Enrichment ready, found', images.length, 'images');
      return { ...extracted, images };
    }
    if (status.status === 'failed' || status.status === 'cancelled') {
      console.warn('Enrichment job failed/cancelled');
      return null;
    }
    // Still running
    return null;
  } catch (err) {
    console.warn('Enrichment poll failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

// Upload a single image to storage
async function uploadSingleImage(
  imageUrl: string,
  listingId: string,
  index: number,
  supabaseUrl: string,
  serviceKey: string
): Promise<string> {
  const response = await fetch(imageUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    console.warn(`Image download failed for ${imageUrl}: ${response.status}`);
    return imageUrl;
  }

  const contentType = response.headers.get('content-type') || 'image/jpeg';
  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
  const filePath = `${listingId}/${index}.${ext}`;
  const blob = await response.arrayBuffer();

  const uploadRes = await fetch(
    `${supabaseUrl}/storage/v1/object/external-listing-images/${filePath}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': contentType,
        'x-upsert': 'true',
      },
      body: blob,
    }
  );

  if (uploadRes.ok) {
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/external-listing-images/${filePath}`;
    console.log(`Image ${index} uploaded successfully`);
    return publicUrl;
  } else {
    console.warn(`Image upload failed for ${index}: ${uploadRes.status}`);
    return imageUrl;
  }
}

// Parallel image upload with batching (5 at a time)
async function uploadImagesToStorage(images: string[]): Promise<string[]> {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || images.length === 0) return images;

  const BATCH_SIZE = 5;
  const maxImages = Math.min(images.length, 15);
  const imagesToProcess = images.slice(0, maxImages);
  const results: string[] = [];
  const listingId = crypto.randomUUID();

  for (let i = 0; i < imagesToProcess.length; i += BATCH_SIZE) {
    const batch = imagesToProcess.slice(i, i + BATCH_SIZE);
    const settled = await Promise.allSettled(
      batch.map((url, batchIdx) =>
        uploadSingleImage(url, listingId, i + batchIdx, SUPABASE_URL, SUPABASE_SERVICE_KEY)
      )
    );
    for (let j = 0; j < settled.length; j++) {
      const result = settled[j];
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        console.warn(`Image ${i + j} failed:`, result.reason);
        results.push(batch[j]); // fallback to original URL
      }
    }
  }

  // Append remaining images beyond the limit
  for (let i = maxImages; i < images.length; i++) {
    results.push(images[i]);
  }

  return results;
}

// Parse extracted agent result into our standard format
function parseExtracted(extracted: Record<string, any>, formattedUrl: string, platform: string, rawResult: any) {
  const featureItems: Array<string | { value: string; value_citation?: string }> = Array.isArray(extracted.features) ? extracted.features.slice(0, 30) : [];

  return {
    title: extracted.title || null,
    price: typeof extracted.price === 'number' ? extracted.price : null,
    currency: extracted.currency || 'EUR',
    city: extracted.city || null,
    region: extracted.region || null,
    bedrooms: typeof extracted.bedrooms === 'number' ? extracted.bedrooms : null,
    bathrooms: typeof extracted.bathrooms === 'number' ? extracted.bathrooms : null,
    area_sqm: typeof extracted.area_sqm === 'number' ? extracted.area_sqm : null,
    description: extracted.description || null,
    images: Array.isArray(extracted.images)
      ? extracted.images.map((img: any) => typeof img === 'string' ? img : img.value).filter(Boolean).slice(0, 30)
      : [],
    features: buildFeaturesObject(extracted, featureItems),
    source_url: formattedUrl,
    source_platform: platform,
  };
}

// ========== TWO-PHASE HANDLER ==========

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { url, jobId, enrichmentJobId } = body;

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY') || Deno.env.get('FIRECRAWL_API_KEY_1');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl is niet geconfigureerd' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== MODE 3: ENRICHMENT POLL ==========
    if (enrichmentJobId) {
      console.log('Enrichment poll for job:', enrichmentJobId);
      const enriched = await quickEnrichmentPoll(enrichmentJobId, apiKey);
      if (enriched) {
        return new Response(
          JSON.stringify({ success: true, status: 'enrichment_completed', data: enriched }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      // Still running or failed
      return new Response(
        JSON.stringify({ success: true, status: 'enrichment_polling' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== MODE 2: POLL ==========
    if (jobId) {
      console.log('Poll mode for job:', jobId);
      const status = await checkAgentStatus(jobId, apiKey);

      if (status.status === 'completed') {
        const extracted = status.data?.json || status.data?.output || status.output || status.data || {};

        const formattedUrl = body.sourceUrl || '';
        let platform = 'idealista';
        if (/fotocasa/i.test(formattedUrl)) platform = 'fotocasa';
        else if (/kyero/i.test(formattedUrl)) platform = 'kyero';

        let parsed = parseExtracted(extracted, formattedUrl, platform, status);

        console.log('Agent extraction successful:', JSON.stringify({ title: parsed.title, price: parsed.price }));

        // CAPTCHA check
        if (isCaptchaOrEmpty(parsed)) {
          console.warn('CAPTCHA or empty data detected, cancelling job');
          await cancelAgentJob(jobId, apiKey);
          return new Response(
            JSON.stringify({
              success: false,
              error: "Idealista blokkeert het automatisch ophalen van deze pagina.",
              code: 'CAPTCHA_BLOCKED',
            }),
            { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Start enrichment as fire-and-forget (non-blocking)
        let enrichmentId: string | null = null;
        let method = 'agent';
        const agentWebsite = extracted.agent_website || parsed.features?.agent_website;
        if (agentWebsite && typeof agentWebsite === 'string' && agentWebsite.length > 5) {
          console.log('Agent website found, starting async enrichment:', agentWebsite);
          enrichmentId = await startEnrichmentAsync(agentWebsite, apiKey);
          if (enrichmentId) {
            method = 'agent+enrichment_started';
          }
        }

        // Upload images in parallel batches
        if (parsed.images && parsed.images.length > 0) {
          console.log(`Uploading ${Math.min(parsed.images.length, 15)} images to storage (parallel)...`);
          parsed.images = await uploadImagesToStorage(parsed.images);
        }

        return new Response(
          JSON.stringify({
            success: true,
            status: 'completed',
            method,
            enrichmentJobId: enrichmentId,
            data: { ...parsed, raw_scraped_data: status },
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (status.status === 'failed' || status.status === 'cancelled') {
        const errMsg = status.error || `Agent job ${status.status}`;
        return new Response(
          JSON.stringify({
            success: false,
            status: status.status,
            error: errMsg,
            code: status.status === 'cancelled' ? 'CANCELLED' : 'AGENT_FAILED',
          }),
          { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Still running
      return new Response(
        JSON.stringify({ success: true, status: 'polling', jobId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== MODE 1: START ==========
    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is verplicht' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http')) formattedUrl = `https://${formattedUrl}`;

    console.log('Start mode: launching agent for:', formattedUrl);

    const agentRes = await fetch('https://api.firecrawl.dev/v2/agent', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: AGENT_PROMPT,
        urls: [formattedUrl],
        schema: PROPERTY_SCHEMA,
        model: 'spark-1-mini',
      }),
    });

    const agentData = await agentRes.json();

    if (!agentRes.ok) {
      console.error('Agent start failed:', agentData);
      return new Response(
        JSON.stringify({
          success: false,
          error: agentData.error || `Agent request failed (${agentRes.status})`,
          code: 'AGENT_FAILED',
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newJobId = agentData.id || agentData.jobId;
    if (!newJobId) {
      return new Response(
        JSON.stringify({ success: false, error: 'No job ID returned from agent', code: 'AGENT_FAILED' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Agent job started:', newJobId);

    return new Response(
      JSON.stringify({
        success: true,
        status: 'started',
        jobId: newJobId,
        sourceUrl: formattedUrl,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Scrape error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Onbekende fout' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
