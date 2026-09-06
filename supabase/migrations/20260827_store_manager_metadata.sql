-- Store Resource Manager metadata expansion.
-- Existing resources, private originals, published previews, and RLS policies are preserved.
ALTER TABLE public.resources
  ADD COLUMN IF NOT EXISTS audience text,
  ADD COLUMN IF NOT EXISTS subcategory text,
  ADD COLUMN IF NOT EXISTS series_name text,
  ADD COLUMN IF NOT EXISTS volume_number integer,
  ADD COLUMN IF NOT EXISTS series_order integer,
  ADD COLUMN IF NOT EXISTS subtitle text,
  ADD COLUMN IF NOT EXISTS author_name text,
  ADD COLUMN IF NOT EXISTS publisher_name text;

COMMENT ON COLUMN public.resources.audience IS 'Intended Store audience, such as Client or Clinician.';
COMMENT ON COLUMN public.resources.subcategory IS 'Optional Store subcategory used for library organization.';
COMMENT ON COLUMN public.resources.series_name IS 'Optional named resource collection or curriculum series.';
COMMENT ON COLUMN public.resources.volume_number IS 'Optional displayed volume number within a series.';
COMMENT ON COLUMN public.resources.series_order IS 'Optional numeric sorting order within a series.';
COMMENT ON COLUMN public.resources.subtitle IS 'Optional customer-facing resource subtitle.';
COMMENT ON COLUMN public.resources.author_name IS 'Optional customer-facing author credit.';
COMMENT ON COLUMN public.resources.publisher_name IS 'Optional customer-facing publisher credit.';
