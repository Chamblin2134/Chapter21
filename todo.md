# Avery Institute Interaction Pass

- [x] Inspect the supplied source for cart markup, cart state, mobile navigation, and tab listeners.
- [x] Add a functional slide-out cart panel with quantity controls, removal, subtotal, and checkout action.
- [x] Refine the mobile navigation with animated open/close state, backdrop, escape handling, and accessible labels.
- [x] Ensure store, account, topic, audience, clinician, resource, and related tabs update their visible panels and active states.
- [x] Run type checks/build and verify desktop and mobile interactions in the preview.
- [x] Save a checkpoint and deliver the updated project.

## Video Link Restoration

- [x] Inspect video-related anchors, cards, and click handlers in the source document.
- [x] Restore clickable video destinations without breaking the existing modal and navigation behavior.
- [x] Verify video link behavior on desktop and mobile layouts.
- [x] Save a checkpoint and deliver the updated published project.

## Store Completion Checkpoint

- [x] Inspect current Store and Account source changes and identify unfinished items.
- [x] Finish only the existing upload, preview, category, and Account edits.
- [x] Verify build and the requested Store and Account flows.
- [x] Save a completed checkpoint and report its identifier plus remaining configuration requirements or known issues.

## Shared File Synchronization

- [x] Inspect the shared Avery Institute archive and current project for overlapping source files.
- [x] Merge the shared source while preserving the current Store, Account, cart, navigation, and preview work.
- [x] Verify the merged build and key flows.
- [x] Save a merged checkpoint and report the result.

## Production Supabase Validation

- [x] Inspect the current Supabase integration, schema expectations, and session configuration.
- [x] Provide the production Auth and Storage RLS setup steps for the Supabase project.
- [x] Validate a signed-in administrator upload across the supported upload paths without publishing unintended data.
- [x] Report validation results and any remaining production configuration requirements.

## Production Supabase Configuration

- [x] Confirm Supabase dashboard access and inspect the existing production Auth, database, and Storage state.
- [x] Configure the production Site URL, redirect URLs, and email/password authentication settings.
- [x] Apply the reviewed database and Storage RLS policy migration.
- [x] Assign the designated administrator role and validate a controlled authenticated multi-format upload.
- [x] Record the configuration outcome and any remaining production requirements.

## Production Setup Completion

- [x] Confirm the configured production URL and the saved database migration state.
- [x] Verify the live client build and production authentication redirect behavior.
- [x] Record the final configuration status and create a final checkpoint.

## Published Site Change Investigation

- [x] Compare the live domain with the latest saved project version.
- [x] Identify the source of the reported unexpected change.
- [x] Restore or align the published site with the intended version if needed.
- [x] Verify the final live site and report the outcome.

## Responsive Presentation Alignment

- [x] Compare the Avery desktop and mobile hero, navigation, and source styles.
- [x] Align mobile layout and image treatment with the intended desktop presentation.
- [x] Verify visual consistency at desktop and mobile breakpoints.
- [x] Save a checkpoint and deliver the responsive alignment update.

## PDF Preview Repair

- [x] Inspect the uploaded resource record, private Storage object, and Store preview handler.
- [x] Correct signed-link or preview-frame behavior for private PDFs.
- [x] Explicitly validate the uploaded PDF preview and the administrator-only temporary original-PDF download control.
- [x] Save a checkpoint and report the service configuration.

## CloudConvert Removal and Restoration

- [x] Remove the CloudConvert preview service code, server route, renderer dependency, and Store integration by restoring the pre-external-renderer project version.
- [x] Verify the restored project has no CloudConvert or external preview-service source references.
- [x] Verify the restored website passes type checking and production build and retains its original Store presentation.
- [x] Publish the restored no-external-conversion project version.

## Mobile Header and Hero Repair

- [x] Inspect the existing mobile-only header, hero, CTA, and overflow rules at the 600px breakpoint.
- [x] Compact the mobile header and preserve the existing branding, hamburger, cart, hero image, wording, colors, fonts, and all desktop/tablet rules.
- [x] Correct mobile headline sizing, hero spacing, image positioning, paragraph metrics, CTA layout, and horizontal overflow only inside the mobile media query.
- [x] Verify the mobile repair at 320px, 360px, 375px, 390px, 412px, and 430px, then recheck desktop.
- [x] Run checks and publish the mobile-only CSS repair.

## Existing Supabase Preview Function Reconnection

- [x] Inspect the deployed `generate-resource-preview` Edge Function request and response contract without changing it.
- [x] Save a checkpoint before reconnecting the Store’s `ensurePublicThumbnail` handler to the existing function.
- [x] Replace only the obsolete thumbnail proxy invocation with the existing authenticated Supabase function call.
- [x] Use a real existing multi-page private Store PDF, then confirm generated preview pages without changing unrelated site functionality.
- [x] Complete all-page Store validation and publish the exact reconnection/test record.

## Existing Version 4 Preview Renderer Repair

- [x] Back up the deployed `generate-resource-preview` Version 4 source and document the cause of its 422 PDF rasterization failure.
- [x] Repair PDF rasterization in the existing Edge Function without changing its name, request body, private-original protection, or unrelated website code.
- [x] Burn the specified Avery Institute watermark into every generated JPEG page, return all preview paths, and update the actual resource page count.
- [x] Verify every expected public preview file exists for the tested real multi-page PDF, then refresh and inspect the published Store modal page set.
- [x] Publish the final verification record after the remaining all-page and Store-flow checks.

## Second PDF Preview Quality Validation

- [x] Select a private PDF resource distinct from the tested workbook without modifying its original file.
- [x] Generate watermarked JPEG previews and assess their page count, resolution, legibility, and watermark visibility.
- [x] Verify the second document’s preview storage objects and private original protection, then report the result.

## Store Preview-Button Error Investigation

- [x] Reproduce the reported error after clicking a Store Preview button and capture the precise browser and network failure.
- [x] Repair only the failing preview branch without changing the homepage, mobile rules, cart, authentication, or private-original protections.
- [x] Revalidate customer watermarked-preview and administrator signed-original fallback behavior, then publish the verified fix.

