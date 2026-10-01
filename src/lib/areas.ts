/**
 * Study areas: service-level groups of each exam's fine-grained question topics, so learners can pick
 * "Networking" or "Prompt Engineering" instead of 100+ one-question topics. Areas cut across exam
 * domains (a Storage question can be about security, resilience, performance or cost).
 */
export interface Area {
  id: string;
  name: string;
}

const SAA_AREAS: Area[] = [
  { id: "identity", name: "Identity & Access" },
  { id: "data-protection", name: "Encryption & Data Protection" },
  { id: "threats", name: "Monitoring & Threat Protection" },
  { id: "networking", name: "Networking & Connectivity" },
  { id: "compute", name: "Compute & Scaling" },
  { id: "serverless", name: "Serverless & Containers" },
  { id: "storage", name: "Storage & Backup" },
  { id: "databases", name: "Databases & Caching" },
  { id: "integration", name: "Messaging & Integration" },
  { id: "analytics", name: "Analytics & Streaming" },
  { id: "edge", name: "Content Delivery & Edge" },
  { id: "resilience", name: "High Availability & DR" },
  { id: "governance", name: "Cost, Governance & Operations" },
];

const SAA_TOPIC_AREA: Record<string, string> = {
  // Identity & Access
  "IAM": "identity", "AWS Organizations": "identity", "Account Security": "identity", "Application Authorization": "identity",
  "Identity Federation": "identity", "Identity for Apps": "identity", "Hybrid Identity": "identity", "Instance Access": "identity",
  "Multi-Account Governance": "identity", "Zero Trust Access": "identity", "Data Access Control": "identity", "Remote Access": "identity",
  // Encryption & Data Protection
  "Encryption": "data-protection", "Encryption in Transit": "data-protection", "Certificates": "data-protection",
  "Secrets Management": "data-protection", "Data Protection": "data-protection", "Compliance": "data-protection", "Data Residency": "data-protection",
  // Monitoring & Threat Protection
  "Threat Detection": "threats", "Security Operations": "threats", "Incident Response": "threats", "Vulnerability Management": "threats",
  "Logging & Audit": "threats", "Logging Cost": "threats", "Monitoring": "threats", "DDoS Protection": "threats", "Web Security": "threats",
  "Edge Security": "threats", "Software Supply Chain": "threats", "CI/CD Security": "threats", "Shared Responsibility": "threats",
  // Networking & Connectivity
  "VPC Endpoints": "networking", "VPC Networking": "networking", "VPC Security": "networking", "Network Security": "networking",
  "Network Troubleshooting": "networking", "Private Connectivity": "networking", "Hybrid Connectivity": "networking", "Hybrid DNS": "networking",
  "Route 53": "networking", "Global Networking": "networking", "Multi-Account Networking": "networking", "EC2 Networking": "networking",
  "Network Costs": "networking", "Data Transfer": "networking", "Load Balancing": "networking", "Load Balancing Cost": "networking",
  // Compute & Scaling
  "Auto Scaling": "compute", "EC2 Cost Optimization": "compute", "EC2 Instance Types": "compute", "EC2 Placement": "compute",
  "EC2 Pricing": "compute", "EC2 Resilience": "compute", "EC2 Security": "compute", "Compute Choice": "compute", "Compute Platforms": "compute",
  "Capacity Planning": "compute", "Capacity Planning Cost": "compute", "Elasticity": "compute", "Rightsizing": "compute",
  "Licensing": "compute", "Licensing Cost": "compute", "Batch Processing": "compute", "Stateless Design": "compute", "Immutable Infrastructure": "compute",
  // Serverless & Containers
  "Containers": "serverless", "Container Cost": "serverless", "Container Security": "serverless", "Serverless": "serverless",
  "Serverless Cost": "serverless", "Serverless Performance": "serverless", "Serverless Resilience": "serverless", "Serverless Security": "serverless",
  "API Performance": "serverless", "API Resilience": "serverless", "API Security": "serverless", "Real-time APIs": "serverless",
  // Storage & Backup
  "S3 Cost Management": "storage", "S3 Data Protection": "storage", "S3 Lifecycle": "storage", "S3 Management": "storage",
  "S3 Performance": "storage", "S3 Replication": "storage", "S3 Resilience": "storage", "S3 Security": "storage", "S3 Storage Classes": "storage",
  "Storage": "storage", "Storage Cost": "storage", "Storage Cleanup": "storage", "Block Storage": "storage", "Block Storage Cost": "storage",
  "File Storage": "storage", "File Storage Cost": "storage", "File Access to S3": "storage", "Hybrid Storage": "storage",
  "Instance Storage": "storage", "Static Hosting": "storage", "Backup": "storage", "Backup Cost": "storage", "Backup Security": "storage",
  // Databases & Caching
  "Aurora": "databases", "Databases": "databases", "Database Pricing": "databases", "Database Scaling": "databases",
  "Database Security": "databases", "Database Selection": "databases", "DynamoDB": "databases", "DynamoDB Pricing": "databases",
  "RDS Backup": "databases", "RDS High Availability": "databases", "Serverless Databases": "databases", "Caching": "databases", "Caching Cost": "databases",
  // Messaging & Integration
  "Decoupling": "integration", "Messaging": "integration", "Messaging Cost": "integration", "Messaging Security": "integration",
  "Event-Driven": "integration", "Orchestration": "integration",
  // Analytics & Streaming
  "Analytics": "analytics", "Analytics Cost": "analytics", "Analytics Security": "analytics", "Streaming": "analytics", "Streaming Cost": "analytics",
  "Search & Analytics": "analytics", "Search Cost": "analytics", "Data Lake Cost": "analytics", "IoT": "analytics",
  // Content Delivery & Edge
  "CloudFront": "edge", "Content Delivery": "edge", "Content Delivery Cost": "edge", "Edge Infrastructure": "edge", "Edge Compute": "edge",
  // High Availability & DR
  "Disaster Recovery": "resilience", "High Availability": "resilience", "Multi-Region": "resilience", "Graceful Degradation": "resilience",
  "Static Stability": "resilience", "Resilience Assessment": "resilience", "Resilience Testing": "resilience",
};


