-- Possível decoração por programação (vínculo opcional com o almoxarifado)
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
