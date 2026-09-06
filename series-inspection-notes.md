# Store Series Inspection Notes

## Current findings

The active Store Manager source already stores optional per-resource `series_name`, `volume_number`, and `series_order` metadata on the existing `resources` record. Existing resource cards and filters use those fields for a light series label and ordering, but there is no separate series entity for title, description, category color, cover image, bundle price, or publish status.

The current published Store did not contain a visible resource titled **The Life My Addiction Built vs. The Life I Want** at inspection time. No resource, file, preview, or data record was created or changed during the inspection.

The Supabase dashboard is currently blocked by an account verification challenge. The existing Store continues to load in the customer browser. A new relational series table and the owner-requested first series record must not be added until authenticated Supabase access is available to inspect the live schema and apply the migration safely.

## Prepared but not executed

`supabase/resource_series_migration.pending.sql` is an additive migration draft for one optional `resources.series_id` relation and a `selling_option` value. It deliberately preserves the legacy `series_name`, `volume_number`, and `series_order` columns during transition and uses `on delete set null` to prevent deletion of resources when a series is removed. `supabase/rebuilding_my_life_series_seed.pending.sql` defines the requested first series with no member product, no PDF upload, and no preview creation. Neither file has been applied to Supabase.

## Access follow-up — 2026-08-29

The Supabase project Table Editor was briefly visible in the task browser after the owner completed sign-in, but the session redirected back to Supabase sign-in before the SQL Editor could be opened. The verification prompt then reported “Please try again.” No live schema query, migration, table creation, policy change, Series record, resource update, or Storage operation was performed.

## Authenticated schema confirmation and migration retry — 2026-08-29

The owner later authenticated the task browser successfully. Supabase’s live read-only definition confirms that `public.resources` has the expected legacy `series_name`, `volume_number`, and `series_order` fields, but does not yet have `series_id` or `selling_option`. It uses `set_updated_at()` and existing RLS policies. The live data contains the existing resource **The Life My Addiction Built Vs The Life I Want** in the `Life Rebuilding/Personal Growth` category. No resource was changed during inspection.

The first approved migration attempt was rejected by Postgres before execution because the SQL editor input timed out and truncated the original dollar-quoted policy block, producing `ERROR 42601: unterminated dollar-quoted string`. The enclosing transaction was not committed; no Series table, columns, policies, files, or resource records were created or changed. The pending migration was shortened to equivalent idempotent `drop policy if exists` / `create policy` statements before retry.
