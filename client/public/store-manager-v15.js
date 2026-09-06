const STORE_MANAGER_READY_EVENT = 'avery:store-manager-api-ready';
let managerRetryTimer = null;

import { analyzeResourceFile, collectionNames, normalizeCollectionName, recommendCollection, resolveExplicitStoreTopic, STORE_FORMATS, storeTopics } from '/resource-categorizer.js?v=20260904-auto-pdf-metadata-v1';

const RESOURCE_TYPES = STORE_FORMATS;

const AUDIENCES = [
  { value: 'Client', label: 'Client' },
  { value: 'Clinician', label: 'Clinician' },
  { value: 'Client + Clinician', label: 'Client + Clinician' },
];
const CLINICIAN_COLLECTIONS = [
  'Individual Counseling', 'Group Counseling', 'Activities', 'Tools', 'Therapy Approaches',
  'Games', 'Assessments & Planning', 'Documentation', 'Family Work',
];
const MANAGER_COLLECTIONS = [...new Set([...storeTopics(), ...CLINICIAN_COLLECTIONS])];
const audienceLabel = value => value === 'Both' ? 'Client + Clinician' : (AUDIENCES.find(audience => audience.value === value)?.label || 'Client');
const matchesAudience = (value, requested) => !requested || (value || 'Client') === requested || value === 'Both' || value === 'Client + Clinician';
const recoveryTopicsFromTags = tags => [...new Set((Array.isArray(tags) ? tags : []).map(resolveExplicitStoreTopic).filter(Boolean))];
const keywordTagsFromTags = tags => (Array.isArray(tags) ? tags : []).filter(tag => !resolveExplicitStoreTopic(tag));
const mergeRecoveryTopicsAndKeywords = (topics, keywords) => [...new Set([...recoveryTopicsFromTags(topics), ...String(keywords ?? '').split(',').map(tag => tag.trim()).filter(Boolean)])].slice(0, 12);
const resourceRecoveryTopics = resource => {
  const explicit = recoveryTopicsFromTags(resource?.topic_tags || resource?.topicTags || []);
  return explicit.length ? explicit : [resolveExplicitStoreTopic(resource?.category)].filter(Boolean);
};
const hasRecoveryTopic = (resource, topic) => !topic || resourceRecoveryTopics(resource).includes(topic);

const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
}[character]));

