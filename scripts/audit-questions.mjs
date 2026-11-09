// Flags questions whose wrong answers give the game away, so they can be rewritten.
// Usage: node scripts/audit-questions.mjs content/aif-c01 [--list] [--json out.json]
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv.slice(2).find((a) => !a.startsWith("--") && !a.endsWith(".json"));
const list = process.argv.includes("--list");
const jsonIdx = process.argv.indexOf("--json");
const jsonOut = jsonIdx > -1 ? process.argv[jsonIdx + 1] : undefined;

// Service → category. A wrong answer from a different category than the right one is usually filler.
const CATEGORY = {
  ai: ["Bedrock", "SageMaker", "Comprehend", "Rekognition", "Transcribe", "Translate", "Polly", "Lex", "Textract", "Kendra", "Personalize", "Q Developer", "Quick", "Kiro", "AgentCore", "Augmented AI", "Ground Truth", "Clarify", "Nova", "Titan", "Strands"],
  security: ["IAM", "KMS", "Macie", "GuardDuty", "Inspector", "Shield", "WAF", "Secrets Manager", "Security Hub", "Cognito", "Certificate Manager", "Detective", "Firewall Manager", "Guardrails"],
  governance: ["Config", "CloudTrail", "Artifact", "Audit Manager", "Trusted Advisor", "Organizations", "Control Tower", "Service Catalog", "Cost Explorer", "Budgets", "Compute Optimizer", "Systems Manager", "CloudWatch"],
  network: ["Route 53", "CloudFront", "VPC", "PrivateLink", "Direct Connect", "Transit Gateway", "Global Accelerator", "Elastic Load Balancing", "API Gateway", "Site-to-Site VPN"],
  storage: ["S3", "Glacier", "EBS", "EFS", "FSx", "Storage Gateway", "Snowball", "DataSync", "Backup"],
  compute: ["EC2", "Lambda", "Fargate", "ECS", "EKS", "Batch", "Elastic Beanstalk", "Spot", "Auto Scaling", "Outposts", "Lightsail"],
  data: ["RDS", "Aurora", "DynamoDB", "ElastiCache", "MemoryDB", "Neptune", "DocumentDB", "Redshift", "OpenSearch", "Athena", "Glue", "Lake Formation", "EMR", "Kinesis", "MSK", "QuickSight", "DataZone"],
  integration: ["SQS", "SNS", "EventBridge", "Step Functions", "MQ", "AppSync"],
};
// Security and governance services are close look-alikes on the exams, so they count as one family.
const FAMILY = { governance: "security" };
const categoryOf = (text) => {
  for (const [cat, names] of Object.entries(CATEGORY)) if (names.some((n) => new RegExp(`\\b${n.replace(/ /g, "\\s")}\\b`).test(text))) return FAMILY[cat] ?? cat;
  return null;
};
// A bare service name such as "Amazon Polly" or "AWS Artifact".
const bareService = (t) => /^(Amazon|AWS)\s/.test(t) && t.split(/\s+/).length <= 6;

// Wording real exams avoid in wrong answers because it signals "obviously wrong".
const ABSURD = [
  /\b(at )?random(ly)?\b/i, /longest name/i, /\blogo\b/i, /color scheme/i, /\bfont\b/i,
  /\bpublic(ly)?\b.*\b(bucket|repository|write|read|logs?)\b/i, /make .* public/i,
  /disable (all )?(logging|logs|authentication|encryption)/i, /remove all/i, /delete (all|everything)/i,
  /\bignore\b/i, /\bskip (testing|evaluation|review)/i, /share .* (keys|credentials|passwords)/i,
  /(in|into) (the|its|their) (system )?prompts?\b.*(password|key|secret|credential)/i, /(password|key|secret|credential).*\b(in|into) (the )?(system )?prompt/i,
  /hope for the best/i, /email(ed)? .* which/i, /\bwiki page\b/i, /\bnothing\b/i, /never again/i, /\bforever\b/i,
];
const ABSOLUTE = /\b(guarantee[sd]?|always|never|eliminates? all|zero (errors|hallucinations|risk)|perfect)\b/i;

const issues = [];
for (const f of readdirSync(dir).filter((x) => x.endsWith(".json")).sort()) {
  for (const q of JSON.parse(readFileSync(join(dir, f), "utf8"))) {
    const scenario = `${q.stem} ${q.prompt}`;
    const right = q.options.filter((o) => o.correct);
    const wrong = q.options.filter((o) => !o.correct);
    const found = [];

    const rightCats = new Set(right.map((o) => categoryOf(o.text)).filter(Boolean));
    // Vector stores span database, storage, search and AI services, so they are fair alternatives to each other.
    const vectorQuestion = /vector|embedding|k-NN|\bRAG\b|knowledge base/i.test(scenario);
    for (const o of wrong) {
      const cat = categoryOf(o.text);
      // An off-category service that the scenario never mentions is a throwaway option.
      if (!vectorQuestion && bareService(o.text) && cat && rightCats.size && !rightCats.has(cat) && !scenario.includes(o.text.replace(/^(Amazon|AWS)\s/, ""))) {
        found.push(`off-topic: ${o.key} "${o.text}"`);
      }
      const temperatureRelevant = /temperature|random|creativ|varied|consisten|determin/i.test(scenario);
      if (ABSURD.some((r) => r.test(o.text)) || (!temperatureRelevant && /(increase|raise|higher) (the )?(model'?s? )?temperature/i.test(o.text))) {
        found.push(`implausible: ${o.key} "${o.text}"`);
      }
      if (ABSOLUTE.test(o.text) && !ABSOLUTE.test(right.map((r) => r.text).join(" "))) found.push(`absolute-word: ${o.key} "${o.text}"`);
    }

    if (q.type === "single") {
      const avgWrong = wrong.reduce((s, o) => s + o.text.length, 0) / wrong.length;
      const ratio = right[0].text.length / avgWrong;
      if (ratio >= 1.8 && right[0].text.length > 40) found.push(`length-giveaway: correct is ${ratio.toFixed(1)}x longer than wrong answers`);
    }

    if (found.length) issues.push({ id: q.id, file: f, domain: q.domain, difficulty: q.difficulty, issues: found });
  }
}

const total = readdirSync(dir).filter((x) => x.endsWith(".json")).reduce((s, f) => s + JSON.parse(readFileSync(join(dir, f), "utf8")).length, 0);
const byDomain = {}, byKind = {};
for (const i of issues) {
  byDomain[i.domain] = (byDomain[i.domain] ?? 0) + 1;
  for (const k of new Set(i.issues.map((x) => x.split(":")[0]))) byKind[k] = (byKind[k] ?? 0) + 1;
}
console.log(`${dir}: ${issues.length} of ${total} questions flagged (${Math.round((issues.length / total) * 100)}%)`);
console.log("  by domain:", JSON.stringify(byDomain));
console.log("  by issue: ", JSON.stringify(byKind));
if (list) for (const i of issues) console.log(`${i.id} [${i.difficulty}]\n    ${i.issues.join("\n    ")}`);
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(issues, null, 2));
