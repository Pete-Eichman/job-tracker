import { describe, it, expect, vi, beforeEach } from "vitest";

// Ownership contract for the job-mutation actions: a caller must never be able
// to read or write a job owned by someone else. The queries are scoped by
// `userId`, so cross-user access surfaces as "not found" with no write.
// Mock pattern mirrors score-job.test.ts.

const mockAuthFn = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: () => mockAuthFn() }));

const mockJobFindFirst = vi.fn();
const mockJobUpdateMany = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: {
    job: {
      findFirst: (...a: unknown[]) => mockJobFindFirst(...a),
      updateMany: (...a: unknown[]) => mockJobUpdateMany(...a),
    },
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(), unstable_rethrow: vi.fn() }));

import { updateStatusAction, updateJobAction } from "@/app/actions/update-job";

function fd(entries: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.append(k, v);
  return f;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthFn.mockResolvedValue({ user: { id: "user-1" } });
});

describe("updateStatusAction — ownership", () => {
  it("refuses a job owned by another user and writes nothing", async () => {
    mockJobFindFirst.mockResolvedValue(null); // scoped lookup finds nothing for user-1

    const res = await updateStatusAction(
      {},
      fd({ jobId: "job-of-user-2", status: "APPLIED" })
    );

    expect(res.error).toBe("Job not found");
    expect(mockJobUpdateMany).not.toHaveBeenCalled();
    expect(mockJobFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "job-of-user-2", userId: "user-1" }),
      })
    );
  });

  it("scopes the write to the caller and refuses when 0 rows match", async () => {
    mockJobFindFirst.mockResolvedValue({
      id: "job-1",
      status: "SAVED",
      appliedAt: null,
    });
    mockJobUpdateMany.mockResolvedValue({ count: 0 });

    const res = await updateStatusAction(
      {},
      fd({ jobId: "job-1", status: "APPLIED" })
    );

    expect(res.error).toBe("Job not found");
    expect(mockJobUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "job-1", userId: "user-1" }),
      })
    );
  });
});

describe("updateJobAction — ownership", () => {
  it("refuses a job owned by another user and writes nothing", async () => {
    mockJobFindFirst.mockResolvedValue(null);

    const res = await updateJobAction(
      {},
      fd({ jobId: "job-of-user-2", status: "APPLIED", notes: "hi", appliedAt: "" })
    );

    expect(res.error).toBe("Job not found");
    expect(mockJobUpdateMany).not.toHaveBeenCalled();
    expect(mockJobFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "job-of-user-2", userId: "user-1" }),
      })
    );
  });
});
