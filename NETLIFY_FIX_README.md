# Chapter 21 Netlify checkout fix

This package is prepared for Netlify deployment.

## Required Netlify environment variables

Server-only (never prefix these with `VITE_`):
- `STRIPE_SECRET_KEY` — Stripe secret key (`sk_test_...` or `sk_live_...`)
- `STRIPE_WEBHOOK_SECRET` — signing secret for the Stripe webhook endpoint
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service-role key
- `SITE_URL` — production site origin, for example `https://www.averyinstitute.com`

The existing Supabase URL/publishable-key configuration can remain as configured.

If a Stripe secret was previously stored as `VITE_SECRET_KEY`, rotate that secret in Stripe and store the replacement as `STRIPE_SECRET_KEY` in Netlify. Do not add the secret to GitHub.

## Stripe webhook
Configure Stripe to send checkout events to:
`https://www.averyinstitute.com/api/stripe/webhook`

The Netlify redirect maps `/api/*` to `netlify/functions/api.ts`.

## What changed
- Moved the Netlify API handler from repository root to `netlify/functions/api.ts`, matching `netlify.toml`.
- Checkout intent creation is now server-side with the Supabase service-role key.
- Removed the browser-side insert into `store_checkout_intents` that was blocked by RLS.
- The checkout response now exposes only the Stripe Checkout URL, not the server checkout-intent record.
