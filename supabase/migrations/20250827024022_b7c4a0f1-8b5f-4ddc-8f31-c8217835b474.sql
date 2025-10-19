-- Tighten RLS on users table and add secure admin email checker

-- 1) Remove overly permissive public SELECT policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.users;

-- 2) Ensure RLS is enabled (safe if already enabled)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 3) Allow users to view only their own record
CREATE POLICY "Users can view their own user record"
ON public.users
FOR SELECT
USING (auth.uid() = auth_id);

-- 4) Allow admins and super_users to view all users
CREATE POLICY "Admins can view all users"
ON public.users
FOR SELECT
USING (public.is_admin_or_super_user());

-- 5) Create a SECURITY DEFINER function to check if an email belongs to an admin/super_user
CREATE OR REPLACE FUNCTION public.is_admin_email(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE LOWER(u.email) = LOWER(p_email)
      AND u.role IN ('admin', 'super_user')
  );
$$;

-- 6) Allow both anon and authenticated to execute the function (returns only boolean)
GRANT EXECUTE ON FUNCTION public.is_admin_email(text) TO anon, authenticated;