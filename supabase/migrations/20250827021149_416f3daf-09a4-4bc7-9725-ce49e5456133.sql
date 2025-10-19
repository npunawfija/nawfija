-- Add profile approval system
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Add finance audit and enhanced tracking
CREATE TABLE IF NOT EXISTS finance_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finance_id INTEGER REFERENCES finances(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  changed_by UUID REFERENCES users(id),
  change_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add content management table
CREATE TABLE IF NOT EXISTS content_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_name TEXT NOT NULL,
  section_key TEXT NOT NULL,
  title TEXT,
  content TEXT,
  media_urls JSONB DEFAULT '[]',
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'scheduled')),
  scheduled_for TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(page_name, section_key)
);

-- Add comprehensive audit logging
CREATE TABLE IF NOT EXISTS system_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add finance dues tracking
ALTER TABLE finances ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE finances ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue', 'cancelled'));
ALTER TABLE finances ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE finances ADD COLUMN IF NOT EXISTS receipt_number TEXT;

-- Enable RLS on new tables
ALTER TABLE finance_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for finance_audit
CREATE POLICY "Admins can view finance audit logs"
ON finance_audit FOR SELECT
USING (is_admin_or_super_user());

-- RLS Policies for content_sections  
CREATE POLICY "Anyone can view published content sections"
ON content_sections FOR SELECT
USING (status = 'published' OR is_admin_or_super_user());

CREATE POLICY "Admins can manage content sections"
ON content_sections FOR ALL
USING (is_admin_or_super_user());

-- RLS Policies for system_audit_logs
CREATE POLICY "Admins can view system audit logs"
ON system_audit_logs FOR SELECT
USING (is_admin_or_super_user());

CREATE POLICY "System can insert audit logs"
ON system_audit_logs FOR INSERT
WITH CHECK (true);

-- Create triggers for updated_at
CREATE OR REPLACE TRIGGER update_content_sections_updated_at
BEFORE UPDATE ON content_sections
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create audit logging function
CREATE OR REPLACE FUNCTION log_system_action(
  p_user_id UUID,
  p_action_type TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT DEFAULT NULL,
  p_details JSONB DEFAULT '{}'
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO system_audit_logs (user_id, action_type, resource_type, resource_id, details)
  VALUES (p_user_id, p_action_type, p_resource_type, p_resource_id, p_details);
END;
$$;