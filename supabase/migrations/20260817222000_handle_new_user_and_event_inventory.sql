-- Complemento às migrations 202608172039*: trigger de cadastro, reservas e storage.
-- Se o banco estiver vazio, prefira supabase/sql/rodar-no-editor.sql (arquivo único).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.members%ROWTYPE;
  v_admin_count int;
  v_role public.app_role;
BEGIN
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_member FROM public.members WHERE lower(email) = lower(NEW.email);
  SELECT count(*) INTO v_admin_count FROM public.user_roles WHERE role = 'admin';

  IF v_member.id IS NULL THEN
    IF v_admin_count = 0 THEN
      INSERT INTO public.members (email, full_name, user_id, invited_role)
      VALUES (lower(NEW.email), split_part(NEW.email, '@', 1), NEW.id, 'admin')
      RETURNING * INTO v_member;
    ELSE
      RETURN NEW;
    END IF;
  ELSE
    IF v_member.user_id IS NOT NULL AND v_member.user_id <> NEW.id THEN
      RETURN NEW;
    END IF;
    UPDATE public.members SET user_id = NEW.id WHERE id = v_member.id;
    SELECT * INTO v_member FROM public.members WHERE id = v_member.id;
  END IF;

  IF NOT COALESCE(v_member.active, false) THEN
    RETURN NEW;
  END IF;

  v_role := CASE
    WHEN v_admin_count = 0 THEN 'admin'::public.app_role
    WHEN lower(NEW.email) = 'rafael.szbaptista@gmail.com' THEN 'admin'::public.app_role
    ELSE v_member.invited_role
  END;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE IF NOT EXISTS public.event_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity numeric,
  UNIQUE (event_id, item_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_inventory TO authenticated;
GRANT ALL ON public.event_inventory TO service_role;
ALTER TABLE public.event_inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ei_select" ON public.event_inventory;
CREATE POLICY "ei_select" ON public.event_inventory FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "ei_member_write" ON public.event_inventory;
CREATE POLICY "ei_member_write" ON public.event_inventory FOR INSERT TO authenticated
  WITH CHECK (public.is_team_member(auth.uid()));
DROP POLICY IF EXISTS "ei_member_delete" ON public.event_inventory;
CREATE POLICY "ei_member_delete" ON public.event_inventory FOR DELETE TO authenticated
  USING (public.is_team_member(auth.uid()));
DROP POLICY IF EXISTS "ei_admin" ON public.event_inventory;
CREATE POLICY "ei_admin" ON public.event_inventory FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE UNIQUE INDEX IF NOT EXISTS inventory_items_sector_name ON public.inventory_items (sector, name);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
DROP POLICY IF EXISTS "user_roles_admin" ON public.user_roles;
CREATE POLICY "user_roles_admin" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('inventario', 'inventario', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]),
  ('notas', 'notas', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']::text[])
ON CONFLICT (id) DO NOTHING;
