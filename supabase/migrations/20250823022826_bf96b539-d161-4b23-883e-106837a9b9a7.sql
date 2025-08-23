-- Add anon insert policy to keep migration working without exposing reads
CREATE POLICY IF NOT EXISTS "Anon can insert images"
ON public.captured_images
FOR INSERT
TO anon
WITH CHECK (true);