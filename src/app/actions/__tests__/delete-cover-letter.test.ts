import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuthFn = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: () => mockAuthFn() }));

const mockFindUnique = vi.fn();
const mockDelete = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: {
    coverLetter: {
      findUnique: (...a: unknown[]) => mockFindUnique(...a),
      delete: (...a: unknown[]) => mockDelete(...a),
    },
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(), unstable_rethrow: vi.fn() }));

import { deleteCoverLetterAction } from "@/app/actions/cover-letter";

function fd(entries: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.append(k, v);
  return f;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthFn.mockResolvedValue({ user: { id: "user-1" } });
});

describe("deleteCoverLetterAction — ownership", () => {
  it("refuses to delete a cover letter whose job belongs to another user", async () => {
    // The letter exists, but its parent job is owned by user-2.
    mockFindUnique.mockResolvedValue({
      id: "cl-1",
      jobId: "job-1",
      job: { userId: "user-2" },
    });

    const res = await deleteCoverLetterAction({}, fd({ coverLetterId: "cl-1" }));

    expect(res.error).toBe("Cover letter not found");
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("refuses when the cover letter does not exist", async () => {
    mockFindUnique.mockResolvedValue(null);

    const res = await deleteCoverLetterAction({}, fd({ coverLetterId: "nope" }));

    expect(res.error).toBe("Cover letter not found");
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("deletes the caller's own cover letter", async () => {
    mockFindUnique.mockResolvedValue({
      id: "cl-1",
      jobId: "job-1",
      job: { userId: "user-1" },
    });
    mockDelete.mockResolvedValue({});

    const res = await deleteCoverLetterAction({}, fd({ coverLetterId: "cl-1" }));

    expect(res.error).toBeUndefined();
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "cl-1" } });
  });
});
