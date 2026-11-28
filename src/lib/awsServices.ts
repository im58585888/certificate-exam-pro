// AWS services the question banks mention, with a pattern that finds each one in an answer option's text. Used by the
// study sheet's "Your gaps" panel to work out which services a learner needs to deep dive and which ones they mix up.
// Patterns are case-sensitive on purpose ("Config", "Shield", "Glue" are only services when capitalised).

export type ServiceCategory = "Compute" | "Storage" | "Database" | "Networking" | "Security" | "Management" | "Integration" | "Analytics" | "Migration" | "AI and ML";

export interface AwsService {
  id: string;
  name: string;
  re: RegExp;
  /** Our cheat sheet, when there is one. */
  sheet?: string;
  category: ServiceCategory;
}

const S = (id: string, name: string, re: RegExp, sheet: string | undefined, category: ServiceCategory): AwsService => ({ id, name, re, sheet, category });

export const AWS_SERVICES: AwsService[] = [
  // Compute
  S("ec2", "Amazon EC2", /\bEC2\b(?! Auto Scaling)|\bSpot\b|\bReserved Instances?\b|\bDedicated (?:Hosts?|Instances?)\b|\bOn-Demand (?:Instances?|Capacity)/, "ec2", "Compute"),
  S("autoscaling", "EC2 Auto Scaling", /\bAuto Scaling\b/, undefined, "Compute"),
  S("lambda", "AWS Lambda", /\bLambda\b/, "lambda", "Compute"),
  S("ecs", "Amazon ECS", /\bECS\b|Elastic Container Service/, undefined, "Compute"),
  S("eks", "Amazon EKS", /\bEKS\b|Elastic Kubernetes Service/, undefined, "Compute"),
  S("fargate", "AWS Fargate", /\bFargate\b/, undefined, "Compute"),
  S("beanstalk", "Elastic Beanstalk", /Elastic Beanstalk/, undefined, "Compute"),
  S("lightsail", "Amazon Lightsail", /\bLightsail\b/, undefined, "Compute"),
  S("batch", "AWS Batch", /\bAWS Batch\b/, undefined, "Compute"),
  S("outposts", "AWS Outposts", /\bOutposts?\b/, undefined, "Compute"),
  S("savingsplans", "Savings Plans", /\bSavings Plans?\b/, undefined, "Compute"),
  // Storage
  S("s3", "Amazon S3", /\bS3\b(?! Glacier)|\bbuckets?\b/, "s3", "Storage"),
  S("glacier", "S3 Glacier", /\bGlacier\b/, "s3", "Storage"),
  S("ebs", "Amazon EBS", /\bEBS\b|Elastic Block Store/, undefined, "Storage"),
  S("efs", "Amazon EFS", /\bEFS\b|Elastic File System/, undefined, "Storage"),
  S("fsx", "Amazon FSx", /\bFSx\b/, undefined, "Storage"),
  S("storagegateway", "Storage Gateway", /Storage Gateway/, undefined, "Storage"),
  S("backup", "AWS Backup", /\bAWS Backup\b/, undefined, "Storage"),
  S("snow", "Snow Family", /\bSnowball\b|\bSnowcone\b|\bSnowmobile\b/, undefined, "Storage"),
  S("datasync", "AWS DataSync", /\bDataSync\b/, undefined, "Storage"),
  S("transfer", "Transfer Family", /Transfer Family/, undefined, "Storage"),
  // Database
  S("rds", "Amazon RDS", /\bRDS\b/, "rds", "Database"),
  S("aurora", "Amazon Aurora", /\bAurora\b/, "rds", "Database"),
  S("dynamodb", "Amazon DynamoDB", /\bDynamoDB\b(?! Accelerator)|\bDAX\b/, "dynamodb", "Database"),
  S("elasticache", "Amazon ElastiCache", /\bElastiCache\b/, undefined, "Database"),
  S("redshift", "Amazon Redshift", /\bRedshift\b/, undefined, "Database"),
  S("documentdb", "Amazon DocumentDB", /\bDocumentDB\b/, undefined, "Database"),
  S("neptune", "Amazon Neptune", /\bNeptune\b/, undefined, "Database"),
  S("keyspaces", "Amazon Keyspaces", /\bKeyspaces\b/, undefined, "Database"),
  S("timestream", "Amazon Timestream", /\bTimestream\b/, undefined, "Database"),
  S("memorydb", "Amazon MemoryDB", /\bMemoryDB\b/, undefined, "Database"),
  S("dms", "AWS DMS", /\bDMS\b|Database Migration Service/, undefined, "Database"),
  // Networking
  S("vpc", "Amazon VPC", /\bVPC\b(?! endpoint| peering| Lattice)|\bsubnets?\b|\bNAT gateway\b|\binternet gateway\b/, "vpc", "Networking"),
  S("vpcendpoint", "VPC endpoints / PrivateLink", /\b(?:VPC|gateway|interface) endpoints?\b|\bPrivateLink\b/, "vpc", "Networking"),
  S("peering", "VPC peering", /\bVPC peering\b|\bpeering connection/, undefined, "Networking"),
  S("tgw", "Transit Gateway", /Transit Gateway/, undefined, "Networking"),
  S("vpn", "Site-to-Site VPN", /\bVPN\b/, undefined, "Networking"),
  S("dx", "Direct Connect", /Direct Connect/, undefined, "Networking"),
  S("cloudfront", "Amazon CloudFront", /\bCloudFront\b/, "cloudfront", "Networking"),
  S("route53", "Amazon Route 53", /Route 53/, undefined, "Networking"),
  S("elb", "Elastic Load Balancing", /Load Balancer|\bALB\b|\bNLB\b|\bGWLB\b|\bELB\b/, undefined, "Networking"),
  S("globalaccelerator", "Global Accelerator", /Global Accelerator/, undefined, "Networking"),
  S("apigw", "Amazon API Gateway", /API Gateway/, undefined, "Networking"),
  S("sg", "Security groups", /\bsecurity groups?\b/i, "vpc", "Networking"),
  S("nacl", "Network ACLs", /\bnetwork ACLs?\b|\bNACLs?\b/i, "vpc", "Networking"),
  // Security and identity
  S("iam", "AWS IAM", /\bIAM\b|\bAssumeRole\b|\bpermissions? boundar/, "iam", "Security"),
  S("organizations", "AWS Organizations", /\bOrganizations\b|\bSCPs?\b|service control polic/i, undefined, "Security"),
  S("identitycenter", "IAM Identity Center", /Identity Center|\bAWS SSO\b/, undefined, "Security"),
  S("cognito", "Amazon Cognito", /\bCognito\b/, undefined, "Security"),
  S("kms", "AWS KMS", /\bKMS\b|Key Management Service/, undefined, "Security"),
  S("cloudhsm", "AWS CloudHSM", /\bCloudHSM\b/, undefined, "Security"),
  S("secrets", "Secrets Manager", /Secrets Manager/, undefined, "Security"),
  S("parameterstore", "Parameter Store", /Parameter Store/, undefined, "Security"),
  S("acm", "Certificate Manager", /Certificate Manager|\bACM\b/, undefined, "Security"),
  S("waf", "AWS WAF", /\bWAF\b/, undefined, "Security"),
  S("shield", "AWS Shield", /\bShield\b/, undefined, "Security"),
  S("guardduty", "Amazon GuardDuty", /\bGuardDuty\b/, undefined, "Security"),
  S("inspector", "Amazon Inspector", /\bInspector\b/, undefined, "Security"),
  S("macie", "Amazon Macie", /\bMacie\b/, undefined, "Security"),
  S("securityhub", "Security Hub", /Security Hub/, undefined, "Security"),
  S("detective", "Amazon Detective", /\bDetective\b/, undefined, "Security"),
  S("firewallmanager", "Firewall Manager", /Firewall Manager/, undefined, "Security"),
  S("networkfirewall", "Network Firewall", /Network Firewall/, undefined, "Security"),
  S("artifact", "AWS Artifact", /\bAWS Artifact\b/, undefined, "Security"),
  S("auditmanager", "Audit Manager", /Audit Manager/, undefined, "Security"),
  // Management and monitoring
  S("cloudwatch", "Amazon CloudWatch", /\bCloudWatch\b/, undefined, "Management"),
  S("cloudtrail", "AWS CloudTrail", /\bCloudTrail\b/, undefined, "Management"),
  S("config", "AWS Config", /\bAWS Config\b|\bConfig rules?\b/, undefined, "Management"),
  S("systemsmanager", "Systems Manager", /Systems Manager|Session Manager|Patch Manager/, undefined, "Management"),
  S("cloudformation", "CloudFormation", /\bCloudFormation\b/, undefined, "Management"),
  S("cdk", "AWS CDK", /\bCDK\b/, undefined, "Management"),
  S("trustedadvisor", "Trusted Advisor", /Trusted Advisor/, undefined, "Management"),
  S("controltower", "Control Tower", /Control Tower/, undefined, "Management"),
  S("servicecatalog", "Service Catalog", /Service Catalog/, undefined, "Management"),
  S("health", "AWS Health", /Health Dashboard|\bAWS Health\b/, undefined, "Management"),
  S("xray", "AWS X-Ray", /\bX-Ray\b/, undefined, "Management"),
  S("computeoptimizer", "Compute Optimizer", /Compute Optimizer/, undefined, "Management"),
  S("costexplorer", "Cost Explorer", /Cost Explorer/, undefined, "Management"),
  S("budgets", "AWS Budgets", /\bBudgets\b/, undefined, "Management"),
  S("anomaly", "Cost Anomaly Detection", /Cost Anomaly Detection/, undefined, "Management"),
  S("costtags", "Cost allocation tags", /[Cc]ost allocation tags/, undefined, "Management"),
  S("cur", "Cost and Usage Report", /Cost and Usage Report|\bCUR\b/, undefined, "Management"),
  S("pricingcalc", "Pricing Calculator", /Pricing Calculator/, undefined, "Management"),
  S("support", "AWS Support plans", /\b(?:Basic|Developer|Business|Enterprise)(?: On-Ramp)? Support\b|Business Support\+/, undefined, "Management"),
  S("wellarchitected", "Well-Architected", /Well-Architected/, undefined, "Management"),
  // Integration
  S("sqs", "Amazon SQS", /\bSQS\b/, undefined, "Integration"),
  S("sns", "Amazon SNS", /\bSNS\b/, undefined, "Integration"),
  S("eventbridge", "Amazon EventBridge", /\bEventBridge\b/, undefined, "Integration"),
  S("stepfunctions", "Step Functions", /Step Functions/, undefined, "Integration"),
  S("mq", "Amazon MQ", /Amazon MQ/, undefined, "Integration"),
  S("appsync", "AWS AppSync", /\bAppSync\b/, undefined, "Integration"),
  // Analytics
  S("kinesis", "Kinesis Data Streams", /Kinesis Data Streams|\bKinesis\b(?! Data Firehose| Video)/, undefined, "Analytics"),
  S("firehose", "Data Firehose", /\bFirehose\b/, undefined, "Analytics"),
  S("msk", "Amazon MSK", /\bMSK\b|Managed Streaming for Apache Kafka/, undefined, "Analytics"),
  S("athena", "Amazon Athena", /\bAthena\b/, undefined, "Analytics"),
  S("glue", "AWS Glue", /\bGlue\b/, undefined, "Analytics"),
  S("emr", "Amazon EMR", /\bEMR\b/, undefined, "Analytics"),
  S("lakeformation", "Lake Formation", /Lake Formation/, undefined, "Analytics"),
  S("opensearch", "Amazon OpenSearch", /\bOpenSearch\b/, undefined, "Analytics"),
  S("quicksight", "Amazon Quick", /\bQuickSight\b|\bAmazon Quick\b/, undefined, "Analytics"),
  S("flink", "Managed Service for Apache Flink", /\bFlink\b/, undefined, "Analytics"),
  // Migration
  S("mgn", "Application Migration Service", /Application Migration Service|\bMGN\b/, undefined, "Migration"),
  S("migrationhub", "Migration Hub", /Migration Hub/, undefined, "Migration"),
  // AI and ML
  S("bedrock", "Amazon Bedrock", /\bBedrock\b/, "bedrock", "AI and ML"),
  S("sagemaker", "Amazon SageMaker AI", /\bSageMaker\b/, "sagemaker-ai", "AI and ML"),
  S("q", "Amazon Q", /\bAmazon Q\b|\bQ Developer\b|\bQ Business\b/, undefined, "AI and ML"),
  S("comprehend", "Amazon Comprehend", /\bComprehend\b/, undefined, "AI and ML"),
  S("rekognition", "Amazon Rekognition", /\bRekognition\b/, undefined, "AI and ML"),
  S("textract", "Amazon Textract", /\bTextract\b/, undefined, "AI and ML"),
  S("transcribe", "Amazon Transcribe", /\bTranscribe\b/, undefined, "AI and ML"),
  S("translate", "Amazon Translate", /\bTranslate\b/, undefined, "AI and ML"),
  S("polly", "Amazon Polly", /\bPolly\b/, undefined, "AI and ML"),
  S("lex", "Amazon Lex", /\bLex\b/, undefined, "AI and ML"),
  S("kendra", "Amazon Kendra", /\bKendra\b/, undefined, "AI and ML"),
  S("personalize", "Amazon Personalize", /\bPersonalize\b/, undefined, "AI and ML"),
  S("forecast", "Amazon Forecast", /\bForecast\b/, undefined, "AI and ML"),
  S("frauddetector", "Fraud Detector", /Fraud Detector/, undefined, "AI and ML"),
  S("a2i", "Augmented AI (A2I)", /\bA2I\b|Augmented AI/, undefined, "AI and ML"),
  S("nova", "Amazon Nova", /\bNova\b/, undefined, "AI and ML"),
];

