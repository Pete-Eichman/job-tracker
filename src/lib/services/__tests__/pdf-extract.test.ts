import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("unpdf", () => ({
  extractText: vi.fn(),
}));

import { extractText } from "unpdf";
import { extractPdfText } from "@/lib/services/pdf-extract";

const mockExtractText = vi.mocked(extractText);

describe("extractPdfText", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns trimmed text from a readable PDF", async () => {
    mockExtractText.mockResolvedValue({ text: "  John Doe\nSoftware Engineer  " } as never);

    const result = await extractPdfText(new Uint8Array([1, 2, 3]));

    expect(result).toBe("John Doe\nSoftware Engineer");
    expect(mockExtractText).toHaveBeenCalledWith(expect.any(Uint8Array), { mergePages: true });
  });

  it("returns trimmed text when unpdf returns an array of page strings", async () => {
    mockExtractText.mockResolvedValue({ text: "  Page one content  " } as never);

    const result = await extractPdfText(new Uint8Array([1, 2, 3]));

    expect(result).toBe("Page one content");
  });

  it("throws when unpdf throws (corrupt or unreadable PDF)", async () => {
    mockExtractText.mockRejectedValue(new Error("Invalid PDF structure"));

    await expect(extractPdfText(new Uint8Array([0xff, 0x00]))).rejects.toThrow();
  });
});
