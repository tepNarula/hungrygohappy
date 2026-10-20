CREATE TABLE public.restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_code text NOT NULL,
  google_maps_url text NOT NULL,
  name text,
  visits integer NOT NULL DEFAULT 0,
  last_visited_at timestamptz,
  visit_dates jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (list_code, google_maps_url)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurants TO anon, authenticated;
GRANT ALL ON public.restaurants TO service_role;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Group-code lists are readable" ON public.restaurants FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Group-code lists are insertable" ON public.restaurants FOR INSERT TO anon, authenticated WITH CHECK (length(list_code) BETWEEN 1 AND 64 AND length(google_maps_url) BETWEEN 1 AND 2048);
CREATE POLICY "Group-code lists are updatable" ON public.restaurants FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (length(list_code) BETWEEN 1 AND 64 AND length(google_maps_url) BETWEEN 1 AND 2048);
CREATE POLICY "Group-code lists are deletable" ON public.restaurants FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX restaurants_list_code_idx ON public.restaurants (list_code);
ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurants;