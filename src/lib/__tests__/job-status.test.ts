import { describe, it, expect } from "vitest";
import {
  statusLabel,
  statusColor,
  JOB_STATUS_VALUES,
} from "@/lib/job-status";

describe("statusLabel", () => {
  it("renders each enum value as a human-readable label", () => {
    expect(statusLabel("SAVED")).toBe("Saved");
    expect(statusLabel("APPLIED")).toBe("Applied");
    expect(statusLabel("PHONE_SCREEN")).toBe("Phone screen");
    expect(statusLabel("TECHNICAL")).toBe("Technical");
    expect(statusLabel("ONSITE")).toBe("Onsite");
    expect(statusLabel("OFFER")).toBe("Offer");
    expect(statusLabel("REJECTED")).toBe("Rejected");
    expect(statusLabel("WITHDRAWN")).toBe("Withdrawn");
  });
});

describe("statusColor", () => {
  it("returns gray for SAVED", () => {
    expect(statusColor("SAVED")).toBe("bg-gray-100 text-gray-700");
  });

  it("returns blue for in-flight stages", () => {
    const blue = "bg-blue-100 text-blue-700";
    expect(statusColor("APPLIED")).toBe(blue);
    expect(statusColor("PHONE_SCREEN")).toBe(blue);
    expect(statusColor("TECHNICAL")).toBe(blue);
    expect(statusColor("ONSITE")).toBe(blue);
  });

  it("returns green for OFFER", () => {
    expect(statusColor("OFFER")).toBe("bg-green-100 text-green-700");
  });

  it("returns dim gray for terminal not-hired stages", () => {
    const dim = "bg-gray-200 text-gray-500";
    expect(statusColor("REJECTED")).toBe(dim);
    expect(statusColor("WITHDRAWN")).toBe(dim);
  });
});

describe("JOB_STATUS_VALUES", () => {
  it("lists all 8 enum values in canonical order", () => {
    expect(JOB_STATUS_VALUES).toEqual([
      "SAVED",
      "APPLIED",
      "PHONE_SCREEN",
      "TECHNICAL",
      "ONSITE",
      "OFFER",
      "REJECTED",
      "WITHDRAWN",
    ]);
  });
});
