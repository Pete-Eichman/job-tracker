import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { saveResume, setDefaultResume } from "@/app/actions/save-resume";
import { SubmitButton } from "@/components/SubmitButton";

export default async function ResumesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const resumes = await prisma.resume.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Resumes</h1>
          <Link
            href="/dashboard"
            className="text-sm text-gray-600 hover:underline"
          >
            ← Back to dashboard
          </Link>
        </div>

        <form action={saveResume} className="space-y-3 border rounded-lg p-4">
          <h2 className="font-medium">Add a resume</h2>
          <input
            name="title"
            type="text"
            required
            placeholder="e.g. Senior Backend Engineer 2025"
            className="w-full px-3 py-2 border rounded-md text-sm"
          />
          <textarea
            name="rawText"
            required
            rows={12}
            placeholder="Paste your resume as plain text…"
            className="w-full px-3 py-2 border rounded-md text-sm font-mono"
          />
          <p className="text-xs text-gray-500">
            Your first resume is set as the default. Match scoring uses the
            default resume.
          </p>
          <SubmitButton
            className="px-4 py-2 bg-black text-white rounded-md text-sm hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
            pendingLabel="Saving…"
          >
            Save resume
          </SubmitButton>
        </form>

        <div className="space-y-3">
          {resumes.length === 0 && (
            <p className="text-sm text-gray-500">
              No resumes yet. Add one above to enable match scoring.
            </p>
          )}
          {resumes.map((resume) => (
            <div
              key={resume.id}
              className="border rounded-lg p-4 flex items-start justify-between gap-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium truncate">{resume.title}</h3>
                  {resume.isDefault && (
                    <span className="text-xs px-2 py-0.5 bg-green-50 text-green-700 rounded-full shrink-0">
                      default
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Added {resume.createdAt.toLocaleDateString()} ·{" "}
                  {resume.rawText.length.toLocaleString()} chars
                </p>
              </div>
              {!resume.isDefault && (
                <form action={setDefaultResume}>
                  <input type="hidden" name="resumeId" value={resume.id} />
                  <SubmitButton
                    className="text-xs px-3 py-1 border rounded-md hover:bg-gray-50 shrink-0 disabled:opacity-50"
                  >
                    Set as default
                  </SubmitButton>
                </form>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
