import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { extractAndSaveJob } from "@/app/actions/extract-job";
import { SubmitButton } from "@/components/SubmitButton";

function scoreColor(score: number): string {
  if (score >= 75) return "text-green-700 bg-green-50";
  if (score >= 50) return "text-yellow-700 bg-yellow-50";
  return "text-gray-700 bg-gray-100";
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = session.user.id!;

  const [jobs, defaultResume] = await Promise.all([
    prisma.job.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        matches: { take: 1, orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.resume.findFirst({
      where: { userId, isDefault: true },
      select: { id: true },
    }),
  ]);

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/resumes"
              className="px-4 py-2 border rounded-md text-sm hover:bg-gray-50"
            >
              Resumes
            </Link>
            <form action={logout}>
              <SubmitButton className="px-4 py-2 border rounded-md text-sm disabled:opacity-50">
                Sign out
              </SubmitButton>
            </form>
          </div>
        </div>

        {!defaultResume && (
          <div className="border border-yellow-200 bg-yellow-50 text-yellow-900 rounded-md px-3 py-2 text-sm">
            Add a resume to enable match scoring.{" "}
            <Link href="/dashboard/resumes" className="underline">
              Add one now
            </Link>
            .
          </div>
        )}

        <form action={extractAndSaveJob} className="flex gap-2">
          <input
            name="url"
            type="url"
            required
            placeholder="Paste a job posting URL…"
            className="flex-1 px-3 py-2 border rounded-md text-sm"
          />
          <SubmitButton
            className="px-4 py-2 bg-black text-white rounded-md text-sm hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
            pendingLabel="Extracting…"
          >
            Extract
          </SubmitButton>
        </form>

        <div className="space-y-4">
          {jobs.length === 0 && (
            <p className="text-sm text-gray-500">
              No jobs saved yet. Paste a URL above to get started.
            </p>
          )}
          {jobs.map((job) => {
            const match = job.matches[0];
            return (
              <div key={job.id} className="border rounded-lg p-4 space-y-2">
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
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-sm font-semibold px-2 py-1 rounded-md ${
                        match ? scoreColor(match.score) : "text-gray-400 bg-gray-50"
                      }`}
                      title={match ? "Match score / 100" : "Not scored yet"}
                    >
                      {match ? match.score : "—"}
                    </span>
                    <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
                      {job.status}
                    </span>
                  </div>
                </div>
                {job.requiredSkills.length > 0 && (
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
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
