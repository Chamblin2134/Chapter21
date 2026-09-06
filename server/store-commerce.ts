import Stripe from "stripe";

const DEFAULT_SUPABASE_URL = "https://khsanicntfagqjhcdwqs.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_l1ZOmU5ONLXnDtDu6Qthfg_tE2d7h1E";
const DEFAULT_SITE_URL = "https://averyinsti-qnbmu2v8.manus.space";
const MAX_CART_UNITS = 99;
const MAX_UNIQUE_RESOURCES = 12;

export const CART_CHECKOUT_ENDPOINT = "/api/stripe/cart-checkout";
export const SINGLE_CHECKOUT_ENDPOINT = "/api/stripe/checkout";
export const DOWNLOADS_ENDPOINT = "/api/stripe/downloads";
export const STORE_ORDERS_ENDPOINT = "/api/store/orders";
export const STORE_DOWNLOAD_ENDPOINT = "/api/store/download";
export const STRIPE_WEBHOOK_ENDPOINT = "/api/stripe/webhook";
export const FREE_PACKET_ENDPOINT = "/api/free-packet/claim";
export const PROMOTION_EVENT_ENDPOINT = "/api/promotions/event";

type FetchLike = typeof fetch;
type Result = { status: number; body: Record<string, unknown> };

export type MarketingSettings = {
  id?: boolean;
  free_packet_enabled?: boolean;
  free_packet_resource_id?: string | null;
  welcome_promotion_mode?: "packet" | "percentage" | string;
  welcome_discount_percent?: number;
  discount_enabled?: boolean;
  discount_percent?: number;
  discount_scope?: string;
  target_resource_id?: string | null;
  target_series_id?: string | null;
  target_service?: string | null;
  promotion_campaign_id?: string | null;
  promotion_campaign_name?: string | null;
};

type PromotionCampaign = {
  id: string;
  campaign_name?: string | null;
  percent_off?: number;
  scope?: string;
  target_resource_id?: string | null;
  target_series_id?: string | null;
  target_service?: string | null;
  is_active?: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
};

type PromotionEventType = "impression" | "click" | "signup" | "purchase";

export type ResourceRecord = {
  id: string;
  title: string;
  resource_type?: string | null;
  price_cents: number;
  storage_path: string;
  file_name?: string | null;
  series_id?: string | null;
};

export type CartLine = {
  resourceId: string;
  quantity: number;
  bundleSeriesId?: string | null;
};

type AuthenticatedUser = {
  id: string;
  email?: string;
  user_metadata?: { full_name?: string };
};

type StripeCheckoutSession = {
  id?: string;
  payment_status?: string | null;
  status?: string | null;
  amount_total?: number | null;
  amount_subtotal?: number | null;
  payment_intent?: string | { id?: string } | null;
  customer_details?: { email?: string | null } | null;
  customer_email?: string | null;
  metadata?: Record<string, string> | null;
  client_reference_id?: string | null;
};

type StoreOrderItem = {
  resource_id: string;
  title_snapshot: string;
  quantity: number;
  base_price_cents: number;
  final_price_cents: number;
};

type StoreOrder = {
  id: string;
  user_id: string;
  stripe_session_id: string;
  payment_status: string;
  base_total_cents: number;
  discount_percent: number;
  discount_amount_cents: number;
  final_total_cents: number;
  created_at: string;
  store_order_items?: StoreOrderItem[];
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function environment() {
  return {
    supabaseUrl: (process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(
      /\/+$/,
      ""
    ),
    publishableKey:
      process.env.SUPABASE_ANON_KEY ||
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      DEFAULT_SUPABASE_PUBLISHABLE_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
    siteUrl: (process.env.SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, ""),
  };
}

function safeSiteUrl(origin: string | undefined, fallback: string) {
  try {
    const configured = new URL(fallback);
    const candidate = new URL(origin || fallback);
    const local =
      candidate.hostname === "localhost" || candidate.hostname === "127.0.0.1";
    return local || candidate.origin === configured.origin
      ? candidate.origin
      : fallback;
  } catch {
    return fallback;
  }
}

function serviceHeaders(serviceRoleKey: string) {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
  };
}

async function responseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  return (text ? JSON.parse(text) : {}) as T;
}

async function marketingSettings(
  fetchImpl: FetchLike,
  supabaseUrl: string,
  serviceRoleKey: string
) {
  const response = await fetchImpl(
    `${supabaseUrl}/rest/v1/store_marketing_settings?id=eq.true&select=*`,
    { headers: serviceHeaders(serviceRoleKey) }
  );
  if (!response.ok) return null;
  const rows = await responseJson<MarketingSettings[]>(response);
  return rows[0] || null;
}

