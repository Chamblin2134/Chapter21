-- PENDING: Run only after resource_series_migration.pending.sql is reviewed
-- against the live schema and applied. This creates no PDF, preview, or
-- product record and intentionally attaches no resource.

insert into public.resource_series (
  title,
  display_name,
  slug,
  brand,
  description,
  category,
  category_color,
  bundle_price_cents,
  is_published,
  created_by
)
select
  'Rebuilding My Life',
  'Rebuilding My Life Series',
  'rebuilding-my-life',
  'Chapter 21',
  'The Rebuilding My Life Series helps clients examine the life their addictive patterns created and intentionally build a healthier life through responsibility, self-trust, stability, relationships, daily structure, personal growth, and meaningful action.',
  'Responsibility & Personal Growth',
  '#3F7A4F',
  0,
  false,
  auth.uid()
where not exists (
  select 1 from public.resource_series where slug = 'rebuilding-my-life'
);

-- No current published resource matched “The Life My Addiction Built vs. The
-- Life I Want” during non-destructive inspection. When a real matching
-- resource exists, an administrator should assign its series_id, series_order
-- = 1, and desired selling_option through the Series Manager.
