export function scoreColor(score: number): string {
  if (score >= 75) return "text-green-700 bg-green-50";
  if (score >= 50) return "text-yellow-700 bg-yellow-50";
  return "text-gray-700 bg-gray-100";
}
