import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@/generated/prisma/client";

const generateObjectMock = vi.fn();

vi.mock("ai", () => ({
  generateObject: (...args: unknown[]) => generateObjectMock(...args),
}));

vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: (name: string) => ({ provider: "anthropic", name }),
}));

import { explainMatch } from "@/lib/services/match-explanation";

const baseJob = {
  title: "Backend Engineer",
  company: "Acme Corp",
  location: "Remote",
  workMode: "REMOTE" as const,
  seniority: "Senior",
  requiredSkills: ["Go", "Postgres", "Kubernetes"],
  niceToHaveSkills: ["Kafka"],
  responsibilities: ["Design APIs", "Own deployments"],
  salaryMin: new Prisma.Decimal(140000),
  salaryMax: new Prisma.Decimal(180000),
  salaryCurrency: "USD",
};

const baseResume = { rawText: "Five years Go experience. PostgreSQL daily driver." };

const fakeResult = {
  gaps: [
    {
      type: "vocabulary",
      requirement: "RESTful services",
      finding: "Resume mentions REST APIs — same concept, different wording.",
      hedge: false,
      action: "Replace 'REST APIs' with 'RESTful services' in your experience bullets.",
    },
  ],
  overall_note: "Strong match overall. One wording tweak would tighten the fit.",
};

beforeEach(() => {
  generateObjectMock.mockReset();
  generateObjectMock.mockResolvedValue({
    object: fakeResult,
    usage: { inputTokens: 200, outputTokens: 100 },
  });
});

describe("explainMatch", () => {
  it("includes the job brief in the prompt", async () => {
    await explainMatch(baseJob, baseResume);
    const prompt = generateObjectMock.mock.calls[0][0].prompt as string;
    expect(prompt).toContain("Title: Backend Engineer");
    expect(prompt).toContain("Company: Acme Corp");
    expect(prompt).toContain("Work mode: REMOTE");
    expect(prompt).toContain("Required skills: Go, Postgres, Kubernetes");
    expect(prompt).toContain("Nice-to-have skills: Kafka");
    expect(prompt).toContain("Design APIs");
    expect(prompt).toContain("Five years Go experience");
  });

  it("includes the score in the prompt when provided", async () => {
    await explainMatch(baseJob, baseResume, 72);
    const prompt = generateObjectMock.mock.calls[0][0].prompt as string;
    expect(prompt).toContain("Current match score: 72/100");
  });

  it("omits the score line when no score is provided", async () => {
    await explainMatch(baseJob, baseResume);
    const prompt = generateObjectMock.mock.calls[0][0].prompt as string;
    expect(prompt).not.toContain("Current match score");
  });

  it("passes schema with gaps and overall_note fields", async () => {
    await explainMatch(baseJob, baseResume);
    const args = generateObjectMock.mock.calls[0][0];
    const keys = Object.keys(args.schema.shape).sort();
    expect(keys).toEqual(["gaps", "overall_note"]);
  });

  it("gap schema includes type, requirement, finding, hedge, and action", async () => {
    await explainMatch(baseJob, baseResume);
    const args = generateObjectMock.mock.calls[0][0];
    const gapShape = args.schema.shape.gaps.element.shape;
    expect(Object.keys(gapShape).sort()).toEqual([
      "action",
      "finding",
      "hedge",
      "requirement",
      "type",
    ]);
  });

  it("prompt encodes the three gap types", async () => {
    await explainMatch(baseJob, baseResume);
    const prompt = generateObjectMock.mock.calls[0][0].prompt as string;
    expect(prompt).toContain("TYPE: vocabulary");
    expect(prompt).toContain("TYPE: closable");
    expect(prompt).toContain("TYPE: hard");
  });

  it("prompt encodes the no-fabrication rule", async () => {
    await explainMatch(baseJob, baseResume);
    const prompt = generateObjectMock.mock.calls[0][0].prompt as string;
    expect(prompt).toMatch(/fabricat/i);
  });

  it("prompt encodes the anti-breadcrumb ban", async () => {
    await explainMatch(baseJob, baseResume);
    const prompt = generateObjectMock.mock.calls[0][0].prompt as string;
    expect(prompt).toMatch(/no breadcrumb/i);
    expect(prompt).toMatch(/cliffhanger/i);
    expect(prompt).toMatch(/want me to go deeper/i);
  });

  it("prompt encodes targeted hedging rules", async () => {
    await explainMatch(baseJob, baseResume);
    const prompt = generateObjectMock.mock.calls[0][0].prompt as string;
    expect(prompt).toMatch(/hedge/i);
    expect(prompt).toMatch(/licensure|legally.mandated|clearance/i);
    expect(prompt).toContain("preferred");
  });

  it("prompt encodes the cap", async () => {
    await explainMatch(baseJob, baseResume);
    const prompt = generateObjectMock.mock.calls[0][0].prompt as string;
    expect(prompt).toMatch(/cap at 5/i);
  });

  it("normalizes usage when token fields are missing", async () => {
    generateObjectMock.mockResolvedValueOnce({
      object: fakeResult,
      usage: {},
    });
    const { usage } = await explainMatch(baseJob, baseResume);
    expect(usage).toEqual({ inputTokens: 0, outputTokens: 0 });
  });

  it("passes an abortSignal to the SDK", async () => {
    await explainMatch(baseJob, baseResume);
    const args = generateObjectMock.mock.calls[0][0];
    expect(args.abortSignal).toBeInstanceOf(AbortSignal);
  });

  it("rethrows a friendly timeout error when the SDK aborts", async () => {
    generateObjectMock.mockRejectedValueOnce(
      new DOMException("aborted", "TimeoutError")
    );
    await expect(explainMatch(baseJob, baseResume)).rejects.toThrow(
      /Match explanation timed out after \d+s/
    );
  });

  it("lets non-abort errors bubble up unchanged", async () => {
    const sdkError = new Error("network error");
    generateObjectMock.mockRejectedValueOnce(sdkError);
    await expect(explainMatch(baseJob, baseResume)).rejects.toBe(sdkError);
  });

  it("returns the model's structured result", async () => {
    const { result } = await explainMatch(baseJob, baseResume, 88);
    expect(result).toEqual(fakeResult);
  });

  it("formats salary in the prompt", async () => {
    await explainMatch(baseJob, baseResume);
    const prompt = generateObjectMock.mock.calls[0][0].prompt as string;
    expect(prompt).toContain("Salary: USD 140,000 - 180,000");
  });
});
