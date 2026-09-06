import { describe, expect, it } from "vitest";
import {
  buildContactMessages,
  createGoogleOAuthState,
  isValidGoogleOAuthState,
  validateContactPayload,
} from "./google-workspace";

describe("Google Workspace contact integration", () => {
  it("accepts a fresh signed OAuth state and rejects a tampered one", () => {
    const now = Date.now();
    const state = createGoogleOAuthState(now);
    expect(isValidGoogleOAuthState(state, now + 1_000)).toBe(true);
    expect(isValidGoogleOAuthState(`${state}x`, now + 1_000)).toBe(false);
    expect(isValidGoogleOAuthState(state, now + 11 * 60 * 1000)).toBe(false);
  });

  it("builds an owner notification and submitter confirmation", () => {
    const messages = buildContactMessages({
      name: "Avery Chamblin",
      email: "visitor@example.com",
      topic: "Coaching inquiries",
      message: "I would like to learn more.",
    });
    expect(messages.owner.to).toBe("avery@chapter21.org");
    expect(messages.owner.replyTo).toBe("visitor@example.com");
    expect(messages.owner.body).toContain("I would like to learn more.");
    expect(messages.confirmation.to).toBe("visitor@example.com");
    expect(messages.confirmation.subject).toBe("Welcome to Chapter 21 — We received your message");
    expect(messages.confirmation.body).toContain("Avery will be in contact within 24–48 hours.");
    expect(messages.confirmation.body).toContain("Chapter 21");
    expect(messages.confirmation.htmlBody).toContain("cid:chapter21-logo");
    expect(messages.confirmation.inlineImageBase64).toMatch(/^iVBORw0KGgo/);
  });

  it("normalizes a valid contact submission and rejects missing content", () => {
    expect(
      validateContactPayload({
        name: " Avery Chamblin ",
        email: "visitor@example.com",
        topic: "Coaching inquiries",
        message: "I would like to learn more.",
      }),
    ).toEqual({
      name: "Avery Chamblin",
      email: "visitor@example.com",
      topic: "Coaching inquiries",
      message: "I would like to learn more.",
    });
    expect(() => validateContactPayload({ name: "", email: "bad", message: "" })).toThrow();
  });
});
