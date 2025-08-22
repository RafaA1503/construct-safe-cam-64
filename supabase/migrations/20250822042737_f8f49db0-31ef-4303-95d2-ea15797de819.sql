-- Fix security issue: Implement proper RLS policies for captured_images
-- Remove overly permissive policies
DROP POLICY IF EXISTS "Anyone can view images" ON public.captured_images;
DROP POLICY IF EXISTS "Anyone can insert images" ON public.captured_images;
DROP POLICY IF EXISTS "Anyone can update images" ON public.captured_images;
DROP POLICY IF EXISTS "Anyone can delete images" ON public.captured_images;

-- Create secure policies that require authentication
-- Users can view all images (but must be authenticated)
CREATE POLICY "Authenticated users can view all images"
ON public.captured_images
FOR SELECT
TO authenticated
USING (true);

-- Users can insert images (but must be authenticated)
CREATE POLICY "Authenticated users can insert images"
ON public.captured_images
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Users can update all images (but must be authenticated)
CREATE POLICY "Authenticated users can update all images"
ON public.captured_images
FOR UPDATE
TO authenticated
USING (true);

-- Users can delete all images (but must be authenticated)
CREATE POLICY "Authenticated users can delete all images"
ON public.captured_images
FOR DELETE
TO authenticated
USING (true);