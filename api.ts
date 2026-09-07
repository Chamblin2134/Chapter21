import {
  suggestSecureIntakeMetadata,
  suggestSecureIntakeTitle,
} from "../../server/secure-intake-title";
import {
  exchangeGoogleCode,
  googleOAuthStartUrl,
  isValidGoogleOAuthState,
  oauthCompletionHtml,
  sendContactEmail,
} from "../../server/google-workspace";
import {
  claimFreePacket,
  createStoreCheckout,
  getCustomerStoreDownload,
  getCustomerStoreOrders,
  getStoreDownloads,
  handleStripeWebhook,
  recordPromotionEvent,
} from "../../server/store-commerce";

function json(statusCode: number, body: unknown) {
  return { statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
}

function requestPath(event: any) {
  const raw = event.rawUrl || event.rawPath || event.path || "";
  try { return new URL(raw, "https://chapter21.local").pathname; } catch { return event.path || ""; }
}

function rawBody(event: any) {
  const body = event.body || "";
  return Buffer.from(body, event.isBase64Encoded ? "base64" : "utf8");
}

function bodyJson(event: any) {
  if (!event.body) return {};
  try { return JSON.parse(rawBody(event).toString("utf8")); } catch { return {}; }
}

function header(event: any, name: string) {
  const headers = event.headers || {};
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? headers[key] : undefined;
}

export const handler = async (event: any) => {
  const path = requestPath(event);
  const method = String(event.httpMethod || event.requestContext?.http?.method || "GET").toUpperCase();
  const auth = header(event, "authorization");
  const origin = header(event, "origin");
  const q = event.queryStringParameters || {};

  try {
    if (path === "/api/stripe/webhook" && method === "POST") {
      const result = await handleStripeWebhook(rawBody(event), header(event, "stripe-signature"));
      return json(result.status, result.body);
    }
    if (path === "/api/secure-intake/ai-title" && method === "POST") {
      const result = await suggestSecureIntakeTitle(auth, bodyJson(event));
      return json(result.status, result.body);
    }
    if (path === "/api/secure-intake/ai-metadata" && method === "POST") {
      const result = await suggestSecureIntakeMetadata(auth, bodyJson(event));
      return json(result.status, result.body);
    }
    if (path === "/api/google/oauth/start" && method === "GET") {
      return { statusCode: 302, headers: { location: googleOAuthStartUrl() }, body: "" };
    }
    if (path === "/api/google/oauth/callback" && method === "GET") {
      const code = String(q.code || "");
      const state = String(q.state || "");
      const providerError = String(q.error || "");
      if (providerError) return { statusCode: 400, body: `Google authorization was not completed: ${providerError}.` };
      if (!code || !isValidGoogleOAuthState(state)) return { statusCode: 400, body: "Google authorization could not be verified. Please restart the connection." };
      try {
        const refreshToken = await exchangeGoogleCode(code);
        return { statusCode: 200, headers: { "content-type": "text/html; charset=utf-8" }, body: oauthCompletionHtml(refreshToken) };
      } catch (error) {
        return { statusCode: 502, body: error instanceof Error ? error.message : "Google authorization failed." };
      }
    }
    if (path === "/api/contact" && method === "POST") {
      try {
        const result = await sendContactEmail(bodyJson(event));
        return json(200, { ok: true, messageId: result.id });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to send the contact message.";
        const status = message.startsWith("Please enter") ? 400 : 503;
        return json(status, { error: status === 400 ? message : "Email delivery is not available yet. Please try again shortly." });
      }
    }
    if (path === "/api/stripe/cart-checkout" && method === "POST") {
      const result = await createStoreCheckout(auth, bodyJson(event), { origin });
      return json(result.status, result.body);
    }
    if (path === "/api/stripe/checkout" && method === "POST") {
      const resourceId = bodyJson(event)?.resourceId;
      const result = await createStoreCheckout(auth, { cartLines: [{ resourceId, quantity: 1 }] }, { origin });
      return json(result.status, result.body);
    }
    if (path === "/api/stripe/downloads" && method === "GET") {
      const result = await getStoreDownloads(auth, String(q.session_id || ""));
      return json(result.status, result.body);
    }
    if (path === "/api/store/orders" && method === "GET") {
      const result = await getCustomerStoreOrders(auth);
      return json(result.status, result.body);
    }
    if (path === "/api/store/download" && method === "GET") {
      const result = await getCustomerStoreDownload(auth, String(q.resource_id || ""));
      return json(result.status, result.body);
    }
    if (path === "/api/free-packet/claim" && method === "POST") {
      const result = await claimFreePacket(auth, bodyJson(event));
      return json(result.status, result.body);
    }
    if (path === "/api/promotions/event" && method === "POST") {
      const result = await recordPromotionEvent(auth, bodyJson(event));
      return json(result.status, result.body);
    }
    return json(404, { error: "API route not found." });
  } catch (error) {
    console.error(error);
    return json(500, { error: "Server error." });
  }
};
