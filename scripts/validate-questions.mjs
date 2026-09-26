// Validates question-bank JSON files: schema, answer counts, duplicate IDs, and optional link checks (--links).
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? new URL("../content/saa-c03", import.meta.url).pathname.replaceAll("%20", " ");
const checkLinks = process.argv.includes("--links");
const DOMAINS = { secure: 0.30, resilient: 0.26, performance: 0.24, cost: 0.20 };
const errors = [];
const all = [];

for (const f of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
  for (const q of JSON.parse(readFileSync(join(dir, f), "utf8"))) {
    all.push(q);
    const e = (m) => errors.push(`${q.id ?? f}: ${m}`);
    for (const k of ["id", "domain", "topic", "difficulty", "type", "stem", "prompt", "options", "explanation"]) if (!q[k]) e(`missing ${k}`);
    if (!(q.domain in DOMAINS)) e(`bad domain ${q.domain}`);
    const correct = q.options.filter((o) => o.correct).length;
    const want = q.type === "multi" ? q.selectCount : 1;
    if (correct !== want) e(`expected ${want} correct, found ${correct}`);
    if (q.type === "single" && q.options.length !== 4) e(`single-select should have 4 options`);
    if (q.type === "multi" && q.options.length < 5) e(`multi-select should have 5+ options`);
    if (q.type === "multi" && !/select (two|three)/i.test(q.prompt)) e(`multi prompt must say "Select TWO/THREE"`);
    q.options.forEach((o) => { if (!o.why || o.why.length < 40) e(`option ${o.key} needs a real explanation`); });
    for (const k of ["answer", "concept", "examTip"]) if (!q.explanation[k]) e(`explanation.${k} missing`);
    if (!q.explanation.references?.length) e(`no references`);
  }
}
const ids = all.map((q) => q.id);
ids.filter((id, i) => ids.indexOf(id) !== i).forEach((id) => errors.push(`duplicate id ${id}`));

console.log(`${all.length} questions in ${dir}`);
for (const [d, w] of Object.entries(DOMAINS)) {
  const n = all.filter((q) => q.domain === d).length;
  console.log(`  ${d.padEnd(12)} ${String(n).padStart(3)}  (${((n / all.length) * 100).toFixed(0)}% vs target ${w * 100}%)`);
}
const pos = {}; all.filter((q) => q.type === "single").forEach((q) => { const k = q.options.find((o) => o.correct).key; pos[k] = (pos[k] ?? 0) + 1; });
console.log(`  multi-select: ${all.filter((q) => q.type === "multi").length}; single-answer key spread: ${JSON.stringify(pos)}`);

if (checkLinks) {
  const urls = [...new Set(all.flatMap((q) => q.explanation.references.map((r) => r.url)))];
  const res = await Promise.all(urls.map(async (u) => {
    try { const r = await fetch(u, { redirect: "follow" }); return [u, r.status]; } catch (err) { return [u, String(err.cause?.code ?? err)]; }
  }));
  res.filter(([, s]) => s !== 200).forEach(([u, s]) => errors.push(`link ${s}: ${u}`));
  console.log(`  links checked: ${urls.length}`);
}
if (errors.length) { console.error(`\n${errors.length} problem(s):\n` + errors.join("\n")); process.exit(1); }
console.log("OK");
