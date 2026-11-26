import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import * as z from "zod/v4";
import { sha256, type Owner } from "./auth";
import { one, query } from "./db";
import { getExam } from "./exams";
import { cleanDiagram, NODE_KINDS, ZONE_KINDS, type ArchDiagram } from "./arch";
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

const Diagram = z.object({
  caption: z.string().describe("One sentence on what the diagram shows"),
  zones: z.array(z.object({
    id: z.string(), label: z.string().describe("e.g. 'On-premises data center', 'AWS Region', 'VPC', 'Private subnet'"),
    kind: z.enum(ZONE_KINDS), parent: z.string().nullable().describe("id of the zone this one sits inside, or null"),
  })).describe("0-5 boundaries that hold components; only ones the scenario implies; at most 3 levels deep"),
  nodes: z.array(z.object({
    id: z.string(), label: z.string().describe("2-4 words"), note: z.string().describe("A few words, or empty"),
    kind: z.enum(NODE_KINDS), zone: z.string().nullable().describe("id of the innermost zone it sits in, or null"),
    tag: z.string().describe("A requirement that applies to this piece in 2-4 words (e.g. 'Must stay private'), or empty"),
    role: z.string().describe("What this piece does in this particular setup, in one plain sentence"),
  })).describe("3-8 components"),
  links: z.array(z.object({
    from: z.string(), to: z.string(), label: z.string().describe("2-5 words on what flows, or empty"),
    decision: z.boolean().describe("true only for the one connection the question asks the learner to choose"),
    explain: z.string().describe("How this step works: what starts it, what passes across, and how the two pieces connect"),
  })).describe("In the order things happen, so they read as steps 1, 2, 3"),
});

const BreakdownSchema = z.object({
  title: z.string().describe("Short name for the scenario, e.g. 'Private networking for SaaS providers'"),
  testing: z.array(z.string()).describe("2-5 services or concepts the question tests"),
  requirements: z.array(z.object({ label: z.string(), detail: z.string() })).describe("Every requirement and constraint, including ones hidden in phrases like LEAST operational overhead"),
  diagram: Diagram.nullable()
    .describe("An architecture diagram of the scenario as the question describes it, with the piece being decided marked as unknown; null when the question isn't about how things are set up (a pure fact, limit or price)"),
  options: z.array(z.object({ name: z.string(), what: z.string(), analogy: z.string(), keyFacts: z.array(z.string()) }))
    .describe("One entry per technology, approach or concept in the answer options, described on its own terms; keyFacts must never confirm or contradict an option's claim"),
  table: Table.nullable().describe("A small reference table only when it makes a concept clearer (at most 5 rows), never one that settles the answer; otherwise null"),
  yourMove: z.string().describe("1-2 sentences on how to check each option against the requirements, without naming the answer"),
});
// Saved diagrams go through cleanDiagram, and older ones may lack role/explain, so store and render them as ArchDiagram.
export type Breakdown = Omit<z.infer<typeof BreakdownSchema>, "diagram"> & { diagram: ArchDiagram | null };

// Study-sheet cards teach the topic: what it is, why it's useful, and (when the topic is a setup) how the pieces fit.
const CardSchema = z.object({
  title: z.string(),
  whatItIs: z.string().describe("2-4 plain-English sentences on what this topic is, for someone meeting it for the first time. Explain any acronym"),
  whyUseful: z.array(z.string()).describe("2-4 short points, one line each, on the problem it solves or the benefit it brings, each with a concrete example"),
  diagram: Diagram.nullable()
    .describe("An architecture diagram of a typical setup for this topic: boundaries such as AWS Region, VPC or subnets as zones, the services involved as 3-6 nodes, links showing what flows; no decision links or nodes. Draw one whenever the topic involves AWS services, accounts, users or data connecting to each other (pipelines, networking, identity and access, security controls, storage, databases, compute, messaging, migration). Null only for topics with nothing to connect: pricing models, billing, support plans, responsibility models, pure definitions"),
});
export type ConceptCard = Omit<z.infer<typeof CardSchema>, "diagram"> & { diagram: ArchDiagram | null };


// ---------- Prompts (stable text first so it can be cached) ----------

