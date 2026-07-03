import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuthFn = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: () => mockAuthFn() }));

const mockJobUpdateMany = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: {
    job: { updateMany: (...a: unknown[]) => mockJobUpdateMany(...a) },
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { toggleArchiveAction } from "@/app/actions/archive-job";

function fd(entries: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.append(k, v);
  return f;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthFn.mockResolvedValue({ user: { id: "user-1" } });
});

describe("toggleArchiveAction — ownership", () => {
  it("refuses to archive another user's job (0 rows scoped to caller)", async () => {
    mockJobUpdateMany.mockResolvedValue({ count: 0 });

    const res = await toggleArchiveAction(
      {},
      fd({ jobId: "job-of-user-2", shouldArchive: "true" })
    );

    expect(res.error).toBe("Job not found");
    expect(mockJobUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "job-of-user-2", userId: "user-1" }),
      })
    );
  });

  it("archives the caller's own job when exactly one row matches", async () => {
    mockJobUpdateMany.mockResolvedValue({ count: 1 });

    const res = await toggleArchiveAction(
      {},
      fd({ jobId: "job-1", shouldArchive: "true" })
    );

    expect(res.error).toBeUndefined();
    expect(mockJobUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "job-1", userId: "user-1" }),
        data: expect.objectContaining({ archivedAt: expect.any(Date) }),
      })
    );
  });
});
