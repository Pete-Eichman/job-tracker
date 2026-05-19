import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildCsv } from "@/lib/csv";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  const userId = session.user.id;

  const jobs = await prisma.job.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      company: true,
      location: true,
      workMode: true,
      seniority: true,
      status: true,
      appliedAt: true,
      archivedAt: true,
      salaryMin: true,
      salaryMax: true,
      salaryCurrency: true,
      requiredSkills: true,
      niceToHaveSkills: true,
      responsibilities: true,
      notes: true,
      sourceUrl: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const csv = buildCsv(jobs);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="jobs.csv"',
    },
  });
}
