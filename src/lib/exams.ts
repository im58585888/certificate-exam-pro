export type DomainId = "secure" | "resilient" | "performance" | "cost";

export interface ExamInfo {
  slug: string;
  code: string;
  name: string;
  vendor: string;
  examQuestions: number;
  examMinutes: number;
  passingScaled: number;
  domains: { id: DomainId; name: string; weight: number }[];
}

export const EXAMS: Record<string, ExamInfo> = {
  "saa-c03": {
    slug: "saa-c03",
    code: "SAA-C03",
    name: "AWS Certified Solutions Architect – Associate",
    vendor: "AWS",
    examQuestions: 65,
    examMinutes: 130,
    passingScaled: 720,
    domains: [
      { id: "secure", name: "Design Secure Architectures", weight: 0.3 },
      { id: "resilient", name: "Design Resilient Architectures", weight: 0.26 },
      { id: "performance", name: "Design High-Performing Architectures", weight: 0.24 },
      { id: "cost", name: "Design Cost-Optimized Architectures", weight: 0.2 },
    ],
  },
};

export const FREE_TRIAL_QUESTIONS = 10;
/** Free questions allowed per network (hashed IP) per 30 days across all visitors and free accounts. */
export const TRIAL_NETWORK_CAP = Number(process.env.TRIAL_NETWORK_CAP) || 40;
export const PASS_PRICE_CENTS = 999;
export const PASS_DAYS = 30;

export function getExam(slug: string): ExamInfo | undefined {
  return EXAMS[slug];
}
