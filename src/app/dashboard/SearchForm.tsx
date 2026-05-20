import Link from "next/link";
import { sortHref } from "@/lib/job-sort";
import type { parseJobFilter } from "@/lib/job-filters";
import type { parseJobSort } from "@/lib/job-sort";

interface Props {
  filter: ReturnType<typeof parseJobFilter>;
  sort: ReturnType<typeof parseJobSort>;
  hiddenStatus: string;
}

export function SearchForm({ filter, sort, hiddenStatus }: Props) {
  return (
    <form
      action="/dashboard"
      className="flex items-center gap-1 border border-border rounded-lg bg-bg px-2.5 h-[30px] flex-1 min-w-0 focus-within:border-border-strong transition-[border-color] duration-150"
    >
      <input type="hidden" name="status" value={hiddenStatus} />
      <input type="hidden" name="sort" value={sort} />
      {filter.archived && <input type="hidden" name="archived" value="1" />}
      {filter.attention && <input type="hidden" name="attention" value="1" />}
      <button
        type="submit"
        className="shrink-0 text-fg-subtle hover:text-fg transition-colors duration-150"
        aria-label="Search"
      >
        <svg viewBox="0 0 14 14" fill="none" className="w-3.5 h-3.5" aria-hidden>
          <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.25" />
          <path
            d="M9.5 9.5L12 12"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
          />
        </svg>
      </button>
      <input
        name="q"
        type="search"
        defaultValue={filter.query}
        placeholder="Search…"
        className="flex-1 bg-transparent border-0 outline-none text-xs text-fg placeholder:text-fg-subtle min-w-0 h-full"
        style={{ fontSize: "16px" }}
      />
      {filter.query !== "" && (
        <Link
          href={sortHref(
            sort,
            filter.statuses,
            "",
            filter.archived,
            filter.attention
          )}
          className="shrink-0 text-fg-subtle hover:text-fg transition-colors duration-150"
          title="Clear search"
          aria-label="Clear search"
        >
          <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3" aria-hidden>
            <path
              d="M2 2l8 8M10 2L2 10"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </Link>
      )}
    </form>
  );
}
