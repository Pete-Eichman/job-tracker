import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { rescoreJobAction } from "@/app/actions/score-job";
import {
  generateCoverLetterAction,
  deleteCoverLetterAction,
} from "@/app/actions/cover-letter";
import { SubmitButton } from "@/components/SubmitButton";

function scoreColor(score: number): string {
  if (score >= 75) return "text-green-700 bg-green-50";
  if (score >= 50) return "text-yellow-700 bg-yellow-50";
  return "text-gray-700 bg-gray-100";
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const job = await prisma.job.findFirst({
    where: { id, userId: session.user.id },
    include: {
      matches: { take: 1, orderBy: { createdAt: "desc" } },
      coverLetters: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!job) notFound();

  const match = job.matches[0];
  const coverLetters = job.coverLetters;

  const defaultResume = await prisma.resume.findFirst({
    where: { userId: session.user.id, isDefault: true },
    select: { id: true },
  });

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
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">{job.title}</h1>
              <p className="text-gray-600">
                {job.company}
                {job.location ? ` · ${job.location}` : ""}
                {job.workMode ? ` · ${job.workMode}` : ""}
              </p>
            </div>
            <span className="text-xs px-2 py-1 bg-gray-100 rounded-full shrink-0">
              {job.status}
            </span>
          </div>
          {(job.salaryMin || job.salaryMax) && (
            <p className="text-sm text-gray-600">
              Salary: {job.salaryCurrency ?? ""}{" "}
              {job.salaryMin?.toLocaleString() ?? "?"} –{" "}
              {job.salaryMax?.toLocaleString() ?? "?"}
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
        </div>

        <section className="border rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Match against default resume</h2>
            {defaultResume ? (
              <form action={rescoreJobAction}>
                <input type="hidden" name="jobId" value={job.id} />
                <SubmitButton
                  className="text-xs px-3 py-1 border rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  pendingLabel="Scoring…"
                >
                  {match ? "Rescore" : "Score now"}
                </SubmitButton>
              </form>
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
              {defaultResume
                ? "Not scored yet. Click Score now to evaluate this job against your default resume."
                : "Add a default resume to score this job."}
            </p>
          )}
        </section>

        <section className="border rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Cover letters</h2>
            {defaultResume ? (
              <form action={generateCoverLetterAction}>
                <input type="hidden" name="jobId" value={job.id} />
                <SubmitButton
                  className="text-xs px-3 py-1 border rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  pendingLabel="Drafting…"
                >
                  {coverLetters.length === 0 ? "Generate" : "Regenerate"}
                </SubmitButton>
              </form>
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
              {defaultResume
                ? "No cover letters yet. Generate one to draft an application."
                : "Add a default resume to draft a cover letter."}
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
                    </p>
                    <form action={deleteCoverLetterAction}>
                      <input
                        type="hidden"
                        name="coverLetterId"
                        value={letter.id}
                      />
                      <SubmitButton
                        className="text-xs text-gray-500 hover:text-red-600 hover:underline disabled:opacity-50"
                        pendingLabel="Deleting…"
                      >
                        Delete
                      </SubmitButton>
                    </form>
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
      </div>
    </div>
  );
}
