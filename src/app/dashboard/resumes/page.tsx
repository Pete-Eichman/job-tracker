import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SaveResumeForm } from "./SaveResumeForm";
import { SetDefaultResumeButton } from "./SetDefaultResumeButton";

const navButtonClass =
  "px-3 py-1.5 border border-border rounded-lg text-xs text-fg-muted hover:text-fg hover:bg-surface-2 transition-colors duration-150";

export default async function ResumesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const resumes = await prisma.resume.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen px-4 py-6 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-fg">Resumes</h1>
          <Link href="/dashboard" className={navButtonClass}>
            ← Back to dashboard
          </Link>
        </div>

        <SaveResumeForm />

        <div className="space-y-3">
          {resumes.length === 0 && (
            <p className="text-sm text-fg-subtle">
              No resumes yet. Add one above to enable match scoring.
            </p>
          )}
          {resumes.map((resume) => (
            <div
              key={resume.id}
              className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-fg truncate">{resume.title}</h3>
                  {resume.isDefault && (
                    <span className="text-xs px-2 py-0.5 bg-status-positive-bg text-positive rounded-full shrink-0">
                      default
                    </span>
                  )}
                </div>
                <p className="text-xs text-fg-subtle mt-1">
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
