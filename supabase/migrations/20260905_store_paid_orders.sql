-- Durable Chapter 21 Store purchases. This migration is additive and keeps the
-- private resource-files bucket private; only server-side verified fulfillment
-- writes orders and issues time-limited download URLs.

begin;

create table if not exists public.store_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  stripe_session_id text not null unique,
  stripe_payment_intent_id text,
  customer_email text not null,
  payment_status text not null check (payment_status in ('paid')),
  base_total_cents integer not null check (base_total_cents >= 0),
  discount_percent integer not null default 0 check (discount_percent between 0 and 100),
  discount_amount_cents integer not null default 0 check (discount_amount_cents >= 0),
  final_total_cents integer not null check (final_total_cents >= 0),
  promotion_campaign_id uuid references public.store_promotion_campaigns(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.store_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.store_orders(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete restrict,
  title_snapshot text not null,
  quantity integer not null check (quantity > 0 and quantity <= 99),
  base_price_cents integer not null check (base_price_cents >= 0),
  final_price_cents integer not null check (final_price_cents >= 0),
  unique (order_id, resource_id)
);

create table if not exists public.store_checkout_intents (
  stripe_session_id text primary key,
  user_id uuid not null references auth.users(id) on delete restrict,
  customer_email text not null,
  base_total_cents integer not null check (base_total_cents >= 0),
  discount_percent integer not null default 0 check (discount_percent between 0 and 100),
  discount_amount_cents integer not null default 0 check (discount_amount_cents >= 0),
  final_total_cents integer not null check (final_total_cents >= 0),
  promotion_campaign_id uuid references public.store_promotion_campaigns(id) on delete set null,
  line_items jsonb not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists store_orders_user_created_idx
  on public.store_orders (user_id, created_at desc);

create index if not exists store_order_items_order_idx
  on public.store_order_items (order_id);

create index if not exists store_checkout_intents_user_created_idx
  on public.store_checkout_intents (user_id, created_at desc);

alter table public.store_orders enable row level security;
alter table public.store_order_items enable row level security;
alter table public.store_checkout_intents enable row level security;

drop policy if exists "Customers read their own Store orders" on public.store_orders;
create policy "Customers read their own Store orders"
  on public.store_orders for select
  using (user_id = auth.uid());

drop policy if exists "Institute administrators read all Store orders" on public.store_orders;
create policy "Institute administrators read all Store orders"
  on public.store_orders for select
  using (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  ));

drop policy if exists "Customers read their own Store order items" on public.store_order_items;
create policy "Customers read their own Store order items"
  on public.store_order_items for select
  using (exists (
    select 1 from public.store_orders
    where store_orders.id = store_order_items.order_id
      and store_orders.user_id = auth.uid()
  ));

drop policy if exists "Institute administrators read all Store order items" on public.store_order_items;
create policy "Institute administrators read all Store order items"
  on public.store_order_items for select
  using (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  ));

comment on table public.store_orders is
  'Server-created records for Stripe-confirmed Chapter 21 Store purchases. Stripe session ID is unique for webhook idempotency.';
comment on table public.store_order_items is
  'Server-created item snapshots used to preserve customer purchase history and authorize protected resource downloads.';
comment on table public.store_checkout_intents is
  'Server-only pre-payment snapshot of secure catalog prices and cart lines used to fulfill a Stripe-confirmed Store purchase accurately.';

commit;
