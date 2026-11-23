// Written content for the public exam guides (/exams/[exam]). Exam facts that the site already knows (question count,
// time, passing score, domain weights) come from exams.ts; this file holds the prose. Keep facts here in line with
// the official AWS exam guides, and bump GUIDE_UPDATED when they change.

export const GUIDE_UPDATED = "2026-11-23";

export interface Guide {
  /** One-paragraph direct answer at the top of the page: what the exam is and who it's for. */
  summary: string;
  audience: string;
  fee: string;
  formats: string;
  experience: string;
  officialUrl: string;
  /** What each domain covers, keyed by domain id. */
  domains: Record<string, string>;
  studyWeeks: string;
  plan: { title: string; body: string }[];
  faq: [string, string][];
}

const SHARED_FAQ: [string, string][] = [
  ["Are these real AWS exam questions?", "No. Every question on Certificate Exam Pro is original, written to follow the official AWS exam guide's domains and style. Using leaked real exam questions breaks the AWS certification agreement and can get a certification revoked. Certificate Exam Pro is not affiliated with AWS."],
  ["How long is an AWS certification valid?", "Three years. You can renew by passing the current version of the exam, or for foundational certifications by earning a higher-level AWS certification."],
  ["Is there a discount on my next AWS exam?", "Yes. After you earn an AWS certification, AWS gives you a 50% discount voucher for your next exam, available in your AWS Certification account."],
];