const priceToCents = value => {
  const numeric = Number(String(value ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(numeric) ? Math.round(numeric * 100) : NaN;
};

const promotionPriceMarkup = (api, resource, baseCents = resource?.priceCents ?? resource?.price_cents ?? 0, bundleSeriesId = resource?.bundlePurchaseSeriesId || null) => {
  const base = Math.max(0, Number(baseCents) || 0);
  const state = window.AveryStorePromotionState;
  const finalPrice = state?.priceFor ? Number(state.priceFor(resource, base, bundleSeriesId)) : base;
  if (finalPrice < base) return `<span class="v16-price-line"><s>${escapeHtml(api.priceLabel(base))}</s><strong>${escapeHtml(api.priceLabel(finalPrice))}</strong><em>${escapeHtml(state.percentage)}% off</em></span>`;
  return `<span class="v16-price-line">${escapeHtml(api.priceLabel(base))}</span>`;
};
const seriesPromotionBadge = record => {
  const state = window.AveryStorePromotionState;
  return state?.settings?.discount_enabled && state.settings.discount_scope === 'series' && state.settings.target_series_id === record?.id
    ? `<span class="v16-offer-badge">${escapeHtml(state.percentage)}% off this complete bundle</span>`
    : '';
};

const intOrNull = value => {
  const numeric = Number.parseInt(String(value ?? ''), 10);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
};

const csvToTags = value => [...new Set(String(value ?? '').split(',').map(tag => tag.trim()).filter(Boolean))].slice(0, 12);
const tagsToCsv = tags => Array.isArray(tags) ? tags.join(', ') : '';
const safeName = file => String(file?.name || 'resource').toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/-+/g, '-');
const fileTitle = file => String(file?.name || '').replace(/\.(pdf|docx|pptx)$/i, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase()).trim();
const typeFromFile = file => /\.pptx$/i.test(file?.name || '') ? 'PowerPoint / Slide Deck' : /workbook/i.test(file?.name || '') ? 'Workbook' : 'Worksheet';
const isSlideDeck = resource => /powerpoint|slide deck|presentation/i.test(resource.resource_type || resource.type || '');
const resourceCountLabel = resource => `${Number(resource.page_count ?? resource.pages) || 1} ${isSlideDeck(resource) ? 'slides' : 'pages'}`;
const substantialType = resource => /workbook|volume|book|guide|curriculum|bundle/i.test(resource.resource_type || resource.type || '');
const fileSizeLabel = bytes => {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};
const draftStatusLabel = draft => draft.analysisState === 'analyzing' ? 'Analyzing metadata' : draft.analysisState === 'error' ? 'Review metadata manually' : draft.analysisState === 'ready' ? 'Ready for review' : 'Queued for analysis';
const draftProgressMarkup = draft => `<div class="v15-draft-progress${draft.analysisState === 'analyzing' ? ' is-processing' : ''}" aria-label="${escapeHtml(draft.analysisStage || draftStatusLabel(draft))}"><div class="v15-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.max(0, Math.min(100, Number(draft.analysisProgress) || 0))}"><span class="v15-progress-fill" style="--v15-progress:${Math.max(0, Math.min(100, Number(draft.analysisProgress) || 0))}%"></span></div><span>${escapeHtml(draft.analysisStage || draftStatusLabel(draft))}</span></div>`;

function currentApi() {
  return window.AveryStoreManagerApi || null;
}

function categoryOptions(api, selected = '', includeEmpty = true) {
  const empty = includeEmpty ? '<option value="">Choose topic</option>' : '';
  const categories = [...new Set([...MANAGER_COLLECTIONS, selected].filter(Boolean))];
  return empty + categories.map(category => `<option value="${escapeHtml(category)}"${category === selected ? ' selected' : ''}>${escapeHtml(category)}</option>`).join('');
}

function typeOptions(selected = '') {
  return RESOURCE_TYPES.map(type => `<option value="${escapeHtml(type)}"${type === selected ? ' selected' : ''}>${escapeHtml(type)}</option>`).join('');
}

function audienceOptions(selected = '') {
  return AUDIENCES.map(audience => `<option value="${audience.value}"${audience.value === selected ? ' selected' : ''}>${audience.label}</option>`).join('');
}

function recoveryTopicChecklist(selected = [], attribute = 'data-v15-draft-recovery-topic') {
  const selectedTopics = new Set(recoveryTopicsFromTags(selected));
  return `<fieldset class="v15-recovery-topics"><legend>Recovery topics</legend><span>Select one or more topics that genuinely apply. These are the customer Store filters.</span><div>${storeTopics().map(topic => `<label><input type="checkbox" ${attribute}="${escapeHtml(topic)}" value="${escapeHtml(topic)}"${selectedTopics.has(topic) ? ' checked' : ''}> <span>${escapeHtml(topic)}</span></label>`).join('')}</div></fieldset>`;
}

function seriesNameFor(series, id, fallback = '') {
  const record = series.find(entry => entry.id === id);
  return record?.display_name || record?.title || fallback || '';
}

function seriesOptions(series, selectedId = '', includeEmpty = true) {
  const empty = includeEmpty ? '<option value="">No series</option>' : '';
  return empty + series.map(record => `<option value="${escapeHtml(record.id)}"${record.id === selectedId ? ' selected' : ''}>${escapeHtml(record.display_name || record.title)}</option>`).join('');
}

function sellingOptionOptions(selected = 'individual') {
  return [
    ['individual', 'Individual resource'],
    ['individual_and_bundle', 'Individual and complete series'],
    ['bundle_only', 'Complete series only'],
  ].map(([value, label]) => `<option value="${value}"${value === selected ? ' selected' : ''}>${label}</option>`).join('');
}

function publicBrowseMarkup() {
  return `<span class="v15-kicker">Store library</span><h3 id="v15PublicBrowseHeading">Recovery Resources for Every Stage</h3><p>Browse practical recovery resources for personal growth or professional work with clients. Every Preview uses the protected watermarked preview system.</p><div class="v15-shop-grid" role="group" aria-label="Choose a Store audience"><button class="v15-shop-card" type="button" data-v15-shop="Client" aria-pressed="false"><strong>Shop for Yourself</strong><span>Recovery worksheets, workbooks, planners, exercises and tools for personal growth and recovery.</span></button><button class="v15-shop-card" type="button" data-v15-shop="Clinician" aria-pressed="false"><strong>Shop for Clients</strong><span>Professional worksheets, group resources, psychoeducation and counseling materials for clinicians.</span></button><button class="v15-shop-card is-active" type="button" data-v15-shop="" aria-pressed="true"><strong>Browse All Resources</strong><span>See every currently published resource across both Store audiences.</span></button></div><section class="v15-series-browser" id="v15SeriesBrowse" aria-labelledby="v15SeriesBrowseHeading"></section><div class="v15-collection-nav" id="v15AudienceCollections" aria-live="polite"></div><aside class="v15-preview-note" role="note"><strong>How previews work</strong><span>Cards show a watermarked first page. Select Preview to browse the public watermarked pages; the original resource file stays private.</span></aside><div class="v15-filter-grid"><label>Keyword search<input id="v15PublicSearch" type="search" placeholder="Search title, description, or tags"></label><label>Audience<select id="v15PublicAudience"><option value="">All audiences</option>${audienceOptions()}</select></label><label>Recovery topic<select id="v15PublicTopic"><option value="">All Recovery Topics</option>${storeTopics().map(topic => `<option value="${escapeHtml(topic)}">${escapeHtml(topic)}</option>`).join('')}</select></label><label>Resource type<select id="v15PublicType"><option value="">All resource types</option></select></label></div><div class="v15-public-grid" id="v15PublicGrid" aria-live="polite"></div>`;
}

function renderAudienceCollectionNavigator(browse, resources) {
  const navigation = browse.querySelector('#v15AudienceCollections');
  if (!navigation) return;
  const selected = browse.querySelector('#v15PublicTopic')?.value || '';
  const heading = 'Recovery topics';
  const description = 'Choose a topic to show only resources explicitly assigned to it. Keyword Search separately searches titles, descriptions, and tags.';
  navigation.innerHTML = `<div><strong>${heading}</strong><span>${description}</span></div><div class="v15-collection-buttons" role="group" aria-label="${heading}"><button class="v15-collection-btn${!selected ? ' is-active' : ''}" type="button" data-v15-recovery-topic="" aria-pressed="${!selected}">All Recovery Topics</button>${storeTopics().map(topic => `<button class="v15-collection-btn${topic === selected ? ' is-active' : ''}" type="button" data-v15-recovery-topic="${escapeHtml(topic)}" aria-pressed="${topic === selected}">${escapeHtml(topic)}</button>`).join('')}</div>`;
}

function managerStyles() {
  if (document.getElementById('avery-store-manager-v15-style')) return;
  const style = document.createElement('style');
  style.id = 'avery-store-manager-v15-style';
  style.textContent = `
    #store .v9-store-grid .v14-category-upload{display:none!important}.v15-manager{margin-top:28px}.v15-manager summary{color:#f8e3c0;font:700 clamp(25px,3vw,34px)/1.1 "Cormorant Garamond",serif;cursor:pointer}.v15-manager[open] summary{margin-bottom:14px}
    .v15-shell{display:grid;gap:18px}.v15-panel{padding:18px;border:1px solid rgba(208,146,75,.34);border-radius:12px;background:linear-gradient(145deg,rgba(255,255,255,.045),rgba(255,255,255,.012));box-shadow:0 14px 28px rgba(0,0,0,.14)}.v15-panel h3{margin:0;color:#f8e3c0;font:700 1.35rem/1.15 "Cormorant Garamond",serif}.v15-panel p{margin:7px 0 0;color:rgba(255,255,255,.7);font:.8rem/1.55 Manrope,sans-serif}.v15-kicker{display:block;margin-bottom:6px;color:#d29147;font:700 .62rem/1 Manrope,sans-serif;letter-spacing:.14em;text-transform:uppercase}.v15-status{min-height:20px;margin:0;color:#f7d7aa;font:.78rem/1.45 Manrope,sans-serif}.v15-toolbar,.v15-actions,.v15-bulk-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.v15-upload-trigger{display:inline-flex;align-items:center;justify-content:center;min-height:44px;cursor:pointer}.v15-upload-trigger input{display:none}.v15-intake-top{display:grid;grid-template-columns:minmax(0,1fr) minmax(220px,.72fr);gap:14px;align-items:start}.v15-drop-zone{display:grid;place-items:center;gap:5px;min-height:126px;padding:13px;border:1px dashed rgba(208,146,75,.68);border-radius:9px;background:rgba(208,146,75,.06);color:rgba(255,255,255,.72);text-align:center;cursor:pointer;transition:background .16s ease-out,border-color .16s ease-out,transform .16s ease-out}.v15-drop-zone strong{color:#f8e3c0;font:700 .98rem/1.1 "Cormorant Garamond",serif}.v15-drop-zone span{font:.71rem/1.35 Manrope,sans-serif}.v15-drop-zone.is-dragging{border-color:#f8e3c0;background:rgba(208,146,75,.16);transform:scale(.99)}.v15-drop-zone:focus-visible{outline:2px solid #f8e3c0;outline-offset:2px}.v15-drop-input{display:none}.v15-filter-grid,.v15-bulk-grid,.v15-editor-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin-top:13px}.v15-filter-grid label,.v15-bulk-grid label,.v15-editor-grid label,.v15-draft-fields label{display:grid;gap:5px;color:rgba(255,255,255,.75);font:700 .61rem/1.2 Manrope,sans-serif;letter-spacing:.07em;text-transform:uppercase}.v15-filter-grid input,.v15-filter-grid select,.v15-bulk-grid input,.v15-bulk-grid select,.v15-editor-grid input,.v15-editor-grid select,.v15-editor-grid textarea,.v15-draft-fields input,.v15-draft-fields select,.v15-draft-fields textarea{box-sizing:border-box;width:100%;padding:9px 10px;border:1px solid rgba(255,255,255,.18);border-radius:7px;background:#1b1b1b;color:#fff;font:400 .8rem/1.35 Manrope,sans-serif;letter-spacing:0;text-transform:none}.v15-editor-grid textarea,.v15-draft-fields textarea{min-height:74px;resize:vertical}.v15-editor-grid .v15-span-2,.v15-draft-fields .v15-span-2{grid-column:span 2}.v15-stage-list,.v15-catalog-list{display:grid;gap:10px;margin-top:14px}.v15-stage-row,.v15-catalog-row{border:1px solid rgba(255,255,255,.12);border-radius:9px;background:rgba(0,0,0,.17);overflow:hidden}.v15-stage-row summary{display:flex;gap:10px;align-items:center;padding:12px;cursor:pointer;list-style:none}.v15-stage-row summary::-webkit-details-marker{display:none}.v15-stage-row summary::after{content:'+';margin-left:auto;color:#d29147;font-size:1.1rem}.v15-stage-row[open] summary::after{content:'–'}.v15-stage-file{min-width:0}.v15-stage-file strong{display:block;overflow:hidden;color:#fff;font-size:.84rem;text-overflow:ellipsis;white-space:nowrap}.v15-stage-file small{display:block;margin-top:4px;color:rgba(255,255,255,.6);font-size:.7rem}.v15-draft-fields{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;padding:0 12px 12px}.v15-draft-note{margin:0 12px 12px;color:rgba(255,255,255,.6);font-size:.7rem;line-height:1.45}.v15-check{accent-color:#d29147;width:17px;height:17px;flex:0 0 auto}.v15-selected-count{margin-left:auto;color:#f7d7aa;font:700 .68rem/1 Manrope,sans-serif;letter-spacing:.07em;text-transform:uppercase}.v15-badge{display:inline-flex;align-items:center;min-height:21px;padding:0 7px;border:1px solid rgba(208,146,75,.48);border-radius:999px;color:#f7d7aa;font:700 .58rem/1 Manrope,sans-serif;letter-spacing:.05em;text-transform:uppercase}.v15-badge.muted{border-color:rgba(255,255,255,.18);color:rgba(255,255,255,.64)}.v15-catalog-row{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:11px;align-items:center;padding:12px}.v15-catalog-row h4{margin:0;color:#fff;font:.9rem/1.25 Manrope,sans-serif}.v15-catalog-row p{margin:4px 0 0;color:rgba(255,255,255,.66);font-size:.72rem;line-height:1.35}.v15-badges{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px}.v15-subtle{color:rgba(255,255,255,.58);font-size:.72rem}.v15-danger{color:#f3c6ad!important;border-color:rgba(220,120,90,.48)!important}.v15-public-browser{margin:22px 0;padding:18px;border:1px solid rgba(208,146,75,.36);border-radius:12px;background:linear-gradient(145deg,rgba(208,146,75,.08),rgba(255,255,255,.018))}.v15-public-browser h3{margin:0;color:#f8e3c0;font:700 clamp(25px,3vw,34px)/1.1 "Cormorant Garamond",serif}.v15-public-browser p{margin:7px 0 0;color:rgba(255,255,255,.7);font-size:.82rem;line-height:1.55}.v15-public-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:15px}.v15-public-card{display:grid;grid-template-rows:auto 1fr;border:1px solid rgba(255,255,255,.14);border-radius:9px;overflow:hidden;background:rgba(0,0,0,.2)}.v15-public-card.v15-substantial{grid-column:span 2}.v15-public-cover{display:grid;place-items:center;min-height:140px;background:linear-gradient(145deg,rgba(208,146,75,.32),rgba(255,255,255,.04))}.v15-public-card.v15-substantial .v15-public-cover{min-height:200px}.v15-public-cover img{display:block;width:100%;height:100%;min-height:inherit;object-fit:cover;object-position:top}.v15-public-content{padding:13px}.v15-public-content h4{margin:5px 0;color:#fff;font:700 1.03rem/1.2 "Cormorant Garamond",serif}.v15-public-content p{display:-webkit-box;margin:6px 0 0;overflow:hidden;color:rgba(255,255,255,.7);font-size:.75rem;line-height:1.45;-webkit-box-orient:vertical;-webkit-line-clamp:3}.v15-public-meta{margin-top:9px;color:#f7d7aa;font:700 .66rem/1.4 Manrope,sans-serif;letter-spacing:.04em;text-transform:uppercase}.v15-public-card .v15-actions{margin-top:11px}.v15-resource-dialog{width:min(700px,calc(100vw - 32px));padding:0;border:1px solid rgba(208,146,75,.6);border-radius:12px;background:#151515;color:#fff;box-shadow:0 24px 70px rgba(0,0,0,.7)}.v15-resource-dialog::backdrop{background:rgba(0,0,0,.72)}.v15-resource-dialog-body{padding:22px}.v15-resource-dialog h3{margin:7px 0;color:#f8e3c0;font:700 2rem/1.1 "Cormorant Garamond",serif}.v15-resource-dialog p{color:rgba(255,255,255,.75);line-height:1.6}.v15-resource-dialog .v15-dialog-cover{max-height:300px;width:100%;object-fit:contain;object-position:top;background:#f5f1e8}.v15-empty{padding:16px;border:1px dashed rgba(208,146,75,.46);border-radius:8px;color:rgba(255,255,255,.7);font-size:.8rem;line-height:1.5}
    @media(max-width:800px){.v15-filter-grid,.v15-bulk-grid,.v15-editor-grid,.v15-draft-fields{grid-template-columns:repeat(2,minmax(0,1fr))}.v15-public-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:600px){.v15-panel,.v15-public-browser{padding:14px}.v15-intake-top,.v15-filter-grid,.v15-bulk-grid,.v15-editor-grid,.v15-draft-fields,.v15-public-grid{grid-template-columns:1fr}.v15-editor-grid .v15-span-2,.v15-draft-fields .v15-span-2{grid-column:auto}.v15-catalog-row{grid-template-columns:auto minmax(0,1fr)}.v15-catalog-row>.v15-actions{grid-column:1/-1}.v15-public-card.v15-substantial{grid-column:auto}.v15-public-card.v15-substantial .v15-public-cover{min-height:150px}.v15-actions .v9-btn,.v15-toolbar .v9-btn,.v15-toolbar .v15-upload-trigger{flex:1}.v15-selected-count{width:100%;margin-left:0}.v15-stage-row summary{align-items:flex-start}}
  `;
  style.textContent += `
    .v15-public-grid{align-items:stretch}.v15-public-card,.v15-public-card.v15-substantial{grid-column:auto;grid-template-rows:168px minmax(0,1fr);min-width:0;max-width:100%}.v15-public-cover,.v15-public-card.v15-substantial .v15-public-cover{width:100%;height:168px;min-height:168px;max-height:168px;overflow:hidden}.v15-public-cover img{display:block;width:100%;height:100%;min-width:0;min-height:0;max-width:100%;max-height:100%;object-fit:contain;object-position:center}.v15-public-content{display:flex;min-width:0;flex-direction:column}.v15-public-card .v15-actions{margin-top:auto}.v15-preview-note{display:grid;gap:3px;margin-top:12px;padding:10px 12px;border-left:2px solid #d29147;background:rgba(208,146,75,.08);color:rgba(255,255,255,.75);font:.75rem/1.45 Manrope,sans-serif}.v15-preview-note strong{color:#f7d7aa;font-size:.68rem;letter-spacing:.08em;text-transform:uppercase}.v15-resource-dialog-body{position:relative}.v15-dialog-x{position:absolute;z-index:2;top:10px;right:10px;width:36px;height:36px;border:1px solid rgba(208,146,75,.75);border-radius:50%;background:rgba(11,12,12,.9);color:#f8e3c0;font:400 28px/30px Arial,sans-serif;cursor:pointer}.v15-dialog-x:hover,.v15-dialog-x:focus-visible{background:#d29147;color:#111;outline:2px solid #f8e3c0;outline-offset:2px}@media(max-width:600px){.v15-public-card,.v15-public-card.v15-substantial{grid-template-rows:156px minmax(0,1fr)}.v15-public-cover,.v15-public-card.v15-substantial .v15-public-cover{height:156px;min-height:156px;max-height:156px}}
  `;
  style.textContent += `
    .v15-auto-assign{display:flex;gap:8px;align-items:center;color:rgba(255,255,255,.75);font:.72rem/1.35 Manrope,sans-serif}.v15-auto-assign input{width:17px;height:17px;accent-color:#d29147}.v15-suggestion{display:grid;gap:7px;grid-column:1/-1;margin:2px 12px 11px;padding:11px;border:1px solid rgba(208,146,75,.34);border-radius:8px;background:rgba(208,146,75,.07)}.v15-suggestion-title{color:#f7d7aa;font:700 .65rem/1.2 Manrope,sans-serif;letter-spacing:.09em;text-transform:uppercase}.v15-suggestion p{margin:0;color:rgba(255,255,255,.76);font:.76rem/1.5 Manrope,sans-serif}.v15-suggestion .v15-actions{margin-top:1px}.v15-suggestion .v9-btn{font-size:.67rem}.v15-confidence{display:inline-flex;align-items:center;width:max-content;padding:3px 6px;border:1px solid rgba(208,146,75,.5);border-radius:999px;color:#f7d7aa;font:700 .57rem/1 Manrope,sans-serif;letter-spacing:.05em;text-transform:uppercase}.v15-candidate-list{display:flex;flex-wrap:wrap;gap:6px}.v15-new-collection{grid-column:span 2}@media(max-width:600px){.v15-new-collection{grid-column:auto}}
  `;
  style.textContent += `
    .v15-shop-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-top:15px}.v15-shop-card{display:grid;gap:5px;min-width:0;padding:13px;border:1px solid rgba(208,146,75,.35);border-radius:8px;background:rgba(0,0,0,.16);color:rgba(255,255,255,.74);cursor:pointer;text-align:left}.v15-shop-card strong{color:#f8e3c0;font:700 1rem/1.1 "Cormorant Garamond",serif}.v15-shop-card span{font:.7rem/1.4 Manrope,sans-serif}.v15-shop-card:hover,.v15-shop-card.is-active{border-color:#d29147;background:rgba(208,146,75,.13);color:#fff}.v15-shop-card:focus-visible{outline:2px solid #f8e3c0;outline-offset:2px}@media(max-width:800px){.v15-shop-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:600px){.v15-shop-grid{grid-template-columns:1fr}}
  `;
  style.textContent += `
    .v15-collection-nav{display:grid;gap:9px;margin-top:14px;padding:12px;border:1px solid rgba(208,146,75,.28);border-radius:8px;background:rgba(0,0,0,.12)}.v15-collection-nav>div:first-child{display:grid;gap:3px}.v15-collection-nav strong{color:#f7d7aa;font:700 .68rem/1.2 Manrope,sans-serif;letter-spacing:.09em;text-transform:uppercase}.v15-collection-nav span{color:rgba(255,255,255,.66);font:.73rem/1.4 Manrope,sans-serif}.v15-collection-buttons{display:flex;flex-wrap:wrap;gap:7px}.v15-collection-btn{min-height:32px;padding:6px 9px;border:1px solid rgba(255,255,255,.18);border-radius:6px;background:rgba(255,255,255,.025);color:rgba(255,255,255,.78);font:700 .63rem/1.15 Manrope,sans-serif;letter-spacing:.03em;cursor:pointer}.v15-collection-btn:hover,.v15-collection-btn.is-active{border-color:#d29147;background:rgba(208,146,75,.13);color:#f8e3c0}.v15-collection-btn:focus-visible{outline:2px solid #f8e3c0;outline-offset:2px}@media(max-width:600px){.v15-collection-buttons{display:grid;grid-template-columns:1fr}.v15-collection-btn{text-align:left}}
  `;
  style.textContent += `
    #store .v9-audience-row[hidden],#store #v11ClientNote[hidden],#store #v11ClientFilters[hidden],#store #v11ClinicianNote[hidden],#store #v9ClinicianFilters[hidden],#store #v9StoreGrid[hidden]{display:none!important}
  `;
  style.textContent += `
    .v15-draft-progress{display:grid;grid-template-columns:minmax(88px,1fr) auto;gap:8px;align-items:center;margin-top:7px;color:rgba(255,255,255,.62);font:.64rem/1.2 Manrope,sans-serif}.v15-progress-track{height:5px;overflow:hidden;border-radius:999px;background:rgba(255,255,255,.13)}.v15-progress-fill{position:relative;display:block;width:var(--v15-progress);height:100%;overflow:hidden;border-radius:inherit;background:#d29147;transition:width .26s cubic-bezier(.23,1,.32,1)}.v15-draft-progress.is-processing .v15-progress-fill::after{position:absolute;inset:0;content:'';width:40%;background:rgba(255,255,255,.38);transform:translateX(-175%);animation:v15-progress-sweep 1.1s ease-in-out infinite}.v15-ai-title{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:9px;align-items:center;margin:2px 12px 11px;padding:10px 11px;border:1px solid rgba(208,146,75,.28);border-radius:8px;background:rgba(255,255,255,.025)}.v15-ai-title span{display:block;color:#f7d7aa;font:700 .62rem/1.15 Manrope,sans-serif;letter-spacing:.08em;text-transform:uppercase}.v15-ai-title strong{display:block;margin-top:3px;color:rgba(255,255,255,.86);font:.78rem/1.35 Manrope,sans-serif}.v15-ai-title .v9-btn{font-size:.65rem}@keyframes v15-progress-sweep{to{transform:translateX(350%)}}@media(prefers-reduced-motion:reduce){.v15-draft-progress.is-processing .v15-progress-fill::after{animation:none}}@media(max-width:600px){.v15-draft-progress{grid-template-columns:1fr}.v15-ai-title{grid-template-columns:1fr}.v15-ai-title .v9-btn{justify-self:start}}
  `;
  style.textContent += `
    .v15-recovery-topics{grid-column:1/-1;display:grid;gap:6px;min-width:0;margin:0;padding:10px;border:1px solid rgba(208,146,75,.28);border-radius:8px;background:rgba(208,146,75,.045)}.v15-recovery-topics legend{padding:0 4px;color:#f7d7aa;font:700 .64rem/1.2 Manrope,sans-serif;letter-spacing:.08em;text-transform:uppercase}.v15-recovery-topics>span{color:rgba(255,255,255,.62);font:.7rem/1.4 Manrope,sans-serif;letter-spacing:0;text-transform:none}.v15-recovery-topics>div{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px 10px}.v15-recovery-topics label{display:flex!important;gap:6px!important;align-items:flex-start;color:rgba(255,255,255,.78)!important;font:400 .68rem/1.35 Manrope,sans-serif!important;letter-spacing:0!important;text-transform:none!important}.v15-recovery-topics input{width:14px!important;height:14px!important;margin:1px 0 0!important;padding:0!important;accent-color:#d29147}@media(max-width:800px){.v15-recovery-topics>div{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:600px){.v15-recovery-topics>div{grid-template-columns:1fr}}
  `;
  style.textContent += `
    .v15-pagination{display:flex;flex-wrap:wrap;gap:7px;align-items:center;justify-content:center;margin-top:14px}.v15-pagination[hidden]{display:none}.v15-page-info{width:100%;color:rgba(255,255,255,.66);font:.72rem/1.4 Manrope,sans-serif;text-align:center}.v15-page-button{display:inline-grid;place-items:center;min-width:38px;min-height:38px;padding:6px 10px;border:1px solid rgba(255,255,255,.2);border-radius:7px;background:rgba(0,0,0,.14);color:rgba(255,255,255,.82);font:700 .72rem/1 Manrope,sans-serif;cursor:pointer}.v15-page-button:hover,.v15-page-button.is-active{border-color:#d29147;background:rgba(208,146,75,.14);color:#f8e3c0}.v15-page-button:focus-visible{outline:2px solid #f8e3c0;outline-offset:2px}.v15-page-button:disabled{cursor:not-allowed;opacity:.4}
  `;
  style.textContent += `
    .v15-series-browser{display:grid;gap:10px;margin-top:16px}.v15-series-browser[hidden]{display:none}.v15-series-heading{display:flex;flex-wrap:wrap;gap:8px;align-items:baseline;justify-content:space-between}.v15-series-heading h4{margin:0;color:#f8e3c0;font:700 1.18rem/1.1 "Cormorant Garamond",serif}.v15-series-heading span{color:rgba(255,255,255,.62);font:.7rem/1.35 Manrope,sans-serif}.v15-series-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.v15-series-card{display:grid;grid-template-rows:112px minmax(0,1fr);overflow:hidden;border:1px solid rgba(208,146,75,.34);border-top:3px solid var(--v15-series-color,#d29147);border-radius:9px;background:rgba(0,0,0,.18)}.v15-series-cover{display:grid;place-items:center;overflow:hidden;background:rgba(255,255,255,.035)}.v15-series-cover img{width:100%;height:100%;object-fit:contain}.v15-series-cover span{color:rgba(255,255,255,.6);font:.7rem Manrope,sans-serif}.v15-series-content{display:grid;gap:7px;padding:11px}.v15-series-content h5{margin:0;color:#fff;font:700 .98rem/1.18 "Cormorant Garamond",serif}.v15-series-content p{display:-webkit-box;margin:0!important;overflow:hidden;-webkit-box-orient:vertical;-webkit-line-clamp:2}.v15-series-detail-list{display:grid;gap:8px;margin-top:12px}.v15-series-member{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:9px;border:1px solid rgba(255,255,255,.12);border-radius:7px}.v15-series-member strong,.v15-series-member span{display:block}.v15-series-member span{margin-top:3px;color:rgba(255,255,255,.62);font:.68rem/1.35 Manrope,sans-serif}@media(max-width:800px){.v15-series-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:600px){.v15-series-grid{grid-template-columns:1fr}.v15-series-member{align-items:flex-start;flex-direction:column}.v15-series-member .v9-btn{width:100%}}
  `;
  document.head.appendChild(style);
}

function createDraft(file) {
  return {
    id: crypto.randomUUID(), file, selected: true, title: fileTitle(file), category: '', subcategory: '',
    type: typeFromFile(file), audience: 'Client', pageCount: '', price: '', description: '', topicTags: '', recoveryTopics: [],
    seriesId: '', sellingOption: 'individual', seriesName: '', volumeNumber: '', seriesOrder: '', subtitle: '', authorName: 'Avery Institute', publisherName: 'Avery Institute',
    analysisState: 'pending', analysisProgress: 0, analysisStage: 'Queued for analysis', recommendation: null, customCategory: '', extractedTextAvailable: false, aiMetadataState: 'idle', aiMetadataMessage: '',
  };
}

function recommendationMarkup(draft) {
  if (draft.analysisState === 'pending') return '<aside class="v15-suggestion" role="status"><span class="v15-suggestion-title">Metadata suggestions</span><p>Preparing local filename and document analysis. Nothing has been uploaded.</p></aside>';
  if (draft.analysisState === 'analyzing') return '<aside class="v15-suggestion" role="status"><span class="v15-suggestion-title">Metadata suggestions</span><p>Analyzing the selected file locally and matching it to Store collections…</p></aside>';
  if (draft.analysisState === 'error') return `<aside class="v15-suggestion" role="status"><span class="v15-suggestion-title">Metadata suggestions</span><p>${escapeHtml(draft.analysisMessage || 'Local analysis could not be completed. You can still enter all metadata manually.')}</p><div class="v15-actions"><button class="v9-btn" type="button" data-v15-refresh-analysis="${draft.id}">Try again</button></div></aside>`;
  const recommendation = draft.recommendation;
  if (!recommendation) return '';
  const suggested = escapeHtml(recommendation.suggestedCollection);
  const terms = recommendation.matchedTerms?.length ? ` Matched: ${escapeHtml(recommendation.matchedTerms.slice(0, 4).join(', '))}.` : '';
  const refresh = `<button class="v9-btn" type="button" data-v15-refresh-analysis="${draft.id}">Refresh suggestions</button>`;
  const different = '<button class="v9-btn" type="button" data-v15-choose-collection>Choose Different Collection</button>';
  const create = `<button class="v9-btn primary" type="button" data-v15-create-collection="${draft.id}">Create New Collection</button>`;
  if (recommendation.state === 'no-match') return `<aside class="v15-suggestion" role="status"><span class="v15-suggestion-title">Collection match</span><p><strong>No strong existing collection found.</strong> Suggested new collection: <strong>${suggested}</strong>. Review the generated name before using it.</p><div class="v15-actions">${create}${different}${refresh}</div></aside>`;
  if (recommendation.state === 'low') {
    const candidates = recommendation.candidates.map(candidate => `<button class="v9-btn" type="button" data-v15-use-collection="${escapeHtml(candidate.name)}">${escapeHtml(candidate.name)} · ${candidate.confidence}%</button>`).join('');
    return `<aside class="v15-suggestion" role="status"><span class="v15-suggestion-title">Collection match</span><span class="v15-confidence">Low confidence · review required</span><p>Choose one of the closest collections or create a new one.${terms}</p><div class="v15-candidate-list">${candidates}</div><div class="v15-actions">${different}${create}${refresh}</div></aside>`;
  }
  const automaticallyAssigned = draft.category === recommendation.suggestedCollection;
  const label = recommendation.state === 'high' ? 'High confidence' : 'Best matching topic';
  return `<aside class="v15-suggestion" role="status"><span class="v15-suggestion-title">${automaticallyAssigned ? 'Automatically categorized' : 'Suggested collection'}</span><span class="v15-confidence">${label} · ${recommendation.confidence}%</span><p><strong>${suggested}</strong>${terms} All filled details remain editable before saving or publishing.</p><div class="v15-actions">${automaticallyAssigned ? '' : `<button class="v9-btn primary" type="button" data-v15-use-collection="${suggested}">Use this topic</button>`}${different}${create}${refresh}</div></aside>`;
}

function automaticMetadataMarkup(draft) {
  if (!/\.pdf$/i.test(draft.file.name || '')) return '';
  if (draft.aiMetadataState === 'loading') return '<aside class="v15-ai-title" role="status"><div><span>Automatic PDF setup</span><strong>Writing the title and description, then choosing the best Store topic…</strong></div></aside>';
  if (draft.aiMetadataState === 'ready') return '<aside class="v15-ai-title" role="status"><div><span>PDF details filled automatically</span><strong>Title, description, Store topic, format, price, keywords, and available page count are ready. Change only what you want before publishing.</strong></div></aside>';
  if (draft.aiMetadataState === 'unavailable') return `<aside class="v15-ai-title" role="status"><div><span>Local PDF setup complete</span><strong>${escapeHtml(draft.aiMetadataMessage || 'The editable filename and document-based suggestions were used because enhanced PDF writing was unavailable.')}</strong></div></aside>`;
  return '';
}

function draftFieldMarkup(api, draft, series = []) {
  const text = (field, label, placeholder = '', cls = '') => `<label class="${cls}">${label}<input data-v15-draft-field="${field}" value="${escapeHtml(draft[field] || '')}" placeholder="${escapeHtml(placeholder)}"></label>`;
  return `
    ${text('title', 'Product title', 'Required', 'v15-span-2')}
    <label>Primary category<select data-v15-draft-field="category">${categoryOptions(api, draft.category)}</select></label>
    ${recoveryTopicChecklist(draft.recoveryTopics)}
    ${draft.customCategory ? text('customCategory', 'New topic name', 'Editable topic name', 'v15-new-collection') : ''}
    ${text('subcategory', 'Subcategory', 'Optional')}
    <label>Format<select data-v15-draft-field="type">${typeOptions(draft.type)}</select></label>
    <label>Audience<select data-v15-draft-field="audience">${audienceOptions(draft.audience)}</select></label>
    ${text('pageCount', 'Pages / slides', /\.pdf$/i.test(draft.file.name) ? 'Detected after protected preview' : 'Enter manually')}
    ${text('price', 'Price', '$0.00 or more')}
    ${text('topicTags', 'Keywords / tags', 'Comma separated', 'v15-span-2')}
    <label class="v15-span-2">Series / collection<select data-v15-draft-field="seriesId">${seriesOptions(series, draft.seriesId)}</select></label>
    <label>Selling option<select data-v15-draft-field="sellingOption">${sellingOptionOptions(draft.sellingOption)}</select></label>
    ${text('volumeNumber', 'Volume number', 'Optional')}
    ${text('seriesOrder', 'Series order', 'Optional')}
    ${text('subtitle', 'Subtitle', 'Optional', 'v15-span-2')}
    ${text('authorName', 'Author', 'Optional')}
    ${text('publisherName', 'Publisher', 'Optional')}
    <label class="v15-span-2">Description<textarea data-v15-draft-field="description" placeholder="Describe the resource for customers">${escapeHtml(draft.description || '')}</textarea></label>
  `;
}

function rowToPreviewItem(api, row) {
  const pageCount = Math.max(1, Number(row.page_count) || 1);
  const firstPath = row.thumbnail_path || null;
  const paths = firstPath?.endsWith('-full-preview-page-1.jpg')
    ? Array.from({ length: pageCount }, (_, index) => firstPath.replace('-full-preview-page-1.jpg', `-full-preview-page-${index + 1}.jpg`))
    : firstPath ? [firstPath] : [];
  const publicUrl = path => `${api.supabase.storage.from('resource-thumbnails').getPublicUrl(path).data.publicUrl}?preview=${Date.now()}`;
  return {
    remoteId: row.id, title: row.title, description: row.description || '', category: row.category,
    price: api.priceLabel(row.price_cents), priceCents: Number(row.price_cents) || 0, pages: pageCount,
    type: row.resource_type, storagePath: row.storage_path, fileName: row.file_name || '', thumbnailPath: firstPath,
    thumbnailUrl: paths[0] ? publicUrl(paths[0]) : null, previewPageUrls: paths.map(publicUrl), topicTags: row.topic_tags || [],
    seriesId: row.series_id || null, seriesName: row.series_name || '', seriesOrder: row.series_order || null, sellingOption: row.selling_option || 'individual',
  };
}

function patchPublishedResource(api, row) {
  const existingCategory = Object.entries(api.resourceDb).find(([, items]) => items.some(item => item.remoteId === row.id));
  const item = existingCategory?.[1].find(entry => entry.remoteId === row.id);
  if (!row.is_published) {
    if (existingCategory) {
      api.resourceDb[existingCategory[0]] = existingCategory[1].filter(entry => entry.remoteId !== row.id);
      api.renderResourceCard(existingCategory[0]);
    }
    return;
  }
  if (!item) return;
  const oldCategory = existingCategory?.[0];
  Object.assign(item, rowToPreviewItem(api, row));
  item.audience = row.audience || 'Client'; item.subcategory = row.subcategory || ''; item.seriesId = row.series_id || null; item.seriesName = row.series_name || '';
  item.volumeNumber = row.volume_number || null; item.seriesOrder = row.series_order || null; item.sellingOption = row.selling_option || 'individual'; item.subtitle = row.subtitle || '';
  if (oldCategory && oldCategory !== row.category) {
    api.resourceDb[oldCategory] = api.resourceDb[oldCategory].filter(entry => entry.remoteId !== row.id);
    if (!api.resourceDb[row.category]) api.resourceDb[row.category] = [];
    api.resourceDb[row.category].push(item);
    api.renderResourceCard(oldCategory);
  }
  api.renderResourceCard(row.category);
}

function mountStoreManager() {
  const api = currentApi();
  const manager = document.getElementById('v14Admin');
  const storeShell = document.querySelector('#store .store-shell');
  if (!api || !manager || !storeShell || !api.isAdmin()) return false;
  if (manager.dataset.v15Mounted === 'true') return true;
  manager.dataset.v15Mounted = 'true';
  manager.classList.add('v15-manager');
  managerStyles();

  let drafts = [];
  let selectedResources = new Set();
  let resources = [];
  let series = [];
  let editId = null;
  let editSeriesId = null;
  let catalogPage = 1;
  const CATALOG_PAGE_SIZE = 6;

  manager.innerHTML = `
    <summary>Store Resource Manager — Secure Library Dashboard</summary>
    <div class="v15-shell">
      <section class="v15-panel" aria-labelledby="v15UploadHeading">
        <div class="v15-intake-top"><div><span class="v15-kicker">Secure intake</span><h3 id="v15UploadHeading">Upload Resources</h3><p>Upload a PDF and its title, detailed Store description, topic, format, price, keywords, and page count will be filled automatically. Review or change anything before you publish.</p><div class="v15-toolbar" style="margin-top:14px"><label class="v9-btn primary v15-upload-trigger">Upload Resources<input id="v15UploadInput" type="file" multiple accept=".pdf,.docx,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation"></label><button class="v9-btn" type="button" id="v15ClearDrafts">Clear queue</button><span class="v15-selected-count" id="v15DraftCount">No files selected</span></div></div><div class="v15-drop-zone" id="v15DropZone" role="button" tabindex="0" aria-label="Drag and drop one or multiple PDF resources, or choose files"><strong>Drag &amp; Drop Resources Here</strong><span>Drop one or multiple PDF files</span><label class="v9-btn v15-upload-trigger">Choose Files<input id="v15DropInput" class="v15-drop-input" type="file" multiple accept=".pdf,application/pdf"></label></div></div>
        <div class="v15-stage-list" id="v15StageList" aria-live="polite"></div>
        <div class="v15-actions" style="margin-top:14px"><button class="v9-btn" type="button" id="v15SaveDrafts" disabled>Save selected as Draft</button><button class="v9-btn primary" type="button" id="v15PublishDrafts" disabled>Publish selected</button><span class="v15-status" id="v15UploadStatus"></span></div>
      </section>
      <section class="v15-panel" aria-labelledby="v15CatalogHeading">
        <span class="v15-kicker">Library management</span><h3 id="v15CatalogHeading">Manage Saved Resources</h3>
        <p>Search, edit, duplicate, preview, publish, unpublish, or deliberately delete real Store records. Customer-facing presentation updates only after publishing.</p>
        <div class="v15-filter-grid"><label>Keyword search<input id="v15Search" type="search" placeholder="Title, description, or tag"></label><label>Audience<select id="v15Audience"><option value="">All audiences</option>${audienceOptions()}</select></label><label>Recovery topic<select id="v15Topic"><option value="">All Recovery Topics</option>${storeTopics().map(topic => `<option value="${escapeHtml(topic)}">${escapeHtml(topic)}</option>`).join('')}</select></label><label>Status<select id="v15Status"><option value="">All statuses</option><option value="draft">Drafts</option><option value="published">Published</option></select></label><label>Resource type<select id="v15Type"><option value="">All types</option></select></label><label>Series<select id="v15Series"><option value="">All collections</option></select></label><label>Sort<select id="v15Sort"><option value="newest">Newest</option><option value="title">Title A–Z</option><option value="series">Series / volume</option><option value="price-low">Price low–high</option><option value="price-high">Price high–low</option></select></label></div>
        <div class="v15-bulk-grid"><label>Bulk primary category<select id="v15BulkCategory">${categoryOptions(api, '', true)}</select></label><label>Bulk audience<select id="v15BulkAudience"><option value="">No change</option>${audienceOptions()}</select></label><label>Bulk format<select id="v15BulkType"><option value="">No change</option>${typeOptions()}</select></label><label>Bulk status<select id="v15BulkStatus"><option value="">No change</option><option value="draft">Draft</option><option value="published">Published</option></select></label><label>Bulk series<input id="v15BulkSeries" placeholder="No change"></label><label>Bulk price<input id="v15BulkPrice" inputmode="decimal" placeholder="No change"></label></div>
        <div class="v15-actions" style="margin-top:10px"><button class="v9-btn" type="button" id="v15SelectVisible">Select visible</button><button class="v9-btn" type="button" id="v15ClearSelection">Clear selection</button><button class="v9-btn" type="button" id="v15MigrateTopics">Apply legacy topic mapping</button><button class="v9-btn primary" type="button" id="v15ApplyBulk">Apply to selected</button><span class="v15-selected-count" id="v15ResourceCount">0 selected</span></div>
        <div class="v15-catalog-list" id="v15CatalogList" aria-live="polite"></div>
        <nav class="v15-pagination" id="v15CatalogPagination" aria-label="Saved resource pages" hidden></nav>
      </section>
      <section class="v15-panel" id="v15Editor" hidden aria-labelledby="v15EditorHeading"><span class="v15-kicker">Metadata editor</span><h3 id="v15EditorHeading">Edit Resource</h3><p id="v15EditorNote">Changes update this resource only.</p><div class="v15-editor-grid" id="v15EditorFields"></div><div class="v15-actions" style="margin-top:14px"><button class="v9-btn primary" type="button" id="v15SaveEdit">Save changes</button><button class="v9-btn" type="button" id="v15CancelEdit">Cancel</button><span class="v15-status" id="v15EditorStatus"></span></div></section>
    </div>`;

  let browse = document.getElementById('v15PublicBrowse');
  if (!browse) {
    browse = document.createElement('section');
    browse.id = 'v15PublicBrowse';
    browse.className = 'v15-public-browser';
    browse.setAttribute('aria-labelledby', 'v15PublicBrowseHeading');
    browse.innerHTML = publicBrowseMarkup();
    const intro = storeShell.querySelector('.store-intro');
    intro?.insertAdjacentElement('afterend', browse);
  }
  let dialog = document.getElementById('v15ResourceDetail');
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.id = 'v15ResourceDetail';
    dialog.className = 'v15-resource-dialog';
    document.body.appendChild(dialog);
  }

  const stageList = manager.querySelector('#v15StageList');
  const uploadStatus = manager.querySelector('#v15UploadStatus');
  const saveDraftsButton = manager.querySelector('#v15SaveDrafts');
  const publishDraftsButton = manager.querySelector('#v15PublishDrafts');
  const catalogList = manager.querySelector('#v15CatalogList');
  const seriesPanel = document.createElement('section');
  seriesPanel.id = 'v15SeriesPanel';
  seriesPanel.className = 'v15-panel';
  manager.querySelector('.v15-shell')?.insertBefore(seriesPanel, manager.querySelector('#v15Editor'));

  const membersForSeries = id => resources.filter(row => row.series_id === id).sort((a, b) => Number(a.series_order || 0) - Number(b.series_order || 0) || a.title.localeCompare(b.title));
  const seriesDraft = () => series.find(entry => entry.id === editSeriesId) || { title: '', display_name: '', slug: '', brand: 'Chapter 21', description: '', category: '', category_color: '#D29147', cover_image: '', bundle_price_cents: 0, is_published: false };
  const renderSeriesPanel = () => {
    const record = seriesDraft();
    const price = (Number(record.bundle_price_cents || 0) / 100).toFixed(2);
    seriesPanel.innerHTML = `<span class="v15-kicker">Series management</span><h3 id="v15SeriesHeading">Manage Series</h3><p>Create a series once, then attach existing resources in the resource editor. Deleting a series removes the relationship only; it never deletes the resource, private original, preview, or completed customer download.</p><div class="v15-editor-grid"><label>Series title<input data-v15-series-field="title" value="${escapeHtml(record.title)}" placeholder="Required"></label><label>Display name<input data-v15-series-field="display_name" value="${escapeHtml(record.display_name)}" placeholder="Customer-facing name"></label><label>URL slug<input data-v15-series-field="slug" value="${escapeHtml(record.slug)}" placeholder="rebuilding-my-life"></label><label>Brand<input data-v15-series-field="brand" value="${escapeHtml(record.brand || 'Chapter 21')}"></label><label>Recovery topic<select data-v15-series-field="category"><option value="">Choose topic</option>${storeTopics().map(topic => `<option value="${escapeHtml(topic)}"${topic === record.category ? ' selected' : ''}>${escapeHtml(topic)}</option>`).join('')}</select></label><label>Accent color<input data-v15-series-field="category_color" value="${escapeHtml(record.category_color || '#D29147')}" placeholder="#D29147"></label><label>Bundle price<input data-v15-series-field="bundle_price" value="${escapeHtml(price)}" inputmode="decimal" placeholder="Optional"></label><label>Visibility<select data-v15-series-field="is_published"><option value="false"${record.is_published ? '' : ' selected'}>Draft</option><option value="true"${record.is_published ? ' selected' : ''}>Published</option></select></label><label class="v15-span-2">Cover image URL<input data-v15-series-field="cover_image" value="${escapeHtml(record.cover_image || '')}" placeholder="Optional — otherwise the first member preview is used"></label><label class="v15-span-2">Description<textarea data-v15-series-field="description" placeholder="Describe the collection for customers">${escapeHtml(record.description || '')}</textarea></label></div><div class="v15-actions" style="margin-top:14px"><button class="v9-btn primary" type="button" data-v15-save-series>${editSeriesId ? 'Save Series' : 'Create Series'}</button>${editSeriesId ? '<button class="v9-btn" type="button" data-v15-new-series>New Series</button><button class="v9-btn v15-danger" type="button" data-v15-delete-series>Delete Series</button>' : ''}<span class="v15-status" data-v15-series-status></span></div><div class="v15-catalog-list">${series.length ? series.map(entry => { const members = membersForSeries(entry.id); return `<article class="v15-catalog-row" data-v15-series-record="${entry.id}"><div><h4>${escapeHtml(entry.display_name || entry.title)}</h4><p>${members.length} resource${members.length === 1 ? '' : 's'} · ${entry.is_published ? 'Published' : 'Draft'} · ${escapeHtml(entry.category || 'No topic')}</p><div class="v15-badges"><span class="v15-badge">${escapeHtml(entry.brand || 'Chapter 21')}</span>${Number(entry.bundle_price_cents) ? `<span class="v15-badge muted">Bundle ${escapeHtml(api.priceLabel(entry.bundle_price_cents))}</span>` : ''}</div></div><div class="v15-actions"><button class="v9-btn" type="button" data-v15-edit-series="${entry.id}">Edit</button></div></article>`; }).join('') : '<div class="v15-empty">No series yet. Create one here; resources can be assigned later without re-uploading them.</div>'}</div>`;
  };

  const selectedDrafts = () => {
    const selected = drafts.filter(draft => draft.selected);
    return selected.length ? selected : drafts;
  };

  const renderDrafts = () => {
    const count = manager.querySelector('#v15DraftCount');
    const active = selectedDrafts();
    const analysisInProgress = active.some(draft => draft.analysisState === 'pending' || draft.analysisState === 'analyzing');
    if (count) count.textContent = drafts.length ? `${active.length} of ${drafts.length} staged` : 'No files selected';
    if (saveDraftsButton) saveDraftsButton.disabled = !drafts.length || analysisInProgress;
    if (publishDraftsButton) publishDraftsButton.disabled = !drafts.length || analysisInProgress;
    if (!stageList) return;
    stageList.innerHTML = drafts.length ? drafts.map(draft => `<details class="v15-stage-row" data-v15-draft="${draft.id}" open><summary><input class="v15-check" type="checkbox" data-v15-draft-select="${draft.id}" ${draft.selected ? 'checked' : ''} aria-label="Select ${escapeHtml(draft.title)}"><div class="v15-stage-file"><strong>${escapeHtml(draft.title || draft.file.name)}</strong><small>${escapeHtml(draft.file.name)} · ${escapeHtml(api.resourceExtension(draft.file).toUpperCase())} · ${fileSizeLabel(draft.file.size)} · ${draftStatusLabel(draft)}${draft.pageCount ? ` · ${escapeHtml(draft.pageCount)} pages` : ''}</small>${draftProgressMarkup(draft)}</div><button class="v9-btn v15-danger" type="button" data-v15-remove-draft="${draft.id}">× Remove</button></summary><div class="v15-draft-fields">${draftFieldMarkup(api, draft, series)}</div>${automaticMetadataMarkup(draft)}${recommendationMarkup(draft)}<p class="v15-draft-note">Nothing is public until you choose Publish. PDF previews are generated only as permanently watermarked JPEG pages after the file has been saved to private storage.</p><div class="v15-actions" style="padding:0 12px 12px"><button class="v9-btn" type="button" data-v15-preview-draft="${draft.id}">Preview locally</button></div></details>`).join('') : '<div class="v15-empty">Choose one or more resource files to create a private staging queue. Nothing is uploaded or published when files are selected.</div>';
  };

  const loadResources = async () => {
    if (!api.isAdmin()) return;
    const [resourceResult, seriesResult] = await Promise.all([
      api.supabase.from('resources').select('id, category, title, description, resource_type, price_cents, page_count, storage_path, file_name, thumbnail_path, topic_tags, is_published, audience, subcategory, series_id, series_name, selling_option, volume_number, series_order, subtitle, author_name, publisher_name, created_at').order('created_at', { ascending: false }),
      api.supabase.from('resource_series').select('id, title, display_name, slug, brand, description, category, category_color, cover_image, bundle_price_cents, is_published, created_at, updated_at').order('created_at', { ascending: false }),
    ]);
    if (resourceResult.error) throw resourceResult.error;
    if (seriesResult.error) throw seriesResult.error;
    resources = resourceResult.data || [];
    series = seriesResult.data || [];
    renderSeriesPanel();
    renderCatalog();
    renderPublicBrowse();
  };

  const filteredResources = () => {
    const search = String(manager.querySelector('#v15Search')?.value || '').trim().toLowerCase();
    const audience = manager.querySelector('#v15Audience')?.value || '';
    const topic = manager.querySelector('#v15Topic')?.value || '';
    const status = manager.querySelector('#v15Status')?.value || '';
    const type = manager.querySelector('#v15Type')?.value || '';
    const series = manager.querySelector('#v15Series')?.value || '';
    const sort = manager.querySelector('#v15Sort')?.value || 'newest';
    const matches = resources.filter(row => {
      const text = [row.title, row.description, ...(row.topic_tags || [])].join(' ').toLowerCase();
      return (!search || text.includes(search)) && matchesAudience(row.audience, audience) && hasRecoveryTopic(row, topic) && (!status || (status === 'published' ? row.is_published : !row.is_published)) && (!type || row.resource_type === type) && (!series || row.series_id === series);
    });
    return matches.sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title) : sort === 'series' ? `${a.series_name || ''}-${String(a.series_order || 0).padStart(6, '0')}-${a.title}`.localeCompare(`${b.series_name || ''}-${String(b.series_order || 0).padStart(6, '0')}-${b.title}`) : sort === 'price-low' ? Number(a.price_cents) - Number(b.price_cents) : sort === 'price-high' ? Number(b.price_cents) - Number(a.price_cents) : new Date(b.created_at) - new Date(a.created_at));
  };

  const syncFilterOptions = () => {
    const topicSelect = manager.querySelector('#v15Topic');
    const typeSelect = manager.querySelector('#v15Type');
    const seriesSelect = manager.querySelector('#v15Series');
    const publicType = browse.querySelector('#v15PublicType');
    const topics = [...new Set([...MANAGER_COLLECTIONS, ...resources.map(row => row.category).filter(Boolean)])].sort();
    const types = [...new Set([...RESOURCE_TYPES, ...resources.map(row => row.resource_type).filter(Boolean)])].sort();
    const publishedTypes = [...new Set(publishedResources().map(row => row.resource_type).filter(Boolean))].sort();
    const fill = (element, label, values) => {
      if (!element) return;
      const prior = element.value;
      element.innerHTML = `<option value="">All ${label}</option>${values.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('')}`;
      element.value = values.includes(prior) ? prior : '';
    };
    fill(typeSelect, 'formats', types); fill(publicType, 'resource types', publishedTypes);
    if (seriesSelect) {
      const prior = seriesSelect.value;
      seriesSelect.innerHTML = `<option value="">All collections</option>${series.map(record => `<option value="${escapeHtml(record.id)}">${escapeHtml(record.display_name || record.title)}</option>`).join('')}`;
      seriesSelect.value = series.some(record => record.id === prior) ? prior : '';
    }
    if (topicSelect) topicSelect.value = storeTopics().includes(topicSelect.value) ? topicSelect.value : '';
  };

  const renderCatalog = () => {
    syncFilterOptions();
    const rows = filteredResources();
    const totalPages = Math.max(1, Math.ceil(rows.length / CATALOG_PAGE_SIZE));
    catalogPage = Math.min(Math.max(1, catalogPage), totalPages);
    const firstIndex = (catalogPage - 1) * CATALOG_PAGE_SIZE;
    const pageRows = rows.slice(firstIndex, firstIndex + CATALOG_PAGE_SIZE);
    const count = manager.querySelector('#v15ResourceCount');
    const pagination = manager.querySelector('#v15CatalogPagination');
    if (count) count.textContent = `${selectedResources.size} selected`;
    if (!catalogList) return;
    catalogList.innerHTML = pageRows.length ? pageRows.map(row => {
      const details = [row.file_name || 'No file attached', resourceCountLabel(row), api.priceLabel(row.price_cents)].join(' · ');
      const badges = [row.is_published ? '<span class="v15-badge">Published</span>' : '<span class="v15-badge muted">Draft</span>', `<span class="v15-badge muted">${escapeHtml(row.category)}</span>`, `<span class="v15-badge muted">${escapeHtml(row.resource_type)}</span>`, row.series_name ? `<span class="v15-badge">${escapeHtml(row.series_name)}${row.volume_number ? ` · Vol. ${row.volume_number}` : ''}</span>` : '', `<span class="v15-badge muted">${escapeHtml(audienceLabel(row.audience || 'Client'))}</span>`].join('');
      return `<article class="v15-catalog-row" data-v15-resource="${row.id}"><input class="v15-check" type="checkbox" data-v15-resource-select="${row.id}" ${selectedResources.has(row.id) ? 'checked' : ''} aria-label="Select ${escapeHtml(row.title)}"><div><h4>${escapeHtml(row.title)}</h4><p>${escapeHtml(details)}</p><div class="v15-badges">${badges}</div></div><div class="v15-actions"><button class="v9-btn" type="button" data-v15-edit="${row.id}">Edit</button><button class="v9-btn" type="button" data-v15-preview-resource="${row.id}">Preview</button><button class="v9-btn" type="button" data-v15-duplicate="${row.id}">Duplicate</button><button class="v9-btn v15-danger" type="button" data-v15-delete="${row.id}">Delete</button></div></article>`;
    }).join('') : '<div class="v15-empty">No saved resource matches these filters.</div>';
    if (!pagination) return;
    pagination.hidden = rows.length <= CATALOG_PAGE_SIZE;
    pagination.innerHTML = rows.length ? `<span class="v15-page-info">Showing ${firstIndex + 1}–${Math.min(firstIndex + CATALOG_PAGE_SIZE, rows.length)} of ${rows.length} saved resources</span><button class="v15-page-button" type="button" data-v15-catalog-page="${catalogPage - 1}" aria-label="Previous resource page"${catalogPage === 1 ? ' disabled' : ''}>←</button>${Array.from({ length: totalPages }, (_, index) => index + 1).map(page => `<button class="v15-page-button${page === catalogPage ? ' is-active' : ''}" type="button" data-v15-catalog-page="${page}"${page === catalogPage ? ' aria-current="page"' : ''}>${page}</button>`).join('')}<button class="v15-page-button" type="button" data-v15-catalog-page="${catalogPage + 1}" aria-label="Next resource page"${catalogPage === totalPages ? ' disabled' : ''}>→</button>` : '';
  };

  const publishedResources = () => resources.filter(row => row.is_published && row.storage_path);
  const renderPublicBrowse = () => {
    syncFilterOptions();
    const grid = browse.querySelector('#v15PublicGrid');
    if (!grid) return;
    const search = String(browse.querySelector('#v15PublicSearch')?.value || '').trim().toLowerCase();
    const audience = browse.querySelector('#v15PublicAudience')?.value || '';
    const topic = browse.querySelector('#v15PublicTopic')?.value || '';
    const type = browse.querySelector('#v15PublicType')?.value || '';
    renderAudienceCollectionNavigator(browse, publishedResources());
    const rows = publishedResources().filter(row => {
      const text = [row.title, row.description, ...(row.topic_tags || [])].join(' ').toLowerCase();
      return (!search || text.includes(search)) && matchesAudience(row.audience, audience) && hasRecoveryTopic(row, topic) && (!type || row.resource_type === type);
    });
    grid.innerHTML = rows.length ? rows.map(row => {
      const item = rowToPreviewItem(api, row);
      const cover = item.thumbnailUrl ? `<img src="${escapeHtml(item.thumbnailUrl)}" alt="Watermarked preview page 1 for ${escapeHtml(row.title)}" loading="lazy">` : '<span class="v15-subtle">Protected preview preparing</span>';
      const label = resourceCountLabel(row);
      return `<article class="v15-public-card ${substantialType(row) ? 'v15-substantial' : ''}" data-v15-public-resource="${row.id}"><div class="v15-public-cover">${cover}</div><div class="v15-public-content"><div class="v15-badges"><span class="v15-badge">${escapeHtml(row.category)}</span><span class="v15-badge muted">${escapeHtml(row.resource_type)}</span><span class="v15-badge muted">${escapeHtml(audienceLabel(row.audience || 'Client'))}</span></div><h4>${escapeHtml(row.title)}</h4>${row.subtitle ? `<p>${escapeHtml(row.subtitle)}</p>` : ''}<p>${escapeHtml(row.description || 'Resource details are being prepared.')}</p><div class="v15-public-meta">${escapeHtml(label)} · ${promotionPriceMarkup(api, item)}${row.series_name ? ` · ${escapeHtml(row.series_name)}${row.volume_number ? ` Vol. ${row.volume_number}` : ''}` : ''}</div><div class="v15-actions"><button class="v9-btn" type="button" data-v15-detail="${row.id}">View details</button><button class="v9-btn" type="button" data-v15-public-preview="${row.id}">Preview</button><button class="v9-btn primary" type="button" data-v15-public-cart="${row.id}">Add to Cart</button></div></div></article>`;
    }).join('') : '<div class="v15-empty">Resources are being added to this collection. Please check back soon.</div>';
  };

  const populateEditor = row => {
    editId = row.id;
    const editor = manager.querySelector('#v15Editor');
    const fields = manager.querySelector('#v15EditorFields');
    if (!editor || !fields) return;
    editor.hidden = false;
    manager.querySelector('#v15EditorNote').textContent = `Editing “${row.title}”. Metadata updates do not replace its private file.`;
    fields.innerHTML = `
      <label class="v15-span-2">Product title<input data-v15-edit-field="title" value="${escapeHtml(row.title)}"></label><label>Primary category<select data-v15-edit-field="category">${categoryOptions(api, row.category, false)}</select></label><label>Secondary topic<input data-v15-edit-field="subcategory" value="${escapeHtml(row.subcategory || '')}"></label>
      <label>Format<select data-v15-edit-field="resource_type">${typeOptions(row.resource_type)}</select></label><label>Audience<select data-v15-edit-field="audience">${audienceOptions(row.audience || 'Client')}</select></label><label>Pages / slides<input data-v15-edit-field="page_count" value="${escapeHtml(row.page_count || '')}"></label><label>Price<input data-v15-edit-field="price" value="${escapeHtml((Number(row.price_cents || 0) / 100).toFixed(2))}"></label>
      <label class="v15-span-2">Keywords / tags<input data-v15-edit-field="topic_tags" value="${escapeHtml(tagsToCsv(keywordTagsFromTags(row.topic_tags)))}" placeholder="Comma separated"></label>${recoveryTopicChecklist(row.topic_tags, 'data-v15-edit-recovery-topic')}<label class="v15-span-2">Series / collection<select data-v15-edit-field="series_id">${seriesOptions(series, row.series_id || '')}</select></label><label>Selling option<select data-v15-edit-field="selling_option">${sellingOptionOptions(row.selling_option || 'individual')}</select></label><label>Volume number<input data-v15-edit-field="volume_number" value="${escapeHtml(row.volume_number || '')}"></label><label>Series order<input data-v15-edit-field="series_order" value="${escapeHtml(row.series_order || '')}"></label>
      <label class="v15-span-2">Subtitle<input data-v15-edit-field="subtitle" value="${escapeHtml(row.subtitle || '')}"></label><label>Author<input data-v15-edit-field="author_name" value="${escapeHtml(row.author_name || '')}"></label><label>Publisher<input data-v15-edit-field="publisher_name" value="${escapeHtml(row.publisher_name || '')}"></label><label>Status<select data-v15-edit-field="is_published"><option value="false"${row.is_published ? '' : ' selected'}>Draft</option><option value="true"${row.is_published ? ' selected' : ''}>Published</option></select></label><label class="v15-span-2">Description<textarea data-v15-edit-field="description">${escapeHtml(row.description || '')}</textarea></label>`;
    editor.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' });
  };

  const saveDraft = async (draft, isPublished) => {
    const title = draft.title.trim();
    const priceCents = priceToCents(draft.price);
    if (!title || !draft.category) throw new Error(`Add a title and topic for “${draft.file.name}”.`);
    if (isPublished && (!Number.isFinite(priceCents) || priceCents < 0)) throw new Error(`Enter a valid price for “${title}” before publishing.`);
    const session = api.getSession();
    if (!session?.user?.id) throw new Error('Your administrator session expired. Sign in again before saving resources.');
    const storagePath = `${session.user.id}/${crypto.randomUUID()}-${safeName(draft.file)}`;
    const { error: uploadError } = await api.supabase.storage.from('resource-files').upload(storagePath, draft.file, { contentType: api.resourceMimeType(draft.file), upsert: false });
    if (uploadError) throw uploadError;
    let row = null;
    try {
      const { data, error } = await api.supabase.from('resources').insert({
        category: draft.category, title, description: draft.description.trim(), resource_type: draft.type, price_cents: Number.isFinite(priceCents) ? priceCents : 0,
        page_count: intOrNull(draft.pageCount) || 1, storage_path: storagePath, file_name: draft.file.name, mime_type: api.resourceMimeType(draft.file), topic_tags: mergeRecoveryTopicsAndKeywords(draft.recoveryTopics, draft.topicTags),
        is_published: isPublished, created_by: session.user.id, audience: draft.audience, subcategory: draft.subcategory.trim() || null, series_id: draft.seriesId || null, series_name: seriesNameFor(series, draft.seriesId, draft.seriesName.trim()) || null, selling_option: draft.sellingOption || 'individual',
        volume_number: intOrNull(draft.volumeNumber), series_order: intOrNull(draft.seriesOrder), subtitle: draft.subtitle.trim() || null, author_name: draft.authorName.trim() || null, publisher_name: draft.publisherName.trim() || null,
      }).select('id, category, title, description, resource_type, price_cents, page_count, storage_path, file_name, thumbnail_path, topic_tags, is_published, audience, subcategory, series_id, series_name, selling_option, volume_number, series_order, subtitle, author_name, publisher_name, created_at').single();
      if (error) throw error;
      row = data;
      if (/\.pdf$/i.test(draft.file.name)) {
        const { data: previewResult, error: previewError } = await api.supabase.functions.invoke('generate-resource-preview', { body: { resourceId: row.id } });
        if (previewError || !previewResult?.thumbnailPath) {
          if (isPublished) await api.supabase.from('resources').update({ is_published: false }).eq('id', row.id);
          throw new Error(previewResult?.error || previewError?.message || 'Unable to generate the protected PDF preview. The private draft was kept for correction.');
        }
        row = { ...row, thumbnail_path: previewResult.thumbnailPath, page_count: Number(previewResult.pages) || row.page_count };
      }
      return row;
    } catch (error) {
      if (!row) await api.supabase.storage.from('resource-files').remove([storagePath]);
      throw error;
    }
  };

  const persistDrafts = async isPublished => {
    const chosen = selectedDrafts();
    if (!chosen.length) return;
    saveDraftsButton.disabled = true; publishDraftsButton.disabled = true;
    let complete = 0;
    try {
      for (const draft of chosen) {
        uploadStatus.textContent = `${isPublished ? 'Publishing' : 'Saving'} ${complete + 1} of ${chosen.length}: ${draft.title || draft.file.name}`;
        await saveDraft(draft, isPublished);
        drafts = drafts.filter(entry => entry.id !== draft.id);
        complete += 1; renderDrafts();
      }
      await api.refreshCatalog();
      await loadResources();
      uploadStatus.textContent = `${isPublished ? 'Published' : 'Saved'} ${complete} resource${complete === 1 ? '' : 's'}. PDF previews were generated only as watermarked JPEG pages.`;
    } catch (error) {
      uploadStatus.textContent = error instanceof Error ? error.message : 'Unable to save the staged resource.';
    } finally { renderDrafts(); }
  };

  const deleteResource = async row => {
    const action = row.is_published ? 'delete this published resource' : 'delete this draft';
    if (!window.confirm(`Are you sure you want to ${action}: “${row.title}”? Completed buyer downloads will be preserved instead of permanently deleting a purchased file.`)) return;
    const { data: purchases, error: purchaseError } = await api.supabase.from('purchases').select('id').eq('resource_id', row.id).limit(1);
    if (purchaseError) throw purchaseError;
    if (purchases?.length) {
      const { error } = await api.supabase.from('resources').update({ is_published: false }).eq('id', row.id);
      if (error) throw error;
      alert(`“${row.title}” was removed from the public Store and archived because completed purchases exist. Private buyer delivery remains protected.`);
    } else {
      const { error } = await api.supabase.from('resources').delete().eq('id', row.id);
      if (error) throw error;
      const previewPaths = row.thumbnail_path?.endsWith('-full-preview-page-1.jpg') ? Array.from({ length: Math.max(1, Number(row.page_count) || 1) }, (_, index) => row.thumbnail_path.replace('-full-preview-page-1.jpg', `-full-preview-page-${index + 1}.jpg`)) : row.thumbnail_path ? [row.thumbnail_path] : [];
      if (row.storage_path) await api.supabase.storage.from('resource-files').remove([row.storage_path]);
      if (previewPaths.length) await api.supabase.storage.from('resource-thumbnails').remove(previewPaths);
    }
    await api.refreshCatalog(); await loadResources();
  };

  const updateSelected = async patch => {
    const ids = [...selectedResources];
    if (!ids.length) throw new Error('Select one or more saved resources first.');
    if (!Object.keys(patch).length) throw new Error('Choose at least one bulk value to change.');
    const { error } = await api.supabase.from('resources').update(patch).in('id', ids);
    if (error) throw error;
    await api.refreshCatalog(); await loadResources(); selectedResources = new Set(); renderCatalog();
  };
  const migrateLegacyRecoveryTopics = async () => {
    const updates = resources.map(row => {
      const explicit = recoveryTopicsFromTags(row.topic_tags);
      const fallback = resolveExplicitStoreTopic(row.category);
      const recoveryTopics = explicit.length ? explicit : (fallback ? [fallback] : []);
      if (!recoveryTopics.length) return null;
      const topicTags = mergeRecoveryTopicsAndKeywords(recoveryTopics, keywordTagsFromTags(row.topic_tags).join(', '));
      return JSON.stringify(topicTags) === JSON.stringify(row.topic_tags || []) ? null : { id: row.id, topicTags };
    }).filter(Boolean);
    if (!updates.length) { uploadStatus.textContent = 'No clear legacy Recovery Topic labels need to be mapped.'; return; }
    if (!window.confirm(`Apply the explicit Recovery Topic mapping to ${updates.length} existing resource${updates.length === 1 ? '' : 's'}? PDFs, previews, prices, categories, and other metadata will not change.`)) return;
    for (const update of updates) {
      const { error } = await api.supabase.from('resources').update({ topic_tags: update.topicTags }).eq('id', update.id);
      if (error) throw error;
    }
    await api.refreshCatalog();
    await loadResources();
    uploadStatus.textContent = `Mapped ${updates.length} existing resource${updates.length === 1 ? '' : 's'} to explicit Recovery Topics.`;
  };

  const knownCollections = () => [...new Set([
    ...Object.keys(api.resourceDb), ...resources.map(row => row.category).filter(Boolean), ...MANAGER_COLLECTIONS, ...collectionNames(),
  ])];
  const resolvedCollectionName = value => {
    const proposed = normalizeCollectionName(value);
    if (!proposed) return '';
    const recommendation = recommendCollection({ title: proposed, fileName: proposed }, { existingCollections: knownCollections() });
    return recommendation.state === 'high' ? recommendation.suggestedCollection : proposed;
  };
  const applyAnalysis = (draft, analysis, overwrite = false) => {
    draft.recommendation = analysis.recommendation;
    draft.extractedTextAvailable = Boolean(analysis.extractedText);
    if (overwrite || !draft.title.trim()) draft.title = analysis.title || draft.title;
    if (overwrite || !draft.description.trim()) draft.description = analysis.description || draft.description;
    if (overwrite || !draft.topicTags.trim()) draft.topicTags = keywordTagsFromTags(analysis.tags || []).join(', ');
    if (overwrite || !draft.price.trim()) draft.price = analysis.suggestedPrice || draft.price;
    if (overwrite || !draft.pageCount.trim()) draft.pageCount = analysis.pageCount ? String(analysis.pageCount) : draft.pageCount;
    if (overwrite || draft.type === typeFromFile(draft.file)) draft.type = analysis.type || draft.type;
    if ((overwrite || !draft.category) && analysis.recommendation?.state !== 'no-match' && resolveExplicitStoreTopic(analysis.collection)) {
      draft.category = analysis.collection;
      draft.recoveryTopics = [analysis.collection];
      draft.customCategory = '';
    }
  };
  const requestAiMetadata = async (draft, extractedText) => {
    const session = api.getSession?.();
    if (!session?.access_token) throw new Error('Sign in as an administrator to use automatic PDF details.');
    const response = await fetch('/api/secure-intake/ai-metadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ fileName: draft.file.name, extractedText }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.title || !result.description) throw new Error(result.error || 'Enhanced PDF details are unavailable.');
    return result;
  };
  const applyAiMetadata = (draft, metadata) => {
    draft.title = String(metadata.title || draft.title).trim();
    draft.description = String(metadata.description || draft.description).trim();
    const category = resolveExplicitStoreTopic(metadata.category);
    if (category) {
      draft.category = category;
      draft.recoveryTopics = [category];
      draft.customCategory = '';
      draft.recommendation = { state: 'high', confidence: 99, suggestedCollection: category, candidates: [{ name: category, confidence: 99 }], matchedTerms: [] };
    }
    if (RESOURCE_TYPES.includes(metadata.resourceType)) draft.type = metadata.resourceType;
    const keywords = Array.isArray(metadata.keywords) ? metadata.keywords.map(keyword => String(keyword).trim()).filter(Boolean) : [];
    if (keywords.length) draft.topicTags = [...new Set(keywords)].slice(0, 8).join(', ');
  };
  const analyzeDraft = async (draft, overwrite = false) => {
    if (!draft) return;
    draft.analysisState = 'analyzing'; draft.analysisProgress = 16; draft.analysisStage = 'Reading document locally'; draft.analysisMessage = ''; draft.aiMetadataState = 'idle'; draft.aiMetadataMessage = ''; renderDrafts();
    try {
      const analysis = await analyzeResourceFile(draft.file, {
        fileName: draft.file.name, title: draft.title, description: draft.description, tags: draft.topicTags,
      }, { existingCollections: knownCollections() });
      applyAnalysis(draft, analysis, overwrite);
      draft.analysisProgress = 64; draft.analysisStage = 'Preparing metadata suggestions'; renderDrafts();
      if (/\.pdf$/i.test(draft.file.name || '') && analysis.extractedText) {
        draft.analysisProgress = 78; draft.analysisStage = 'Writing Store details automatically'; draft.aiMetadataState = 'loading'; renderDrafts();
        try {
          const metadata = await requestAiMetadata(draft, analysis.extractedText);
          applyAiMetadata(draft, metadata);
          draft.aiMetadataState = 'ready';
        } catch (error) {
          draft.aiMetadataState = 'unavailable';
          draft.aiMetadataMessage = error instanceof Error ? error.message : 'Enhanced PDF details are unavailable. The local suggestions remain editable.';
        }
      } else if (/\.pdf$/i.test(draft.file.name || '')) {
        draft.aiMetadataState = 'unavailable';
        draft.aiMetadataMessage = 'No readable PDF text was available, so the editable filename and local topic suggestions were used.';
      }
      draft.analysisState = 'ready'; draft.analysisProgress = 100; draft.analysisStage = 'Ready — details filled automatically';
    } catch (error) {
      draft.analysisState = 'error'; draft.analysisProgress = 100; draft.analysisStage = 'Manual review needed';
      draft.analysisMessage = error instanceof Error ? error.message : 'Local analysis could not be completed.';
    }
    renderDrafts();
  };
  const chooseCollection = (draft, collection) => {
    if (!draft || !collection) return;
    draft.category = resolvedCollectionName(collection);
    draft.customCategory = '';
    renderDrafts();
  };

  const stageFiles = (files, pdfOnly = false) => {
    const candidates = Array.from(files || []);
    const next = candidates.filter(file => api.isSupportedResourceFile(file) && (!pdfOnly || /\.pdf$/i.test(file.name || '')));
    const skipped = candidates.length - next.length;
    const additions = next.map(createDraft);
    drafts = [...drafts, ...additions];
    uploadStatus.textContent = additions.length ? `${additions.length} ${additions.length === 1 ? 'file is' : 'files are'} in the private review queue.${skipped ? ` ${skipped} unsupported file${skipped === 1 ? ' was' : 's were'} skipped.` : ''}` : pdfOnly ? 'Drop PDF files here, or use Upload Resources for supported document types.' : 'Choose supported PDF, DOCX, or PPTX files.';
    renderDrafts();
    additions.forEach(draft => void analyzeDraft(draft, true));
  };
  const queueFiles = event => { stageFiles(event.target.files); event.target.value = ''; };
  const queueDroppedPdfs = event => { stageFiles(event.target.files, true); event.target.value = ''; };
  manager.querySelector('#v15UploadInput').addEventListener('change', queueFiles);
  manager.querySelector('#v15DropInput').addEventListener('change', queueDroppedPdfs);
  const dropZone = manager.querySelector('#v15DropZone');
  ['dragenter', 'dragover'].forEach(type => dropZone.addEventListener(type, event => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; dropZone.classList.add('is-dragging'); }));
  ['dragleave', 'drop'].forEach(type => dropZone.addEventListener(type, event => { event.preventDefault(); dropZone.classList.remove('is-dragging'); }));
  dropZone.addEventListener('drop', event => stageFiles(event.dataTransfer.files, true));
  dropZone.addEventListener('click', event => { if (!event.target.closest('label')) manager.querySelector('#v15DropInput').click(); });
  dropZone.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); manager.querySelector('#v15DropInput').click(); } });
  manager.querySelector('#v15ClearDrafts').addEventListener('click', () => { drafts = []; uploadStatus.textContent = 'The private staging queue was cleared. No files were uploaded.'; renderDrafts(); });
  seriesPanel.addEventListener('click', event => {
    const edit = event.target.closest('[data-v15-edit-series]');
    if (edit) { editSeriesId = edit.dataset.v15EditSeries; renderSeriesPanel(); return; }
    if (event.target.closest('[data-v15-new-series]')) { editSeriesId = null; renderSeriesPanel(); return; }
    const status = seriesPanel.querySelector('[data-v15-series-status]');
    if (event.target.closest('[data-v15-save-series]')) {
      void (async () => {
        const get = field => seriesPanel.querySelector(`[data-v15-series-field="${field}"]`)?.value ?? '';
        const title = get('title').trim(); const displayName = get('display_name').trim() || title;
        const slug = get('slug').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const bundlePrice = priceToCents(get('bundle_price'));
        if (!title || !slug || !Number.isFinite(bundlePrice) || bundlePrice < 0) { status.textContent = 'Series title, URL slug, and a non-negative bundle price are required.'; return; }
        const session = api.getSession(); if (!session?.user?.id) throw new Error('Your administrator session expired. Sign in again before saving a Series.');
        const patch = { title, display_name: displayName, slug, brand: get('brand').trim() || 'Chapter 21', category: get('category') || null, category_color: get('category_color').trim() || null, bundle_price_cents: bundlePrice, is_published: get('is_published') === 'true', cover_image: get('cover_image').trim() || null, description: get('description').trim() || null };
        const query = editSeriesId ? api.supabase.from('resource_series').update(patch).eq('id', editSeriesId) : api.supabase.from('resource_series').insert({ ...patch, created_by: session.user.id });
        const { error } = await query; if (error) throw error;
        editSeriesId = null; await loadResources();
      })().catch(error => { status.textContent = error instanceof Error ? error.message : 'Unable to save this Series.'; });
      return;
    }
    if (event.target.closest('[data-v15-delete-series]') && editSeriesId) {
      void (async () => {
        const record = series.find(entry => entry.id === editSeriesId); const members = membersForSeries(editSeriesId);
        if (!window.confirm(`Delete “${record?.display_name || record?.title}”? ${members.length} member resource${members.length === 1 ? '' : 's'} will remain as independent Store resources.`)) return;
        if (members.length) { const { error } = await api.supabase.from('resources').update({ series_name: null, selling_option: 'individual' }).eq('series_id', editSeriesId); if (error) throw error; }
        const { error } = await api.supabase.from('resource_series').delete().eq('id', editSeriesId); if (error) throw error;
        editSeriesId = null; await loadResources();
      })().catch(error => { status.textContent = error instanceof Error ? error.message : 'Unable to delete this Series.'; });
    }
  });
  stageList.addEventListener('click', event => {
    const remove = event.target.closest('[data-v15-remove-draft]');
    const preview = event.target.closest('[data-v15-preview-draft]');
    const row = event.target.closest('[data-v15-draft]');
    const draft = drafts.find(entry => entry.id === row?.dataset.v15Draft);
    if (remove) { event.preventDefault(); drafts = drafts.filter(draft => draft.id !== remove.dataset.v15RemoveDraft); renderDrafts(); }
    const useCollection = event.target.closest('[data-v15-use-collection]');
    if (useCollection && draft) chooseCollection(draft, useCollection.getAttribute('data-v15-use-collection'));
    if (event.target.closest('[data-v15-choose-collection]') && draft) {
      draft.customCategory = ''; renderDrafts();
      stageList.querySelector(`[data-v15-draft="${draft.id}"] [data-v15-draft-field="category"]`)?.focus();
    }
    if (event.target.closest('[data-v15-create-collection]') && draft) {
      draft.customCategory = normalizeCollectionName(draft.recommendation?.suggestedCollection || 'New Recovery Resource Collection');
      draft.category = resolvedCollectionName(draft.customCategory); renderDrafts();
      stageList.querySelector(`[data-v15-draft="${draft.id}"] [data-v15-draft-field="customCategory"]`)?.focus();
    }
    const refresh = event.target.closest('[data-v15-refresh-analysis]');
    if (refresh && draft) void analyzeDraft(draft, false);
    if (preview) {
      if (!draft) return;
      if (!/\.pdf$/i.test(draft.file.name)) { uploadStatus.textContent = 'Local preview is available for pending PDFs. DOCX and PPTX preview generation is not yet enabled; enter the count manually before saving.'; return; }
      const url = URL.createObjectURL(draft.file); window.averyLocalPreviewUrl = url;
      const modal = document.getElementById('v14PreviewModal'); const frame = document.getElementById('v14PreviewFrame'); const empty = document.getElementById('v14PreviewEmpty');
      document.getElementById('v14PreviewTitle').textContent = draft.title || draft.file.name; document.getElementById('v14PreviewMeta').textContent = 'ADMINISTRATOR LOCAL PDF REVIEW · NOT PUBLIC';
      frame.src = url; frame.style.display = 'block'; empty.style.display = 'none'; modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false');
    }
  });
  stageList.addEventListener('change', event => {
    const row = event.target.closest('[data-v15-draft]'); const id = row?.dataset.v15Draft; const draft = drafts.find(entry => entry.id === id); if (!draft) return;
    if (event.target.matches('[data-v15-draft-select]')) draft.selected = event.target.checked;
    if (event.target.matches('[data-v15-draft-recovery-topic]')) {
      const topic = event.target.dataset.v15DraftRecoveryTopic;
      draft.recoveryTopics = event.target.checked ? [...new Set([...draft.recoveryTopics, topic])] : draft.recoveryTopics.filter(entry => entry !== topic);
      renderDrafts();
      return;
    }
    const field = event.target.dataset.v15DraftField;
    if (field === 'customCategory') {
      draft.customCategory = event.target.value;
      draft.category = resolvedCollectionName(event.target.value);
    } else if (field) {
      draft[field] = event.target.value;
      if (field === 'seriesId') draft.seriesName = seriesNameFor(series, draft.seriesId);
      if (field === 'category') draft.customCategory = '';
    }
    renderDrafts();
  });
  saveDraftsButton.addEventListener('click', () => void persistDrafts(false));
  publishDraftsButton.addEventListener('click', () => void persistDrafts(true));

  manager.querySelectorAll('#v15Search,#v15Audience,#v15Topic,#v15Status,#v15Type,#v15Series,#v15Sort').forEach(control => control.addEventListener(control.matches('input') ? 'input' : 'change', () => { catalogPage = 1; renderCatalog(); }));
  manager.querySelector('#v15CatalogPagination').addEventListener('click', event => {
    const button = event.target.closest('[data-v15-catalog-page]');
    if (!button || button.disabled) return;
    catalogPage = Number(button.dataset.v15CatalogPage) || 1;
    renderCatalog();
    manager.querySelector('#v15CatalogHeading')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  });
  manager.querySelector('#v15SelectVisible').addEventListener('click', () => { const firstIndex = (catalogPage - 1) * CATALOG_PAGE_SIZE; filteredResources().slice(firstIndex, firstIndex + CATALOG_PAGE_SIZE).forEach(row => selectedResources.add(row.id)); renderCatalog(); });
  manager.querySelector('#v15ClearSelection').addEventListener('click', () => { selectedResources = new Set(); renderCatalog(); });
  manager.querySelector('#v15MigrateTopics').addEventListener('click', () => void migrateLegacyRecoveryTopics().catch(error => { uploadStatus.textContent = error instanceof Error ? error.message : 'Unable to map legacy Recovery Topics.'; }));
  manager.querySelector('#v15ApplyBulk').addEventListener('click', () => {
    const patch = {}; const category = manager.querySelector('#v15BulkCategory').value; const audience = manager.querySelector('#v15BulkAudience').value; const type = manager.querySelector('#v15BulkType').value; const status = manager.querySelector('#v15BulkStatus').value; const series = manager.querySelector('#v15BulkSeries').value.trim(); const price = manager.querySelector('#v15BulkPrice').value;
    if (category) patch.category = category; if (audience) patch.audience = audience; if (type) patch.resource_type = type; if (status) patch.is_published = status === 'published'; if (series) patch.series_name = series;
    if (price) { const cents = priceToCents(price); if (!Number.isFinite(cents) || cents < 0) { alert('Enter a valid bulk price or leave it blank.'); return; } patch.price_cents = cents; }
    void updateSelected(patch).catch(error => alert(error instanceof Error ? error.message : 'Unable to update selected resources.'));
  });
  catalogList.addEventListener('change', event => { const id = event.target.dataset.v15ResourceSelect; if (!id) return; event.target.checked ? selectedResources.add(id) : selectedResources.delete(id); renderCatalog(); });
  catalogList.addEventListener('click', event => {
    const getRow = attribute => resources.find(row => row.id === event.target.closest(`[${attribute}]`)?.getAttribute(attribute));
    const edit = getRow('data-v15-edit'); const preview = getRow('data-v15-preview-resource'); const duplicate = getRow('data-v15-duplicate'); const remove = getRow('data-v15-delete');
    if (edit) populateEditor(edit);
    if (preview) void api.openSecurePreview(rowToPreviewItem(api, preview), preview.category);
    if (duplicate) void (async () => { const session = api.getSession(); const { error } = await api.supabase.from('resources').insert({ category: duplicate.category, title: `Draft copy of ${duplicate.title}`, description: duplicate.description || '', resource_type: duplicate.resource_type, price_cents: duplicate.price_cents, page_count: duplicate.page_count, topic_tags: duplicate.topic_tags || [], is_published: false, created_by: session.user.id, audience: duplicate.audience || 'Client', subcategory: duplicate.subcategory, series_id: duplicate.series_id, series_name: duplicate.series_name, selling_option: duplicate.selling_option || 'individual', volume_number: duplicate.volume_number, series_order: duplicate.series_order, subtitle: duplicate.subtitle, author_name: duplicate.author_name, publisher_name: duplicate.publisher_name }).select('id').single(); if (error) throw error; await loadResources(); }).catch(error => alert(error instanceof Error ? error.message : 'Unable to duplicate metadata.'));
    if (remove) void deleteResource(remove).catch(error => alert(error instanceof Error ? error.message : 'Unable to delete this resource.'));
  });

  manager.querySelector('#v15SaveEdit').addEventListener('click', () => void (async () => {
    const row = resources.find(entry => entry.id === editId); if (!row) return;
    const get = field => manager.querySelector(`[data-v15-edit-field="${field}"]`)?.value ?? '';
    const priceCents = priceToCents(get('price')); const pageCount = intOrNull(get('page_count')); const recoveryTopics = [...manager.querySelectorAll('[data-v15-edit-recovery-topic]:checked')].map(input => input.dataset.v15EditRecoveryTopic);
    if (!get('title').trim() || !get('category') || !Number.isFinite(priceCents) || priceCents < 0 || !pageCount) { manager.querySelector('#v15EditorStatus').textContent = 'Title, category, non-negative price, and page/slide count are required.'; return; }
    const seriesId = get('series_id') || null;
    const patch = { title: get('title').trim(), category: get('category'), subcategory: get('subcategory').trim() || null, resource_type: get('resource_type'), audience: get('audience'), page_count: pageCount, price_cents: priceCents, topic_tags: mergeRecoveryTopicsAndKeywords(recoveryTopics, get('topic_tags')), series_id: seriesId, series_name: seriesNameFor(series, seriesId) || null, selling_option: get('selling_option') || 'individual', volume_number: intOrNull(get('volume_number')), series_order: intOrNull(get('series_order')), subtitle: get('subtitle').trim() || null, author_name: get('author_name').trim() || null, publisher_name: get('publisher_name').trim() || null, is_published: get('is_published') === 'true', description: get('description').trim() };
    const { data, error } = await api.supabase.from('resources').update(patch).eq('id', row.id).select('id, category, title, description, resource_type, price_cents, page_count, storage_path, file_name, thumbnail_path, topic_tags, is_published, audience, subcategory, series_id, series_name, selling_option, volume_number, series_order, subtitle, author_name, publisher_name, created_at').single();
    if (error) throw error; patchPublishedResource(api, data); manager.querySelector('#v15EditorStatus').textContent = `Saved “${data.title}”.`; await api.refreshCatalog(); await loadResources();
  })().catch(error => { manager.querySelector('#v15EditorStatus').textContent = error instanceof Error ? error.message : 'Unable to save resource changes.'; }));
  manager.querySelector('#v15CancelEdit').addEventListener('click', () => { manager.querySelector('#v15Editor').hidden = true; editId = null; });

  browse.querySelectorAll('#v15PublicSearch,#v15PublicAudience,#v15PublicTopic,#v15PublicType').forEach(control => control.addEventListener(control.matches('input') ? 'input' : 'change', renderPublicBrowse));
  browse.addEventListener('click', event => {
    const shop = event.target.closest('[data-v15-shop]');
    if (shop) { browse.querySelector('#v15PublicAudience').value = shop.dataset.v15Shop; browse.querySelector('#v15PublicTopic').value = ''; browse.querySelectorAll('[data-v15-shop]').forEach(button => { const active = button === shop; button.classList.toggle('is-active', active); button.setAttribute('aria-pressed', String(active)); }); renderPublicBrowse(); return; }
    const recoveryTopic = event.target.closest('[data-v15-recovery-topic]');
    if (recoveryTopic) { browse.querySelector('#v15PublicTopic').value = recoveryTopic.dataset.v15RecoveryTopic; renderPublicBrowse(); return; }
    const id = ['v15Detail', 'v15PublicPreview', 'v15PublicCart'].map(key => event.target.closest(`[data-${key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}]`)?.dataset[key]).find(Boolean);
    const row = resources.find(entry => entry.id === id); if (!row) return; const item = rowToPreviewItem(api, row);
    if (event.target.closest('[data-v15-public-preview]')) void api.openSecurePreview(item, row.category);
    else if (event.target.closest('[data-v15-public-cart]')) api.addToCart(item);
    else if (event.target.closest('[data-v15-detail]')) { const cover = item.thumbnailUrl ? `<img class="v15-dialog-cover" src="${escapeHtml(item.thumbnailUrl)}" alt="Watermarked preview page 1 for ${escapeHtml(row.title)}">` : ''; dialog.innerHTML = `<div class="v15-resource-dialog-body"><button class="v15-dialog-x" type="button" data-v15-dialog-x aria-label="Close resource details">×</button>${cover}<span class="v15-kicker">${escapeHtml(row.resource_type)}</span><h3>${escapeHtml(row.title)}</h3>${row.subtitle ? `<p><strong>${escapeHtml(row.subtitle)}</strong></p>` : ''}<p>${escapeHtml(row.description || 'Resource details are being prepared.')}</p><p class="v15-public-meta">${escapeHtml(resourceCountLabel(row))} · ${promotionPriceMarkup(api, item)}${row.series_name ? ` · ${escapeHtml(row.series_name)}${row.volume_number ? ` Vol. ${row.volume_number}` : ''}` : ''}</p><div class="v15-actions"><button class="v9-btn" type="button" data-v15-dialog-preview>Preview</button><button class="v9-btn primary" type="button" data-v15-dialog-cart>Add to Cart</button><button class="v9-btn" type="button" data-v15-dialog-back>← Back to Store Results</button><button class="v9-btn" type="button" data-v15-dialog-close>Close</button></div></div>`; dialog.showModal(); dialog.querySelector('[data-v15-dialog-x]').onclick = () => dialog.close(); dialog.querySelector('[data-v15-dialog-preview]').onclick = () => { dialog.close(); void api.openSecurePreview(item, row.category); }; dialog.querySelector('[data-v15-dialog-cart]').onclick = () => api.addToCart(item); dialog.querySelector('[data-v15-dialog-back]').onclick = () => { dialog.close(); window.requestAnimationFrame(() => { browse.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); browse.querySelector('#v15PublicSearch')?.focus({ preventScroll: true }); }); }; dialog.querySelector('[data-v15-dialog-close]').onclick = () => dialog.close(); }
  });
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  loadResources().catch(error => { uploadStatus.textContent = error instanceof Error ? error.message : 'Unable to load Store resources.'; });
  return true;
}

