import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { RescoreButton } from "./RescoreButton";
import { EditJobForm } from "./EditJobForm";
import { DeleteCoverLetterButton } from "./DeleteCoverLetterButton";
import { ArchiveButton } from "@/app/dashboard/ArchiveButton";
import { CoverLetterGenerator } from "./CoverLetterGenerator";
import { pickResumeId } from "@/lib/job-resume";
import { buildMatchComparison } from "@/lib/match-comparison";
import { formatSpend } from "@/lib/pricing";
import { scoreColor } from "@/lib/score-color";

export default async function JobDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ resume?: string | string[] }>;
}) {
  const { id } = await params;
  const { resume: requestedResume } = await searchParams;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const resumes = await prisma.resume.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    select: { id: true, title: true, isDefault: true },
  });
  const selectedResumeId = pickResumeId(resumes, requestedResume);
  const selectedResume = resumes.find((r) => r.id === selectedResumeId) ?? null;

  const [job, allMatches, aiSpend] = await Promise.all([
    prisma.job.findFirst({
      where: { id, userId: session.user.id },
      include: {
        matches: selectedResumeId
          ? {
              where: { resumeId: selectedResumeId },
              take: 1,
              orderBy: { createdAt: "desc" },
            }
          : { take: 0 },
        coverLetters: {
          orderBy: { createdAt: "desc" },
          include: { resume: { select: { id: true, title: true } } },
        },
      },
    }),
    prisma.match.findMany({
      where: { jobId: id, resume: { userId: session.user.id } },
      orderBy: { createdAt: "desc" },
      select: {
        score: true,
        strengths: true,
        gaps: true,
        resumeId: true,
        resume: {
          select: { id: true, title: true, isDefault: true },
        },
      },
    }),
    prisma.aiUsage.aggregate({
      where: { jobId: id, userId: session.user.id },
      _sum: { costCents: true },
      _count: true,
    }),
  ]);
  if (!job) notFound();

  const match = job.matches[0];
  const coverLetters = job.coverLetters;
  const comparison = buildMatchComparison(allMatches);
  const aiSpendCents = aiSpend._sum.costCents ?? 0;
  const aiSpendCalls = aiSpend._count;

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link
          href="/dashboard"
          className="text-sm text-gray-600 hover:underline"
        >
          ← Back to dashboard
        </Link>

        <div className="space-y-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-semibold">{job.title}</h1>
              {job.archivedAt && (
                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                  Archived
                </span>
              )}
            </div>
            <p className="text-gray-600">
              {job.company}
              {job.location ? ` · ${job.location}` : ""}
              {job.workMode ? ` · ${job.workMode}` : ""}
            </p>
          </div>
          {(job.salaryMin || job.salaryMax) && (
            <p className="text-sm text-gray-600">
              Salary: {job.salaryCurrency ?? ""}{" "}
              {job.salaryMin?.toNumber().toLocaleString() ?? "?"} –{" "}
              {job.salaryMax?.toNumber().toLocaleString() ?? "?"}
            </p>
          )}
          {job.seniority && (
            <p className="text-sm text-gray-600">Seniority: {job.seniority}</p>
          )}
          {job.sourceUrl && (
            <a
              href={job.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-400 hover:underline break-all"
            >
              {job.sourceUrl}
            </a>
          )}
          {aiSpendCalls > 0 && (
            <p className="text-xs text-gray-500">
              AI spend: {formatSpend(aiSpendCents)} across {aiSpendCalls} call
              {aiSpendCalls === 1 ? "" : "s"}
            </p>
          )}
        </div>

        <section className="border rounded-lg p-4 space-y-4">
          <h2 className="font-medium">Application tracking</h2>
          <EditJobForm
            jobId={job.id}
            status={job.status}
            notes={job.notes}
            appliedAt={job.appliedAt ? job.appliedAt.toISOString().slice(0, 10) : null}
            updatedAt={job.updatedAt.toISOString()}
          />
        </section>

        {resumes.length >= 2 && (
          <section className="border rounded-lg p-3 space-y-2">
            <p className="text-xs text-gray-500">Resume</p>
            <div className="flex flex-wrap gap-2">
              {resumes.map((r) => {
                const active = r.id === selectedResumeId;
                return (
                  <Link
                    key={r.id}
                    href={`/dashboard/jobs/${job.id}?resume=${r.id}`}
                    className={`text-xs px-3 py-1 rounded-full border ${
                      active
                        ? "bg-gray-900 text-white border-gray-900"
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {r.title}
                    {r.isDefault ? " ★" : ""}
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {comparison.length >= 2 && (
          <section className="border rounded-lg p-4 space-y-3">
            <h2 className="font-medium">Compare matches</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 text-left">
                    <th className="font-normal pb-2">Resume</th>
                    <th className="font-normal pb-2">Score</th>
                    <th className="font-normal pb-2">Strengths</th>
                    <th className="font-normal pb-2">Gaps</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.map((row) => {
                    const selected = row.resumeId === selectedResumeId;
                    return (
                      <tr
                        key={row.resumeId}
                        className={selected ? "bg-gray-50" : ""}
                      >
                        <td className="py-2 pr-3">
                          <Link
                            href={`/dashboard/jobs/${job.id}?resume=${row.resumeId}`}
                            className={
                              selected ? "font-medium" : "hover:underline"
                            }
                          >
                            {row.resumeTitle}
                            {row.isDefault ? " ★" : ""}
                          </Link>
                        </td>
                        <td className="py-2 pr-3">
                          <span
                            className={`px-2 py-0.5 rounded ${scoreColor(row.score)}`}
                          >
                            {row.score}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-gray-700">
                          {row.strengthsCount}
                        </td>
                        <td className="py-2 text-gray-700">{row.gapsCount}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="border rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">
              {selectedResume
                ? `Match against ${selectedResume.title}`
                : "Match"}
            </h2>
            {selectedResume ? (
              <RescoreButton
                jobId={job.id}
                resumeId={selectedResume.id}
                hasMatch={!!match}
              />
            ) : (
              <Link
                href="/dashboard/resumes"
                className="text-xs px-3 py-1 border rounded-md hover:bg-gray-50"
              >
                Add a resume
              </Link>
            )}
          </div>

          {match ? (
            <>
              <div className="flex items-center gap-3">
                <span
                  className={`text-3xl font-semibold px-4 py-2 rounded-md ${scoreColor(match.score)}`}
                >
                  {match.score}
                </span>
                <span className="text-sm text-gray-500">/ 100</span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                {match.reasoning}
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Strengths</h3>
                  {match.strengths.length === 0 ? (
                    <p className="text-xs text-gray-500">None identified.</p>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {match.strengths.map((s, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-green-600">+</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-2">Gaps</h3>
                  {match.gaps.length === 0 ? (
                    <p className="text-xs text-gray-500">None identified.</p>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {match.gaps.map((g, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-yellow-700">−</span>
                          <span>{g}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-400">
                Scored {match.createdAt.toLocaleString()}
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-500">
              {selectedResume
                ? `Not scored yet. Click Score now to evaluate this job against ${selectedResume.title}.`
                : "Add a resume to score this job."}
            </p>
          )}
        </section>

        <section className="border rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Cover letters</h2>
            {selectedResume ? (
              <CoverLetterGenerator
                jobId={job.id}
                resumeId={selectedResume.id}
                hasExisting={coverLetters.length > 0}
              />
            ) : (
              <Link
                href="/dashboard/resumes"
                className="text-xs px-3 py-1 border rounded-md hover:bg-gray-50"
              >
                Add a resume
              </Link>
            )}
          </div>

          {coverLetters.length === 0 ? (
            <p className="text-sm text-gray-500">
              {selectedResume
                ? "No cover letters yet. Generate one to draft an application."
                : "Add a resume to draft a cover letter."}
            </p>
          ) : (
            <div className="space-y-3">
              {coverLetters.map((letter) => (
                <article
                  key={letter.id}
                  className="border rounded-md p-3 space-y-2 bg-gray-50/50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-gray-500">
                      {letter.createdAt.toLocaleString()}
                      {" · "}
                      {letter.resume?.title ?? "unknown resume"}
                    </p>
                    <DeleteCoverLetterButton coverLetterId={letter.id} />
                  </div>
                  <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed text-gray-800">
                    {letter.draft}
                  </pre>
                </article>
              ))}
            </div>
          )}
        </section>

        {job.requiredSkills.length > 0 && (
          <section>
            <h2 className="font-medium mb-2">Required skills</h2>
            <div className="flex flex-wrap gap-1">
              {job.requiredSkills.map((skill) => (
                <span
                  key={skill}
                  className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full"
                >
                  {skill}
                </span>
              ))}
            </div>
          </section>
        )}

        {job.niceToHaveSkills.length > 0 && (
          <section>
            <h2 className="font-medium mb-2">Nice to have</h2>
            <div className="flex flex-wrap gap-1">
              {job.niceToHaveSkills.map((skill) => (
                <span
                  key={skill}
                  className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full"
                >
                  {skill}
                </span>
              ))}
            </div>
          </section>
        )}

        {job.responsibilities.length > 0 && (
          <section>
            <h2 className="font-medium mb-2">Responsibilities</h2>
            <ul className="space-y-1 text-sm list-disc list-inside text-gray-700">
              {job.responsibilities.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </section>
        )}

        <div className="pt-4 border-t flex items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            {job.archivedAt
              ? `Archived ${job.archivedAt.toLocaleString()}`
              : "Archive this job to hide it from your active dashboard. History is preserved."}
          </p>
          <ArchiveButton
            jobId={job.id}
            archived={!!job.archivedAt}
            buttonClassName="text-xs px-3 py-1 border rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
      </div>
    </div>
  );
}
