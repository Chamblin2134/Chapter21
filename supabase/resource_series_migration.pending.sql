-- PENDING: Do not execute until the owner can access the existing Supabase
-- project and the live resources/profiles policies have been inspected.
--
-- This additive draft keeps the existing resources table and its current
-- series_name / volume_number / series_order fields intact. It introduces one
-- optional relationship to a series record, so deleting a series only clears
-- the relationship and never deletes the resource, private original, or
-- watermarked preview.

begin;

create table if not exists public.resource_series (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  display_name text not null,
  slug text not null unique,
  brand text not null default 'Chapter 21',
  description text,
  category text,
  category_color text,
  cover_image text,
  bundle_price_cents integer not null default 0 check (bundle_price_cents >= 0),
  is_published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.resources
  add column if not exists series_id uuid references public.resource_series(id) on delete set null,
  add column if not exists selling_option text not null default 'individual'
    check (selling_option in ('individual', 'bundle_only', 'individual_and_bundle'));

create index if not exists resources_series_id_order_idx
  on public.resources (series_id, series_order, created_at);

create index if not exists resource_series_published_category_idx
  on public.resource_series (is_published, category, created_at desc);

drop trigger if exists resource_series_set_updated_at on public.resource_series;
create trigger resource_series_set_updated_at
before update on public.resource_series
for each row execute function public.set_updated_at();

alter table public.resource_series enable row level security;

-- Mirror the existing resources-table access pattern: customers can read only
-- published series; the authenticated Institute administrator can manage all.
drop policy if exists "Published series are publicly readable" on public.resource_series;
create policy "Published series are publicly readable" on public.resource_series for select
  using (is_published or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  ));

drop policy if exists "Institute administrators manage series" on public.resource_series;
create policy "Institute administrators manage series" on public.resource_series for all
  using (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  ))
  with check (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  ));

commit;
