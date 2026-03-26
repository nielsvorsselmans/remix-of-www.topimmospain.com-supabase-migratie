import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SchedulePostRequest {
  accountIds: string[];
  content: string;
  hashtags?: string[];
  mediaUrls?: string[];
  scheduleDate?: string; // ISO datetime
  publishNow?: boolean;
  projectId?: string;
  platform?: string;
  triggerWord?: string;
  contentItemId?: string; // Link to content_items table
  existingPostId?: string; // Existing social_posts.id to update instead of insert
  blogPostId?: string; // Link to blog_posts table
}

const IMAGE_EXTENSION_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml',
};

const normalizeMimeType = (contentType: string | null): string | null => {
  if (!contentType) return null;

  const normalized = contentType.split(';')[0].trim().toLowerCase();
  return normalized.startsWith('image/') ? normalized : null;
};

const inferMimeTypeFromUrl = (url: string): string => {
  const normalizedUrl = url.split('?')[0].split('#')[0].toLowerCase();

  for (const [extension, mimeType] of Object.entries(IMAGE_EXTENSION_TYPES)) {
    if (normalizedUrl.endsWith(extension)) {
      return mimeType;
    }
  }

  return 'image/jpeg';
};

const resolveMediaType = async (url: string): Promise<string> => {
  try {
    const headRes = await fetch(url, { method: 'HEAD' });

    if (!headRes.ok) {
      throw new Error(`Afbeelding niet bereikbaar: ${url} (status ${headRes.status})`);
    }

    const contentType = normalizeMimeType(headRes.headers.get('content-type'));
    if (!contentType) {
      const rawContentType = headRes.headers.get('content-type') || 'unknown';
      throw new Error(`URL is geen afbeelding: ${url} (type: ${rawContentType})`);
    }

    const contentLength = parseInt(headRes.headers.get('content-length') || '0', 10);
    if (contentLength > 10 * 1024 * 1024) {
      throw new Error(`Afbeelding te groot (max 10MB): ${url} (${Math.round(contentLength / 1024 / 1024)}MB)`);
    }

    return contentType;
  } catch (err) {
    if (err instanceof Error && (err.message.startsWith('Afbeelding') || err.message.startsWith('URL is geen'))) {
      throw err;
    }

    console.warn(`Media HEAD validation warning for ${url}:`, err);
    return inferMimeTypeFromUrl(url);
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check admin role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !roleData) {
      throw new Error('Admin access required');
    }

    // Parse request body
    const body: SchedulePostRequest = await req.json();
    const { 
      accountIds, 
      content, 
      hashtags = [], 
      mediaUrls = [], 
      scheduleDate, 
      publishNow = false,
      projectId,
      platform,
      triggerWord,
      contentItemId,
      existingPostId,
      blogPostId
    } = body;

    console.log('Received accountIds:', JSON.stringify(accountIds));

    if (!accountIds || accountIds.length === 0) {
      throw new Error('At least one account ID is required');
    }

    if (!content) {
      throw new Error('Post content is required');
    }

    // Get GHL credentials
    const apiKey = Deno.env.get('GOHIGHLEVEL_API_KEY');
    const locationId = Deno.env.get('GOHIGHLEVEL_LOCATION_ID');
    const ghlUserId = Deno.env.get('GOHIGHLEVEL_USER_ID');

    if (!apiKey) {
      throw new Error('GOHIGHLEVEL_API_KEY not configured');
    }

    if (!locationId) {
      throw new Error('GOHIGHLEVEL_LOCATION_ID not configured');
    }

    // Prepare GHL request body
    const ghlBody: any = {
      accountIds,
      summary: content,
      type: 'post',
    };
    
    // Add userId if configured (required by GHL API)
    if (ghlUserId) {
      ghlBody.userId = ghlUserId;
    }

    // Validate and add media if provided
    if (mediaUrls.length > 0) {
      ghlBody.media = await Promise.all(
        mediaUrls.map(async (url) => ({
          url,
          type: await resolveMediaType(url),
        }))
      );

      ghlBody.media.forEach((media: { url: string; type: string }, index: number) => {
        console.log(`Resolved media[${index}]:`, JSON.stringify(media));
      });
    }

    // Set schedule date or publish now
    if (publishNow) {
      ghlBody.status = 'published';
    } else if (scheduleDate) {
      ghlBody.scheduleDate = scheduleDate;
      ghlBody.status = 'scheduled';
    } else {
      ghlBody.status = 'draft';
    }

    console.log('Scheduling GHL post with body:', JSON.stringify(ghlBody, null, 2));
    console.log('Using location ID:', locationId);

    // Call GHL Social Planner API
    const ghlUrl = `https://services.leadconnectorhq.com/social-media-posting/${locationId}/posts`;
    console.log('Calling GHL API:', ghlUrl);

    const response = await fetch(ghlUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28'
      },
      body: JSON.stringify(ghlBody)
    });

    const responseText = await response.text();
    console.log('GHL API response status:', response.status);
    console.log('GHL API response body:', responseText);

    if (!response.ok) {
      // Parse error for more detailed message
      let errorMessage = `GHL API fout (${response.status})`;
      try {
        const errorData = JSON.parse(responseText);
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
        console.error('GHL API error details:', JSON.stringify(errorData, null, 2));
      } catch {
        errorMessage = responseText || errorMessage;
      }
      // Return 200 with success:false so Supabase client passes body to frontend
      return new Response(
        JSON.stringify({ success: false, error: errorMessage }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let ghlData;
    try {
      ghlData = JSON.parse(responseText);
    } catch {
      ghlData = { id: null };
    }
    console.log('GHL post created:', JSON.stringify(ghlData));

    const newStatus = publishNow ? 'published' : (scheduleDate ? 'scheduled' : 'draft');
    let savedPost = null;
    let saveError = null;

    if (existingPostId) {
      // Update existing social_posts record
      const updateData: Record<string, unknown> = {
        status: newStatus,
        scheduled_for: scheduleDate || null,
        published_at: publishNow ? new Date().toISOString() : null,
        ghl_post_id: ghlData.id || ghlData._id || null,
        ghl_account_ids: accountIds,
        updated_at: new Date().toISOString(),
      };
      if (blogPostId) {
        updateData.blog_post_id = blogPostId;
      }
      const { data, error } = await supabase
        .from('social_posts')
        .update(updateData)
        .eq('id', existingPostId)
        .select()
        .single();
      savedPost = data;
      saveError = error;
      if (saveError) {
        console.error('Error updating existing social post:', saveError);
      }
    } else {
      // Insert new record — only set content_item_id if it's a valid content_items reference
      const postRecord: Record<string, unknown> = {
        project_id: projectId || null,
        platform: platform || 'unknown',
        content: content,
        hashtags: hashtags,
        trigger_word: triggerWord || null,
        ghl_post_id: ghlData.id || ghlData._id || null,
        ghl_account_ids: accountIds,
        scheduled_for: scheduleDate || null,
        published_at: publishNow ? new Date().toISOString() : null,
        status: newStatus,
        created_by: user.id,
        blog_post_id: blogPostId || null,
      };

      // Only add content_item_id if provided — the FK will validate it
      if (contentItemId) {
        postRecord.content_item_id = contentItemId;
      }

      const { data, error } = await supabase
        .from('social_posts')
        .insert(postRecord)
        .select()
        .single();
      savedPost = data;
      saveError = error;

      if (saveError) {
        console.error('Error saving post to database:', saveError);
        // If FK error on content_item_id, retry without it
        if (saveError.code === '23503' && saveError.message?.includes('content_item_id')) {
          console.log('Retrying insert without content_item_id...');
          delete postRecord.content_item_id;
          const { data: retryData, error: retryError } = await supabase
            .from('social_posts')
            .insert(postRecord)
            .select()
            .single();
          savedPost = retryData;
          saveError = retryError;
          if (retryError) {
            console.error('Retry also failed:', retryError);
          }
        }
      }
    }

    if (contentItemId && !saveError) {
      if (newStatus === 'published' || newStatus === 'scheduled') {
        const { error: updateError } = await supabase
          .from('content_items')
          .update({ status: 'published' })
          .eq('id', contentItemId);
        
        if (updateError) {
          console.error('Error updating content_items status:', updateError);
        }
      }
    }

    // Fail explicitly if persistence didn't work
    if (!savedPost) {
      console.error('Persistence failed: savedPost is null. saveError:', saveError);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Post is extern ingepland maar kon niet lokaal opgeslagen worden: ${saveError?.message || 'onbekende fout'}`,
          ghlPostId: ghlData.id || ghlData._id,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Post persisted successfully:', savedPost.id, 'status:', newStatus);

    return new Response(
      JSON.stringify({
        success: true,
        ghlPostId: ghlData.id || ghlData._id,
        status: newStatus,
        scheduledFor: scheduleDate || null,
        savedPost,
        message: publishNow 
          ? 'Post is direct gepubliceerd' 
          : (scheduleDate ? `Post ingepland voor ${scheduleDate}` : 'Post opgeslagen als draft')
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in schedule-ghl-post:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage
      }),
      {
        status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