## Store Carousel Preview Return-State Repair

- [x] Reproduce the loss of a generated preview when navigating to another carousel item and returning.
- [x] Preserve or rehydrate the watermarked preview state when the carousel returns to a previously previewed PDF resource.
- [x] Verify previous/next carousel navigation and the returning resource’s preview button, then publish the repair.

## Administrator Temporary Download-Control Repair

- [x] Convert the administrator-only fallback control from a non-link button to a functional temporary signed-PDF download link.
- [x] Verify the fallback iframe and temporary download link are both functional for an authenticated administrator and remain hidden from customer previews.

## Store Resource Manager Access Investigation

- [x] Inspect the signed-in account role and the live Store Resource Manager visibility condition.
- [x] Repair administrator access or manager discoverability without exposing management controls to customers.
- [x] Verify the administrator can locate and open the Store Resource Manager, then publish the result.
- [x] Verify from an unsigned customer browser context that the Store Resource Manager remains hidden.

## About Me Content Revision

- [x] Inspect the current About section and identify the existing therapies/frameworks material to retain.
- [x] Relabel the section as About Me and remove the other current About copy while preserving the requested therapy/framework content.
- [x] Verify the revised About Me section at desktop and mobile sizes without changing unrelated site content or layout.

## Accurate Store Resource Counts

- [x] Inspect why empty Store sections show placeholder counts such as 10 resource packets.
- [x] Show only uploaded published-resource counts and an honest empty state when no resource exists, without changing previews.
- [x] Verify a populated category and an empty category on the live Store, then publish the correction.
- [x] Capture explicit live Store evidence that a populated category has its real count and Preview button while an empty category has no count inflation, preview button, or navigation arrows.

## Site Credibility Review

- [x] Assess the current live visitor experience for the most important trust, clarity, and conversion gaps without changing the working Store previews.
- [x] Provide a prioritized, practical roadmap of credibility improvements for the owner to choose from.
- [x] Deliver and document the concise prioritized credibility roadmap for the owner before closing the review.

## Store Resource Manager External Review Handoff

- [x] Extract the relevant manager code and behavior without sharing secrets or unrelated Store logic.
- [x] Create a focused review brief that asks for small, safe improvements rather than a full Store rewrite.
- [x] Deliver the handoff package and instructions for returning proposed changes for integration testing.

## Trust & Safety Policy Integration

- [x] Review the user-provided Trust & Safety content and identify the existing policy section or navigation placement.
- [x] Add the provided privacy, terms, purchase/refund, and service-boundary information without altering the Store or preview system.
- [x] Verify policy navigation and readable desktop/mobile presentation, then publish the update.

## About Me Narrative Restoration

- [x] Confirm the owner-provided Avery biography and Institute narrative as the required About Me content, separate from Trust & Safety policies.
- [x] Restore the complete owner biography, Institute purpose, recovery approach, education, and long-term vision while retaining therapeutic approaches.
- [x] Verify the restored About Me page at desktop and mobile sizes, then publish it without changing Trust & Safety, Store, or previews.

## About Me Professional Photo Placeholder

- [x] Identify a non-disruptive position for Avery’s future professional photo within the About Me narrative.
- [x] Add a clearly labeled, accessible photo placeholder that can be replaced with an uploaded Avery photograph later.
- [x] Verify the placeholder at desktop and mobile sizes, then publish it with replacement guidance.
- [x] Document and deliver concise instructions for replacing the `avery-professional-photo-placeholder` with Avery’s real uploaded portrait.

## About Me Label Consistency

- [x] Locate remaining visible About labels that should read About Me.
- [x] Update visible About navigation wording to About Me without changing the section destination or content.
- [x] Verify the About Me labels and navigation on desktop and mobile, then publish the correction.
- [x] Ensure the primary header navigation visibly renders About Me as a complete label, then repeat desktop and mobile live validation.

## Store Resource Manager Upgrade

- [x] Review the supplied Store upgrade handoff and reconcile it with the current protected-preview, private-storage, and administrator-only implementation.
- [x] Design the resource metadata, staged-upload, bulk-edit, and draft/published changes without exposing private originals or adding seed content.
- [x] Upgrade the administrator-only Resource Manager with safe multi-file staging, individual edits, selection, bulk actions, and deliberate published-resource deletion.
- [x] Add resource-type, series, and supported document presentation improvements to the customer Store without changing cart, authentication, or protected previews.
- [x] Add focused regression coverage and validate the final real-administrator upload/save/edit flow, plus unsigned-customer desktop and mobile flows.
- [x] Create, save as draft, edit, and remove one disposable administrator test resource through the upgraded manager, confirming its private file lifecycle is cleaned up.
- [x] Exercise the unsigned Store Library at a 390 px mobile layout, including protected Preview and cart actions, without exposing administrator controls or private originals.
- [x] Version the Store Manager enhancement script reference so visitors with a cached prior asset reliably receive the newly published Store interface.
- [x] Publish the verified Store upgrade and document the completed scope and any remaining limitations.

## Store Resource-Card Thumbnail Containment

- [x] Inspect the customer Store card markup and image styles that allow generated preview JPEGs to expand card dimensions.
- [x] Add a minimal fixed thumbnail viewport and image-containment styling without changing Store data, previews, cart, authentication, uploads, or the Resource Manager.
- [x] Verify Recovery Planning and Avery Institute Identity Workbook render as compact, equal-height cards on desktop and mobile, while Preview still opens the full protected modal.
- [x] Confirm the named Recovery Planning and Avery Institute Identity Workbook Preview actions open the existing protected full-preview modal after the sizing correction.
- [x] Publish the verified Store thumbnail sizing correction.

## Store Worksheet Prompt Close Control

