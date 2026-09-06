# Store Series/Collections Verification Notes

## Visual baseline — 2026-08-29

Desktop and 390 × 844 direct Store reviews confirm the current customer Store remains visually intact after the Series capability was added. The new **Rebuilding My Life Series** record is intentionally draft-only and has zero members because the specifically named requested workbook does not exist in the Store; therefore no Series card is shown to customers and no placeholder resource was created. The existing public Store, cart entry, primary navigation, and protected preview presentation remain available.

## Non-destructive customer Series regression — 2026-08-29

The deterministic browser regression uses a temporary in-memory three-resource test collection and intercepts only the Series table’s public read. At 1280 × 720 and 390 × 844 it verifies a published Series card, a correctly ordered member list, and the visible **Add Complete Series** action. The bundle adds only the two bundle-eligible resources to isolated cart storage and excludes the individual-only member. The live database, product records, private files, previews, and customer cart remain unchanged by this regression.

## Live schema and final validation — 2026-08-29

The additive `resource_series` relation is live. It adds a Series table and optional resource relationship without copying or moving any existing PDF, preview, or Store product. The verified **Rebuilding My Life Series** record is present as a draft with its approved Chapter 21 brand, Responsibility & Personal Growth category, supplied description, no bundle price, and zero members. The specifically named first workbook was not found, so no resource was fabricated or attached.

JavaScript syntax checks and focused Store/taxonomy regressions passed (18 tests). The Series browser regression passed at 1280 × 720 and 390 × 844. Existing signed-out protected-preview/cart, dual-audience browsing, Recovery Topic filtering, and homepage prompt-to-cart browser checks passed. Type checking and the production build completed successfully. The only non-blocking build notice is the pre-existing Vite warning about a JavaScript chunk exceeding 500 kB after minification.
