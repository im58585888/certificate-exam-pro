// AWS services the question banks mention, with a pattern that finds each one in an answer option's text. Used by the
// study sheet's "Your gaps" panel to work out which services a learner needs to deep dive and which ones they mix up.
// Patterns are case-sensitive on purpose ("Config", "Shield", "Glue" are only services when capitalised).

export interface AwsService {
  id: string;
  name: string;
  re: RegExp;
  /** Our cheat sheet, when there is one. */
  sheet?: string;
}

const S = (id: string, name: string, re: RegExp, sheet?: string): AwsService => ({ id, name, re, sheet });

export const AWS_SERVICES: AwsService[] = [
  // Compute
  S("ec2", "Amazon EC2", /\bEC2\b(?! Auto Scaling)|\bSpot\b|\bReserved Instances?\b|\bDedicated (?:Hosts?|Instances?)\b|\bOn-Demand (?:Instances?|Capacity)/, "ec2"),
  S("autoscaling", "EC2 Auto Scaling", /\bAuto Scaling\b/),
  S("lambda", "AWS Lambda", /\bLambda\b/, "lambda"),
  S("ecs", "Amazon ECS", /\bECS\b|Elastic Container Service/),
  S("eks", "Amazon EKS", /\bEKS\b|Elastic Kubernetes Service/),
  S("fargate", "AWS Fargate", /\bFargate\b/),
  S("beanstalk", "Elastic Beanstalk", /Elastic Beanstalk/),
  S("lightsail", "Amazon Lightsail", /\bLightsail\b/),
  S("batch", "AWS Batch", /\bAWS Batch\b/),
  S("outposts", "AWS Outposts", /\bOutposts?\b/),
  S("savingsplans", "Savings Plans", /\bSavings Plans?\b/),
  // Storage
  S("s3", "Amazon S3", /\bS3\b(?! Glacier)|\bbuckets?\b/, "s3"),
  S("glacier", "S3 Glacier", /\bGlacier\b/, "s3"),
  S("ebs", "Amazon EBS", /\bEBS\b|Elastic Block Store/),
  S("efs", "Amazon EFS", /\bEFS\b|Elastic File System/),
  S("fsx", "Amazon FSx", /\bFSx\b/),
  S("storagegateway", "Storage Gateway", /Storage Gateway/),
  S("backup", "AWS Backup", /\bAWS Backup\b/),
  S("snow", "Snow Family", /\bSnowball\b|\bSnowcone\b|\bSnowmobile\b/),
  S("datasync", "AWS DataSync", /\bDataSync\b/),
  S("transfer", "Transfer Family", /Transfer Family/),
  // Database
  S("rds", "Amazon RDS", /\bRDS\b/, "rds"),
  S("aurora", "Amazon Aurora", /\bAurora\b/, "rds"),
  S("dynamodb", "Amazon DynamoDB", /\bDynamoDB\b(?! Accelerator)|\bDAX\b/, "dynamodb"),
  S("elasticache", "Amazon ElastiCache", /\bElastiCache\b/),
  S("redshift", "Amazon Redshift", /\bRedshift\b/),
  S("documentdb", "Amazon DocumentDB", /\bDocumentDB\b/),
  S("neptune", "Amazon Neptune", /\bNeptune\b/),
  S("keyspaces", "Amazon Keyspaces", /\bKeyspaces\b/),
  S("timestream", "Amazon Timestream", /\bTimestream\b/),
  S("memorydb", "Amazon MemoryDB", /\bMemoryDB\b/),
  S("dms", "AWS DMS", /\bDMS\b|Database Migration Service/),
  // Networking
  S("vpc", "Amazon VPC", /\bVPC\b(?! endpoint| peering| Lattice)|\bsubnets?\b|\bNAT gateway\b|\binternet gateway\b/, "vpc"),
  S("vpcendpoint", "VPC endpoints / PrivateLink", /\b(?:VPC|gateway|interface) endpoints?\b|\bPrivateLink\b/, "vpc"),
  S("peering", "VPC peering", /\bVPC peering\b|\bpeering connection/),
  S("tgw", "Transit Gateway", /Transit Gateway/),
  S("vpn", "Site-to-Site VPN", /\bVPN\b/),
  S("dx", "Direct Connect", /Direct Connect/),
  S("cloudfront", "Amazon CloudFront", /\bCloudFront\b/, "cloudfront"),
  S("route53", "Amazon Route 53", /Route 53/),
  S("elb", "Elastic Load Balancing", /Load Balancer|\bALB\b|\bNLB\b|\bGWLB\b|\bELB\b/),
  S("globalaccelerator", "Global Accelerator", /Global Accelerator/),
  S("apigw", "Amazon API Gateway", /API Gateway/),
  S("sg", "Security groups", /\bsecurity groups?\b/i, "vpc"),
  S("nacl", "Network ACLs", /\bnetwork ACLs?\b|\bNACLs?\b/i, "vpc"),
  // Security and identity
  S("iam", "AWS IAM", /\bIAM\b|\bAssumeRole\b|\bpermissions? boundar/, "iam"),
  S("organizations", "AWS Organizations", /\bOrganizations\b|\bSCPs?\b|service control polic/i),
  S("identitycenter", "IAM Identity Center", /Identity Center|\bAWS SSO\b/),
  S("cognito", "Amazon Cognito", /\bCognito\b/),
  S("kms", "AWS KMS", /\bKMS\b|Key Management Service/),
  S("cloudhsm", "AWS CloudHSM", /\bCloudHSM\b/),
  S("secrets", "Secrets Manager", /Secrets Manager/),
  S("parameterstore", "Parameter Store", /Parameter Store/),
  S("acm", "Certificate Manager", /Certificate Manager|\bACM\b/),
  S("waf", "AWS WAF", /\bWAF\b/),
  S("shield", "AWS Shield", /\bShield\b/),
  S("guardduty", "Amazon GuardDuty", /\bGuardDuty\b/),
  S("inspector", "Amazon Inspector", /\bInspector\b/),
  S("macie", "Amazon Macie", /\bMacie\b/),
  S("securityhub", "Security Hub", /Security Hub/),
  S("detective", "Amazon Detective", /\bDetective\b/),
  S("firewallmanager", "Firewall Manager", /Firewall Manager/),
  S("networkfirewall", "Network Firewall", /Network Firewall/),
  S("artifact", "AWS Artifact", /\bAWS Artifact\b/),
  S("auditmanager", "Audit Manager", /Audit Manager/),
  // Management and monitoring
  S("cloudwatch", "Amazon CloudWatch", /\bCloudWatch\b/),
  S("cloudtrail", "AWS CloudTrail", /\bCloudTrail\b/),
  S("config", "AWS Config", /\bAWS Config\b|\bConfig rules?\b/),
  S("systemsmanager", "Systems Manager", /Systems Manager|Session Manager|Patch Manager/),
  S("cloudformation", "CloudFormation", /\bCloudFormation\b/),
  S("cdk", "AWS CDK", /\bCDK\b/),
  S("trustedadvisor", "Trusted Advisor", /Trusted Advisor/),
  S("controltower", "Control Tower", /Control Tower/),
  S("servicecatalog", "Service Catalog", /Service Catalog/),
  S("health", "AWS Health", /Health Dashboard|\bAWS Health\b/),
  S("xray", "AWS X-Ray", /\bX-Ray\b/),
  S("computeoptimizer", "Compute Optimizer", /Compute Optimizer/),
  S("costexplorer", "Cost Explorer", /Cost Explorer/),
  S("budgets", "AWS Budgets", /\bBudgets\b/),
  S("anomaly", "Cost Anomaly Detection", /Cost Anomaly Detection/),
  S("costtags", "Cost allocation tags", /[Cc]ost allocation tags/),
  S("cur", "Cost and Usage Report", /Cost and Usage Report|\bCUR\b/),
  S("pricingcalc", "Pricing Calculator", /Pricing Calculator/),
  S("support", "AWS Support plans", /\b(?:Basic|Developer|Business|Enterprise)(?: On-Ramp)? Support\b|Business Support\+/),
  S("wellarchitected", "Well-Architected", /Well-Architected/),
  // Integration
  S("sqs", "Amazon SQS", /\bSQS\b/),
  S("sns", "Amazon SNS", /\bSNS\b/),
  S("eventbridge", "Amazon EventBridge", /\bEventBridge\b/),
  S("stepfunctions", "Step Functions", /Step Functions/),
  S("mq", "Amazon MQ", /Amazon MQ/),
  S("appsync", "AWS AppSync", /\bAppSync\b/),
  // Analytics
  S("kinesis", "Kinesis Data Streams", /Kinesis Data Streams|\bKinesis\b(?! Data Firehose| Video)/),
  S("firehose", "Data Firehose", /\bFirehose\b/),
  S("msk", "Amazon MSK", /\bMSK\b|Managed Streaming for Apache Kafka/),
  S("athena", "Amazon Athena", /\bAthena\b/),
  S("glue", "AWS Glue", /\bGlue\b/),
  S("emr", "Amazon EMR", /\bEMR\b/),
  S("lakeformation", "Lake Formation", /Lake Formation/),
  S("opensearch", "Amazon OpenSearch", /\bOpenSearch\b/),
  S("quicksight", "Amazon Quick", /\bQuickSight\b|\bAmazon Quick\b/),
  S("flink", "Managed Service for Apache Flink", /\bFlink\b/),
  // Migration
  S("mgn", "Application Migration Service", /Application Migration Service|\bMGN\b/),
  S("migrationhub", "Migration Hub", /Migration Hub/),
  // AI and ML
  S("bedrock", "Amazon Bedrock", /\bBedrock\b/, "bedrock"),
  S("sagemaker", "Amazon SageMaker AI", /\bSageMaker\b/, "sagemaker-ai"),
  S("q", "Amazon Q", /\bAmazon Q\b|\bQ Developer\b|\bQ Business\b/),
  S("comprehend", "Amazon Comprehend", /\bComprehend\b/),
  S("rekognition", "Amazon Rekognition", /\bRekognition\b/),
  S("textract", "Amazon Textract", /\bTextract\b/),
  S("transcribe", "Amazon Transcribe", /\bTranscribe\b/),
  S("translate", "Amazon Translate", /\bTranslate\b/),
  S("polly", "Amazon Polly", /\bPolly\b/),
  S("lex", "Amazon Lex", /\bLex\b/),
  S("kendra", "Amazon Kendra", /\bKendra\b/),
  S("personalize", "Amazon Personalize", /\bPersonalize\b/),
  S("forecast", "Amazon Forecast", /\bForecast\b/),
  S("frauddetector", "Fraud Detector", /Fraud Detector/),
  S("a2i", "Augmented AI (A2I)", /\bA2I\b|Augmented AI/),
  S("nova", "Amazon Nova", /\bNova\b/),
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
