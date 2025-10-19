-- Add roles enum and update users table
CREATE TYPE public.user_role AS ENUM ('visitor', 'member', 'admin', 'super_user');
CREATE TYPE public.user_status AS ENUM ('active', 'inactive', 'pending_approval');

-- Update users table structure
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS status user_status DEFAULT 'active',
ADD COLUMN IF NOT EXISTS last_login timestamp with time zone,
ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false;

-- Update role column to use enum
ALTER TABLE public.users ALTER COLUMN role TYPE user_role USING role::user_role;
ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'member';

-- Create user profiles table for additional profile data
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  first_name text,
  last_name text,
  village_name text,
  current_location text,
  bio text,
  profile_photo_url text,
  field_visibility jsonb DEFAULT '{"firstName": true, "lastName": true, "villageName": true, "currentLocation": true, "profilePhoto": true, "bio": false}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- Create audit log table for tracking all changes
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_user_id uuid REFERENCES public.users(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  before_data jsonb,
  after_data jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  status text NOT NULL CHECK (status IN ('Upcoming', 'In-Progress', 'Completed')),
  start_date date,
  end_date date,
  cover_image_url text,
  gallery jsonb DEFAULT '[]'::jsonb,
  location text,
  funding_summary text,
  updates jsonb DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES public.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create NPU branches table
CREATE TABLE IF NOT EXISTS public.npu_branches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  contacts jsonb DEFAULT '{}'::jsonb,
  media jsonb DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES public.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Update content_posts table for comprehensive CMS
ALTER TABLE public.content_posts 
ADD COLUMN IF NOT EXISTS slug text,
ADD COLUMN IF NOT EXISTS body_rich text,
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS status text DEFAULT 'published' CHECK (status IN ('draft', 'published', 'scheduled')),
ADD COLUMN IF NOT EXISTS published_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS media jsonb DEFAULT '[]'::jsonb;

-- Add unique constraint on slug per category
CREATE UNIQUE INDEX IF NOT EXISTS content_posts_category_slug_unique 
ON public.content_posts (category, slug) WHERE slug IS NOT NULL;

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.npu_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view all profiles" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = auth_id);

CREATE POLICY "Admins can manage all users" ON public.users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE auth_id = auth.uid() AND role IN ('admin', 'super_user')
    )
  );

-- RLS Policies for user_profiles
CREATE POLICY "Anyone can view public profile fields" ON public.user_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.user_profiles
  FOR UPDATE USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

CREATE POLICY "Users can insert their own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- RLS Policies for finances
CREATE POLICY "Users can view their own finance records" ON public.finances
  FOR SELECT USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.users 
      WHERE auth_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage all finance records" ON public.finances
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE auth_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for content_posts
CREATE POLICY "Anyone can view published content" ON public.content_posts
  FOR SELECT USING (status = 'published' OR status IS NULL);

CREATE POLICY "Super users can manage content" ON public.content_posts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE auth_id = auth.uid() AND role IN ('admin', 'super_user')
    )
  );

-- RLS Policies for projects
CREATE POLICY "Anyone can view projects" ON public.projects
  FOR SELECT USING (true);

CREATE POLICY "Super users can manage projects" ON public.projects
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE auth_id = auth.uid() AND role IN ('admin', 'super_user')
    )
  );

-- RLS Policies for NPU branches
CREATE POLICY "Anyone can view NPU branches" ON public.npu_branches
  FOR SELECT USING (true);

CREATE POLICY "Super users can manage NPU branches" ON public.npu_branches
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE auth_id = auth.uid() AND role IN ('admin', 'super_user')
    )
  );

-- RLS Policies for audit logs
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE auth_id = auth.uid() AND role = 'admin'
    )
  );

-- Create storage buckets for file uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('avatars', 'avatars', true),
  ('content-media', 'content-media', true),
  ('project-media', 'project-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update their own avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage policies for content media
CREATE POLICY "Content media is publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'content-media');

CREATE POLICY "Super users can upload content media" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'content-media'
    AND EXISTS (
      SELECT 1 FROM public.users 
      WHERE auth_id = auth.uid() AND role IN ('admin', 'super_user')
    )
  );

-- Storage policies for project media
CREATE POLICY "Project media is publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'project-media');

CREATE POLICY "Super users can upload project media" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'project-media'
    AND EXISTS (
      SELECT 1 FROM public.users 
      WHERE auth_id = auth.uid() AND role IN ('admin', 'super_user')
    )
  );

-- Create functions for automatic timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_npu_branches_updated_at
  BEFORE UPDATE ON public.npu_branches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_content_posts_updated_at
  BEFORE UPDATE ON public.content_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create audit log entries
CREATE OR REPLACE FUNCTION public.create_audit_log(
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_before_data jsonb DEFAULT NULL,
  p_after_data jsonb DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO public.audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    before_data,
    after_data,
    created_at
  )
  SELECT 
    u.id,
    p_action,
    p_entity_type,
    p_entity_id,
    p_before_data,
    p_after_data,
    now()
  FROM public.users u
  WHERE u.auth_id = auth.uid()
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;