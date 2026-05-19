export const AI_MODELS = {
  default: "claude-sonnet-4-6",
} as const;

export type AiModel = (typeof AI_MODELS)[keyof typeof AI_MODELS];
