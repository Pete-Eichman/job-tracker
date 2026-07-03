import { anthropic } from "@ai-sdk/anthropic";
import { fetch } from "undici";
import { z } from "zod";
import { TIMEOUTS, isAbortLike, timeoutError } from "@/lib/timeouts";
import { AI_MODELS } from "@/lib/ai-models";
import { generateObjectWithRepair } from "@/lib/ai/generate-with-repair";
import { assertLooksLikeJobPosting, USER_MESSAGE } from "@/lib/services/scrape-guard";
import {
  assertFetchableUrl,
  isSsrfBlockedError,
  safeDispatcher,
} from "@/lib/services/ssrf-guard";

const JobSchema = z.object({
  title: z.string(),
  company: z.string(),
  location: z.string().optional(),
  workMode: z.enum(["REMOTE", "HYBRID", "ONSITE"]).optional(),
  salaryMin: z.number().optional(),
  salaryMax: z.number().optional(),
  salaryCurrency: z.string().optional(),
  seniority: z.string().optional(),
  requiredSkills: z.array(z.string()).default([]),
  niceToHaveSkills: z.array(z.string()).default([]),
  responsibilities: z.array(z.string()).default([]),
});

export type ExtractedJob = z.infer<typeof JobSchema>;

export type ExtractionUsage = {
  inputTokens: number;
  outputTokens: number;
  repaired: boolean;
};

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 20000);
}

export async function fetchPageText(url: string): Promise<string> {
  // Reject bad schemes, credentials, and IP-literal hosts in blocked ranges
  // before any network access. DNS-resolving hosts are validated at connect
  // time by safeDispatcher(), which also closes DNS rebinding.
  assertFetchableUrl(url);

  try {
    const res = await fetch(url, {
      dispatcher: safeDispatcher(),
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; JobTracker/1.0)" },
      signal: AbortSignal.timeout(TIMEOUTS.pageFetch),
    });
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
    const strippedText = stripHtml(await res.text());
    assertLooksLikeJobPosting({
      contentType: res.headers.get("content-type"),
      strippedText,
    });
    return strippedText;
  } catch (err) {
    if (isAbortLike(err)) {
      throw timeoutError("Job posting fetch", TIMEOUTS.pageFetch);
    }
    // A blocked destination (incl. a redirect hop or a rebinding attempt caught
    // at connect time) surfaces the same generic message as any other failure,
    // so this cannot be used to probe internal services.
    if (isSsrfBlockedError(err)) {
      throw new Error(USER_MESSAGE);
    }
    throw err;
  }
}

export async function extractJobFromText(
  rawText: string
): Promise<{ result: ExtractedJob; usage: ExtractionUsage }> {
  try {
    const { object, usage, repaired } = await generateObjectWithRepair({
      model: anthropic(AI_MODELS.default),
      schema: JobSchema,
      prompt: `Extract structured job posting information from the following text. For salary, extract numbers only (no currency symbols). For workMode, use REMOTE, HYBRID, or ONSITE only if clearly stated.\n\n${rawText}`,
      abortSignal: AbortSignal.timeout(TIMEOUTS.jobExtract),
    });
    return {
      result: object,
      usage: {
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        repaired,
      },
    };
  } catch (err) {
    if (isAbortLike(err)) {
      throw timeoutError("Job extraction", TIMEOUTS.jobExtract);
    }
    throw err;
  }
}
