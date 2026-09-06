import { createHmac, timingSafeEqual } from "node:crypto";

export const GOOGLE_OAUTH_START_ENDPOINT = "/api/google/oauth/start";
export const GOOGLE_OAUTH_CALLBACK_ENDPOINT = "/api/google/oauth/callback";
export const CONTACT_EMAIL_ENDPOINT = "/api/contact";
export const GOOGLE_REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI ||
  "https://chapter21.org/api/google/oauth/callback";
export const GOOGLE_MAILBOX = "avery@chapter21.org";
const GOOGLE_SCOPE = "https://www.googleapis.com/auth/gmail.send";
const CHAPTER21_LOGO_CID = "chapter21-logo";
const CHAPTER21_LOGO_PNG_BASE64 = "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";
const STATE_MAX_AGE_MS = 10 * 60 * 1000;

function base64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function stateSecret() {
  return process.env.JWT_SECRET || process.env.GOOGLE_CLIENT_SECRET || "";
}

function signState(payload: string) {
  return createHmac("sha256", stateSecret()).update(payload).digest("base64url");
}

export function createGoogleOAuthState(now = Date.now()) {
  const payload = base64Url(JSON.stringify({ issuedAt: now }));
  return `${payload}.${signState(payload)}`;
}

export function isValidGoogleOAuthState(state: string, now = Date.now()) {
  const [payload, signature] = String(state || "").split(".");
  if (!payload || !signature || !stateSecret()) return false;
  const expected = signState(payload);
  if (signature.length !== expected.length) return false;
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      issuedAt?: number;
    };
    return (
      typeof decoded.issuedAt === "number" &&
      Math.abs(now - decoded.issuedAt) <= STATE_MAX_AGE_MS
    );
  } catch {
    return false;
  }
}

export function googleOAuthStartUrl() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("Google OAuth client ID is not configured.");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_SCOPE,
    state: createGoogleOAuthState(),
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function validateContactPayload(payload: unknown) {
  const source = (payload && typeof payload === "object" ? payload : {}) as Record<
    string,
    unknown
  >;
  const name = String(source.name || "").trim();
  const email = String(source.email || "").trim();
  const topic = String(source.topic || "General inquiry").trim();
  const message = String(source.message || "").trim();
  if (!name || name.length > 120) throw new Error("Please enter your name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new Error("Please enter a valid email address.");
  }
  if (!message || message.length > 10000) throw new Error("Please enter your message.");
  return { name, email, topic: topic.slice(0, 160), message };
}

function cleanHeaderValue(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function escapeHtml(value: string) {
  return value.replace(/[&<>\"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '\"': "&quot;",
    "'": "&#39;",
  })[character] || character);
}

function encodeMimeMessage(fields: {
  to: string;
  subject: string;
  body: string;
  replyTo?: string;
  htmlBody?: string;
  inlineImageBase64?: string;
}) {
  const commonHeaders = [
    `To: ${cleanHeaderValue(fields.to)}`,
    `From: ${GOOGLE_MAILBOX}`,
    ...(fields.replyTo ? [`Reply-To: ${cleanHeaderValue(fields.replyTo)}`] : []),
    `Subject: ${cleanHeaderValue(fields.subject)}`,
    "MIME-Version: 1.0",
  ];
  const mime = fields.htmlBody && fields.inlineImageBase64
    ? (() => {
        const boundary = `chapter21-${Date.now().toString(36)}`;
        return [
          ...commonHeaders,
          `Content-Type: multipart/related; boundary=\"${boundary}\"`,
          "",
          `--${boundary}`,
          "Content-Type: text/plain; charset=UTF-8",
          "",
          fields.body,
          `--${boundary}`,
          "Content-Type: text/html; charset=UTF-8",
          "",
          fields.htmlBody,
          `--${boundary}`,
          `Content-Type: image/png; name=\"chapter-21-logo.png\"`,
          "Content-Transfer-Encoding: base64",
          `Content-ID: <${CHAPTER21_LOGO_CID}>`,
          "Content-Disposition: inline; filename=\"chapter-21-logo.png\"",
          "",
          fields.inlineImageBase64,
          `--${boundary}--`,
        ].join("\r\n");
      })()
    : [
        ...commonHeaders,
        "Content-Type: text/plain; charset=UTF-8",
        "",
        fields.body,
      ].join("\r\n");
  return base64Url(mime);
}