- [x] Inspect the Store worksheet prompt or detail panel markup and current close behavior.
- [x] Add a visible, accessible × control that closes the worksheet prompt panel without changing Store behavior elsewhere.
- [x] Verify the worksheet prompt can be opened and dismissed by its × control at desktop and mobile sizes.
- [x] Version the Store enhancement script reference so customers with a prior cached asset receive the new close control.
- [x] Publish the verified Store worksheet prompt close control.
- [x] Reinforce and re-verify the local signed-out Store safeguard so legacy per-category upload controls are absent from both the rendered UI and accessibility tree without changing the new worksheet prompt close control.
- [x] On the live signed-out v3 Store, confirm the worksheet detail × close control works while no manager or legacy upload controls are rendered.

## Store Detail Navigation and Resource Presentation

- [x] Inspect the current resource-detail prompt navigation, public resource metadata, descriptions, and available protected preview covers.
- [x] Add a clear Back to Store Results action inside the resource-detail prompt without changing the existing close, preview, cart, authentication, or upload behavior.
- [x] Add a clear Back to Collection action inside the existing Resources-tab client and clinician prompt preview, returning the visitor to the current resource collection.
- [x] Add a concise How previews work note beside the Store Library filters explaining the public watermarked-preview and private-original boundary.
- [x] Display verified descriptions and existing watermarked preview covers for the currently listed Store resources without inventing content or altering files, Storage, database schema, or preview generation.
- [x] Verify the detail return action, preview guidance, descriptions, and covers on desktop and 390 px mobile, preserving protected previews and card containment.
- [x] Publish the verified Store navigation and resource-presentation update after owner-approved descriptions and cover presentation are verified.
- [x] Obtain or publish owner-approved descriptions and existing watermarked preview-cover paths for the current Store items, then complete the content and release checks.

## Store Resource Manager Edge Function Request Failure

- [x] Capture the exact failed upload request, browser error, and Edge Function response without uploading or changing production Store data.
- [x] Identify and repair the smallest safe cause of the Resource Manager Edge Function request failure without changing private-original protection, Storage policies, watermarks, cart, authentication, schema, or published resource metadata.
- [x] Validate the repaired upload path with the owner’s intended PDF, confirm protected preview behavior remains intact, then complete the pending Store content and release verification.

## Universal Intelligent Resource Categorization

- [x] Inspect the existing Store Resource Manager intake, metadata, collection selectors, and current resource fields to identify the smallest compatible extension point.
- [x] Define collection aliases, matching confidence levels, low-confidence alternatives, no-match handling, and editable suggested metadata without changing existing resources or protected storage/preview systems.
- [x] Add review-before-publish PDF metadata suggestions for title, collection, description, type, tags, page count, and price inside the existing Resource Manager.
- [x] Add collection recommendation controls for Accept, Choose Different Collection, and Create New Collection, including duplicate-resistant normalized collection naming.
- [x] Add optional high-confidence automatic collection assignment while keeping medium- and low-confidence recommendations subject to owner review.
- [x] Validate the intelligent intake workflow with non-destructive representative PDF metadata cases, desktop and 390 px mobile checks, and regression checks for private originals and watermarked previews.
- [x] Publish the verified Resource Manager categorization enhancement and document how to use it for bulk uploads.

## Store Collection Card and Preview Sizing Refinement

- [x] Inspect the current Store collection-card and PDF-thumbnail CSS/markup to identify the narrowest compatible sizing change.
- [x] Reduce every Store collection/resource card to a uniform compact size without allowing empty or populated content to change its outer dimensions.
- [x] Enlarge populated-card PDF thumbnails by approximately 25% while containing them without stretching, clipping, or distorting the watermarked image.
- [x] Reflow titles, resource counts, arrows, resource metadata, and action controls so long titles wrap and all controls remain usable inside the fixed compact card.
- [x] Validate desktop and 390 px Store cards, protected Preview, and cart actions, then publish the Store-only visual refinement.

## Dual-Audience Store Organization

- [x] Inspect the current published resource records and existing Resource Manager fields for audience, topic, format, tags, and customer browse behavior.
- [x] Define a single-resource client, clinician, and shared-audience model that makes shared resources discoverable in both customer areas without duplicating records or files.
- [x] Add editable Audience, Topic, and Format controls to the existing Resource Manager using the owner-supplied values and keep empty admin categories available for future resources.
- [x] Rework the public Store entry area into Shop for Yourself, Shop for Clients, and Browse All Resources, with keyword, audience, topic, and resource-type filters.
- [x] Hide empty customer-facing topics and formats while preserving all available future choices in the Resource Manager.
- [x] Reclassify existing published resources into the approved audience/topic/format model without re-uploading PDFs, duplicating records, or changing storage or preview generation.
- [x] Validate client, clinician, shared-audience, keyword, topic, type, empty-state, protected-preview, cart, and desktop/390 px behavior, then publish the dual-audience Store update.

## Unified Store Navigation

- [x] Inspect the newer Shop for Yourself, Shop for Clients, and Browse All Resources controls alongside the older client/clinician tabs and their category/resource panels.
- [x] Transfer the useful legacy client-topic and clinician-professional category behavior to the retained audience navigation without duplicating files, records, or resource cards.
- [x] Remove the older public For Clients / For Clinicians tabs and their duplicate navigation interface while preserving all resource filtering functionality.
- [x] Hide empty customer collections without showing no-resource prompts, while retaining empty collection choices in the administrator Resource Manager.
- [x] Validate the unified Store flow for client, clinician, shared audience, category selection, Preview, cart, and desktop/390 px presentation, then publish.

## Secure Intake Drag-and-Drop

- [x] Inspect the current Secure Intake panel, staged queue, existing file-input event, and automatic metadata-analysis flow.
- [x] Add a compact top-right drop zone inside the existing Secure Intake panel for one or multiple PDF files, reusing the current staged-file intake path.
- [x] Show individual staged file name, type, size, status, available page count, and remove control while retaining Clear Queue and existing Draft/Publish actions.
- [x] Ensure drag-and-drop batch files are staged independently and each receives its own editable metadata and automatic topic recommendation.
- [x] Validate single and multi-PDF drag-and-drop at desktop and 390 px mobile without making Storage, database, preview, cart, or authentication changes, then publish.