async function checkoutMarketingSettings(
  fetchImpl: FetchLike,
  supabaseUrl: string,
  serviceRoleKey: string,
  eligibleUserId?: string | null
): Promise<MarketingSettings | null> {
  const response = await fetchImpl(
    `${supabaseUrl}/rest/v1/store_promotion_campaigns?is_active=eq.true&select=*&limit=1`,
    { headers: serviceHeaders(serviceRoleKey) }
  );
  if (!response.ok)
    return marketingSettings(fetchImpl, supabaseUrl, serviceRoleKey);
  const rows = await responseJson<PromotionCampaign[]>(response);
  const campaign = rows[0];
  if (!campaign || !campaignIsLive(campaign)) {
    const base = await marketingSettings(fetchImpl, supabaseUrl, serviceRoleKey);
    const welcomePercent = Math.max(0, Math.min(100, Math.round(Number(base?.welcome_discount_percent) || 0)));
    if (eligibleUserId && base?.welcome_promotion_mode === "percentage" && welcomePercent > 0) {
      return {
        ...base,
        discount_enabled: true,
        discount_percent: welcomePercent,
        discount_scope: "all_pdfs",
        target_resource_id: null,
        target_series_id: null,
        target_service: null,
        promotion_campaign_name: "Welcome account offer",
      };
    }
    return { discount_enabled: false };
  }
  return {
    discount_enabled: Boolean(campaign.is_active),
    discount_percent: Number(campaign.percent_off) || 0,
    discount_scope: campaign.scope || "all_pdfs",
    target_resource_id: campaign.target_resource_id || null,
    target_series_id: campaign.target_series_id || null,
    target_service: campaign.target_service || null,
    promotion_campaign_id: campaign.id,
    promotion_campaign_name: campaign.campaign_name || null,
  };
}

function campaignIsLive(campaign: PromotionCampaign, now = Date.now()) {
  if (!campaign.is_active) return false;
  const startsAt = campaign.starts_at
    ? Date.parse(campaign.starts_at)
    : Number.NEGATIVE_INFINITY;
  const endsAt = campaign.ends_at
    ? Date.parse(campaign.ends_at)
    : Number.POSITIVE_INFINITY;
  return now >= startsAt && now < endsAt;
}

async function storePromotionEvent(
  fetchImpl: FetchLike,
  supabaseUrl: string,
  serviceRoleKey: string,
  event: {
    campaign_id: string;
    event_type: PromotionEventType;
    dedupe_key: string;
    user_id?: string | null;
  }
) {
  const response = await fetchImpl(
    `${supabaseUrl}/rest/v1/store_promotion_events?on_conflict=campaign_id,event_type,dedupe_key`,
    {
      method: "POST",
      headers: {
        ...serviceHeaders(serviceRoleKey),
        Prefer: "resolution=ignore-duplicates,return=minimal",
      },
      body: JSON.stringify(event),
    }
  );
  if (!response.ok) throw new Error("Unable to record promotion activity.");
}

async function resourcesByIds(
  ids: string[],
  fetchImpl: FetchLike,
  supabaseUrl: string,
  serviceRoleKey: string,
  publishedOnly = true
) {
  if (!ids.length) return [];
  const published = publishedOnly ? "&is_published=eq.true" : "";
  const response = await fetchImpl(
    `${supabaseUrl}/rest/v1/resources?id=in.(${ids.join(",")})${published}&select=id,title,resource_type,price_cents,storage_path,file_name,series_id`,
    { headers: serviceHeaders(serviceRoleKey) }
  );
  if (!response.ok) throw new Error("Unable to read the secure Store catalog.");
  return responseJson<ResourceRecord[]>(response);
}

async function authenticatedUser(
  authorization: string | undefined,
  fetchImpl: FetchLike,
  supabaseUrl: string,
  publishableKey: string
): Promise<AuthenticatedUser | null> {
  if (!authorization?.startsWith("Bearer ")) return null;
  const response = await fetchImpl(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: publishableKey, Authorization: authorization },
  });
  if (!response.ok) return null;
  const user = await responseJson<{
    id?: string;
    email?: string;
    user_metadata?: { full_name?: string };
  }>(response);
  return user.id ? { ...user, id: user.id } : null;
}

