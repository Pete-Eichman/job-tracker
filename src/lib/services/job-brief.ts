import type { JobModel } from "@/generated/prisma/models";

export type JobForBrief = Pick<
  JobModel,
  | "title"
  | "company"
  | "location"
  | "workMode"
  | "seniority"
  | "requiredSkills"
  | "niceToHaveSkills"
  | "responsibilities"
  | "salaryMin"
  | "salaryMax"
  | "salaryCurrency"
>;

function formatSalary(job: JobForBrief): string {
  if (job.salaryMin == null && job.salaryMax == null) return "Not specified";
  const cur = job.salaryCurrency ?? "";
  const min = job.salaryMin?.toNumber().toLocaleString() ?? "?";
  const max = job.salaryMax?.toNumber().toLocaleString() ?? "?";
  return `${cur} ${min} - ${max}`.trim();
}

export function buildJobBrief(job: JobForBrief): string {
  return [
    `Title: ${job.title}`,
    `Company: ${job.company}`,
    job.location ? `Location: ${job.location}` : null,
    job.workMode ? `Work mode: ${job.workMode}` : null,
    job.seniority ? `Seniority: ${job.seniority}` : null,
    `Salary: ${formatSalary(job)}`,
    job.requiredSkills.length
      ? `Required skills: ${job.requiredSkills.join(", ")}`
      : null,
    job.niceToHaveSkills.length
      ? `Nice-to-have skills: ${job.niceToHaveSkills.join(", ")}`
      : null,
    job.responsibilities.length
      ? `Responsibilities:\n- ${job.responsibilities.join("\n- ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}
