import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import type { ServerResponse } from "node:http";
import path from "node:path";
import { defineConfig, type Plugin, type ViteDevServer } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";
import {
  AI_METADATA_ENDPOINT,
  AI_TITLE_ENDPOINT,
  suggestSecureIntakeMetadata,
  suggestSecureIntakeTitle,
} from "./server/secure-intake-title";
import {
  CART_CHECKOUT_ENDPOINT,
  claimFreePacket,
  createStoreCheckout,
  DOWNLOADS_ENDPOINT,
  FREE_PACKET_ENDPOINT,
  getStoreDownloads,
  PROMOTION_EVENT_ENDPOINT,
  recordPromotionEvent,
  SINGLE_CHECKOUT_ENDPOINT,
} from "./server/store-commerce";

// =============================================================================
// Manus Debug Collector - Vite Plugin
// Writes browser logs directly to files, trimmed when exceeding size limit
// =============================================================================

const PROJECT_ROOT = import.meta.dirname;
const LOG_DIR = path.join(PROJECT_ROOT, ".manus-logs");
const MAX_LOG_SIZE_BYTES = 1 * 1024 * 1024; // 1MB per log file
const TRIM_TARGET_BYTES = Math.floor(MAX_LOG_SIZE_BYTES * 0.6); // Trim to 60% to avoid constant re-trimming

type LogSource = "browserConsole" | "networkRequests" | "sessionReplay";

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function trimLogFile(logPath: string, maxSize: number) {
  try {
    if (!fs.existsSync(logPath) || fs.statSync(logPath).size <= maxSize) {
      return;
    }

    const lines = fs.readFileSync(logPath, "utf-8").split("\n");
    const keptLines: string[] = [];
    let keptBytes = 0;

    // Keep newest lines (from end) that fit within 60% of maxSize
    const targetSize = TRIM_TARGET_BYTES;
    for (let i = lines.length - 1; i >= 0; i--) {
      const lineBytes = Buffer.byteLength(`${lines[i]}\n`, "utf-8");
      if (keptBytes + lineBytes > targetSize) break;
      keptLines.unshift(lines[i]);
      keptBytes += lineBytes;
    }

    fs.writeFileSync(logPath, keptLines.join("\n"), "utf-8");
  } catch {
    /* ignore trim errors */
  }
}

function writeToLogFile(source: LogSource, entries: unknown[]) {
  if (entries.length === 0) return;

  ensureLogDir();
  const logPath = path.join(LOG_DIR, `${source}.log`);

  // Format entries with timestamps
  const lines = entries.map(entry => {
    const ts = new Date().toISOString();
    return `[${ts}] ${JSON.stringify(entry)}`;
  });

  // Append to log file
  fs.appendFileSync(logPath, `${lines.join("\n")}\n`, "utf-8");

  // Trim if exceeds max size
  trimLogFile(logPath, MAX_LOG_SIZE_BYTES);
}

/**
 * Vite plugin to collect browser debug logs
 * - POST /__manus__/logs: Browser sends logs, written directly to files
 * - Files: browserConsole.log, networkRequests.log, sessionReplay.log
 * - Auto-trimmed when exceeding 1MB (keeps newest entries)
 */
function vitePluginManusDebugCollector(): Plugin {
  return {
    name: "manus-debug-collector",

    transformIndexHtml(html) {
      if (process.env.NODE_ENV === "production") {
        return html;
      }
      return {
        html,
        tags: [
          {
            tag: "script",
            attrs: {
              src: "/__manus__/debug-collector.js",
              defer: true,
            },
            injectTo: "head",
          },
        ],
      };
    },

    configureServer(server: ViteDevServer) {
      // POST /__manus__/logs: Browser sends logs (written directly to files)
      server.middlewares.use("/__manus__/logs", (req, res, next) => {
        if (req.method !== "POST") {
          return next();
        }

        const handlePayload = (payload: any) => {
          // Write logs directly to files
          if (payload.consoleLogs?.length > 0) {
            writeToLogFile("browserConsole", payload.consoleLogs);
          }
          if (payload.networkRequests?.length > 0) {
            writeToLogFile("networkRequests", payload.networkRequests);
          }
          if (payload.sessionEvents?.length > 0) {
            writeToLogFile("sessionReplay", payload.sessionEvents);
          }

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        };

        const reqBody = (req as { body?: unknown }).body;
        if (reqBody && typeof reqBody === "object") {
          try {
            handlePayload(reqBody);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
          return;
        }

        let body = "";
        req.on("data", chunk => {
          body += chunk.toString();
        });

        req.on("end", () => {
          try {
            const payload = JSON.parse(body);
            handlePayload(payload);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
        });
      });
    },
  };
}

function vitePluginStorageProxy(): Plugin {
  return {
    name: "manus-storage-proxy",
    configureServer(server: ViteDevServer) {
      server.middlewares.use("/manus-storage", async (req, res) => {
        const key = req.url?.replace(/^\//, "");
        if (!key) {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end("Missing storage key");
          return;
        }

        const forgeBaseUrl = (process.env.BUILT_IN_FORGE_API_URL || "").replace(
          /\/+$/,
          ""
        );
        const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;

        if (!forgeBaseUrl || !forgeKey) {
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end("Storage proxy not configured");
          return;
        }

        try {
          const forgeUrl = new URL(
            "v1/storage/presign/get",
            forgeBaseUrl + "/"
          );
          forgeUrl.searchParams.set("path", key);

          const forgeResp = await fetch(forgeUrl, {
            headers: { Authorization: `Bearer ${forgeKey}` },
          });

          if (!forgeResp.ok) {
            res.writeHead(502, { "Content-Type": "text/plain" });
            res.end("Storage backend error");
            return;
          }

          const { url } = (await forgeResp.json()) as { url: string };
          if (!url) {
            res.writeHead(502, { "Content-Type": "text/plain" });
            res.end("Empty signed URL");
            return;
          }

          res.writeHead(307, { Location: url, "Cache-Control": "no-store" });
          res.end();
        } catch {
          res.writeHead(502, { "Content-Type": "text/plain" });
          res.end("Storage proxy error");
        }
      });
    },
  };
}

function vitePluginSecureIntakeAiMetadata(): Plugin {
  return {
    name: "secure-intake-ai-metadata",
    configureServer(server: ViteDevServer) {
      const register = (
        endpoint: string,
        handler:
          | typeof suggestSecureIntakeMetadata
          | typeof suggestSecureIntakeTitle
      ) => {
        server.middlewares.use(endpoint, (req, res, next) => {
          if (req.method !== "POST") return next();
          let rawBody = "";
          req.on("data", chunk => {
            rawBody += chunk.toString();
            if (rawBody.length > 64 * 1024) req.destroy();
          });
          req.on("end", async () => {
            try {
              const result = await handler(
                req.headers.authorization,
                rawBody ? JSON.parse(rawBody) : {}
              );
              res.writeHead(result.status, {
                "Content-Type": "application/json",
                "Cache-Control": "no-store",
              });
              res.end(JSON.stringify(result.body));
            } catch {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  error: "Invalid automatic PDF details request.",
                })
              );
            }
          });
        });
      };
      register(AI_METADATA_ENDPOINT, suggestSecureIntakeMetadata);
      register(AI_TITLE_ENDPOINT, suggestSecureIntakeTitle);
    },
  };
}

