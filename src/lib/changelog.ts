// Public record of changes to the question banks, shown at /changelog and as "Updated <date>" on each changed
// question. Add an entry whenever questions are added, rewritten or retired. Newest first.

export interface ChangeEntry {
  date: string; // YYYY-MM-DD
  exams: ("saa-c03" | "clf-c02" | "aif-c01")[];
  title: string;
  body: string;
  /** Questions this change rewrote, so they can show "Updated <date>". */
  questionIds?: string[];
}

export const CHANGELOG: ChangeEntry[] = [
  {
    date: "2026-11-26",
    exams: ["aif-c01", "clf-c02"],
    title: "Replaced Amazon Kendra answers",
    body: "AWS closed Amazon Kendra to new customers on July 30, 2026, and it's no longer on the AIF-C01 or CLF-C02 exam guides' lists of in-scope services. Three questions whose correct answer was Kendra now use the current services for the same job: Amazon Bedrock Knowledge Bases (AIF-C01) and Amazon Quick (CLF-C02).",
    questionIds: ["aif-fun-034", "aif-fun-094", "clf-tec-135"],
  },
  {
    date: "2026-11-26",
    exams: ["saa-c03", "clf-c02", "aif-c01"],
    title: "AWS status notes on every affected question",
    body: "We checked all 1,500 questions against AWS's lifecycle notices. Questions that mention a service AWS has retired, renamed or closed to new customers (for example Snowball Edge, SageMaker Clarify, the old Support plans) now show a dated note with the explanation, the source, and whether the current exam guide still lists the service.",
  },
  {
    date: "2026-11-13",
    exams: ["clf-c02"],
    title: "Cloud Practitioner (CLF-C02) launched",
    body: "500 original questions weighted to the four CLF-C02 exam domains.",
  },
  {
    date: "2026-11-08",
    exams: ["saa-c03", "aif-c01"],
    title: "Quality pass on SAA-C03 and AIF-C01",
    body: "Rewrote weak wrong answers so every option is plausible, balanced option lengths so the correct answer isn't the longest, and made AIF-C01 scenarios closer to the real exam's style.",
  },
  {
    date: "2026-09-30",
    exams: ["aif-c01"],
    title: "AI Practitioner (AIF-C01) launched",
    body: "500 original questions weighted to the five AIF-C01 exam domains.",
  },
  {
    date: "2026-09-26",
    exams: ["saa-c03"],
    title: "Solutions Architect – Associate (SAA-C03) launched",
    body: "500 original questions weighted to the four SAA-C03 exam domains.",
  },
];

const UPDATED = new Map<string, string>();
for (const e of [...CHANGELOG].reverse()) for (const id of e.questionIds ?? []) UPDATED.set(id, e.date);

/** Date a question was last rewritten, if it ever was. */
export const questionUpdated = (id: string): string | undefined => UPDATED.get(id);

export const fmtMonthYear = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
export const fmtDate = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
