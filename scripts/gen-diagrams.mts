// Draws the "Picture the solution" architecture diagram for each practice question, once, and saves it to
// src/lib/diagrams/<exam>.json so explanations show it with no AI call per learner.
//
//   node --env-file=.env.local scripts/gen-diagrams.mts --exam saa-c03 --limit 20
//   node --env-file=.env.local scripts/gen-diagrams.mts --ids saa-sec-001,aif-fun-034
//
// Skips questions that already have a diagram for their current text. Questions about a fact, price or definition get
// `null` (no diagram), which is saved too so they aren't asked again. Prints token usage at the end.
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import * as z from "zod/v4";
import { cleanDiagram, NODE_KINDS, ZONE_KINDS } from "../src/lib/arch.ts";

type Q = {
  id: string; topic: string; stem: string; prompt: string; type: string; selectCount?: number;
  options: { key: string; text: string; correct: boolean; why: string }[];
  explanation: { answer: string; concept: string };
};

const arg = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : undefined; };
const EXAMS = arg("exam") ? [arg("exam")!] : ["saa-c03", "clf-c02", "aif-c01"];
const LIMIT = Number(arg("limit") ?? Infinity);
const IDS = arg("ids")?.split(",");
const MODEL = arg("model") ?? process.env.AI_MODEL_CONTENT ?? "claude-haiku-5-5";
const CONCURRENCY = Number(arg("concurrency") ?? 6);

export const hashOf = (q: Q) => createHash("sha256").update(JSON.stringify([q.stem, q.prompt, q.options.map((o) => [o.text, o.correct])])).digest("hex").slice(0, 16);

const Diagram = z.object({
  caption: z.string().describe("One sentence on what the diagram shows"),
  zones: z.array(z.object({
    id: z.string(), label: z.string().describe("e.g. 'On-premises data center', 'AWS Region', 'VPC', 'Private subnet'"),
    kind: z.enum(ZONE_KINDS), parent: z.string().nullable().describe("id of the zone this one sits inside, or null"),
  })).describe("0-5 boundaries that hold components; at most 3 levels deep"),
  nodes: z.array(z.object({
    id: z.string(), label: z.string().describe("2-4 words"), note: z.string().describe("A few words, or empty"),
    kind: z.enum(NODE_KINDS.filter((k) => k !== "decision") as [string, ...string[]]),
    zone: z.string().nullable().describe("id of the innermost zone it sits in, or null"),
    tag: z.string().describe("'✓ The answer' on the piece(s) the correct option adds; otherwise a requirement in 2-4 words, or empty"),
    role: z.string().describe("What this piece does in this setup, in one plain sentence"),
  })).describe("3-8 components"),
  links: z.array(z.object({
    from: z.string(), to: z.string(), label: z.string().describe("2-5 words on what flows, or empty"),
    explain: z.string().describe("How this step works, in 1-2 plain sentences"),
  })).describe("In the order things happen, so they read as steps 1, 2, 3"),
});
const Out = z.object({ diagram: Diagram.nullable().describe("null when the question is about a fact, limit, price, support plan, responsibility model or definition rather than how things connect") });

const SYSTEM = `You draw architecture diagrams for an AWS certification practice-exam app. Learners see the diagram in the answer explanation, after they've answered, to understand how the correct solution fits together.

Draw the SOLVED architecture: the scenario with the correct answer in place. Boundaries (on-premises, AWS Region, account, VPC, public or private subnet) are zones; the users, services and data involved are nodes; links show how requests or data flow, in the order things happen.
- Include the piece(s) the correct option adds and tag them exactly "✓ The answer". Never draw services that appear only in the wrong options.
- Put scenario requirements on the pieces they apply to as tags (e.g. "Must stay private").
- Each link joins two pieces that talk directly (users to CloudFront to the app, not users straight to a database behind the app).
- For each link, explain in 1-2 plain sentences what happens in that step. For each node, give its role in this setup in one sentence.
- Keep it small and readable: 3-8 nodes, short labels. Be accurate to current AWS behaviour.
- Return diagram null when the question isn't about how things are set up: a fact, a limit, a price or billing model, a support plan, the shared responsibility model, or a definition.`;

function prompt(q: Q): string {
  return [
    `Topic: ${q.topic}`,
    `Scenario: ${q.stem}`,
    `Question: ${q.prompt}${q.type === "multi" ? ` (choose ${q.selectCount ?? 2})` : ""}`,
    "Options:",
    ...q.options.map((o) => `- ${o.text} [${o.correct ? "CORRECT" : "incorrect"}]`),
    "",
    `Why the answer is correct: ${q.explanation.answer}`,
    `Core concept: ${q.explanation.concept}`,
  ].join("\n");
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY isn't set. Add it to .env.local and run with: node --env-file=.env.local scripts/gen-diagrams.mts");
  process.exit(1);
}
const client = new Anthropic();
const usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, calls: 0 };

async function draw(q: Q) {
  const res = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 6000,
    output_config: { effort: "low", format: betaZodOutputFormat(Out) },
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: prompt(q) }],
  });
  usage.calls++;
  usage.input += res.usage.input_tokens;
  usage.output += res.usage.output_tokens;
  usage.cacheRead += res.usage.cache_read_input_tokens ?? 0;
  usage.cacheWrite += res.usage.cache_creation_input_tokens ?? 0;
  if (!res.parsed_output) throw new Error(`no output (${res.stop_reason})`);
  const d = res.parsed_output.diagram;
  if (!d) return null;
  return cleanDiagram({ ...d, links: d.links.map((l) => ({ ...l, decision: false })), nodes: d.nodes.map((n) => ({ ...n, kind: n.kind as (typeof NODE_KINDS)[number] })) });
}

for (const exam of EXAMS) {
  const dir = `content/${exam}`;
  const questions: Q[] = readdirSync(dir).filter((f) => f.endsWith(".json")).sort().flatMap((f) => JSON.parse(readFileSync(`${dir}/${f}`, "utf8")));
  const outFile = `src/lib/diagrams/${exam}.json`;
  const saved: Record<string, { hash: string; diagram: unknown }> = existsSync(outFile) ? JSON.parse(readFileSync(outFile, "utf8")) : {};
  const todo = questions.filter((q) => (!IDS || IDS.includes(q.id)) && saved[q.id]?.hash !== hashOf(q)).slice(0, LIMIT);
  console.log(`${exam}: ${todo.length} to draw`);
  let done = 0, drawn = 0, failed = 0;
  const save = () => writeFileSync(outFile, JSON.stringify(Object.fromEntries(Object.entries(saved).sort(([a], [b]) => a.localeCompare(b))), null, 1) + "\n");
  const queue = [...todo];
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    for (let q = queue.shift(); q; q = queue.shift()) {
      try {
        const diagram = await draw(q);
        saved[q.id] = { hash: hashOf(q), diagram };
        if (diagram) drawn++;
      } catch (err) {
        failed++;
        console.warn(`  ${q.id}: ${err instanceof Error ? err.message : err}`);
      }
      if (++done % 25 === 0) { save(); console.log(`  ${done}/${todo.length}`); }
    }
  }));
  save();
  console.log(`${exam}: ${drawn} diagrams, ${done - drawn - failed} with no diagram, ${failed} failed`);
}
console.log(`Usage over ${usage.calls} calls (${MODEL}): input ${usage.input}, output ${usage.output}, cache read ${usage.cacheRead}, cache write ${usage.cacheWrite}`);