export async function recordPromotionEvent(
  authorization: string | undefined,
  body: Record<string, unknown>,
  options: { fetchImpl?: FetchLike } = {}
): Promise<Result> {
  const fetchImpl = options.fetchImpl || fetch;
  const env = environment();
  if (!env.serviceRoleKey)
    return {
      status: 503,
      body: { error: "Promotion reporting is not configured." },
    };

  const campaignId = String(body.campaignId || "");
  const eventType = String(body.eventType || "") as PromotionEventType;
  const dedupeKey = String(body.dedupeKey || "")
    .replace(/[^a-zA-Z0-9:._-]/g, "")
    .slice(0, 180);
  if (
    !uuidPattern.test(campaignId) ||
    !["impression", "click", "signup"].includes(eventType) ||
    dedupeKey.length < 8
  )
    return { status: 400, body: { error: "Invalid promotion event." } };

  try {
    const campaignResponse = await fetchImpl(
      `${env.supabaseUrl}/rest/v1/store_promotion_campaigns?id=eq.${campaignId}&select=id&limit=1`,
      { headers: serviceHeaders(env.serviceRoleKey) }
    );
    if (!campaignResponse.ok)
      throw new Error("Unable to verify the promotion campaign.");
    const campaigns = await responseJson<Array<{ id: string }>>(
      campaignResponse
    );
    if (!campaigns[0])
      return { status: 404, body: { error: "Promotion campaign not found." } };

    const user =
      eventType === "signup" && authorization
        ? await authenticatedUser(
            authorization,
            fetchImpl,
            env.supabaseUrl,
            env.publishableKey
          )
        : null;

    await storePromotionEvent(
      fetchImpl,
      env.supabaseUrl,
      env.serviceRoleKey,
      {
        campaign_id: campaignId,
        event_type: eventType,
        dedupe_key: eventType === "signup" && user?.id ? user.id : dedupeKey,
        user_id: user?.id || null,
      }
    );
    return { status: 200, body: { recorded: true } };
  } catch (error) {
    return {
      status: 400,
      body: {
        error:
          error instanceof Error
            ? error.message
            : "Unable to record promotion activity.",
      },
    };
  }
}

export function promotionAppliesToLine(
  settings: MarketingSettings | null,
  resource: Pick<ResourceRecord, "id" | "series_id">,
  line: Pick<CartLine, "bundleSeriesId">
) {
  if (!settings?.discount_enabled) return false;
  switch (settings.discount_scope) {
    case "all_pdfs":
    case "sitewide":
      return true;
    case "resource":
    case "service_pdf":
      return settings.target_resource_id === resource.id;
    case "series":
      return Boolean(
        settings.target_series_id &&
          settings.target_series_id === resource.series_id &&
          settings.target_series_id === line.bundleSeriesId
      );
    default:
      return false;
  }
}

export function discountedPriceCents(baseCents: number, percent: number) {
  const safeBase = Math.max(0, Math.round(Number(baseCents) || 0));
  const safePercent = Math.max(
    0,
    Math.min(100, Math.round(Number(percent) || 0))
  );
  return Math.max(0, Math.round((safeBase * (100 - safePercent)) / 100));
}

function normalizeCartLines(body: Record<string, unknown>): CartLine[] {
  const suppliedLines = Array.isArray(body.cartLines) ? body.cartLines : [];
  const combined = new Map<string, CartLine>();
  if (suppliedLines.length) {
    for (const value of suppliedLines) {
      const input = value as Record<string, unknown>;
      const resourceId = String(input?.resourceId || "");
      const bundleSeriesId = uuidPattern.test(
        String(input?.bundleSeriesId || "")
      )
        ? String(input.bundleSeriesId)
        : null;
      const quantity = Math.max(
        1,
        Math.min(99, Math.round(Number(input?.quantity) || 1))
      );
      if (!uuidPattern.test(resourceId))
        throw new Error("A cart item is invalid.");
      const key = `${resourceId}:${bundleSeriesId || "individual"}`;
      const prior = combined.get(key);
      combined.set(key, {
        resourceId,
        bundleSeriesId,
        quantity: Math.min(99, (prior?.quantity || 0) + quantity),
      });
    }
  } else {
    const resourceIds = Array.isArray(body.resourceIds) ? body.resourceIds : [];
    for (const value of resourceIds) {
      const resourceId = String(value || "");
      if (!uuidPattern.test(resourceId))
        throw new Error("A cart item is invalid.");
      const prior = combined.get(resourceId);
      combined.set(resourceId, {
        resourceId,
        quantity: Math.min(99, (prior?.quantity || 0) + 1),
      });
    }
  }
  const lines = Array.from(combined.values());
  const units = lines.reduce((total, line) => total + line.quantity, 0);
  if (!lines.length) throw new Error("Your cart is empty.");
  if (lines.length > MAX_UNIQUE_RESOURCES || units > MAX_CART_UNITS)
    throw new Error("This cart is too large for one checkout.");
  return lines;
}

