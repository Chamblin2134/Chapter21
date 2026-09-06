import { describe, expect, it, vi } from "vitest";
import { suggestSecureIntakeMetadata } from "./secure-intake-title";

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

function fetchSequence(...responses: Response[]) {
  const fetchImpl = vi.fn();
  responses.forEach(response => fetchImpl.mockResolvedValueOnce(response));
  return fetchImpl as unknown as typeof fetch;
}

describe("secure automatic PDF metadata", () => {
  it("requires an administrator and returns sanitized Store details without receiving file bytes", async () => {
    const fetchImpl = fetchSequence(
      reply({ id: "admin-title-test" }),
      reply([{ role: "admin" }]),
      reply({ data: [{ id: "gpt-5-mini" }] }),
      reply({
        choices: [
          {
            message: {
              content: JSON.stringify({
                title: "Grounding Skills Practice Worksheet",
                description:
                  "This focused worksheet teaches practical grounding methods for stressful moments. Readers identify personal warning signs and build a realistic plan for using grounding skills in recovery.",
                category: "Coping & Emotional Regulation",
                resourceType: "Worksheet",
                keywords: [
                  "grounding",
                  "coping skills",
                  "emotional regulation",
                ],
              }),
            },
          },
        ],
      })
    );
    const result = await suggestSecureIntakeMetadata(
      "Bearer signed-session",
      {
        fileName: "grounding-v4.pdf",
        extractedText:
          "A client worksheet with grounding practice and coping skills.",
      },
      { fetchImpl, now: 1_000 }
    );

    expect(result).toEqual({
      status: 200,
      body: {
        title: "Grounding Skills Practice Worksheet",
        description:
          "This focused worksheet teaches practical grounding methods for stressful moments. Readers identify personal warning signs and build a realistic plan for using grounding skills in recovery.",
        category: "Coping & Emotional Regulation",
        resourceType: "Worksheet",
        keywords: ["grounding", "coping skills", "emotional regulation"],
      },
    });
    expect(fetchImpl).toHaveBeenCalledTimes(4);
    const modelRequest = JSON.parse(
      String(
        (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[3][1].body
      )
    );
    expect(modelRequest.response_format.json_schema.name).toBe(
      "secure_intake_metadata"
    );
    expect(modelRequest.messages[1].content).toContain("grounding-v4.pdf");
    expect(modelRequest.messages[1].content).not.toContain(
      "data:application/pdf"
    );
  });

  it("blocks a non-administrator before contacting the model and preserves a safe fallback status", async () => {
    const fetchImpl = fetchSequence(
      reply({ id: "non-admin-title-test" }),
      reply([{ role: "user" }])
    );
    const result = await suggestSecureIntakeMetadata(
      "Bearer signed-session",
      {
        fileName: "private-draft.pdf",
        extractedText: "Readable document text.",
      },
      { fetchImpl, now: 2_000 }
    );

    expect(result).toEqual({
      status: 403,
      body: { error: "Administrator access is required." },
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("returns the editable local fallback when structured output is unavailable", async () => {
    const fetchImpl = fetchSequence(
      reply({ id: "fallback-title-test" }),
      reply([{ role: "admin" }]),
      reply({ data: [{ id: "gpt-5-mini" }] }),
      reply({ choices: [{ message: { content: "not-json" } }] })
    );
    const result = await suggestSecureIntakeMetadata(
      "Bearer signed-session",
      {
        fileName: "fallback.pdf",
        extractedText: "Readable document text.",
      },
      { fetchImpl, now: 3_000 }
    );

    expect(result.status).toBe(503);
    expect(result.body.error).toContain("local suggestions remain editable");
  });
});
