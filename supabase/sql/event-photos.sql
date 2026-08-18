-- Foto opcional por programação (ativada no cadastro)
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS photo_enabled boolean NOT NULL DEFAULT false;

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

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('programacoes', 'programacoes', false, 8388608, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[])
ON CONFLICT (id) DO NOTHING;

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
