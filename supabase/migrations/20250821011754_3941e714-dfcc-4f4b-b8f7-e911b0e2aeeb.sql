-- Create storage bucket for EPP images
INSERT INTO storage.buckets (id, name, public) VALUES ('epp-images', 'epp-images', true);

-- Create policy to allow anyone to view images (since gallery has password protection)
CREATE POLICY "Anyone can view EPP images" ON storage.objects
FOR SELECT USING (bucket_id = 'epp-images');

-- Create policy to allow anyone to upload images
CREATE POLICY "Anyone can upload EPP images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'epp-images');

-- Create policy to allow anyone to delete images
CREATE POLICY "Anyone can delete EPP images" ON storage.objects
FOR DELETE USING (bucket_id = 'epp-images');