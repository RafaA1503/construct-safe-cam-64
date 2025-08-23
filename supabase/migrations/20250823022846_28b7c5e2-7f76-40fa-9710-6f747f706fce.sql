-- Add anon insert policy to keep migration working without exposing reads
-- PostgreSQL doesn't support IF NOT EXISTS for policies, so we'll drop first
DROP POLICY IF EXISTS "Anon can insert images" ON public.captured_images;

CREATE POLICY "Anon can insert images"
ON public.captured_images
FOR INSERT
TO anon
WITH CHECK (true);