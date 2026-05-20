import Link from "next/link";
import type { Job, Match } from "@/generated/prisma/client";
import { ArchiveButton } from "./ArchiveButton";
import { StatusSelect } from "@/components/StatusSelect";
import {
  jobStaleness,
  formatRelativeDays,
  stalenessTextColor,
} from "@/lib/staleness";
import { needsAttention } from "@/lib/follow-up";
import { scoreRingColor } from "@/lib/score-color";

type JobWithMatches = Job & { matches: Match[] };

interface Props {
  job: JobWithMatches;
  archived: boolean;
  now: Date;
}

function friendlyDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function ScoreRing({ score }: { score: number | null }) {
  const r = 14;
  const cx = 18;
  const circumference = 2 * Math.PI * r;
  const offset = score != null ? circumference * (1 - score / 100) : 0;

  const ringColor =
    score != null ? scoreRingColor(score) : "var(--border-strong)";
  const textColor =
    score != null ? scoreRingColor(score) : "var(--fg-subtle)";

  return (
    <div
      className="relative w-9 h-9 shrink-0"
      title={score != null ? `Match score: ${score}/100` : "Not scored yet"}
    >
      <svg
        width="36"
        height="36"
        viewBox="0 0 36 36"
        className="-rotate-90"
        aria-hidden
      >
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth="2.5"
        />
        {score != null ? (
          <circle
            cx={cx}
            cy={cx}
            r={r}
            fill="none"
            stroke={ringColor}
            strokeWidth="2.5"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        ) : (
          <circle
            cx={cx}
            cy={cx}
            r={r}
            fill="none"
            stroke="var(--border-strong)"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
        )}
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center font-mono text-[10px] leading-none tabular-nums font-medium"
        style={{ color: textColor }}
      >
        {score ?? "—"}
      </span>
    </div>
  );
}

export function JobCard({ job, archived, now }: Props) {
  const match = job.matches[0];
  const staleness = jobStaleness(job.status, job.updatedAt);

  return (
    <div className="bg-surface border border-border rounded-xl p-5 space-y-3 hover:bg-surface-2 hover:border-border-strong transition-colors duration-200">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-0.5">
          <Link
            href={`/dashboard/jobs/${job.id}`}
            className="text-lg font-semibold text-fg hover:text-accent transition-colors duration-150 leading-snug"
          >
            {job.title}
          </Link>
          <p className="text-sm text-fg-muted">
            {job.company}
            {job.location ? ` · ${job.location}` : ""}
          </p>
          <p
            className={`text-xs font-mono tabular-nums ${stalenessTextColor(staleness)}`}
            title={job.updatedAt.toLocaleString()}
          >
            Last touched {formatRelativeDays(job.updatedAt)}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {needsAttention(job.status, job.updatedAt, now) && (
            <span
              className="text-xs px-2 py-0.5 rounded-full bg-accent-soft text-accent border border-accent/20 font-medium"
              title="This job hasn't been touched in a while"
            >
              Follow up
            </span>
          )}
          <ScoreRing score={match?.score ?? null} />
          <StatusSelect jobId={job.id} currentStatus={job.status} />
          <ArchiveButton jobId={job.id} archived={archived} iconOnly />
        </div>
      </div>

      {job.requiredSkills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {job.requiredSkills.map((skill: string) => (
            <span
              key={skill}
              className="text-xs px-2 py-0.5 bg-surface-2 text-fg-muted border border-border rounded-md"
            >
              {skill}
            </span>
          ))}
        </div>
      )}

      {job.sourceUrl && (
        <a
          href={job.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-fg-subtle hover:text-fg-muted transition-colors duration-150"
        >
          <svg
            viewBox="0 0 12 12"
            fill="none"
            className="w-3 h-3 shrink-0"
            aria-hidden
          >
            <path
              d="M5 2H2a1 1 0 00-1 1v7a1 1 0 001 1h7a1 1 0 001-1V7"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
            />
            <path
              d="M8 1h3m0 0v3m0-3L5.5 6.5"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="truncate max-w-[280px]">
            {friendlyDomain(job.sourceUrl)}
          </span>
        </a>
      )}
    </div>
  );
}
