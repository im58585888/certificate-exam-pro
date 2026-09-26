export const REPORT_REASONS = {
  wrong_answer: "The marked answer is wrong",
  unclear: "Question or options are unclear",
  outdated: "Outdated AWS information",
  typo: "Typo or formatting problem",
  other: "Something else",
} as const;

export type ReportReason = keyof typeof REPORT_REASONS;
