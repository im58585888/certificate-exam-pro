import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import * as z from "zod/v4";
import { sha256, type Owner } from "./auth";
import { one, query } from "./db";
import { getExam } from "./exams";
import { examOf, type Question } from "./questions";
import { allowAttempt, clientIpHash, recordAttempt } from "./request";

// The AI tutor: explanations are written once per question (or topic) and shared by every learner.
// Only follow-up chat and first-time generation call the model.

// Everything runs on the low-cost model by default. Override either in the environment, e.g.
// AI_MODEL_CONTENT=claude-sonnet-5-5 for richer saved breakdowns, walk-throughs and cards.
const MODELS = {
  content: process.env.AI_MODEL_CONTENT || "claude-haiku-5-5",
  chat: process.env.AI_MODEL_CHAT || "claude-haiku-5-5",
};

/** Refusal fallback (the API reruns a declined request on a suitable model). Haiku has no server-side fallback. */
function fallback(model: string) {
  return model.startsWith("claude-haiku") ? {} : { betas: ["server-side-fallback-2026-07-01"] as Anthropic.Beta.AnthropicBeta[], fallbacks: "default" as const };
}
const client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;
/** Local development without a key serves canned content so the UI can still be exercised. */
const mock = !client && process.env.NODE_ENV !== "production";

export const aiAvailable = !!client || mock;

// ---------- Content shapes ----------

const Table = z.object({ caption: z.string(), columns: z.array(z.string()), rows: z.array(z.array(z.string())) });

const BreakdownSchema = z.object({
  title: z.string().describe("Short name for the scenario, e.g. 'Private networking for SaaS providers'"),
  testing: z.array(z.string()).describe("2-5 services or concepts the question tests"),
  requirements: z.array(z.object({ label: z.string(), detail: z.string() })).describe("Every requirement and constraint, including ones hidden in phrases like LEAST operational overhead"),
  picture: z.object({ caption: z.string(), steps: z.array(z.object({ label: z.string(), note: z.string() })) }).nullable()
    .describe("3-6 boxes showing how the pieces of the scenario connect, left to right; null if a picture wouldn't help"),
  clues: z.array(z.object({ phrase: z.string(), meaning: z.string() })).describe("Exact phrases from the question that matter, and what each signals"),
  terms: z.array(z.object({ term: z.string(), plain: z.string(), example: z.string() })).describe("3-7 terms a beginner may not know"),
  options: z.array(z.object({ name: z.string(), what: z.string(), analogy: z.string(), keyFacts: z.array(z.string()) }))
    .describe("One entry per technology, approach or concept in the answer options, described on its own terms; keyFacts must never confirm or contradict an option's claim"),
  table: Table.nullable().describe("A small reference table only when it makes a concept clearer (at most 5 rows), never one that settles the answer; otherwise null"),
  yourMove: z.string().describe("1-2 sentences on how to check each option against the requirements, without naming the answer"),
});
export type Breakdown = z.infer<typeof BreakdownSchema>;

// Study-sheet cards are laid out as small tables and a diagram rather than bullet lists, so every field is short.
const CardSchema = z.object({
  title: z.string(),
  oneLiner: z.string().describe("What this concept is, in one short sentence"),
  useWhen: z.array(z.object({ when: z.string(), notWhen: z.string() }))
    .describe("2-4 rows. when: a situation where this is the right choice. notWhen: a look-alike situation where something else is, naming that something else. A few words each"),
  facts: z.array(z.object({ label: z.string(), value: z.string() }))
    .describe("3-5 exam-relevant facts as short label/value pairs, e.g. label 'Default retention', value '90 days'"),
  flow: z.object({ caption: z.string(), steps: z.array(z.object({ label: z.string(), note: z.string() })) }).nullable()
    .describe("3-5 boxes, left to right, showing how this service fits with others in a typical setup; null if there's no natural flow"),
  compare: Table.nullable().describe("A small comparison of look-alike services (at most 4 rows, short cells), or null"),
  traps: z.array(z.object({ trap: z.string(), truth: z.string() })).describe("2-3 common wrong-answer traps: the mistaken belief and the correct fact, one short line each"),
  remember: z.string().describe("One memorable rule of thumb"),
});
export type ConceptCard = z.infer<typeof CardSchema>;


