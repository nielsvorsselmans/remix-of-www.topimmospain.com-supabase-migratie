-- Make sale-extra-attachments bucket public so documents can be accessed
UPDATE storage.buckets 
SET public = true 
WHERE id = 'sale-extra-attachments';