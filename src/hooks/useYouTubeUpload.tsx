import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface YouTubeConfig {
  configured: boolean;
  has_client_id: boolean;
  has_client_secret: boolean;
}

interface ChannelInfo {
  connected: boolean;
  channel_id?: string;
  channel_title?: string;
  channel_thumbnail?: string;
  error?: string;
  error_description?: string;
  hint?: string;
}

interface UploadJob {
  id: string;
  title: string;
  status: "pending" | "uploading" | "processing" | "completed" | "failed";
  progress_percent: number;
  error_message: string | null;
  youtube_url: string | null;
  youtube_video_id: string | null;
  created_at: string;
}

export function useYouTubeUpload() {
  const [config, setConfig] = useState<YouTubeConfig | null>(null);
  const [isCheckingConfig, setIsCheckingConfig] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [currentJob, setCurrentJob] = useState<UploadJob | null>(null);
  const [channelInfo, setChannelInfo] = useState<ChannelInfo | null>(null);

  // Check YouTube configuration
  const checkConfig = useCallback(async () => {
    setIsCheckingConfig(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/youtube-oauth?action=check-config`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({}),
        }
      );
      
      if (response.ok) {
        const configData = await response.json();
        setConfig(configData);
      }
    } catch (error) {
      console.error("Failed to check YouTube config:", error);
    } finally {
      setIsCheckingConfig(false);
    }
  }, []);

  useEffect(() => {
    checkConfig();
  }, [checkConfig]);

  // Get channel info
  const getChannelInfo = useCallback(async (): Promise<ChannelInfo | null> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/youtube-oauth?action=get-channel-info`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({}),
        }
      );

      const data = await response.json();
      setChannelInfo(data);
      return data;
    } catch (error) {
      console.error("Failed to get channel info:", error);
      return null;
    }
  }, []);

  // Get OAuth authorization URL
  const getAuthUrl = async (redirectUri: string): Promise<string | null> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/youtube-oauth?action=get-auth-url`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ redirect_uri: redirectUri }),
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        return data.auth_url;
      }
      return null;
    } catch (error) {
      console.error("Failed to get auth URL:", error);
      return null;
    }
  };

  // Exchange authorization code for tokens
  const exchangeCode = async (code: string, redirectUri: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/youtube-oauth?action=exchange-code`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ code, redirect_uri: redirectUri }),
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        return data;
      }
      const error = await response.json();
      throw new Error(error.error || "Failed to exchange code");
    } catch (error) {
      console.error("Failed to exchange code:", error);
      throw error;
    }
  };

  // Upload video to Supabase Storage, then trigger YouTube upload
  const uploadVideo = async (
    file: File,
    metadata: {
      title: string;
      description?: string;
      video_type: string;
      video_date: string;
      project_ids?: string[];
    }
  ): Promise<string | null> => {
    setIsUploading(true);
    
    try {
      // 1. Upload file to Supabase Storage
      const fileName = `youtube-uploads/${Date.now()}-${file.name}`;
      
      toast.info("Video wordt geüpload naar tijdelijke opslag...");
      
      const { error: uploadError } = await supabase.storage
        .from("project-media")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      // 2. Create upload job in database
      const { data: session } = await supabase.auth.getSession();
      
      const { data: job, error: jobError } = await supabase
        .from("youtube_upload_jobs")
        .insert({
          title: metadata.title,
          description: metadata.description || null,
          video_type: metadata.video_type,
          video_date: metadata.video_date,
          storage_path: fileName,
          file_size_bytes: file.size,
          project_ids: metadata.project_ids || [],
          created_by: session?.session?.user?.id || null,
        })
        .select()
        .single();

      if (jobError || !job) {
        throw new Error(`Failed to create upload job: ${jobError?.message}`);
      }

      setCurrentJob(job as UploadJob);

      // 3. Trigger YouTube upload via edge function
      toast.info("YouTube upload wordt gestart...");
      
      const { error: invokeError } = await supabase.functions.invoke("upload-to-youtube", {
        body: {
          job_id: job.id,
          storage_path: fileName,
          title: metadata.title,
          description: metadata.description || "",
        },
      });

      if (invokeError) {
        throw new Error(`Failed to start YouTube upload: ${invokeError.message}`);
      }

      toast.success("Upload gestart! Je kunt de voortgang volgen.");
      
      return job.id;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      toast.error(message);
      console.error("Upload error:", error);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  // Poll job status
  const pollJobStatus = useCallback(async (jobId: string): Promise<UploadJob | null> => {
    const { data, error } = await supabase
      .from("youtube_upload_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (error) {
      console.error("Failed to fetch job status:", error);
      return null;
    }

    const job = data as UploadJob;
    setCurrentJob(job);
    return job;
  }, []);

  // Fetch all upload jobs
  const fetchJobs = async (): Promise<UploadJob[]> => {
    const { data, error } = await supabase
      .from("youtube_upload_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Failed to fetch jobs:", error);
      return [];
    }

    return data as UploadJob[];
  };

  return {
    config,
    isCheckingConfig,
    isConfigured: config?.configured ?? false,
    isUploading,
    currentJob,
    channelInfo,
    checkConfig,
    getAuthUrl,
    exchangeCode,
    uploadVideo,
    pollJobStatus,
    fetchJobs,
    getChannelInfo,
  };
}
