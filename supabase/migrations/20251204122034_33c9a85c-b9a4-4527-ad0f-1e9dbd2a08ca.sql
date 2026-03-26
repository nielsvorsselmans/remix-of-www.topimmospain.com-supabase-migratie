-- Create youtube_upload_jobs table for tracking upload progress
CREATE TABLE public.youtube_upload_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Job metadata
  title TEXT NOT NULL,
  description TEXT,
  video_type TEXT NOT NULL DEFAULT 'bouwupdate',
  video_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Storage reference
  storage_path TEXT NOT NULL,
  file_size_bytes BIGINT,
  
  -- Upload status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'uploading', 'processing', 'completed', 'failed')),
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  error_message TEXT,
  
  -- YouTube result
  youtube_video_id TEXT,
  youtube_url TEXT,
  youtube_embed_url TEXT,
  
  -- Project links (to create after upload completes)
  project_ids UUID[] DEFAULT '{}',
  
  -- User tracking
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.youtube_upload_jobs ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "Admins can manage youtube upload jobs"
  ON public.youtube_upload_jobs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create updated_at trigger
CREATE TRIGGER update_youtube_upload_jobs_updated_at
  BEFORE UPDATE ON public.youtube_upload_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for status queries
CREATE INDEX idx_youtube_upload_jobs_status ON public.youtube_upload_jobs(status);
CREATE INDEX idx_youtube_upload_jobs_created_by ON public.youtube_upload_jobs(created_by);