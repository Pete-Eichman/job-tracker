// A leading one of these makes Excel / Google Sheets interpret the cell as a
// formula. Job fields (title, company, notes) come from scraped pages, so a
// crafted posting could plant e.g. =HYPERLINK(...) that executes on open.
const FORMULA_TRIGGERS = new Set(["=", "+", "-", "@", "\t", "\r"]);

export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let str = Array.isArray(value) ? value.join("; ") : String(value);
  // Neutralize formula injection first: prefix an apostrophe so the value is
  // treated as text. This is an export format, not a numeric round-trip, so
  // prefixing a leading "-" (etc.) is acceptable and the safe default.
  if (str.length > 0 && FORMULA_TRIGGERS.has(str[0])) {
    str = `'${str}`;
  }
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => csvCell(row[h])).join(",")),
  ].join("\n");
}
