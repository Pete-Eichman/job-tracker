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

export function FilterBar({ filter, sort, hiddenStatus, active }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center text-xs">
        <span className="text-gray-500">View:</span>
        <Link
          href={viewHref(false, filter.statuses, filter.query, sort, filter.attention)}
          className={`px-3 py-1 rounded-full border ${
            !filter.archived
              ? "bg-black text-white border-black"
              : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
          }`}
        >
          Active
        </Link>
        <Link
          href={viewHref(true, filter.statuses, filter.query, sort, filter.attention)}
          className={`px-3 py-1 rounded-full border ${
            filter.archived
              ? "bg-black text-white border-black"
              : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
          }`}
        >
          Archived
        </Link>
      </div>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(FILTER_PRESETS) as FilterPreset[]).map((preset) => {
          const isActive = active === preset;
          return (
            <Link
              key={preset}
              href={presetHref(preset, filter.query, sort, filter.archived)}
              className={`text-xs px-3 py-1 rounded-full border ${
                isActive
                  ? "bg-black text-white border-black"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {PRESET_LABELS[preset]}
            </Link>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2 items-center text-xs">
        <span className="text-gray-500">Sort:</span>
        {JOB_SORT_VALUES.map((value) => {
          const isActive = sort === value;
          return (
            <Link
              key={value}
              href={sortHref(value, filter.statuses, filter.query, filter.archived, filter.attention)}
              className={`px-2 py-1 rounded-full border ${
                isActive
                  ? "bg-gray-800 text-white border-gray-800"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {sortLabel(value)}
            </Link>
          );
        })}
      </div>
      <SearchForm filter={filter} sort={sort} hiddenStatus={hiddenStatus} />
    </div>
  );
}