async function stripeRequest<T>(
  path: string,
  init: RequestInit,
  fetchImpl: FetchLike,
  secretKey: string
) {
  const response = await fetchImpl(`https://api.stripe.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      ...(init.headers || {}),
    },
  });
  const payload = await responseJson<T & { error?: { message?: string } }>(
    response
  );
  if (!response.ok)
    throw new Error(
      payload.error?.message || "Stripe checkout is unavailable."
    );
  return payload;
}

function stripeClient(secretKey: string) {
  return new Stripe(secretKey);
}

function sessionPaymentIsConfirmed(session: StripeCheckoutSession) {
  return (
    session.payment_status === "paid" ||
    (session.status === "complete" && Number(session.amount_total) === 0)
  );
}

function sessionPaymentIntentId(session: StripeCheckoutSession) {
  return typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id || null;
}

type CheckoutIntent = {
  stripe_session_id: string;
  user_id: string;
  customer_email: string;
  base_total_cents: number;
  discount_percent: number;
  discount_amount_cents: number;
  final_total_cents: number;
  promotion_campaign_id?: string | null;
  line_items: StoreOrderItem[];
};

async function checkoutIntentForSession(
  sessionId: string,
  fetchImpl: FetchLike,
  supabaseUrl: string,
  serviceRoleKey: string
) {
  const response = await fetchImpl(
    `${supabaseUrl}/rest/v1/store_checkout_intents?stripe_session_id=eq.${encodeURIComponent(sessionId)}&select=*`,
    { headers: serviceHeaders(serviceRoleKey) }
  );
  if (!response.ok) throw new Error("Unable to verify the secure checkout record.");
  const rows = await responseJson<CheckoutIntent[]>(response);
  return rows[0] || null;
}

async function orderForStripeSession(
  sessionId: string,
  fetchImpl: FetchLike,
  supabaseUrl: string,
  serviceRoleKey: string
) {
  const response = await fetchImpl(
    `${supabaseUrl}/rest/v1/store_orders?stripe_session_id=eq.${encodeURIComponent(sessionId)}&select=id,user_id,stripe_session_id,payment_status,base_total_cents,discount_percent,discount_amount_cents,final_total_cents,created_at,store_order_items(resource_id,title_snapshot,quantity,base_price_cents,final_price_cents)&limit=1`,
    { headers: serviceHeaders(serviceRoleKey) }
  );
  if (!response.ok) throw new Error("Unable to read the Store order.");
  const rows = await responseJson<StoreOrder[]>(response);
  return rows[0] || null;
}

async function fulfillStoreCheckoutSession(
  session: StripeCheckoutSession,
  options: { fetchImpl?: FetchLike } = {}
) {
  const fetchImpl = options.fetchImpl || fetch;
  const env = environment();
  const sessionId = String(session.id || "");
  if (!/^cs_(test_|live_)?[A-Za-z0-9_]+$/.test(sessionId))
    throw new Error("A valid checkout session is required.");
  if (!sessionPaymentIsConfirmed(session))
    throw new Error("Payment has not been confirmed for this checkout.");
  if (!env.serviceRoleKey)
    throw new Error("Secure order fulfillment is not configured.");

  const intent = await checkoutIntentForSession(
    sessionId,
    fetchImpl,
    env.supabaseUrl,
    env.serviceRoleKey
  );
  if (!intent) throw new Error("This checkout is not associated with a Store customer.");
  const sessionUserId = String(
    session.metadata?.user_id || session.client_reference_id || ""
  );
  if (!uuidPattern.test(sessionUserId) || sessionUserId !== intent.user_id)
    throw new Error("This checkout customer could not be verified.");
  if (Number(session.amount_total) !== Number(intent.final_total_cents))
    throw new Error("The paid checkout total could not be verified.");

  const existing = await orderForStripeSession(
    sessionId,
    fetchImpl,
    env.supabaseUrl,
    env.serviceRoleKey
  );
  const customerEmail = String(
    session.customer_details?.email || session.customer_email || intent.customer_email
  ).slice(0, 320);
  if (!customerEmail) throw new Error("The checkout customer email is unavailable.");
  let order = existing;
  if (!order) {
    const createOrder = await fetchImpl(`${env.supabaseUrl}/rest/v1/store_orders`, {
      method: "POST",
      headers: { ...serviceHeaders(env.serviceRoleKey), Prefer: "return=representation" },
      body: JSON.stringify({
        user_id: intent.user_id,
        stripe_session_id: sessionId,
        stripe_payment_intent_id: sessionPaymentIntentId(session),
        customer_email: customerEmail,
        payment_status: "paid",
        base_total_cents: intent.base_total_cents,
        discount_percent: intent.discount_percent,
        discount_amount_cents: intent.discount_amount_cents,
        final_total_cents: intent.final_total_cents,
        promotion_campaign_id: intent.promotion_campaign_id || null,
      }),
    });
    if (createOrder.ok) order = (await responseJson<StoreOrder[]>(createOrder))[0] || null;
    if (!order) {
      order = await orderForStripeSession(
        sessionId,
        fetchImpl,
        env.supabaseUrl,
        env.serviceRoleKey
      );
    }
    if (!order?.id) throw new Error("Unable to create the verified Store order.");
  }

  const itemsResponse = await fetchImpl(`${env.supabaseUrl}/rest/v1/store_order_items?on_conflict=order_id,resource_id`, {
    method: "POST",
    headers: {
      ...serviceHeaders(env.serviceRoleKey),
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(
      intent.line_items.map(item => ({ ...item, order_id: order.id }))
    ),
  });
  if (!itemsResponse.ok) throw new Error("Unable to create the verified Store order items.");

  if (uuidPattern.test(String(intent.promotion_campaign_id || ""))) {
    try {
      await storePromotionEvent(fetchImpl, env.supabaseUrl, env.serviceRoleKey, {
        campaign_id: String(intent.promotion_campaign_id),
        event_type: "purchase",
        dedupe_key: sessionId,
        user_id: intent.user_id,
      });
    } catch {
      // Reporting must never block a paid, verified order.
    }
  }
  return { ...order, store_order_items: intent.line_items } as StoreOrder;
}

export async function createStoreCheckout(
  authorization: string | undefined,
  body: Record<string, unknown>,
  options: { fetchImpl?: FetchLike; origin?: string } = {}
): Promise<Result> {
  const fetchImpl = options.fetchImpl || fetch;
  const env = environment();
  if (!env.serviceRoleKey || !env.stripeSecretKey)
    return {
      status: 503,
      body: {
        error:
          "Secure checkout needs the Supabase service role and Stripe secret environment variables.",
      },
    };
  try {
    const lines = normalizeCartLines(body);
    const resourceIds = Array.from(new Set(lines.map(line => line.resourceId)));
    const [resources, user] = await Promise.all([
      resourcesByIds(
        resourceIds,
        fetchImpl,
        env.supabaseUrl,
        env.serviceRoleKey
      ),
      authenticatedUser(
        authorization,
        fetchImpl,
        env.supabaseUrl,
        env.publishableKey
      ),
    ]);
    const settings = await checkoutMarketingSettings(
      fetchImpl,
      env.supabaseUrl,
      env.serviceRoleKey,
      user?.id
    );
    const resourceMap = new Map(
      resources.map(resource => [resource.id, resource])
    );
    if (
      resources.length !== resourceIds.length ||
      resources.some(resource => !resource.storage_path)
    )
      throw new Error(
        "One or more Store resources are not available for purchase."
      );
    if (!user?.id)
      return {
        status: 401,
        body: { error: "Please sign in before checking out so your purchases stay in your account." },
      };

    const siteUrl = safeSiteUrl(options.origin, env.siteUrl);
    const parameters = new URLSearchParams();
    parameters.set("mode", "payment");
    parameters.set(
      "success_url",
      `${siteUrl}/?payment=success&session_id={CHECKOUT_SESSION_ID}#store`
    );
    parameters.set("cancel_url", `${siteUrl}/?payment=cancelled#store`);
    parameters.set("allow_promotion_codes", "false");
    if (user?.email) parameters.set("customer_email", user.email);
    parameters.set("client_reference_id", user.id);
    parameters.set("metadata[user_id]", user.id);
    if (user.email)
      parameters.set("metadata[customer_email]", user.email.slice(0, 320));

    let baseTotal = 0;
    let finalTotal = 0;
    let promotionApplied = false;
    const verifiedItems: StoreOrderItem[] = [];
    lines.forEach((line, index) => {
      const resource = resourceMap.get(line.resourceId)!;
      const basePrice = Math.max(0, Number(resource.price_cents) || 0);
      const applies = promotionAppliesToLine(settings, resource, line);
      promotionApplied ||= applies;
      const finalPrice = applies
        ? discountedPriceCents(
            basePrice,
            Number(settings?.discount_percent) || 0
          )
        : basePrice;
      baseTotal += basePrice * line.quantity;
      finalTotal += finalPrice * line.quantity;
      verifiedItems.push({
        resource_id: resource.id,
        title_snapshot: resource.title.slice(0, 240),
        quantity: line.quantity,
        base_price_cents: basePrice,
        final_price_cents: finalPrice,
      });
      parameters.set(`line_items[${index}][quantity]`, String(line.quantity));
      parameters.set(`line_items[${index}][price_data][currency]`, "usd");
      parameters.set(
        `line_items[${index}][price_data][unit_amount]`,
        String(finalPrice)
      );
      parameters.set(
        `line_items[${index}][price_data][product_data][name]`,
        resource.title.slice(0, 120)
      );
      parameters.set(
        `line_items[${index}][price_data][product_data][metadata][resource_id]`,
        resource.id
      );
    });
    parameters.set("metadata[resource_ids]", resourceIds.join(","));
    parameters.set("metadata[base_total_cents]", String(baseTotal));
    parameters.set("metadata[final_total_cents]", String(finalTotal));
    if (settings?.discount_enabled && promotionApplied) {
      parameters.set(
        "metadata[discount_percent]",
        String(settings.discount_percent || 0)
      );
      parameters.set(
        "metadata[discount_scope]",
        String(settings.discount_scope || "")
      );
      if (settings.promotion_campaign_id)
        parameters.set(
          "metadata[promotion_campaign_id]",
          settings.promotion_campaign_id
        );
      if (settings.promotion_campaign_name)
        parameters.set(
          "metadata[promotion_campaign_name]",
          settings.promotion_campaign_name.slice(0, 120)
        );
    }

    const checkout = await stripeRequest<{ id?: string; url?: string }>(
      "/v1/checkout/sessions",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: parameters.toString(),
      },
      fetchImpl,
      env.stripeSecretKey
    );
    if (!checkout.url || !checkout.id)
      throw new Error("Stripe did not return a checkout link.");
    const checkoutIntent: CheckoutIntent = {
      stripe_session_id: checkout.id,
      user_id: user.id,
      customer_email: String(user.email || "").slice(0, 320),
      base_total_cents: baseTotal,
      discount_percent: promotionApplied
        ? Math.max(0, Math.min(100, Number(settings?.discount_percent) || 0))
        : 0,
      discount_amount_cents: Math.max(0, baseTotal - finalTotal),
      final_total_cents: finalTotal,
      promotion_campaign_id: promotionApplied
        ? settings?.promotion_campaign_id || null
        : null,
      line_items: verifiedItems,
    };
    return { status: 200, body: { url: checkout.url, checkoutIntent } };
  } catch (error) {
    return {
      status: 400,
      body: {
        error:
          error instanceof Error
            ? error.message
            : "Unable to begin secure checkout.",
      },
    };
  }
}