const TUTOR = `You are a patient AWS tutor inside a certification practice-exam app. Learners range from complete beginners to people close to sitting the exam.

Write in plain English: short sentences, everyday analogies, concrete examples. Explain every acronym the first time you use it.
Answer options are shown to each learner in a shuffled order, so never refer to options by letter; name the technology or approach instead.
Only state AWS facts you are confident are accurate and current. If something depends on details the question doesn't give, say so rather than guessing.`;

const BREAKDOWN_RULES = `The learner is looking at a practice question and has NOT answered it yet. Break the question down so they can reason it out themselves.

You are not told the correct answer and must not suggest one: don't rank options, don't say which fits the scenario, and don't describe any option as right, wrong, best or a trap. Describe each technology on its own terms, including its general strengths and limits, so the learner can do the matching.

Some options are claims rather than technologies (for example "Standard-IA has a 90-day minimum storage duration"). For those, explain the concept the claim is about and what the learner would need to know to judge it, but never state whether the claim is true or give the fact that settles it. Likewise, don't do the calculation or comparison that decides the question: set up the arithmetic or the comparison and leave the final step to the learner.`;

const DIAGRAM_RULES = `The diagram is an architecture picture of the scenario: boundaries (on-premises, AWS Region, account, VPC, public or private subnet) as zones, and the users, services and data the scenario mentions as nodes inside them, with links showing how requests or data flow.
Draw only what the scenario says exists or clearly implies. Never draw a technology that appears only in the answer options. Mark the one thing the question asks the learner to choose: if it is how two pieces connect, add that link with decision true and a label naming the need (e.g. "Private path, no internet"); if it is a missing component, add a node of kind "decision" whose label names its job (e.g. "Cache for sessions"), never a technology. Put requirements from the scenario on the pieces they apply to as tags.
Keep it small and readable: 3-8 nodes, short labels. Use null when the question is about a fact, limit, price or definition rather than how things are set up.
Each link must join two pieces that talk to each other directly: a request that passes through a service goes through it (users to CloudFront to the app, not users straight to a cache or database behind the app).
List the links in the order things happen. For each link, explain in 1-2 plain sentences what happens in that step and how the two pieces talk to each other, using only what the scenario says. For each node, give its role in one sentence.
The decision link or node is the open question: its explanation must only describe what that step needs to achieve (the requirement, e.g. "Traffic has to reach S3 without leaving the AWS network"), never a technology, service, feature or setting that could do it, and never a hint that points to one option.`;

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
const PROMPT_VERSION = 3;
const hashQuestion = (q: Question) => sha256(JSON.stringify([PROMPT_VERSION, q.stem, q.prompt, q.options])).slice(0, 16);
/** Bump when the breakdown's shape changes; kept apart from PROMPT_VERSION so answer walk-throughs aren't rewritten too. */
const BREAKDOWN_VERSION = 3;
const hashBreakdown = (q: Question) => sha256(JSON.stringify([PROMPT_VERSION, BREAKDOWN_VERSION, q.stem, q.prompt, q.options])).slice(0, 16);

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
/** Daily AI tutor messages for pass holders and free users, shown on the pricing page. */
export const AI_DAILY = { paid: DAILY.paid, free: DAILY.free };

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
  return cached<Breakdown>(q.id, "breakdown", hashBreakdown(q));
}

export async function writeBreakdown(q: Question): Promise<Breakdown> {
  const raw = mock ? mockBreakdown(q) : await parse(BreakdownSchema, `${BREAKDOWN_RULES}\n\n${DIAGRAM_RULES}\n\n${BREAKDOWN_LEVEL}`, questionText(q, false));
  const content = { ...raw, diagram: guardOpenStep(cleanDiagram(raw.diagram), q, raw.options.map((o) => o.name)) };
  await store(q.id, "breakdown", hashBreakdown(q), content);
  return content;
}

const STOP_WORDS = new Set(["amazon", "aws", "the", "and", "with", "for", "use", "using", "from", "into", "that", "this", "each", "only", "data", "your", "service", "services"]);

/**
 * Safety net for the breakdown: the explanation of the step the learner has to choose (the "?" arrow or box) may only
 * restate the requirement. If it mentions a technology from the answer options, or an option's distinctive words, it is
 * replaced with a neutral line so the diagram can't give the answer away even when the model slips.
 */
