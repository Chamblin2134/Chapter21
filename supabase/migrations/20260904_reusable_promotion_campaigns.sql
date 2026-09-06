-- Reusable Chapter 21 promotion campaigns and public banner artwork.
-- Apply after 20260904_store_marketing.sql. This migration is additive and
-- preserves the existing signup-gift configuration and Store catalog.

begin;

create table if not exists public.store_promotion_campaigns (
  id uuid primary key default gen_random_uuid(),
  campaign_name text not null,
  headline text not null default 'Chapter 21 Special Offer',
  message text not null default 'A limited-time Chapter 21 savings opportunity.',
  percent_off integer not null default 10 check (percent_off between 1 and 100),
  scope text not null default 'all_pdfs' check (
    scope in ('all_pdfs', 'resource', 'series', 'coaching', 'service_pdf', 'sitewide')
  ),
  target_resource_id uuid references public.resources(id) on delete set null,
  target_series_id uuid,
  target_service text,
  theme text not null default 'custom' check (
    theme in ('summer', 'fall', 'halloween', 'christmas', 'new_year', 'custom')
  ),
  background_color text not null default '#173b3f',
  text_color text not null default '#fff8ea',
  accent_color text not null default '#d29147',
  image_url text,
  image_path text,
  button_label text not null default 'View This Offer',
  button_url text not null default '#store',
  is_active boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists store_promotion_campaigns_updated_idx
  on public.store_promotion_campaigns (updated_at desc);

-- Only one saved campaign may be the live visitor promotion at a time.
create unique index if not exists store_promotion_campaigns_one_active_idx
  on public.store_promotion_campaigns ((is_active))
  where is_active;

-- Preserve a currently active legacy promotion the first time this migration runs.
insert into public.store_promotion_campaigns (
  campaign_name,
  headline,
  message,
  percent_off,
  scope,
  target_resource_id,
  target_series_id,
  target_service,
  is_active
)
select
  coalesce(nullif(discount_name, ''), 'Chapter 21 Special Offer'),
  coalesce(nullif(discount_name, ''), 'Chapter 21 Special Offer'),
  coalesce(nullif(discount_message, ''), 'A limited-time Chapter 21 savings opportunity.'),
  discount_percent,
  discount_scope,
  target_resource_id,
  target_series_id,
  target_service,
  true
from public.store_marketing_settings
where id = true
  and discount_enabled = true
  and not exists (
    select 1 from public.store_promotion_campaigns where is_active = true
  );

alter table public.store_promotion_campaigns enable row level security;

drop policy if exists "Visitors read the active Store promotion" on public.store_promotion_campaigns;
create policy "Visitors read the active Store promotion"
  on public.store_promotion_campaigns for select
  using (is_active = true);

drop policy if exists "Institute administrators read all Store promotions" on public.store_promotion_campaigns;
create policy "Institute administrators read all Store promotions"
  on public.store_promotion_campaigns for select
  using (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  ));

drop policy if exists "Institute administrators create Store promotions" on public.store_promotion_campaigns;
create policy "Institute administrators create Store promotions"
  on public.store_promotion_campaigns for insert
  with check (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  ));

drop policy if exists "Institute administrators update Store promotions" on public.store_promotion_campaigns;
create policy "Institute administrators update Store promotions"
  on public.store_promotion_campaigns for update
  using (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  ))
  with check (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  ));

drop policy if exists "Institute administrators delete Store promotions" on public.store_promotion_campaigns;
create policy "Institute administrators delete Store promotions"
  on public.store_promotion_campaigns for delete
  using (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  ));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'promotion-assets',
  'promotion-assets',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Visitors read promotion artwork" on storage.objects;
create policy "Visitors read promotion artwork"
  on storage.objects for select
  using (bucket_id = 'promotion-assets');

drop policy if exists "Institute administrators upload promotion artwork" on storage.objects;
create policy "Institute administrators upload promotion artwork"
  on storage.objects for insert
  with check (
    bucket_id = 'promotion-assets'
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

drop policy if exists "Institute administrators update promotion artwork" on storage.objects;
create policy "Institute administrators update promotion artwork"
  on storage.objects for update
  using (
    bucket_id = 'promotion-assets'
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  )
  with check (
    bucket_id = 'promotion-assets'
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

drop policy if exists "Institute administrators delete promotion artwork" on storage.objects;
create policy "Institute administrators delete promotion artwork"
  on storage.objects for delete
  using (
    bucket_id = 'promotion-assets'
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

comment on table public.store_promotion_campaigns is
  'Reusable administrator-designed promotions; at most one campaign is active for visitors.';

commit;
