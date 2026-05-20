import Link from "next/link";
import {
  presetHref,
  viewHref,
  FILTER_PRESETS,
  type FilterPreset,
} from "@/lib/job-filters";
import { sortHref, sortLabel, JOB_SORT_VALUES } from "@/lib/job-sort";
import { SearchForm } from "./SearchForm";
import type { parseJobFilter, activePreset } from "@/lib/job-filters";
import type { parseJobSort } from "@/lib/job-sort";

const PRESET_LABELS: Record<FilterPreset, string> = {
  all: "All",
  active: "Active",
  saved: "Saved",
  offers: "Offers",
  closed: "Closed",
  attention: "Needs attention",
};

interface Props {
  filter: ReturnType<typeof parseJobFilter>;
  sort: ReturnType<typeof parseJobSort>;
  hiddenStatus: string;
  active: ReturnType<typeof activePreset>;
}

const activePill =
  "bg-accent text-accent-fg border-accent";
const inactivePill =
  "text-fg-muted border-border hover:text-fg hover:bg-surface-2";

export function FilterBar({ filter, sort, hiddenStatus, active }: Props) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3 space-y-2.5">
      {/* Row 1: View toggle + status presets */}
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Segmented view toggle */}
        <div className="flex rounded-lg overflow-hidden border border-border text-xs shrink-0">
          <Link
            href={viewHref(
              false,
              filter.statuses,
              filter.query,
              sort,
              filter.attention
            )}
            className={`px-3 py-1.5 transition-colors duration-150 ${
              !filter.archived
                ? "bg-accent text-accent-fg"
                : "text-fg-muted hover:text-fg hover:bg-surface-2"
            }`}
          >
            Active
          </Link>
          <Link
            href={viewHref(
              true,
              filter.statuses,
              filter.query,
              sort,
              filter.attention
            )}
            className={`px-3 py-1.5 border-l border-border transition-colors duration-150 ${
              filter.archived
                ? "bg-accent text-accent-fg"
                : "text-fg-muted hover:text-fg hover:bg-surface-2"
            }`}
          >
            Archived
          </Link>
        </div>

        <div className="w-px h-4 bg-border mx-0.5 shrink-0" aria-hidden />

        {/* Status preset pills */}
        {(Object.keys(FILTER_PRESETS) as FilterPreset[]).map((preset) => {
          const isActive = active === preset;
          return (
            <Link
              key={preset}
              href={presetHref(preset, filter.query, sort, filter.archived)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors duration-150 ${
                isActive ? activePill : inactivePill
              }`}
            >
              {PRESET_LABELS[preset]}
            </Link>
          );
        })}
      </div>

      {/* Row 2: Sort pills + search */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-fg-subtle uppercase tracking-wide shrink-0">
          Sort
        </span>

        {JOB_SORT_VALUES.map((value) => {
          const isActive = sort === value;
          return (
            <Link
              key={value}
              href={sortHref(
                value,
                filter.statuses,
                filter.query,
                filter.archived,
                filter.attention
              )}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors duration-150 ${
                isActive
                  ? "text-accent border-accent font-medium"
                  : inactivePill
              }`}
            >
              {sortLabel(value)}
            </Link>
          );
        })}

        <div className="contents sm:flex sm:flex-1 sm:justify-end">
          <SearchForm filter={filter} sort={sort} hiddenStatus={hiddenStatus} />
        </div>
      </div>
    </div>
  );
}
