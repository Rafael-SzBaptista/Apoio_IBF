-- =============================================================================
-- Ministério Apoio — rode este arquivo no SQL Editor do Supabase (projeto em branco).
-- É idempotente: pode rodar de novo sem duplicar tabelas, políticas ou dados.
--
-- Depois: Authentication → Providers → Email (ligar). Confirmação de e-mail pode ficar desligada.
-- Login no app é só com o e-mail cadastrado (sem senha).
-- Administrador inicial: rafael.szbaptista@gmail.com — ele cadastra o restante na tela Equipe.
-- =============================================================================

-- PARTE 1 — Papéis e cadastro de membros
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'membro');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  email text NOT NULL UNIQUE,
  full_name text NOT NULL,
  phone text,
  areas text[] NOT NULL DEFAULT '{}',
  invited_role public.app_role NOT NULL DEFAULT 'membro',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.members TO authenticated;
GRANT ALL ON public.members TO service_role;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_team_member(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.members WHERE user_id = _user_id AND active)
$$;

CREATE OR REPLACE FUNCTION public.is_invited_email(_email text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.members
    WHERE lower(email) = lower(trim(_email)) AND active
  )
$$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_team_member(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_invited_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_team_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_invited_email(text) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "members_select" ON public.members;
CREATE POLICY "members_select" ON public.members FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "members_admin_all" ON public.members;
CREATE POLICY "members_admin_all" ON public.members FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "members_self_update" ON public.members;
CREATE POLICY "members_self_update" ON public.members FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "user_roles_select" ON public.user_roles;
CREATE POLICY "user_roles_select" ON public.user_roles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "user_roles_admin" ON public.user_roles;
CREATE POLICY "user_roles_admin" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Vincula o usuário recém-criado ao convite (e-mail) ou promove o primeiro acesso a admin.
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

-- PARTE 2 — Almoxarifado
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sector text NOT NULL,
  name text NOT NULL,
  quantity numeric,
  quantity_note text,
  unit text,
  location text,
  notes text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_items TO authenticated;
GRANT ALL ON public.inventory_items TO service_role;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX IF NOT EXISTS inventory_items_sector_name ON public.inventory_items (sector, name);
DROP POLICY IF EXISTS "inv_select" ON public.inventory_items;
CREATE POLICY "inv_select" ON public.inventory_items FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "inv_admin" ON public.inventory_items;
CREATE POLICY "inv_admin" ON public.inventory_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.inventory_sectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_sectors TO authenticated;
GRANT ALL ON public.inventory_sectors TO service_role;
ALTER TABLE public.inventory_sectors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inv_sec_select" ON public.inventory_sectors;
CREATE POLICY "inv_sec_select" ON public.inventory_sectors FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "inv_sec_admin" ON public.inventory_sectors;
CREATE POLICY "inv_sec_admin" ON public.inventory_sectors FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.inventory_sectors (name, sort_order) VALUES
  ('Papelaria', 1),
  ('Iluminação', 2),
  ('Vasos e plantas', 3),
  ('Artigos de esporte', 4),
  ('Fantasias', 5),
  ('Decoração ambiente', 6)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  delta numeric NOT NULL,
  reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_movements TO authenticated;
GRANT ALL ON public.inventory_movements TO service_role;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mov_select" ON public.inventory_movements;
CREATE POLICY "mov_select" ON public.inventory_movements FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "mov_insert" ON public.inventory_movements;
CREATE POLICY "mov_insert" ON public.inventory_movements FOR INSERT TO authenticated
  WITH CHECK (public.is_team_member(auth.uid()));
DROP POLICY IF EXISTS "mov_admin" ON public.inventory_movements;
CREATE POLICY "mov_admin" ON public.inventory_movements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- PARTE 3 — Cardápio e precificação
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.menus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  prep_instructions text,
  min_price_per_person numeric,
  charged_price_per_person numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menus TO authenticated;
GRANT ALL ON public.menus TO service_role;
ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "menus_select" ON public.menus;
CREATE POLICY "menus_select" ON public.menus FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "menus_admin" ON public.menus;
CREATE POLICY "menus_admin" ON public.menus FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.menu_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id uuid NOT NULL REFERENCES public.menus(id) ON DELETE CASCADE,
  name text NOT NULL,
  qty_per_person text,
  kind text NOT NULL DEFAULT 'ingrediente',
  where_to_buy text,
  notes text,
  sort_order int NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_ingredients TO authenticated;
GRANT ALL ON public.menu_ingredients TO service_role;
ALTER TABLE public.menu_ingredients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mi_select" ON public.menu_ingredients;
CREATE POLICY "mi_select" ON public.menu_ingredients FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "mi_admin" ON public.menu_ingredients;
CREATE POLICY "mi_admin" ON public.menu_ingredients FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.ingredient_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  pack_quantity numeric NOT NULL,
  unit text NOT NULL,
  price numeric NOT NULL,
  where_to_buy text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ingredient_prices TO authenticated;
GRANT ALL ON public.ingredient_prices TO service_role;
ALTER TABLE public.ingredient_prices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ip_select" ON public.ingredient_prices;
CREATE POLICY "ip_select" ON public.ingredient_prices FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "ip_admin" ON public.ingredient_prices;
CREATE POLICY "ip_admin" ON public.ingredient_prices FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- PARTE 4 — Programações
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  event_date date NOT NULL,
  event_time text,
  location text,
  maps_url text,
  expected_people int,
  menu_id uuid REFERENCES public.menus(id) ON DELETE SET NULL,
  food_label text,
  phones text,
  notes text,
  status text NOT NULL DEFAULT 'planejada',
  photo_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ev_select" ON public.events;
CREATE POLICY "ev_select" ON public.events FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "ev_admin" ON public.events;
CREATE POLICY "ev_admin" ON public.events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS photo_enabled boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.event_photos (
  event_id uuid PRIMARY KEY REFERENCES public.events(id) ON DELETE CASCADE,
  path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_photos TO authenticated;
GRANT ALL ON public.event_photos TO service_role;
ALTER TABLE public.event_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ep_select" ON public.event_photos;
CREATE POLICY "ep_select" ON public.event_photos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "ep_member_write" ON public.event_photos;
CREATE POLICY "ep_member_write" ON public.event_photos FOR INSERT TO authenticated
  WITH CHECK (public.is_team_member(auth.uid()));
DROP POLICY IF EXISTS "ep_member_update" ON public.event_photos;
CREATE POLICY "ep_member_update" ON public.event_photos FOR UPDATE TO authenticated
  USING (public.is_team_member(auth.uid())) WITH CHECK (public.is_team_member(auth.uid()));
DROP POLICY IF EXISTS "ep_member_delete" ON public.event_photos;
CREATE POLICY "ep_member_delete" ON public.event_photos FOR DELETE TO authenticated
  USING (public.is_team_member(auth.uid()));
DROP POLICY IF EXISTS "ep_admin" ON public.event_photos;
CREATE POLICY "ep_admin" ON public.event_photos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.event_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  area text NOT NULL,
  UNIQUE (event_id, member_id, area)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_assignments TO authenticated;
GRANT ALL ON public.event_assignments TO service_role;
ALTER TABLE public.event_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ea_select" ON public.event_assignments;
CREATE POLICY "ea_select" ON public.event_assignments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "ea_admin" ON public.event_assignments;
CREATE POLICY "ea_admin" ON public.event_assignments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.event_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title text NOT NULL,
  done boolean NOT NULL DEFAULT false,
  member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_tasks TO authenticated;
GRANT ALL ON public.event_tasks TO service_role;
ALTER TABLE public.event_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "et_select" ON public.event_tasks;
CREATE POLICY "et_select" ON public.event_tasks FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "et_member_write" ON public.event_tasks;
CREATE POLICY "et_member_write" ON public.event_tasks FOR UPDATE TO authenticated
  USING (public.is_team_member(auth.uid())) WITH CHECK (public.is_team_member(auth.uid()));
DROP POLICY IF EXISTS "et_member_insert" ON public.event_tasks;
CREATE POLICY "et_member_insert" ON public.event_tasks FOR INSERT TO authenticated
  WITH CHECK (public.is_team_member(auth.uid()));
DROP POLICY IF EXISTS "et_admin" ON public.event_tasks;
CREATE POLICY "et_admin" ON public.event_tasks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

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

CREATE TABLE IF NOT EXISTS public.event_shopping_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  menu_ingredient_id uuid REFERENCES public.menu_ingredients(id) ON DELETE SET NULL,
  name text NOT NULL,
  qty_per_person text,
  where_to_buy text,
  notes text,
  done boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0
);
ALTER TABLE public.event_shopping_items ALTER COLUMN menu_ingredient_id DROP NOT NULL;
ALTER TABLE public.event_shopping_items DROP CONSTRAINT IF EXISTS event_shopping_items_event_id_menu_ingredient_id_key;
ALTER TABLE public.event_shopping_items ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.event_shopping_items ADD COLUMN IF NOT EXISTS qty_per_person text;
ALTER TABLE public.event_shopping_items ADD COLUMN IF NOT EXISTS where_to_buy text;
ALTER TABLE public.event_shopping_items ADD COLUMN IF NOT EXISTS notes text;
UPDATE public.event_shopping_items SET name = COALESCE(NULLIF(name, ''), 'Item') WHERE name IS NULL OR btrim(name) = '';
ALTER TABLE public.event_shopping_items ALTER COLUMN name SET NOT NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_shopping_items TO authenticated;
GRANT ALL ON public.event_shopping_items TO service_role;
ALTER TABLE public.event_shopping_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "esi_select" ON public.event_shopping_items;
CREATE POLICY "esi_select" ON public.event_shopping_items FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "esi_member_write" ON public.event_shopping_items;
CREATE POLICY "esi_member_write" ON public.event_shopping_items FOR UPDATE TO authenticated
  USING (public.is_team_member(auth.uid())) WITH CHECK (public.is_team_member(auth.uid()));
DROP POLICY IF EXISTS "esi_member_insert" ON public.event_shopping_items;
CREATE POLICY "esi_member_insert" ON public.event_shopping_items FOR INSERT TO authenticated
  WITH CHECK (public.is_team_member(auth.uid()));
DROP POLICY IF EXISTS "esi_member_delete" ON public.event_shopping_items;
CREATE POLICY "esi_member_delete" ON public.event_shopping_items FOR DELETE TO authenticated
  USING (public.is_team_member(auth.uid()));
DROP POLICY IF EXISTS "esi_admin" ON public.event_shopping_items;
CREATE POLICY "esi_admin" ON public.event_shopping_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.event_decorations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title text NOT NULL,
  inventory_item_id uuid REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  notes text,
  sort_order int NOT NULL DEFAULT 0
);
ALTER TABLE public.event_decorations
  ADD COLUMN IF NOT EXISTS inventory_item_id uuid REFERENCES public.inventory_items(id) ON DELETE SET NULL;
