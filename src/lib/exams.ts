/** Domain ids are unique across exams, so a question's domain also tells you its exam. */
export type DomainId = string;

export interface ExamInfo {
  slug: string;
  code: string;
  name: string;
  /** Short name for cards and menus, e.g. "Solutions Architect – Associate". */
  shortName: string;
  vendor: string;
  level: "Foundational" | "Associate" | "Professional" | "Specialty";
  blurb: string;
  examQuestions: number;
  examMinutes: number;
  passingScaled: number;
  /** short: compact label for chips and pills. */
  domains: { id: DomainId; name: string; short: string; weight: number }[];
}

export const EXAMS: Record<string, ExamInfo> = {
  "clf-c02": {
    slug: "clf-c02",
    code: "CLF-C02",
    name: "AWS Certified Cloud Practitioner",
    shortName: "Cloud Practitioner",
    vendor: "AWS",
    level: "Foundational",
    blurb: "Cloud concepts, security and compliance, core AWS services, and billing, pricing and support.",
    examQuestions: 65,
    examMinutes: 90,
    passingScaled: 700,
    domains: [
      { id: "concepts", name: "Cloud Concepts", short: "Cloud Concepts", weight: 0.24 },
      { id: "compliance", name: "Security and Compliance", short: "Security & Compliance", weight: 0.3 },
      { id: "technology", name: "Cloud Technology and Services", short: "Technology & Services", weight: 0.34 },
      { id: "billing", name: "Billing, Pricing, and Support", short: "Billing & Support", weight: 0.12 },
    ],
  },
  "saa-c03": {
    slug: "saa-c03",
    code: "SAA-C03",
    name: "AWS Certified Solutions Architect – Associate",
    shortName: "Solutions Architect – Associate",
    vendor: "AWS",
    level: "Associate",
    blurb: "Design secure, resilient, high-performing and cost-optimized architectures on AWS.",
    examQuestions: 65,
    examMinutes: 130,
    passingScaled: 720,
    domains: [
      { id: "secure", name: "Design Secure Architectures", short: "Secure", weight: 0.3 },
      { id: "resilient", name: "Design Resilient Architectures", short: "Resilient", weight: 0.26 },
      { id: "performance", name: "Design High-Performing Architectures", short: "High-Performing", weight: 0.24 },
      { id: "cost", name: "Design Cost-Optimized Architectures", short: "Cost-Optimized", weight: 0.2 },
    ],
  },
  "aif-c01": {
    slug: "aif-c01",
    code: "AIF-C01",
    name: "AWS Certified AI Practitioner",
    shortName: "AI Practitioner",
    vendor: "AWS",
    level: "Foundational",
    blurb: "AI, ML and generative AI fundamentals, Amazon Bedrock and agents, prompt engineering, and responsible, secure AI.",
    examQuestions: 65,
    examMinutes: 90,
    passingScaled: 700,
    domains: [
      { id: "fundamentals", name: "Fundamentals of AI and ML", short: "AI & ML Fundamentals", weight: 0.2 },
      { id: "genai", name: "Fundamentals of Generative AI", short: "GenAI Fundamentals", weight: 0.24 },
      { id: "applications", name: "Applications of Foundation Models", short: "FM Applications", weight: 0.28 },
      { id: "responsible", name: "Guidelines for Responsible AI", short: "Responsible AI", weight: 0.14 },
      { id: "security", name: "Security, Compliance, and Governance for AI Solutions", short: "Security & Governance", weight: 0.14 },
    ],
  },
};

/** Display order on the site. */
export const EXAM_LIST: ExamInfo[] = [EXAMS["clf-c02"], EXAMS["aif-c01"], EXAMS["saa-c03"]];
export const DEFAULT_EXAM = "saa-c03";

export const FREE_TRIAL_QUESTIONS = 10;
/** Free questions allowed per network (hashed IP) per exam per 30 days across all visitors and free accounts. */
export const TRIAL_NETWORK_CAP = Number(process.env.TRIAL_NETWORK_CAP) || 40;
/** One pass unlocks one exam. */
export const PASS_PRICE_CENTS = 999;
export const PASS_DAYS = 30;

export function getExam(slug: string): ExamInfo | undefined {
  return EXAMS[slug];
}

/** Full name for any domain id across all exams. */
export const DOMAIN_NAME: Record<string, string> = Object.fromEntries(
  Object.values(EXAMS).flatMap((e) => e.domains.map((d) => [d.id, d.name])),
);

/** Compact label for any domain id across all exams. */
export const DOMAIN_SHORT: Record<string, string> = Object.fromEntries(
  Object.values(EXAMS).flatMap((e) => e.domains.map((d) => [d.id, d.short])),
);
