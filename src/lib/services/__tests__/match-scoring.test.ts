import { describe, it, expect, vi, beforeEach } from "vitest";

const generateObjectMock = vi.fn();

vi.mock("ai", () => ({
  generateObject: (...args: unknown[]) => generateObjectMock(...args),
}));

vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: (name: string) => ({ provider: "anthropic", name }),
}));

import { scoreJobAgainstResume } from "@/lib/services/match-scoring";

const baseJob = {
  title: "Backend Engineer",
  company: "Beta Co",
  location: "NYC",
  workMode: "HYBRID" as const,
  seniority: "Mid",
  requiredSkills: ["Go", "Postgres"],
  niceToHaveSkills: ["Kafka"],
  responsibilities: ["Build APIs"],
  salaryMin: 120000,
  salaryMax: 160000,
  salaryCurrency: "USD",
};

const baseResume = { rawText: "Resume content with Go and SQL." };

beforeEach(() => {
  generateObjectMock.mockReset();
  generateObjectMock.mockResolvedValue({
    object: {
      score: 75,
      reasoning: "Decent overlap",
      gaps: ["Kafka"],
      strengths: ["Go"],
    },
    usage: { inputTokens: 100, outputTokens: 50 },
  });
});

describe("scoreJobAgainstResume", () => {
  it("includes the job brief in the prompt", async () => {
    await scoreJobAgainstResume(baseJob, baseResume);
    const prompt = generateObjectMock.mock.calls[0][0].prompt as string;
    expect(prompt).toContain("Title: Backend Engineer");
    expect(prompt).toContain("Company: Beta Co");
    expect(prompt).toContain("Work mode: HYBRID");
    expect(prompt).toContain("Required skills: Go, Postgres");
    expect(prompt).toContain("Nice-to-have skills: Kafka");
    expect(prompt).toContain("Resume content with Go and SQL.");
  });

  it("formats a known salary range with currency and commas", async () => {
    await scoreJobAgainstResume(baseJob, baseResume);
    const prompt = generateObjectMock.mock.calls[0][0].prompt as string;
    expect(prompt).toContain("Salary: USD 120,000 - 160,000");
  });

  it("renders 'Not specified' when both salary bounds are null", async () => {
    await scoreJobAgainstResume(
      { ...baseJob, salaryMin: null, salaryMax: null, salaryCurrency: null },
      baseResume
    );
    const prompt = generateObjectMock.mock.calls[0][0].prompt as string;
    expect(prompt).toContain("Salary: Not specified");
  });

  it("passes a schema with score, reasoning, gaps, and strengths", async () => {
    await scoreJobAgainstResume(baseJob, baseResume);
    const args = generateObjectMock.mock.calls[0][0];
    const keys = Object.keys(args.schema.shape).sort();
    expect(keys).toEqual(["gaps", "reasoning", "score", "strengths"]);
  });

  it("normalizes usage when token fields are missing", async () => {
    generateObjectMock.mockResolvedValueOnce({
      object: { score: 50, reasoning: "x", gaps: [], strengths: [] },
      usage: {},
    });
    const { usage } = await scoreJobAgainstResume(baseJob, baseResume);
    expect(usage).toEqual({ inputTokens: 0, outputTokens: 0 });
  });

  it("returns the model's structured result", async () => {
    const fakeMatch = {
      score: 88,
      reasoning: "Strong overlap on backend stack.",
      gaps: ["Kafka"],
      strengths: ["Go", "Postgres"],
    };
    generateObjectMock.mockResolvedValueOnce({
      object: fakeMatch,
      usage: { inputTokens: 10, outputTokens: 20 },
    });
    const { result } = await scoreJobAgainstResume(baseJob, baseResume);
    expect(result).toEqual(fakeMatch);
  });
});
