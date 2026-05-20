import Link from "next/link";
import type { Job, Match } from "@/generated/prisma/client";
import { archiveJobAction, unarchiveJobAction } from "@/app/actions/archive-job";
import { StatusSelect } from "@/components/StatusSelect";
import { jobStaleness, formatRelativeDays, stalenessTextColor } from "@/lib/staleness";
import { needsAttention } from "@/lib/follow-up";
import { scoreColor } from "@/lib/score-color";

type JobWithMatches = Job & { matches: Match[] };

interface Props {
  job: JobWithMatches;
  archived: boolean;
  now: Date;
}

export function JobCard({ job, archived, now }: Props) {
  const match = job.matches[0];
  return (
    <div className="border rounded-lg p-4 space-y-2">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href={`/dashboard/jobs/${job.id}`}
            className="font-medium hover:underline"
          >
            {job.title}
          </Link>
          <p className="text-sm text-gray-600">
            {job.company}
            {job.location ? ` · ${job.location}` : ""}
          </p>
          <p
            className={`text-xs ${stalenessTextColor(jobStaleness(job.status, job.updatedAt))}`}
            title={job.updatedAt.toLocaleString()}
          >
            Last touched {formatRelativeDays(job.updatedAt)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {needsAttention(job.status, job.updatedAt, now) && (
            <span
              className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800 font-medium"
              title="This job hasn't been touched in a while"
            >
              Follow up
            </span>
          )}
          <span
            className={`text-sm font-semibold px-2 py-1 rounded-md ${
              match ? scoreColor(match.score) : "text-gray-400 bg-gray-50"
            }`}
            title={match ? "Match score / 100" : "Not scored yet"}
          >
            {match ? match.score : "—"}
          </span>
          <StatusSelect jobId={job.id} currentStatus={job.status} />
        </div>
      </div>
      {job.requiredSkills.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {job.requiredSkills.map((skill: string) => (
            <span
              key={skill}
              className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full"
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
          className="text-xs text-gray-400 hover:underline"
        >
          {job.sourceUrl}
        </a>
      )}
      <div className="flex justify-end">
        <form action={archived ? unarchiveJobAction : archiveJobAction}>
          <input type="hidden" name="jobId" value={job.id} />
          <button
            type="submit"
            className="text-xs text-gray-400 hover:text-gray-700"
          >
            {archived ? "Unarchive" : "Archive"}
          </button>
        </form>
      </div>
    </div>
  );
}
