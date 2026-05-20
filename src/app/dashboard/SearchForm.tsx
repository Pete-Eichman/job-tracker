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
    <form action="/dashboard" className="flex gap-2">
      <input type="hidden" name="status" value={hiddenStatus} />
      <input type="hidden" name="sort" value={sort} />
      {filter.archived && <input type="hidden" name="archived" value="1" />}
      {filter.attention && <input type="hidden" name="attention" value="1" />}
      <input
        name="q"
        type="search"
        defaultValue={filter.query}
        placeholder="Search company or title…"
        className="flex-1 px-3 py-2 border rounded-md text-sm"
      />
      <button
        type="submit"
        className="px-3 py-2 border rounded-md text-sm hover:bg-gray-50"
      >
        Search
      </button>
      {filter.query !== "" && (
        <Link
          href={sortHref(sort, filter.statuses, "", filter.archived, filter.attention)}
          className="px-3 py-2 border rounded-md text-sm text-gray-600 hover:bg-gray-50"
          title="Clear search"
        >
          ×
        </Link>
      )}
    </form>
  );
}
