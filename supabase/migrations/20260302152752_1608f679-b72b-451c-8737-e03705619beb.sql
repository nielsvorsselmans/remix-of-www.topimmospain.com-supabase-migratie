
INSERT INTO storage.buckets (id, name, public)
VALUES ('snagging-photos', 'snagging-photos', true);

CREATE POLICY "Authenticated users can upload snagging photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'snagging-photos');

CREATE POLICY "Anyone can view snagging photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'snagging-photos');

CREATE POLICY "Authenticated users can delete snagging photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'snagging-photos');
