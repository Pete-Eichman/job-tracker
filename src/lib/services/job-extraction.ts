import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";

const JobSchema = z.object({
  title: z.string(),
  company: z.string(),
  location: z.string().optional(),
  workMode: z.enum(["REMOTE", "HYBRID", "ONSITE"]).optional(),
  salaryMin: z.number().int().optional(),
  salaryMax: z.number().int().optional(),
  salaryCurrency: z.string().optional(),
  seniority: z.string().optional(),
  requiredSkills: z.array(z.string()).default([]),
  niceToHaveSkills: z.array(z.string()).default([]),
  responsibilities: z.array(z.string()).default([]),
});

export type ExtractedJob = z.infer<typeof JobSchema>;

export async function fetchPageText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; JobTracker/1.0)" },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const html = await res.text();
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 20000);
}

export async function extractJobFromText(
  rawText: string
): Promise<ExtractedJob> {
  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-6"),
    schema: JobSchema,
    prompt: `Extract structured job posting information from the following text. For salary, extract numbers only (no currency symbols). For workMode, use REMOTE, HYBRID, or ONSITE only if clearly stated.\n\n${rawText}`,
  });
  return object;
}