function guardOpenStep(d: ArchDiagram | null, q: Question, optionNames: string[]): ArchDiagram | null {
  if (!d) return d;
  // Technology names: the breakdown's names for each option, plus product-style words in the option text (capitalised
  // after the first word, or containing a digit, e.g. "PrivateLink", "Gateway", "S3"). Words the scenario itself uses are fine.
  const scenario = `${q.stem} ${q.prompt}`.toLowerCase();
  // Words, keeping dotted or hyphenated names (e.g. "s3.amazonaws.com", "cross-region") but not a trailing full stop.
  const tokens = (t: string) => (t.toLowerCase().match(/[a-z0-9]+(?:[.-][a-z0-9]+)*/g) ?? []);
  const product = (t: string) => t.split(/\s+/).slice(1).filter((w) => /^[A-Z]|\d/.test(w)).join(" ");
  const words = new Set(
    [...optionNames, ...q.options.map((o) => product(o.text))]
      .flatMap(tokens)
      .filter((w) => w.length > 1 && !STOP_WORDS.has(w) && !scenario.includes(w)),
  );
  const leaks = (text?: string) => !!text && tokens(text).some((w) => words.has(w));
  const neutral = "This is the step the question asks you to choose. Work out what it has to achieve from the requirements above, then check each option against them.";
  for (const l of d.links) if (l.decision && leaks(l.explain)) l.explain = neutral;
  for (const n of d.nodes) if (n.kind === "decision" && leaks(n.role)) n.role = "The piece the question asks you to choose.";
  return d;
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
Explanation styles: "simply" means plain words, an everyday analogy and no jargon; "technically" means precise AWS terms, the exact settings, permissions and limits involved; "as a diagram" means draw it.
${answered ? `If they ask for a similar question, write ONE new multiple-choice question (A-D) that tests the same concept in a different scenario, don't reveal its answer, and wait for their reply before explaining.` : ""}
If they ask what the question is testing, name the concept and the clue words in the scenario that point to it${answered ? "" : ", without saying which option matches"}.
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

const CARD_RULES = `Write a short study-sheet lesson for one exam topic, based on the practice questions below (with their correct answers, concepts and exam tips). Teach the ideas those questions test to someone who may be new to the topic: first what it is, then why it's useful. Then draw a diagram of a typical setup for the topic, showing the pieces those questions involve and how they connect (for CI/CD security, for example: the code repository, the build stage, the deploy role and the production account). Skip the diagram only when the topic has nothing to connect, such as pricing or support plans. In a diagram, put a key setting or limit the questions test in the relevant node's note or tag (e.g. tag "Max concurrency 50").
The diagram is the heart of the lesson, so explain it in detail. Each link must join two pieces that talk to each other directly: a request that passes through a service goes through it (users to CloudFront to the app servers, never users straight to a cache or database that only the app uses). List the links in the order things happen. For each link, write 2-4 plain sentences: what starts this step, what passes across (a request, an event, data, a token, credentials), and exactly how the two services connect, such as the permission, role, policy, endpoint, protocol or setting that makes it work, plus any limit or default the exam likes to test. For each node, give one sentence on the job it does in this setup.`;

const topicKey = (exam: string, topic: string) => `topic:${exam}:${topic}`;
/** Bump when the card format changes so existing cards are rewritten in the new shape the next time someone opens them. */
const CARD_VERSION = 7;
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
  const raw = mock ? mockCard(topic) : await parse(CardSchema, CARD_RULES, [
    `Exam: ${getExam(exam)?.name ?? exam}. Topic: ${topic}.`,
    ...sample.map((q, i) => `\nQuestion ${i + 1}: ${q.prompt}\nCorrect: ${q.options.filter((o) => o.correct).map((o) => o.text).join("; ")}\nConcept: ${q.explanation.concept}\nExam tip: ${q.explanation.examTip}`),
  ].join("\n"), 6000);
  // A study card explains the whole setup, so nothing in it is drawn as an open question.
  const diagram = cleanDiagram(raw.diagram);
  if (diagram) {
    diagram.links.forEach((l) => { l.decision = false; });
    diagram.nodes.forEach((n) => { if (n.kind === "decision") n.kind = "other"; });
  }
  const content = { ...raw, diagram };
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
    diagram: {
      caption: "App servers in a private subnet need to reach a bucket outside the VPC.",
      zones: [
        { id: "region", label: "AWS Region", kind: "region", parent: null },
        { id: "vpc", label: "VPC", kind: "vpc", parent: "region" },
        { id: "pub", label: "Public subnet", kind: "public", parent: "vpc" },
        { id: "priv", label: "Private subnet", kind: "private", parent: "vpc" },
      ],
      nodes: [
        { id: "users", label: "Users", note: "", kind: "users", zone: null, tag: "", role: "People using the web app from the internet." },
        { id: "alb", label: "Load balancer", note: "", kind: "network", zone: "pub", tag: "", role: "Takes requests from the internet and spreads them across the app servers." },
        { id: "app", label: "App servers", note: "EC2, no public IP", kind: "compute", zone: "priv", tag: "", role: "Run the application and write reports; they can't be reached from the internet." },
        { id: "s3", label: "S3 bucket", note: "Reports", kind: "storage", zone: "region", tag: "Lowest cost", role: "Stores the reports the app servers produce." },
      ],
      links: [
        { from: "users", to: "alb", label: "HTTPS requests", decision: false, explain: "Users open the app in a browser. Their HTTPS requests arrive at the load balancer, the only part with a public address." },
        { from: "alb", to: "app", label: "", decision: false, explain: "The load balancer forwards each request to a healthy app server inside the private subnet." },
        { from: "app", to: "s3", label: "Private path, no internet", decision: true, explain: "Sample: this is the step the question asks you to choose. It has to get report files to S3 without the traffic going over the internet." },
      ],
    },
    options: q.options.map((o) => ({ name: o.text.slice(0, 40), what: "What this technology does.", analogy: "An everyday comparison.", keyFacts: ["A general strength.", "A general limit."] })),
    table: { caption: "Sample table", columns: ["Destination", "Where traffic goes"], rows: [["10.0.0.0/16", "Local VPC"], ["0.0.0.0/0", "Internet gateway"]] },
    yourMove: "Check each option against every requirement above.",
  };
}