export function buildContactMessages(fields: ReturnType<typeof validateContactPayload>) {
  return {
    owner: {
      to: GOOGLE_MAILBOX,
      replyTo: fields.email,
      subject: `Avery Institute contact form: ${fields.topic}`,
      body: [
        `Name: ${fields.name}`,
        `Email: ${fields.email}`,
        `Topic: ${fields.topic}`,
        "",
        fields.message,
      ].join("\n"),
    },
    confirmation: {
      to: fields.email,
      subject: "Welcome to Chapter 21 — We received your message",
      body: [
        `Hello ${fields.name},`,
        "",
        "We received your email and wanted to confirm that it arrived safely.",
        "Avery will be in contact within 24–48 hours.",
        "",
        "Thank you,",
        "Chapter 21",
      ].join("\n"),
      htmlBody: [
        '<!doctype html><html><body style="margin:0;background:#f4eee4;color:#111313;font-family:Arial,Helvetica,sans-serif;line-height:1.6">',
        '<div style="max-width:640px;margin:0 auto;padding:28px 24px">',
        `<img src="cid:${CHAPTER21_LOGO_CID}" alt="Chapter 21" width="420" style="display:block;max-width:100%;height:auto;margin:0 0 28px">`,
        `<p style="font-size:16px">Hello ${escapeHtml(fields.name)},</p>`,
        '<p style="font-size:16px">We received your email and wanted to confirm that it arrived safely.</p>',
        '<p style="font-size:16px">Avery will be in contact within <strong>24–48 hours</strong>.</p>',
        '<p style="font-size:16px;margin-bottom:0">Thank you,<br><strong>Chapter 21</strong></p>',
        '</div></body></html>',
      ].join(""),
      inlineImageBase64: CHAPTER21_LOGO_PNG_BASE64,
    },
  };
}

async function refreshGoogleAccessToken() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Google Workspace email authorization is not completed yet.");
  }
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const body = (await response.json().catch(() => ({}))) as {
    access_token?: string;
    error_description?: string;
  };
  if (!response.ok || !body.access_token) {
    throw new Error(body.error_description || "Google Workspace authorization failed.");
  }
  return body.access_token;
}

async function sendGmailMessage(accessToken: string, message: { to: string; subject: string; body: string; replyTo?: string }) {
  const response = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ raw: encodeMimeMessage(message) }),
    },
  );
  const body = (await response.json().catch(() => ({}))) as {
    id?: string;
    error?: { message?: string };
  };
  if (!response.ok || !body.id) {
    throw new Error(body.error?.message || "Google Workspace could not send the message.");
  }
  return body.id;
}

export async function sendContactEmail(payload: unknown) {
  const fields = validateContactPayload(payload);
  const accessToken = await refreshGoogleAccessToken();
  const messages = buildContactMessages(fields);
  const ownerMessageId = await sendGmailMessage(accessToken, messages.owner);
  const confirmationMessageId = await sendGmailMessage(accessToken, messages.confirmation);
  return { id: ownerMessageId, confirmationId: confirmationMessageId };
}

export async function exchangeGoogleCode(code: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google OAuth client is not configured.");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });
  const body = (await response.json().catch(() => ({}))) as {
    refresh_token?: string;
    error_description?: string;
  };
  if (!response.ok || !body.refresh_token) {
    throw new Error(body.error_description || "Google did not return a refresh token.");
  }
  return body.refresh_token;
}

export function oauthCompletionHtml(refreshToken: string) {
  const escaped = refreshToken.replace(/[&<>"']/g, (character) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
      character
    ] || character,
  );
  return `<!doctype html><html><head><meta charset="utf-8"><title>Google Workspace Connected</title></head><body style="font-family:system-ui;max-width:720px;margin:48px auto;padding:0 20px"><h1>Google Workspace authorization complete</h1><p>Copy the refresh token below into the secure project secret named <strong>GOOGLE_REFRESH_TOKEN</strong>. Do not post it in chat or publish it in code.</p><pre style="white-space:pre-wrap;word-break:break-all;background:#f4f4f4;padding:16px">${escaped}</pre><p>You may close this window after saving the secret.</p></body></html>`;
}
