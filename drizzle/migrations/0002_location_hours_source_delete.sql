ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS province text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS gmaps_place_id text;
GRANT DELETE ON public.gmaps_list_sources TO anon, authenticated;
CREATE POLICY "List sources deletable" ON public.gmaps_list_sources FOR DELETE TO anon, authenticated USING (true);