ALTER TABLE public.event_decorations
  ADD COLUMN IF NOT EXISTS notes text;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_decorations TO authenticated;
GRANT ALL ON public.event_decorations TO service_role;
ALTER TABLE public.event_decorations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ed_select" ON public.event_decorations;
CREATE POLICY "ed_select" ON public.event_decorations FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "ed_member_insert" ON public.event_decorations;
CREATE POLICY "ed_member_insert" ON public.event_decorations FOR INSERT TO authenticated
  WITH CHECK (public.is_team_member(auth.uid()));
DROP POLICY IF EXISTS "ed_member_delete" ON public.event_decorations;
CREATE POLICY "ed_member_delete" ON public.event_decorations FOR DELETE TO authenticated
  USING (public.is_team_member(auth.uid()));
DROP POLICY IF EXISTS "ed_admin" ON public.event_decorations;
CREATE POLICY "ed_admin" ON public.event_decorations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- PARTE 5 — Financeiro
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.finance_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  entry_date date NOT NULL DEFAULT current_date,
  kind text NOT NULL DEFAULT 'gasto',
  description text NOT NULL,
  amount numeric NOT NULL,
  receipt_path text,
  reimbursement_status text NOT NULL DEFAULT 'nao_aplicavel',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_entries TO authenticated;
