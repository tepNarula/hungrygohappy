ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS gmaps_name text;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS source_list_id text;

CREATE TABLE public.gmaps_list_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_code text NOT NULL,
  gmaps_list_id text NOT NULL,
  source_url text NOT NULL,
  title text,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (list_code, gmaps_list_id)
);
GRANT SELECT, INSERT, UPDATE ON public.gmaps_list_sources TO anon, authenticated;
GRANT ALL ON public.gmaps_list_sources TO service_role;
ALTER TABLE public.gmaps_list_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "List sources readable" ON public.gmaps_list_sources FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "List sources insertable" ON public.gmaps_list_sources FOR INSERT TO anon, authenticated
  WITH CHECK (length(list_code) BETWEEN 1 AND 64 AND gmaps_list_id ~ '^[A-Za-z0-9_-]{8,128}$' AND length(source_url) <= 2048);
CREATE POLICY "List sources updatable" ON public.gmaps_list_sources FOR UPDATE TO anon, authenticated USING (true)
  WITH CHECK (length(list_code) BETWEEN 1 AND 64 AND gmaps_list_id ~ '^[A-Za-z0-9_-]{8,128}$' AND length(source_url) <= 2048);