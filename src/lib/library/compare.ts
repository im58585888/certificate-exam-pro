import { diagram, type Comparison } from "./types";

// "A vs B" pages for the service pairs exams love to mix up. Same rule as the cheat sheets: every fact checkable in
// the linked AWS docs; bump `reviewed` when re-checked.

const P = "2026-11-26";

export const COMPARISONS: Comparison[] = [
  {
    kind: "compare", slug: "s3-vs-ebs-vs-efs", category: "Storage", items: ["Amazon S3", "Amazon EBS", "Amazon EFS"],
    title: "Amazon S3 vs EBS vs EFS",
    metaTitle: "S3 vs EBS vs EFS (2026): Which AWS Storage to Choose, with Exam Tips",
    description: "Amazon S3 vs EBS vs EFS compared: object vs block vs file storage, access, durability, scope and cost, with a decision guide, diagram and free AWS exam practice questions.",
    published: P, reviewed: P,
    answer: "Use Amazon S3 for objects (files reached over HTTPS: backups, media, data lakes), Amazon EBS for a block disk attached to one EC2 instance in one AZ (boot volumes, databases), and Amazon EFS for a shared NFS file system that many Linux instances across AZs mount at the same time. The deciding questions: how is it accessed, and by how many servers?",
    table: { head: ["", "Amazon S3", "Amazon EBS", "Amazon EFS"], rows: [
      ["Storage type", "Object", "Block", "File (NFS)"],
      ["Accessed by", "Any client over HTTPS (API)", "One EC2 instance (Multi-Attach for some io1/io2 cases)", "Thousands of Linux clients at once (EC2, ECS, EKS, Lambda)"],
      ["Scope", "Regional (data in 3+ AZs, except One Zone classes)", "One Availability Zone", "Regional (Standard) or One Zone"],
      ["Capacity", "Unlimited", "Provisioned size, up to 64 TiB per volume", "Elastic, grows and shrinks automatically"],
      ["Typical uses", "Backups, static websites, media, data lakes, logs", "Boot volumes, databases, low-latency transactional apps", "Shared content, home directories, CMS, container storage"],
      ["Pricing", "Per GB stored + requests + data out", "Per GB provisioned (+ IOPS/throughput for some types)", "Per GB stored, by storage class"],
      ["Cheaper tiers", "IA, Glacier classes, Intelligent-Tiering", "st1/sc1 HDD volumes; snapshots archive tier", "EFS Infrequent Access and Archive classes"],
    ] },
    pick: [
      { item: "Amazon S3", when: "You store files as objects reached by URL or API, need unlimited scale and 11 nines durability, or want cheap archive tiers." },
      { item: "Amazon EBS", when: "One EC2 instance needs a fast, persistent disk, such as a boot volume or a self-managed database." },
      { item: "Amazon EFS", when: "Many Linux instances or containers, possibly in several AZs, must read and write the same files at once." },
    ],
    sections: [
      { id: "ebs-types", heading: "EBS volume types in one line each", bullets: [
        "gp3: general purpose SSD with IOPS and throughput set independently of size (the default choice).",
        "io2 Block Express: provisioned IOPS SSD for the most demanding databases, with Multi-Attach support.",
        "st1: throughput-optimized HDD for big sequential workloads like log processing.",
        "sc1: cold HDD, the cheapest, for rarely accessed data.",
      ] },
      { id: "not-these", heading: "When none of the three fits", bullets: [
        "Windows file shares (SMB, Active Directory) → Amazon FSx for Windows File Server.",
        "High-performance computing scratch space → Amazon FSx for Lustre.",
        "Temporary, very fast local disk → EC2 instance store (data lost on stop).",
        "On-premises apps that need cloud-backed storage → AWS Storage Gateway.",
      ] },
    ],
    diagram: diagram("Where each storage type plugs into a typical app",
      [["vpc", "VPC", "vpc"], ["az1", "AZ 1", "private", "vpc"], ["az2", "AZ 2", "private", "vpc"]],
      [
        ["web1", "EC2 web server", "compute", "az1", "Serves the site; boots from its own EBS volume."],
        ["web2", "EC2 web server", "compute", "az2", "A second server in another AZ for availability."],
        ["ebs", "EBS volume", "storage", "az1", "Block disk attached to one instance in its AZ."],
        ["efs", "EFS file system", "storage", "vpc", "Shared uploads folder mounted by both servers."],
        ["s3", "S3 bucket", "storage", null, "Nightly backups and static assets."],
      ],
      [
        ["web1", "ebs", "Attached block disk", "The volume is attached to one instance in the same AZ and appears as a local disk; snapshots back it up to S3."],
        ["web1", "efs", "NFS mount", "Each server mounts EFS through a mount target in its own AZ; the mount target's security group allows NFS (port 2049) from the servers."],
        ["web2", "efs", "Same files from AZ 2", "Both servers see the same files at the same time, so an upload on one is instantly available on the other."],
        ["web1", "s3", "API calls over HTTPS", "The instance role allows s3:PutObject; backups and assets go to S3 through a gateway endpoint."],
      ]),
    rules: [
      "Shared file system for many Linux instances across AZs → EFS.",
      "Disk for one instance, lowest latency → EBS.",
      "Unlimited, durable, reachable by URL, cheapest archive → S3.",
      "EBS is tied to one AZ: to move it, snapshot and create a volume in the other AZ.",
    ],
    faq: [
      ["Can EBS be shared between EC2 instances?", "Generally no: an EBS volume attaches to one instance. io1 and io2 volumes support Multi-Attach to several instances in the same AZ, but the application must manage concurrent writes. For simple shared files, use EFS."],
      ["Is EFS cheaper than EBS?", "Per GB, EFS Standard costs more than a gp3 EBS volume, but you only pay for what you store, and its Infrequent Access and Archive classes can make cold data much cheaper."],
      ["Can Windows instances use EFS?", "No. EFS uses NFS and supports Linux. Windows workloads should use Amazon FSx for Windows File Server."],
    ],
    samples: { match: /\bEFS\b|\bEBS\b/, topic: /Block|File Storage|^Storage$|Object Storage|Instance Storage/ },
    references: [
      { title: "Amazon EBS volume types", url: "https://docs.aws.amazon.com/ebs/latest/userguide/ebs-volume-types.html" },
      { title: "What is Amazon EFS?", url: "https://docs.aws.amazon.com/efs/latest/ug/whatisefs.html" },
      { title: "What is Amazon S3?", url: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html" },
    ],
    related: ["s3", "ec2", "rds-vs-aurora-vs-dynamodb"],
  },

  {
    kind: "compare", slug: "rds-vs-aurora-vs-dynamodb", category: "Database", items: ["Amazon RDS", "Amazon Aurora", "Amazon DynamoDB"],
    title: "Amazon RDS vs Aurora vs DynamoDB",
    metaTitle: "RDS vs Aurora vs DynamoDB (2026): Which AWS Database to Choose",
    description: "Amazon RDS vs Aurora vs DynamoDB compared: relational vs NoSQL, scaling, availability, performance and cost, with a decision guide and free AWS exam practice questions.",
    published: P, reviewed: P,
    answer: "Choose Amazon RDS for a managed relational database on a familiar engine (MySQL, PostgreSQL, Oracle, SQL Server and more). Choose Amazon Aurora when you want MySQL or PostgreSQL compatibility with more performance, faster failover and features like Global Database and Serverless v2. Choose DynamoDB for serverless key-value access at any scale with single-digit millisecond latency.",
    table: { head: ["", "Amazon RDS", "Amazon Aurora", "Amazon DynamoDB"], rows: [
      ["Model", "Relational (SQL)", "Relational, MySQL/PostgreSQL-compatible", "NoSQL key-value and document"],
      ["Engines", "MySQL, PostgreSQL, MariaDB, Oracle, SQL Server, Db2", "Aurora MySQL, Aurora PostgreSQL", "DynamoDB only"],
      ["Scaling", "Bigger instance; read replicas", "Up to 15 replicas; Serverless v2 auto-scales capacity", "Automatic, virtually unlimited; on-demand or provisioned"],
      ["High availability", "Multi-AZ standby (1–2 min failover)", "6 copies across 3 AZs; failover typically under 30 s", "Built in across 3 AZs"],
      ["Multi-Region", "Cross-Region read replicas", "Global Database (typically under 1 s lag)", "Global tables (multi-active)"],
      ["Joins and complex queries", "Yes", "Yes", "No; design around access patterns"],
      ["Servers to manage", "Instances (AWS patches them)", "Instances or Serverless v2", "None"],
    ] },
    pick: [
      { item: "Amazon RDS", when: "You need a specific engine (Oracle, SQL Server, MariaDB, Db2) or a lift-and-shift of an existing relational database." },
      { item: "Amazon Aurora", when: "You need MySQL or PostgreSQL with higher throughput, fast failover, many read replicas, or cross-Region DR with low RPO." },
      { item: "Amazon DynamoDB", when: "Access is by key, traffic is huge or spiky, and you want no servers and millisecond latency, for example sessions, carts, gaming or IoT." },
    ],
    sections: [
      { id: "signals", heading: "Words in the question that point the way", bullets: [
        "\"Complex queries\", \"joins\", \"transactions across tables\", \"existing SQL app\" → relational (RDS or Aurora).",
        "\"Key-value\", \"millions of requests per second\", \"serverless\", \"unpredictable traffic\", \"single-digit millisecond\" → DynamoDB.",
        "\"Microsecond\" reads on DynamoDB → add DAX; on relational → ElastiCache.",
        "\"Data warehouse\", \"analytics over petabytes\" → Amazon Redshift, not any of these.",
      ] },
    ],
    rules: [
      "Oracle or SQL Server managed by AWS → RDS.",
      "Cross-Region DR with RPO of about a second → Aurora Global Database.",
      "Variable relational load, scale automatically → Aurora Serverless v2.",
      "Serverless key-value at any scale → DynamoDB; active-active multi-Region → global tables.",
    ],
    faq: [
      ["Is Aurora more expensive than RDS?", "Aurora instances usually cost more per hour than the same-size RDS MySQL or PostgreSQL instance, but its storage scales automatically, and its performance can mean you need fewer or smaller instances. Aurora I/O-Optimized suits I/O-heavy workloads."],
      ["Can DynamoDB replace a relational database?", "For access patterns known in advance, often yes, and it scales further. For ad hoc queries, joins and reporting, a relational database or a data warehouse is a better fit."],
    ],
    samples: { match: /Aurora|DynamoDB/, topic: /Database Selection|^Databases$|Aurora|DynamoDB/ },
    references: [
      { title: "What is Amazon Aurora?", url: "https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/CHAP_AuroraOverview.html" },
      { title: "What is Amazon RDS?", url: "https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Welcome.html" },
      { title: "What is Amazon DynamoDB?", url: "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Introduction.html" },
    ],
    related: ["rds", "dynamodb", "multi-az-vs-read-replicas"],
  },

  {
    kind: "compare", slug: "alb-vs-nlb-vs-gwlb", category: "Networking", items: ["Application Load Balancer", "Network Load Balancer", "Gateway Load Balancer"],
    title: "ALB vs NLB vs Gateway Load Balancer",
    metaTitle: "ALB vs NLB vs GWLB (2026): Which AWS Load Balancer to Choose",
    description: "Application Load Balancer vs Network Load Balancer vs Gateway Load Balancer compared: layers, routing, static IPs, targets and use cases, with a decision guide and free AWS exam questions.",
    published: P, reviewed: P,
    answer: "Use an Application Load Balancer (layer 7) for HTTP and HTTPS apps that need routing by path, host or header, authentication or WebSockets. Use a Network Load Balancer (layer 4) for TCP, UDP or TLS traffic that needs extreme performance, static IP addresses or source IP preservation. Use a Gateway Load Balancer to put third-party firewalls and inspection appliances in the traffic path.",
    table: { head: ["", "Application LB", "Network LB", "Gateway LB"], rows: [
      ["OSI layer", "7 (HTTP, HTTPS, gRPC)", "4 (TCP, UDP, TLS)", "3 (IP packets, GENEVE on port 6081)"],
      ["Routing", "Path, host, header, query string, method, source IP", "Port and protocol", "Flow-based to appliance fleet"],
      ["Static IPs", "No (use Global Accelerator in front)", "One per AZ, or your Elastic IPs", "No"],
      ["Targets", "Instances, IPs, Lambda functions, containers", "Instances, IPs, ALBs", "Virtual appliances"],
      ["Extras", "Cognito/OIDC authentication, WAF, redirects, fixed responses", "Millions of requests per second, PrivateLink service endpoints", "Transparent inspection with appliance scaling"],
    ] },
    pick: [
      { item: "Application Load Balancer", when: "Web apps and microservices: route /api to one service and /images to another, authenticate users, or protect with AWS WAF." },
      { item: "Network Load Balancer", when: "Non-HTTP protocols, very high performance, static IPs for client allow lists, or exposing a service through PrivateLink." },
      { item: "Gateway Load Balancer", when: "All traffic must pass through third-party firewalls, IDS/IPS or deep packet inspection appliances." },
    ],
    sections: [
      { id: "notes", heading: "Details exams like", bullets: [
        "ALB can't have a static IP; put AWS Global Accelerator in front, or use an NLB (which can forward to an ALB) when clients need fixed IPs.",
        "The Classic Load Balancer is previous generation; new designs use ALB or NLB.",
        "Cross-zone load balancing is on by default for ALB and off by default for NLB and GWLB.",
        "Both ALB and NLB support security groups; NLB passes the client's source IP through to targets.",
      ] },
    ],
    rules: [
      "Path- or host-based routing, Lambda targets, built-in user authentication → ALB.",
      "UDP, gaming, IoT, static IPs, ultra-low latency → NLB.",
      "Third-party firewall appliances inline → GWLB.",
      "Expose a service privately to other VPCs or accounts → NLB + PrivateLink endpoint service.",
    ],
    faq: [
      ["Can an Application Load Balancer have a static IP address?", "No. Its IP addresses change. If clients need fixed IPs, use a Network Load Balancer, put an NLB in front of the ALB, or use AWS Global Accelerator."],
      ["Which load balancer supports Lambda functions as targets?", "The Application Load Balancer."],
    ],
    samples: { match: /Load Balancer|\bALB\b|\bNLB\b/, topic: /Load Balancing/ },
    references: [
      { title: "What is Elastic Load Balancing?", url: "https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/what-is-load-balancing.html" },
      { title: "What is a Gateway Load Balancer?", url: "https://docs.aws.amazon.com/elasticloadbalancing/latest/gateway/introduction.html" },
    ],
    related: ["ec2", "vpc", "cloudfront"],
  },

  {
    kind: "compare", slug: "security-groups-vs-nacls", category: "Security", items: ["Security groups", "Network ACLs"],
    title: "Security Groups vs Network ACLs",
    metaTitle: "Security Groups vs NACLs (2026): Stateful vs Stateless, with Exam Tips",
    description: "AWS security groups vs network ACLs compared: stateful vs stateless, allow vs deny rules, instance vs subnet level and rule order, with examples and free AWS exam practice questions.",
    published: P, reviewed: P,
    answer: "Security groups are stateful firewalls on each network interface: you write allow rules only, and return traffic is allowed automatically. Network ACLs are stateless firewalls on each subnet: they have allow and deny rules, evaluated in number order, and return traffic needs its own rule. Use security groups for everyday access control and NACLs to block specific IPs or add a subnet-wide guardrail.",
    table: { head: ["", "Security group", "Network ACL"], rows: [
      ["Applies to", "Network interfaces (instances, load balancers, databases)", "Every resource in a subnet"],
      ["State", "Stateful: replies allowed automatically", "Stateless: inbound and outbound evaluated separately"],
      ["Rule types", "Allow only", "Allow and deny"],
      ["Rule order", "All rules evaluated together", "Lowest number first; first match wins"],
      ["Default", "New group: no inbound, all outbound", "Default NACL allows all; a new custom NACL denies all"],
      ["Can reference", "Other security groups and prefix lists", "CIDR ranges only"],
    ] },
    pick: [
      { item: "Security groups", when: "Controlling which sources reach an instance or database, especially by referencing another tier's security group." },
      { item: "Network ACLs", when: "Blocking a specific IP or range, or enforcing a coarse subnet-level rule as defense in depth." },
    ],
    sections: [
      { id: "ephemeral", heading: "The ephemeral ports trap", lead: "Because NACLs are stateless, a web server subnet that allows inbound 443 must also allow outbound traffic to the client's ephemeral ports (1024–65535). Forgetting this breaks connections, and exams test it." },
    ],
    rules: [
      "Block one malicious IP → NACL deny rule (security groups can't deny).",
      "Allow the app tier to reach the database → database security group allows the app security group.",
      "Traffic works one way but replies fail → check NACL outbound or inbound ephemeral ports.",
    ],
    faq: [
      ["Can a security group deny traffic?", "No. Security groups only have allow rules; anything not allowed is denied. To explicitly deny an IP, use a network ACL (or AWS WAF for web traffic)."],
      ["Which is evaluated first, the NACL or the security group?", "For traffic entering a subnet, the network ACL is checked at the subnet boundary first, then the security group at the network interface. Both must allow the traffic."],
    ],
    samples: { match: /security group|network ACL|\bNACL/i, topic: /Network Security|VPC Security/ },
    references: [
      { title: "Control traffic to your AWS resources using security groups", url: "https://docs.aws.amazon.com/vpc/latest/userguide/vpc-security-groups.html" },
      { title: "Control subnet traffic with network access control lists", url: "https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-acls.html" },
    ],
    related: ["vpc", "ec2", "iam"],
  },

  {
    kind: "compare", slug: "secrets-manager-vs-parameter-store", category: "Security", items: ["AWS Secrets Manager", "Systems Manager Parameter Store"],
    title: "Secrets Manager vs Parameter Store",
    metaTitle: "Secrets Manager vs Parameter Store (2026): Rotation, Cost & Exam Tips",
    description: "AWS Secrets Manager vs Systems Manager Parameter Store compared: automatic rotation, pricing, size limits, cross-Region replication and use cases, with free AWS exam practice questions.",
    published: P, reviewed: P,
    answer: "Use AWS Secrets Manager for secrets that must rotate automatically, such as database passwords and API keys: it rotates them on a schedule, replicates across Regions and integrates with RDS. Use Systems Manager Parameter Store for configuration values and simple secrets when you don't need built-in rotation; its standard tier is free. Both encrypt values with AWS KMS.",
    table: { head: ["", "Secrets Manager", "Parameter Store"], rows: [
      ["Built for", "Secrets: credentials, API keys, tokens", "Configuration and simple secrets (SecureString)"],
      ["Automatic rotation", "Yes (built in for RDS, Aurora, Redshift, DocumentDB; Lambda for others)", "No built-in rotation"],
      ["Price", "Per secret per month plus API calls", "Standard tier free; advanced tier charged"],
      ["Value size", "Up to 64 KB", "4 KB standard, 8 KB advanced"],
      ["Cross-Region replication", "Yes", "No"],
      ["Hierarchies and versioning", "Versions with staging labels", "Paths such as /prod/app/db-url, with versions"],
    ] },
    pick: [
      { item: "AWS Secrets Manager", when: "A database password must rotate automatically, or a secret must be available in several Regions." },
      { item: "Parameter Store", when: "You need cheap or free storage for config values and secrets that don't need rotation." },
    ],
    sections: [],
    rules: [
      "Rotate RDS credentials automatically with the least effort → Secrets Manager.",
      "Store feature flags or URLs per environment at no cost → Parameter Store standard tier.",
      "Never hard-code credentials in code, AMIs or plain environment variables.",
    ],
    faq: [
      ["Can Parameter Store rotate secrets?", "Not by itself. You could build rotation with Lambda and EventBridge, but Secrets Manager does it natively."],
      ["Can I read Secrets Manager secrets through Parameter Store?", "Yes. Parameter Store can reference Secrets Manager secrets, which lets apps use one API for both."],
    ],
    samples: { match: /Secrets Manager|Parameter Store/, topic: /Secrets/ },
    references: [
      { title: "What is AWS Secrets Manager?", url: "https://docs.aws.amazon.com/secretsmanager/latest/userguide/intro.html" },
      { title: "AWS Systems Manager Parameter Store", url: "https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html" },
    ],
    related: ["iam", "rds", "lambda"],
  },

  {
    kind: "compare", slug: "sqs-vs-sns-vs-eventbridge", category: "Integration", items: ["Amazon SQS", "Amazon SNS", "Amazon EventBridge"],
    title: "SQS vs SNS vs EventBridge",
    metaTitle: "SQS vs SNS vs EventBridge (2026): Queues vs Pub/Sub vs Event Bus",
    description: "Amazon SQS vs SNS vs EventBridge compared: queue vs publish/subscribe vs event bus, delivery, ordering, filtering and targets, with a fan-out diagram and free AWS exam practice questions.",
    published: P, reviewed: P,
    answer: "Amazon SQS is a queue: producers send messages and one consumer group pulls and processes each one, which decouples components and absorbs spikes. Amazon SNS is publish/subscribe: one message is pushed to many subscribers at once. Amazon EventBridge is an event bus: it routes events from AWS services, SaaS apps and your own code to targets using content-based rules, and it runs schedules.",
    table: { head: ["", "Amazon SQS", "Amazon SNS", "Amazon EventBridge"], rows: [
      ["Pattern", "Queue (point-to-point)", "Pub/sub fan-out", "Event bus with rules"],
      ["Delivery", "Consumers poll (pull)", "Pushed to subscribers", "Pushed to targets"],
      ["Consumers per message", "One (per queue)", "Many subscribers", "Many targets per rule"],
      ["Filtering", "None (consumer decides)", "Subscription filter policies", "Rich event pattern matching"],
      ["Ordering", "FIFO queues", "FIFO topics", "No ordering guarantee"],
      ["Retention", "Up to 14 days", "None (retry then DLQ)", "Archive and replay"],
      ["Sources", "Your apps", "Your apps, some AWS services", "200+ AWS services, SaaS partners, your apps, schedules"],
    ] },
    pick: [
      { item: "Amazon SQS", when: "You need to buffer work, decouple a producer from a slower consumer, or retry failed processing." },
      { item: "Amazon SNS", when: "One event must reach many endpoints at once: several queues, Lambda functions, email or SMS." },
      { item: "Amazon EventBridge", when: "You react to AWS service events or SaaS events, route by event content to many targets, or run cron-style schedules." },
    ],
    sections: [
      { id: "fifo", heading: "Standard vs FIFO queues", bullets: [
        "Standard queues: nearly unlimited throughput, at-least-once delivery, best-effort ordering.",
        "FIFO queues: strict order within a message group and exactly-once processing, with lower throughput unless high-throughput mode is enabled.",
        "Dead-letter queues collect messages that fail repeatedly; the visibility timeout hides a message while it's being processed.",
      ] },
    ],
    diagram: diagram("Fan-out: one order event reaches three independent consumers",
      [["aws", "AWS Region", "region"]],
      [
        ["shop", "Order service", "compute", "aws", "Publishes one message per order."],
        ["sns", "SNS topic", "integration", "aws", "Pushes each message to every subscription."],
        ["q1", "SQS: billing", "integration", "aws", "Buffers orders for the billing service."],
        ["q2", "SQS: shipping", "integration", "aws", "Buffers orders for the warehouse service."],
        ["eb", "EventBridge bus", "integration", "aws", "Routes large orders to an analytics rule."],
      ],
      [
        ["shop", "sns", "1. Publish once", "The service's role allows sns:Publish on the topic; it doesn't need to know who listens."],
        ["sns", "q1", "2. Deliver to billing queue", "Each queue's access policy allows the topic to send to it. If billing is down, messages wait in its queue (up to the retention period)."],
        ["sns", "q2", "3. Deliver to shipping queue", "A subscription filter policy can send only some messages, for example only physical goods."],
        ["sns", "eb", "4. Route by content", "EventBridge rules match on fields such as order total and send matching events to targets like Lambda or Step Functions."],
      ]),
    rules: [
      "Decouple and buffer → SQS; process in strict order → SQS FIFO.",
      "One message to many consumers → SNS fan-out to SQS queues.",
      "React to AWS service events or run on a schedule → EventBridge.",
      "Route by fields inside the event → EventBridge rules (or SNS filter policies for simple cases).",
    ],
    faq: [
      ["What is the SNS + SQS fan-out pattern?", "An SNS topic delivers each message to several SQS queues subscribed to it. Each consumer processes its own copy at its own pace, and a slow or failed consumer doesn't affect the others."],
      ["How long does SQS keep messages?", "From 1 minute to 14 days; the default is 4 days."],
    ],
    samples: { match: /\bSQS\b|\bSNS\b|EventBridge/, topic: /Messaging|Decoupling|Event-Driven|Application Integration/ },
    references: [
      { title: "What is Amazon SQS?", url: "https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/welcome.html" },
      { title: "What is Amazon SNS?", url: "https://docs.aws.amazon.com/sns/latest/dg/welcome.html" },
      { title: "What is Amazon EventBridge?", url: "https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-what-is.html" },
    ],
    related: ["lambda", "dynamodb", "ec2"],
  },

  {
    kind: "compare", slug: "multi-az-vs-read-replicas", category: "Database", items: ["Multi-AZ", "Read replicas"],
    title: "RDS Multi-AZ vs Read Replicas",
    metaTitle: "RDS Multi-AZ vs Read Replicas (2026): Availability vs Read Scaling",
    description: "Amazon RDS Multi-AZ vs read replicas compared: synchronous vs asynchronous replication, failover, readability and cross-Region use, with a decision guide and free AWS exam questions.",
    published: P, reviewed: P,
    answer: "Multi-AZ is for high availability: RDS keeps a synchronous standby in another Availability Zone and fails over to it automatically. Read replicas are for read scaling: asynchronous copies, in the same or another Region, that serve read-only traffic and can be promoted by hand. If the question says 'availability' or 'failover', think Multi-AZ; if it says 'read performance' or 'reporting', think read replicas.",
    table: { head: ["", "Multi-AZ (DB instance)", "Read replica"], rows: [
      ["Purpose", "High availability and durability", "Read scaling, reporting, cross-Region DR"],
      ["Replication", "Synchronous", "Asynchronous (replica lag possible)"],
      ["Readable?", "No (Multi-AZ DB clusters have readable standbys)", "Yes"],
      ["Failover", "Automatic, endpoint stays the same", "Manual promotion; new endpoint"],
      ["Location", "Another AZ in the same Region", "Same AZ, another AZ or another Region"],
    ] },
    pick: [
      { item: "Multi-AZ", when: "The database must survive an AZ or instance failure automatically with no data loss." },
      { item: "Read replicas", when: "Read traffic or reports are slowing the primary, or you want a copy in another Region." },
    ],
    sections: [{ id: "both", heading: "Using both", lead: "They combine: a Multi-AZ primary for availability plus read replicas (which can themselves be Multi-AZ) for scale. On Aurora, replicas do both jobs because they share storage and are failover targets." }],
    rules: [
      "Automatic failover → Multi-AZ.",
      "Offload reads → read replicas.",
      "Regional disaster recovery → cross-Region read replica (or Aurora Global Database).",
    ],
    faq: [["Does Multi-AZ improve read performance?", "Not for a Multi-AZ DB instance: the standby can't serve reads. A Multi-AZ DB cluster's two standbys can serve reads."]],
    samples: { match: /read replica|Multi-AZ/, topic: /RDS High Availability|Database Scaling|Aurora/ },
    references: [
      { title: "Multi-AZ deployments", url: "https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZ.html" },
      { title: "Working with read replicas", url: "https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.html" },
    ],
    related: ["rds", "rds-vs-aurora-vs-dynamodb"],
  },

  {
    kind: "compare", slug: "bedrock-vs-sagemaker-ai", category: "AI and ML", items: ["Amazon Bedrock", "Amazon SageMaker AI"],
    title: "Amazon Bedrock vs SageMaker AI",
    metaTitle: "Amazon Bedrock vs SageMaker AI (2026): Which to Choose, with AIF-C01 Tips",
    description: "Amazon Bedrock vs Amazon SageMaker AI compared: managed foundation models vs build-your-own ML, customization, control, cost and skills needed, with free AIF-C01 practice questions.",
    published: P, reviewed: P,
    answer: "Choose Amazon Bedrock to use ready-made foundation models through an API, with RAG, Guardrails and agents built in and no infrastructure to manage. Choose Amazon SageMaker AI to build, train, tune and host your own models (or open models) with full control over data, algorithms and infrastructure. Bedrock is faster to start; SageMaker AI gives more control and suits traditional ML.",
    table: { head: ["", "Amazon Bedrock", "Amazon SageMaker AI"], rows: [
      ["What you get", "Foundation models from Amazon and partners via one API", "Tools to build, train, deploy and manage your own ML models"],
      ["Infrastructure", "Fully managed, serverless", "You choose instance types for training and hosting"],
      ["Customization", "Prompting, RAG, fine-tuning, continued pre-training, distillation", "Anything: custom algorithms, full training, any open model"],
      ["Typical uses", "Chatbots, summarization, RAG search, content generation, agents", "Fraud detection, forecasting, recommendations, custom vision or language models"],
      ["Skills needed", "Developers calling APIs", "Data scientists and ML engineers (or Canvas for no code)"],
      ["Pricing", "Per token, batch, or Provisioned Throughput", "Per instance-hour for notebooks, training and endpoints"],
    ] },
    pick: [
      { item: "Amazon Bedrock", when: "A generative AI app can use an existing foundation model, and you want the least operational effort." },
      { item: "Amazon SageMaker AI", when: "You need a custom-trained model, traditional ML, or full control over the training and hosting environment." },
    ],
    sections: [{ id: "third", heading: "And the AI services?", lead: "For common single tasks, a pre-built AI service is simpler than either: Amazon Rekognition (images and video), Textract (documents), Comprehend (text insights), Transcribe (speech to text), Polly (text to speech), Translate and Lex (chatbots)." }],
    rules: [
      "Generative AI with no ML expertise or infrastructure → Bedrock.",
      "Train a model on your own labeled data with your own algorithm → SageMaker AI.",
      "Business analysts without code → SageMaker Canvas.",
      "A single common task like OCR or translation → the matching AI service.",
    ],
    faq: [["Can I fine-tune a model in Bedrock?", "Yes, for supported models. Bedrock supports fine-tuning with labeled data, continued pre-training with unlabeled data and distillation. For full control over training, use SageMaker AI."]],
    samples: { match: /Bedrock|SageMaker/, topic: /AWS GenAI Services|SageMaker|Customization Tradeoffs|AWS Services by Stage/ },
    references: [
      { title: "What is Amazon Bedrock?", url: "https://docs.aws.amazon.com/bedrock/latest/userguide/what-is-bedrock.html" },
      { title: "What is Amazon SageMaker AI?", url: "https://docs.aws.amazon.com/sagemaker/latest/dg/whatis.html" },
      { title: "Choosing a generative AI service", url: "https://docs.aws.amazon.com/decision-guides/latest/decision-guides/genai-guide.html" },
    ],
    related: ["bedrock", "sagemaker-ai"],
  },
];
