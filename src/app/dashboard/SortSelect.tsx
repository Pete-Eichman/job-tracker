"use client";

import { useRouter } from "next/navigation";
import { JOB_SORT_VALUES, sortLabel, sortHref } from "@/lib/job-sort";
import type { JobSort } from "@/lib/job-sort";
import type { JobFilter } from "@/lib/job-filters";

interface Props {
  sort: JobSort;
  filter: JobFilter;
}

export function SortSelect({ sort, filter }: Props) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <label
        htmlFor="sort-select"
        className="hidden sm:block text-[11px] text-fg-subtle uppercase tracking-wide whitespace-nowrap"
      >
        Sort
      </label>
      <select
        id="sort-select"
        value={sort}
        onChange={(e) => {
          router.push(
            sortHref(
              e.target.value as JobSort,
              filter.statuses,
              filter.query,
              filter.archived,
              filter.attention
            )
          );
        }}
        className="w-auto bg-surface-2 border border-border rounded-lg text-fg-muted px-2.5 py-1 focus:outline-none focus:border-border-strong cursor-pointer"
        style={{ fontSize: "16px" }}
      >
        {JOB_SORT_VALUES.map((value) => (
          <option key={value} value={value}>
            {sortLabel(value)}
          </option>
        ))}
      </select>
    </div>
  );
}
