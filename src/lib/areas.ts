/**
 * Study areas: service-level groups of the fine-grained question topics, so learners can pick
 * "Networking" or "Databases" instead of 180 one-question topics. Areas cut across exam domains
 * (a Storage question can be about security, resilience, performance or cost).
 */
export const AREAS = [
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
] as const;

export type AreaId = (typeof AREAS)[number]["id"];

const TOPIC_AREA: Record<string, AreaId> = {
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

/** Area for a question topic. Topics added later through the admin editor fall back to the operations group. */
export function areaOf(topic: string): AreaId {
  return TOPIC_AREA[topic] ?? "governance";
}

export const isArea = (v: string): v is AreaId => AREAS.some((a) => a.id === v);