// ---------- Prompts (stable text first so it can be cached) ----------

const TUTOR = `You are a patient AWS tutor inside a certification practice-exam app. Learners range from complete beginners to people close to sitting the exam.

Write in plain English: short sentences, everyday analogies, concrete examples. Explain every acronym the first time you use it.
Answer options are shown to each learner in a shuffled order, so never refer to options by letter; name the technology or approach instead.
Only state AWS facts you are confident are accurate and current. If something depends on details the question doesn't give, say so rather than guessing.`;

const BREAKDOWN_RULES = `The learner is looking at a practice question and has NOT answered it yet. Break the question down so they can reason it out themselves.

You are not told the correct answer and must not suggest one: don't rank options, don't say which fits the scenario, and don't describe any option as right, wrong, best or a trap. Describe each technology on its own terms, including its general strengths and limits, so the learner can do the matching.

Some options are claims rather than technologies (for example "Standard-IA has a 90-day minimum storage duration"). For those, explain the concept the claim is about and what the learner would need to know to judge it, but never state whether the claim is true or give the fact that settles it. Likewise, don't do the calculation or comparison that decides the question: set up the arithmetic or the comparison and leave the final step to the learner.`;

const BREAKDOWN_LEVEL = "Pitch it at someone who knows basic IT but is new to this AWS topic.";

function questionText(q: Question, withAnswer: boolean): string {
  const exam = getExam(examOf(q.id) ?? "");
  const lines = [
    `Exam: ${exam?.name ?? "AWS certification"}. Topic: ${q.topic}.`,
    "",
    `Scenario: ${q.stem}`,
    `Question: ${q.prompt}${q.type === "multi" ? ` (choose ${q.selectCount ?? 2})` : ""}`,
    "Answer options:",
    ...q.options.map((o) => (withAnswer ? `- ${o.text} [${o.correct ? "CORRECT" : "incorrect"}] Reason: ${o.why}` : `- ${o.text}`)),
  ];
  if (withAnswer) lines.push("", `Core concept: ${q.explanation.concept}`, `Exam tip: ${q.explanation.examTip}`);
  return lines.join("\n");
}

// Bump when the prompts change so saved explanations are rewritten with the new instructions.
const PROMPT_VERSION = 2;
const hashQuestion = (q: Question) => sha256(JSON.stringify([PROMPT_VERSION, q.stem, q.prompt, q.options])).slice(0, 16);

// ---------- Cache ----------

async function cached<T>(key: string, kind: string, hash: string): Promise<T | null> {
  const row = await one<{ content: T; source_hash: string }>(`select content, source_hash from ai_content where key = $1 and kind = $2`, [key, kind]);
  return row && row.source_hash === hash ? row.content : null;
}

async function store(key: string, kind: string, hash: string, content: unknown, model = MODELS.content): Promise<void> {
  await query(
    `insert into ai_content (key, kind, source_hash, content, model) values ($1, $2, $3, $4, $5)
     on conflict (key, kind) do update set source_hash = excluded.source_hash, content = excluded.content, model = excluded.model, created_at = now()`,
    [key, kind, hash, JSON.stringify(content), mock ? "mock" : model],
  );
}

// ---------- Usage limits (only live model calls count; cached content is free) ----------

const DAILY = { paid: 300, free: 25, network: 80 };

