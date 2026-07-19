
CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read settings" ON public.app_settings FOR SELECT USING (true);

CREATE TABLE public.app_owner (
  id BOOLEAN PRIMARY KEY DEFAULT true,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT single_owner CHECK (id = true)
);
GRANT SELECT ON public.app_owner TO anon, authenticated;
GRANT ALL ON public.app_owner TO service_role;
ALTER TABLE public.app_owner ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read owner" ON public.app_owner FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.is_owner(_uid UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.app_owner WHERE user_id = _uid)
$$;

CREATE POLICY "owner writes settings" ON public.app_settings
  FOR ALL TO authenticated
  USING (public.is_owner(auth.uid()))
  WITH CHECK (public.is_owner(auth.uid()));

INSERT INTO public.app_settings (key, value) VALUES ('global_model', 'google/gemini-3.5-flash')
ON CONFLICT (key) DO NOTHING;
