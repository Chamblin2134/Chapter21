import { spawn } from "node:child_process";
import Stripe from "stripe";

const port = "3113";
const key = process.env.STRIPE_SECRET_KEY;
const secret = process.env.STRIPE_WEBHOOK_SECRET;
if (!key || !secret) throw new Error("Stripe webhook environment is not configured.");

const payload = JSON.stringify({
  id: "evt_test_store_webhook_verification",
  type: "checkout.session.completed",
  data: { object: { id: "cs_test_webhook_verification" } },
});
const signature = new Stripe(key).webhooks.generateTestHeaderString({ payload, secret });
const server = spawn(process.execPath, ["dist/index.js"], {
  env: { ...process.env, PORT: port, NODE_ENV: "production" },
  stdio: ["ignore", "pipe", "pipe"],
});

const stop = () => server.kill("SIGTERM");
const timeout = setTimeout(() => {
  stop();
  throw new Error("Timed out waiting for the local server.");
}, 15000);

try {
  await new Promise((resolve, reject) => {
    let output = "";
    server.stdout.on("data", chunk => {
      output += chunk;
      if (output.includes("Server running on")) resolve();
    });
    server.once("error", reject);
    server.once("exit", code => reject(new Error(`Local server exited before webhook test (${code}).`)));
  });
  const response = await fetch(`http://127.0.0.1:${port}/api/stripe/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Stripe-Signature": signature },
    body: payload,
  });
  const result = await response.json();
  if (response.status !== 200 || result.verified !== true)
    throw new Error("Signed Stripe webhook verification did not return the expected response.");
  console.log("Stripe webhook raw-body signature verification passed.");
} finally {
  clearTimeout(timeout);
  stop();
}