/** Returns false when this visitor (or their network, for free users) has used today's AI allowance. Records the use otherwise. */
export async function spendAllowance(owner: Owner, paid: boolean, admin: boolean): Promise<boolean> {
  if (admin) return true;
  const ownerKey = `ai:${owner.userId ?? owner.anonId}`;
  const keys: [string, number][] = [[ownerKey, paid ? DAILY.paid : DAILY.free]];
  if (!paid) keys.push([`ai-ip:${await clientIpHash()}`, DAILY.network]);
  for (const [k, max] of keys) if (!(await allowAttempt(k, max, 86_400))) return false;
  await Promise.all(keys.map(([k]) => recordAttempt(k)));
  return true;
}

// ---------- Generation ----------

export class AiError extends Error {}

/** A short, safe reason for a failed model call (HTTP status and error type), for messages and logs. */
export function failureCode(err: unknown): string {
  if (err instanceof Anthropic.APIError) return `${err.status ?? "network"}${err.type ? ` ${err.type}` : ""}`;
  return err instanceof AiError ? "declined" : "unexpected";
}

async function parse<T>(schema: z.ZodType<T>, system: string, user: string, maxTokens = 16000): Promise<T> {
  const res = await client!.beta.messages.parse({
    model: MODELS.content,
    max_tokens: maxTokens,
    ...fallback(MODELS.content),
    output_config: { effort: "low", format: betaZodOutputFormat(schema) },
    system: [{ type: "text", text: TUTOR, cache_control: { type: "ephemeral" } }, { type: "text", text: system }],
    messages: [{ role: "user", content: user }],
  });
  if (res.stop_reason === "refusal" || !res.parsed_output) throw new AiError("The tutor couldn't write this explanation. Please try again.");
  return res.parsed_output as T;
}

/** Pre-answer breakdown. Never given the correct answer, so it can't leak it. */
export async function cachedBreakdown(q: Question): Promise<Breakdown | null> {
  return cached<Breakdown>(q.id, "breakdown", hashQuestion(q));
}

export async function writeBreakdown(q: Question): Promise<Breakdown> {
  const content = mock ? mockBreakdown(q) : await parse(BreakdownSchema, `${BREAKDOWN_RULES}\n\n${BREAKDOWN_LEVEL}`, questionText(q, false));
  await store(q.id, "breakdown", hashQuestion(q), content);
  return content;
}

const ANSWER_RULES = `The learner has just answered this question and wants the solution explained from scratch. You are given the correct answer and the reason each option is right or wrong.

Structure:
## What it's really asking
One or two sentences.
## Why the answer works
Walk through each requirement and show how the correct option meets it.
## Why the others fall short
One short bullet per other option, naming it and the requirement it fails.
## Remember this
One memorable rule for similar questions.

Use only "## " headings, "- " bullets and **bold**. Keep it under 350 words.`;

const VISUALS = `Visuals: when a comparison, matrix or flow would make the answer clearer, or the learner asks for a table, chart, matrix, diagram or visual, include one. They render as real tables and diagrams in the chat.
- Table or matrix: a markdown table with a header row and a |---| divider row; at most 6 rows and 5 columns, short cells (✓ / ✗ are fine).
- Flow diagram: a fenced block that starts with \`\`\`flow, optionally a first line "title: …", then one step per line as "Label | short note", 2-6 steps read left to right, closed with \`\`\`. For before/after or two alternatives, use two flow blocks, each with a title.
Tables and diagrams don't count toward the word limit. Use no other markdown or code blocks.`;

const CHAT_RULES = (answered: boolean) => `The learner is asking follow-up questions about the practice question below. Answer only what they ask, briefly (under 200 words unless they ask for more), using "- " bullets and **bold** where they help.
${answered
    ? "They have already answered it, so you may discuss the correct answer."
    : "They have NOT answered it yet. You are not told the correct answer; don't suggest which option is correct or rank the options, even if asked. Help them understand the concepts and requirements so they can decide."}
${VISUALS}${answered ? "" : " A table or diagram must describe each option on its own terms and never rank the options or show which one fits best."}
Politely decline anything unrelated to AWS or studying for this exam.`;

