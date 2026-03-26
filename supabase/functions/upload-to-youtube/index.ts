import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const YOUTUBE_CLIENT_ID = Deno.env.get("YOUTUBE_CLIENT_ID");
const YOUTUBE_CLIENT_SECRET = Deno.env.get("YOUTUBE_CLIENT_SECRET");
const YOUTUBE_REFRESH_TOKEN = Deno.env.get("YOUTUBE_REFRESH_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Declare EdgeRuntime for Deno
declare const EdgeRuntime: {
  waitUntil: (promise: Promise<unknown>) => void;
};

async function getAccessToken(): Promise<string> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: YOUTUBE_CLIENT_ID!,
      client_secret: YOUTUBE_CLIENT_SECRET!,
      refresh_token: YOUTUBE_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(`Failed to refresh access token: ${data.error_description || data.error}`);
  }
  return data.access_token;
}

// deno-lint-ignore no-explicit-any
async function uploadToYouTube(
  supabaseClient: any,
  jobId: string,
  storagePath: string,
  title: string,
  description: string
): Promise<void> {
  try {
    console.log(`[YouTube Upload] Starting upload for job ${jobId}`);
    
    // Update status to uploading
    await supabaseClient
      .from("youtube_upload_jobs")
      .update({ status: "uploading", progress_percent: 5 })
      .eq("id", jobId);

    // Get access token
    const accessToken = await getAccessToken();
    console.log(`[YouTube Upload] Got access token`);

    // Download file from Supabase Storage
    await supabaseClient
      .from("youtube_upload_jobs")
      .update({ progress_percent: 10 })
      .eq("id", jobId);

    const { data: fileData, error: downloadError } = await supabaseClient
      .storage
      .from("project-media")
      .download(storagePath);

    if (downloadError) {
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }

    const fileBlob = fileData;
    const fileSize = fileBlob.size;
    console.log(`[YouTube Upload] Downloaded file, size: ${fileSize} bytes`);

    await supabaseClient
      .from("youtube_upload_jobs")
      .update({ progress_percent: 20, file_size_bytes: fileSize })
      .eq("id", jobId);

    // Step 1: Initialize resumable upload
    const metadata = {
      snippet: {
        title: title,
        description: description || "",
        categoryId: "22", // People & Blogs
        defaultLanguage: "nl",
        defaultAudioLanguage: "nl",
      },
      status: {
        privacyStatus: "unlisted", // Start as unlisted for safety
        selfDeclaredMadeForKids: false,
      },
    };

    const initResponse = await fetch(
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Upload-Content-Length": fileSize.toString(),
          "X-Upload-Content-Type": "video/*",
        },
        body: JSON.stringify(metadata),
      }
    );

    if (!initResponse.ok) {
      const errorText = await initResponse.text();
      console.error(`[YouTube Upload] Init failed: ${errorText}`);
      throw new Error(`Failed to initialize upload: ${initResponse.status} ${errorText}`);
    }

    const uploadUrl = initResponse.headers.get("Location");
    if (!uploadUrl) {
      throw new Error("No upload URL returned from YouTube");
    }
    console.log(`[YouTube Upload] Got resumable upload URL`);

    await supabaseClient
      .from("youtube_upload_jobs")
      .update({ progress_percent: 30 })
      .eq("id", jobId);

    // Step 2: Upload file in chunks
    const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks
    let uploadedBytes = 0;

    while (uploadedBytes < fileSize) {
      const start = uploadedBytes;
      const end = Math.min(uploadedBytes + CHUNK_SIZE, fileSize);
      const chunk = fileBlob.slice(start, end);
      
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Length": (end - start).toString(),
          "Content-Range": `bytes ${start}-${end - 1}/${fileSize}`,
          "Content-Type": "video/*",
        },
        body: chunk,
      });

      if (uploadResponse.status === 308) {
        // Upload incomplete, continue
        const range = uploadResponse.headers.get("Range");
        if (range) {
          const match = range.match(/bytes=0-(\d+)/);
          if (match) {
            uploadedBytes = parseInt(match[1]) + 1;
          }
        } else {
          uploadedBytes = end;
        }
      } else if (uploadResponse.ok) {
        // Upload complete
        const videoData = await uploadResponse.json();
        console.log(`[YouTube Upload] Upload complete! Video ID: ${videoData.id}`);
        
        const youtubeUrl = `https://www.youtube.com/watch?v=${videoData.id}`;
        const embedUrl = `https://www.youtube.com/embed/${videoData.id}`;

        await supabaseClient
          .from("youtube_upload_jobs")
          .update({
            status: "completed",
            progress_percent: 100,
            youtube_video_id: videoData.id,
            youtube_url: youtubeUrl,
            youtube_embed_url: embedUrl,
          })
          .eq("id", jobId);

        // Create video record in project_videos table
        const { data: job } = await supabaseClient
          .from("youtube_upload_jobs")
          .select("title, description, video_type, video_date, project_ids")
          .eq("id", jobId)
          .single();

        if (job) {
          const { data: videoRecord } = await supabaseClient
            .from("project_videos")
            .insert({
              video_url: youtubeUrl,
              title: job.title,
              description: job.description,
              video_type: job.video_type,
              video_date: job.video_date,
              thumbnail_url: `https://img.youtube.com/vi/${videoData.id}/mqdefault.jpg`,
              media_type: "video",
            })
            .select()
            .single();

          // Create project links if any
          if (videoRecord && job.project_ids && job.project_ids.length > 0) {
            const links = job.project_ids.map((projectId: string) => ({
              video_id: videoRecord.id,
              project_id: projectId,
              visible_public: true,
              visible_portal: true,
            }));

            await supabaseClient.from("project_video_links").insert(links);
          }
        }

        // Clean up: delete file from storage
        await supabaseClient.storage.from("project-media").remove([storagePath]);
        console.log(`[YouTube Upload] Cleaned up storage file`);

        return;
      } else {
        const errorText = await uploadResponse.text();
        throw new Error(`Upload failed: ${uploadResponse.status} ${errorText}`);
      }

      // Update progress
      const progress = Math.round(30 + (uploadedBytes / fileSize) * 60); // 30-90%
      await supabaseClient
        .from("youtube_upload_jobs")
        .update({ progress_percent: progress })
        .eq("id", jobId);
    }

    // If we get here, something went wrong
    throw new Error("Upload loop completed without success");

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`[YouTube Upload] Error:`, errorMessage);
    await supabaseClient
      .from("youtube_upload_jobs")
      .update({
        status: "failed",
        error_message: errorMessage,
      })
      .eq("id", jobId);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const { job_id, storage_path, title, description } = await req.json();

    if (!job_id || !storage_path || !title) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: job_id, storage_path, title" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!YOUTUBE_REFRESH_TOKEN) {
      return new Response(
        JSON.stringify({ error: "YouTube not configured. Please complete OAuth setup first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Start background upload task
    EdgeRuntime.waitUntil(
      uploadToYouTube(supabase, job_id, storage_path, title, description || "")
    );

    return new Response(
      JSON.stringify({ success: true, message: "Upload started in background", job_id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("Upload to YouTube error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
