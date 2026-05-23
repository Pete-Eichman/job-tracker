import { describe, it, expect } from "vitest";
import {
  hasTeaserLanguage,
  assertActionsPresent,
  assertNoTeaserLanguage,
} from "@/lib/explanation-guards";
import type { MatchExplanation } from "@/lib/services/match-explanation";

const cleanGap = {
  type: "closable" as const,
  requirement: "AWS certification",
  finding: "No cloud certifications in the resume.",
  hedge: false,
  action: "Pursue AWS Solutions Architect Associate — roughly 2-3 months at 10h/week.",
};

const cleanExplanation: MatchExplanation = {
  gaps: [cleanGap],
  overall_note: "Solid background. One certification gap stands between you and a strong application.",
};

describe("hasTeaserLanguage", () => {
  it("returns false for clean text", () => {
    expect(hasTeaserLanguage("Strong match overall. One wording fix needed.")).toBe(false);
    expect(hasTeaserLanguage("Pursue the AWS cert — about 3 months.")).toBe(false);
  });

  it("flags 'want me to go deeper'", () => {
    expect(hasTeaserLanguage("Want me to go deeper on the gaps?")).toBe(true);
  });

  it("flags 'want me to continue'", () => {
    expect(hasTeaserLanguage("want me to continue with more gaps?")).toBe(true);
  });

  it("flags 'there are more gaps'", () => {
    expect(hasTeaserLanguage("There are more gaps I could share.")).toBe(true);
  });

  it("flags 'there are other issues'", () => {
    expect(hasTeaserLanguage("There are other issues with your resume.")).toBe(true);
  });

  it("flags 'I found more'", () => {
    expect(hasTeaserLanguage("I found more issues but stopped here.")).toBe(true);
  });

  it("flags 'shall I'", () => {
    expect(hasTeaserLanguage("Shall I elaborate further?")).toBe(true);
  });

  it("flags 'happy to share'", () => {
    expect(hasTeaserLanguage("Happy to share more details.")).toBe(true);
  });

  it("flags 'happy to dig'", () => {
    expect(hasTeaserLanguage("Happy to dig into this more.")).toBe(true);
  });

  it("flags 'would you like me to'", () => {
    expect(hasTeaserLanguage("Would you like me to go into more detail?")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(hasTeaserLanguage("WANT ME TO GO DEEPER?")).toBe(true);
  });
});

describe("assertActionsPresent", () => {
  it("passes when all gaps have non-empty actions", () => {
    expect(() => assertActionsPresent(cleanExplanation)).not.toThrow();
  });

  it("passes with zero gaps", () => {
    const empty: MatchExplanation = { gaps: [], overall_note: "Great match." };
    expect(() => assertActionsPresent(empty)).not.toThrow();
  });

  it("throws when a gap has an empty action string", () => {
    const bad: MatchExplanation = {
      gaps: [{ ...cleanGap, action: "" }],
      overall_note: "ok",
    };
    expect(() => assertActionsPresent(bad)).toThrow(/missing a required action/);
  });

  it("throws when a gap has a whitespace-only action", () => {
    const bad: MatchExplanation = {
      gaps: [{ ...cleanGap, action: "   " }],
      overall_note: "ok",
    };
    expect(() => assertActionsPresent(bad)).toThrow(/missing a required action/);
  });

  it("includes the requirement name in the error message", () => {
    const bad: MatchExplanation = {
      gaps: [{ ...cleanGap, requirement: "AWS certification", action: "" }],
      overall_note: "ok",
    };
    expect(() => assertActionsPresent(bad)).toThrow(/AWS certification/);
  });
});

describe("assertNoTeaserLanguage", () => {
  it("passes for clean explanation", () => {
    expect(() => assertNoTeaserLanguage(cleanExplanation)).not.toThrow();
  });

  it("throws when overall_note contains teaser language", () => {
    const bad: MatchExplanation = {
      ...cleanExplanation,
      overall_note: "Good overall. Want me to go deeper on any of these?",
    };
    expect(() => assertNoTeaserLanguage(bad)).toThrow(/cliffhanger/);
  });

  it("throws when a finding contains teaser language", () => {
    const bad: MatchExplanation = {
      gaps: [{ ...cleanGap, finding: "I found more issues but limited myself here." }],
      overall_note: "Fine.",
    };
    expect(() => assertNoTeaserLanguage(bad)).toThrow(/cliffhanger/);
  });

  it("throws when an action contains teaser language", () => {
    const bad: MatchExplanation = {
      gaps: [{ ...cleanGap, action: "Pursue the cert. Shall I suggest a study plan?" }],
      overall_note: "Fine.",
    };
    expect(() => assertNoTeaserLanguage(bad)).toThrow(/cliffhanger/);
  });
});
