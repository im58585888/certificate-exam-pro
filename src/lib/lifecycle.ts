// AWS service status notes. AWS retires and renames services faster than it updates its exam guides, and learners
// get confused when a practice question mentions a service AWS has closed. Each entry below is a dated, sourced fact
// from AWS's own lifecycle notices; any question whose text mentions the service shows the note with its explanation.
//
// To add an entry: confirm it on the AWS Product Lifecycle page or an AWS "Service Availability Updates" post, then
// bump LIFECYCLE_CHECKED. Notes only add context; a question whose answer is wrong must be fixed in content/.

export const LIFECYCLE_CHECKED = "2026-11-26";

export type ExamSlug = "saa-c03" | "clf-c02" | "aif-c01";

export interface StatusNote {
  id: string;
  service: string;
  /** Short label: "Closed to new customers", "Renamed", "Retired". */
  label: string;
  /** What changed, in plain words. */
  text: string;
  /** What this means for the exam, per exam (omitted where it adds nothing). */
  exam?: Partial<Record<ExamSlug, string>>;
  source: { title: string; url: string };
}

interface Entry extends StatusNote {
  match: RegExp;
}

const JUNE_2026 = { title: "AWS Service Availability Updates (June 30, 2026)", url: "https://aws.amazon.com/about-aws/whats-new/2026/06/aws-service-availability/" };
const MARCH_2026 = { title: "AWS Service Availability Updates (March 31, 2026)", url: "https://aws.amazon.com/about-aws/whats-new/2026/03/aws-service-availability/" };
const SEPT_2026 = { title: "AWS Service Availability Updates (September 29, 2026)", url: "https://aws.amazon.com/about-aws/whats-new/2026/09/aws-service-availability/" };
const NOT_IN_GUIDE = (code: string) => `It isn't on the current ${code} exam guide's list of in-scope services, so it's unlikely to be the answer on the real exam. Learn it as background.`;
const SAGEMAKER_FEATURE = "The AIF-C01 exam guide lists Amazon SageMaker AI as in scope, and the tasks this feature does still come up in exam scenarios, so learn what it's for.";

