import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ─── YouTube URL parsing ───

function extractVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace("www.", "").replace("m.", "");
    if (hostname === "youtube.com" && parsed.searchParams.has("v")) return parsed.searchParams.get("v");
    if (hostname === "youtube.com") {
      const match = parsed.pathname.match(/^\/(shorts|embed)\/([a-zA-Z0-9_-]{11})/);
      if (match) return match[2];
    }
    if (hostname === "youtu.be") {
      const id = parsed.pathname.slice(1).split("/")[0];
      if (id?.match(/^[a-zA-Z0-9_-]{11}$/)) return id;
    }
  } catch {
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  }
  return null;
}

// ─── SRT parser ───

function parseSrtToPlainText(srt: string): string {
  return srt
    .replace(/\r\n/g, '\n')
    .split('\n\n')
    .map(block => {
      const lines = block.trim().split('\n');
      // Skip index line and timestamp line, keep text lines
      return lines.filter(line =>
        !line.match(/^\d+$/) &&
        !line.match(/^\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->/)
      ).join(' ');
    })
    .filter(text => text.trim().length > 0)
    .join(' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanTranscriptText(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
    .replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
}

// ─── OAuth: refresh access token ───

async function refreshAccessToken(): Promise<string | null> {
  const clientId = Deno.env.get("YOUTUBE_CLIENT_ID");
  const clientSecret = Deno.env.get("YOUTUBE_CLIENT_SECRET");
  const refreshToken = Deno.env.get("YOUTUBE_REFRESH_TOKEN");

  if (!clientId || !clientSecret || !refreshToken) {
    console.error('[OAuth] Missing credentials:', {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      hasRefreshToken: !!refreshToken,
    });
    return null;
  }

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    const data = await response.json();
    if (data.error) {
      console.error('[OAuth] Token refresh failed:', data.error, data.error_description);
      return null;
    }

    console.log('[OAuth] Access token refreshed successfully');
    return data.access_token;
  } catch (e) {
    console.error('[OAuth] Token refresh error:', e);
    return null;
  }
}

// ─── Official YouTube Data API v3 ───

interface CaptionTrack {
  id: string;
  language: string;
  trackKind: string;
  status: string;
  isDraft: boolean;
  name: string;
}

async function fetchViaOfficialAPI(videoId: string, accessToken: string): Promise<string | null> {
  // Step 1: List caption tracks
  console.log('[API] Fetching captions.list for video:', videoId);
  const listUrl = `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}`;

  const listResponse = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!listResponse.ok) {
    const err = await listResponse.text();
    console.error('[API] captions.list failed:', listResponse.status, err);
    return null;
  }

  const listData = await listResponse.json();
  const items = listData.items || [];

  if (items.length === 0) {
    console.log('[API] captions.list returned 0 items — no captions available');
    return null;
  }

  // Step 2: Map and log all tracks
  const tracks: CaptionTrack[] = items.map((item: any) => ({
    id: item.id,
    language: item.snippet?.language || 'unknown',
    trackKind: item.snippet?.trackKind || 'standard',
    status: item.snippet?.status || 'unknown',
    isDraft: item.snippet?.isDraft ?? false,
    name: item.snippet?.name || '',
  }));

  console.log(`[API] Found ${tracks.length} caption tracks:`);
  for (const t of tracks) {
    console.log(`  - id=${t.id} lang=${t.language} kind=${t.trackKind} status=${t.status} isDraft=${t.isDraft} name="${t.name}"`);
  }

  // Step 3: Filter — only serving, non-draft
  const usable = tracks.filter(t => t.status === 'serving' && !t.isDraft);
  if (usable.length === 0) {
    console.log('[API] No serving/non-draft captions found');
    return null;
  }

  // Step 4: Sort — nl manual > nl ASR > en manual > en ASR > rest
  const sorted = [...usable].sort((a, b) => {
    const score = (t: CaptionTrack) => {
      let s = 0;
      if (t.language === 'nl') s += 20;
      else if (t.language === 'en') s += 10;
      if (t.trackKind !== 'ASR') s += 5; // manual preferred over ASR within same language
      return s;
    };
    return score(b) - score(a);
  });

  console.log(`[API] Sorted usable tracks (${sorted.length}):`, sorted.map(t => `${t.language}/${t.trackKind}`));

  // Step 5: Download best track
  for (const track of sorted) {
    try {
      console.log(`[API] Downloading caption track: ${track.id} (${track.language}/${track.trackKind})`);
      const downloadUrl = `https://www.googleapis.com/youtube/v3/captions/${track.id}?tfmt=srt`;

      const dlResponse = await fetch(downloadUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!dlResponse.ok) {
        const errText = await dlResponse.text();
        console.error(`[API] captions.download failed for ${track.id}:`, dlResponse.status, errText);
        continue;
      }

      const srtText = await dlResponse.text();
      console.log(`[API] Downloaded SRT: ${srtText.length} chars`);

      const plainText = parseSrtToPlainText(srtText);
      if (plainText.length > 50) {
        console.log(`[API] Successfully parsed transcript (${track.language}/${track.trackKind}): ${plainText.length} chars`);
        return plainText;
      }

      console.log(`[API] Parsed text too short (${plainText.length} chars), trying next track`);
    } catch (e) {
      console.error(`[API] Error downloading track ${track.id}:`, e);
      continue;
    }
  }

  console.log('[API] All caption downloads failed or produced empty text');
  return null;
}

