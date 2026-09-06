const READY_EVENT = "avery:store-manager-api-ready";
const SETTINGS_TABLE = "store_marketing_settings";
const CAMPAIGNS_TABLE = "store_promotion_campaigns";
const PROMOTION_EVENTS_TABLE = "store_promotion_events";
const PROMOTION_BUCKET = "promotion-assets";
const FREE_INTENT_KEY = "avery-chapter21-free-packet-intent-v1";
const LAST_CAMPAIGN_KEY = "avery-chapter21-last-campaign-v1";
const VISITOR_KEY = "avery-chapter21-promotion-visitor-v1";
const SESSION_KEY = "avery-chapter21-promotion-session-v1";
const CLAIMS_PER_PAGE = 6;

const SERVICES = [
  ["svc-recovery", "Addiction Recovery Coaching"],
  ["svc-behavioral", "Behavioral Pattern Coaching"],
  ["svc-purpose", "Purpose & Life Development"],
  ["svc-career", "Career & Education Planning"],
  ["svc-relationship", "Relationship & Communication Coaching"],
  ["svc-curriculum", "Recovery Education & Curriculum"],
];

const THEMES = {
  summer: {
    label: "Summer",
    background_color: "#0f5f64",
    text_color: "#fff9e8",
    accent_color: "#f2bd5a",
  },
  fall: {
    label: "Fall",
    background_color: "#713a24",
    text_color: "#fff5e7",
    accent_color: "#e4a853",
  },
  halloween: {
    label: "Halloween",
    background_color: "#211b26",
    text_color: "#fff4e6",
    accent_color: "#ef7d32",
  },
  christmas: {
    label: "Christmas",
    background_color: "#154734",
    text_color: "#fffaf0",
    accent_color: "#d6a84b",
  },
  new_year: {
    label: "New Year",
    background_color: "#172c51",
    text_color: "#fffaf0",
    accent_color: "#d6b45d",
  },
  custom: {
    label: "Custom",
    background_color: "#173b3f",
    text_color: "#fff8ea",
    accent_color: "#d29147",
  },
};

const DEFAULTS = {
  id: true,
  free_packet_enabled: false,
  free_packet_headline: "Welcome to Chapter 21",
  free_packet_message: "Sign up today to get a free packet.",
  free_packet_resource_id: null,
  welcome_promotion_mode: "packet",
  welcome_discount_percent: 0,
  discount_enabled: false,
  discount_name: "Chapter 21 Special Offer",
  discount_message: "A limited-time Chapter 21 savings opportunity.",
  discount_percent: 10,
  discount_scope: "all_pdfs",
  target_resource_id: null,
  target_series_id: null,
  target_service: null,
};

const NEW_CAMPAIGN = {
  campaign_name: "",
  headline: "Chapter 21 Special Offer",
  message: "A limited-time Chapter 21 savings opportunity.",
  percent_off: 10,
  scope: "all_pdfs",
  target_resource_id: null,
  target_series_id: null,
  target_service: null,
  theme: "custom",
  ...THEMES.custom,
  image_url: null,
  image_path: null,
  button_label: "View This Offer",
  button_url: "#store",
  is_active: false,
  starts_at: null,
  ends_at: null,
  popup_frequency: "once_campaign",
};

const escapeHtml = value =>
  String(value ?? "").replace(
    /[&<>'"]/g,
    character =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character]
  );

let api = null;
let marketingSettings = { ...DEFAULTS };
let settings = { ...DEFAULTS };
let resources = [];
let series = [];
let campaigns = [];
let activeCampaign = null;
let armedCampaign = null;
let campaignEvents = [];
let freePacketClaims = [];
let editingCampaignId = null;
let campaignTableReady = false;
let settingsReady = false;
let authListenerMounted = false;
let adminReportListenerMounted = false;
let adminReportsLoaded = false;
let adminReportsLoading = null;
let marketingLoadPromise = null;
let marketingLoadQueued = false;
let marketingReloadTimer = null;
let bootedApi = null;
let adminFlash = "";
let claimPage = 1;
let scheduleTimer = null;

function safeColor(value, fallback) {
  return /^#[0-9a-f]{6}$/i.test(String(value || "")) ? value : fallback;
}

