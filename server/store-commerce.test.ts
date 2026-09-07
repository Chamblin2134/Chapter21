import { afterEach, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";
import {
  claimFreePacket,
  createStoreCheckout,
  discountedPriceCents,
  handleStripeWebhook,
  promotionAppliesToLine,
  recordPromotionEvent,
  type MarketingSettings,
} from "./store-commerce";

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

afterEach(() => vi.unstubAllEnvs());

const resource = {
  id: "10000000-0000-4000-8000-000000000001",
  series_id: "20000000-0000-4000-8000-000000000002",
};
const campaignId = "40000000-0000-4000-8000-000000000004";

const settings = (patch: Partial<MarketingSettings>): MarketingSettings => ({
  discount_enabled: true,
  discount_percent: 25,
  discount_scope: "all_pdfs",
  ...patch,
});

describe("Store promotion pricing", () => {
  it("calculates administrator-selected percentage discounts in cents", () => {
    expect(discountedPriceCents(1000, 5)).toBe(950);
    expect(discountedPriceCents(1000, 10)).toBe(900);
    expect(discountedPriceCents(1000, 25)).toBe(750);
    expect(discountedPriceCents(1000, 50)).toBe(500);
    expect(discountedPriceCents(999, 25)).toBe(749);
    expect(discountedPriceCents(1000, 100)).toBe(0);
  });

  it("applies all-resource and one-resource campaigns only to eligible PDFs", () => {
    expect(
      promotionAppliesToLine(
        settings({ discount_scope: "all_pdfs" }),
        resource,
        {}
      )
    ).toBe(true);
    expect(
      promotionAppliesToLine(
        settings({
          discount_scope: "resource",
          target_resource_id: resource.id,
        }),
        resource,
        {}
      )
    ).toBe(true);
    expect(
      promotionAppliesToLine(
        settings({
          discount_scope: "resource",
          target_resource_id: "30000000-0000-4000-8000-000000000003",
        }),
        resource,
        {}
      )
    ).toBe(false);
  });

  it("limits a bundle promotion to a complete-series cart context", () => {
    const campaign = settings({
      discount_scope: "series",
      target_series_id: resource.series_id,
    });
    expect(
      promotionAppliesToLine(campaign, resource, {
        bundleSeriesId: resource.series_id,
      })
    ).toBe(true);
    expect(promotionAppliesToLine(campaign, resource, {})).toBe(false);
  });

  it("does not invent online coaching pricing", () => {
    expect(
      promotionAppliesToLine(
        settings({
          discount_scope: "coaching",
          target_service: "svc-recovery",
        }),
        resource,
        {}
      )
    ).toBe(false);
  });

  it("rechecks the active promotion and catalog price before creating Stripe Checkout", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-test");
    vi.stubEnv("STRIPE_SECRET_KEY", "stripe-secret-test");
    const fetchImpl = vi.fn(
      async (input: string | URL | Request, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith("/auth/v1/user"))
          return reply({ id: "customer-test", email: "customer@example.com" });
        if (url.includes("/rest/v1/resources"))
          return reply([
            {
              ...resource,
              title: "Recovery Practice Packet",
              resource_type: "Packet",
              price_cents: 1000,
              storage_path: "admin/packet.pdf",
            },
          ]);
        if (url.includes("/rest/v1/store_promotion_campaigns"))
          return reply([
            {
              id: campaignId,
              campaign_name: "Fall Recovery Savings",
              percent_off: 25,
              scope: "series",
              target_series_id: resource.series_id,
              is_active: true,
            },
          ]);
        if (url.includes("api.stripe.com/v1/checkout/sessions")) {
          const parameters = new URLSearchParams(String(init?.body || ""));
          expect(parameters.get("line_items[0][price_data][unit_amount]")).toBe(
            "750"
          );
          expect(parameters.get("metadata[discount_percent]")).toBe("25");
          expect(parameters.get("metadata[promotion_campaign_id]")).toBe(
            campaignId
          );
          expect(parameters.get("metadata[promotion_campaign_name]")).toBe(
            "Fall Recovery Savings"
          );
          expect(parameters.get("client_reference_id")).toBe("customer-test");
          expect(parameters.get("metadata[user_id]")).toBe("customer-test");
          return reply({
            id: "cs_test_checkout",
            url: "https://checkout.stripe.test/session",
          });
        }
        if (url.includes("/rest/v1/store_checkout_intents")) return reply({}, 201);
        return reply({}, 404);
      }
    ) as unknown as typeof fetch;

    const result = await createStoreCheckout(
      "Bearer customer-session",
      {
        cartLines: [
          {
            resourceId: resource.id,
            quantity: 1,
            bundleSeriesId: resource.series_id,
          },
        ],
      },
      { fetchImpl, origin: "http://localhost:3000" }
    );

    expect(result.status).toBe(200);
    expect(result.body.url).toBe("https://checkout.stripe.test/session");
    expect(result.body.checkoutIntent).toBeUndefined();
    const intentCall = fetchImpl.mock.calls.find(([input]) => String(input).includes("/rest/v1/store_checkout_intents"));
    expect(intentCall?.[1]?.method).toBe("POST");
    expect(JSON.parse(String(intentCall?.[1]?.body))).toMatchObject({
      stripe_session_id: "cs_test_checkout",
      user_id: "customer-test",
      customer_email: "customer@example.com",
      base_total_cents: 1000,
      discount_percent: 25,
      discount_amount_cents: 250,
      final_total_cents: 750,
      promotion_campaign_id: campaignId,
    });
  });

  it("applies the authenticated welcome percentage to all PDFs when no campaign is active", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-test");
    vi.stubEnv("STRIPE_SECRET_KEY", "stripe-secret-test");
    const fetchImpl = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/rest/v1/store_promotion_campaigns")) return reply([]);
      if (url.endsWith("/auth/v1/user")) return reply({ id: "customer-test", email: "customer@example.com" });
      if (url.includes("/rest/v1/store_marketing_settings")) return reply([{ welcome_promotion_mode: "percentage", welcome_discount_percent: 25 }]);
      if (url.includes("/rest/v1/resources")) return reply([{ ...resource, title: "Welcome PDF", price_cents: 1000, storage_path: "admin/welcome.pdf" }]);
      if (url.includes("api.stripe.com/v1/checkout/sessions")) {
        const parameters = new URLSearchParams(String(init?.body || ""));
        expect(parameters.get("line_items[0][price_data][unit_amount]")).toBe("750");
        expect(parameters.get("metadata[discount_percent]")).toBe("25");
        expect(parameters.get("metadata[promotion_campaign_name]")).toBe("Welcome account offer");
        return reply({ id: "cs_test_welcome", url: "https://checkout.stripe.test/welcome" });
      }
      if (url.includes("/rest/v1/store_checkout_intents")) return reply({}, 201);
      return reply({}, 404);
    }) as unknown as typeof fetch;
    const result = await createStoreCheckout(
      "Bearer customer-session",
      { cartLines: [{ resourceId: resource.id, quantity: 1 }] },
      { fetchImpl, origin: "http://localhost:3000" }
    );
    expect(result.status).toBe(200);
    expect(result.body.url).toBe("https://checkout.stripe.test/welcome");
    expect(result.body.checkoutIntent).toBeUndefined();
  });

  it("requires an authenticated account and returns only a time-limited signed free-packet link", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-test");
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith("/auth/v1/user"))
        return reply({ id: "customer-test", email: "customer@example.com" });
      if (url.includes("/rest/v1/store_marketing_settings"))
        return reply([
          {
            free_packet_enabled: true,
            free_packet_resource_id: resource.id,
          },
        ]);
      if (url.includes("/rest/v1/resources"))
        return reply([
          {
            ...resource,
            title: "Welcome Packet",
            price_cents: 500,
            storage_path: "admin/welcome.pdf",
          },
        ]);
      if (url.includes("/rest/v1/store_free_packet_claims"))
        return reply({}, 201);
      if (url.includes("/storage/v1/object/sign/resource-files/"))
        return reply({
          signedURL: "/object/sign/resource-files/admin/welcome.pdf?token=safe",
        });
      return reply({}, 404);
    }) as unknown as typeof fetch;

    const result = await claimFreePacket(
      "Bearer customer-session",
      { marketingConsent: true },
      { fetchImpl }
    );

    expect(result.status).toBe(200);
    expect(result.body.title).toBe("Welcome Packet");
    expect(result.body.downloadUrl).toContain(
      "/storage/v1/object/sign/resource-files/"
    );
    expect(result.body.expiresIn).toBe(900);
    const claimCall = fetchImpl.mock.calls.find(call =>
      String(call[0]).includes("/rest/v1/store_free_packet_claims")
    );
    expect(JSON.parse(String(claimCall?.[1]?.body))).toMatchObject({
      email_snapshot: "customer@example.com",
      marketing_consent: true,
    });
  });

  it("does not apply a scheduled discount before its start time", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-test");
    vi.stubEnv("STRIPE_SECRET_KEY", "stripe-secret-test");
    const fetchImpl = vi.fn(
      async (input: string | URL | Request, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith("/auth/v1/user"))
          return reply({ id: "customer-test", email: "customer@example.com" });
        if (url.includes("/rest/v1/resources"))
          return reply([{ ...resource, title: "Packet", price_cents: 1000, storage_path: "admin/packet.pdf" }]);
        if (url.includes("/rest/v1/store_promotion_campaigns"))
          return reply([{ id: campaignId, campaign_name: "Scheduled", percent_off: 50, scope: "all_pdfs", is_active: true, starts_at: "2999-01-01T00:00:00.000Z" }]);
        if (url.includes("api.stripe.com/v1/checkout/sessions")) {
          const parameters = new URLSearchParams(String(init?.body || ""));
          expect(parameters.get("line_items[0][price_data][unit_amount]")).toBe("1000");
          expect(parameters.get("metadata[promotion_campaign_id]")).toBeNull();
          return reply({ id: "cs_test_scheduled", url: "https://checkout.stripe.test/scheduled" });
        }
        if (url.includes("/rest/v1/store_checkout_intents")) return reply({}, 201);
        return reply({}, 404);
      }
    ) as unknown as typeof fetch;
    const result = await createStoreCheckout("Bearer customer-session", { cartLines: [{ resourceId: resource.id, quantity: 1 }] }, { fetchImpl, origin: "http://localhost:3000" });
    expect(result.status).toBe(200);
  });

  it("records deduplicated campaign events through the secure server endpoint", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-test");
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("/rest/v1/store_promotion_campaigns")) return reply([{ id: campaignId }]);
      if (url.includes("/rest/v1/store_promotion_events")) return reply({}, 201);
      return reply({}, 404);
    }) as unknown as typeof fetch;
    const result = await recordPromotionEvent(undefined, {
      campaignId,
      eventType: "impression",
      dedupeKey: "visitor-key-123",
    }, { fetchImpl });
    expect(result).toEqual({ status: 200, body: { recorded: true } });
  });

  it("returns a clear service-unavailable response when checkout secrets are missing", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    const result = await createStoreCheckout(undefined, { cartLines: [{ resourceId: resource.id, quantity: 1 }] });
    expect(result).toEqual({
      status: 503,
      body: {
        error: "Secure checkout needs the Supabase service role and Stripe secret environment variables.",
      },
    });
  });

  it("returns a verified checkout intent for the authenticated client insert", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-test");
    vi.stubEnv("STRIPE_SECRET_KEY", "stripe-secret-test");
    const fetchImpl = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/auth/v1/user")) return reply({ id: "customer-test", email: "customer@example.com" });
      if (url.includes("/rest/v1/resources")) return reply([{ ...resource, title: "Packet", price_cents: 299, storage_path: "admin/packet.pdf" }]);
      if (url.includes("/rest/v1/store_promotion_campaigns")) return reply([]);
      if (url.includes("api.stripe.com/v1/checkout/sessions")) return reply({ id: "cs_test_record_error", url: "https://checkout.stripe.test/session" });
      return reply({}, 404);
    }) as unknown as typeof fetch;
    const result = await createStoreCheckout("Bearer customer-session", { cartLines: [{ resourceId: resource.id, quantity: 1 }] }, { fetchImpl });
    expect(result.status).toBe(200);
    expect(result.body.url).toBe("https://checkout.stripe.test/session");
    expect(result.body.checkoutIntent).toMatchObject({
      stripe_session_id: "cs_test_record_error",
      user_id: "customer-test",
      final_total_cents: 299,
    });
  });

  it("rejects a paid checkout without an authenticated customer account", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-test");
    vi.stubEnv("STRIPE_SECRET_KEY", "stripe-secret-test");
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("/rest/v1/resources"))
        return reply([{ ...resource, title: "Packet", price_cents: 299, storage_path: "admin/packet.pdf" }]);
      if (url.includes("/rest/v1/store_promotion_campaigns")) return reply([]);
      return reply({}, 404);
    }) as unknown as typeof fetch;
    const result = await createStoreCheckout(undefined, { cartLines: [{ resourceId: resource.id, quantity: 1 }] }, { fetchImpl });
    expect(result).toEqual({
      status: 401,
      body: { error: "Please sign in before checking out so your purchases stay in your account." },
    });
  });

  it("verifies a signed checkout event and does not create a duplicate Store order on replay", async () => {
    const secret = "whsec_test_store_order";
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-test");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_store_order");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", secret);
    const sessionId = "cs_test_store_order_123";
    const payload = JSON.stringify({
      id: "evt_store_order_paid",
      type: "checkout.session.completed",
      data: { object: {
        id: sessionId,
        payment_status: "paid",
        status: "complete",
        amount_total: 269,
        customer_email: "customer@example.com",
        metadata: { user_id: "10000000-0000-4000-8000-000000000001" },
      } },
    });
    const signature = new Stripe("sk_test_store_order").webhooks.generateTestHeaderString({ payload, secret });
    const intent = {
      stripe_session_id: sessionId,
      user_id: "10000000-0000-4000-8000-000000000001",
      customer_email: "customer@example.com",
      base_total_cents: 299,
      discount_percent: 10,
      discount_amount_cents: 30,
      final_total_cents: 269,
      promotion_campaign_id: null,
      line_items: [{ resource_id: resource.id, title_snapshot: "Recovery Packet", quantity: 1, base_price_cents: 299, final_price_cents: 269 }],
    };
    const firstFetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/rest/v1/store_checkout_intents")) return reply([intent]);
      if (url.includes("/rest/v1/store_orders?") && !init?.method) return reply([]);
      if (url.endsWith("/rest/v1/store_orders") && init?.method === "POST") return reply([{ id: "50000000-0000-4000-8000-000000000005" }], 201);
      if (url.includes("/rest/v1/store_order_items?") && init?.method === "POST") return reply({}, 201);
      return reply({}, 404);
    }) as unknown as typeof fetch;
    expect(await handleStripeWebhook(Buffer.from(payload), signature, { fetchImpl: firstFetch })).toMatchObject({ status: 200, body: { fulfilled: true } });

    const replayFetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/rest/v1/store_checkout_intents")) return reply([intent]);
      if (url.includes("/rest/v1/store_orders?") && !init?.method) return reply([{ id: "50000000-0000-4000-8000-000000000005", user_id: intent.user_id, stripe_session_id: sessionId, payment_status: "paid", store_order_items: intent.line_items }]);
      if (url.includes("/rest/v1/store_order_items?") && init?.method === "POST") return reply({}, 201);
      return reply({}, 404);
    }) as unknown as typeof fetch;
    const replay = await handleStripeWebhook(Buffer.from(payload), signature, { fetchImpl: replayFetch });
    expect(replay).toMatchObject({ status: 200, body: { fulfilled: true } });
    expect(replayFetch.mock.calls.some(call => String(call[0]).endsWith("/rest/v1/store_orders") && call[1]?.method === "POST")).toBe(false);
  });
});
