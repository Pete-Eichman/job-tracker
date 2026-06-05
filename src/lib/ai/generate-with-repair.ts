import { generateObject } from "ai";
import type { LanguageModel } from "ai";
import type { ZodSchema } from "zod";
import { isAbortLike } from "@/lib/timeouts";

const REPAIR_SUFFIX =
  "\n\nThe previous response did not satisfy the required schema. Return ONLY data that exactly matches the schema — no extra fields, no missing required fields, no type mismatches.";

export async function generateObjectWithRepair<T>(opts: {
  model: LanguageModel;
  schema: ZodSchema<T>;
  prompt: string;
  abortSignal?: AbortSignal;
  maxRepairAttempts?: number;
}): Promise<{
  object: T;
  usage: { inputTokens: number; outputTokens: number };
  repaired: boolean;
}> {
  const { model, schema, prompt, abortSignal, maxRepairAttempts = 2 } = opts;

  let lastError: unknown;
  // Sum usage across all attempts so the audit trail reflects true spend.
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  for (let attempt = 0; attempt <= maxRepairAttempts; attempt++) {
    const currentPrompt = attempt === 0 ? prompt : prompt + REPAIR_SUFFIX;

    try {
      const { object, usage } = await generateObject({
        model,
        schema,
        prompt: currentPrompt,
        abortSignal,
      });

      totalInputTokens += usage.inputTokens ?? 0;
      totalOutputTokens += usage.outputTokens ?? 0;

      return {
        object,
        usage: { inputTokens: totalInputTokens, outputTokens: totalOutputTokens },
        repaired: attempt > 0,
      };
    } catch (err) {
      // Abort/timeout errors must not consume retries — propagate immediately.
      if (isAbortLike(err)) throw err;

      lastError = err;
      // NoObjectGeneratedError carries a usage field; accumulate what we can.
      const errWithUsage = err as { usage?: { inputTokens?: number; outputTokens?: number } };
      totalInputTokens += errWithUsage.usage?.inputTokens ?? 0;
      totalOutputTokens += errWithUsage.usage?.outputTokens ?? 0;
    }
  }

  throw lastError;
}
