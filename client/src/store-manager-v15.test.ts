import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
  resolve(import.meta.dirname, "../public/store-manager-v15.js"),
  "utf8"
);
const canonicalSource = readFileSync(
  resolve(import.meta.dirname, "../public/avery-source.html"),
  "utf8"
);
const previewFunctionSource = readFileSync(
  resolve(
    import.meta.dirname,
    "../../supabase/functions/generate-resource-preview/index.ts"
  ),
  "utf8"
);
const secureTitleSource = readFileSync(
  resolve(import.meta.dirname, "../../server/secure-intake-title.ts"),
  "utf8"
);

describe("Store Manager v15 safety and workflow", () => {
  it("keeps originals private and uses the existing watermarked-preview contract", () => {
    expect(source).toContain("from('resource-files').upload");
    expect(source).toContain(
      "functions.invoke('generate-resource-preview', { body: { resourceId: row.id } })"
    );
    expect(source).toContain(
      "from('resource-thumbnails').remove(previewPaths)"
    );
    expect(source).not.toContain("getPublicUrl(storagePath)");
    expect(source).toContain(
      "update({ is_published: false }).eq('id', row.id)"
    );
  });

  it("provides a staged draft workflow before publication", () => {
    expect(source).toContain(
      "Nothing is uploaded or published when files are selected."
    );
    expect(source).toContain("Save selected as Draft");
    expect(source).toContain("Publish selected");
    expect(source).toContain("× Remove");
    expect(source).toContain("Apply to selected");
    expect(source).toContain("Duplicate");
    expect(source).toContain(
      "window.addEventListener(STORE_MANAGER_READY_EVENT, () => {"
    );
  });

  it("adds a compact PDF drop zone that reuses independent staged-draft analysis", () => {
    expect(source).toContain('id="v15DropZone"');
    expect(source).toContain("Drag &amp; Drop Resources Here");
    expect(source).toContain("Drop one or multiple PDF files");
    expect(source).toContain('id="v15DropInput"');
    expect(source).toContain("const stageFiles = (files, pdfOnly = false) =>");
    expect(source).toContain(
      "manager.querySelector('#v15UploadInput').addEventListener('change', queueFiles);"
    );
    expect(source).toContain(
      "manager.querySelector('#v15DropInput').addEventListener('change', queueDroppedPdfs);"
    );
    expect(source).toContain(
      "dropZone.addEventListener('drop', event => stageFiles(event.dataTransfer.files, true));"
    );
    expect(source).toContain(
      "additions.forEach(draft => void analyzeDraft(draft, true));"
    );
    expect(source).toContain("fileSizeLabel(draft.file.size)");
    expect(source).toContain("draftStatusLabel(draft)");
    expect(source).toContain(
      ".v15-intake-top{display:grid;grid-template-columns:minmax(0,1fr) minmax(220px,.72fr)"
    );
    expect(source).toContain(".v15-drop-zone.is-dragging");
    expect(source).toContain(
      "dropZone.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ')"
    );
    expect(source).toContain(
      "@media(max-width:600px){.v15-panel,.v15-public-browser{padding:14px}.v15-intake-top"
    );
  });

  it("fills PDF Store details automatically through an administrator-verified server endpoint and keeps them editable", () => {
    expect(source).toContain("fetch('/api/secure-intake/ai-metadata'");
    expect(source).toContain("Writing Store details automatically");
    expect(source).toContain("PDF details filled automatically");
    expect(source).toContain(
      "draft.title = String(metadata.title || draft.title).trim()"
    );
    expect(source).toContain(
      "draft.description = String(metadata.description || draft.description).trim()"
    );
    expect(source).toContain("draft.category = category");
    expect(source).toContain("The local suggestions remain editable.");
    expect(source).toContain("analysisProgress: 0");
    expect(source).toContain('role="progressbar"');
    expect(source).toContain(".v15-draft-progress.is-processing");
    expect(secureTitleSource).toContain(
      'export const AI_METADATA_ENDPOINT = "/api/secure-intake/ai-metadata"'
    );
    expect(secureTitleSource).toContain('profiles[0]?.role === "admin"');
    expect(secureTitleSource).toContain("MAX_EXCERPT_CHARS = 12_000");
    expect(secureTitleSource).toContain('name: "secure_intake_metadata"');
    expect(secureTitleSource).toContain("response_format:");
    expect(secureTitleSource).not.toContain("resource-files");
    expect(canonicalSource).toContain(
      "/store-manager-v15.js?v=20260905-public-cart-api-ready-v1"
    );
  });

  it("shows six saved resources per management page with previous, next, and numbered controls", () => {
    expect(source).toContain("const CATALOG_PAGE_SIZE = 6;");
    expect(source).toContain('id="v15CatalogPagination"');
    expect(source).toContain(
      "rows.slice(firstIndex, firstIndex + CATALOG_PAGE_SIZE)"
    );
    expect(source).toContain('aria-label="Previous resource page"');
    expect(source).toContain('aria-label="Next resource page"');
    expect(source).toContain("data-v15-catalog-page");
    expect(source).toContain('aria-current="page"');
    expect(source).toContain(
      "Showing ${firstIndex + 1}–${Math.min(firstIndex + CATALOG_PAGE_SIZE, rows.length)} of ${rows.length} saved resources"
    );
  });

  it("keeps one promotion render listener and one administrator retry timer", () => {
    expect(source.match(/avery:store-promotion-changed/g)).toHaveLength(1);
    expect(source).toContain("if (managerRetryTimer) return;");
    expect(source).toContain("managerRetryTimer = null;");
  });

  it("keeps public browse cards tied to published resources and protected previews", () => {
    expect(source).toContain(
      "resources.filter(row => row.is_published && row.storage_path)"
    );
    expect(source).toContain(
      "Every Preview uses the protected watermarked preview system."
    );
    expect(source).toContain("api.openSecurePreview(item, row.category)");
    expect(source).toContain(
      "#store .v9-store-grid .v14-category-upload{display:none!important}"
    );
    expect(source).toContain("categoryUpload.hidden = true;");
    expect(source).toContain(
      "categoryUpload.setAttribute('aria-hidden', 'true');"
    );
    expect(canonicalSource).toContain(
      "/store-manager-v15.js?v=20260905-public-cart-api-ready-v1"
    );
    expect(source).toContain(
      ".v15-public-cover img{display:block;width:100%;height:100%;min-width:0;min-height:0;max-width:100%;max-height:100%;object-fit:contain;object-position:center}"
    );
    expect(source).toContain(
      ".v15-public-card,.v15-public-card.v15-substantial{grid-column:auto;grid-template-rows:168px minmax(0,1fr);min-width:0;max-width:100%}"
    );
    expect(source).toContain(
      'data-v15-dialog-x aria-label="Close resource details">×</button>'
    );
    expect(source).toContain(
      "dialog.querySelector('[data-v15-dialog-x]').onclick = () => dialog.close()"
    );
    expect(source).toContain("How previews work");
    expect(source).toContain("Cards show a watermarked first page.");
    expect(source).toContain(
      "data-v15-dialog-back>← Back to Store Results</button>"
    );
    expect(source).toContain(
      "browse.querySelector('#v15PublicSearch')?.focus({ preventScroll: true });"
    );
    expect(source).toContain("Automatically categorized");
    expect(source).toContain("Nothing is public until you choose Publish.");
    expect(canonicalSource).toContain(
      "/store-manager-v15.js?v=20260905-public-cart-api-ready-v1"
    );
    expect(source).toContain("if (!api || typeof api.addToCart !== 'function' || !storeShell) return false;");
    expect(source).toContain("browse.dataset.v15CartApiReady = 'true';");
    expect(source).toContain("else if (event.target.closest('[data-v15-public-cart]')) addPublicItemToCart(event.target.closest('[data-v15-public-cart]'));");
    expect(source).toContain("if (browse) browse.dataset.v15CartApiReady = 'false';");
    expect(source).toContain("const addPublicItemToCart = button => {");
    expect(source).toContain("grid.querySelectorAll('[data-v15-public-cart]').forEach(button => {");
    expect(source).toContain("addPublicItemToCart(button);");
  });

  it("keeps the standard top navigation and the bottom footer links available on the Store page", () => {
    expect(canonicalSource).toContain("data-store-footer-link");
    expect(canonicalSource).toContain(
      "document.body.classList.toggle('store-view-active',id==='store');"
    );
    expect(canonicalSource).not.toContain(
      ".store-view-active .nav [data-store-footer-link]{display:none!important}"
    );
    expect(canonicalSource).toContain(
      "const placeFooterAfterPages=()=>{const lastPage=getPages().at(-1);if(lastPage&&footer&&footer.previousElementSibling!==lastPage)lastPage.after(footer)};"
    );
    expect(canonicalSource).toContain(
      "const showInitialView=()=>{placeFooterAfterPages();showView(location.hash.slice(1)||'home')};"
    );
    expect(canonicalSource).toContain(
      "document.addEventListener('DOMContentLoaded',showInitialView,{once:true})"
    );
    expect(canonicalSource).toContain('<a href="#about">About Me</a>');
    expect(canonicalSource).toContain(
      '<a href="#services">Coaching Services</a>'
    );
    expect(canonicalSource).toContain(
      '<a href="#addictions">About Addictions</a>'
    );
  });

  it("supports one-record Client, Clinician, and shared-audience Store discovery with published-only topics", () => {
    expect(source).toContain(
      "{ value: 'Client + Clinician', label: 'Client + Clinician' }"
    );
    expect(source).toContain("Shop for Yourself");
    expect(source).toContain("function audienceOptions(selected = '') {");
    expect(source).toContain("Shop for Clients");
    expect(source).toContain("Browse All Resources");
    expect(source).toContain("const CLINICIAN_COLLECTIONS = [");
    expect(source).toContain(
      "function renderAudienceCollectionNavigator(browse, resources)"
    );
    expect(source).toContain('id="v15AudienceCollections"');
    expect(source).toContain("function hideLegacyStoreNavigation()");
    expect(source).toContain(
      "'#store .v9-audience-row,#store #v11ClientNote,#store #v11ClientFilters,#store #v11ClinicianNote,#store #v9ClinicianFilters,#store #v9StoreGrid'"
    );
    expect(source).toContain('id="v15PublicTopic"');
    expect(source).toContain("All Recovery Topics");
    expect(source).toContain("data-v15-recovery-topic");
    expect(source).toContain("hasRecoveryTopic(row, topic)");
    expect(source).toContain("function recoveryTopicChecklist");
    expect(source).toContain("data-v15-edit-recovery-topic");
    expect(source).toContain(
      'label>Format<select data-v15-edit-field="resource_type"'
    );
    expect(source).toContain("function hideLegacyEmptyCustomerCategories()");
    expect(source).toContain(
      "const hasPublishedResource = (api.resourceDb[topic] || []).some(item => item?.remoteId && item.storagePath);"
    );
  });

  it("adds relational Series management and customer Series browsing without duplicating protected resources", () => {
    expect(source).toContain(
      "from('resource_series').select('id, title, display_name"
    );
    expect(source).toContain("seriesId: row.series_id || null");
    expect(source).toContain(
      "sellingOption: row.selling_option || 'individual'"
    );
    expect(source).toContain("Manage Series");
    expect(source).toContain("data-v15-save-series");
    expect(source).toContain("data-v15-delete-series");
    expect(source).toContain("will remain as independent Store resources.");
    expect(source).toContain('data-v15-draft-field="seriesId"');
    expect(source).toContain('data-v15-edit-field="series_id"');
    expect(source).toContain('data-v15-edit-field="selling_option"');
    expect(source).toContain('id="v15SeriesBrowse"');
    expect(source).toContain("Featured Series");
    expect(source).toContain("data-v15-series-details");
    expect(source).toContain("Add Complete Series");
    expect(source).toContain("item.sellingOption !== 'bundle_only'");
    expect(canonicalSource).toContain("series_id, series_name, selling_option");
  });

  it("returns legacy client and clinician prompt visitors to the active Store collection", () => {
    expect(canonicalSource).toContain("function v9ReturnToCollection()");
    expect(canonicalSource).toContain("← Back to Collection");
    expect(canonicalSource).toContain(
      'store.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"});'
    );
  });

  it("shows matching published PDFs beneath homepage topic scheduling actions with an existing cart action", () => {
    expect(canonicalSource).toContain(
      "const PROMPT_TOPIC_COLLECTIONS = Object.freeze({"
    );
    expect(canonicalSource).toContain(
      "'recovery-3': ['Triggers, Cravings & Relapse', 'Treatment & Recovery Planning']"
    );
    expect(canonicalSource).toContain(
      "'relationships-3': ['Relationships & Boundaries']"
    );
    expect(canonicalSource).toContain(
      "'behavioral-1': ['Addiction Education']"
    );
    expect(canonicalSource).toContain(
      "'purpose-3': ['Meaning, Purpose & Spirituality']"
    );
    expect(canonicalSource).toContain("function isPublishedPromptPdf(item)");
    expect(canonicalSource).toContain(
      "function promptTopicResourceScore(item, topicId)"
    );
    expect(canonicalSource).toContain(".filter(({ score }) => score > 0)");
    expect(canonicalSource).toContain(".slice(0, 3)");
    expect(canonicalSource).toContain("Related Store PDFs");
    expect(canonicalSource).toContain("data-v14-topic-cart");
    expect(canonicalSource).toContain("if (item) addToCart(item);");
    expect(canonicalSource).toContain("Schedule an Appointment");
  });

  it("keeps legacy Store collection cards compact, equal-sized, and safely contains enlarged PDF thumbnails", () => {
    expect(canonicalSource).toContain(
      "#v9StoreGrid{grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;align-items:stretch}"
    );
    expect(canonicalSource).toContain(
      "#v9StoreGrid .v9-product{box-sizing:border-box;height:330px;min-height:330px;padding:14px;overflow:hidden}"
    );
    expect(canonicalSource).toContain(
      "#v9StoreGrid .v14-thumb{box-sizing:border-box;flex:0 0 112px;height:112px;max-height:112px;border-radius:6px}"
    );
    expect(canonicalSource).toContain(
      "#v9StoreGrid .v14-pdf-thumb{display:block;width:100%;height:100%;max-width:100%;max-height:100%;object-fit:contain;object-position:center;background:#f5f1e8}"
    );
    expect(canonicalSource).toContain(
      "#v9StoreGrid .v14-title{display:-webkit-box;min-height:2.25em;max-height:2.25em;overflow:hidden"
    );
    expect(canonicalSource).toContain(
      "@media(max-width:620px){#v9StoreGrid{grid-template-columns:1fr;gap:12px}#v9StoreGrid .v9-product{height:308px;min-height:308px}"
    );
  });

  it("allows the Supabase browser client header during protected preview generation", () => {
    expect(previewFunctionSource).toContain(
      '"Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"'
    );
    expect(previewFunctionSource).toContain(
      'if (origin && !APP_ORIGINS.has(origin)) return respond({ error: "Origin not allowed." }, 403, origin)'
    );
    expect(previewFunctionSource).toContain(
      'if (profileError || profile?.role !== "admin") return respond({ error: "Administrator access is required to generate previews." }, 403, origin)'
    );
  });
});
