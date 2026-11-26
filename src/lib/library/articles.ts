import type { Guide } from "./types";

// Guides at /guides/[slug]: answer-first articles for the questions people ask search engines and AI assistants
// before they pick an exam or a practice site.

const P = "2026-11-26";

export const ARTICLES: Guide[] = [
  {
    kind: "guide", slug: "which-aws-certification-first", exams: ["clf-c02", "aif-c01", "saa-c03"],
    title: "Which AWS Certification Should I Take First?",
    metaTitle: "Which AWS Certification Should I Take First? (2026 Roadmap)",
    description: "A plain-English AWS certification roadmap for 2026: when to start with Cloud Practitioner, AI Practitioner or go straight to Solutions Architect – Associate, with study time and cost for each.",
    published: P, reviewed: P,
    answer: "Most people should start with AWS Certified Cloud Practitioner (CLF-C02) if they're new to AWS, or with AWS Certified AI Practitioner (AIF-C01) if their goal is AI and they know cloud basics. If you already build on AWS, go straight to Solutions Architect – Associate (SAA-C03), the most requested associate-level AWS certification.",
    sections: [
      { id: "paths", heading: "Pick your starting point", table: { head: ["Your situation", "Start with", "Then"], rows: [
        ["New to the cloud, any role", "Cloud Practitioner (CLF-C02)", "Solutions Architect – Associate, or AI Practitioner"],
        ["Business, product or sales role working with AI", "AI Practitioner (AIF-C01)", "Cloud Practitioner if AWS basics feel shaky"],
        ["Developer or IT pro with some AWS experience", "Solutions Architect – Associate (SAA-C03)", "Developer – Associate or a Professional exam"],
        ["Want to build AI and ML on AWS", "AI Practitioner (AIF-C01)", "Machine Learning Engineer – Associate"],
      ] } },
      { id: "compare", heading: "The three exams side by side", table: { head: ["", "CLF-C02", "AIF-C01", "SAA-C03"], rows: [
        ["Level", "Foundational", "Foundational", "Associate"],
        ["Questions / time", "65 / 90 min", "65 / 90 min", "65 / 130 min"],
        ["Passing score", "700 / 1,000", "700 / 1,000", "720 / 1,000"],
        ["Exam fee", "$100 USD", "$100 USD", "$150 USD"],
        ["Typical study time", "2–4 weeks", "2–4 weeks", "6–10 weeks"],
        ["Hands-on needed", "No", "No coding", "Yes, recommended"],
      ] } },
      { id: "advice", heading: "How to decide quickly", bullets: [
        "If you can't explain a VPC, IAM role or S3 bucket yet, Cloud Practitioner first will make every later exam easier.",
        "If your job is about generative AI, AI Practitioner is the more useful first badge, and it also covers some AWS basics.",
        "If you've deployed apps on AWS, skipping Cloud Practitioner is common; Solutions Architect – Associate carries more weight with employers.",
        "Passing one AWS exam gives you a 50% discount voucher for your next one.",
      ] },
    ],
    rules: [],
    faq: [
      ["Do I need Cloud Practitioner before Solutions Architect – Associate?", "No. AWS has no prerequisites. Cloud Practitioner is a gentle start, but people with AWS experience often go straight to the associate exam."],
      ["Which AWS certification is easiest?", "Cloud Practitioner (CLF-C02). It tests breadth of knowledge, not hands-on skills, and most beginners pass after 2–4 weeks of study."],
      ["How long are AWS certifications valid?", "Three years."],
    ],
    samples: { match: /./, count: 0 },
    references: [
      { title: "AWS Certification paths", url: "https://aws.amazon.com/certification/" },
      { title: "AWS Certified Cloud Practitioner", url: "https://aws.amazon.com/certification/certified-cloud-practitioner/" },
      { title: "AWS Certified AI Practitioner", url: "https://aws.amazon.com/certification/certified-ai-practitioner/" },
    ],
    related: ["how-to-know-you-are-ready-for-aws-exam", "aws-exam-cost-format-passing-score", "s3", "bedrock"],
  },

  {
    kind: "guide", slug: "how-to-know-you-are-ready-for-aws-exam", exams: ["saa-c03", "clf-c02", "aif-c01"],
    title: "How Do I Know I'm Ready for My AWS Exam?",
    metaTitle: "How to Know You're Ready for an AWS Exam (SAA-C03, CLF-C02, AIF-C01)",
    description: "Why practice exam scores can mislead, and four checks that show you're ready for an AWS certification exam: scores on fresh questions, every domain, timing and explaining wrong answers.",
    published: P, reviewed: P,
    answer: "You're likely ready when you score 80% or more on questions you're seeing for the first time, in every exam domain, within the time limit, and you can explain why each wrong option is wrong. Retaking the same practice tests inflates scores because you start remembering answers, so judge yourself on fresh questions.",
    sections: [
      { id: "trap", heading: "Why practice scores can fool you", lead: "A common story: someone scores 85% on a practice test they've taken twice, then fails the real exam. Their score measured memory of those questions, not understanding.", bullets: [
        "The second time through a question set, you recognize answers instead of reasoning them out.",
        "An overall average can hide one weak domain that costs you the exam.",
        "Untimed practice hides pacing problems; long scenarios on SAA-C03 take real time to read.",
      ] },
      { id: "checks", heading: "Four checks before you book", table: { head: ["Check", "Target", "Why"], rows: [
        ["Fresh questions", "80%+ on questions you haven't memorized", "Measures understanding, not memory"],
        ["Every domain", "No domain below 70%", "The real exam samples every domain by weight"],
        ["Timing", "A full mock exam finished with time to review", "Running out of time costs easy points"],
        ["Explain the wrong options", "You can say why each distractor fails", "Real questions reword the same ideas"],
      ] } },
      { id: "how", heading: "How Certificate Exam Pro helps", lead: "Each exam has 500 original questions, and practice serves the ones you haven't seen first, so you keep meeting new scenarios. Your dashboard shows an estimated readiness score by exam domain, and timed mock exams show how you do under real conditions. It's a study signal, never a pass guarantee." },
    ],
    rules: [],
    faq: [
      ["What practice score do I need to pass an AWS exam?", "AWS doesn't publish a conversion. A good rule is 80% or more on fresh, unseen questions across every domain. Scores on repeated questions overstate readiness."],
      ["Should I retake practice exams?", "Yes, to fix mistakes, but don't count repeat scores as proof you're ready. Use new questions, or retry only the questions you got wrong."],
    ],
    samples: { match: /./, count: 0 },
    references: [{ title: "AWS Certification exam scoring", url: "https://aws.amazon.com/certification/policies/before-testing/" }],
    related: ["which-aws-certification-first", "aws-exam-cost-format-passing-score"],
  },

  {
    kind: "guide", slug: "aws-retired-services-exam", exams: ["saa-c03", "clf-c02", "aif-c01"],
    title: "AWS Services Retired or Changed in 2025–2026: What It Means for Your Exam",
    metaTitle: "Retired & Renamed AWS Services 2026: What Changes for Your AWS Exam",
    description: "Kendra, Q Business, SageMaker Clarify, Snowball Edge, Support plans and more: which AWS services are closed, retired or renamed in 2025–2026, and whether SAA-C03, CLF-C02 and AIF-C01 still test them.",
    published: P, reviewed: P,
    answer: "AWS closes, retires and renames services every quarter, but its exam guides update more slowly. In 2026, Amazon Kendra, Amazon Q Business and several SageMaker AI features (Clarify, Model Monitor, A2I, Ground Truth) closed to new customers, Snowball Edge closed in late 2025, and AWS's Support plans are being replaced. Here is each change and what it means for your exam.",
    sections: [
      { id: "how", heading: "How to read AWS lifecycle terms", table: { head: ["Term", "Meaning"], rows: [
        ["Maintenance", "Closed to new customers. Existing customers keep using it, but AWS won't add features."],
        ["Sunset", "An end-of-support date has been announced; customers should migrate."],
        ["End of support / shutdown", "The service is gone."],
      ] } },
      { id: "exam-guides", heading: "What the exam guides say now", bullets: [
        "AIF-C01: the current list of in-scope services no longer includes Amazon Kendra or Amazon Q; it does include Amazon Bedrock, Bedrock AgentCore, Amazon Nova, Amazon Quick, Kiro, Strands Agents and AWS Transform.",
        "SAA-C03: the in-scope list still includes the AWS Snow Family and AWS Data Pipeline, even though AWS has closed them to new customers.",
        "CLF-C02: the in-scope list includes AWS Support, while AWS is moving customers to new plans (Business Support+, Enterprise Support, Unified Operations).",
      ] },
    ],
    rules: [],
    faq: [
      ["Will the real exam ask about a service AWS closed?", "It can, if the exam guide still lists it, because exam questions are written and retired on AWS's own schedule. Learn what such services do, and prefer the current service when both appear as options."],
      ["Where does AWS announce these changes?", "On the AWS Product Lifecycle page and in quarterly 'AWS Service Availability Updates' posts on the What's New feed."],
    ],
    samples: { match: /./, count: 0 },
    references: [
      { title: "AWS Service Availability Updates (June 30, 2026)", url: "https://aws.amazon.com/about-aws/whats-new/2026/06/aws-service-availability/" },
      { title: "AWS Service Availability Updates (March 31, 2026)", url: "https://aws.amazon.com/about-aws/whats-new/2026/03/aws-service-availability/" },
      { title: "AIF-C01 in-scope AWS services", url: "https://docs.aws.amazon.com/aws-certification/latest/ai-practitioner-01/aif-01-in-scope-services.html" },
      { title: "SAA-C03 in-scope AWS services", url: "https://docs.aws.amazon.com/aws-certification/latest/solutions-architect-associate-03/saa-03-in-scope-services.html" },
    ],
    related: ["bedrock", "sagemaker-ai", "s3", "which-aws-certification-first"],
  },

  {
    kind: "guide", slug: "aws-exam-cost-format-passing-score", exams: ["clf-c02", "aif-c01", "saa-c03"],
    title: "AWS Exam Cost, Format and Passing Score (2026)",
    metaTitle: "AWS Exam Cost, Passing Score & Format 2026 (CLF-C02, AIF-C01, SAA-C03)",
    description: "How much AWS certification exams cost, how many questions they have, how long they take and the passing scores for CLF-C02, AIF-C01 and SAA-C03, plus retakes and discounts.",
    published: P, reviewed: P,
    answer: "AWS foundational exams (Cloud Practitioner CLF-C02 and AI Practitioner AIF-C01) cost $100 USD, have 65 questions in 90 minutes and need 700 out of 1,000 to pass. Solutions Architect – Associate (SAA-C03) costs $150 USD, has 65 questions in 130 minutes and needs 720. Fifteen questions on each exam are unscored.",
    sections: [
      { id: "table", heading: "At a glance", table: { head: ["Exam", "Fee", "Questions", "Time", "Passing score"], rows: [
        ["Cloud Practitioner (CLF-C02)", "$100 USD", "65 (50 scored)", "90 min", "700"],
        ["AI Practitioner (AIF-C01)", "$100 USD", "65 (50 scored)", "90 min", "700"],
        ["Solutions Architect – Associate (SAA-C03)", "$150 USD", "65 (50 scored)", "130 min", "720"],
      ] } },
      { id: "details", heading: "Good to know", bullets: [
        "Scores are scaled from 100 to 1,000; you don't need a set percentage of questions right.",
        "There's no penalty for guessing, so answer every question.",
        "You can take the exam at a test center or online with a proctor.",
        "If you fail, you can retake after 14 days, paying the full fee again.",
        "Passing gives you a 50% discount voucher for your next AWS exam.",
        "Non-native English speakers can request 30 extra minutes (ESL +30) before booking.",
        "Fees vary by country and exchange rate; check when you book.",
      ] },
    ],
    rules: [],
    faq: [
      ["What percentage do I need to pass an AWS exam?", "AWS uses scaled scores, not a fixed percentage. The pass mark is 700 for foundational exams and 720 for associate exams, on a scale of 100–1,000."],
      ["How soon can I retake an AWS exam?", "After 14 days. There's no limit on attempts, but you pay each time."],
    ],
    samples: { match: /./, count: 0 },
    references: [
      { title: "AWS Certification exam policies", url: "https://aws.amazon.com/certification/policies/" },
      { title: "AWS Certification exam prices", url: "https://aws.amazon.com/certification/policies/before-testing/" },
    ],
    related: ["which-aws-certification-first", "how-to-know-you-are-ready-for-aws-exam"],
  },
];
