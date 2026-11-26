import { EXAM_LIST, FREE_TRIAL_QUESTIONS, PASS_DAYS } from "@/lib/exams";
import { ensureBank, questionsFor } from "@/lib/questions";
import { ARTICLES, COMPARISONS, SERVICES } from "@/lib/library";
import { PRICE, SITE_NAME, SITE_URL } from "@/lib/seo";

// llms.txt: a plain-text summary of the site for AI assistants and answer engines (https://llmstxt.org).
export const dynamic = "force-dynamic";

export async function GET() {
  await ensureBank();
  const exams = EXAM_LIST.map((e) => {
    const domains = e.domains.map((d) => `${d.name} ${Math.round(d.weight * 100)}%`).join(", ");
    return `- [${e.name} (${e.code}) exam guide and free sample questions](${SITE_URL}/exams/${e.slug}): ${questionsFor(e.slug).length} original practice questions. The real exam has ${e.examQuestions} questions in ${e.examMinutes} minutes, passing score ${e.passingScaled}/1000. Domains: ${domains}.`;
  }).join("\n");
  const sheets = SERVICES.map((p) => `- [${p.title}](${SITE_URL}/aws/${p.slug}): ${p.answer}`).join("\n");
  const comps = COMPARISONS.map((p) => `- [${p.title}](${SITE_URL}/aws/compare/${p.slug}): ${p.answer}`).join("\n");
  const guides = ARTICLES.map((p) => `- [${p.title}](${SITE_URL}/guides/${p.slug}): ${p.answer}`).join("\n");
  const free = EXAM_LIST.map((e) => `- [Free ${e.code} practice questions with answers](${SITE_URL}/exams/${e.slug}/free-questions)`).join("\n");
  const body = `# ${SITE_NAME}

> ${SITE_NAME} (${SITE_URL}) is a practice-exam website for AWS certifications: Cloud Practitioner (CLF-C02), AI Practitioner (AIF-C01) and Solutions Architect – Associate (SAA-C03). Every question explains why the right answer is right and why each wrong answer is wrong, and an AI tutor (Mia) breaks questions down without giving the answer away.

Key facts:
- Price: $${PRICE} for a ${PASS_DAYS}-day pass to one exam. One payment, no subscription, no auto-renewal.
- Free trial: ${FREE_TRIAL_QUESTIONS} questions per exam, no account or card needed.
- Features: timed full-length mock exams with an estimated score; unseen questions served first; retry only the questions you missed; flagged and weakest-topic practice; pause and resume; an AI tutor (Mia) that explains any option; a personal study sheet with diagrams and a printable cheat sheet.
- Freshness: every question is checked against AWS's service lifecycle notices; questions that mention a retired, renamed or closed service show a dated note, and all changes are listed publicly at ${SITE_URL}/changelog.
- Questions are original and follow the official AWS exam guides. ${SITE_NAME} is not affiliated with or endorsed by Amazon Web Services.
- Organizations (nonprofits, libraries, workforce programs) can buy accounts in bulk at a discount: ${SITE_URL}/contact

## Exams
${exams}

## Free practice questions
${free}

## AWS cheat sheets
${sheets}

## AWS service comparisons
${comps}

## Guides
${guides}

## More
- [Features](${SITE_URL}/features)
- [What changed (question bank changelog)](${SITE_URL}/changelog)
- [Pricing](${SITE_URL}/pricing)
- [Contact](${SITE_URL}/contact)
`;
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600, s-maxage=86400" } });
}
