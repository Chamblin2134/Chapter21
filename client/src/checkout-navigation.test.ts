import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("../public/avery-source.html", import.meta.url),
  "utf8",
);

describe("embedded cart checkout navigation", () => {
  it("keeps the cart open while creating a session and redirects in the same tab", () => {
    expect(source).not.toContain("window.open('about:blank'");
    expect(source).not.toContain("window.open(\"about:blank\"");
    expect(source).not.toContain("checkoutWindow?.close()");
    expect(source).not.toContain("popup.close()");
    expect(source).toContain("Preparing secure checkout…");
    expect(source).toContain("console.debug('[Store Checkout] response'");
    expect(source).toContain("typeof data.url !== 'string'");
    expect(source).toContain("typeof data.url!=='string'");
    expect(source).toContain("window.top.location = data.url");
  });

  it("keeps the open cart above its gray backdrop", () => {
    expect(source).toContain(".avery-cart-backdrop{position:fixed;inset:0;z-index:9998");
    expect(source).toContain("body.avery-cart-lock .header{z-index:10000!important;}");
    expect(source).toContain("body.avery-cart-lock #v14CartPanel{z-index:10001!important;}");
  });
});