const ENTRIES: Entry[] = [
  {
    id: "kendra", service: "Amazon Kendra", match: /\bKendra\b/, label: "Closed to new customers",
    text: "Since July 30, 2026, Amazon Kendra is in maintenance: existing customers can keep using it, but new customers can't start. For new search-and-answer builds AWS points to Amazon Bedrock Knowledge Bases (RAG) and Amazon Quick.",
    exam: { "aif-c01": NOT_IN_GUIDE("AIF-C01"), "clf-c02": NOT_IN_GUIDE("CLF-C02"), "saa-c03": NOT_IN_GUIDE("SAA-C03") },
    source: JUNE_2026,
  },
  {
    id: "q-business", service: "Amazon Q Business", match: /\bQ Business\b/, label: "Closed to new customers",
    text: "Since July 30, 2026, Amazon Q Business is in maintenance and closed to new customers. Amazon Quick is AWS's AI assistant for business users.",
    exam: { "aif-c01": NOT_IN_GUIDE("AIF-C01") },
    source: JUNE_2026,
  },
  {
    id: "bedrock-agents", service: "Amazon Bedrock Agents", match: /\bBedrock Agents\b|\bAgents for Amazon Bedrock\b/, label: "Renamed and closed to new customers",
    text: "The original Amazon Bedrock Agents (launched 2023) is now called Bedrock Agents Classic and has been closed to new customers since July 30, 2026. New agents are built with Amazon Bedrock AgentCore.",
    exam: { "aif-c01": "The idea the exam tests is unchanged: an agent plans steps, calls tools and APIs, and keeps context. The current exam guide lists Amazon Bedrock and Amazon Bedrock AgentCore." },
    source: JUNE_2026,
  },
  {
    id: "sagemaker-clarify", service: "SageMaker Clarify", match: /\bClarify\b/, label: "Closed to new customers",
    text: "Since July 30, 2026, the SageMaker AI Clarify feature (bias detection and explainability) is in maintenance and closed to new customers. Existing customers can keep using it.",
    exam: { "aif-c01": SAGEMAKER_FEATURE },
    source: JUNE_2026,
  },
  {
    id: "sagemaker-model-monitor", service: "SageMaker Model Monitor", match: /\bModel Monitor\b/, label: "Closed to new customers",
    text: "Since July 30, 2026, the SageMaker AI Model Monitor feature (data and model drift monitoring) is in maintenance and closed to new customers. Existing customers can keep using it.",
    exam: { "aif-c01": SAGEMAKER_FEATURE },
    source: JUNE_2026,
  },
  {
    id: "a2i", service: "Amazon Augmented AI (A2I)", match: /\bAugmented AI\b|\bA2I\b/, label: "Closed to new customers",
    text: "Since July 30, 2026, Amazon Augmented AI (A2I), the human review feature of SageMaker AI, is in maintenance and closed to new customers.",
    exam: { "aif-c01": "Human-in-the-loop review is still an exam concept; just know A2I was AWS's managed way to do it." },
    source: JUNE_2026,
  },
  {
    id: "ground-truth", service: "SageMaker Ground Truth", match: /\bGround Truth\b/, label: "Closed to new customers",
    text: "Since July 30, 2026, SageMaker AI Ground Truth (data labeling) is in maintenance and closed to new customers. Ground Truth Plus reached end of support on June 30, 2026, and Amazon Mechanical Turk on September 29, 2026.",
    exam: { "aif-c01": "Data labeling is still an exam concept; know that Ground Truth was SageMaker AI's labeling feature." },
    source: JUNE_2026,
  },
  {
    id: "mechanical-turk", service: "Amazon Mechanical Turk", match: /\bMechanical Turk\b/, label: "Retired",
    text: "Amazon Mechanical Turk reached end of support on September 29, 2026.",
    source: SEPT_2026,
  },
  {
    id: "audit-manager", service: "AWS Audit Manager", match: /\bAudit Manager\b/, label: "Closed to new customers",
    text: "Since April 30, 2026, AWS Audit Manager is in maintenance and closed to new customers. Existing customers can keep using it.",
    exam: { "aif-c01": NOT_IN_GUIDE("AIF-C01"), "saa-c03": NOT_IN_GUIDE("SAA-C03"), "clf-c02": NOT_IN_GUIDE("CLF-C02") },
    source: MARCH_2026,
  },
  {
    id: "cloudtrail-lake", service: "AWS CloudTrail Lake", match: /\bCloudTrail Lake\b/, label: "Closed to new customers",
    text: "Since May 31, 2026, CloudTrail Lake is closed to new customers. AWS CloudTrail itself is unaffected.",
    exam: { "saa-c03": "The exam guide lists AWS CloudTrail. Expect questions about trails, event history and log delivery to S3." },
    source: MARCH_2026,
  },
  {
    id: "app-runner", service: "AWS App Runner", match: /\bApp Runner\b/, label: "Closed to new customers",
    text: "Since April 30, 2026, AWS App Runner is in maintenance and closed to new customers.",
    source: MARCH_2026,
  },
  {
    id: "comprehend-features", service: "Amazon Comprehend", match: /Comprehend.{0,60}\b(topic modeling|event detection)\b/i, label: "Feature closed to new customers",
    text: "Since April 30, 2026, Amazon Comprehend's topic modeling, event detection and prompt safety classification features are closed to new customers. The rest of Comprehend is unaffected.",
    source: MARCH_2026,
  },
  {
    id: "rekognition-features", service: "Amazon Rekognition", match: /Rekognition.{0,80}\b(stream|streaming|batch .{0,20}moderation)\b/i, label: "Feature closed to new customers",
    text: "Since April 30, 2026, Amazon Rekognition's streaming events and batch image content moderation features are closed to new customers. Image and video analysis in general is unaffected.",
    source: MARCH_2026,
  },
  {
    id: "arc-readiness", service: "Application Recovery Controller", match: /\bApplication Recovery Controller\b/, label: "Feature closed to new customers",
    text: "Since April 30, 2026, the readiness check feature of Amazon Application Recovery Controller is closed to new customers. Routing control and zonal shift are unaffected.",
    source: MARCH_2026,
  },
  {
    id: "snowball", service: "AWS Snowball Edge", match: /\bSnowball\b/, label: "Closed to new customers",
    text: "Since November 7, 2025, AWS Snowball Edge is only available to existing customers. For new projects AWS recommends AWS DataSync for online transfers and AWS Data Transfer Terminal for physical transfers.",
    exam: { "saa-c03": "The SAA-C03 exam guide still lists the AWS Snow Family, so it can still be the answer for moving very large datasets offline.", "clf-c02": "Know Snowball Edge as AWS's offline, physical data transfer device; questions about very large one-time transfers may still use it." },
    source: { title: "AWS Snowball Edge availability change", url: "https://docs.aws.amazon.com/snowball/latest/developer-guide/snowball-edge-availability-change.html" },
  },
  {
    id: "support-plans", service: "AWS Support plans", match: /\b(Developer|Business|Enterprise On-Ramp)\b(?=[^.]{0,80}\b(Support|support plan|plan)\b)|\b(Developer|Business) Support\b|\bEnterprise On-Ramp\b/, label: "Plans changing",
    text: "AWS is replacing its support plans: Developer Support and Enterprise On-Ramp end on January 1, 2027. The current paid plans are Business Support+, Enterprise Support and Unified Operations, plus the free Basic plan.",
    exam: { "clf-c02": "The CLF-C02 exam guide lists AWS Support. Know what each tier adds (response times, TAM, Concierge, Trusted Advisor checks) and that plan names are changing." },
    source: { title: "Getting started with AWS Support", url: "https://docs.aws.amazon.com/awssupport/latest/user/getting-started.html" },
  },
  {
    id: "s3-select", service: "Amazon S3 Select", match: /\bS3 Select\b|\bGlacier Select\b/, label: "Closed to new customers",
    text: "Since July 2024, Amazon S3 Select is no longer available to new customers. AWS recommends Amazon Athena or client-side filtering instead.",
    source: { title: "Filtering and retrieving data using Amazon S3 Select", url: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/selecting-content-from-objects.html" },
  },
  {
    id: "forecast", service: "Amazon Forecast", match: /\bAmazon Forecast\b/, label: "Closed to new customers",
    text: "Since July 2024, Amazon Forecast is no longer available to new customers. AWS points new forecasting work to SageMaker AI Canvas.",
    source: { title: "What is Amazon Forecast?", url: "https://docs.aws.amazon.com/forecast/latest/dg/what-is-forecast.html" },
  },
  {
    id: "workdocs", service: "Amazon WorkDocs", match: /\bWorkDocs\b/, label: "Retired",
    text: "Amazon WorkDocs reached end of support on April 25, 2025.",
    source: { title: "AWS Lifecycle Changes", url: "https://docs.aws.amazon.com/general/latest/gr/service-lifecycle.html" },
  },
  {
    id: "app-mesh", service: "AWS App Mesh", match: /\bApp Mesh\b/, label: "Retired",
    text: "AWS App Mesh reached end of support on September 30, 2026. AWS points to Amazon ECS Service Connect and Amazon VPC Lattice instead.",
    source: { title: "AWS App Mesh end of support", url: "https://docs.aws.amazon.com/app-mesh/latest/userguide/what-is-app-mesh.html" },
  },
  {
    id: "sms", service: "AWS Server Migration Service", match: /\bServer Migration Service\b/, label: "Retired",
    text: "AWS Server Migration Service (SMS) was discontinued in 2022. AWS Application Migration Service (MGN) replaced it for lift-and-shift migrations.",
    source: { title: "AWS Application Migration Service", url: "https://docs.aws.amazon.com/mgn/latest/ug/what-is-application-migration-service.html" },
  },
  {
    id: "kinesis-analytics", service: "Kinesis Data Analytics", match: /\bKinesis Data Analytics\b/, label: "Renamed",
    text: "Amazon Kinesis Data Analytics was renamed Amazon Managed Service for Apache Flink in 2023. Older study material still uses the old name.",
    source: { title: "What is Amazon Managed Service for Apache Flink?", url: "https://docs.aws.amazon.com/managed-flink/latest/java/what-is.html" },
  },
  {
    id: "kinesis-firehose", service: "Kinesis Data Firehose", match: /\bKinesis (Data )?Firehose\b/, label: "Renamed",
    text: "Amazon Kinesis Data Firehose was renamed Amazon Data Firehose in 2024. Older study material still uses the old name.",
    source: { title: "What is Amazon Data Firehose?", url: "https://docs.aws.amazon.com/firehose/latest/dev/what-is-this-service.html" },
  },
  {
    id: "oai", service: "CloudFront origin access identity (OAI)", match: /\bOAI\b|\bOrigin Access Identity\b/i, label: "Legacy",
    text: "CloudFront's origin access identity (OAI) is the legacy way to keep an S3 origin private. AWS recommends origin access control (OAC), which also supports SSE-KMS encrypted objects and all Regions.",
    exam: { "saa-c03": "If both appear as options, OAC is the current best practice." },
    source: { title: "Restrict access to an Amazon S3 origin", url: "https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html" },
  },
];

/** The text of a question that a learner sees, for matching against the entries. */
function questionText(q: { stem: string; prompt: string; options: { text: string; why: string }[]; explanation: { answer: string; concept: string; examTip: string } }): string {
  return [q.stem, q.prompt, ...q.options.map((o) => `${o.text} ${o.why}`), q.explanation.answer, q.explanation.concept, q.explanation.examTip].join("\n");
}

/** Status notes for a question, with only the exam note that applies to its exam. */
export function statusNotesFor(q: Parameters<typeof questionText>[0], exam: string | undefined): StatusNote[] {
  const text = questionText(q);
  return ENTRIES.filter((e) => e.match.test(text)).map((e) => ({
    id: e.id, service: e.service, label: e.label, text: e.text, source: e.source,
    exam: exam && e.exam?.[exam as ExamSlug] ? { [exam]: e.exam[exam as ExamSlug] } : undefined,
  }));
}

/** Every entry, for the public "What changed" page. */
export function allStatusNotes(): StatusNote[] {
  return ENTRIES.map(({ match: _m, ...rest }) => { void _m; return rest; });
}