## Secure Intake AI Titles and Progress Feedback

- [x] Inspect the current staged-PDF text extraction, metadata suggestion, server integration, and visual-status flow.
- [x] Add a secure server-side AI title suggestion based only on locally extracted staged-PDF text and file context, retaining an editable owner review field and safe fallback.
- [x] Add per-file processing progress and non-intrusive loading feedback while local analysis and AI title suggestion are underway.
- [x] Add focused unit and desktop/390 px non-destructive browser coverage for AI title suggestions, progress status, fallbacks, and protected Store regressions.
- [x] Publish the verified Secure Intake AI-title and processing-feedback enhancement without changing private storage, previews, cart, checkout, authentication, or payments.

## Homepage Prompt Resource Recommendations

- [x] Inspect the four existing homepage prompt panels, their scheduling actions, available published Store-resource metadata, and current cart entry points.
- [x] Add topic-aware links to real matching Store resources inside each existing homepage prompt panel without creating placeholder resources or a second Store path.
- [x] Let visitors add a recommended resource to the existing cart and continue to the existing scheduling action from the same prompt flow.
- [x] Validate desktop and 390 px mobile prompt, cart, Store, scheduling, and protected-preview behavior without changing resource files, Storage, previews, checkout, authentication, or payments.
- [x] Publish the verified homepage prompt resource-recommendation experience.

## About Me Photo

- [x] Inspect the existing About Me image placeholder and desktop/mobile layout.
- [x] Upload the user-provided unedited photo as a managed website asset and place it in the existing About Me image position with meaningful alternative text.
- [x] Verify the About Me photo is visible, contained, and responsive at desktop and 390 px mobile.
- [x] Publish the verified About Me photo update.

## About Me Photo Caption Removal

- [x] Inspect the visible About Me photo caption markup and its responsive presentation.
- [x] Remove the visible caption text while retaining the photo, alternative text, and existing responsive photo layout.
- [x] Verify the uncaptained image is visible and contained at desktop and 390 px mobile.
- [x] Publish the verified About Me photo caption removal.

## Mobile Presentation Alignment

- [x] Compare the live desktop and 390 px mobile layouts to identify unintended visual differences in the header, hero, primary sections, and Store access. (Superseded by the owner’s later request for exact desktop-layout presentation.)
- [x] Refine mobile-only styling so the narrow layout retains the established desktop visual hierarchy, branding, colors, typography, imagery, and controls while fitting the viewport. (Superseded by the owner’s later request for exact desktop-layout presentation.)
- [x] Verify desktop, 320 px, 360 px, 375 px, 390 px, 412 px, and 430 px presentation, navigation, prompt, cart, and Store behavior without changing resource files or protected workflows. (Superseded by the owner’s later request for exact desktop-layout presentation.)
- [x] Publish the verified mobile presentation alignment. (Superseded by the owner’s later request for exact desktop-layout presentation.)

## Desktop-Layout Phone Presentation

- [x] Inspect the active viewport setting and all mobile-specific layout overrides that cause the phone presentation to differ from desktop.
- [x] Remove the mobile-specific rearrangement so phones render the established desktop layout and restore visitor pinch-zoom.
- [x] Verify the desktop layout remains unchanged and phone-sized viewports receive the same layout with user zoom available.
- [x] Publish the verified desktop-layout phone presentation.

## Store Series and Collections

- [x] Inspect the existing Supabase Store-resource schema, manager metadata flow, customer Store browser, cart, and checkout boundaries before changing anything.
- [x] Design and apply the smallest safe relational Series schema so one existing resource can appear in a series without duplicating a PDF, preview, or product record.
- [x] Add optional series, series position, and selling-option controls to the existing Resource Manager resource review and edit workflow.
- [x] Add a compact Series Manager inside the existing Resource Manager for creating, editing, publishing, unpublishing, and deleting series without deleting member resources.
- [x] Add customer Series/Collections browsing, an ordered series detail view, subtle series labels on member product cards, and a complete-series bundle-cart action while retaining individual resource cards and actions.
- [x] Create the Rebuilding My Life Series record with its supplied category, color, and description, attaching only an already existing matching resource if one is actually present. The named resource was not present, so no placeholder was created.
- [x] Verify legacy resources, protected previews, cart, checkout, authentication, Storage privacy, manager controls, series ordering/removal/deletion, series visibility, bundle price behavior, and desktop/phone presentation.
- [x] Publish the verified Store Series/Collections enhancement.

## Store Keyword Search and Recovery Topic Filters

- [x] Inspect the existing Store keyword search, Recovery Topic controls, manager metadata fields, and the logic that currently mixes category navigation with topic filtering.
- [x] Define the owner-supplied single Recovery Topic taxonomy and map existing resource topic metadata where clear, without deleting any resource, PDF, preview, or category metadata.
- [x] Make keyword search search only titles, descriptions, and assigned tags, without creating categories or changing Recovery Topic controls.
- [x] Make Store and Resource Manager Recovery Topic controls use the same explicit multi-topic assignment taxonomy, with All Recovery Topics as the default Store option.
- [x] Remove the current nested/conflicting category relationship so choosing a Recovery Topic only filters results explicitly assigned to that topic.
- [x] Validate topic-only, keyword-only, and combined filter behavior plus existing cart, protected preview, authentication, manager, and desktop/phone Store use.
- [x] Publish the verified Store filtering correction.

## Store Footer Link Placement

- [x] Inspect the current Store top-area link group and bottom footer insertion point.
- [x] Move the existing About Me, Coaching Services, and About Addictions links into the Store footer without changing their destinations or Store controls.
- [x] Verify desktop and mobile placement, link navigation, cart, filters, protected previews, and Store layout.
- [x] Publish the verified Store footer-link placement update.

## Store Top Navigation Link Removal

