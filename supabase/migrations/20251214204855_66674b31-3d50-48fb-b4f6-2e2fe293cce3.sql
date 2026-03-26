-- Make sale-documents bucket public so uploads work correctly in preview environment
UPDATE storage.buckets 
SET public = true 
WHERE id = 'sale-documents';