-- Allow both admin and super_user to manage finances
ALTER POLICY "Admins can manage all finance records"
ON public.finances
USING (is_admin_or_super_user())
WITH CHECK (is_admin_or_super_user());

-- Ensure super_user can view all finance records as well
ALTER POLICY "Users can view their own finance records"
ON public.finances
USING (((user_id IN (
  SELECT users.id FROM public.users WHERE users.auth_id = auth.uid()
)) OR is_admin_or_super_user()));