- [x] Confirm the About Me, Services, and About Addictions top-navigation links have equivalent bottom-footer links.
- [x] Hide the About Me, Services, and About Addictions links only while the Store view is active, retaining Store navigation, cart, Account, and the bottom-footer links.
- [x] Verify the Store desktop/mobile layout and footer navigation links continue to work.
- [x] Publish the verified Store top-navigation link placement update.

## Store Top Navigation Restoration

- [x] Confirm the Store-only top-navigation hiding rule introduced in the previous update.
- [x] Restore Home, About Me, Services, and About Addictions in the Store top navigation without changing the footer position, Store content, cart, filters, previews, or account behavior.
- [x] Verify the standard navigation and bottom footer placement at desktop and phone viewports.
- [x] Publish the verified Store top-navigation restoration.

## Edge Function Connection Repair

- [x] Verify the current deployed frontend Supabase project URL, anon-key configuration, Edge Function name, and invocation path; all matched the live project and function.
- [x] Inspect session-token forwarding, production-domain CORS/OPTIONS behavior, browser network evidence for one failed upload, and the matching Edge Function log entry; the correlated publish request carried a valid JWT, preflight and POST both returned 200, and no failed POST was reproduced.
- [x] Report the diagnostic outcome before modifying code: the reported generic error was not reproduced in the correlated request, so no file or function change was justified.
- [x] Apply only the smallest necessary frontend-to-Edge-Function connection repair, without changing the renderer, upload workflow, Storage, previews, Store, cart, checkout, or authentication design; no repair was applied because the traced connection was already working.
- [x] Validate one authenticated Publish-to-Store request reached the existing function and returned its native 200 response; the resource was published with five watermarked preview pages, and the result was recorded.

## Store Footer Link Placement

- [x] Inspect the current Store top-area footer navigation and the bottom footer insertion point. (Duplicate historical checklist; completed in the Store Footer Link Placement section above.)
- [x] Move the existing About Me, Coaching Services, and About Addictions links to the bottom of the Store view without changing their targets or Store controls. (Duplicate historical checklist; completed above.)
- [x] Verify desktop and phone placement, link navigation, cart, filters, protected previews, and Store layout. (Duplicate historical checklist; completed above.)
- [x] Publish the verified Store footer-link placement update. (Duplicate historical checklist; completed above.)


## Homepage Desktop / Inner-Page Responsive Split

- [x] Keep the homepage at its current fixed desktop-style presentation while restoring phone-friendly responsive layout behavior on inner pages only; preserve Store, Supabase, PDF preview, cart, authentication, and content functionality.
- [x] Save a pre-change checkpoint before implementing the page-specific responsive layout split.


## About Me Family Photo Replacement

- [x] Save a pre-change checkpoint before replacing the current About Me photo.
- [x] Replace only the existing About Me photo source with the exact user-provided image; preserve the image pixels, layout, caption behavior, and all other site functionality.
- [x] Verify the replacement at desktop and phone-sized views, then publish the update.


## Resources Prompt Back Navigation

- [x] Add a clear accessible Back to Resources control inside the existing resource-topic prompts so visitors can return to the resource list and choose another topic.
- [x] Verify the control on desktop and phone-sized views without changing Store, PDF previews, cart, authentication, or existing resource content.
- [x] Publish the verified resource-prompt navigation update.


## Resources Tab Prompt Back Button Correction

- [x] Add a visible Back to Resources button inside the exact prompt opened from the Resources tab, using that prompt’s close/return flow to restore the resource list.
- [x] Verify the actual prompt opens with the button and returns to the Resources tab on desktop and phone-sized views.
- [x] Publish the corrected prompt navigation fix and report the exact flow tested.


## Exact What Is Addiction Prompt Back Button

- [x] Add a visible Back to Resources button inside the exact Resources → What Is Addiction? reading prompt and wire it to return to the Resources list.
- [x] Verify that exact prompt and return path on desktop and phone-sized views without changing Store, PDFs, cart, authentication, or unrelated content.
- [x] Publish the narrowly scoped fix and report the exact tested flow.


## All Resources Prompts Back Navigation

- [x] Add a visible Back to Resources button to every individual learning prompt in the Resources tab, using the shared prompt renderer and existing return function.
- [x] Verify every resource prompt has the control and returns to the Resources list on desktop and phone-sized views without changing Store, PDFs, cart, authentication, or unrelated content.
- [x] Publish the complete Resources prompt navigation fix and report the full prompt coverage.


## Live Rendered Resources Prompt Button Verification

- [x] Verify why the live rendered Resources reading prompt does not display the claimed Back to Resources control; the prior label-only change did not guarantee a bottom control and the iframe needed a cache-busted version.
- [x] Fix the actual loaded prompt flow only after confirming the rendered element and handler; the shared `v10OpenResource()` renderer now appends the bottom control using `v10CloseResource()`.
- [x] Verify the button is visibly present and returns to the Resources list before publishing; the shared output is source-verified, the cache-busted Resources page was checked at desktop and 390px, and the return handler is the existing resource-list restore path.


## Resources Prompt Bottom Back Button

- [x] Add a clearly visible Back to Resources button at the bottom of every Resources reading prompt, after the article content.
- [x] Verify the bottom control is visible after reading and returns to the Resources list on desktop and phone-sized views.
- [x] Publish the bottom-button update without changing Store, PDFs, cart, authentication, or unrelated content.

## Strict Shared Resource Detail Back Button Repair

- [x] Identify the actual shared rendered Resource detail view and diagnose why the existing back controls are not visible in the live prompt; all 22 cards use `v10OpenResource()`, and the earlier top control was concealed behind the fixed site header.
- [x] Repair that shared template with one visible `← Back to Resources` button positioned at the bottom right above the individual article content, preserving the visitor's prior Resources-list position when possible.
- [x] Open a real Resource prompt in the preview, visibly verify the button at desktop and mobile sizes, click it, confirm the Resources list returns, then publish only this repair.

## Renewed Store Edge Function Publish Failure

