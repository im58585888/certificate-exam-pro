import { FREE_TRIAL_QUESTIONS, PASS_DAYS, PASS_PRICE_CENTS, type ExamInfo } from "./exams";

// Shared facts for page metadata, structured data and llms.txt, so every place describes the site the same way.

export const SITE_URL = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const SITE_NAME = "Certificate Exam Pro";
export const PRICE = (PASS_PRICE_CENTS / 100).toFixed(2);

export const examTitle = (e: ExamInfo) => `${e.code} Practice Exam: ${e.name}`;
export const examDescription = (e: ExamInfo, bank: number) =>
  `${bank} original ${e.code} practice questions with a detailed explanation for every answer, an AI tutor, timed ${e.examQuestions}-question mock exams and review of your mistakes. Try ${FREE_TRIAL_QUESTIONS} questions free; $${PRICE} for ${PASS_DAYS} days.`;

export const organization = {
  "@type": "Organization",
  "@id": `${SITE_URL}/#org`,
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/apple-icon.png`,
};

export const website = {
  "@type": "WebSite",
  "@id": `${SITE_URL}/#site`,
  name: SITE_NAME,
  url: SITE_URL,
  publisher: { "@id": `${SITE_URL}/#org` },
};

export const examProduct = (e: ExamInfo, bank: number) => ({
  "@type": "Product",
  name: `${e.code} practice exam (${PASS_DAYS}-day pass)`,
  description: examDescription(e, bank),
  brand: { "@id": `${SITE_URL}/#org` },
  url: `${SITE_URL}/practice/${e.slug}`,
  offers: { "@type": "Offer", price: PRICE, priceCurrency: "USD", availability: "https://schema.org/InStock", url: `${SITE_URL}/pricing` },
});

export const faqPage = (faq: [string, string][]) => ({
  "@type": "FAQPage",
  mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
});

export const graph = (...items: object[]) => ({ "@context": "https://schema.org", "@graph": items });
