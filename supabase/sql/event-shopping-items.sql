-- Lista de compras por programação (snapshot editável + marcação)
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

ALTER TABLE public.event_shopping_items
  ALTER COLUMN menu_ingredient_id DROP NOT NULL;

ALTER TABLE public.event_shopping_items
  DROP CONSTRAINT IF EXISTS event_shopping_items_event_id_menu_ingredient_id_key;

ALTER TABLE public.event_shopping_items
  DROP CONSTRAINT IF EXISTS event_shopping_items_menu_ingredient_id_fkey;

ALTER TABLE public.event_shopping_items
  ADD CONSTRAINT event_shopping_items_menu_ingredient_id_fkey
  FOREIGN KEY (menu_ingredient_id) REFERENCES public.menu_ingredients(id) ON DELETE SET NULL;

ALTER TABLE public.event_shopping_items ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.event_shopping_items ADD COLUMN IF NOT EXISTS qty_per_person text;
ALTER TABLE public.event_shopping_items ADD COLUMN IF NOT EXISTS where_to_buy text;
ALTER TABLE public.event_shopping_items ADD COLUMN IF NOT EXISTS notes text;

UPDATE public.event_shopping_items esi
SET
  name = COALESCE(NULLIF(esi.name, ''), mi.name, 'Item'),
  qty_per_person = COALESCE(esi.qty_per_person, mi.qty_per_person),
  where_to_buy = COALESCE(esi.where_to_buy, mi.where_to_buy),
  notes = COALESCE(esi.notes, mi.notes)
FROM public.menu_ingredients mi
WHERE esi.menu_ingredient_id = mi.id;

UPDATE public.event_shopping_items
SET name = 'Item'
WHERE name IS NULL OR btrim(name) = '';

ALTER TABLE public.event_shopping_items
  ALTER COLUMN name SET NOT NULL;

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
