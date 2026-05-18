import { describe, it, expect, vi, beforeEach } from "vitest";

const generateTextMock = vi.fn();

vi.mock("ai", () => ({
  generateText: (...args: unknown[]) => generateTextMock(...args),
}));

vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: (name: string) => ({ provider: "anthropic", name }),
}));

import { generateCoverLetter } from "@/lib/services/cover-letter";

const baseJob = {
  title: "Senior Frontend Engineer",
  company: "Acme",
  location: "Remote",
  workMode: "REMOTE" as const,
  seniority: "Senior",
  requiredSkills: ["TypeScript", "React"],
  niceToHaveSkills: ["GraphQL"],
  responsibilities: ["Build UIs", "Mentor juniors"],
};

const baseResume = { rawText: "Engineer with React and TS background." };

beforeEach(() => {
  generateTextMock.mockReset();
  generateTextMock.mockResolvedValue({
    text: "  Dear hiring team, drafted body.  ",
    usage: { inputTokens: 123, outputTokens: 456 },
  });
});

describe("generateCoverLetter", () => {
  it("includes match analysis sections when a match is provided", async () => {
    await generateCoverLetter(baseJob, baseResume, {
      score: 82,
      strengths: ["React expertise", "TypeScript depth"],
      gaps: ["Limited GraphQL experience"],
    });
    const prompt = generateTextMock.mock.calls[0][0].prompt as string;
    expect(prompt).toContain("Fit score: 82/100");
    expect(prompt).toContain("Strengths to highlight:");
    expect(prompt).toContain("React expertise");
    expect(prompt).toContain("Gaps to address gracefully");
    expect(prompt).toContain("Limited GraphQL experience");
  });

  it("falls back to no-match instruction when match is omitted", async () => {
    await generateCoverLetter(baseJob, baseResume);
    const prompt = generateTextMock.mock.calls[0][0].prompt as string;
    expect(prompt).toContain("No prior match analysis available");
    expect(prompt).not.toContain("Fit score:");
  });

  it("renders job brief sections from the job input", async () => {
    await generateCoverLetter(baseJob, baseResume);
    const prompt = generateTextMock.mock.calls[0][0].prompt as string;
    expect(prompt).toContain("Title: Senior Frontend Engineer");
    expect(prompt).toContain("Company: Acme");
    expect(prompt).toContain("Required skills: TypeScript, React");
    expect(prompt).toContain("Engineer with React and TS background.");
  });

  it("truncates resume.rawText at 18000 chars", async () => {
    const longResume = { rawText: "x".repeat(20000) };
    await generateCoverLetter(baseJob, longResume);
    const prompt = generateTextMock.mock.calls[0][0].prompt as string;
    expect(prompt.includes("x".repeat(18000))).toBe(true);
    expect(prompt.includes("x".repeat(18001))).toBe(false);
  });

  it("normalizes usage when token fields are missing", async () => {
    generateTextMock.mockResolvedValueOnce({ text: "letter", usage: {} });
    const { usage } = await generateCoverLetter(baseJob, baseResume);
    expect(usage).toEqual({ inputTokens: 0, outputTokens: 0 });
  });

  it("trims the returned draft", async () => {
    generateTextMock.mockResolvedValueOnce({
      text: "  hello there  \n",
      usage: { inputTokens: 1, outputTokens: 1 },
    });
    const { draft } = await generateCoverLetter(baseJob, baseResume);
    expect(draft).toBe("hello there");
  });

  it("omits optional brief fields when they are absent", async () => {
    const sparseJob = {
      ...baseJob,
      location: null,
      workMode: null,
      seniority: null,
      niceToHaveSkills: [],
      responsibilities: [],
    };
    await generateCoverLetter(sparseJob, baseResume);
    const prompt = generateTextMock.mock.calls[0][0].prompt as string;
    expect(prompt).not.toContain("Location:");
    expect(prompt).not.toContain("Work mode:");
    expect(prompt).not.toContain("Seniority:");
    expect(prompt).not.toContain("Nice-to-have skills:");
    expect(prompt).not.toContain("Responsibilities:");
  });
});
