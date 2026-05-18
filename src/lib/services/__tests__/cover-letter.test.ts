import { describe, it, expect, vi, beforeEach } from "vitest";

const streamTextMock = vi.fn();

vi.mock("ai", () => ({
  streamText: (...args: unknown[]) => streamTextMock(...args),
}));

vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: (name: string) => ({ provider: "anthropic", name }),
}));

import {
  buildCoverLetterPrompt,
  streamCoverLetter,
} from "@/lib/services/cover-letter";

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

describe("buildCoverLetterPrompt", () => {
  it("includes match analysis sections when a match is provided", () => {
    const prompt = buildCoverLetterPrompt(baseJob, baseResume, {
      score: 82,
      strengths: ["React expertise", "TypeScript depth"],
      gaps: ["Limited GraphQL experience"],
    });
    expect(prompt).toContain("Fit score: 82/100");
    expect(prompt).toContain("Strengths to highlight:");
    expect(prompt).toContain("React expertise");
    expect(prompt).toContain("Gaps to address gracefully");
    expect(prompt).toContain("Limited GraphQL experience");
  });

  it("falls back to no-match instruction when match is omitted", () => {
    const prompt = buildCoverLetterPrompt(baseJob, baseResume);
    expect(prompt).toContain("No prior match analysis available");
    expect(prompt).not.toContain("Fit score:");
  });

  it("renders job brief sections from the job input", () => {
    const prompt = buildCoverLetterPrompt(baseJob, baseResume);
    expect(prompt).toContain("Title: Senior Frontend Engineer");
    expect(prompt).toContain("Company: Acme");
    expect(prompt).toContain("Required skills: TypeScript, React");
    expect(prompt).toContain("Engineer with React and TS background.");
  });

  it("truncates resume.rawText at 18000 chars", () => {
    const longResume = { rawText: "x".repeat(20000) };
    const prompt = buildCoverLetterPrompt(baseJob, longResume);
    expect(prompt.includes("x".repeat(18000))).toBe(true);
    expect(prompt.includes("x".repeat(18001))).toBe(false);
  });

  it("omits optional brief fields when they are absent", () => {
    const sparseJob = {
      ...baseJob,
      location: null,
      workMode: null,
      seniority: null,
      niceToHaveSkills: [],
      responsibilities: [],
    };
    const prompt = buildCoverLetterPrompt(sparseJob, baseResume);
    expect(prompt).not.toContain("Location:");
    expect(prompt).not.toContain("Work mode:");
    expect(prompt).not.toContain("Seniority:");
    expect(prompt).not.toContain("Nice-to-have skills:");
    expect(prompt).not.toContain("Responsibilities:");
  });
});

describe("streamCoverLetter", () => {
  beforeEach(() => {
    streamTextMock.mockReset();
    streamTextMock.mockReturnValue({ stream: "fake" });
  });

  it("forwards the built prompt, an abortSignal, and the callbacks to streamText", () => {
    const onFinish = vi.fn();
    const onError = vi.fn();
    streamCoverLetter(baseJob, baseResume, undefined, { onFinish, onError });
    const args = streamTextMock.mock.calls[0][0];
    expect(args.prompt).toBe(buildCoverLetterPrompt(baseJob, baseResume));
    expect(args.abortSignal).toBeInstanceOf(AbortSignal);
    expect(args.onFinish).toBe(onFinish);
    expect(args.onError).toBe(onError);
  });

  it("returns whatever streamText returns", () => {
    const fake = { textStream: [], toTextStreamResponse: vi.fn() };
    streamTextMock.mockReturnValueOnce(fake);
    expect(streamCoverLetter(baseJob, baseResume)).toBe(fake);
  });

  it("works without callbacks", () => {
    streamCoverLetter(baseJob, baseResume);
    const args = streamTextMock.mock.calls[0][0];
    expect(args.onFinish).toBeUndefined();
    expect(args.onError).toBeUndefined();
  });
});