function safeImageUrl(value) {
  const candidate = String(value || "").trim();
  if (!candidate) return "";
  try {
    const url = new URL(candidate, window.location.origin);
    return ["http:", "https:", "blob:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function safeCtaUrl(value) {
  const candidate = String(value || "").trim();
  if (/^#[a-z0-9_-]+$/i.test(candidate)) return candidate;
  try {
    const url = new URL(candidate);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "#store";
  } catch {
    return "#store";
  }
}

function randomKey() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function persistentVisitorKey() {
  let value = localStorage.getItem(VISITOR_KEY);
  if (!value) {
    value = randomKey();
    localStorage.setItem(VISITOR_KEY, value);
  }
  return value;
}

function browsingSessionKey() {
  let value = sessionStorage.getItem(SESSION_KEY);
  if (!value) {
    value = randomKey();
    sessionStorage.setItem(SESSION_KEY, value);
  }
  return value;
}

function campaignIsLive(campaign, now = Date.now()) {
  if (!campaign?.is_active) return false;
  const startsAt = campaign.starts_at ? Date.parse(campaign.starts_at) : Number.NEGATIVE_INFINITY;
  const endsAt = campaign.ends_at ? Date.parse(campaign.ends_at) : Number.POSITIVE_INFINITY;
  return now >= startsAt && now < endsAt;
}

function campaignScheduleState(campaign, now = Date.now()) {
  if (!campaign?.is_active) return "saved";
  if (campaign.starts_at && now < Date.parse(campaign.starts_at)) return "scheduled";
  if (campaign.ends_at && now >= Date.parse(campaign.ends_at)) return "expired";
  return "live";
}

function formatLocalDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function localDateTimeValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function dateTimeIso(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function popupFrequencyLabel(value) {
  return {
    once_campaign: "Once per campaign",
    daily: "Once each day",
    every_visit: "Every new visit",
  }[value] || "Once per campaign";
}

function popupFrequencyOptions(selected = "once_campaign") {
  return [
    ["once_campaign", "Once per campaign"],
    ["daily", "Once each day"],
    ["every_visit", "Every new visit"],
  ].map(([value, label]) => `<option value="${value}"${selected === value ? " selected" : ""}>${label}</option>`).join("");
}

function popupSeenState(campaign) {
  const frequency = campaign.popup_frequency || "once_campaign";
  if (frequency === "daily") {
    const key = `avery-promotion-daily-${campaign.id}`;
    const today = new Date().toISOString().slice(0, 10);
    return {
      seen: localStorage.getItem(key) === today,
      mark: () => localStorage.setItem(key, today),
      dedupeKey: `${persistentVisitorKey()}:${today}`,
    };
  }
  if (frequency === "every_visit") {
    const key = `avery-promotion-visit-${campaign.id}`;
    return {
      seen: sessionStorage.getItem(key) === "true",
      mark: () => sessionStorage.setItem(key, "true"),
      dedupeKey: browsingSessionKey(),
    };
  }
  const key = `avery-promotion-seen-${campaign.id}`;
  return {
    seen: localStorage.getItem(key) === "true",
    mark: () => localStorage.setItem(key, "true"),
    dedupeKey: persistentVisitorKey(),
  };
}

async function recordCampaignEvent(eventType, campaign, dedupeKey) {
  if (!campaign?.id || campaign.id === "legacy" || campaign.id === "preview") return;
  try {
    const accessToken = api?.getSession()?.access_token;
    await fetch("/api/promotions/event", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ campaignId: campaign.id, eventType, dedupeKey }),
      keepalive: true,
    });
  } catch {
    // Reporting is helpful but must never interrupt the visitor experience.
  }
}

function rememberCampaignAttribution(campaign) {
  if (!campaign?.id || campaign.id === "legacy" || campaign.id === "preview") return;
  localStorage.setItem(LAST_CAMPAIGN_KEY, JSON.stringify({
    campaignId: campaign.id,
    seenAt: Date.now(),
  }));
}

async function recordAttributedSignup() {
  try {
    const attribution = JSON.parse(localStorage.getItem(LAST_CAMPAIGN_KEY) || "null");
    const userId = api?.getSession()?.user?.id;
    if (!attribution?.campaignId || Date.now() - Number(attribution.seenAt || 0) > 7 * 86400000) return;
    await recordCampaignEvent("signup", { id: attribution.campaignId }, userId || persistentVisitorKey());
  } catch {
    // Ignore invalid or unavailable browser attribution data.
  }
}

function scheduleCampaignRefresh() {
  if (scheduleTimer) window.clearTimeout(scheduleTimer);
  scheduleTimer = null;
  if (!armedCampaign) return;
  const now = Date.now();
  const boundaries = [armedCampaign.starts_at, armedCampaign.ends_at]
    .filter(Boolean)
    .map(value => Date.parse(value))
    .filter(value => Number.isFinite(value) && value > now);
  if (!boundaries.length) return;
  const delay = Math.min(Math.min(...boundaries) - now + 250, 2147483647);
  scheduleTimer = window.setTimeout(() => void loadMarketingData(), delay);
}

function publicCampaign() {
  if (activeCampaign) return activeCampaign;
  if (!settings.discount_enabled) return null;
  return {
    id: "legacy",
    campaign_name: settings.discount_name,
    headline: settings.discount_name,
    message: settings.discount_message,
    percent_off: settings.discount_percent,
    scope: settings.discount_scope,
    target_resource_id: settings.target_resource_id,
    target_series_id: settings.target_series_id,
    target_service: settings.target_service,
    ...THEMES.custom,
    theme: "custom",
    button_label: "View This Offer",
    button_url: "#store",
    is_active: true,
  };
}

function syncPromotionSettings() {
  const campaign = activeCampaign;
  if (campaign) {
    settings = {
      ...DEFAULTS,
      ...marketingSettings,
      discount_enabled: true,
      discount_name: campaign.headline || campaign.campaign_name,
      discount_message: campaign.message,
      discount_percent: campaign.percent_off,
      discount_scope: campaign.scope,
      target_resource_id: campaign.target_resource_id,
      target_series_id: campaign.target_series_id,
      target_service: campaign.target_service,
      promotion_campaign_id: campaign.id,
      promotion_campaign_name: campaign.campaign_name,
    };
  } else if (marketingSettings.welcome_promotion_mode === "percentage" && api?.getSession() && Number(marketingSettings.welcome_discount_percent) > 0) {
    settings = {
      ...DEFAULTS,
      ...marketingSettings,
      discount_enabled: true,
      discount_name: "Welcome account offer",
      discount_message: "Your welcome discount applies across published Store PDFs.",
      discount_percent: Math.max(0, Math.min(100, Number(marketingSettings.welcome_discount_percent) || 0)),
      discount_scope: "all_pdfs",
      target_resource_id: null,
      target_series_id: null,
      target_service: null,
    };
  } else if (campaignTableReady) {
    settings = {
      ...DEFAULTS,
      ...marketingSettings,
      discount_enabled: false,
    };
  } else {
    settings = { ...DEFAULTS, ...marketingSettings };
  }
}

function discountedPriceCents(baseCents, percent = settings.discount_percent) {
  const base = Math.max(0, Math.round(Number(baseCents) || 0));
  const percentage = Math.max(
    0,
    Math.min(100, Math.round(Number(percent) || 0))
  );
  return Math.max(0, Math.round((base * (100 - percentage)) / 100));
}

function promotionAppliesToResource(
  resource,
  bundleSeriesId = resource?.bundlePurchaseSeriesId || null
) {
  if (!settings.discount_enabled || !resource) return false;
  const resourceId = resource.remoteId || resource.resourceId || resource.id;
  const resourceSeriesId = resource.seriesId || resource.series_id || null;
  switch (settings.discount_scope) {
    case "all_pdfs":
    case "sitewide":
      return true;
    case "resource":
    case "service_pdf":
      return Boolean(
        settings.target_resource_id &&
          settings.target_resource_id === resourceId
      );
    case "series":
      return Boolean(
        settings.target_series_id &&
          settings.target_series_id === resourceSeriesId &&
          settings.target_series_id === bundleSeriesId
      );
    default:
      return false;
  }
}

function promotionState() {
  return Object.freeze({
    settings: Object.freeze({ ...settings }),
    appliesToResource: promotionAppliesToResource,
    priceFor(
      resource,
      baseCents = resource?.priceCents ?? resource?.price_cents ?? 0,
      bundleSeriesId = resource?.bundlePurchaseSeriesId || null
    ) {
      return promotionAppliesToResource(resource, bundleSeriesId)
        ? discountedPriceCents(baseCents)
        : Math.max(0, Number(baseCents) || 0);
    },
    percentage: Number(settings.discount_percent) || 0,
  });
}

function publishState() {
  window.AveryStorePromotionState = promotionState();
  window.dispatchEvent(
    new CustomEvent("avery:store-promotion-changed", {
      detail: { settings: { ...settings } },
    })
  );
}

function ensureStyles() {
  if (document.getElementById("avery-store-marketing-v17-style")) return;
  const style = document.createElement("style");
  style.id = "avery-store-marketing-v17-style";
  style.textContent = `
    .v17-marketing-grid{display:grid;grid-template-columns:minmax(260px,.72fr) minmax(360px,1.28fr);gap:14px;margin-top:14px}.v17-campaign-box{padding:14px;border:1px solid rgba(208,146,75,.3);border-radius:9px;background:rgba(0,0,0,.16)}.v17-campaign-box h4{margin:0;color:#f8e3c0;font:700 1.08rem/1.2 "Cormorant Garamond",serif}.v17-campaign-box>p{margin:5px 0 11px!important}.v17-field-stack{display:grid;gap:9px}.v17-field-stack label{display:grid;gap:5px;color:rgba(255,255,255,.75);font:700 .61rem/1.2 Manrope,sans-serif;letter-spacing:.07em;text-transform:uppercase}.v17-field-stack input,.v17-field-stack select,.v17-field-stack textarea{box-sizing:border-box;width:100%;padding:9px 10px;border:1px solid rgba(255,255,255,.18);border-radius:7px;background:#1b1b1b;color:#fff;font:400 .8rem/1.35 Manrope,sans-serif;letter-spacing:0;text-transform:none}.v17-field-stack input[type=color]{height:41px;padding:4px}.v17-field-stack input[type=file]{padding:8px}.v17-field-stack textarea{min-height:72px;resize:vertical}.v17-toggle{display:flex!important;gap:8px!important;align-items:center;color:#f7d7aa!important;font:700 .72rem/1.3 Manrope,sans-serif!important;letter-spacing:.04em!important;text-transform:none!important}.v17-toggle input{width:17px!important;height:17px!important;padding:0!important;accent-color:#d29147}.v17-form-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.v17-form-row.three{grid-template-columns:repeat(3,minmax(0,1fr))}.v17-percent-choices{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.v17-percent-choice{display:flex!important;gap:5px!important;align-items:center!important;justify-content:center;padding:9px 6px;border:1px solid rgba(255,255,255,.17);border-radius:7px;background:rgba(255,255,255,.025);font-size:.69rem!important;letter-spacing:0!important;text-transform:none!important;cursor:pointer}.v17-percent-choice:has(input:checked){border-color:#d29147;background:rgba(208,146,75,.12);color:#f8e3c0!important}.v17-percent-choice input{width:14px!important;height:14px!important;padding:0!important;accent-color:#d29147}.v17-scope-target[hidden]{display:none!important}.v17-library{display:grid;gap:9px;margin-top:12px}.v17-empty{padding:13px;border:1px dashed rgba(255,255,255,.22);border-radius:8px;color:rgba(255,255,255,.65)}.v17-campaign-card{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:9px;padding:12px;border:1px solid rgba(255,255,255,.14);border-radius:9px;background:rgba(255,255,255,.025)}.v17-campaign-card.is-active{border-color:#d29147;background:rgba(208,146,75,.1)}.v17-campaign-card h5{margin:0;color:#fff;font:700 .92rem/1.25 Manrope,sans-serif}.v17-campaign-card p{margin:4px 0 0!important;font-size:.69rem!important}.v17-card-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:6px}.v17-card-actions button{padding:7px 9px!important}.v17-live-pill{display:inline-flex;margin-left:7px;padding:3px 6px;border-radius:999px;background:#d29147;color:#161616;font:800 .57rem/1 Manrope,sans-serif;letter-spacing:.06em;text-transform:uppercase}.v17-image-preview{display:block;max-width:100%;max-height:150px;margin-top:7px;border:1px solid rgba(255,255,255,.14);border-radius:8px;object-fit:cover}.v17-admin-note{margin-top:7px;color:#f7d7aa!important;font-size:.67rem!important}.v16-public-banner{--campaign-bg:#173b3f;--campaign-text:#fff8ea;--campaign-accent:#d29147;display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:13px;align-items:center;margin:15px 0;padding:14px 16px;border:1px solid var(--campaign-accent);border-radius:10px;background:linear-gradient(135deg,var(--campaign-bg),#161616);box-shadow:0 12px 28px rgba(0,0,0,.18);color:var(--campaign-text)}.v16-public-banner.has-image{grid-template-columns:auto auto minmax(0,1fr) auto}.v16-public-banner[hidden]{display:none}.v17-banner-image{width:88px;height:74px;border-radius:8px;object-fit:cover}.v16-public-percent{display:grid;place-items:center;min-width:66px;min-height:66px;border:1px solid var(--campaign-accent);border-radius:50%;color:var(--campaign-text);font:800 1.05rem/1 Manrope,sans-serif;text-align:center}.v16-public-banner h3{margin:0;color:var(--campaign-text);font:700 1.25rem/1.12 "Cormorant Garamond",serif}.v16-public-banner p{margin:4px 0 0!important;color:var(--campaign-text)!important;opacity:.8;font-size:.75rem!important}.v16-public-banner small{display:block;margin-top:5px;color:var(--campaign-accent);font:700 .62rem/1.35 Manrope,sans-serif;letter-spacing:.04em;text-transform:uppercase}.v16-gift-link{white-space:nowrap}.v16-offer-badge{display:inline-flex;align-items:center;margin:7px 0 0;padding:5px 8px;border:1px solid rgba(208,146,75,.56);border-radius:999px;background:rgba(208,146,75,.13);color:#f7d7aa;font:700 .62rem/1 Manrope,sans-serif;letter-spacing:.06em;text-transform:uppercase}.v16-price-line{display:inline-flex;flex-wrap:wrap;gap:5px;align-items:baseline}.v16-price-line s{color:rgba(255,255,255,.52);font-weight:500}.v16-price-line strong{color:#f8e3c0}.v16-price-line em{color:#d9ad76;font-style:normal;font-size:.58rem}.v16-dialog{width:min(620px,calc(100vw - 30px));padding:0;border:1px solid var(--campaign-accent,#d29147);border-radius:13px;background:var(--campaign-bg,#141616);color:var(--campaign-text,#fff);box-shadow:0 28px 80px rgba(0,0,0,.72)}.v16-dialog::backdrop{background:rgba(0,0,0,.78)}.v16-dialog-body{position:relative;padding:27px}.v16-dialog-x{position:absolute;z-index:2;top:11px;right:11px;width:36px;height:36px;border:1px solid var(--campaign-accent,#d29147);border-radius:50%;background:rgba(0,0,0,.35);color:var(--campaign-text,#f8e3c0);font:400 27px/30px Arial,sans-serif;cursor:pointer}.v16-dialog h2{max-width:490px;margin:4px 42px 9px 0;color:var(--campaign-text,#f8e3c0);font:700 clamp(1.85rem,5vw,2.7rem)/1.03 "Cormorant Garamond",serif}.v16-dialog p{color:var(--campaign-text,#fff);opacity:.82;font:.88rem/1.62 Manrope,sans-serif}.v16-gift-name{padding:10px 12px;border-left:2px solid var(--campaign-accent,#d29147);background:rgba(0,0,0,.12);color:var(--campaign-text,#f7d7aa)!important}.v17-dialog-image{width:calc(100% + 54px);height:190px;margin:-27px -27px 22px;object-fit:cover;border-radius:12px 12px 0 0}.v17-dialog-percent{display:inline-flex;margin:3px 0 7px;padding:7px 10px;border:1px solid var(--campaign-accent);border-radius:999px;color:var(--campaign-accent);font:800 .76rem/1 Manrope,sans-serif;letter-spacing:.08em;text-transform:uppercase}.v17-dialog-target{display:block;margin-top:8px;color:var(--campaign-accent);font:700 .64rem/1.4 Manrope,sans-serif;letter-spacing:.05em;text-transform:uppercase}.v17-dialog-cta{background:var(--campaign-accent)!important;border-color:var(--campaign-accent)!important;color:#151515!important}.v16-service-offer{display:inline-flex;margin-top:10px;padding:5px 8px;border:1px solid rgba(208,146,75,.56);border-radius:999px;background:rgba(208,146,75,.11);color:#8d4a12;font:800 .64rem/1 Manrope,sans-serif;letter-spacing:.06em;text-transform:uppercase}.info-panel .v16-service-offer{color:#f7d7aa}
    .v17-consent{display:flex;gap:9px;align-items:flex-start;margin:14px 0;color:var(--campaign-text,#fff);font:600 .75rem/1.45 Manrope,sans-serif}.v17-consent input{flex:0 0 auto;width:17px;height:17px;margin-top:2px;accent-color:var(--campaign-accent,#d29147)}.v17-campaign-status{display:inline-flex;margin:0 0 5px;padding:4px 7px;border:1px solid rgba(208,146,75,.52);border-radius:999px;color:#f7d7aa;font:800 .58rem/1 Manrope,sans-serif;letter-spacing:.06em;text-transform:uppercase}.v17-performance{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}.v17-performance span{padding:4px 6px;border-radius:5px;background:rgba(255,255,255,.06);color:rgba(255,255,255,.78);font:700 .61rem/1.2 Manrope,sans-serif}.v17-claims-wrap{margin-top:10px;overflow-x:auto}.v17-claims{width:100%;border-collapse:collapse;font:600 .67rem/1.35 Manrope,sans-serif}.v17-claims th,.v17-claims td{padding:8px 7px;border-bottom:1px solid rgba(255,255,255,.1);text-align:left;vertical-align:top}.v17-claims th{color:#f7d7aa;text-transform:uppercase;letter-spacing:.05em}.v17-claims td{color:rgba(255,255,255,.78)}.v17-claim-pages{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:9px}.v17-claim-pages span{font-size:.66rem;color:rgba(255,255,255,.68)}.v17-report-note{margin:7px 0 0!important;color:rgba(255,255,255,.62)!important;font-size:.66rem!important}.v17-schedule-summary{color:#f7d7aa!important;font-size:.66rem!important}.v17-card-actions .v17-duplicate{border-color:rgba(255,255,255,.28)}
    @media(max-width:860px){.v17-marketing-grid{grid-template-columns:1fr}.v17-form-row.three{grid-template-columns:1fr}.v16-public-banner,.v16-public-banner.has-image{grid-template-columns:auto auto minmax(0,1fr)}.v16-public-banner:not(.has-image){grid-template-columns:auto minmax(0,1fr)}.v16-public-banner .v16-gift-link{grid-column:1/-1;width:100%;justify-content:center}}@media(max-width:560px){.v17-form-row{grid-template-columns:1fr}.v17-percent-choices{grid-template-columns:repeat(2,minmax(0,1fr))}.v17-campaign-card{grid-template-columns:1fr}.v17-card-actions{justify-content:flex-start}.v16-public-banner,.v16-public-banner.has-image,.v16-public-banner:not(.has-image){grid-template-columns:1fr}.v16-public-percent{width:62px}.v16-dialog-body{padding:22px 19px}.v16-dialog h2{margin-right:36px}.v17-dialog-image{width:calc(100% + 38px);height:155px;margin:-22px -19px 18px}.v17-claims{min-width:520px}}
  `;
  document.head.appendChild(style);
}

function applyCampaignStyle(element, campaign) {
  const preset = THEMES[campaign?.theme] || THEMES.custom;
  element.style.setProperty(
    "--campaign-bg",
    safeColor(campaign?.background_color, preset.background_color)
  );
  element.style.setProperty(
    "--campaign-text",
    safeColor(campaign?.text_color, preset.text_color)
  );
  element.style.setProperty(
    "--campaign-accent",
    safeColor(campaign?.accent_color, preset.accent_color)
  );
}

function resourceById(id) {
  return resources.find(resource => resource.id === id) || null;
}

function seriesById(id) {
  return series.find(record => record.id === id) || null;
}

function serviceName(id) {
  if (id === "all") return "all coaching services";
  return SERVICES.find(([key]) => key === id)?.[1] || "coaching services";
}

function promotionTargetLabel(campaign = publicCampaign()) {
  const scope = campaign?.scope || settings.discount_scope;
  const resourceId = campaign?.target_resource_id || settings.target_resource_id;
  const seriesId = campaign?.target_series_id || settings.target_series_id;
  const serviceId = campaign?.target_service || settings.target_service;
  switch (scope) {
    case "resource":
      return resourceById(resourceId)?.title || "one selected PDF";
    case "series":
      return (
        seriesById(seriesId)?.display_name ||
        seriesById(seriesId)?.title ||
        "one selected bundle"
      );
    case "coaching":
      return serviceName(serviceId);
    case "service_pdf":
      return `${serviceName(serviceId)} plus ${resourceById(resourceId)?.title || "one selected PDF"}`;
    case "sitewide":
      return "all Store PDFs and coaching services";
    default:
      return "all Store PDFs";
  }
}

function campaignImageMarkup(campaign, className) {
  const imageUrl = safeImageUrl(campaign?.image_url);
  return imageUrl
    ? `<img class="${className}" src="${escapeHtml(imageUrl)}" alt="">`
    : "";
}

function renderPromotionBanner() {
  const shell = document.querySelector("#store .store-shell");
  if (!shell) return;
  let banner = document.getElementById("v16PublicPromotion");
  if (!banner) {
    banner = document.createElement("aside");
    banner.id = "v16PublicPromotion";
    banner.className = "v16-public-banner";
    banner.setAttribute("aria-live", "polite");
    const browse = document.getElementById("v15PublicBrowse");
    if (browse) browse.insertAdjacentElement("beforebegin", banner);
    else shell.querySelector(".store-intro")?.insertAdjacentElement("afterend", banner);
  }
  const campaign = publicCampaign();
  banner.hidden = !campaign;
  if (!campaign) return;
  banner.classList.toggle("has-image", Boolean(safeImageUrl(campaign.image_url)));
  applyCampaignStyle(banner, campaign);
  const cta = safeCtaUrl(campaign.button_url);
  banner.innerHTML = `${campaignImageMarkup(campaign, "v17-banner-image")}<div class="v16-public-percent">${escapeHtml(campaign.percent_off)}%<br>OFF</div><div><h3>${escapeHtml(campaign.headline || campaign.campaign_name)}</h3><p>${escapeHtml(campaign.message)}</p><small>Applies to ${escapeHtml(promotionTargetLabel(campaign))}</small></div><a class="v9-btn v16-gift-link" href="${escapeHtml(cta)}">${escapeHtml(campaign.button_label || "View This Offer")}</a>`;
  banner.querySelector("a")?.addEventListener("click", () => {
    rememberCampaignAttribution(campaign);
    void recordCampaignEvent("click", campaign, `${browsingSessionKey()}:banner-click`);
  });
}

function eligibleService(serviceId) {
  if (!settings.discount_enabled) return false;
  if (settings.discount_scope === "sitewide") return true;
  if (!["coaching", "service_pdf"].includes(settings.discount_scope)) return false;
  return settings.target_service === "all" || settings.target_service === serviceId;
}

function decorateServices() {
  document.querySelectorAll(".v16-service-offer").forEach(badge => badge.remove());
  SERVICES.forEach(([serviceId]) => {
    if (!eligibleService(serviceId)) return;
    const badge = document.createElement("span");
    badge.className = "v16-service-offer";
    badge.textContent = `${settings.discount_percent}% OFF · ${activeCampaign?.campaign_name || "Chapter 21 Offer"}`;
    document.querySelector(`.clickable-service[data-service="${serviceId}"]`)?.appendChild(badge.cloneNode(true));
    document.getElementById(serviceId)?.querySelector(".appointment-row")?.insertAdjacentElement("beforebegin", badge);
  });
}

function promotionDialog() {
  let dialog = document.getElementById("v17PromotionDialog");
  if (!dialog) {
    dialog = document.createElement("dialog");
    dialog.id = "v17PromotionDialog";
    dialog.className = "v16-dialog";
    document.body.appendChild(dialog);
    dialog.addEventListener("click", event => {
      if (event.target === dialog || event.target.closest("[data-v17-close]")) dialog.close();
    });
    dialog.addEventListener("close", () => {
      if (dialog.dataset.live === "true" && (window.location.hash || "#home") === "#store")
        window.setTimeout(() => showSignupGift(), 180);
      dialog.dataset.live = "false";
    });
  }
  return dialog;
}

function showPromotionPopup(force = false, previewCampaign = null) {
  const campaign = previewCampaign || publicCampaign();
  if (!campaign) return;
  const seenState = previewCampaign ? null : popupSeenState(campaign);
  if (!force && seenState?.seen) return;
  if (!force) seenState?.mark();
  const dialog = promotionDialog();
  dialog.dataset.live = previewCampaign ? "false" : "true";
  applyCampaignStyle(dialog, campaign);
  const cta = safeCtaUrl(campaign.button_url);
  dialog.innerHTML = `<div class="v16-dialog-body">${campaignImageMarkup(campaign, "v17-dialog-image")}<button class="v16-dialog-x" type="button" data-v17-close aria-label="Close">×</button><span class="v17-dialog-percent">${escapeHtml(campaign.percent_off)}% off</span><h2>${escapeHtml(campaign.headline || campaign.campaign_name)}</h2><p>${escapeHtml(campaign.message)}</p><span class="v17-dialog-target">Applies to ${escapeHtml(promotionTargetLabel(campaign))}</span><div class="v15-actions" style="margin-top:18px"><a class="v9-btn primary v17-dialog-cta" data-v17-cta href="${escapeHtml(cta)}">${escapeHtml(campaign.button_label || "View This Offer")}</a><button class="v9-btn" type="button" data-v17-close>Close</button></div></div>`;
  dialog.querySelector("[data-v17-cta]")?.addEventListener("click", event => {
    if (!previewCampaign) {
      rememberCampaignAttribution(campaign);
      void recordCampaignEvent("click", campaign, `${browsingSessionKey()}:click`);
    }
    if (cta.startsWith("#")) {
      event.preventDefault();
      dialog.close();
      const link = document.querySelector(`a[href="${cta}"]`);
      if (link) link.click();
      else window.location.hash = cta.slice(1);
    } else {
      dialog.close();
    }
  });
  if (!dialog.open) dialog.showModal();
  if (!previewCampaign) {
    rememberCampaignAttribution(campaign);
    void recordCampaignEvent("impression", campaign, seenState?.dedupeKey || browsingSessionKey());
  }
}

function giftDialog() {
  let dialog = document.getElementById("v16FreePacketDialog");
  if (!dialog) {
    dialog = document.createElement("dialog");
    dialog.id = "v16FreePacketDialog";
    dialog.className = "v16-dialog";
    document.body.appendChild(dialog);
    dialog.addEventListener("click", event => {
      if (event.target === dialog || event.target.closest("[data-v16-close]")) dialog.close();
    });
  }
  return dialog;
}

function freePacketIntent() {
  const raw = localStorage.getItem(FREE_INTENT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return { resourceId: raw, marketingConsent: false };
  }
}

function navigateToSignup(marketingConsent = false) {
  localStorage.setItem(FREE_INTENT_KEY, JSON.stringify({
    resourceId: String(settings.free_packet_resource_id || "active"),
    marketingConsent: Boolean(marketingConsent),
  }));
  const accountLink = document.querySelector('a[href="#account"]');
  if (accountLink) accountLink.click();
  else window.location.hash = "account";
  window.setTimeout(() => window.openAccountPanel?.("create"), 0);
}

async function claimPacket(marketingConsent = Boolean(freePacketIntent()?.marketingConsent)) {
  if (!api?.getSession()?.access_token) {
    navigateToSignup(marketingConsent);
    return;
  }
  const dialog = giftDialog();
  dialog.innerHTML = `<div class="v16-dialog-body"><span class="v15-kicker">Chapter 21 signup gift</span><h2>Preparing Your Free Packet</h2><p role="status">Creating a private download link for your account…</p></div>`;
  if (!dialog.open) dialog.showModal();
  try {
    const response = await fetch("/api/free-packet/claim", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${api.getSession().access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ marketingConsent: Boolean(marketingConsent) }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.downloadUrl) throw new Error(result.error || "Unable to prepare the free packet.");
    localStorage.removeItem(FREE_INTENT_KEY);
    sessionStorage.setItem(`avery-free-packet-received-${settings.free_packet_resource_id}`, "true");
    dialog.innerHTML = `<div class="v16-dialog-body"><button class="v16-dialog-x" type="button" data-v16-close aria-label="Close">×</button><span class="v15-kicker">Welcome to Chapter 21</span><h2>Your Free Packet Is Ready</h2><p class="v16-gift-name">${escapeHtml(result.title || resourceById(settings.free_packet_resource_id)?.title || "Chapter 21 Free Packet")}</p><p>Select the link below to download the file chosen by Avery Institute. For your privacy, the secure link expires after 15 minutes; you can request a fresh link while signed in.</p><div class="v15-actions"><a class="v9-btn primary" href="${escapeHtml(result.downloadUrl)}" target="_blank" rel="noopener">Download Your Free Packet</a><button class="v9-btn" type="button" data-v16-close>Close</button></div></div>`;
  } catch (error) {
    dialog.innerHTML = `<div class="v16-dialog-body"><button class="v16-dialog-x" type="button" data-v16-close aria-label="Close">×</button><span class="v15-kicker">Chapter 21 signup gift</span><h2>We Couldn’t Prepare the Link Yet</h2><p>${escapeHtml(error instanceof Error ? error.message : "Please try again.")}</p><div class="v15-actions"><button class="v9-btn primary" type="button" data-v16-retry>Try Again</button><button class="v9-btn" type="button" data-v16-close>Close</button></div></div>`;
    dialog.querySelector("[data-v16-retry]")?.addEventListener("click", () => void claimPacket(marketingConsent));
  }
}

function showSignupGift(force = false) {
  const welcomePercentage = settings.welcome_promotion_mode === "percentage" && Number(settings.welcome_discount_percent) > 0;
  if (!settingsReady || !settings.free_packet_enabled || (!settings.free_packet_resource_id && !welcomePercentage)) return;
  const promo = document.getElementById("v17PromotionDialog");
  if (promo?.open) {
    if (!force) return;
    promo.close();
  }
  const seenKey = `avery-free-packet-seen-${welcomePercentage ? "welcome-percentage" : settings.free_packet_resource_id}`;
  if (!force && sessionStorage.getItem(seenKey)) return;
  sessionStorage.setItem(seenKey, "true");
  const resource = resourceById(settings.free_packet_resource_id);
  const signedIn = Boolean(api?.getSession());
  const welcomeOfferText = welcomePercentage ? `Welcome discount: ${Number(settings.welcome_discount_percent)}% off all Store PDFs` : resource ? `Free packet: ${resource.title}` : "";
  const dialog = giftDialog();
  dialog.innerHTML = `<div class="v16-dialog-body"><button class="v16-dialog-x" type="button" data-v16-close aria-label="Close">×</button><span class="v15-kicker">A Chapter 21 welcome gift</span><h2>${escapeHtml(settings.free_packet_headline || DEFAULTS.free_packet_headline)}</h2><p>${escapeHtml(settings.free_packet_message || DEFAULTS.free_packet_message)}</p>${welcomeOfferText ? `<p class="v16-gift-name">${escapeHtml(welcomeOfferText)}</p>` : ""}<label class="v17-consent"><input type="checkbox" data-v17-marketing-consent> <span>Yes, I would like occasional Avery Institute news and special offers by email. This is optional.</span></label><div class="v15-actions"><button class="v9-btn primary" type="button" data-v16-claim>${signedIn ? (welcomePercentage ? `Use My ${Number(settings.welcome_discount_percent)}% Welcome Discount` : "Get My Free Packet") : (welcomePercentage ? "Sign Up & Get My Welcome Discount" : "Sign Up & Get the Free Packet")}</button><button class="v9-btn" type="button" data-v16-close>Maybe Later</button></div><p class="v15-subtle">${welcomePercentage ? "After account signup or sign-in, your welcome discount applies across published Store PDFs." : "The selected file is delivered through a private, time-limited download link after account signup or sign-in."}</p></div>`;
  dialog.querySelector("[data-v16-claim]")?.addEventListener("click", () => {
    const marketingConsent = Boolean(dialog.querySelector("[data-v17-marketing-consent]")?.checked);
    if (signedIn) {
      if (welcomePercentage) {
        dialog.close();
        window.alert(`Your ${Number(settings.welcome_discount_percent)}% welcome discount is active for published Store PDFs.`);
        publishState();
      } else void claimPacket(marketingConsent);
    } else {
      dialog.close();
      navigateToSignup(marketingConsent);
    }
  });
  if (!dialog.open) dialog.showModal();
}

function renderGiftAccess() {
  const shell = document.querySelector("#store .store-shell");
  if (!shell) return;
  let link = document.getElementById("v16GiftAccess");
  if (!link) {
    link = document.createElement("button");
    link.id = "v16GiftAccess";
    link.type = "button";
    link.className = "v9-btn v16-gift-link";
    link.addEventListener("click", () => showSignupGift(true));
  }
  const percentageMode = settings.welcome_promotion_mode === "percentage" && Number(settings.welcome_discount_percent) > 0;
  link.textContent = percentageMode
    ? (api?.getSession() ? `Use ${Number(settings.welcome_discount_percent)}% Welcome Discount` : "Sign Up for a Welcome Discount")
    : (api?.getSession() ? "Get the Free Chapter 21 Packet" : "Sign Up for a Free Chapter 21 Packet");
  link.hidden = !settings.free_packet_enabled || (!settings.free_packet_resource_id && !percentageMode);
  const banner = document.getElementById("v16PublicPromotion");
  if (banner?.nextElementSibling) banner.insertAdjacentElement("afterend", link);
  else shell.querySelector(".store-intro")?.insertAdjacentElement("afterend", link);
}

function resourceOptions(selected = "") {
  return '<option value="">Choose a published file</option>' + resources.map(resource => `<option value="${escapeHtml(resource.id)}"${resource.id === selected ? " selected" : ""}>${escapeHtml(resource.title)} · ${escapeHtml(resource.resource_type || "Resource")}</option>`).join("");
}

function seriesOptions(selected = "") {
  return '<option value="">Choose a published bundle</option>' + series.map(record => `<option value="${escapeHtml(record.id)}"${record.id === selected ? " selected" : ""}>${escapeHtml(record.display_name || record.title)}</option>`).join("");
}

function serviceOptions(selected = "") {
  return '<option value="">Choose a coaching service</option><option value="all"' + (selected === "all" ? " selected" : "") + ">All coaching services</option>" + SERVICES.map(([id, label]) => `<option value="${id}"${id === selected ? " selected" : ""}>${escapeHtml(label)}</option>`).join("");
}

function scopeOptions(selected = "all_pdfs") {
  return [
    ["all_pdfs", "All PDFs / Store resources"],
    ["resource", "One PDF / resource"],
    ["series", "One bundle"],
    ["coaching", "Coaching services"],
    ["service_pdf", "Coaching service plus one PDF"],
    ["sitewide", "Whole Store and all coaching services"],
  ].map(([value, label]) => `<option value="${value}"${selected === value ? " selected" : ""}>${label}</option>`).join("");
}

function themeOptions(selected = "custom") {
  return Object.entries(THEMES).map(([value, theme]) => `<option value="${value}"${selected === value ? " selected" : ""}>${theme.label}</option>`).join("");
}

function syncAdminScope(panel) {
  const scope = panel.querySelector("#v17CampaignScope")?.value || "all_pdfs";
  panel.querySelector("[data-v17-resource-target]")?.toggleAttribute("hidden", !["resource", "service_pdf"].includes(scope));
  panel.querySelector("[data-v17-series-target]")?.toggleAttribute("hidden", scope !== "series");
  panel.querySelector("[data-v17-service-target]")?.toggleAttribute("hidden", !["coaching", "service_pdf"].includes(scope));
}

function campaignStats(campaignId) {
  const stats = { impression: 0, click: 0, signup: 0, purchase: 0 };
  campaignEvents.forEach(event => {
    if (event.campaign_id === campaignId && Object.hasOwn(stats, event.event_type))
      stats[event.event_type] += 1;
  });
  return stats;
}

function campaignScheduleSummary(campaign) {
  const state = campaignScheduleState(campaign);
  if (state === "scheduled") return `Starts automatically ${formatLocalDate(campaign.starts_at)}`;
  if (state === "expired") return `Expired automatically ${formatLocalDate(campaign.ends_at)}`;
  if (state === "live" && campaign.ends_at) return `Live now · ends automatically ${formatLocalDate(campaign.ends_at)}`;
  if (state === "live") return "Live now · no automatic end date";
  const parts = [];
  if (campaign.starts_at) parts.push(`starts ${formatLocalDate(campaign.starts_at)}`);
  if (campaign.ends_at) parts.push(`ends ${formatLocalDate(campaign.ends_at)}`);
  return parts.length ? `Saved schedule · ${parts.join(" · ")}` : "Saved with no schedule";
}

function campaignCardMarkup(campaign) {
  const state = campaignScheduleState(campaign);
  const armed = Boolean(campaign.is_active);
  const stats = campaignStats(campaign.id);
  const actionLabel = armed ? "Deactivate" : campaign.starts_at && Date.parse(campaign.starts_at) > Date.now() ? "Schedule" : "Activate";
  return `<article class="v17-campaign-card${armed ? " is-active" : ""}"><div><span class="v17-campaign-status">${escapeHtml(state)}</span><h5>${escapeHtml(campaign.campaign_name)}${state === "live" ? '<span class="v17-live-pill">Live</span>' : ""}</h5><p>${escapeHtml(campaign.percent_off)}% off · ${escapeHtml(THEMES[campaign.theme]?.label || "Custom")} · ${escapeHtml(promotionTargetLabel(campaign))}</p><p class="v17-schedule-summary">${escapeHtml(campaignScheduleSummary(campaign))} · Popup: ${escapeHtml(popupFrequencyLabel(campaign.popup_frequency))}</p><div class="v17-performance"><span>Views ${stats.impression}</span><span>Clicks ${stats.click}</span><span>Signups ${stats.signup}</span><span>Purchases ${stats.purchase}</span></div></div><div class="v17-card-actions"><button class="v9-btn" type="button" data-v17-edit="${escapeHtml(campaign.id)}">Edit</button><button class="v9-btn v17-duplicate" type="button" data-v17-duplicate="${escapeHtml(campaign.id)}">Duplicate</button><button class="v9-btn${armed ? "" : " primary"}" type="button" data-v17-activate="${escapeHtml(campaign.id)}">${actionLabel}</button><button class="v9-btn" type="button" data-v17-delete="${escapeHtml(campaign.id)}">Delete</button></div></article>`;
}

function freePacketClaimsMarkup() {
  const totalPages = Math.max(1, Math.ceil(freePacketClaims.length / CLAIMS_PER_PAGE));
  claimPage = Math.min(Math.max(1, claimPage), totalPages);
  const start = (claimPage - 1) * CLAIMS_PER_PAGE;
  const pageRows = freePacketClaims.slice(start, start + CLAIMS_PER_PAGE);
  if (!pageRows.length)
    return '<div class="v17-empty">No one has requested the free packet yet.</div>';
  const rows = pageRows.map(claim => {
    const name = claim.full_name_snapshot || claim.email_snapshot || `Customer ${String(claim.user_id || "").slice(0, 8)}`;
    const email = claim.email_snapshot || "Not recorded before update";
    const resource = resourceById(claim.resource_id)?.title || "Previously selected packet";
    return `<tr><td>${escapeHtml(name)}<br><small>${escapeHtml(email)}</small></td><td>${escapeHtml(resource)}</td><td>${claim.marketing_consent ? "Yes" : "No"}</td><td>${escapeHtml(formatLocalDate(claim.claimed_at))}</td></tr>`;
  }).join("");
  return `<div class="v17-claims-wrap"><table class="v17-claims"><thead><tr><th>Customer</th><th>Packet</th><th>Email consent</th><th>Requested</th></tr></thead><tbody>${rows}</tbody></table></div><div class="v17-claim-pages"><button class="v9-btn" type="button" data-v17-claims-prev${claimPage <= 1 ? " disabled" : ""}>Previous</button><span>Page ${claimPage} of ${totalPages} · ${freePacketClaims.length} request${freePacketClaims.length === 1 ? "" : "s"}</span><button class="v9-btn" type="button" data-v17-claims-next${claimPage >= totalPages ? " disabled" : ""}>Next</button></div>`;
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function exportConsentedClaims() {
  const contacts = freePacketClaims.filter(claim => claim.marketing_consent && claim.email_snapshot);
  if (!contacts.length) {
    setAdminStatus("There are no consented email contacts to export yet.");
    return;
  }
  const rows = [
    ["Name", "Email", "Free Packet", "Requested At"],
    ...contacts.map(claim => [
      claim.full_name_snapshot || "",
      claim.email_snapshot,
      resourceById(claim.resource_id)?.title || "Previously selected packet",
      claim.claimed_at || "",
    ]),
  ];
  const blob = new Blob([rows.map(row => row.map(csvCell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `chapter-21-consented-contacts-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setAdminStatus(`Exported ${contacts.length} consented email contact${contacts.length === 1 ? "" : "s"}.`);
}

function renderAdminPanel() {
  const manager = document.getElementById("v14Admin");
  const shell = manager?.querySelector(".v15-shell");
  if (!api?.isAdmin() || !shell) return;
  mountAdminReportLoader();
  let panel = document.getElementById("v16MarketingPanel");
  if (!panel) {
    panel = document.createElement("section");
    panel.id = "v16MarketingPanel";
    panel.className = "v15-panel";
    shell.insertBefore(panel, shell.children[1] || null);
  }
  const draft = { ...NEW_CAMPAIGN, ...(campaigns.find(record => record.id === editingCampaignId) || {}) };
  const quickPercent = [5, 10, 25, 50].includes(Number(draft.percent_off));
  const currentImage = safeImageUrl(draft.image_url);
  panel.innerHTML = `
    <span class="v15-kicker">Signup gift &amp; reusable promotions</span>
    <h3>Chapter 21 Offers</h3>
    <p>Create any custom promotion you want. Optional seasonal styles are available as shortcuts, but Custom is the default. Save campaigns for later, schedule one to begin and end automatically, and choose how often its popup appears. Only one campaign can be armed at a time.</p>
    <div class="v17-marketing-grid">
      <section class="v17-campaign-box">
        <h4>Free Signup Packet</h4>
          <p>Choose either one existing Store PDF or a percentage discount across all Store PDFs after signup or sign-in.</p>
        <div class="v17-field-stack">
          <label class="v17-toggle"><input id="v16FreeEnabled" type="checkbox"${settings.free_packet_enabled ? " checked" : ""}> Show the free-packet signup prompt</label>
          <label>Prompt heading<input id="v16FreeHeadline" value="${escapeHtml(settings.free_packet_headline)}"></label>
          <label>Prompt message<textarea id="v16FreeMessage">${escapeHtml(settings.free_packet_message)}</textarea></label>
          <label>Welcome offer type<select id="v16WelcomeMode"><option value="packet"${settings.welcome_promotion_mode !== "percentage" ? " selected" : ""}>One free Store PDF</option><option value="percentage"${settings.welcome_promotion_mode === "percentage" ? " selected" : ""}>Percentage off all Store PDFs</option></select></label>
          <label>Free packet file<select id="v16FreeResource">${resourceOptions(settings.free_packet_resource_id)}</select></label>
          <label>Welcome discount percentage<input id="v16WelcomePercent" type="number" min="1" max="100" step="1" value="${escapeHtml(settings.welcome_discount_percent || 0)}"><span class="v17-report-note">Used only when Percentage off all Store PDFs is selected.</span></label>
          <button class="v9-btn" type="button" id="v17SaveGift">Save Free Packet Settings</button>
        </div>
        <hr style="margin:18px 0;border:0;border-top:1px solid rgba(255,255,255,.12)">
        <h4>Free Packet Requests</h4>
        <p>See who requested the packet and when. Only people who voluntarily selected email updates are included in the marketing export.</p>
        ${freePacketClaimsMarkup()}
        <div class="v15-actions" style="margin-top:10px"><button class="v9-btn" type="button" id="v17ExportClaims">Export Consented Email List</button></div>
        <p class="v17-report-note">Email consent is optional and is recorded separately from access to the free packet.</p>
        <hr style="margin:18px 0;border:0;border-top:1px solid rgba(255,255,255,.12)">
        <h4>Saved Campaigns &amp; Performance</h4>
        <p>Views, clicks, attributed signups, and verified purchases appear on each saved campaign.</p>
        <div class="v17-library">${campaigns.length ? campaigns.map(campaignCardMarkup).join("") : '<div class="v17-empty">No saved campaigns yet. Create your first one using the form.</div>'}</div>
      </section>
      <section class="v17-campaign-box">
        <h4>${editingCampaignId ? "Edit Promotion Campaign" : "Create a Promotion Campaign"}</h4>
        <p>Start with Custom or choose an optional seasonal shortcut. Preview the visitor popup before saving.</p>
        <div class="v17-field-stack">
          <label>Campaign name<input id="v17CampaignName" value="${escapeHtml(draft.campaign_name)}" placeholder="Example: Recovery Month Savings"></label>
          <div class="v17-form-row"><label>Style<select id="v17CampaignTheme">${themeOptions(draft.theme)}</select></label><label>Discount percentage<input id="v17CampaignPercent" type="number" min="1" max="100" step="1" value="${escapeHtml(draft.percent_off)}"></label></div>
          <div class="v17-percent-choices" role="radiogroup" aria-label="Discount percentage">${[5, 10, 25, 50].map(percent => `<label class="v17-percent-choice"><input type="radio" name="v17DiscountQuick" value="${percent}"${Number(draft.percent_off) === percent ? " checked" : ""}> ${percent}% off</label>`).join("")}</div>
          <label>Banner heading<input id="v17CampaignHeadline" value="${escapeHtml(draft.headline)}"></label>
          <label>Banner message<textarea id="v17CampaignMessage">${escapeHtml(draft.message)}</textarea></label>
          <label>Apply discount to<select id="v17CampaignScope">${scopeOptions(draft.scope)}</select></label>
          <label class="v17-scope-target" data-v17-resource-target>PDF / resource<select id="v17CampaignResource">${resourceOptions(draft.target_resource_id)}</select></label>
          <label class="v17-scope-target" data-v17-series-target>Bundle<select id="v17CampaignSeries">${seriesOptions(draft.target_series_id)}</select></label>
          <label class="v17-scope-target" data-v17-service-target>Coaching service<select id="v17CampaignService">${serviceOptions(draft.target_service)}</select></label>
          <div class="v17-form-row"><label>Start date and time (optional)<input id="v17CampaignStarts" type="datetime-local" value="${escapeHtml(localDateTimeValue(draft.starts_at))}"></label><label>End date and time (optional)<input id="v17CampaignEnds" type="datetime-local" value="${escapeHtml(localDateTimeValue(draft.ends_at))}"></label></div>
          <label>Popup frequency<select id="v17CampaignFrequency">${popupFrequencyOptions(draft.popup_frequency)}</select></label>
          <div class="v17-form-row three"><label>Background color<input id="v17CampaignBackground" type="color" value="${escapeHtml(safeColor(draft.background_color, THEMES.custom.background_color))}"></label><label>Text color<input id="v17CampaignText" type="color" value="${escapeHtml(safeColor(draft.text_color, THEMES.custom.text_color))}"></label><label>Accent color<input id="v17CampaignAccent" type="color" value="${escapeHtml(safeColor(draft.accent_color, THEMES.custom.accent_color))}"></label></div>
          <label>Optional banner image (JPG, PNG, or WebP; up to 5 MB)<input id="v17CampaignImage" type="file" accept="image/jpeg,image/png,image/webp"></label>
          ${currentImage ? `<img class="v17-image-preview" src="${escapeHtml(currentImage)}" alt="Current campaign artwork"><label class="v17-toggle"><input id="v17RemoveImage" type="checkbox"> Remove the current image</label>` : ""}
          <div class="v17-form-row"><label>Button label<input id="v17CampaignButtonLabel" value="${escapeHtml(draft.button_label)}"></label><label>Button destination<input id="v17CampaignButtonUrl" value="${escapeHtml(draft.button_url)}" placeholder="#store, #services, or https://..."></label></div>
          <p class="v17-admin-note">Leave the dates blank for a promotion you activate and deactivate manually. Saving does not make it live; use Activate or Schedule in the saved list.</p>
          <div class="v15-actions"><button class="v9-btn primary" type="button" id="v17SaveCampaign">${editingCampaignId ? "Save Campaign Changes" : "Save New Campaign"}</button><button class="v9-btn" type="button" id="v17PreviewCampaign">Preview Banner</button>${editingCampaignId ? '<button class="v9-btn" type="button" id="v17NewCampaign">Create Another</button>' : ""}</div>
        </div>
      </section>
    </div>
    <div class="v15-status" id="v17MarketingStatus" style="margin-top:12px" aria-live="polite">${escapeHtml(adminFlash)}</div>`;
  adminFlash = "";
  syncAdminScope(panel);
  if (!quickPercent) panel.querySelectorAll('input[name="v17DiscountQuick"]').forEach(input => { input.checked = false; });
  panel.querySelector("#v17CampaignScope")?.addEventListener("change", () => syncAdminScope(panel));
  panel.querySelectorAll('input[name="v17DiscountQuick"]').forEach(input => input.addEventListener("change", () => { panel.querySelector("#v17CampaignPercent").value = input.value; }));
  panel.querySelector("#v17CampaignPercent")?.addEventListener("input", event => panel.querySelectorAll('input[name="v17DiscountQuick"]').forEach(input => { input.checked = input.value === event.target.value; }));
  panel.querySelector("#v17CampaignTheme")?.addEventListener("change", event => {
    const theme = THEMES[event.target.value] || THEMES.custom;
    panel.querySelector("#v17CampaignBackground").value = theme.background_color;
    panel.querySelector("#v17CampaignText").value = theme.text_color;
    panel.querySelector("#v17CampaignAccent").value = theme.accent_color;
  });
  panel.querySelector("#v17SaveGift")?.addEventListener("click", () => void saveGiftSettings(panel));
  panel.querySelector("#v17SaveCampaign")?.addEventListener("click", () => void saveCampaign(panel));
  panel.querySelector("#v17PreviewCampaign")?.addEventListener("click", () => {
    const draftCampaign = campaignFromPanel(panel);
    if (!draftCampaign) return;
    const existing = campaigns.find(record => record.id === editingCampaignId) || {};
    const file = panel.querySelector("#v17CampaignImage")?.files?.[0] || null;
    try {
      validateCampaignImage(file);
      const previewUrl = file ? URL.createObjectURL(file) : null;
      showPromotionPopup(true, {
        ...existing,
        ...draftCampaign,
        id: "preview",
        image_url: previewUrl || (panel.querySelector("#v17RemoveImage")?.checked ? null : existing.image_url),
      });
      if (previewUrl)
        promotionDialog().addEventListener("close", () => URL.revokeObjectURL(previewUrl), { once: true });
    } catch (error) {
      setAdminStatus(error instanceof Error ? error.message : "Unable to preview that banner image.");
    }
  });
  panel.querySelector("#v17NewCampaign")?.addEventListener("click", () => { editingCampaignId = null; renderAdminPanel(); });
  panel.querySelector("#v17ExportClaims")?.addEventListener("click", exportConsentedClaims);
  panel.querySelector("[data-v17-claims-prev]")?.addEventListener("click", () => { claimPage -= 1; renderAdminPanel(); });
  panel.querySelector("[data-v17-claims-next]")?.addEventListener("click", () => { claimPage += 1; renderAdminPanel(); });
  panel.querySelectorAll("[data-v17-edit]").forEach(button => button.addEventListener("click", () => { editingCampaignId = button.dataset.v17Edit; renderAdminPanel(); document.getElementById("v16MarketingPanel")?.scrollIntoView({ behavior: "smooth", block: "start" }); }));
  panel.querySelectorAll("[data-v17-duplicate]").forEach(button => button.addEventListener("click", () => void duplicateCampaign(button.dataset.v17Duplicate)));
  panel.querySelectorAll("[data-v17-activate]").forEach(button => button.addEventListener("click", () => void setCampaignActive(button.dataset.v17Activate)));
  panel.querySelectorAll("[data-v17-delete]").forEach(button => button.addEventListener("click", () => void deleteCampaign(button.dataset.v17Delete)));
}

function setAdminStatus(message) {
  const status = document.getElementById("v17MarketingStatus");
  if (status) status.textContent = message;
  else adminFlash = message;
}

async function saveGiftSettings(panel) {
  const next = {
    free_packet_enabled: Boolean(panel.querySelector("#v16FreeEnabled")?.checked),
    free_packet_headline: String(panel.querySelector("#v16FreeHeadline")?.value || "").trim() || DEFAULTS.free_packet_headline,
    free_packet_message: String(panel.querySelector("#v16FreeMessage")?.value || "").trim() || DEFAULTS.free_packet_message,
    free_packet_resource_id: panel.querySelector("#v16FreeResource")?.value || null,
    welcome_promotion_mode: panel.querySelector("#v16WelcomeMode")?.value === "percentage" ? "percentage" : "packet",
    welcome_discount_percent: Math.max(0, Math.min(100, Math.round(Number(panel.querySelector("#v16WelcomePercent")?.value) || 0))),
    updated_at: new Date().toISOString(),
  };
  if (next.free_packet_enabled && next.welcome_promotion_mode === "packet" && !next.free_packet_resource_id) {
    setAdminStatus("Choose the file people will receive in One free Store PDF mode.");
    return;
  }
  if (next.free_packet_enabled && next.welcome_promotion_mode === "percentage" && (next.welcome_discount_percent < 1 || next.welcome_discount_percent > 100)) {
    setAdminStatus("Enter a welcome discount from 1% to 100%.");
    return;
  }
  setAdminStatus("Saving the free-packet settings…");
  const { data, error } = await api.supabase.from(SETTINGS_TABLE).update(next).eq("id", true).select("*").single();
  if (error) {
    setAdminStatus(error.message.includes(SETTINGS_TABLE) ? "The Store marketing database update must be applied before these settings can be saved." : error.message);
    return;
  }
  marketingSettings = { ...DEFAULTS, ...(data || next) };
  syncPromotionSettings();
  publishState();
  renderGiftAccess();
  setAdminStatus("Saved. The free-packet prompt now matches these settings.");
}

function campaignFromPanel(panel) {
  const campaign = {
    campaign_name: String(panel.querySelector("#v17CampaignName")?.value || "").trim(),
    headline: String(panel.querySelector("#v17CampaignHeadline")?.value || "").trim(),
    message: String(panel.querySelector("#v17CampaignMessage")?.value || "").trim(),
    percent_off: Math.round(Number(panel.querySelector("#v17CampaignPercent")?.value) || 0),
    scope: panel.querySelector("#v17CampaignScope")?.value || "all_pdfs",
    target_resource_id: panel.querySelector("#v17CampaignResource")?.value || null,
    target_series_id: panel.querySelector("#v17CampaignSeries")?.value || null,
    target_service: panel.querySelector("#v17CampaignService")?.value || null,
    theme: panel.querySelector("#v17CampaignTheme")?.value || "custom",
    background_color: panel.querySelector("#v17CampaignBackground")?.value || THEMES.custom.background_color,
    text_color: panel.querySelector("#v17CampaignText")?.value || THEMES.custom.text_color,
    accent_color: panel.querySelector("#v17CampaignAccent")?.value || THEMES.custom.accent_color,
    button_label: String(panel.querySelector("#v17CampaignButtonLabel")?.value || "").trim() || "View This Offer",
    button_url: safeCtaUrl(panel.querySelector("#v17CampaignButtonUrl")?.value),
    starts_at: dateTimeIso(panel.querySelector("#v17CampaignStarts")?.value),
    ends_at: dateTimeIso(panel.querySelector("#v17CampaignEnds")?.value),
    popup_frequency: panel.querySelector("#v17CampaignFrequency")?.value || "once_campaign",
  };
  if (!campaign.campaign_name || !campaign.headline || !campaign.message) {
    setAdminStatus("Enter a campaign name, banner heading, and banner message.");
    return null;
  }
  if (campaign.percent_off < 1 || campaign.percent_off > 100) {
    setAdminStatus("Enter a discount from 1% through 100%.");
    return null;
  }
  if (["resource", "service_pdf"].includes(campaign.scope) && !campaign.target_resource_id) {
    setAdminStatus("Choose the PDF or resource this campaign applies to.");
    return null;
  }
  if (campaign.scope === "series" && !campaign.target_series_id) {
    setAdminStatus("Choose the bundle this campaign applies to.");
    return null;
  }
  if (["coaching", "service_pdf"].includes(campaign.scope) && !campaign.target_service) {
    setAdminStatus("Choose one coaching service or all coaching services.");
    return null;
  }
  if (campaign.starts_at && campaign.ends_at && Date.parse(campaign.starts_at) >= Date.parse(campaign.ends_at)) {
    setAdminStatus("The promotion end time must be later than its start time.");
    return null;
  }
  return campaign;
}

function validateCampaignImage(file) {
  if (!file) return;
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Banner artwork must be a JPG, PNG, or WebP image.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Banner artwork must be 5 MB or smaller.");
}

async function uploadCampaignImage(file) {
  validateCampaignImage(file);
  const userId = api.getSession()?.user?.id;
  if (!userId) throw new Error("Your administrator session expired. Sign in again before uploading artwork.");
  const extension = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[file.type];
  const safeName = String(file.name || "campaign").toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-");
  const path = `${userId}/${Date.now()}-${safeName.replace(/\.[^.]+$/, "")}.${extension}`;
  const { error } = await api.supabase.storage.from(PROMOTION_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  const imageUrl = api.supabase.storage.from(PROMOTION_BUCKET).getPublicUrl(path).data.publicUrl;
  return { image_path: path, image_url: imageUrl };
}

async function saveCampaign(panel) {
  if (!campaignTableReady) {
    setAdminStatus("Apply the reusable promotion campaigns database update before saving campaigns.");
    return;
  }
  const draft = campaignFromPanel(panel);
  if (!draft) return;
  const existing = campaigns.find(record => record.id === editingCampaignId) || null;
  const imageFile = panel.querySelector("#v17CampaignImage")?.files?.[0] || null;
  const removeImage = Boolean(panel.querySelector("#v17RemoveImage")?.checked);
  let uploaded = null;
  setAdminStatus(imageFile ? "Uploading banner artwork…" : "Saving the campaign…");
  try {
    if (imageFile) uploaded = await uploadCampaignImage(imageFile);
    const payload = {
      ...draft,
      image_url: uploaded?.image_url || (removeImage ? null : existing?.image_url || null),
      image_path: uploaded?.image_path || (removeImage ? null : existing?.image_path || null),
      updated_at: new Date().toISOString(),
    };
    const query = existing
      ? api.supabase.from(CAMPAIGNS_TABLE).update(payload).eq("id", existing.id)
      : api.supabase.from(CAMPAIGNS_TABLE).insert({ ...payload, created_by: api.getSession()?.user?.id, is_active: false });
    const { data, error } = await query.select("*").single();
    if (error) throw error;
    if (existing?.image_path && existing.image_path !== data.image_path)
      await removeCampaignImageIfUnused(existing.image_path, existing.id);
    editingCampaignId = data.id;
    adminFlash = `Saved “${data.campaign_name}.” Use Activate when you want visitors to see it.`;
    await loadMarketingData();
  } catch (error) {
    if (uploaded?.image_path) await api.supabase.storage.from(PROMOTION_BUCKET).remove([uploaded.image_path]);
    setAdminStatus(error instanceof Error ? error.message : "Unable to save the promotion campaign.");
  }
}

async function removeCampaignImageIfUnused(imagePath, excludingCampaignId) {
  if (!imagePath) return;
  const shared = campaigns.some(record => record.id !== excludingCampaignId && record.image_path === imagePath);
  if (!shared) await api.supabase.storage.from(PROMOTION_BUCKET).remove([imagePath]);
}

async function duplicateCampaign(id) {
  const original = campaigns.find(record => record.id === id);
  if (!original) return;
  setAdminStatus(`Duplicating “${original.campaign_name}”…`);
  const payload = {
    campaign_name: `${original.campaign_name} Copy`,
    headline: original.headline,
    message: original.message,
    percent_off: original.percent_off,
    scope: original.scope,
    target_resource_id: original.target_resource_id,
    target_series_id: original.target_series_id,
    target_service: original.target_service,
    theme: original.theme,
    background_color: original.background_color,
    text_color: original.text_color,
    accent_color: original.accent_color,
    image_url: original.image_url,
    image_path: original.image_path,
    button_label: original.button_label,
    button_url: original.button_url,
    popup_frequency: original.popup_frequency || "once_campaign",
    starts_at: null,
    ends_at: null,
    is_active: false,
    created_by: api.getSession()?.user?.id,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await api.supabase.from(CAMPAIGNS_TABLE).insert(payload).select("*").single();
  if (error) return setAdminStatus(error.message);
  editingCampaignId = data.id;
  adminFlash = `Duplicated “${original.campaign_name}.” The copy is saved and ready to edit.`;
  await loadMarketingData();
}

async function setCampaignActive(id) {
  const campaign = campaigns.find(record => record.id === id);
  if (!campaign) return;
  if (!campaign.is_active && campaign.ends_at && Date.parse(campaign.ends_at) <= Date.now()) {
    setAdminStatus("This campaign’s end time has already passed. Edit the schedule before activating it.");
    return;
  }
  setAdminStatus(campaign.is_active ? "Deactivating this campaign…" : `Activating “${campaign.campaign_name}”…`);
  if (campaign.is_active) {
    const { error } = await api.supabase.from(CAMPAIGNS_TABLE).update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) return setAdminStatus(error.message);
    adminFlash = "The campaign is saved but no longer live. No discount banner is active.";
    await loadMarketingData();
    return;
  }
  const previousActiveId = armedCampaign?.id || null;
  const { error: deactivateError } = await api.supabase.from(CAMPAIGNS_TABLE).update({ is_active: false, updated_at: new Date().toISOString() }).eq("is_active", true);
  if (deactivateError) return setAdminStatus(deactivateError.message);
  const { error: activateError } = await api.supabase.from(CAMPAIGNS_TABLE).update({ is_active: true, updated_at: new Date().toISOString() }).eq("id", id);
  if (activateError) {
    if (previousActiveId) await api.supabase.from(CAMPAIGNS_TABLE).update({ is_active: true, updated_at: new Date().toISOString() }).eq("id", previousActiveId);
    return setAdminStatus(activateError.message);
  }
  const scheduled = campaign.starts_at && Date.parse(campaign.starts_at) > Date.now();
  adminFlash = scheduled
    ? `“${campaign.campaign_name}” is scheduled. It will begin automatically ${formatLocalDate(campaign.starts_at)}.`
    : `“${campaign.campaign_name}” is now live. Visitors will see its banner when they enter the website.`;
  await loadMarketingData();
  if (!scheduled) window.setTimeout(() => showPromotionPopup(true, { ...campaign, id: "preview", is_active: true }), 80);
}

async function deleteCampaign(id) {
  const campaign = campaigns.find(record => record.id === id);
  if (!campaign || !window.confirm(`Delete the saved campaign “${campaign.campaign_name}”? This cannot be undone.`)) return;
  setAdminStatus("Deleting the saved campaign…");
  const { error } = await api.supabase.from(CAMPAIGNS_TABLE).delete().eq("id", id);
  if (error) return setAdminStatus(error.message);
  if (campaign.image_path) await removeCampaignImageIfUnused(campaign.image_path, campaign.id);
  if (editingCampaignId === id) editingCampaignId = null;
  adminFlash = `Deleted “${campaign.campaign_name}.”`;
  await loadMarketingData();
}

async function loadAdminReports() {
  if (!api?.isAdmin() || adminReportsLoaded) return;
  const manager = document.getElementById("v14Admin");
  if (!manager?.open) return;
  if (adminReportsLoading) return adminReportsLoading;
  adminReportsLoading = (async () => {
    const [eventResult, claimResult] = await Promise.all([
      api.supabase.from(PROMOTION_EVENTS_TABLE).select("campaign_id,event_type,happened_at").order("happened_at", { ascending: false }).limit(5000),
      api.supabase.from("store_free_packet_claims").select("id,user_id,resource_id,email_snapshot,full_name_snapshot,marketing_consent,claimed_at").order("claimed_at", { ascending: false }).limit(1000),
    ]);
    campaignEvents = eventResult.error ? [] : eventResult.data || [];
    freePacketClaims = claimResult.error ? [] : claimResult.data || [];
    adminReportsLoaded = true;
    if (manager.open) renderAdminPanel();
  })().finally(() => {
    adminReportsLoading = null;
  });
  return adminReportsLoading;
}

function mountAdminReportLoader() {
  if (adminReportListenerMounted) return;
  const manager = document.getElementById("v14Admin");
  if (!manager) return;
  adminReportListenerMounted = true;
  manager.addEventListener("toggle", () => {
    if (manager.open) void loadAdminReports();
    else adminReportsLoaded = false;
  });
  if (manager.open) void loadAdminReports();
}

async function performMarketingDataLoad() {
  if (!api) return;
  const admin = api.isAdmin();
  const [settingsResult, campaignResult, resourceResult, seriesResult] = await Promise.all([
    api.supabase.from(SETTINGS_TABLE).select("*").eq("id", true).maybeSingle(),
    api.supabase.from(CAMPAIGNS_TABLE).select("*").order("updated_at", { ascending: false }),
    api.supabase.from("resources").select("id,title,resource_type,price_cents,storage_path,series_id").eq("is_published", true).not("storage_path", "is", null).order("title"),
    api.supabase.from("resource_series").select("id,title,display_name,is_published").eq("is_published", true).order("title"),
  ]);
  resources = resourceResult.error ? [] : resourceResult.data || [];
  series = seriesResult.error ? [] : seriesResult.data || [];
  settingsReady = !settingsResult.error;
  marketingSettings = { ...DEFAULTS, ...(settingsResult.data || {}) };
  campaignTableReady = !campaignResult.error;
  campaigns = campaignResult.error ? [] : campaignResult.data || [];
  if (!admin) {
    campaignEvents = [];
    freePacketClaims = [];
    adminReportsLoaded = false;
  }
  armedCampaign = campaigns.find(record => record.is_active) || null;
  activeCampaign = campaigns.find(record => campaignIsLive(record)) || null;
  syncPromotionSettings();
  publishState();
  renderPromotionBanner();
  renderGiftAccess();
  decorateServices();
  renderAdminPanel();
  mountAdminReportLoader();
  scheduleCampaignRefresh();
  if (api.getSession() && localStorage.getItem(FREE_INTENT_KEY) && settings.free_packet_enabled) void claimPacket();
  window.setTimeout(() => showPromotionPopup(), 180);
  if ((window.location.hash || "#home") === "#store") window.setTimeout(() => showSignupGift(), 520);
}

async function loadMarketingData() {
  if (!api) return;
  if (marketingLoadPromise) {
    marketingLoadQueued = true;
    return marketingLoadPromise;
  }
  marketingLoadPromise = (async () => {
    do {
      marketingLoadQueued = false;
      await performMarketingDataLoad();
    } while (marketingLoadQueued);
  })();
  try {
    return await marketingLoadPromise;
  } finally {
    marketingLoadPromise = null;
  }
}

function scheduleMarketingReload(delay = 120) {
  if (marketingReloadTimer) window.clearTimeout(marketingReloadTimer);
  marketingReloadTimer = window.setTimeout(() => {
    marketingReloadTimer = null;
    void loadMarketingData();
  }, delay);
}

function showWelcomeDiscountConfirmation() {
  const percent = Math.max(0, Math.min(100, Math.round(Number(settings.welcome_discount_percent) || 0)));
  if (settings.welcome_promotion_mode !== "percentage" || !percent) return;
  const dialog = giftDialog();
  dialog.innerHTML = `<div class="v16-dialog-body"><button class="v16-dialog-x" type="button" data-v16-close aria-label="Close">×</button><span class="v15-kicker">Welcome to Chapter 21</span><h2>Your welcome discount is active</h2><p>Avery has your account signup. Your ${percent}% welcome discount applies across published Store PDFs at checkout.</p><div class="v15-actions"><button class="v9-btn primary" type="button" data-v16-close>Browse Store Resources</button></div></div>`;
  if (!dialog.open) dialog.showModal();
}
async function handleWelcomeIntent() {
  if (!api?.getSession() || !localStorage.getItem(FREE_INTENT_KEY)) return;
  await loadMarketingData();
  if (settings.welcome_promotion_mode === "percentage" && Number(settings.welcome_discount_percent) > 0) {
    localStorage.removeItem(FREE_INTENT_KEY);
    syncPromotionSettings();
    publishState();
    renderGiftAccess();
    showWelcomeDiscountConfirmation();
  } else {
    void claimPacket();
  }
}
function mountAuthListener() {
  if (authListenerMounted || !api) return;
  authListenerMounted = true;
  api.supabase.auth.onAuthStateChange((event, session) => {
    renderGiftAccess();
    if (session && localStorage.getItem(FREE_INTENT_KEY)) window.setTimeout(() => void handleWelcomeIntent(), 0);
    if (event === "INITIAL_SESSION") return;
    scheduleMarketingReload(260);
  });
}

function boot() {
  const nextApi = window.AveryStoreManagerApi || api;
  if (!nextApi || bootedApi === nextApi) return;
  api = nextApi;
  bootedApi = nextApi;
  ensureStyles();
  mountAuthListener();
  mountAdminReportLoader();
  void loadMarketingData();
}

window.addEventListener(READY_EVENT, boot);
window.addEventListener("avery:store-manager-catalog-changed", () => scheduleMarketingReload());
window.addEventListener("avery:viewchange", event => {
  if (event.detail?.id === "store") window.setTimeout(() => showSignupGift(), 120);
});
window.addEventListener("avery:account-created", () => {
  void recordAttributedSignup();
  if (api?.getSession() && localStorage.getItem(FREE_INTENT_KEY)) void handleWelcomeIntent();
});

// Public Store cards and the cart can render before the manager API and remote
// campaign query finish. Publish the inactive default immediately so they never
// observe a null promotion state; loadMarketingData() replaces it with the same
// active campaign that server-side checkout verifies.
publishState();
boot();
