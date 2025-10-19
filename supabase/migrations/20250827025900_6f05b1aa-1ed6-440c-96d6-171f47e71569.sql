-- Make handle_new_user robust to missing name in metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _name text;
BEGIN
    -- Derive name: prefer metadata 'name'; fallback to email local-part; final fallback 'Member'
    _name := COALESCE(NULLIF(new.raw_user_meta_data->>'name', ''), NULLIF(split_part(new.email, '@', 1), ''), 'Member');

    INSERT INTO public.users (auth_id, email, name, role)
    VALUES (new.id, new.email, _name, 'member');
    RETURN new;
END;
$$;