async function signedResourceUrl(
  storagePath: string,
  fetchImpl: FetchLike,
  supabaseUrl: string,
  serviceRoleKey: string,
  expiresIn = 900
) {
  const encodedPath = storagePath
    .split("/")
    .map(segment => encodeURIComponent(segment))
    .join("/");
  const response = await fetchImpl(
    `${supabaseUrl}/storage/v1/object/sign/resource-files/${encodedPath}`,
    {
      method: "POST",
      headers: serviceHeaders(serviceRoleKey),
      body: JSON.stringify({ expiresIn }),
    }
  );
  if (!response.ok) throw new Error("Unable to prepare a secure download.");
  const payload = await responseJson<{
    signedURL?: string;
    signedUrl?: string;
  }>(response);
  const signedPath = payload.signedURL || payload.signedUrl || "";
  if (!signedPath) throw new Error("Unable to prepare a secure download.");
  if (/^https?:/i.test(signedPath)) return signedPath;
  if (signedPath.startsWith("/storage/v1/"))
    return `${supabaseUrl}${signedPath}`;
  return `${supabaseUrl}/storage/v1${signedPath.startsWith("/") ? "" : "/"}${signedPath}`;
}

async function authenticatedStoreUser(
  authorization: string | undefined,
  fetchImpl: FetchLike,
  env = environment()
) {
  return authenticatedUser(
    authorization,
    fetchImpl,
    env.supabaseUrl,
    env.publishableKey
  );
}