export const GUIDES: Record<string, Guide> = {
  "clf-c02": {
    summary:
      "The AWS Certified Cloud Practitioner (CLF-C02) is AWS's entry-level certification. It checks that you understand what the cloud is, the core AWS services, security and the shared responsibility model, and how AWS pricing and support work. It doesn't require hands-on technical skills, which makes it the usual first AWS certification for both technical and non-technical roles.",
    audience: "Beginners, career changers, and people in sales, finance, project management or support roles who work with AWS. Also a common first step before the Solutions Architect – Associate.",
    fee: "$100 USD",
    formats: "Multiple choice (one correct answer) and multiple response (two or more correct answers). 50 questions are scored and 15 are unscored questions AWS is trying out; you can't tell which are which.",
    experience: "AWS recommends up to 6 months of exposure to the AWS Cloud. No technical experience is required.",
    officialUrl: "https://aws.amazon.com/certification/certified-cloud-practitioner/",
    domains: {
      concepts: "The benefits of the cloud (elasticity, agility, global reach, pay-as-you-go), the AWS Well-Architected Framework, migration strategies and the AWS Cloud Adoption Framework, and cloud economics.",
      compliance: "The shared responsibility model, security and compliance concepts, access management with IAM (users, roles, policies, MFA, the root user), and security services such as AWS Shield, AWS WAF, Amazon GuardDuty and AWS Artifact.",
      technology: "How to deploy and run on AWS, the global infrastructure (Regions, Availability Zones, edge locations), and the core services for compute, databases, networking, storage, analytics and AI/ML.",
      billing: "Pricing models (On-Demand, Reserved Instances, Savings Plans, Spot), cost tools (AWS Budgets, Cost Explorer, consolidated billing in AWS Organizations), and the AWS Support plans and where to find technical help.",
    },
    studyWeeks: "2–4 week",
    plan: [
      { title: "Week 1: Learn the concepts", body: "Read the official exam guide and work through AWS's free Cloud Practitioner Essentials course. Focus on the shared responsibility model and the global infrastructure: they come up across every domain." },
      { title: "Week 2: Practice by domain", body: "Do practice questions one domain at a time, starting with Cloud Technology and Services (the largest at 34%). Read the explanation for every option, including the wrong ones." },
      { title: "Week 3: Fix your weak spots", body: "Review the questions you missed until you get them right. Billing and support plans are small but easy points once you've memorized the differences." },
      { title: "Week 4: Full mock exams", body: "Take timed 65-question mock exams. Book the real exam once you're scoring 80% or more consistently." },
    ],
    faq: [
      ["How hard is the AWS Cloud Practitioner exam?", "It's AWS's easiest certification. Most people with no cloud background pass after 2–4 weeks of study. The challenge is breadth, not depth: you need to recognize many services and pick the right one from a short description."],
      ["How many questions are on CLF-C02, and what's the passing score?", "65 questions in 90 minutes. Scores range from 100 to 1,000, and you need 700 to pass."],
      ["How much does the CLF-C02 exam cost?", "$100 USD. Prices vary by country and exchange rate, so check the AWS Certification site when you book."],
      ["Should I take Cloud Practitioner or AI Practitioner first?", "Take Cloud Practitioner first if you're new to AWS: it covers the core services that the AI Practitioner assumes you know. If you already work with AWS and your goal is AI, you can start with the AI Practitioner."],
      ...SHARED_FAQ,
    ],
  },

  "aif-c01": {
    summary:
      "The AWS Certified AI Practitioner (AIF-C01) is AWS's foundational certification for artificial intelligence. It checks that you understand AI, machine learning and generative AI concepts, can choose the right AWS AI services (especially Amazon Bedrock and Amazon SageMaker), and know how to use AI responsibly and securely. You don't need to build models or write code.",
    audience: "Business analysts, product managers, IT staff, marketers and anyone who works with AI tools or makes decisions about them. Also a strong first certification for people who want to move into AI.",
    fee: "$100 USD (AWS's foundational-level price)",
    formats: "Multiple choice, multiple response, ordering, matching and case study questions. 50 questions are scored and 15 are unscored questions AWS is trying out.",
    experience: "AWS recommends up to 6 months of exposure to AI/ML technologies on AWS. No coding or model-building experience is required.",
    officialUrl: "https://aws.amazon.com/certification/certified-ai-practitioner/",
    domains: {
      fundamentals: "Core AI and ML terminology, types of learning (supervised, unsupervised, reinforcement), when AI is and isn't the right tool, practical use cases, and the ML development lifecycle.",
      genai: "How generative AI and foundation models work (tokens, embeddings, transformers), what they're good at and where they fail (hallucinations), and the AWS services and infrastructure for building with them.",
      applications: "Designing applications with foundation models: choosing a model, prompt engineering, retrieval-augmented generation (RAG), agents, fine-tuning, and evaluating model output, mostly with Amazon Bedrock.",
      responsible: "Building AI responsibly: bias and fairness, transparency and explainability, and tools such as Amazon SageMaker Clarify and Guardrails for Amazon Bedrock.",
      security: "Securing AI systems and data with IAM, encryption and private networking, plus governance, compliance and data privacy for AI workloads.",
    },
    studyWeeks: "2–4 week",
    plan: [
      { title: "Week 1: Learn the vocabulary", body: "Read the official exam guide and learn the core terms: model, training vs. inference, fine-tuning, RAG, embeddings, tokens, hallucination. Many questions turn on knowing exactly what one of these means." },
      { title: "Week 2: Know the AWS AI services", body: "Learn what Amazon Bedrock, SageMaker, Amazon Q, Comprehend, Rekognition, Textract, Transcribe, Translate and Polly each do, and when you'd choose one over another." },
      { title: "Week 3: Practice by domain", body: "Start with Applications of Foundation Models, the largest domain at 28%. Read every explanation, then review your missed questions until they stick." },
      { title: "Week 4: Full mock exams", body: "Take timed 65-question mock exams and book the real exam once you're scoring 80% or more." },
    ],
    faq: [
      ["How hard is the AWS AI Practitioner exam?", "It's a foundational exam, about as hard as Cloud Practitioner. It's harder if you haven't used AWS before, because it assumes you know basic AWS services, security and pricing."],
      ["How many questions are on AIF-C01, and what's the passing score?", "65 questions in 90 minutes. Scores range from 100 to 1,000, and you need 700 to pass."],
      ["How much does the AIF-C01 exam cost?", "$100 USD, AWS's price for foundational exams. Prices vary by country, so check the AWS Certification site when you book."],
      ["Do I need to know how to code for AIF-C01?", "No. The exam tests concepts and choosing the right service, not writing code or training models yourself."],
      ...SHARED_FAQ,
    ],
  },

  "saa-c03": {
    summary:
      "The AWS Certified Solutions Architect – Associate (SAA-C03) is AWS's most popular certification. It checks that you can design architectures on AWS that are secure, resilient, high-performing and cost-optimized: given a business scenario and its requirements, you pick the combination of services that meets them best. It's an associate-level exam, so it goes much deeper than Cloud Practitioner.",
    audience: "Developers, system administrators, cloud and DevOps engineers, and anyone who designs or builds systems on AWS. A common requirement for cloud engineering jobs.",
    fee: "$150 USD",
    formats: "Multiple choice (one correct answer) and multiple response (two or more correct answers). 50 questions are scored and 15 are unscored questions AWS is trying out. Most questions are scenarios a paragraph long.",
    experience: "AWS recommends at least 1 year of hands-on experience designing cloud solutions with AWS services.",
    officialUrl: "https://aws.amazon.com/certification/certified-solutions-architect-associate/",
    domains: {
      secure: "Securing access to AWS resources (IAM, multi-account setups with AWS Organizations and IAM Identity Center), securing workloads and networks (VPC design, security groups, AWS WAF), and protecting data with encryption and AWS KMS.",
      resilient: "Building scalable, loosely coupled architectures (Amazon SQS, SNS, EventBridge, serverless) and highly available, fault-tolerant systems across Availability Zones and Regions, including backup and disaster recovery.",
      performance: "Choosing high-performing storage, compute, database and networking (EBS vs. EFS vs. S3, caching with ElastiCache and CloudFront, Auto Scaling) and data ingestion and transformation solutions.",
      cost: "Designing cost-optimized storage (S3 storage classes and lifecycle rules), compute (Spot, Savings Plans, right-sizing), databases and networking (NAT gateway and data transfer costs).",
    },
    studyWeeks: "6–10 week",
    plan: [
      { title: "Weeks 1–2: Core services, hands-on", body: "Read the official exam guide, then build in a free-tier account: a VPC with public and private subnets, EC2 behind a load balancer with Auto Scaling, an RDS database and S3. Building it once makes the scenarios much easier to picture." },
      { title: "Weeks 3–5: Practice by domain", body: "Work through each domain, starting with Design Secure Architectures (the largest at 30%). For every question, read why each wrong option fails the requirement: that's the skill the exam tests." },
      { title: "Weeks 6–8: Learn the keywords", body: "Scenarios hinge on phrases like 'most cost-effective', 'least operational overhead' and 'highly available'. Review your missed questions until you can spot which requirement decides the answer." },
      { title: "Final weeks: Full mock exams", body: "Take timed 65-question mock exams (130 minutes). Book the real exam once you're scoring 80% or more consistently." },
    ],
    faq: [
      ["How hard is the AWS Solutions Architect – Associate exam?", "Considerably harder than Cloud Practitioner. Questions are long scenarios where two or three answers would work, and you must pick the one that best fits a requirement like lowest cost or least operational overhead. Most people study for 6–10 weeks."],
      ["How many questions are on SAA-C03, and what's the passing score?", "65 questions in 130 minutes. Scores range from 100 to 1,000, and you need 720 to pass."],
      ["How much does the SAA-C03 exam cost?", "$150 USD. If you've already passed another AWS certification, you can use your 50% discount voucher."],
      ["Do I need Cloud Practitioner before Solutions Architect – Associate?", "No, it isn't required. But if you're new to AWS, Cloud Practitioner is a good first step, and passing it gives you a 50% discount on the Associate exam."],
      ...SHARED_FAQ,
    ],
  },
};
