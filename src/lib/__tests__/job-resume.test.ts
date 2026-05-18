import { describe, it, expect } from "vitest";
import { pickResumeId } from "@/lib/job-resume";

const A = { id: "a", isDefault: true };
const B = { id: "b", isDefault: false };
const C = { id: "c", isDefault: false };

describe("pickResumeId", () => {
  it("returns null for an empty resume list", () => {
    expect(pickResumeId([], "a")).toBeNull();
  });

  it("returns the only resume's id when there's one (regardless of request)", () => {
    expect(pickResumeId([B], undefined)).toBe("b");
    expect(pickResumeId([B], "nonexistent")).toBe("b");
  });

  it("returns the requested id when it matches a real resume", () => {
    expect(pickResumeId([A, B, C], "c")).toBe("c");
  });

  it("falls back to the default-flagged resume when request is invalid", () => {
    expect(pickResumeId([A, B, C], "nope")).toBe("a");
  });

  it("falls back to the first resume when no default is flagged", () => {
    expect(pickResumeId([B, C], "nope")).toBe("b");
  });

  it("falls back to the default when request is undefined", () => {
    expect(pickResumeId([A, B], undefined)).toBe("a");
  });

  it("uses the first element of an array param", () => {
    expect(pickResumeId([A, B, C], ["c", "a"])).toBe("c");
  });
});
