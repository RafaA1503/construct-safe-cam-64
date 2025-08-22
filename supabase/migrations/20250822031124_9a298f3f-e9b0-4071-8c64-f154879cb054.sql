-- Allow public access to captured images (since gallery uses password protection)
DROP POLICY IF EXISTS "Users can view their own images" ON captured_images;
DROP POLICY IF EXISTS "Users can insert their own images" ON captured_images;
DROP POLICY IF EXISTS "Users can update their own images" ON captured_images;
DROP POLICY IF EXISTS "Users can delete their own images" ON captured_images;

-- Create public policies for captured_images
CREATE POLICY "Anyone can view images" ON captured_images FOR SELECT USING (true);
CREATE POLICY "Anyone can insert images" ON captured_images FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update images" ON captured_images FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete images" ON captured_images FOR DELETE USING (true);