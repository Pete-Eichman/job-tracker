import { describe, it, expect, vi, beforeEach } from "vitest";

const generateObjectMock = vi.fn();

vi.mock("ai", () => ({
  generateObject: (...args: unknown[]) => generateObjectMock(...args),
}));

vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: (name: string) => ({ provider: "anthropic", name }),
}));

import { generateObjectWithRepair } from "@/lib/ai/generate-with-repair";
import { z } from "zod";

const schema = z.object({ value: z.string() });
const fakeModel = { provider: "anthropic", name: "test" } as unknown as Parameters<
  typeof generateObjectWithRepair
>[0]["model"];

const successResponse = {
  object: { value: "ok" },
  usage: { inputTokens: 100, outputTokens: 50 },
};

beforeEach(() => {
  generateObjectMock.mockReset();
});

describe("generateObjectWithRepair", () => {
  it("returns repaired:false on first-attempt success", async () => {
    generateObjectMock.mockResolvedValueOnce(successResponse);
    const result = await generateObjectWithRepair({
      model: fakeModel,
      schema,
      prompt: "test prompt",
    });
    expect(result.repaired).toBe(false);
    expect(result.object).toEqual({ value: "ok" });
    expect(generateObjectMock).toHaveBeenCalledTimes(1);
  });

  it("returns repaired:true after a validation failure and retry", async () => {
    const validationError = new Error("schema validation failed");
    generateObjectMock
      .mockRejectedValueOnce(validationError)
      .mockResolvedValueOnce(successResponse);

    const result = await generateObjectWithRepair({
      model: fakeModel,
      schema,
      prompt: "test prompt",
    });

    expect(result.repaired).toBe(true);
    expect(result.object).toEqual({ value: "ok" });
    expect(generateObjectMock).toHaveBeenCalledTimes(2);
  });

  it("appends the repair instruction on the retry prompt", async () => {
    generateObjectMock
      .mockRejectedValueOnce(new Error("validation error"))
      .mockResolvedValueOnce(successResponse);

    await generateObjectWithRepair({
      model: fakeModel,
      schema,
      prompt: "base prompt",
    });

    const secondCallPrompt = generateObjectMock.mock.calls[1][0].prompt as string;
    expect(secondCallPrompt).toContain("base prompt");
    expect(secondCallPrompt).toContain("did not satisfy the required schema");
  });

  it("exhausts the cap and rethrows the last error", async () => {
    const err = new Error("persistent failure");
    generateObjectMock.mockRejectedValue(err);

    await expect(
      generateObjectWithRepair({
        model: fakeModel,
        schema,
        prompt: "test",
        maxRepairAttempts: 2,
      })
    ).rejects.toBe(err);

    // 1 initial + 2 repair attempts
    expect(generateObjectMock).toHaveBeenCalledTimes(3);
  });

  it("rethrows an abort error immediately without consuming retries", async () => {
    const abortError = new DOMException("aborted", "AbortError");
    generateObjectMock.mockRejectedValueOnce(abortError);

    await expect(
      generateObjectWithRepair({ model: fakeModel, schema, prompt: "test" })
    ).rejects.toBe(abortError);

    expect(generateObjectMock).toHaveBeenCalledTimes(1);
  });

  it("rethrows a timeout error immediately without consuming retries", async () => {
    const timeoutError = new DOMException("timed out", "TimeoutError");
    generateObjectMock.mockRejectedValueOnce(timeoutError);

    await expect(
      generateObjectWithRepair({ model: fakeModel, schema, prompt: "test" })
    ).rejects.toBe(timeoutError);

    expect(generateObjectMock).toHaveBeenCalledTimes(1);
  });

  it("sums usage tokens across attempts", async () => {
    generateObjectMock
      .mockRejectedValueOnce(
        Object.assign(new Error("fail"), {
          usage: { inputTokens: 80, outputTokens: 20 },
        })
      )
      .mockResolvedValueOnce({
        object: { value: "ok" },
        usage: { inputTokens: 100, outputTokens: 50 },
      });

    const result = await generateObjectWithRepair({
      model: fakeModel,
      schema,
      prompt: "test",
    });

    expect(result.usage.inputTokens).toBe(180);
    expect(result.usage.outputTokens).toBe(70);
  });
});
