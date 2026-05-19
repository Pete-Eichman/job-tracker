type MatchMin = {
  score: number;
  strengths: string[];
  gaps: string[];
  resumeId: string;
  resume: { id: string; title: string; isDefault: boolean };
};

export type MatchComparisonRow = {
  resumeId: string;
  resumeTitle: string;
  isDefault: boolean;
  score: number;
  strengthsCount: number;
  gapsCount: number;
};

export function buildMatchComparison(
  matches: MatchMin[]
): MatchComparisonRow[] {
  return [...matches]
    .sort((a, b) => b.score - a.score)
    .map((m) => ({
      resumeId: m.resumeId,
      resumeTitle: m.resume.title,
      isDefault: m.resume.isDefault,
      score: m.score,
      strengthsCount: m.strengths.length,
      gapsCount: m.gaps.length,
    }));
}