/** The services a piece of text mentions, in the order they first appear. */
export function servicesIn(text: string): AwsService[] {
  return AWS_SERVICES
    .map((s) => ({ s, at: text.search(s.re) }))
    .filter((x) => x.at >= 0)
    .sort((a, b) => a.at - b.at)
    .map((x) => x.s);
}

/** Our comparison pages and the services each one compares, for linking "you mix these up" pairs. */
export const COMPARE_PAIRS: { slug: string; ids: string[] }[] = [
  { slug: "s3-vs-ebs-vs-efs", ids: ["s3", "ebs", "efs", "glacier"] },
  { slug: "rds-vs-aurora-vs-dynamodb", ids: ["rds", "aurora", "dynamodb"] },
  { slug: "alb-vs-nlb-vs-gwlb", ids: ["elb"] },
  { slug: "security-groups-vs-nacls", ids: ["sg", "nacl"] },
  { slug: "secrets-manager-vs-parameter-store", ids: ["secrets", "parameterstore"] },
  { slug: "sqs-vs-sns-vs-eventbridge", ids: ["sqs", "sns", "eventbridge"] },
  { slug: "multi-az-vs-read-replicas", ids: ["rds", "aurora"] },
  { slug: "bedrock-vs-sagemaker-ai", ids: ["bedrock", "sagemaker"] },
];

const CATEGORY = new Map(AWS_SERVICES.map((s) => [s.name, s.category]));

/** The map's cluster for a service name; names that aren't AWS services (concepts Mia grouped by) go under "Concepts". */
export const categoryOf = (name: string): string => CATEGORY.get(name) ?? "Concepts";
