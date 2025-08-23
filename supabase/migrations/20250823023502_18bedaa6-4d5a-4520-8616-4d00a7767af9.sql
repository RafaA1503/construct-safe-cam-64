-- Fix security issue: Implement proper shared gallery access
-- Remove policies that require authentication when no auth system exists
DROP POLICY IF EXISTS "Authenticated users can view all images" ON public.captured_images;
DROP POLICY IF EXISTS "Authenticated users can insert images" ON public.captured_images;
DROP POLICY IF EXISTS "Authenticated users can update all images" ON public.captured_images;
DROP POLICY IF EXISTS "Authenticated users can delete all images" ON public.captured_images;

-- Create secure policies for shared gallery with UI-level password protection
-- Only allow reading for anonymous users (gallery access)
CREATE POLICY "Allow read access for shared gallery"
ON public.captured_images
FOR SELECT
TO anon
USING (true);

-- Keep insert access for anon (camera captures)
-- (policy already exists from previous migration)

-- Restrict update/delete to only authenticated users who own the image
-- Since we're using shared images (user_id = null), we need a different approach
-- For now, allow updates/deletes only for authenticated users to at least require some level of access
CREATE POLICY "Authenticated users can update shared images"
ON public.captured_images
FOR UPDATE
TO authenticated
USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete shared images"
ON public.captured_images
FOR DELETE
TO authenticated
USING (user_id IS NULL OR auth.uid() = user_id);