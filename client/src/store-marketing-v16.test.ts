import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const marketing = readFileSync(
  resolve(import.meta.dirname, "../public/store-marketing-v17.js"),
  "utf8"
);
const source = readFileSync(
  resolve(import.meta.dirname, "../public/avery-source.html"),
  "utf8"
);
const migration = readFileSync(
  resolve(
    import.meta.dirname,
    "../../supabase/migrations/20260904_store_marketing.sql"
  ),
  "utf8"
);
const campaignMigration = readFileSync(
  resolve(
    import.meta.dirname,
    "../../supabase/migrations/20260904_reusable_promotion_campaigns.sql"
  ),
  "utf8"
);
const controlsMigration = readFileSync(
  resolve(
    import.meta.dirname,
    "../../supabase/migrations/20260904_promotion_controls_reporting.sql"
  ),
  "utf8"
);

describe("Chapter 21 signup gift and promotions", () => {
  it("lets the administrator choose and activate one secure signup packet", () => {
    expect(marketing).toContain("Welcome to Chapter 21");
    expect(marketing).toContain("Sign up today to get a free packet.");
    expect(marketing).toContain('id="v16FreeEnabled"');
    expect(marketing).toContain('id="v16FreeResource"');
    expect(marketing).toContain('fetch("/api/free-packet/claim"');
    expect(marketing).toContain("Download Your Free Packet");
    expect(marketing).toContain('window.openAccountPanel?.("create")');
    expect(source).toContain("avery:account-created");
    expect(migration).toContain("store_free_packet_claims");
  });

  it("saves reusable seasonal and custom campaigns with one live banner", () => {
    expect(marketing).toContain("Summer");
    expect(marketing).toContain("Fall");
    expect(marketing).toContain("Halloween");
    expect(marketing).toContain("Christmas");
    expect(marketing).toContain("New Year");
    expect(marketing).toContain('id="v17CampaignName"');
    expect(marketing).toContain('id="v17CampaignImage"');
    expect(marketing).toContain("Preview Banner");
    expect(marketing).toContain("Activate");
    expect(marketing).toContain("Deactivate");
    expect(marketing).toContain("Delete");
    expect(campaignMigration).toContain("store_promotion_campaigns_one_active_idx");
    expect(campaignMigration).toContain("promotion-assets");
  });

  it("offers quick and custom percentage controls for every requested scope", () => {
    expect(marketing).toContain("[5, 10, 25, 50]");
    expect(marketing).toContain('name="v17DiscountQuick" value="${percent}"');
    expect(marketing).toContain('id="v17CampaignPercent"');
    expect(marketing).toContain("All PDFs / Store resources");
    expect(marketing).toContain("One PDF / resource");
    expect(marketing).toContain("One bundle");
    expect(marketing).toContain("Coaching services");
    expect(marketing).toContain("Coaching service plus one PDF");
    expect(marketing).toContain("Whole Store and all coaching services");
  });

  it("keeps promotion prices authoritative through secure checkout", () => {
    expect(source).toContain("window.AveryStorePromotionState");
    expect(source).toContain("data-avery-unit-price-cents");
    expect(source).toContain("bundlePurchaseSeriesId");
    expect(source).toContain("cartLines: cartItems.map");
    expect(source).toContain(
      '<script type="module" src="/store-marketing-v17.js?v=20260904-welcome-modes-v1"></script>'
    );
    expect(migration).toContain(
      "discount_scope in ('all_pdfs', 'resource', 'series', 'coaching', 'service_pdf', 'sitewide')"
    );
    expect(campaignMigration).toContain(
      "scope in ('all_pdfs', 'resource', 'series', 'coaching', 'service_pdf', 'sitewide')"
    );
    expect(marketing).toContain("avery-promotion-seen-");
    expect(marketing).toContain("showPromotionPopup()");
  });

  it("adds automatic schedules, popup frequency choices, duplication, and performance counts", () => {
    expect(marketing).toContain('id="v17CampaignStarts"');
    expect(marketing).toContain('id="v17CampaignEnds"');
    expect(marketing).toContain('id="v17CampaignFrequency"');
    expect(marketing).toContain("Once per campaign");
    expect(marketing).toContain("Once each day");
    expect(marketing).toContain("Every new visit");
    expect(marketing).toContain("data-v17-duplicate");
    expect(marketing).toContain("Views ${stats.impression}");
    expect(marketing).toContain("Signups ${stats.signup}");
    expect(marketing).toContain("Purchases ${stats.purchase}");
    expect(controlsMigration).toContain("starts_at timestamptz");
    expect(controlsMigration).toContain("store_promotion_events");
  });

  it("shows paginated free-packet requests and exports only consented contacts", () => {
    expect(marketing).toContain("Free Packet Requests");
    expect(marketing).toContain("Export Consented Email List");
    expect(marketing).toContain("claim.marketing_consent && claim.email_snapshot");
    expect(marketing).toContain("CLAIMS_PER_PAGE = 6");
    expect(marketing).toContain("data-v17-marketing-consent");
    expect(controlsMigration).toContain("marketing_consent boolean");
  });

  it("coalesces promotion reloads and defers large administrator reports until the manager opens", () => {
    expect(marketing).toContain("if (marketingLoadPromise)");
    expect(marketing).toContain("marketingLoadQueued = true");
    expect(marketing).toContain("function scheduleMarketingReload");
    expect(marketing).toContain('if (event === "INITIAL_SESSION") return;');
    expect(source).toContain("if (event === 'INITIAL_SESSION') return;");
    expect(marketing).toContain("async function loadAdminReports()");
    expect(marketing).toContain("if (!manager?.open) return;");
    expect(marketing).toContain('manager.addEventListener("toggle"');
  });

  it("mounts enhanced interactions once and avoids a self-triggering cart refresh loop", () => {
    expect(source).toContain("wrap.dataset.averyEnhancedCartMounted==='true'");
    expect(source).toContain("value.textContent!==String(current)");
    expect(source).toContain("if(refreshFrame)return;");
    expect(source).toContain("if(initialized)return;");
    expect(source).not.toContain("window.addEventListener('load',()=>window.setTimeout(init,350)");
  });
});
