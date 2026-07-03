# M-3 — CSV formula-injection guard

## The problem

The jobs CSV export (`/api/jobs/export` → `buildCsv` → `csvCell`) correctly quoted
commas, quotes, and newlines, but did nothing about **formula injection**. A cell
whose first character is `=`, `+`, `-`, `@`, tab, or carriage return is
interpreted as a *formula* by Excel and Google Sheets when the file is opened.

Because job fields (title, company, notes) are populated from **scraped
external pages**, a crafted posting could plant something like
`=HYPERLINK("http://evil","click")` or a command that exfiltrates other cells —
and it would execute on the victim's machine when they open their own export.
That's the classic CSV / "formula" injection.

## The fix

In `src/lib/csv.ts`, before the existing quoting logic, `csvCell` now prefixes a
single apostrophe (`'`) to any value that begins with a formula trigger. The
apostrophe forces the spreadsheet to treat the cell as text; the existing
comma/quote/newline quoting is then applied unchanged.

```ts
const FORMULA_TRIGGERS = new Set(["=", "+", "-", "@", "\t", "\r"]);
// ...prefix "'" when str[0] is a trigger, then quote as before.
```

## A deliberate trade-off

A leading `-` is treated as a trigger, so a value like `-5` becomes `'-5`. This
is intentional: it's the safe default, and the file is an **export for viewing**,
not a numeric round-trip — nothing reads these cells back as numbers. Blocking
`-` matters because payloads like `-2+3+cmd|...` are a real injection vector.

## Verification

- Extended `src/lib/__tests__/csv.test.ts` (23 tests total): each trigger is
  neutralized (`=`, `+`, `@`, `-`, leading tab, leading CR); a dangerous char
  that isn't first is left alone; ordinary titles are untouched; and prefixing
  composes correctly with quoting when the cell also contains a comma.
- Full suite 370 passing; `tsc`, ESLint, and `next build` clean.
