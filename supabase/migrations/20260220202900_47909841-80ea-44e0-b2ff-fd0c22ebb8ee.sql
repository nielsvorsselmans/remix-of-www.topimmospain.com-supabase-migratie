CREATE POLICY "Public can read external listings"
ON external_listings FOR SELECT USING (true);