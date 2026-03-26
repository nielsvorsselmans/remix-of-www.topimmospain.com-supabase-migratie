-- Update project-media bucket to allow video file types
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  'image/jpeg', 
  'image/png', 
  'image/webp', 
  'image/gif',
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
  'video/mpeg'
]
WHERE id = 'project-media';

-- Also increase file size limit to 5GB for video uploads
UPDATE storage.buckets 
SET file_size_limit = 5368709120 -- 5GB in bytes
WHERE id = 'project-media';