function mockCard(topic: string): ConceptCard {
  return {
    title: topic,
    whatItIs: "Sample lesson: add ANTHROPIC_API_KEY to generate real study notes. This part explains what the topic is in plain English.",
    whyUseful: ["The first problem it solves, with an example", "A second benefit, with an example"],
    diagram: {
      caption: "Sample: a cache in front of the database so most reads never reach it.",
      zones: [
        { id: "region", label: "AWS Region", kind: "region", parent: null },
        { id: "vpc", label: "VPC", kind: "vpc", parent: "region" },
        { id: "priv", label: "Private subnet", kind: "private", parent: "vpc" },
      ],
      nodes: [
        { id: "users", label: "Users", note: "Browsers and apps", kind: "users", zone: null, tag: "", role: "Sample: people loading pages and calling the API." },
        { id: "cf", label: "CloudFront", note: "Caches whole responses", kind: "network", zone: null, tag: "", role: "Sample: serves cached pages from the edge and forwards the rest to the app." },
        { id: "app", label: "App servers", note: "Check the cache first", kind: "compute", zone: "priv", tag: "", role: "Sample: run the application and decide where each read comes from." },
        { id: "cache", label: "ElastiCache", note: "Valkey, replicas across AZs", kind: "database", zone: "priv", tag: "Set a TTL on keys", role: "Sample: keeps recently read rows in memory." },
        { id: "db", label: "Primary database", note: "Source of truth", kind: "database", zone: "priv", tag: "Must stay private", role: "Sample: holds the real data." },
      ],
      links: [
        { from: "users", to: "cf", label: "Web requests", decision: false, explain: "Sample step: requests go to the nearest CloudFront edge location." },
        { from: "cf", to: "app", label: "Cache misses only", decision: false, explain: "Sample step: only requests CloudFront can't answer from its cache reach the app servers." },
        { from: "app", to: "cache", label: "Look up copy first", decision: false, explain: "Sample step: the app asks ElastiCache for the key first." },
        { from: "app", to: "db", label: "Miss: read database", decision: false, explain: "Sample step: on a miss the app reads the database, then stores the result in the cache with a TTL. This arrow should go over the cache box, not through it." },
      ],
    },
  };
}
