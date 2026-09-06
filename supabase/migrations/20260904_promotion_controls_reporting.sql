-- Scheduling, popup frequency, performance reporting, and consent-aware
-- free-packet claim details for the Chapter 21 promotion manager.
-- Apply after 20260904_reusable_promotion_campaigns.sql.

begin;

alter table public.store_promotion_campaigns
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz,
  add column if not exists popup_frequency text not null default 'once_campaign';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'store_promotion_campaigns_popup_frequency_check'
      and conrelid = 'public.store_promotion_campaigns'::regclass
  ) then
    alter table public.store_promotion_campaigns
      add constraint store_promotion_campaigns_popup_frequency_check
      check (popup_frequency in ('once_campaign', 'daily', 'every_visit'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'store_promotion_campaigns_schedule_check'
      and conrelid = 'public.store_promotion_campaigns'::regclass
  ) then
    alter table public.store_promotion_campaigns
      add constraint store_promotion_campaigns_schedule_check
      check (starts_at is null or ends_at is null or starts_at < ends_at);
  end if;
end $$;

create index if not exists store_promotion_campaigns_schedule_idx
  on public.store_promotion_campaigns (is_active, starts_at, ends_at);

alter table public.store_free_packet_claims
  add column if not exists email_snapshot text,
  add column if not exists full_name_snapshot text,
  add column if not exists marketing_consent boolean not null default false;

create table if not exists public.store_promotion_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.store_promotion_campaigns(id) on delete cascade,
  event_type text not null check (
    event_type in ('impression', 'click', 'signup', 'purchase')
  ),
  dedupe_key text not null,
  user_id uuid references auth.users(id) on delete set null,
  happened_at timestamptz not null default timezone('utc', now()),
  unique (campaign_id, event_type, dedupe_key)
);

create index if not exists store_promotion_events_campaign_idx
  on public.store_promotion_events (campaign_id, happened_at desc);

alter table public.store_promotion_events enable row level security;

drop policy if exists "Institute administrators review Store promotion performance"
  on public.store_promotion_events;
create policy "Institute administrators review Store promotion performance"
  on public.store_promotion_events for select
  using (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  ));

comment on column public.store_promotion_campaigns.starts_at is
  'Optional administrator-selected time when an armed campaign becomes visible and discount-eligible.';
comment on column public.store_promotion_campaigns.ends_at is
  'Optional administrator-selected time when an armed campaign automatically expires.';
comment on column public.store_promotion_campaigns.popup_frequency is
  'Controls whether the entry popup appears once per campaign, once daily, or once per browsing visit.';
comment on table public.store_promotion_events is
  'Privacy-conscious deduplicated counts for promotion impressions, clicks, attributed signups, and verified purchases.';
comment on column public.store_free_packet_claims.marketing_consent is
  'True only when the customer voluntarily selected the occasional-email checkbox while requesting the packet.';

commit;