export type ChatTurn = { role: "user" | "assistant"; content: string };

const STUDY_RULES = (examName: string, weak: string[], topic?: string) => `The learner is on their study sheet for the ${examName} exam and is asking you to help them study: explain concepts, compare services, draw how things connect, or quiz them. You are not discussing one specific practice question.${topic ? ` They opened the topic "${topic}", so keep answers focused on it unless they ask about something else.` : ""} Answer what they ask, briefly (under 250 words unless they ask for more), using "- " bullets and **bold** where they help, and stay accurate to current AWS behaviour.
Prefer a table, matrix or diagram over long paragraphs whenever the answer compares, lists or connects things.
${weak.length ? `Their weakest topics so far: ${weak.join(", ")}. Lean on these when they ask what to study or want to be quizzed.` : "They haven't practised much yet."}
If they ask to be quizzed, ask one question at a time and wait for their answer before explaining.
${VISUALS}
Politely decline anything unrelated to AWS or studying for this exam.`;

/** The study sheet's tutor: an exam-wide conversation not tied to one practice question. */
export function studyChat(examName: string, weakTopics: string[], turns: ChatTurn[], topic?: string): AsyncGenerator<string> {
  return streamText(MODELS.chat, STUDY_RULES(examName, weakTopics.slice(0, 8), topic), turns, 2500);
}

/** Streams text deltas, then the full text when done. */
async function* streamText(model: string, system: string, messages: Anthropic.Beta.BetaMessageParam[], maxTokens: number): AsyncGenerator<string> {
  if (mock) {
    for (const word of MOCK_TEXT.split(/(?<= )/)) { yield word; await new Promise((r) => setTimeout(r, 8)); }
    return;
  }
  const stream = client!.beta.messages.stream({
    model,
    max_tokens: maxTokens,
    ...fallback(model),
    output_config: { effort: "low" },
    system: [{ type: "text", text: TUTOR, cache_control: { type: "ephemeral" } }, { type: "text", text: system }],
    messages,
  });
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") yield event.delta.text;
  }
  const final = await stream.finalMessage();
  if (final.stop_reason === "refusal") yield "\n\nThe tutor can't help with that one. Try rephrasing your question.";
}

export async function cachedAnswerWalkthrough(q: Question): Promise<string | null> {
  return cached<string>(q.id, "answer", hashQuestion(q));
}

export async function* answerWalkthrough(q: Question): AsyncGenerator<string> {
  let full = "";
  for await (const t of streamText(MODELS.content, ANSWER_RULES, [{ role: "user", content: questionText(q, true) }], 4000)) { full += t; yield t; }
  if (full.trim()) await store(q.id, "answer", hashQuestion(q), full);
}

export function chat(q: Question, answered: boolean, turns: ChatTurn[]): AsyncGenerator<string> {
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    { role: "user", content: `${questionText(q, answered)}\n\n---\n\n${turns[0].content}` },
    ...turns.slice(1),
  ];
  return streamText(MODELS.chat, CHAT_RULES(answered), messages, 2000);
}

// ---------- Study-sheet concept cards (one per exam topic, written from that topic's questions) ----------

const CARD_RULES = `Write a study-sheet card for one exam topic, based on the practice questions below (with their correct answers, concepts and exam tips). Capture the ideas those questions test, so a learner can review the topic in under a minute. The card is shown as small tables and a diagram, so keep every field to a few words or one short line: no paragraphs.`;

const topicKey = (exam: string, topic: string) => `topic:${exam}:${topic}`;
/** Bump when the card format changes so existing cards are rewritten in the new shape the next time someone opens them. */
const CARD_VERSION = 2;
const hashTopic = (qs: Question[]) => sha256(JSON.stringify([PROMPT_VERSION, CARD_VERSION, qs.map((q) => [q.id, q.explanation.concept])])).slice(0, 16);