const AIF_AREAS: Area[] = [
  { id: "ml-concepts", name: "AI & ML Concepts" },
  { id: "use-cases", name: "AI Use Cases & AWS AI Services" },
  { id: "ml-lifecycle", name: "ML Lifecycle & MLOps" },
  { id: "genai-concepts", name: "GenAI Concepts & Limits" },
  { id: "aws-genai", name: "Bedrock & AWS GenAI Services" },
  { id: "agents", name: "Agents & Agentic AI" },
  { id: "cost-selection", name: "Cost & Model Selection" },
  { id: "rag", name: "RAG & Vector Stores" },
  { id: "prompting", name: "Prompt Engineering" },
  { id: "customization", name: "Training & Fine-Tuning" },
  { id: "evaluation", name: "Evaluation & Business Value" },
  { id: "responsible", name: "Responsible AI & Bias" },
  { id: "explainability", name: "Transparency & Explainability" },
  { id: "security", name: "Securing AI Systems" },
  { id: "governance", name: "Governance & Compliance" },
];

const AIF_TOPIC_AREA: Record<string, string> = {
  "AI Terminology": "ml-concepts", "Learning Types": "ml-concepts", "Data Types": "ml-concepts", "ML Techniques": "ml-concepts",
  "Model Fit": "ml-concepts", "Inference Types": "ml-concepts",
  "AI Use Cases": "use-cases", "AWS AI Services": "use-cases", "When Not to Use AI": "use-cases", "Traditional ML vs FMs": "use-cases",
  "ML Pipeline": "ml-lifecycle", "MLOps": "ml-lifecycle", "Model Metrics": "ml-lifecycle", "Model Deployment": "ml-lifecycle",
  "Model Sources": "ml-lifecycle", "AWS Services by Stage": "ml-lifecycle",
  "Tokens & Embeddings": "genai-concepts", "Model Architectures": "genai-concepts", "Foundation Models": "genai-concepts",
  "FM Lifecycle": "genai-concepts", "Context Engineering": "genai-concepts", "GenAI Use Cases": "genai-concepts",
  "Prompt Basics": "genai-concepts", "GenAI Advantages": "genai-concepts", "GenAI Limitations": "genai-concepts",
  "Amazon Bedrock": "aws-genai", "AWS GenAI Services": "aws-genai", "SageMaker AI & JumpStart": "aws-genai", "AWS Infrastructure Benefits": "aws-genai",
  "Agentic AI Concepts": "agents", "Agent Memory": "agents", "Model Context Protocol": "agents", "Multi-Agent Systems": "agents",
  "Workflow Orchestration": "agents", "Bedrock AgentCore": "agents", "Strands Agents": "agents", "AI Agents": "agents", "Agent Security": "agents",
  "Cost Tradeoffs": "cost-selection", "Token Pricing": "cost-selection", "Model Selection": "cost-selection", "Business Metrics": "cost-selection",
  "FM Selection": "cost-selection",
  "RAG": "rag", "Vector Databases": "rag",
  "Prompt Techniques": "prompting", "Prompt Constructs": "prompting", "Prompt Best Practices": "prompting", "Prompt Management": "prompting",
  "Prompt Risks": "prompting", "Inference Parameters": "prompting",
  "Customization Tradeoffs": "customization", "FM Training": "customization", "Fine-Tuning Methods": "customization", "Fine-Tuning Data": "customization",
  "Evaluation Approaches": "evaluation", "Evaluation Metrics": "evaluation", "Evaluating Applications": "evaluation", "Business Alignment": "evaluation",
  "Responsible AI Features": "responsible", "Bias Detection": "responsible", "Bias & Variance": "responsible", "Datasets": "responsible",
  "Legal Risks": "responsible", "Responsible Model Selection": "responsible", "Guardrails": "responsible",
  "Explainability": "explainability", "Model Documentation": "explainability", "Human-Centered Design": "explainability",
  "Access Control": "security", "Encryption": "security", "Network Security": "security", "Application Security": "security",
  "Guardrails for Security": "security", "Privacy Risks": "security", "Secure Data Engineering": "security", "Security Considerations": "security",
  "Security Services": "security", "Sensitive Data Discovery": "security", "Shared Responsibility": "security", "Threat Detection": "security",
  "Vulnerability Management": "security", "Infrastructure Protection": "security", "Hallucination Mitigation": "security",
  "Compliance Services": "governance", "Data Governance": "governance", "Data Lineage": "governance", "Audit Logging": "governance",
  "Governance Frameworks": "governance", "Governance Processes": "governance",
};

// Topics added later through the admin editor fall back to a general area for their exam.
const AREA_SETS: Record<string, { areas: Area[]; topics: Record<string, string>; fallback: string }> = {
  "saa-c03": { areas: SAA_AREAS, topics: SAA_TOPIC_AREA, fallback: "governance" },
  "aif-c01": { areas: AIF_AREAS, topics: AIF_TOPIC_AREA, fallback: "ml-concepts" },
};

export function areasFor(exam: string): Area[] {
  return AREA_SETS[exam]?.areas ?? [];
}

/** Area id for a question topic within an exam. */
export function areaOf(exam: string, topic: string): string {
  const set = AREA_SETS[exam];
  return set ? set.topics[topic] ?? set.fallback : "other";
}

export const isArea = (exam: string, v: string) => areasFor(exam).some((a) => a.id === v);
