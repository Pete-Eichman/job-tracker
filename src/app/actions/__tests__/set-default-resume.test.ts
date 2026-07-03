import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuthFn = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: () => mockAuthFn() }));

const mockResumeFindFirst = vi.fn();
const mockResumeUpdateMany = vi.fn();
const mockTransaction = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: {
    resume: {
      findFirst: (...a: unknown[]) => mockResumeFindFirst(...a),
      updateMany: (...a: unknown[]) => mockResumeUpdateMany(...a),
    },
    $transaction: (...a: unknown[]) => mockTransaction(...a),
  },
}));

// Avoid pulling unpdf in via save-resume's other export.
vi.mock("@/lib/services/pdf-extract", () => ({ extractPdfText: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { setDefaultResume } from "@/app/actions/save-resume";

function fd(entries: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.append(k, v);
  return f;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthFn.mockResolvedValue({ user: { id: "user-1" } });
});

describe("setDefaultResume — ownership", () => {
  it("refuses to default another user's resume and runs no transaction", async () => {
    mockResumeFindFirst.mockResolvedValue(null); // not found under user-1's scope

    const res = await setDefaultResume(
      {},
      fd({ resumeId: "resume-of-user-2" })
    );

    expect(res.error).toBe("Resume not found");
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockResumeFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "resume-of-user-2",
          userId: "user-1",
        }),
      })
    );
  });
});