function mountPublicStoreBrowser() {
  const api = currentApi();
  const storeShell = document.querySelector('#store .store-shell');
  if (!api || typeof api.addToCart !== 'function' || !storeShell) return false;
  const mountedBrowse = document.getElementById('v15PublicBrowse');
  if (mountedBrowse?.dataset.v15CartApiReady === 'true') return true;
  mountedBrowse?.remove();
  document.getElementById('v15ResourceDetail')?.remove();
  managerStyles();
  const browse = document.createElement('section');
  browse.id = 'v15PublicBrowse';
  browse.className = 'v15-public-browser';
  browse.dataset.v15CartApiReady = 'true';
  browse.setAttribute('aria-labelledby', 'v15PublicBrowseHeading');
  browse.innerHTML = publicBrowseMarkup();
  storeShell.querySelector('.store-intro')?.insertAdjacentElement('afterend', browse);
  const dialog = document.createElement('dialog');
  dialog.id = 'v15ResourceDetail'; dialog.className = 'v15-resource-dialog'; document.body.appendChild(dialog);
  const items = () => Object.values(api.resourceDb).flat().filter(item => item?.remoteId && item.storagePath);
  const addPublicItemToCart = button => {
    const activeApi = currentApi();
    const id = button?.closest('[data-v15-public-resource]')?.dataset.v15PublicResource;
    const item = items().find(entry => entry.remoteId === id);
    if (!item || !activeApi || typeof activeApi.addToCart !== 'function') return;
    activeApi.addToCart(item);
  };
  let publicSeries = [];
  const seriesMembers = id => items().filter(item => item.seriesId === id).sort((a, b) => Number(a.seriesOrder || 0) - Number(b.seriesOrder || 0) || a.title.localeCompare(b.title));
  const renderSeries = () => {
    const target = browse.querySelector('#v15SeriesBrowse');
    if (!target) return;
    const visible = publicSeries.filter(record => record.is_published && seriesMembers(record.id).length);
    target.hidden = !visible.length;
    target.innerHTML = visible.length ? `<div class="v15-series-heading"><h4 id="v15SeriesBrowseHeading">Featured Series</h4><span>Explore connected resources in a guided collection.</span></div><div class="v15-series-grid">${visible.map(record => { const members = seriesMembers(record.id); const bundleMembers = members.filter(item => item.sellingOption !== 'individual'); const cover = record.cover_image || members[0]?.thumbnailUrl; return `<article class="v15-series-card" style="--v15-series-color:${escapeHtml(record.category_color || '#D29147')}" data-v15-series-card="${record.id}"><div class="v15-series-cover">${cover ? `<img src="${escapeHtml(cover)}" alt="${escapeHtml(record.display_name || record.title)} series cover" loading="lazy">` : '<span>Series cover preparing</span>'}</div><div class="v15-series-content"><span class="v15-kicker">${escapeHtml(record.brand || 'Series')}</span><h5>${escapeHtml(record.display_name || record.title)}</h5><p>${escapeHtml(record.description || 'A connected set of practical recovery resources.')}</p><div class="v15-public-meta">${members.length} resource${members.length === 1 ? '' : 's'}</div>${seriesPromotionBadge(record)}<div class="v15-actions"><button class="v9-btn" type="button" data-v15-series-details="${record.id}">View Series</button>${bundleMembers.length ? `<button class="v9-btn primary" type="button" data-v15-series-cart="${record.id}">Add Complete Series</button>` : ''}</div></div></article>`; }).join('')}</div>` : '';
  };
  const loadPublicSeries = async () => {
    const { data, error } = await api.supabase.from('resource_series').select('id, title, display_name, brand, description, category, category_color, cover_image, bundle_price_cents, is_published').eq('is_published', true).order('created_at', { ascending: false });
    if (!error) publicSeries = data || [];
    renderSeries();
  };
  const optionValues = (selector, label, values) => {
    const input = browse.querySelector(selector); if (!input) return;
    const current = input.value;
    input.innerHTML = `<option value="">All ${label}</option>${values.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('')}`;
    input.value = values.includes(current) ? current : '';
  };
  const render = () => {
    const all = items();
    renderSeries();
    optionValues('#v15PublicType', 'resource types', [...new Set(all.map(item => item.type).filter(Boolean))].sort());
    const search = String(browse.querySelector('#v15PublicSearch')?.value || '').trim().toLowerCase();
    const audience = browse.querySelector('#v15PublicAudience')?.value || '';
    const type = browse.querySelector('#v15PublicType')?.value || '';
    const topic = browse.querySelector('#v15PublicTopic')?.value || '';
    renderAudienceCollectionNavigator(browse, all);
    const matching = all.filter(item => {
      const text = [item.title, item.description, ...(item.topicTags || [])].join(' ').toLowerCase();
      return item.sellingOption !== 'bundle_only' && (!search || text.includes(search)) && matchesAudience(item.audience, audience) && hasRecoveryTopic(item, topic) && (!type || item.type === type);
    });
    const grid = browse.querySelector('#v15PublicGrid');
    grid.innerHTML = matching.length ? matching.map(item => {
      const cover = item.thumbnailUrl ? `<img src="${escapeHtml(item.thumbnailUrl)}" alt="Watermarked preview page 1 for ${escapeHtml(item.title)}" loading="lazy">` : '<span class="v15-subtle">Protected preview preparing</span>';
      const info = `${item.pages} ${isSlideDeck(item) ? 'slides' : 'pages'}`;
      return `<article class="v15-public-card ${substantialType(item) ? 'v15-substantial' : ''}" data-v15-public-resource="${item.remoteId}"><div class="v15-public-cover">${cover}</div><div class="v15-public-content"><div class="v15-badges"><span class="v15-badge">${escapeHtml(item.category)}</span><span class="v15-badge muted">${escapeHtml(item.type)}</span><span class="v15-badge muted">${escapeHtml(audienceLabel(item.audience || 'Client'))}</span></div><h4>${escapeHtml(item.title)}</h4>${item.subtitle ? `<p>${escapeHtml(item.subtitle)}</p>` : ''}<p>${escapeHtml(item.description || 'Resource details are available in the product view.')}</p><div class="v15-public-meta">${escapeHtml(info)} · ${promotionPriceMarkup(api, item)}${item.seriesName ? ` · ${escapeHtml(item.seriesName)}${item.volumeNumber ? ` Vol. ${item.volumeNumber}` : ''}` : ''}</div><div class="v15-actions"><button class="v9-btn" type="button" data-v15-detail="${item.remoteId}">View details</button><button class="v9-btn" type="button" data-v15-public-preview="${item.remoteId}">Preview</button><button class="v9-btn primary" type="button" data-v15-public-cart="${item.remoteId}">Add to Cart</button></div></div></article>`;
    }).join('') : '<div class="v15-empty">Resources are being added to this collection. Please check back soon.</div>';
    grid.querySelectorAll('[data-v15-public-cart]').forEach(button => {
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        addPublicItemToCart(button);
      });
    });
  };
  browse.querySelectorAll('#v15PublicSearch,#v15PublicAudience,#v15PublicTopic,#v15PublicType').forEach(control => control.addEventListener(control.matches('input') ? 'input' : 'change', render));
  browse.addEventListener('click', event => {
    const shop = event.target.closest('[data-v15-shop]');
    if (shop) { browse.querySelector('#v15PublicAudience').value = shop.dataset.v15Shop; browse.querySelector('#v15PublicTopic').value = ''; browse.querySelectorAll('[data-v15-shop]').forEach(button => { const active = button === shop; button.classList.toggle('is-active', active); button.setAttribute('aria-pressed', String(active)); }); render(); return; }
    const recoveryTopic = event.target.closest('[data-v15-recovery-topic]');
    if (recoveryTopic) { browse.querySelector('#v15PublicTopic').value = recoveryTopic.dataset.v15RecoveryTopic; render(); return; }
    const seriesId = event.target.closest('[data-v15-series-details],[data-v15-series-cart]')?.dataset.v15SeriesDetails || event.target.closest('[data-v15-series-cart]')?.dataset.v15SeriesCart;
    if (seriesId) {
      const record = publicSeries.find(entry => entry.id === seriesId); const members = seriesMembers(seriesId); const bundleMembers = members.filter(item => item.sellingOption !== 'individual');
      if (event.target.closest('[data-v15-series-cart]')) { bundleMembers.forEach(item => api.addToCart({ ...item, bundlePurchaseSeriesId: seriesId })); return; }
      const cover = record?.cover_image || members[0]?.thumbnailUrl;
      dialog.innerHTML = `<div class="v15-resource-dialog-body"><button class="v15-dialog-x" type="button" data-v15-dialog-x aria-label="Close series details">×</button>${cover ? `<img class="v15-dialog-cover" src="${escapeHtml(cover)}" alt="${escapeHtml(record?.display_name || record?.title || 'Series')} cover">` : ''}<span class="v15-kicker">${escapeHtml(record?.brand || 'Series')}</span><h3>${escapeHtml(record?.display_name || record?.title || 'Series')}</h3><p>${escapeHtml(record?.description || 'A connected set of practical recovery resources.')}</p>${seriesPromotionBadge(record)}<div class="v15-series-detail-list">${members.map(item => `<div class="v15-series-member"><div><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(`${item.pages} ${isSlideDeck(item) ? 'slides' : 'pages'}`)} · ${promotionPriceMarkup(api, item)}</span></div><div class="v15-actions"><button class="v9-btn" type="button" data-v15-series-member-preview="${item.remoteId}">Preview</button>${item.sellingOption !== 'bundle_only' ? `<button class="v9-btn primary" type="button" data-v15-series-member-cart="${item.remoteId}">Add to Cart</button>` : ''}</div></div>`).join('')}</div><div class="v15-actions" style="margin-top:14px">${bundleMembers.length ? `<button class="v9-btn primary" type="button" data-v15-series-cart="${seriesId}">Add Complete Series</button>` : ''}<button class="v9-btn" type="button" data-v15-dialog-close>Close</button></div></div>`;
      dialog.showModal(); dialog.querySelector('[data-v15-dialog-x]').onclick = () => dialog.close(); dialog.querySelector('[data-v15-dialog-close]').onclick = () => dialog.close(); return;
    }
    const memberId = event.target.closest('[data-v15-series-member-preview],[data-v15-series-member-cart]')?.dataset.v15SeriesMemberPreview || event.target.closest('[data-v15-series-member-cart]')?.dataset.v15SeriesMemberCart;
    if (memberId) { const item = items().find(entry => entry.remoteId === memberId); if (!item) return; if (event.target.closest('[data-v15-series-member-preview]')) void api.openSecurePreview(item, item.category); else api.addToCart(item); return; }
    const id = event.target.closest('[data-v15-detail],[data-v15-public-preview],[data-v15-public-cart]')?.closest('[data-v15-public-resource]')?.dataset.v15PublicResource;
    const item = items().find(entry => entry.remoteId === id); if (!item) return;
    if (event.target.closest('[data-v15-public-preview]')) void api.openSecurePreview(item, item.category);
    else if (event.target.closest('[data-v15-public-cart]')) addPublicItemToCart(event.target.closest('[data-v15-public-cart]'));
    else if (event.target.closest('[data-v15-detail]')) {
      const cover = item.thumbnailUrl ? `<img class="v15-dialog-cover" src="${escapeHtml(item.thumbnailUrl)}" alt="Watermarked preview page 1 for ${escapeHtml(item.title)}">` : '';
      dialog.innerHTML = `<div class="v15-resource-dialog-body"><button class="v15-dialog-x" type="button" data-v15-dialog-x aria-label="Close resource details">×</button>${cover}<span class="v15-kicker">${escapeHtml(item.type)}</span><h3>${escapeHtml(item.title)}</h3>${item.subtitle ? `<p><strong>${escapeHtml(item.subtitle)}</strong></p>` : ''}<p>${escapeHtml(item.description || 'Resource details are available in the Store.')}</p><p class="v15-public-meta">${escapeHtml(`${item.pages} ${isSlideDeck(item) ? 'slides' : 'pages'}`)} · ${promotionPriceMarkup(api, item)}${item.seriesName ? ` · ${escapeHtml(item.seriesName)}${item.volumeNumber ? ` Vol. ${item.volumeNumber}` : ''}` : ''}</p><div class="v15-actions"><button class="v9-btn" type="button" data-v15-dialog-preview>Preview</button><button class="v9-btn primary" type="button" data-v15-dialog-cart>Add to Cart</button><button class="v9-btn" type="button" data-v15-dialog-back>← Back to Store Results</button><button class="v9-btn" type="button" data-v15-dialog-close>Close</button></div></div>`;
      dialog.showModal(); dialog.querySelector('[data-v15-dialog-x]').onclick = () => dialog.close(); dialog.querySelector('[data-v15-dialog-preview]').onclick = () => { dialog.close(); void api.openSecurePreview(item, item.category); }; dialog.querySelector('[data-v15-dialog-cart]').onclick = () => api.addToCart(item); dialog.querySelector('[data-v15-dialog-back]').onclick = () => { dialog.close(); window.requestAnimationFrame(() => { browse.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); browse.querySelector('#v15PublicSearch')?.focus({ preventScroll: true }); }); }; dialog.querySelector('[data-v15-dialog-close]').onclick = () => dialog.close();
    }
  });
  dialog.addEventListener('click', event => {
    if (event.target === dialog) { dialog.close(); return; }
    const bundleId = event.target.closest('[data-v15-series-cart]')?.dataset.v15SeriesCart;
    if (bundleId) { seriesMembers(bundleId).filter(item => item.sellingOption !== 'individual').forEach(item => api.addToCart({ ...item, bundlePurchaseSeriesId: bundleId })); return; }
    const memberPreviewId = event.target.closest('[data-v15-series-member-preview]')?.dataset.v15SeriesMemberPreview;
    const memberCartId = event.target.closest('[data-v15-series-member-cart]')?.dataset.v15SeriesMemberCart;
    const member = items().find(item => item.remoteId === (memberPreviewId || memberCartId));
    if (!member) return;
    if (memberPreviewId) { dialog.close(); void api.openSecurePreview(member, member.category); }
    else api.addToCart(member);
  });
  window.addEventListener('avery:store-manager-catalog-changed', () => { void loadPublicSeries(); render(); });
  window.addEventListener('avery:store-promotion-changed', render);
  void loadPublicSeries();
  render();
  return true;
}

