-- Chapter 21 signup gift and Store promotion settings.
-- This migration is additive: it does not change or remove any resource,
-- private file, preview, series, order, customer, or existing Store policy.

begin;

create table if not exists public.store_marketing_settings (
  id boolean primary key default true check (id),
  free_packet_enabled boolean not null default false,
  free_packet_headline text not null default 'Welcome to Chapter 21',
  free_packet_message text not null default 'Sign up today to get a free packet.',
  free_packet_resource_id uuid references public.resources(id) on delete set null,
  discount_enabled boolean not null default false,
  discount_name text not null default 'Chapter 21 Special Offer',
  discount_message text not null default 'A limited-time Chapter 21 savings opportunity.',
  discount_percent integer not null default 10 check (discount_percent between 1 and 100),
  discount_scope text not null default 'all_pdfs' check (
    discount_scope in ('all_pdfs', 'resource', 'series', 'coaching', 'service_pdf', 'sitewide')
  ),
  target_resource_id uuid references public.resources(id) on delete set null,
  target_series_id uuid,
  target_service text,
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.store_marketing_settings (id)
values (true)
on conflict (id) do nothing;

create table if not exists public.store_free_packet_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete restrict,
  claimed_at timestamptz not null default timezone('utc', now()),
  unique (user_id, resource_id)
);

create index if not exists store_free_packet_claims_user_idx
  on public.store_free_packet_claims (user_id, claimed_at desc);

alter table public.store_marketing_settings enable row level security;
alter table public.store_free_packet_claims enable row level security;

drop policy if exists "Store marketing settings are publicly readable" on public.store_marketing_settings;
create policy "Store marketing settings are publicly readable"
  on public.store_marketing_settings for select
  using (true);

drop policy if exists "Institute administrators manage Store marketing" on public.store_marketing_settings;
create policy "Institute administrators manage Store marketing"
  on public.store_marketing_settings for all
  using (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  ))
  with check (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  ));

drop policy if exists "Customers read their own free packet claims" on public.store_free_packet_claims;
create policy "Customers read their own free packet claims"
  on public.store_free_packet_claims for select
  using (user_id = auth.uid());

drop policy if exists "Institute administrators review free packet claims" on public.store_free_packet_claims;
create policy "Institute administrators review free packet claims"
  on public.store_free_packet_claims for select
  using (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  ));

comment on table public.store_marketing_settings is
  'Single administrator-controlled Chapter 21 signup-gift and promotion configuration.';
comment on table public.store_free_packet_claims is
  'Records authenticated customer access to the currently selected free signup packet.';

commit;
