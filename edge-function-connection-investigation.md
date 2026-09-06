# Edge Function Connection Investigation

## Initial deployed-frontend finding — 2026-08-30

The live canonical page at `https://averyinsti-qnbmu2v8.manus.space/avery-source.html` renders the current standard navigation and Store resource manager surface. The deployed frontend source uses the same Supabase project reference as the current Store code and invokes the existing `generate-resource-preview` function through the Supabase browser client. No code or service configuration was changed during this read-only check.

## 2026-08-30 read-only diagnostics

The authenticated Supabase connector reports the project URL as https://khsanicntfagqjhcdwqs.supabase.co. The active publishable key metadata contains an enabled project-matching key, and the deployed Edge Function list contains ACTIVE `generate-resource-preview`, version 10, with `verify_jwt: true`. The live canonical page configures the same Supabase URL and invokes `supabase.functions.invoke('generate-resource-preview', { body: { resourceId: item.remoteId } })`.

The deployed function code requires a Bearer authorization header, verifies the signed-in user, checks the admin profile, and allows `https://averyinsti-qnbmu2v8.manus.space`, `http://localhost:3000`, and the request origin in CORS response headers. Recent unified function logs contain seven `OPTIONS | 200` requests to the exact `generate-resource-preview` URL; no POST failure appears in the sampled recent records. This proves preflight reaches the function and CORS/OPTIONS is returning 200, but it does not yet prove that a failed POST was logged. The next diagnostic should correlate one browser Network failed request timestamp with function logs and inspect the actual POST status/error before any code edit.

No source code, Edge Function, Storage, database, or preview behavior has been changed during this investigation.

## Correlated publish attempt — 2026-08-30 21:46 UTC

The latest Supabase function-edge record is `POST | 200` at `2026-08-30T21:46:20.791Z` for `generate-resource-preview`, version 10, preceded by `OPTIONS | 200` at `21:46:18.198Z`. The record contains a recognized JWT issuer for this project, `request.sb.auth_user`, JWT role `authenticated`, a session ID, the expected `sb_publishable_...` key prefix, and `supabase-js/2.112.4; runtime=web`. This confirms the production browser sent a valid Bearer session token and the POST reached the deployed function.

The corresponding database read shows resource `369a7f2a-5878-4b08-b400-06aea412f04f`, titled `The Way Forward`, inserted at `21:46:17.700007Z`, is `is_published: true`, has `thumbnail_path: 369a7f2a-5878-4b08-b400-06aea412f04f-full-preview-page-1.jpg`, and has `page_count: 5`; its `updated_at` is `21:46:20.7695Z`. The function-level log for the same boot contains only the runtime warning `Do not use Deno.readFileSync inside the async callback` and no exception. Therefore this correlated Publish-to-Store attempt completed successfully; the previously reported generic “Failed to send a request to the Edge Function” is not reproduced in the available server logs and may have been a prior transient browser-side fetch/session failure. No code has been edited.