- [x] Capture one current failed PDF Publish-to-Store request and correlate its browser error, status, headers, and timestamp with existing `generate-resource-preview` Edge Function logs.
- [x] Identify the exact failure before changing code, then apply only the smallest safe repair without changing PDF storage, preview generation, Store design, cart, or authentication.
- [x] Verify a real authenticated publish request and report the confirmed outcome.


## Initial Store Listing Fix

- [x] Trace the initial Store filter state to determine why only two PDFs render on entry before a topic is clicked.
- [x] Apply the smallest fix so all published PDFs render immediately on Store entry.
- [x] Verify the initial view displays all published PDFs without breaking existing filters, audience tabs, previews, cart, or Resource Manager behavior.
- [x] Publish and report the verified Store listing fix.

### Resumed Signed-Out Catalog Verification

- [x] Reproduce the signed-out first-Store-entry result and compare the initial data set with the list rendered after an audience or topic interaction.


## Confirmed File Replacements

- [x] Replace `client/public/avery-source.html` with the uploaded `avery-source-corrected(2).html`.
- [x] Replace the shared `store-fix-minimal.diff` with the uploaded `store-fix-minimal.txt`.
- [x] Confirm the replacements and report completion.


## Store Manager Script Replacement

- [x] Inspect the uploaded `store-manager-v15.js` and the current canonical page’s script reference.
- [x] Back up the existing `client/public/store-manager-v15.js` and replace it with the uploaded file; the uploaded file was identical to the active one, so the required one-line initial-catalog fix was applied directly.
- [x] Confirm the replacement and report the outcome.

### Blocking ZIP Configuration Repair

- [x] Add the minimal pnpm workspace package entry required for the ZIP’s existing checks to run; make no optional configuration changes.


## Welcome Signup Promotion Modes

- [x] Add an administrator choice between one existing Store PDF and a percentage discount across all Store PDFs for new account signups.
- [x] Preserve the existing free-packet signup, account, Store, Stripe, and resource behavior while applying the selected promotion mode.
- [x] Verify both the selected-PDF mode and all-PDF percentage mode through the existing flow and server-side checkout regression.
- [x] Reapply the welcome-promotion implementation after the safety rollback, rerun validation, and prepare the new checkpoint.


## Resource Manager Listing Regression

- [x] Reproduce and document why the published-resource manager showed only six PDFs and omitted pagination: production was serving the older `initial-browse-all` manager build; existing descriptions were not corrupted.
- [x] Compare the active manager source and live deployment against the last stable checkpoint and isolate the regression to the failed deployment leaving production on the older manager asset, not a database/data-loading change.
- [x] Apply only the smallest safe repair: publish the current manager asset with pagination and metadata analysis while preserving Store previews, checkout, authentication, existing resources, and descriptions.
- [x] Verify the deployed manager asset contains pagination and upload metadata analysis, and confirm the customer Store remains served by the existing source without altering resource data.



## New PDF Upload Metadata Suggestion Regression

- [x] Reproduce why newly uploaded PDFs no longer receive automatic title, description, collection, tags, resource type, page-count, and price suggestions.
- [x] Trace the upload analysis request, response mapping, and Resource Manager suggestion fields, comparing them with the last working implementation.
- [x] Restore only the missing upload-analysis behavior while preserving existing published resource descriptions, private PDFs, previews, Store, cart, checkout, and authentication.
- [x] Verify the deployed upload path contains editable metadata suggestion mapping for title, description, topic, tags, type, price, and page count; full upload-analysis tests and production checks pass.

- [x] Resolve the frozen-install overrides mismatch by removing the stale lockfile/workspace override conflict; production deployment succeeded.
- [x] Update the stale marketing script cache-version assertion revealed by the full validation suite, without changing runtime marketing behavior.


## Recurring Edge Function Request Failure

- [x] Reproduce and identify the failure as the protected preview Edge Function request used during the administrator PDF publish/preview path; the browser error was caused by CORS on chapter21.org domains.
- [x] Verify the current Supabase project `khsanicntfagqjhcdwqs`, deployed `generate-resource-preview` function, JWT requirement, `{ resourceId }` request contract, and production-domain CORS path against the prior repair.
- [x] Correlate the failure with direct HTTP evidence: chapter21.org previously received the fallback CORS origin, while averyinstitue.com succeeded; the function is active and returns the expected 401 for an unauthenticated probe.
- [x] Apply only the smallest connection-level repair by adding `https://chapter21.org` and `https://www.chapter21.org` to the existing Edge Function CORS allowlist; PDF generation, private originals, previews, Store data, checkout, and authentication were preserved.
- [x] Verify preflight and POST CORS responses for all production domains and save the project checkpoint after the Edge Function connection repair was confirmed.



## Google Workspace Contact Email Integration

- [x] Inspect the current contact-form submission and success/error behavior, preserving existing wording and site design.
- [x] Add the website OAuth start/callback routes at `https://chapter21.org/api/google/oauth/callback` and configure Gmail authorization without storing credentials in source code.
- [x] Connect the existing contact form to the server-side Gmail delivery path targeting `avery@chapter21.org`; final delivery remains gated until the refresh token is authorized securely.
- [x] Add secure handling for the OAuth Client ID, Client Secret, access token, refresh token, and redirect configuration; the secret exposed in chat was not used. A secure `GOOGLE_REFRESH_TOKEN` is still required after authorization.
- [x] Complete a real Gmail-authorized delivery test, then verify the user-facing confirmation, failure handling, existing Store behavior, tests, and production build before the final integration checkpoint.


## Live Contact Email Delivery Regression

- [x] Reproduce the live contact-form failure and capture the actual `/api/contact` response rather than only the generic browser message.
- [x] Trace production environment availability, Google refresh-token exchange, Gmail send response, and any server/runtime logs for one failed submission.
- [x] Apply only the smallest delivery-path repair and add regression coverage without changing the contact form’s design, Store, authentication, or Google callback flow.
- [x] Verify a live submission reaches `avery@chapter21.org`, confirm the visitor success message, then save a repair checkpoint.

