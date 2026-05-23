import type { MatchExplanation } from "@/lib/services/match-explanation";

const TEASER_PATTERNS = [
  /want me to (go deeper|continue|elaborate|share more)/i,
  /there('?s| are) (more|other) (gaps?|issues?|areas?|things?)/i,
  /i (found|identified|noticed) more/i,
  /shall i/i,
  /happy to (share|dig|explore|discuss)/i,
  /would you like me to/i,
  /let me know if you('?d like| want)/i,
  /i can (also|further|dive|go)/i,
];

export function hasTeaserLanguage(text: string): boolean {
  return TEASER_PATTERNS.some((re) => re.test(text));
}

export function assertActionsPresent(result: MatchExplanation): void {
  for (const gap of result.gaps) {
    if (!gap.action || !gap.action.trim()) {
      throw new Error(
        `Gap for "${gap.requirement}" is missing a required action.`
      );
    }
  }
}

export function assertNoTeaserLanguage(result: MatchExplanation): void {
  const strings = [
    result.overall_note,
    ...result.gaps.flatMap((g) => [g.finding, g.action]),
  ];
  for (const text of strings) {
    if (hasTeaserLanguage(text)) {
      throw new Error(
        "Explanation contains cliffhanger/teaser language, which is not allowed."
      );
    }
  }
}
