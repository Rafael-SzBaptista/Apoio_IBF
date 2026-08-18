-- Administrador inicial e login só por e-mail.
-- Se você já rodou rodar-no-editor.sql, pode executar só este arquivo.

CREATE OR REPLACE FUNCTION public.is_invited_email(_email text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.members
    WHERE lower(email) = lower(trim(_email)) AND active
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_invited_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_invited_email(text) TO anon, authenticated, service_role;

INSERT INTO public.members (email, full_name, areas, invited_role, active)
VALUES (
  'rafael.szbaptista@gmail.com',
  'Rafael',
  ARRAY['alimentação', 'decoração'],
  'admin',
  true
)
ON CONFLICT (email) DO UPDATE SET
  invited_role = 'admin',
  active = true,
  full_name = EXCLUDED.full_name,
  areas = EXCLUDED.areas;
