import Link from "next/link";
import {
  presetHref,
  viewHref,
  FILTER_PRESETS,
  type FilterPreset,
  type JobFilter,
} from "@/lib/job-filters";
import { SearchForm } from "./SearchForm";
import { SortSelect } from "./SortSelect";
import type { JobSort } from "@/lib/job-sort";

const PRESET_LABELS: Record<FilterPreset, string> = {
  all: "All",
  active: "In progress",
  saved: "Saved",
  offers: "Offers",
  closed: "Closed",
  attention: "Needs attention",
};

interface Props {
  filter: JobFilter;
  sort: JobSort;
  hiddenStatus: string;
  active: FilterPreset | null;
}

export function FilterBar({ filter, sort, hiddenStatus, active }: Props) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3 space-y-3">
      {/* Zone 0: Archived scope toggle — above the status tabs, applies to all of them */}
      <div>
        <Link
          href={viewHref(
            !filter.archived,
            filter.statuses,
            filter.query,
            sort,
            filter.attention
          )}
          className={`inline-flex items-center px-2.5 py-1 text-xs rounded-md transition-colors duration-150 ${
            filter.archived
              ? "bg-accent-soft text-accent font-medium"
              : "text-fg-muted hover:text-fg hover:bg-surface-2"
          }`}
        >
          Archived
        </Link>
      </div>

      {/* Zone 1: Status tab strip — scrolls horizontally, never wraps */}
      <div className="relative">
        <div className="flex overflow-x-auto no-scrollbar gap-0.5 py-0.5">
          {(Object.keys(FILTER_PRESETS) as FilterPreset[]).map((preset) => {
            const isActive = active === preset;
            return (
              <Link
                key={preset}
                href={presetHref(preset, filter.query, sort, filter.archived)}
                className={`px-3 py-1.5 text-xs whitespace-nowrap shrink-0 rounded-md transition-colors duration-150 ${
                  isActive
                    ? "bg-accent-soft text-accent font-medium"
                    : "text-fg-muted hover:text-fg hover:bg-surface-2"
                }`}
              >
                {PRESET_LABELS[preset]}
              </Link>
            );
          })}
        </div>
        {/* Right-edge gradient hints at more tabs to scroll */}
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-surface to-transparent"
          aria-hidden
        />
      </div>

      {/* Zone 2: sort compact, search fills remaining width */}
      <div className="flex items-center gap-2">
        <SortSelect sort={sort} filter={filter} />
        <SearchForm filter={filter} sort={sort} hiddenStatus={hiddenStatus} />
      </div>
    </div>
  );
}