async function orderDownloads(
  order: StoreOrder,
  fetchImpl: FetchLike,
  env = environment()
) {
  const itemIds = Array.from(
    new Set((order.store_order_items || []).map(item => item.resource_id))
  );
  const resources = await resourcesByIds(
    itemIds,
    fetchImpl,
    env.supabaseUrl,
    env.serviceRoleKey,
    false
  );
  const resourceMap = new Map(resources.map(resource => [resource.id, resource]));
  const downloads = await Promise.all(
    (order.store_order_items || []).map(async item => {
      const resource = resourceMap.get(item.resource_id);
      if (!resource?.storage_path) return null;
      return {
        resourceId: item.resource_id,
        title: item.title_snapshot,
        downloadUrl: await signedResourceUrl(
          resource.storage_path,
          fetchImpl,
          env.supabaseUrl,
          env.serviceRoleKey
        ),
        expiresIn: 900,
      };
    })
  );
  return downloads.filter(Boolean);
}

export async function getStoreDownloads(
  authorization: string | undefined,
  sessionId: string,
  options: { fetchImpl?: FetchLike } = {}
): Promise<Result> {
  const fetchImpl = options.fetchImpl || fetch;
  const env = environment();
  if (!env.serviceRoleKey || !env.stripeSecretKey)
    return { status: 503, body: { error: "Secure downloads are not configured." } };
  if (!/^cs_(test_|live_)?[A-Za-z0-9_]+$/.test(sessionId))
    return { status: 400, body: { error: "A valid checkout session is required." } };
  try {
    const user = await authenticatedStoreUser(authorization, fetchImpl, env);
    if (!user?.id)
      return { status: 401, body: { error: "Please sign in to access your Store downloads." } };
    const session = await stripeRequest<StripeCheckoutSession>(
      `/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
      { method: "GET" },
      fetchImpl,
      env.stripeSecretKey
    );
    const order = await fulfillStoreCheckoutSession({ ...session, id: sessionId }, { fetchImpl });
    if (order.user_id !== user.id)
      return { status: 403, body: { error: "This checkout belongs to a different customer account." } };
    const downloads = await orderDownloads(order, fetchImpl, env);
    if (!downloads.length) throw new Error("No downloadable resources were found.");
    return { status: 200, body: { order, downloads } };
  } catch (error) {
    return {
      status: 400,
      body: { error: error instanceof Error ? error.message : "Unable to retrieve secure downloads." },
    };
  }
}

async function ordersForUser(
  userId: string,
  fetchImpl: FetchLike,
  env = environment()
) {
  const response = await fetchImpl(
    `${env.supabaseUrl}/rest/v1/store_orders?user_id=eq.${encodeURIComponent(userId)}&select=id,user_id,stripe_session_id,payment_status,base_total_cents,discount_percent,discount_amount_cents,final_total_cents,created_at,store_order_items(resource_id,title_snapshot,quantity,base_price_cents,final_price_cents)&order=created_at.desc&limit=100`,
    { headers: serviceHeaders(env.serviceRoleKey) }
  );
  if (!response.ok) throw new Error("Unable to read your Store orders.");
  return responseJson<StoreOrder[]>(response);
}

export async function getCustomerStoreOrders(
  authorization: string | undefined,
  options: { fetchImpl?: FetchLike } = {}
): Promise<Result> {
  const fetchImpl = options.fetchImpl || fetch;
  const env = environment();
  if (!env.serviceRoleKey)
    return { status: 503, body: { error: "Store orders are not configured." } };
  try {
    const user = await authenticatedStoreUser(authorization, fetchImpl, env);
    if (!user?.id)
      return { status: 401, body: { error: "Please sign in to view your Store orders." } };
    const orders = await ordersForUser(user.id, fetchImpl, env);
    return { status: 200, body: { orders } };
  } catch (error) {
    return { status: 400, body: { error: error instanceof Error ? error.message : "Unable to read your Store orders." } };
  }
}

export async function getCustomerStoreDownload(
  authorization: string | undefined,
  resourceId: string,
  options: { fetchImpl?: FetchLike } = {}
): Promise<Result> {
  const fetchImpl = options.fetchImpl || fetch;
  const env = environment();
  if (!uuidPattern.test(resourceId))
    return { status: 400, body: { error: "A valid Store resource is required." } };
  try {
    const user = await authenticatedStoreUser(authorization, fetchImpl, env);
    if (!user?.id)
      return { status: 401, body: { error: "Please sign in to access your Store downloads." } };
    const orders = await ordersForUser(user.id, fetchImpl, env);
    const order = orders.find(candidate =>
      candidate.store_order_items?.some(item => item.resource_id === resourceId)
    );
    if (!order) return { status: 404, body: { error: "This resource is not in your Store purchases." } };
    const downloads = await orderDownloads(order, fetchImpl, env);
    const download = downloads.find(item => item && item.resourceId === resourceId);
    if (!download) return { status: 404, body: { error: "This purchased resource is no longer available for download." } };
    return { status: 200, body: { download } };
  } catch (error) {
    return { status: 400, body: { error: error instanceof Error ? error.message : "Unable to prepare your secure download." } };
  }
}

export async function handleStripeWebhook(
  rawBody: Buffer,
  signature: string | undefined,
  options: { fetchImpl?: FetchLike } = {}
): Promise<Result> {
  const env = environment();
  if (!env.stripeWebhookSecret || !env.stripeSecretKey)
    return { status: 503, body: { error: "Stripe webhook verification is not configured." } };
  try {
    const event = stripeClient(env.stripeSecretKey).webhooks.constructEvent(
      rawBody,
      signature || "",
      env.stripeWebhookSecret
    );
    if (event.id.startsWith("evt_test_")) return { status: 200, body: { verified: true } };
    if (!["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type))
      return { status: 200, body: { received: true, fulfilled: false } };
    const session = event.data.object as Stripe.Checkout.Session;
    if (!sessionPaymentIsConfirmed(session))
      return { status: 200, body: { received: true, fulfilled: false } };
    const order = await fulfillStoreCheckoutSession(session, options);
    return { status: 200, body: { received: true, fulfilled: true, orderId: order.id } };
  } catch (error) {
    return { status: 400, body: { error: error instanceof Error ? error.message : "Stripe webhook verification failed." } };
  }
}

export async function claimFreePacket(
  authorization: string | undefined,
  body: Record<string, unknown> = {},
  options: { fetchImpl?: FetchLike } = {}
): Promise<Result> {
  const fetchImpl = options.fetchImpl || fetch;
  const env = environment();
  if (!env.serviceRoleKey)
    return {
      status: 503,
      body: { error: "The free packet service is not configured." },
    };
  try {
    const user = await authenticatedUser(
      authorization,
      fetchImpl,
      env.supabaseUrl,
      env.publishableKey
    );
    if (!user?.id)
      return {
        status: 401,
        body: { error: "Please sign in to get your free packet." },
      };
    const settings = await marketingSettings(
      fetchImpl,
      env.supabaseUrl,
      env.serviceRoleKey
    );
    const resourceId = settings?.free_packet_resource_id || "";
    if (!settings?.free_packet_enabled || !uuidPattern.test(resourceId))
      return {
        status: 404,
        body: { error: "A free packet is not active right now." },
      };
    const resources = await resourcesByIds(
      [resourceId],
      fetchImpl,
      env.supabaseUrl,
      env.serviceRoleKey
    );
    const resource = resources[0];
    if (!resource?.storage_path)
      return {
        status: 404,
        body: { error: "The selected free packet is not ready yet." },
      };

    const claimResponse = await fetchImpl(
      `${env.supabaseUrl}/rest/v1/store_free_packet_claims?on_conflict=user_id,resource_id`,
      {
        method: "POST",
        headers: {
          ...serviceHeaders(env.serviceRoleKey),
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify({
          user_id: user.id,
          resource_id: resource.id,
          email_snapshot: String(user.email || "").slice(0, 320) || null,
          full_name_snapshot:
            String(user.user_metadata?.full_name || "").slice(0, 180) || null,
          marketing_consent: body.marketingConsent === true,
          claimed_at: new Date().toISOString(),
        }),
      }
    );
    if (!claimResponse.ok)
      throw new Error("Unable to record the free packet signup.");
    const downloadUrl = await signedResourceUrl(
      resource.storage_path,
      fetchImpl,
      env.supabaseUrl,
      env.serviceRoleKey,
      900
    );
    return {
      status: 200,
      body: { title: resource.title, downloadUrl, expiresIn: 900 },
    };
  } catch (error) {
    return {
      status: 400,
      body: {
        error:
          error instanceof Error
            ? error.message
            : "Unable to prepare the free packet.",
      },
    };
  }
}
