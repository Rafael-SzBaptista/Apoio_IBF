-- Setores do almoxarifado (rodar no SQL Editor se o projeto já existia antes)
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
