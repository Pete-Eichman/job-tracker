import { describe, it, expect } from "vitest";
import { assertLooksLikeJobPosting } from "@/lib/services/scrape-guard";

const VALID_POSTING = `
  Senior Software Engineer at Acme Corp. We are looking for an experienced engineer
  to join our team. Requirements: 5+ years of experience with TypeScript and React.
  Responsibilities include designing and building scalable systems. Required skills:
  Node.js, PostgreSQL. Nice to have: Kubernetes. Apply by sending your resume.
  Qualifications: BS in Computer Science or equivalent experience.
`.trim();

const USER_MESSAGE = "Could not read this posting — paste the text directly.";

describe("assertLooksLikeJobPosting", () => {
  it("accepts a real-looking job posting", () => {
    expect(() =>
      assertLooksLikeJobPosting({
        contentType: "text/html; charset=utf-8",
        strippedText: VALID_POSTING,
      })
    ).not.toThrow();
  });

  it("accepts a null content-type (some servers omit it)", () => {
    expect(() =>
      assertLooksLikeJobPosting({ contentType: null, strippedText: VALID_POSTING })
    ).not.toThrow();
  });

  it("accepts an empty string content-type", () => {
    expect(() =>
      assertLooksLikeJobPosting({ contentType: "", strippedText: VALID_POSTING })
    ).not.toThrow();
  });

  it("rejects a non-HTML content-type", () => {
    expect(() =>
      assertLooksLikeJobPosting({
        contentType: "application/json",
        strippedText: VALID_POSTING,
      })
    ).toThrow(USER_MESSAGE);
  });

  it("rejects a PDF content-type", () => {
    expect(() =>
      assertLooksLikeJobPosting({
        contentType: "application/pdf",
        strippedText: VALID_POSTING,
      })
    ).toThrow(USER_MESSAGE);
  });

  it("rejects text that is too short (login wall / empty shell)", () => {
    expect(() =>
      assertLooksLikeJobPosting({
        contentType: "text/html",
        strippedText: "Please log in to view this job posting.",
      })
    ).toThrow(USER_MESSAGE);
  });

  it("rejects a long page with no job signals (generic marketing page)", () => {
    // 300+ chars but no job-related vocabulary
    const noSignals = "Welcome to our website. ".repeat(20);
    expect(() =>
      assertLooksLikeJobPosting({ contentType: "text/html", strippedText: noSignals })
    ).toThrow(USER_MESSAGE);
  });

  it("rejects a captcha / access-denied page", () => {
    const captcha =
      "Access denied. This site is protected by reCAPTCHA and the Google Privacy Policy " +
      "and Terms of Service apply. Please verify you are not a robot to continue. " +
      "Your IP address has been flagged for unusual activity. Complete the challenge.";
    expect(() =>
      assertLooksLikeJobPosting({ contentType: "text/html", strippedText: captcha })
    ).toThrow(USER_MESSAGE);
  });

  it("accepts xhtml content-type", () => {
    expect(() =>
      assertLooksLikeJobPosting({
        contentType: "application/xhtml+xml",
        strippedText: VALID_POSTING,
      })
    ).not.toThrow();
  });
});
