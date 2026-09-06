import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("desktop-layout phone presentation", () => {
  it("keeps the canonical Avery page at its desktop layout width while allowing visitors to zoom", () => {
    const source = readFileSync(resolve(process.cwd(), "client/public/avery-source.html"), "utf8");
    const shell = readFileSync(resolve(process.cwd(), "client/index.html"), "utf8");

    expect(source).toContain('content="width=1280, user-scalable=yes"');
    expect(source).toContain('Keep the established desktop composition on phones');
    expect(source).toContain('/* MOBILE MEDIA QUERY REMOVED: @media(max-width:780px)');
    expect(shell).toContain('content="width=1280, user-scalable=yes"');
    expect(shell).not.toContain('maximum-scale=1');
  });
});
