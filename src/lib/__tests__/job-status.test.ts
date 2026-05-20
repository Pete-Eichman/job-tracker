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
  it("returns neutral surface for SAVED", () => {
    expect(statusColor("SAVED")).toBe("bg-surface-2 text-fg-muted");
  });

  it("returns accent for in-flight stages", () => {
    const inflight = "bg-status-inflight-bg text-accent";
    expect(statusColor("APPLIED")).toBe(inflight);
    expect(statusColor("PHONE_SCREEN")).toBe(inflight);
    expect(statusColor("TECHNICAL")).toBe(inflight);
    expect(statusColor("ONSITE")).toBe(inflight);
  });

  it("returns positive for OFFER", () => {
    expect(statusColor("OFFER")).toBe("bg-status-positive-bg text-positive");
  });

  it("returns dim surface for terminal not-hired stages", () => {
    const dim = "bg-surface-2 text-fg-subtle";
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