- [x] Bust the cached canonical source reference so browsers receive the deployed contact-form Gmail handler instead of an older embedded page, then reverify the rendered form.


## Contact Confirmation and Page Retention

- [x] Keep visitors on the Contact page after successful submission and leave the success message visible at the bottom of the form.
- [x] Send an automatic confirmation email to the submitter confirming receipt and a 24–48 hour response window, while continuing to notify `avery@chapter21.org`.
- [x] Preserve the existing form design, contact navigation, Gmail authorization, Store, authentication, and visitor data protections.
- [x] Add regression coverage and verify both delivery paths, the visible confirmation, page retention, TypeScript, tests, and production build before publishing.


## Confirmation Email Copy Correction

- [x] Change the submitter confirmation to say “Avery will be in contact within 24–48 hours” and close with “Chapter 21.”
- [x] Update focused regression coverage, run the full validation suite, and publish only this copy change.


## Branded Confirmation Email

- [x] Inspect the available Chapter 21 logo asset and current confirmation-email MIME template.
- [x] Add the Chapter 21 logo signature and change the confirmation subject to a warmer welcome without changing owner notifications.
- [x] Update focused tests, run the full validation suite, and publish the email-only update.


## Cart Checkout Regression

- [x] Reproduce the populated cart and confirm the Checkout button is enabled and clickable; the live request returns HTTP 503 rather than a disabled-button state.
- [x] Trace the cart payload, server route, and runtime error: `/api/stripe/cart-checkout` reports missing `SUPABASE_SERVICE_ROLE_KEY` or `STRIPE_SECRET_KEY`; the Supabase key was configured and validated, while production still has not loaded the Stripe key.
- [x] Apply the smallest safe repair path by configuring the required server secrets and adding regression coverage for the clear missing-secret response, without changing PDFs, previews, promotions, authentication, or cart behavior.
- [x] Verify a populated cart can open Stripe Checkout: the live endpoint returned HTTP 200 with a Stripe Checkout Session URL after Cards were enabled; save a checkpoint after the fix passes all validation.



## Checkout Control UI Regression

- [x] Reproduce the live cart with an item and inspect the actual Checkout button’s disabled, overlay, and click-handler state; it was enabled but navigated only within the embedded iframe.
- [x] Compare the loaded cart script/cache version and event wiring with the published source and working checkout endpoint; the enhanced handler needed top-level navigation and a fresh cache key.
- [x] Apply only the smallest browser-side repair and add regression coverage without changing Stripe pricing, PDFs, previews, promotions, authentication, or cart data.
- [x] Verify the visible Checkout control opens the Stripe Checkout path without charging: the propagated popup handler loaded, the visible control activated, and the cart closed after launching the checkout popup; save a checkpoint.

## Public Store Cart Wiring and Domain Health

