import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.mock factories are hoisted before variable declarations. Reference mocks
// through closures (same pattern as the rest of the test suite) to avoid TDZ.

const mockAuthFn = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: () => mockAuthFn() }));

const mockJobFindFirst = vi.fn();
const mockResumeFindFirst = vi.fn();
const mockScoringRunCreate = vi.fn();
const mockTransaction = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: {
    job: { findFirst: (...args: unknown[]) => mockJobFindFirst(...args) },
    resume: { findFirst: (...args: unknown[]) => mockResumeFindFirst(...args) },
    scoringRun: { create: (...args: unknown[]) => mockScoringRunCreate(...args) },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

const mockScoreJobAgainstResume = vi.fn();
vi.mock("@/lib/services/match-scoring", () => ({
  scoreJobAgainstResume: (...args: unknown[]) =>
    mockScoreJobAgainstResume(...args),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { scoreJob } from "@/app/actions/score-job";

const fakeJob = {
  id: "job-1",
  userId: "user-1",
  sourceUrl: "https://example.com/job",
  rawText: "Senior engineer role at Acme Corp.",
  title: "Senior Engineer",
  company: "Acme Corp",
  location: "Remote",
  workMode: "REMOTE",
  seniority: "Senior",
  requiredSkills: ["TypeScript"],
  niceToHaveSkills: ["Rust"],
  responsibilities: ["Build systems"],
  salaryMin: null,
  salaryMax: null,
  salaryCurrency: null,
};

const fakeResume = { id: "resume-1", userId: "user-1" };

const fakeScoringOutcome = {
  result: {
    score: 85,
    reasoning: "Strong match.",
    gaps: ["Rust"],
    strengths: ["TypeScript"],
  },
  usage: { inputTokens: 500, outputTokens: 100, repaired: false },
};

const fakeMatch = { id: "match-1", ...fakeScoringOutcome.result };

function makeFakeTx() {
  return {
    match: { upsert: vi.fn().mockResolvedValue(fakeMatch) },
    scoringRun: { create: vi.fn().mockResolvedValue({}) },
    aiUsage: { create: vi.fn().mockResolvedValue({}) },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthFn.mockResolvedValue({ user: { id: "user-1" } });
  mockJobFindFirst.mockResolvedValue(fakeJob);
  mockResumeFindFirst.mockResolvedValue(fakeResume);
  mockScoreJobAgainstResume.mockResolvedValue(fakeScoringOutcome);
  mockTransaction.mockImplementation(
    async (cb: (tx: ReturnType<typeof makeFakeTx>) => Promise<void>) =>
      cb(makeFakeTx())
  );
});

describe("scoreJob — success path", () => {
  it("runs a single transaction on success", async () => {
    await scoreJob("job-1");
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockScoringRunCreate).not.toHaveBeenCalled(); // run created inside tx
  });

  it("writes a ScoringRun with SUCCESS status and correct fields", async () => {
    let capturedTx: ReturnType<typeof makeFakeTx> | null = null;
    mockTransaction.mockImplementationOnce(
      async (cb: (tx: ReturnType<typeof makeFakeTx>) => Promise<void>) => {
        capturedTx = makeFakeTx();
        return cb(capturedTx);
      }
    );

    await scoreJob("job-1");

    const runData = capturedTx!.scoringRun.create.mock.calls[0][0].data;
    expect(runData.status).toBe("SUCCESS");
    expect(runData.score).toBe(85);
    expect(runData.modelId).toBe("claude-sonnet-4-6");
    expect(runData.inputTokens).toBe(500);
    expect(runData.outputTokens).toBe(100);
    expect(runData.costCents).toBeTypeOf("number");
    expect(runData.latencyMs).toBeTypeOf("number");
    expect(runData.contentHash).toBeTypeOf("string");
    expect(runData.contentHash).toHaveLength(64); // sha256 hex
    expect(runData.matchId).toBe("match-1");
    expect(runData.jobId).toBe("job-1");
    expect(runData.resumeId).toBe("resume-1");
  });

  it("marks the run REPAIRED when scorer returned repaired:true", async () => {
    mockScoreJobAgainstResume.mockResolvedValueOnce({
      ...fakeScoringOutcome,
      usage: { ...fakeScoringOutcome.usage, repaired: true },
    });

    let capturedTx: ReturnType<typeof makeFakeTx> | null = null;
    mockTransaction.mockImplementationOnce(
      async (cb: (tx: ReturnType<typeof makeFakeTx>) => Promise<void>) => {
        capturedTx = makeFakeTx();
        return cb(capturedTx);
      }
    );

    await scoreJob("job-1");
    expect(capturedTx!.scoringRun.create.mock.calls[0][0].data.status).toBe(
      "REPAIRED"
    );
  });

  it("marks the run REPAIRED when extractionRepaired opt is true", async () => {
    let capturedTx: ReturnType<typeof makeFakeTx> | null = null;
    mockTransaction.mockImplementationOnce(
      async (cb: (tx: ReturnType<typeof makeFakeTx>) => Promise<void>) => {
        capturedTx = makeFakeTx();
        return cb(capturedTx);
      }
    );

    await scoreJob("job-1", undefined, { extractionRepaired: true });
    expect(capturedTx!.scoringRun.create.mock.calls[0][0].data.status).toBe(
      "REPAIRED"
    );
  });
});

describe("scoreJob — failure path", () => {
  it("writes a FAILED ScoringRun and does NOT run the transaction", async () => {
    const scoringError = new Error("model timed out");
    mockScoreJobAgainstResume.mockRejectedValueOnce(scoringError);
    mockScoringRunCreate.mockResolvedValue({});

    await expect(scoreJob("job-1")).rejects.toThrow("model timed out");

    expect(mockScoringRunCreate).toHaveBeenCalledTimes(1);
    const runData = mockScoringRunCreate.mock.calls[0][0].data;
    expect(runData.status).toBe("FAILED");
    expect(runData.errorReason).toBe("model timed out");
    expect(runData.score).toBeUndefined();
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("rethrows the original error after writing the failed run", async () => {
    const scoringError = new Error("network failure");
    mockScoreJobAgainstResume.mockRejectedValueOnce(scoringError);
    mockScoringRunCreate.mockResolvedValue({});

    await expect(scoreJob("job-1")).rejects.toBe(scoringError);
  });

  it("throws 'Job not found' when the job does not exist", async () => {
    mockJobFindFirst.mockResolvedValueOnce(null);
    await expect(scoreJob("no-such-job")).rejects.toThrow("Job not found");
  });

  it("throws 'Resume not found' when no default resume exists", async () => {
    mockResumeFindFirst.mockResolvedValueOnce(null);
    await expect(scoreJob("job-1")).rejects.toThrow("Resume not found");
  });
});
