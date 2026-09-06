# Manus handoff — minimal-credit deployment

Use the uploaded ZIP as the finished source for the existing Avery Institute website project.

## Required work only

1. Replace the existing project files with the files from this ZIP. Do not redesign, regenerate, refactor, rewrite, or add features.
2. Preserve the existing Supabase project, Stripe connection, environment variables, custom domain, and all stored customer/resource data.
3. Apply these additive Supabase migrations in order:
   - `supabase/migrations/20260904_store_marketing.sql`
   - `supabase/migrations/20260904_reusable_promotion_campaigns.sql`
   - `supabase/migrations/20260904_promotion_controls_reporting.sql`
4. Confirm the existing server variables remain set: `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, and `SITE_URL`.
5. Run the existing TypeScript check, automated tests, and production build. Fix only a blocking deployment/configuration error; do not change working design or behavior.
6. Redeploy the existing website project and keep its current domain.

## One live verification pass

After deployment, verify on one phone-size view and one desktop-size view:

- public Store resources display while signed out;
- a PDF upload auto-fills its editable listing and saved resources paginate six per page;
- the free-packet prompt leads through signup/sign-in to a secure download;
- a custom test campaign can be saved, duplicated, scheduled, activated, and deactivated;
- popup frequency and campaign performance numbers appear in Chapter 21 Offers;
- the consented-contact CSV excludes requests without email consent;
- an eligible discount is recalculated correctly in Stripe checkout and the paid download opens.

If those checks pass, stop. No other changes are authorized.