export async function cachedCards(exam: string, topics: { topic: string; questions: Question[] }[]): Promise<Map<string, ConceptCard>> {
  if (!topics.length) return new Map();
  const rows = await query<{ key: string; content: ConceptCard; source_hash: string }>(
    `select key, content, source_hash from ai_content where kind = 'card' and key = any($1)`,
    [topics.map((t) => topicKey(exam, t.topic))],
  );
  const byKey = new Map(rows.map((r) => [r.key, r]));
  const out = new Map<string, ConceptCard>();
  for (const t of topics) {
    const r = byKey.get(topicKey(exam, t.topic));
    if (r && r.source_hash === hashTopic(t.questions)) out.set(t.topic, r.content);
  }
  return out;
}

export async function writeCard(exam: string, topic: string, questions: Question[]): Promise<ConceptCard> {
  const sample = questions.slice(0, 12);
  const content = mock ? mockCard(topic) : await parse(CardSchema, CARD_RULES, [
    `Exam: ${getExam(exam)?.name ?? exam}. Topic: ${topic}.`,
    ...sample.map((q, i) => `\nQuestion ${i + 1}: ${q.prompt}\nCorrect: ${q.options.filter((o) => o.correct).map((o) => o.text).join("; ")}\nConcept: ${q.explanation.concept}\nExam tip: ${q.explanation.examTip}`),
  ].join("\n"), 4000);
  await store(topicKey(exam, topic), "card", hashTopic(questions), content);
  return content;
}

// ---------- Local development stand-ins (no API key) ----------

const MOCK_TEXT = `## What it's really asking
This is sample text: add ANTHROPIC_API_KEY to .env.local to get real explanations.
## Why the answer works
- **Requirement one** is met because the option provides it natively.
- **Requirement two** is met with no extra infrastructure.
## Remember this
Read every requirement before looking at the options.`;

function mockBreakdown(q: Question): Breakdown {
  return {
    title: `Sample breakdown: ${q.topic}`,
    testing: [q.topic, "Reading requirements"],
    requirements: [{ label: "First requirement", detail: "What the scenario needs most." }, { label: "Second requirement", detail: "A constraint hidden in the wording." }],
    picture: { caption: "How the pieces connect", steps: [{ label: "Users", note: "send requests" }, { label: "AWS service", note: "does the work" }, { label: "Data", note: "is stored" }] },
    clues: [{ phrase: "LEAST operational overhead", meaning: "Prefer managed services over building it yourself." }],
    terms: [{ term: "Managed service", plain: "AWS runs the servers for you.", example: "Amazon RDS patches the database engine." }],
    options: q.options.map((o) => ({ name: o.text.slice(0, 40), what: "What this technology does.", analogy: "An everyday comparison.", keyFacts: ["A general strength.", "A general limit."] })),
    table: { caption: "Sample table", columns: ["Destination", "Where traffic goes"], rows: [["10.0.0.0/16", "Local VPC"], ["0.0.0.0/0", "Internet gateway"]] },
    yourMove: "Check each option against every requirement above.",
  };
}

function mockCard(topic: string): ConceptCard {
  return {
    title: topic,
    oneLiner: "Sample card: add ANTHROPIC_API_KEY to generate real study notes.",
    useWhen: [{ when: "The situation it fits", notWhen: "A look-alike: use Service X" }, { when: "Another good fit", notWhen: "Another look-alike: use Y" }],
    facts: [{ label: "Default", value: "A setting" }, { label: "Limit", value: "A number" }, { label: "Pricing", value: "How you pay" }],
    flow: { caption: "How it fits", steps: [{ label: "Users", note: "make requests" }, { label: topic, note: "does the work" }, { label: "Storage", note: "keeps results" }] },
    compare: null,
    traps: [{ trap: "A common mistaken belief", truth: "What's actually true" }],
    remember: "One rule of thumb.",
  };
}
