type ResumeMin = { id: string; isDefault: boolean };

export function pickResumeId(
  resumes: ResumeMin[],
  requested: string | string[] | undefined
): string | null {
  if (resumes.length === 0) return null;
  const r = Array.isArray(requested) ? requested[0] : requested;
  if (r && resumes.some((x) => x.id === r)) return r;
  const def = resumes.find((x) => x.isDefault);
  return def ? def.id : resumes[0].id;
}
