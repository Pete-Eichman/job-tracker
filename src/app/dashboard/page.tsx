import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { extractAndSaveJob } from "@/app/actions/extract-job";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const jobs = await prisma.job.findMany({
    where: { userId: session.user.id! },
    orderBy: { createdAt: "desc" },
  });

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <form action={logout}>
            <button type="submit" className="px-4 py-2 border rounded-md text-sm">
              Sign out
            </button>
          </form>
        </div>

        <form action={extractAndSaveJob} className="flex gap-2">
          <input
            name="url"
            type="url"
            required
            placeholder="Paste a job posting URL…"
            className="flex-1 px-3 py-2 border rounded-md text-sm"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-black text-white rounded-md text-sm hover:bg-zinc-800"
          >
            Extract
          </button>
        </form>

        <div className="space-y-4">
          {jobs.length === 0 && (
            <p className="text-sm text-gray-500">No jobs saved yet. Paste a URL above to get started.</p>
          )}
          {jobs.map((job) => (
            <div key={job.id} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-medium">{job.title}</h2>
                  <p className="text-sm text-gray-600">{job.company}{job.location ? ` · ${job.location}` : ""}</p>
                </div>
                <span className="text-xs px-2 py-1 bg-gray-100 rounded-full shrink-0">{job.status}</span>
              </div>
              {job.requiredSkills.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {job.requiredSkills.map((skill) => (
                    <span key={skill} className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                      {skill}
                    </span>
                  ))}
                </div>
              )}
              {job.sourceUrl && (
                <a href={job.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:underline">
                  {job.sourceUrl}
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
