-- Create roles enum first
CREATE TYPE public.user_role AS ENUM ('visitor', 'member', 'admin', 'super_user');
CREATE TYPE public.user_status AS ENUM ('active', 'inactive', 'pending_approval');

-- Add new columns to users table first
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS status user_status DEFAULT 'active',
ADD COLUMN IF NOT EXISTS last_login timestamp with time zone,
ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS role_new user_role DEFAULT 'member';

-- Update the new role column based on existing role values
UPDATE public.users 
SET role_new = CASE 
  WHEN role = 'member' THEN 'member'::user_role
  WHEN role = 'admin' THEN 'admin'::user_role
  WHEN role = 'super_user' THEN 'super_user'::user_role
  ELSE 'member'::user_role
END;

-- Drop old role column and rename new one
ALTER TABLE public.users DROP COLUMN role;
ALTER TABLE public.users RENAME COLUMN role_new TO role;
ALTER TABLE public.users ALTER COLUMN role SET NOT NULL;