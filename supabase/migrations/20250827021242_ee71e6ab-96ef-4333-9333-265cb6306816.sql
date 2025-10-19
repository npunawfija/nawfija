-- Fix remaining functions with search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.users (auth_id, email, name, role)
    VALUES (new.id, new.email, new.raw_user_meta_data->>'name', 'member');
    RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_audit_log(p_action text, p_entity_type text, p_entity_id text, p_before_data jsonb DEFAULT NULL::jsonb, p_after_data jsonb DEFAULT NULL::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;