GRANT ALL ON public.finance_entries TO service_role;
ALTER TABLE public.finance_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fe_select" ON public.finance_entries;
CREATE POLICY "fe_select" ON public.finance_entries FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "fe_insert" ON public.finance_entries;
CREATE POLICY "fe_insert" ON public.finance_entries FOR INSERT TO authenticated
  WITH CHECK (public.is_team_member(auth.uid()) AND created_by = auth.uid());
DROP POLICY IF EXISTS "fe_own_update" ON public.finance_entries;
CREATE POLICY "fe_own_update" ON public.finance_entries FOR UPDATE TO authenticated
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
DROP POLICY IF EXISTS "fe_admin" ON public.finance_entries;
CREATE POLICY "fe_admin" ON public.finance_entries FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- PARTE 6 — Storage (fotos do almoxarifado e notas fiscais)
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('inventario', 'inventario', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]),
  ('notas', 'notas', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']::text[]),
  ('programacoes', 'programacoes', false, 8388608, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "inventario_read" ON storage.objects;
CREATE POLICY "inventario_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'inventario');
DROP POLICY IF EXISTS "inventario_write" ON storage.objects;
CREATE POLICY "inventario_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'inventario' AND public.is_team_member(auth.uid()));
DROP POLICY IF EXISTS "inventario_update" ON storage.objects;
CREATE POLICY "inventario_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'inventario' AND public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "inventario_delete" ON storage.objects;
CREATE POLICY "inventario_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'inventario' AND public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "notas_read" ON storage.objects;
CREATE POLICY "notas_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'notas' AND public.is_team_member(auth.uid()));
DROP POLICY IF EXISTS "notas_write" ON storage.objects;
CREATE POLICY "notas_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'notas' AND public.is_team_member(auth.uid()));
DROP POLICY IF EXISTS "notas_delete" ON storage.objects;
CREATE POLICY "notas_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'notas' AND public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "programacoes_read" ON storage.objects;
CREATE POLICY "programacoes_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'programacoes');
DROP POLICY IF EXISTS "programacoes_write" ON storage.objects;
CREATE POLICY "programacoes_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'programacoes' AND public.is_team_member(auth.uid()));
DROP POLICY IF EXISTS "programacoes_update" ON storage.objects;
CREATE POLICY "programacoes_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'programacoes' AND public.is_team_member(auth.uid()));
DROP POLICY IF EXISTS "programacoes_delete" ON storage.objects;
CREATE POLICY "programacoes_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'programacoes' AND public.is_team_member(auth.uid()));

-- PARTE 7 — Dados iniciais (planilha Apoio 2026 — base para editar no app)
-- O administrador já entra com rafael.szbaptista@gmail.com.
-- Os demais e-mails são placeholders até você cadastrar a equipe de verdade.
-- -----------------------------------------------------------------------------
INSERT INTO public.members (email, full_name, areas, invited_role, active) VALUES
  ('rafael.szbaptista@gmail.com', 'Rafael', ARRAY['alimentação', 'decoração'], 'admin', true)
ON CONFLICT (email) DO UPDATE SET
  invited_role = 'admin',
  active = true,
  full_name = EXCLUDED.full_name,
  areas = EXCLUDED.areas;

INSERT INTO public.members (email, full_name, areas, invited_role) VALUES
  ('beatriz@apoio.local', 'Beatriz', ARRAY['alimentação', 'decoração'], 'membro'),
  ('rafael.b@apoio.local', 'Rafael B', ARRAY['alimentação'], 'membro'),
  ('nicholas@apoio.local', 'Nicholas', ARRAY['decoração'], 'membro'),
  ('carla@apoio.local', 'Carla', ARRAY['alimentação', 'decoração'], 'membro'),
  ('isabela.l@apoio.local', 'Isabela L', ARRAY['alimentação'], 'membro'),
  ('isabela.s@apoio.local', 'Isabela S', ARRAY['decoração'], 'membro')
ON CONFLICT (email) DO NOTHING;

-- Estoque, cardápio, preços e escala da planilha Apoio 2026:
-- rode em seguida supabase/sql/planilha-apoio-2026.sql
