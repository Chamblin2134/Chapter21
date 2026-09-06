import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("../public/avery-source.html", import.meta.url),
  "utf8"
);
const shell = readFileSync(new URL("./pages/Home.tsx", import.meta.url), "utf8");

describe("Store payment integration", () => {
  it("forwards Stripe return parameters from the outer page into the embedded Store", () => {
    expect(shell).toContain('["payment", "session_id"]');
    expect(shell).toContain("sourceParams.set(key, value)");
    expect(source).toContain("new URLSearchParams(window.location.search)");
    expect(source).toContain("/api/stripe/downloads?session_id=");
  });

  it("requires a signed-in Supabase session for the visible cart checkout request", () => {
    expect(source).toContain("Please sign in to continue.");
    expect(source).toContain("supabaseClient.auth.getSession()");
    expect(source).toContain("session?.user?.id");
    expect(source).toContain("Authorization:'Bearer '+session.access_token");
    expect(source).toContain("supabaseClient.from('store_checkout_intents').insert");
    expect(source).not.toContain("store_checkout_intents').upsert");
  });

  it("replaces the Store account placeholders with customer-specific orders and secure downloads", () => {
    expect(source).toContain("/api/store/orders");
    expect(source).toContain("/api/store/download?resource_id=");
    expect(source).toContain("data-avery-store-orders=\"downloads\"");
  });

  it("keeps the Orders loader on the public Store Manager session path and never leaves loading stuck", () => {
    expect(source).toContain("const panel=document.getElementById('accountPanel')");
    expect(source).toContain("window.AveryStoreManagerApi?.getSession?.()");
    expect(source).toContain("function storeEscape(value)");
    expect(source).toContain("data-avery-store-status");
    expect(source).toContain("const readStoreJson=async(response,fallback)");
    expect(source).toContain("The Store orders service returned an unexpected non-JSON response.");
    expect(source).toContain("result._invalidJson");
    expect(source).toContain("No completed Store purchases are connected to this account yet.");
    expect(source).toContain("target.innerHTML='<p>'+storeEscape(error instanceof Error?error.message:'Unable to load your Store purchases.')+'</p>'");
    expect(source).not.toContain("const panel=accountPanel()");
    expect(source).not.toContain("showAccountMessage(error instanceof Error?error.message:'Unable to prepare your secure download.',true)");
    expect(source).not.toContain("function storeAccountHeaders(){return activeSession");
  });

  it("refreshes the iframe cache after the Orders loader repair", () => {
    expect(shell).toContain('v: "20260906-store-orders-loader-v2"');
  });
});