function hideLegacyCategoryUploads() {
  document.querySelectorAll('#store .v14-category-upload').forEach(categoryUpload => {
    categoryUpload.hidden = true;
    categoryUpload.setAttribute('aria-hidden', 'true');
  });
}

function hideLegacyEmptyCustomerCategories() {
  const api = currentApi();
  if (!api) return;
  document.querySelectorAll('#store .v9-client-card[data-v9-client],#store .v9-clinician-card[data-v9-clinician]').forEach(card => {
    const topic = card.dataset.v9Client || card.dataset.v9Clinician || '';
    const hasPublishedResource = (api.resourceDb[topic] || []).some(item => item?.remoteId && item.storagePath);
    card.hidden = !hasPublishedResource;
    card.setAttribute('aria-hidden', String(!hasPublishedResource));
  });
}

function hideLegacyStoreNavigation() {
  document.querySelectorAll('#store .v9-audience-row,#store #v11ClientNote,#store #v11ClientFilters,#store #v11ClinicianNote,#store #v9ClinicianFilters,#store #v9StoreGrid').forEach(element => {
    element.hidden = true;
    element.setAttribute('aria-hidden', 'true');
  });
}

function bootStoreManager() {
  const api = currentApi();
  if (!api || typeof api.addToCart !== 'function') {
    if (managerRetryTimer) return;
    managerRetryTimer = window.setInterval(() => {
      if (!currentApi() || typeof currentApi().addToCart !== 'function') return;
      window.clearInterval(managerRetryTimer);
      managerRetryTimer = null;
      bootStoreManager();
    }, 250);
    window.setTimeout(() => {
      if (!managerRetryTimer) return;
      window.clearInterval(managerRetryTimer);
      managerRetryTimer = null;
    }, 15000);
    return;
  }
  hideLegacyCategoryUploads();
  hideLegacyEmptyCustomerCategories();
  hideLegacyStoreNavigation();
  mountPublicStoreBrowser();
  if (mountStoreManager()) {
    if (managerRetryTimer) window.clearInterval(managerRetryTimer);
    managerRetryTimer = null;
    return;
  }
  if (managerRetryTimer) return;
  managerRetryTimer = window.setInterval(() => {
    if (!mountStoreManager()) return;
    window.clearInterval(managerRetryTimer);
    managerRetryTimer = null;
  }, 750);
  window.setTimeout(() => {
    if (!managerRetryTimer) return;
    window.clearInterval(managerRetryTimer);
    managerRetryTimer = null;
  }, 15000);
}

window.addEventListener(STORE_MANAGER_READY_EVENT, () => {
  const browse = document.getElementById('v15PublicBrowse');
  if (browse) browse.dataset.v15CartApiReady = 'false';
  bootStoreManager();
});
window.addEventListener('avery:store-manager-catalog-changed', hideLegacyEmptyCustomerCategories);
bootStoreManager();
