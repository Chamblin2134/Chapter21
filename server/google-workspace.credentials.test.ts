import { describe, expect, it } from "vitest";

describe("Google Workspace OAuth configuration", () => {
  it("exchanges the securely stored refresh token at Google's token endpoint", async () => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
    expect(clientId).toBeTruthy();
    expect(clientSecret).toBeTruthy();
    expect(refreshToken).toBeTruthy();

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        refresh_token: refreshToken!,
        grant_type: "refresh_token",
      }),
    });
    const body = (await response.json()) as { access_token?: string; error?: string };
    expect(response.ok).toBe(true);
    expect(body.error).toBeUndefined();
    expect(body.access_token).toBeTruthy();
  });

  it("recognizes the configured web client at Google's token endpoint", async () => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    expect(clientId).toBeTruthy();
    expect(clientSecret).toBeTruthy();
    expect(redirectUri).toBe("https://chapter21.org/api/google/oauth/callback");

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        code: "credential-validation-only",
        redirect_uri: redirectUri!,
        grant_type: "authorization_code",
      }),
    });
    const body = (await response.json()) as { error?: string };

    // An invalid authorization code is expected here. A bad client credential
    // would instead produce invalid_client, which must fail this check.
    expect(body.error).not.toBe("invalid_client");
  });
});
