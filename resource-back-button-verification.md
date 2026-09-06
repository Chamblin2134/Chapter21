# Resources Detail Back Button Verification

The actual shared detail renderer is `v10OpenResource()` in `client/public/avery-source.html`, which is used by all 22 Resources prompt cards. The prior top-of-reader control was hidden by the fixed site header in the rendered prompt, so the repaired template now renders exactly one `← Back to Resources` button in `.v10-reader-footer` after the article and aligns it at the bottom right.

Browser interaction verification opened the live local Resources flow, selected **What Addiction Is**, confirmed one visible bottom button with the required text, and clicked it successfully. The reader closed and the 22-card Resources list returned. Captured desktop and 390px phone-sized screenshots show the button after the article source box, above the footer, with high-contrast gold outline styling and no overlap from the fixed header.
