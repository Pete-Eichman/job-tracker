import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SaveResumeForm } from "./SaveResumeForm";
import { SetDefaultResumeButton } from "./SetDefaultResumeButton";

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

        <SaveResumeForm />

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
                <SetDefaultResumeButton resumeId={resume.id} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
