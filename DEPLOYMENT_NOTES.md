# Avery Institute — deployment notes

This project contains the Chapter 21 free-signup-packet controls and a reusable promotion campaign manager. The promotion work adds no new coaching products.

Before the new controls are used in production:

1. Apply `supabase/migrations/20260904_store_marketing.sql` to the existing Supabase project. It adds the signup-gift settings and secure free-packet claim log without changing existing resources or private files.
2. Apply `supabase/migrations/20260904_reusable_promotion_campaigns.sql`. It adds saved promotion campaigns, enforces a single live campaign, and creates the public `promotion-assets` bucket for optional banner artwork.
3. Apply `supabase/migrations/20260904_promotion_controls_reporting.sql`. It adds automatic start/end scheduling, popup frequency controls, campaign performance counts, and consent-aware free-packet request details.
4. Keep these server-side environment variables configured in the hosting project:
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `STRIPE_SECRET_KEY`
   - `SITE_URL` (the production website origin)
5. Build and run the project with the existing commands.

The signup gift and promotion campaigns are off by default. After deployment, sign in as the existing Institute administrator, open the Store Resource Manager, and use **Chapter 21 Offers**. Custom is the default campaign style; Summer, Fall, Halloween, Christmas, and New Year are optional visual shortcuts. You can choose 5%, 10%, 25%, 50%, or any custom percentage from 1% through 100%; choose what each discount applies to; customize the message, colors, optional artwork, and button; preview it; save it; duplicate it; schedule start/end times; choose once-per-campaign, daily, or every-new-visit popup frequency; then activate or schedule the one campaign you want visitors to see.

The live campaign appears as a visitor-entry popup across the website and as a banner in the Store. Scheduled campaigns become visible and discount-eligible automatically at their start time and expire automatically at their end time. Eligible PDF discounts are recalculated from the current schedule on the server before Stripe Checkout.

Campaign cards show deduplicated popup views, offer clicks, attributed account signups, and purchases verified when the customer returns to the successful-download page. The free packet remains in private Supabase Storage and is delivered through a time-limited signed link after signup or sign-in. The administrator request list shows who requested it and when. Its CSV marketing export includes only customers who voluntarily selected the optional email-consent checkbox.

Coaching-only promotions display on the selected service and direct visitors to the existing appointment/contact path because the site does not currently publish online coaching prices.