function vitePluginStoreCommerce(): Plugin {
  return {
    name: "store-commerce",
    configureServer(server: ViteDevServer) {
      const respond = (
        res: ServerResponse,
        result: { status: number; body: Record<string, unknown> }
      ) => {
        res.writeHead(result.status, {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        });
        res.end(JSON.stringify(result.body));
      };
      const readBody = (req: any) =>
        new Promise<Record<string, unknown>>((resolve, reject) => {
          let rawBody = "";
          req.on("data", (chunk: Buffer) => {
            rawBody += chunk.toString();
            if (rawBody.length > 64 * 1024)
              reject(new Error("Request too large"));
          });
          req.on("end", () => {
            try {
              resolve(rawBody ? JSON.parse(rawBody) : {});
            } catch (error) {
              reject(error);
            }
          });
        });

      server.middlewares.use(CART_CHECKOUT_ENDPOINT, async (req, res, next) => {
        if (req.method !== "POST") return next();
        try {
          respond(
            res,
            await createStoreCheckout(
              req.headers.authorization,
              await readBody(req),
              {
                origin: req.headers.origin,
              }
            )
          );
        } catch {
          respond(res, {
            status: 400,
            body: { error: "Invalid checkout request." },
          });
        }
      });
      server.middlewares.use(
        SINGLE_CHECKOUT_ENDPOINT,
        async (req, res, next) => {
          if (req.method !== "POST") return next();
          try {
            const body = await readBody(req);
            respond(
              res,
              await createStoreCheckout(
                req.headers.authorization,
                { cartLines: [{ resourceId: body.resourceId, quantity: 1 }] },
                { origin: req.headers.origin }
              )
            );
          } catch {
            respond(res, {
              status: 400,
              body: { error: "Invalid checkout request." },
            });
          }
        }
      );
      server.middlewares.use(FREE_PACKET_ENDPOINT, async (req, res, next) => {
        if (req.method !== "POST") return next();
        try {
          respond(
            res,
            await claimFreePacket(
              req.headers.authorization,
              await readBody(req)
            )
          );
        } catch {
          respond(res, {
            status: 400,
            body: { error: "Invalid free-packet request." },
          });
        }
      });
      server.middlewares.use(
        PROMOTION_EVENT_ENDPOINT,
        async (req, res, next) => {
          if (req.method !== "POST") return next();
          try {
            respond(
              res,
              await recordPromotionEvent(
                req.headers.authorization,
                await readBody(req)
              )
            );
          } catch {
            respond(res, {
              status: 400,
              body: { error: "Invalid promotion event." },
            });
          }
        }
      );
      server.middlewares.use(DOWNLOADS_ENDPOINT, async (req, res, next) => {
        if (req.method !== "GET") return next();
        const requestUrl = new URL(req.url || "", "http://localhost");
        respond(
          res,
          await getStoreDownloads(
            requestUrl.searchParams.get("session_id") || ""
          )
        );
      });
    },
  };
}

const plugins = [
  react(),
  tailwindcss(),
  jsxLocPlugin(),
  vitePluginManusRuntime(),
  vitePluginManusDebugCollector(),
  vitePluginStorageProxy(),
  vitePluginSecureIntakeAiMetadata(),
  vitePluginStoreCommerce(),
];

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    strictPort: false, // Will find next available port if 3000 is busy
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