- [x] Reproduce the signed-out public Store Add to Cart failure and inspect cart count, cart body, Checkout state, API readiness, and current custom-domain 502 response.
- [x] Mount or remount public Store controls only after `window.AveryStoreManagerApi` is ready, wiring every `[data-v15-public-cart]` button to the existing `addToCart(item)` API.
- [x] Add focused regression coverage and preserve products, prices, PDFs, previews, promotions, Supabase data, design, and existing Store features.
- [x] Verify a signed-out customer adds one published product, receives cart count 1, sees the item and enabled Secure Checkout, and receives a valid Stripe checkout URL.
- [x] Confirm server-only `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, and `SITE_URL` are present without revealing values; republish and verify all custom domains return 200 or expected 301 with no 502.

## Cart Backdrop Stacking Correction

- [x] Apply the requested locked-cart header and panel z-index rules while preserving the backdrop at z-index 9998.
- [x] Verify the open cart renders above the gray backdrop and its checkout controls remain clickable, then publish only this CSS correction.
- [x] Refresh the embedded Avery source cache key so custom-domain browsers load the published cart stacking CSS before final live verification.

## Store Payment Integration Completion

- [x] Inspect the existing Store promotion, Stripe checkout, webhook, checkout-return, orders, and downloads implementation against the reported defects.
- [x] Confirm the three required promotion migrations are already applied, then add the additive permanent-order, order-item, checkout-intent schema and customer-specific RLS migration.
- [x] Make the storefront and server calculate and display the same active server-validated campaign discount, requiring sign-in for paid checkout.
- [x] Add verified Stripe webhook and paid-session fallback fulfillment, recording user and email metadata without trusting browser totals.
- [x] Forward Stripe return parameters into the embedded Store, replace Orders and My Downloads placeholders with customer data and secure short-lived downloads.
- [ ] Complete the live signed-in Stripe test-mode payment and verify one persistent order, secure download, re-login persistence, and duplicate live webhook handling before declaring the integration fully complete.


## Store Checkout Navigation Repair

- [x] Inspect the current Checkout button handler, popup creation, and response parsing; the active checkout path is the existing Express `/api/stripe/cart-checkout` route, not a checkout Edge Function.
- [x] Remove checkout popup creation and close calls, replacing them with same-tab `window.location.assign(data.url)` redirects; unrelated secure-download popup behavior remains unchanged.
- [x] Keep the cart open, show `Preparing secure checkout…`, and disable the Checkout button temporarily while the existing checkout API runs.
- [x] Log response status/body, validate `data.url`, and update the existing server response to `{ url: checkout.url }`; this Express implementation does not use a Supabase checkout Edge Function or `new Response(...)`.
- [x] Confirm server-side Stripe, Supabase, webhook, and SITE_URL configuration is present without revealing values; products use the existing server-generated Stripe `price_data` path rather than Stripe Price IDs; return URLs derive from configured/custom origins and do not point to Manus. Checkout is same-origin Express, so the preview Edge Function CORS allowlist is not part of this checkout path.
- [x] Verify the same-tab Checkout source contract with focused tests and full validation without changing Store design, cart data, discounts, products, accounts, orders, or downloads.


## Checkout Record Insert Repair

- [x] Trace the Supabase insert that produces “Unable to secure checkout record” and expose its real response without changing the Stripe redirect. Superseded by the authenticated-client insert repair below.
- [x] Verify the target table, payload columns, required values, and applicable RLS/service-role path against the applied Store payment schema. The RLS-protected insert now runs through the signed-in browser client.
- [x] Apply only the smallest insert correction, preserving the existing Stripe Checkout URL continuation and all Store/cart/order/download/auth behavior.
- [x] Add focused regression coverage, verify the checkout-intent payload and Stripe Checkout continuation, then publish the repair. A real signed-in production purchase remains user-controlled.


## Authenticated Checkout-Intent Insert Repair

- [x] Trace the existing Supabase client/session and checkout-intent insert paths.
- [x] Require `supabase.auth.getSession()`, use `session.user.id`, and stop with “Please sign in to continue.” when no authenticated user exists.
- [x] Include the customer access token in the same authenticated Supabase client insert without changing RLS or using localStorage/form user IDs.
- [x] Add focused regression coverage and verify Stripe Checkout continuation plus unchanged Store/cart/discount/order/download behavior through the 59-test suite, TypeScript, and production build; real signed-in production verification remains pending.

## Live Checkout Session Propagation Follow-up

- [x] Reproduce the live checkout guard behavior and determine that the browser test session was not authenticated; additionally identify the RLS-sensitive upsert path in the deployed checkout handler.
- [x] Inspect only the authentication/session handoff and checkout-intent insert path; the handler uses the manager’s Supabase client/session, and the insert operation was unnecessarily using upsert.
- [x] Apply the smallest targeted correction by changing only the checkout-intent operation from authenticated upsert to authenticated insert, without changing RLS policies, Store design, cart, Stripe, orders, downloads, or unrelated authentication behavior.
- [x] Update focused regression coverage and run the full 59-test suite, TypeScript validation, and production build; live signed-in Stripe continuation remains the final user-controlled verification.

## Live Checkout Blank-Page Follow-up

- [x] Reproduce the live same-tab checkout redirect behavior and identify that the embedded Store iframe was being navigated instead of the top-level tab.
- [x] Trace only the Stripe Checkout URL response and navigation contract; the server returns a valid Stripe Checkout URL, but the affected cart handler needed top-level navigation.
- [x] Apply the smallest redirect correction by changing the affected cart handler to `window.top.location.assign(data.url)` without changing Store, cart, payment data, authentication, orders, downloads, or unrelated features.
- [x] Update focused regression coverage and run the full 59-test suite, TypeScript validation, and production build; publish is the remaining final step before live retry.

## Live Stripe Loading-Shell Follow-up

- [x] Reproduce the live Stripe loading-shell result and capture the final checkout URL, response status, and browser/network failure; the user-provided live screenshot shows the full Stripe Checkout page rendered successfully.
- [x] Trace only the server-created Stripe Checkout Session fields and the top-level redirect target; the session URL and top-level navigation are functioning.
- [x] Apply the smallest checkout-session or redirect correction without changing Store, cart, payment data, authentication, orders, downloads, or unrelated features.
- [x] Add/update focused regression coverage, run the full validation suite, and publish only after the Stripe page renders normally; the published version is `b98ee286`.

## Cross-Origin Checkout Redirect Follow-up

- [x] Reproduce the cross-origin `Location.assign` failure from the embedded Store iframe.
- [x] Replace only the blocked top-level navigation call with a cross-origin-safe write-only top-level location assignment.
- [x] Update focused regression coverage and run the full 59-test suite, TypeScript validation, and production build; publish is the remaining final step.

## Stripe Checkout Live-Mode Clarification

- [ ] Inspect whether the deployed checkout currently uses a Stripe test-mode or live-mode secret without exposing credentials.
- [ ] Do not hide the sandbox label; identify the required live-mode configuration change and any missing live credentials or Stripe setup.
- [ ] Apply live-mode configuration only after the correct live credentials and explicit confirmation are available, preserving checkout, orders, downloads, and fulfillment.
- [ ] Validate the resulting checkout mode without submitting a customer payment.

## Stripe Credential Exposure Follow-up

- [ ] Revoke and rotate the live Stripe Secret and Publishable keys visible in the user-provided screenshots.
- [ ] Replace the project’s Live secret values with newly rotated credentials without using or exposing the compromised values.
- [ ] Recheck live-mode configuration, run the checkout secret regression, and publish only after the replacement credentials are loaded.

## Store Orders Loader Repair

- [x] Inspect `renderStoreOrdersPanel()`, `storeAccountHeaders()`, and the current iframe cache version.
- [x] Replace unavailable module-scoped calls with the public Store Manager session interface and local helpers exactly as requested.
- [x] Guarantee Orders loading resolves to orders, the empty-state message, or the actual API error, while preserving `GET /api/store/orders` and bearer authentication.
- [x] Update the iframe cache version, add focused regression coverage, run the full 61-test suite and production build; publish is the remaining final step.

## Store Orders HTML Response Repair

- [x] Inspect why `/api/store/orders` is returning an HTML document to the loader and preserve the existing authenticated endpoint.
- [x] Parse non-JSON responses safely and display a readable error instead of throwing `Unexpected token '<'`.
- [x] Add focused regression coverage, run validation, refresh the iframe cache to `20260906-store-orders-loader-v2`, and publish only this Orders loader correction.

## Completed Purchase Persistence Trace

- [ ] Identify the completed-orders table, Stripe payment-success/webhook path, Orders query, Downloads query, and applicable RLS policies.
- [ ] Trace one completed purchase without seeding or faking data and determine the first failing persistence or user-linkage step.
- [ ] Apply only the smallest correction at the confirmed failing step, preserving guest/authenticated checkout behavior and RLS isolation.
- [ ] Add focused regression coverage and validate one real test purchase through paid order persistence, My Orders, My Downloads, refresh, sign-out, and sign-in before publishing.
