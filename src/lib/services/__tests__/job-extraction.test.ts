import { describe, it, expect } from "vitest";
import { stripHtml } from "@/lib/services/job-extraction";

describe("stripHtml", () => {
  it("removes script tags and their contents", () => {
    const result = stripHtml(
      "<p>Hello</p><script>alert('xss')</script><p>World</p>"
    );
    expect(result).toContain("Hello");
    expect(result).toContain("World");
    expect(result).not.toContain("alert");
  });

  it("removes style tags and their contents", () => {
    const result = stripHtml(
      "<style>p { color: red; }</style><p>visible</p>"
    );
    expect(result).toContain("visible");
    expect(result).not.toContain("color: red");
  });

  it("preserves text inside non-script/style tags and strips the tags themselves", () => {
    const result = stripHtml("<div><h1>Title</h1><p>Body text</p></div>");
    expect(result).toContain("Title");
    expect(result).toContain("Body text");
    expect(result).not.toContain("<");
    expect(result).not.toContain(">");
  });

  it("collapses runs of whitespace into single spaces", () => {
    const result = stripHtml("<p>a\n\n\n   b\t\tc</p>");
    expect(result).toBe("a b c");
  });

  it("trims leading and trailing whitespace", () => {
    const result = stripHtml("   <p>hello</p>   ");
    expect(result).toBe("hello");
  });

  it("caps output at 20000 characters", () => {
    const longHtml = "<p>" + "x".repeat(25000) + "</p>";
    const result = stripHtml(longHtml);
    expect(result.length).toBe(20000);
  });

  it("handles empty input", () => {
    expect(stripHtml("")).toBe("");
  });

  it("strips multiple adjacent script tags", () => {
    const result = stripHtml(
      "<p>first</p><script>SECRET_ONE</script><script>SECRET_TWO</script><p>second</p>"
    );
    expect(result).toContain("first");
    expect(result).toContain("second");
    expect(result).not.toContain("SECRET_ONE");
    expect(result).not.toContain("SECRET_TWO");
  });
});
