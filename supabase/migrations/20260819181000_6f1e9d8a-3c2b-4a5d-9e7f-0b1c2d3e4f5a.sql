-- Site content CMS, testimonials, and work media attachments.

-- ---------- site_settings (key/value JSON blob per section) ----------
CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Site settings are publicly readable"
  ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Admins can write site settings"
  ON public.site_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.set_site_settings_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.set_site_settings_updated_at() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER site_settings_set_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_site_settings_updated_at();

-- ---------- testimonials ----------
CREATE TABLE IF NOT EXISTS public.testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author text NOT NULL,
  role text NOT NULL DEFAULT '',
  text text NOT NULL DEFAULT '',
  rating integer NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  image_url text,
  featured boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.testimonials TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.testimonials TO authenticated;
GRANT ALL ON public.testimonials TO service_role;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Testimonials are publicly readable"
  ON public.testimonials FOR SELECT USING (true);
CREATE POLICY "Admins can write testimonials"
  ON public.testimonials FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER testimonials_set_updated_at
  BEFORE UPDATE ON public.testimonials
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Anonymous-safe way to check whether an admin exists yet (for the one-time
-- owner bootstrap on the sign-in page). SECURITY DEFINER + explicit grants.
CREATE OR REPLACE FUNCTION public.admin_count()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::integer FROM public.user_roles WHERE role = 'admin';
$$;
REVOKE ALL ON FUNCTION public.admin_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_count() TO anon, authenticated;

-- ---------- work_media (image / audio / video attachments per work) ----------
CREATE TABLE IF NOT EXISTS public.work_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id uuid NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  media_type text NOT NULL CHECK (media_type IN ('image', 'audio', 'video')),
  url text NOT NULL,
  caption text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.work_media TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_media TO authenticated;
GRANT ALL ON public.work_media TO service_role;
ALTER TABLE public.work_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Work media is publicly readable"
  ON public.work_media FOR SELECT USING (true);
CREATE POLICY "Admins can write work media"
  ON public.work_media FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS work_media_work_id_idx ON public.work_media (work_id);

-- ---------- storage bucket for uploads ----------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'uploads',
  'uploads',
  true,
  104857600,
  ARRAY[
    'image/*',
    'audio/*',
    'video/*',
    'application/octet-stream',
    'application/pdf',
    'application/zip',
    'text/plain'
  ]::text[]
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read uploads"
  ON storage.objects FOR SELECT USING (bucket_id = 'uploads');
CREATE POLICY "Authenticated upload uploads"
  ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'uploads');
CREATE POLICY "Authenticated update uploads"
  ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'uploads');
CREATE POLICY "Authenticated delete uploads"
  ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'uploads');