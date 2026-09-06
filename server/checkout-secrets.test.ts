import { describe, expect, it } from "vitest";

describe("checkout production secret configuration", () => {
  it("accepts the configured Supabase service-role key on a lightweight resources request", async () => {
    const supabaseUrl =
      process.env.SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      process.env.SUPABASE_PROJECT_URL ||
      "";
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

    expect(supabaseUrl).toMatch(/^https:\/\//);
    expect(serviceRoleKey.length).toBeGreaterThan(20);

    const response = await fetch(
      `${supabaseUrl.replace(/\/$/, "")}/rest/v1/resources?select=id&limit=1`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      },
    );

    expect(response.status).toBeGreaterThanOrEqual(200);
    expect(response.status).toBeLessThan(300);
  });

  it("serves the configured canonical SITE_URL", async () => {
    const siteUrl = process.env.SITE_URL || "";

    expect(siteUrl).toBe("https://chapter21.org");

    const response = await fetch(siteUrl, { redirect: "manual" });

    expect(response.status).toBeGreaterThanOrEqual(200);
    expect(response.status).toBeLessThan(400);
  });
});
