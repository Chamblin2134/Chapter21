import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import {
  AI_METADATA_ENDPOINT,
  AI_TITLE_ENDPOINT,
  suggestSecureIntakeMetadata,
  suggestSecureIntakeTitle,
} from "./secure-intake-title";
import {
  CONTACT_EMAIL_ENDPOINT,
  GOOGLE_OAUTH_CALLBACK_ENDPOINT,
  GOOGLE_OAUTH_START_ENDPOINT,
  exchangeGoogleCode,
  googleOAuthStartUrl,
  isValidGoogleOAuthState,
  oauthCompletionHtml,
  sendContactEmail,
} from "./google-workspace";
import {
  CART_CHECKOUT_ENDPOINT,
  claimFreePacket,
  createStoreCheckout,
  DOWNLOADS_ENDPOINT,
  FREE_PACKET_ENDPOINT,
  getCustomerStoreDownload,
  getCustomerStoreOrders,
  getStoreDownloads,
  handleStripeWebhook,
  PROMOTION_EVENT_ENDPOINT,
  recordPromotionEvent,
  SINGLE_CHECKOUT_ENDPOINT,
  STORE_DOWNLOAD_ENDPOINT,
  STORE_ORDERS_ENDPOINT,
  STRIPE_WEBHOOK_ENDPOINT,
} from "./store-commerce";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.post(STRIPE_WEBHOOK_ENDPOINT, express.raw({ type: "application/json" }), async (req, res) => {
    const result = await handleStripeWebhook(
      Buffer.isBuffer(req.body) ? req.body : Buffer.from(""),
      req.header("stripe-signature") || undefined
    );
    res.status(result.status).json(result.body);
  });
  app.use(express.json({ limit: "64kb" }));
  app.post(AI_TITLE_ENDPOINT, async (req, res) => {
    const result = await suggestSecureIntakeTitle(
      req.header("authorization"),
      req.body || {}
    );
    res.status(result.status).json(result.body);
  });
  app.post(AI_METADATA_ENDPOINT, async (req, res) => {
    const result = await suggestSecureIntakeMetadata(
      req.header("authorization"),
      req.body || {}
    );
    res.status(result.status).json(result.body);
  });
  app.get(GOOGLE_OAUTH_START_ENDPOINT, (_req, res) => {
    try {
      res.redirect(googleOAuthStartUrl());
    } catch (error) {
      res.status(503).json({
        error: error instanceof Error ? error.message : "Google OAuth is not configured.",
      });
    }
  });
  app.get(GOOGLE_OAUTH_CALLBACK_ENDPOINT, async (req, res) => {
    const code = typeof req.query.code === "string" ? req.query.code : "";
    const state = typeof req.query.state === "string" ? req.query.state : "";
    const providerError = typeof req.query.error === "string" ? req.query.error : "";
    if (providerError) return res.status(400).send(`Google authorization was not completed: ${providerError}.`);
    if (!code || !isValidGoogleOAuthState(state)) return res.status(400).send("Google authorization could not be verified. Please restart the connection.");
    try {
      const refreshToken = await exchangeGoogleCode(code);
      res.type("html").send(oauthCompletionHtml(refreshToken));
    } catch (error) {
      res.status(502).send(error instanceof Error ? error.message : "Google authorization failed.");
    }
  });
  app.post(CONTACT_EMAIL_ENDPOINT, async (req, res) => {
    try {
      const result = await sendContactEmail(req.body || {});
      res.status(200).json({ ok: true, messageId: result.id });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to send the contact message.";
      const status = message.startsWith("Please enter") ? 400 : 503;
      res.status(status).json({ error: status === 400 ? message : "Email delivery is not available yet. Please try again shortly." });
    }
  });
  app.post(CART_CHECKOUT_ENDPOINT, async (req, res) => {
    const result = await createStoreCheckout(
      req.header("authorization"),
      req.body || {},
      { origin: req.header("origin") || undefined }
    );
    res.status(result.status).json(result.body);
  });
  app.post(SINGLE_CHECKOUT_ENDPOINT, async (req, res) => {
    const resourceId = req.body?.resourceId;
    const result = await createStoreCheckout(
      req.header("authorization"),
      { cartLines: [{ resourceId, quantity: 1 }] },
      { origin: req.header("origin") || undefined }
    );
    res.status(result.status).json(result.body);
  });
  app.get(DOWNLOADS_ENDPOINT, async (req, res) => {
    const result = await getStoreDownloads(
      req.header("authorization"),
      String(req.query.session_id || "")
    );
    res.status(result.status).json(result.body);
  });
  app.get(STORE_ORDERS_ENDPOINT, async (req, res) => {
    const result = await getCustomerStoreOrders(req.header("authorization"));
    res.status(result.status).json(result.body);
  });
  app.get(STORE_DOWNLOAD_ENDPOINT, async (req, res) => {
    const result = await getCustomerStoreDownload(
      req.header("authorization"),
      String(req.query.resource_id || "")
    );
    res.status(result.status).json(result.body);
  });
  app.post(FREE_PACKET_ENDPOINT, async (req, res) => {
    const result = await claimFreePacket(
      req.header("authorization"),
      req.body || {}
    );
    res.status(result.status).json(result.body);
  });
  app.post(PROMOTION_EVENT_ENDPOINT, async (req, res) => {
    const result = await recordPromotionEvent(
      req.header("authorization"),
      req.body || {}
    );
    res.status(result.status).json(result.body);
  });

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
