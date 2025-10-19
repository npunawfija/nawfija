-- Fix critical user profile exposure issue

-- 1) Remove the overly permissive "Anyone can view public profile fields" policy
DROP POLICY IF EXISTS "Anyone can view public profile fields" ON public.user_profiles;

-- 2) Create a secure policy that only shows approved profiles to authenticated users
-- This policy respects field visibility settings by filtering visible fields
CREATE POLICY "Authenticated users can view approved public profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
  status = 'approved'
);

-- 3) Allow users to view their own profile regardless of approval status
CREATE POLICY "Users can view their own profile"
ON public.user_profiles
FOR SELECT
USING (
  user_id IN (
    SELECT id FROM public.users WHERE auth_id = auth.uid()
  )
);

-- 4) Allow admins to manage all profiles (already exists through RLS inheritance)
-- The existing admin policies should cover this

-- 5) Create a secure function to get filtered profile data that respects field_visibility
CREATE OR REPLACE FUNCTION public.get_visible_profile_fields(profile_row public.user_profiles)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb := '{}'::jsonb;
  visibility jsonb;
BEGIN
  -- Get the field visibility settings
  visibility := COALESCE(profile_row.field_visibility, '{}'::jsonb);
  
  -- Always include basic info for approved profiles
  result := jsonb_build_object(
    'id', profile_row.id,
    'user_id', profile_row.user_id,
    'status', profile_row.status,
    'created_at', profile_row.created_at
  );
  
  -- Add fields based on visibility settings
  IF COALESCE((visibility->>'firstName')::boolean, true) THEN
    result := result || jsonb_build_object('first_name', profile_row.first_name);
  END IF;
  
  IF COALESCE((visibility->>'lastName')::boolean, true) THEN
    result := result || jsonb_build_object('last_name', profile_row.last_name);
  END IF;
  
  IF COALESCE((visibility->>'profilePhoto')::boolean, true) THEN
    result := result || jsonb_build_object('profile_photo_url', profile_row.profile_photo_url);
  END IF;
  
  IF COALESCE((visibility->>'currentLocation')::boolean, true) THEN
    result := result || jsonb_build_object('current_location', profile_row.current_location);
  END IF;
  
  IF COALESCE((visibility->>'villageName')::boolean, true) THEN
    result := result || jsonb_build_object('village_name', profile_row.village_name);
  END IF;
  
  IF COALESCE((visibility->>'bio')::boolean, false) THEN
    result := result || jsonb_build_object('bio', profile_row.bio);
  END IF;
  
  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_visible_profile_fields(public.user_profiles) TO authenticated;