// ─── Fallback: scraping (legacy) ───

async function fetchYouTubePageHtml(videoId: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://www.youtube.com/watch?v=${videoId}&bpctr=9999999999&has_verified=1`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': 'text/html,application/xhtml+xml',
          'Cookie': 'CONSENT=YES+cb.20210328-17-p0.en+FX+{hash}; SOCS=CAISNQgDEitib3FfaWRlbnRpdHlmcm9udGVuZHVpc2VydmVyXzIwMjQwMTI5LjAwX3AxGgJlbiADGgYIgOC_pwY',
        },
      }
    );

    if (!response.ok) {
      console.error('[Fallback] YouTube page fetch failed:', response.status);
      await response.text();
      return null;
    }

    const html = await response.text();
    if (html.includes('consent.youtube.com') && !html.includes('ytInitialPlayerResponse')) {
      console.log('[Fallback] Got consent page despite cookies');
      return null;
    }

    console.log(`[Fallback] Fetched page HTML: ${html.length} chars`);
    return html;
  } catch (e) {
    console.error('[Fallback] Error fetching YouTube page:', e);
    return null;
  }
}

function extractCaptionTracks(html: string): any[] {
  const marker = 'ytInitialPlayerResponse';
  const markerIdx = html.indexOf(marker);
  if (markerIdx !== -1) {
    const eqIdx = html.indexOf('=', markerIdx);
    if (eqIdx !== -1) {
      const jsonStart = html.indexOf('{', eqIdx);
      if (jsonStart !== -1) {
        let depth = 0;
        let i = jsonStart;
        for (; i < html.length && i < jsonStart + 2000000; i++) {
          if (html[i] === '{') depth++;
          else if (html[i] === '}') { depth--; if (depth === 0) break; }
        }
        if (depth === 0) {
          try {
            const data = JSON.parse(html.substring(jsonStart, i + 1));
            const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
            if (tracks?.length) return tracks;
          } catch { /* ignore */ }
        }
      }
    }
  }

  const jsonMatch = html.match(/"captionTracks"\s*:\s*(\[[\s\S]*?\]\s*(?=,\s*"))/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[1]); } catch { /* ignore */ }
  }

  return [];
}

async function fetchViaScrapingFallback(videoId: string): Promise<string | null> {
  console.log('[Fallback] Starting scraping fallback...');

  // Try direct timedtext API first
  const attempts = [
    { lang: 'nl', kind: '' },
    { lang: 'nl', kind: 'asr' },
    { lang: 'en', kind: '' },
    { lang: 'en', kind: 'asr' },
  ];

  for (const attempt of attempts) {
    const kindParam = attempt.kind ? `&kind=${attempt.kind}` : '';
    const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${attempt.lang}${kindParam}&fmt=srv3`;
    try {
      const response = await fetch(url);
      if (!response.ok) { await response.text(); continue; }
      const text = await response.text();
      if (text.length < 100 || !text.includes('<text')) continue;
      const cleaned = cleanTranscriptText(text);
      if (cleaned.length > 50) {
        console.log(`[Fallback] Got transcript via timedtext (${attempt.lang}/${attempt.kind || 'manual'}): ${cleaned.length} chars`);
        return cleaned;
      }
    } catch { continue; }
  }

  // Try HTML scraping
  const html = await fetchYouTubePageHtml(videoId);
  if (html) {
    const captionTracks = extractCaptionTracks(html);
    if (captionTracks.length > 0) {
      const sorted = [...captionTracks].sort((a: any, b: any) => {
        const aScore = (a.languageCode === 'nl' ? 20 : a.languageCode === 'en' ? 10 : 0) + (a.kind !== 'asr' ? 5 : 0);
        const bScore = (b.languageCode === 'nl' ? 20 : b.languageCode === 'en' ? 10 : 0) + (b.kind !== 'asr' ? 5 : 0);
        return bScore - aScore;
      });

      for (const track of sorted) {
        try {
          const trackUrl = track.baseUrl + '&fmt=srv3';
          const response = await fetch(trackUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
          });
          if (!response.ok) { await response.text(); continue; }
          const text = await response.text();
          const cleaned = cleanTranscriptText(text);
          if (cleaned.length > 50) {
            console.log(`[Fallback] Got transcript via HTML scraping (${track.languageCode}): ${cleaned.length} chars`);
            return cleaned;
          }
        } catch { continue; }
      }
    }
  }

  console.log('[Fallback] All scraping methods exhausted');
  return null;
}

// ─── Main: fetch transcript with API-first, scraping-fallback ───

async function fetchYouTubeTranscript(videoId: string): Promise<{ transcript: string | null; method: string; error?: string }> {
  // Method 1: Official YouTube Data API v3 via OAuth
  console.log('=== Attempting Official YouTube Data API v3 ===');
  const accessToken = await refreshAccessToken();

  if (accessToken) {
    try {
      const transcript = await fetchViaOfficialAPI(videoId, accessToken);
      if (transcript) {
        return { transcript, method: 'official_api' };
      }
      console.log('[Main] Official API returned no transcript, falling back to scraping');
    } catch (e) {
      console.error('[Main] Official API error:', e);
    }
  } else {
    console.log('[Main] Could not refresh access token, skipping official API');
  }

  // Method 2: Scraping fallback (legacy)
  console.log('=== Attempting scraping fallback ===');
  try {
    const transcript = await fetchViaScrapingFallback(videoId);
    if (transcript) {
      return { transcript, method: 'scraping_fallback' };
    }
  } catch (e) {
    console.error('[Main] Scraping fallback error:', e);
  }

  return { transcript: null, method: 'none', error: 'All methods exhausted' };
}

// ─── HTTP handler ───

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  const authClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
  const { error: authError } = await authClient.auth.getClaims(authHeader.replace('Bearer ', ''));
  if (authError) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    const { video_url, review_id } = await req.json();

    if (!video_url) {
      return new Response(JSON.stringify({ error: 'video_url is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const videoId = extractVideoId(video_url);
    if (!videoId) {
      return new Response(JSON.stringify({ error: 'Invalid YouTube URL' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log('=== Fetching transcript for video:', videoId, '===');
    const result = await fetchYouTubeTranscript(videoId);

    if (!result.transcript) {
      return new Response(
        JSON.stringify({ transcript: null, message: 'Geen ondertiteling beschikbaar voor deze video', method: result.method, error: result.error }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    if (review_id) {
      const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      const { error: updateError } = await supabaseAdmin.from('reviews').update({ video_transcript: result.transcript }).eq('id', review_id);
      if (updateError) console.error('Failed to save transcript:', updateError);
      else console.log('Transcript saved to review:', review_id);
    }

    const wordCount = result.transcript.split(/\s+/).length;
    return new Response(
      JSON.stringify({ transcript: result.transcript, word_count: wordCount, method: result.method }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in transcribe-youtube:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Onbekende fout' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
