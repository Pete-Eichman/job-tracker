import { describe, it, expect } from "vitest";
import { csvCell, buildCsv } from "@/lib/csv";

describe("csvCell", () => {
  it("returns empty string for null", () => expect(csvCell(null)).toBe(""));
  it("returns empty string for undefined", () =>
    expect(csvCell(undefined)).toBe(""));
  it("stringifies numbers", () => expect(csvCell(42)).toBe("42"));
  it("stringifies booleans", () => expect(csvCell(true)).toBe("true"));
  it("passes plain strings through unchanged", () =>
    expect(csvCell("hello")).toBe("hello"));
  it("quotes strings containing a comma", () =>
    expect(csvCell("a,b")).toBe('"a,b"'));
  it("quotes strings containing a newline", () =>
    expect(csvCell("a\nb")).toBe('"a\nb"'));
  it('quotes strings containing a double-quote and escapes it', () =>
    expect(csvCell('say "hi"')).toBe('"say ""hi"""'));
  it("joins arrays with semicolons", () =>
    expect(csvCell(["TypeScript", "React"])).toBe("TypeScript; React"));
  it("quotes joined array if it contains a comma", () =>
    expect(csvCell(["a,b", "c"])).toBe('"a,b; c"'));
});

describe("csvCell — formula-injection guard", () => {
  it("neutralizes a leading = (formula)", () =>
    expect(csvCell("=HYPERLINK(\"http://evil\")")).toBe(
      '"\'=HYPERLINK(""http://evil"")"'
    ));
  it("neutralizes a leading + ", () =>
    expect(csvCell("+1+2")).toBe("'+1+2"));
  it("neutralizes a leading @ ", () =>
    expect(csvCell("@SUM(A1:A9)")).toBe("'@SUM(A1:A9)"));
  it("neutralizes a leading - (accepted trade-off for an export)", () =>
    expect(csvCell("-5")).toBe("'-5"));
  it("neutralizes a leading tab", () =>
    expect(csvCell("\t=1")).toBe("'\t=1"));
  it("neutralizes a leading carriage return", () =>
    expect(csvCell("\r=1")).toBe("'\r=1"));
  it("does not touch a dangerous char that is not first", () =>
    expect(csvCell("Acme = Corp")).toBe("Acme = Corp"));
  it("leaves an ordinary title untouched", () =>
    expect(csvCell("Senior Engineer")).toBe("Senior Engineer"));
  it("applies quoting after prefixing when the cell also has a comma", () =>
    expect(csvCell("=a,b")).toBe("\"'=a,b\""));
});

describe("buildCsv", () => {
  it("returns empty string for an empty array", () =>
    expect(buildCsv([])).toBe(""));

  it("produces a header line and one data line for a single row", () => {
    const result = buildCsv([{ title: "Engineer", company: "Acme" }]);
    expect(result).toBe("title,company\nEngineer,Acme");
  });

  it("produces N+1 lines for N rows", () => {
    const rows = [
      { a: "1", b: "2" },
      { a: "3", b: "4" },
      { a: "5", b: "6" },
    ];
    const lines = buildCsv(rows).split("\n");
    expect(lines).toHaveLength(4); // header + 3 data lines
  });

  it("preserves header order from the first row's keys", () => {
    const result = buildCsv([{ z: "1", a: "2" }]);
    expect(result.split("\n")[0]).toBe("z,a");
  });
});
