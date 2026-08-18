
CREATE TYPE public.app_role AS ENUM ('admin','membro');

CREATE TABLE public.members (
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

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
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

CREATE POLICY "members_select" ON public.members FOR SELECT TO authenticated USING (true);
CREATE POLICY "members_admin_all" ON public.members FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "members_self_update" ON public.members FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_roles_select" ON public.user_roles FOR SELECT TO authenticated USING (true);

CREATE TABLE public.inventory_items (
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
CREATE POLICY "inv_select" ON public.inventory_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "inv_admin" ON public.inventory_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.inventory_movements (
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
CREATE POLICY "mov_select" ON public.inventory_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "mov_insert" ON public.inventory_movements FOR INSERT TO authenticated
  WITH CHECK (public.is_team_member(auth.uid()));
CREATE POLICY "mov_admin" ON public.inventory_movements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.menus (
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
CREATE POLICY "menus_select" ON public.menus FOR SELECT TO authenticated USING (true);
CREATE POLICY "menus_admin" ON public.menus FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.menu_ingredients (
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
CREATE POLICY "mi_select" ON public.menu_ingredients FOR SELECT TO authenticated USING (true);
CREATE POLICY "mi_admin" ON public.menu_ingredients FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.ingredient_prices (
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
CREATE POLICY "ip_select" ON public.ingredient_prices FOR SELECT TO authenticated USING (true);
CREATE POLICY "ip_admin" ON public.ingredient_prices FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.events (
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
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ev_select" ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "ev_admin" ON public.events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.event_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  area text NOT NULL,
  UNIQUE (event_id, member_id, area)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_assignments TO authenticated;
GRANT ALL ON public.event_assignments TO service_role;
ALTER TABLE public.event_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ea_select" ON public.event_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "ea_admin" ON public.event_assignments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.event_tasks (
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
CREATE POLICY "et_select" ON public.event_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "et_member_write" ON public.event_tasks FOR UPDATE TO authenticated
  USING (public.is_team_member(auth.uid())) WITH CHECK (public.is_team_member(auth.uid()));
CREATE POLICY "et_member_insert" ON public.event_tasks FOR INSERT TO authenticated
  WITH CHECK (public.is_team_member(auth.uid()));
CREATE POLICY "et_admin" ON public.event_tasks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.finance_entries (
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
CREATE POLICY "fe_select" ON public.finance_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "fe_insert" ON public.finance_entries FOR INSERT TO authenticated
  WITH CHECK (public.is_team_member(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "fe_own_update" ON public.finance_entries FOR UPDATE TO authenticated
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "fe_admin" ON public.finance_entries FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "inventario_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'inventario');
CREATE POLICY "inventario_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'inventario' AND public.is_team_member(auth.uid()));
CREATE POLICY "inventario_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'inventario' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "inventario_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'inventario' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "notas_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'notas' AND public.is_team_member(auth.uid()));
CREATE POLICY "notas_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'notas' AND public.is_team_member(auth.uid()));
CREATE POLICY "notas_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'notas' AND public.has_role(auth.uid(),'admin'));
