---
name: cloud-native-patterns
description: "Cloud-native architecture patterns: serverless, Kubernetes, multi-cloud, FinOps, disaster recovery, and Infrastructure as Code."
license: Apache-2.0
version: 1.1.0
created_at: 2026-03-23
updated_at: 2026-03-24
tags: [backend, cloud-native, serverless, kubernetes, finops, disaster-recovery, iac, architecture-design]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: architecture-design
  interactions:
    - knowledge-only
see_also:
  - rd3:backend-architect
  - rd3:sys-developing
  - rd3:sys-debugging
---

# Cloud-Native Patterns Reference

Detailed guidance for cloud infrastructure decisions, serverless architecture, Kubernetes orchestration, cost optimization (FinOps), multi-cloud strategies, and disaster recovery.

Verify current provider limits, pricing, regional availability, and managed-service behavior against official documentation before using this reference to make a final recommendation.

## Cloud Provider Selection

### Comprehensive Comparison Matrix

| Criterion | AWS | Azure | GCP |
|-----------|-----|-------|-----|
| **Market Share (2025-2026)** | ~32% | ~23% | ~11% |
| **Service Breadth** | 200+ services | 200+ services | 100+ services |
| **Maturity** | Most mature | Mature | Growing fast |
| **Enterprise** | Strong | Strongest (Microsoft stack) | Growing |
| **AI/ML** | SageMaker | Azure ML | Vertex AI (best for ML workloads) |
| **Kubernetes** | EKS (good) | AKS (good) | GKE (best managed K8s) |
| **Serverless** | Lambda (most mature) | Functions | Cloud Functions |
| **Pricing Model** | Complex (many dimensions) | Moderate | Simplest (sustained use discounts) |
| **Free Tier** | 12 months | 12 months | $300 credit |
| **Container Registry** | ECR | ACR | Artifact Registry |
| **Database (managed)** | RDS, DynamoDB | Azure SQL, Cosmos DB | Cloud SQL, Firestore |
| **Data Warehouse** | Redshift | Synapse | BigQuery |
| **Object Storage** | S3 | Blob Storage | Cloud Storage |
| **Networking** | VPC, Direct Connect | VNet, ExpressRoute | VPC, Cloud Interconnect |

### Decision Framework

**Choose AWS when:**
- Broadest service selection required
- Maximum maturity and stability needed
- Complex enterprise workloads
- Existing AWS expertise
- Example: Enterprise SaaS, complex microservices

**Choose Azure when:**
- Microsoft stack integration (.NET, Office 365)
- Enterprise Agreement (EA) discounts available
- Hybrid cloud with on-premise Windows
- Strong enterprise support required

**Choose GCP when:**
- Data analytics and AI/ML focus
- Kubernetes-first strategy
- Simple pricing model preferred
- Big data processing (BigQuery)

### 2026 Cloud Trends

```
2026 Cloud Computing Trends:
- Serverless momentum for cost optimization
- Industry-specific cloud services (vertical SaaS)
- Multi-cloud Kubernetes via Terraform (standard practice)
- Edge computing convergence (CDN + compute at edge)
- AI/ML-native services (Vertex AI, SageMaker, Azure ML)
- FinOps automation and cost governance (mandatory in enterprises)
- Sustainability and carbon footprint tracking (emerging compliance)
- Confidential computing (hardware-based encryption at runtime)
```

## Serverless Architecture

### When to Use Serverless

- Event-driven workloads (file processing, webhooks, IoT data ingestion)
- API endpoints with sporadic traffic
- Scheduled tasks and cron jobs
- Real-time data processing pipelines
- Chatbots and voice assistants
- ML inference with variable demand

### Serverless Patterns

```yaml
# AWS Lambda example (Serverless Application Model)
service: api-gateway
functions:
  createUser:
    handler: src/users/create.handler
    events:
      - http:
          path: /users
          method: post
    timeout: 30
    memory: 512
    provisionedConcurrency: 5  # Eliminate cold starts for hot paths

# Azure Functions example
functions:
  processImage:
    handler: src/images/process.handler
    bindings:
      - type: httpTrigger
        direction: in
    timeout: 00:05:00  # Max 10 minutes (2026)
    # Premium plan: VNet integration, unlimited execution

# Google Cloud Functions example (2nd gen)
gcf:
  function:
    handler: helloWorld
    timeout: 540s  # Max 9 minutes
    memory: 512MB
    minInstances: 1  # Min billable instances (eliminates cold starts)
    maxInstances: 100
```

### Cold Start Performance (2026 Data)

| Runtime | Without Provisioned | With Provisioned Concurrency |
|---------|-------------------|----------------------------|
| Node.js 20 | 50-200ms | <10ms |
| Python 3.12 | 100-500ms | <10ms |
| Java (SnapStart) | 200-2000ms | <50ms |
| .NET 8 (ReadyToRun) | 100-500ms | <10ms |
| Rust (Lambda Runtime) | 5-20ms | <5ms |

**2026 provisioned concurrency reality**: All major providers now support provisioned concurrency. Use it for latency-sensitive endpoints (user-facing APIs) and accept higher cost for improved user experience.

### Serverless Considerations

- **Cold starts**: Measure in production with your actual package size and runtime; vendor docs are often optimistic
- **Execution limits**: Verify current limits — AWS Lambda (15 min), Azure Functions (10 min), Cloud Functions (9 min). These change frequently.
- **State processing**: Use external storage (S3, Blob Storage, Cloud Storage). Serverless functions are stateless by design.
- **Monitoring**: Essential for cost management — serverless can accumulate costs silently from forgotten event sources
- **Vendor lock-in**: Minimize with portable patterns (common event schemas, abstraction layers over specific SDKs)
- **Provisioned concurrency cost**: ~$0.015 per GB-hour + ~$0.015 per vCPU-hour. Profile before enabling globally.

## Kubernetes Architecture

### When to Use Kubernetes

- Microservices architecture with independent team deployments
- Need consistent runtime across environments (dev/staging/prod)
- Complex orchestration requirements (custom scheduling, multi-tenancy)
- Hybrid cloud deployment
- Auto-scaling based on custom metrics
- Long-running services with consistent baseline load

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: webapp
  template:
    metadata:
      labels:
        app: webapp
    spec:
      containers:
      - name: webapp
        image: webapp:1.0
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
```

### Horizontal Pod Autoscaler (HPA v2)

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: webapp-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: webapp
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  # Custom metrics for 2026 autoscaling
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "1000"
```

### Managed Kubernetes Services

| Service | Best For | Strengths | Weaknesses |
|---------|----------|-----------|-----------|
| **EKS** (AWS) | AWS-heavy estates | VPC integration, IAM auth, Fargate option | Most complex pricing |
| **AKS** (Azure) | Microsoft-centric | Entra ID integration, hybrid support | Regional feature gaps |
| **GKE** | Cloud-native-first | Autopilot, node auto-provisioning, most mature | Smallest market share |

### Multi-Cloud Kubernetes via Terraform

```hcl
# providers.tf
provider "aws" {
  region = "us-east-1"
  alias  = "aws_primary"
}

provider "aws" {
  region = "eu-west-1"
  alias  = "aws_secondary"
}

provider "google" {
  project = "my-project"
  region  = "us-central1"
  alias   = "gcp_primary"
}

provider "google" {
  project = "my-project"
  region  = "europe-west1"
  alias   = "gcp_secondary"
}

# EKS primary cluster
module "eks_aws_primary" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"
  providers = {
    aws = aws.aws_primary
  }
  cluster_name    = "app-primary"
  cluster_version = "1.31"
  vpc_id          = module.vpc_aws.vpc_id
  subnet_ids      = module.vpc_aws.private_subnets
  eks_managed_node_groups = {
    default = {
      min_size       = 2
      max_size       = 10
      desired_size   = 3
      instance_types = ["t3.medium"]
    }
  }
}

# GKE secondary cluster
module "gke_gcp_secondary" {
  source  = "terraform-google-modules/kubernetes-engine/google"
  version = "~> 37.0"
  providers = {
    google = google.gcp_secondary
  }
  name       = "app-secondary"
  region     = "europe-west1"
  network    = google_compute_network.vnet.name
  subnetwork = google_compute_subnetwork.subnet.name
  cluster_secondary_range = "pods"
  services_secondary_range = "services"
  node_pools = [{
    name           = "default"
    machine_type   = "e2-medium"
    min_count      = 2
    max_count      = 10
    initial_count  = 3
  }]
}

# Multi-cloud load balancer (Cloudflare or similar)
resource "cloudflare_record" "app_primary" {
  zone_id = cloudflare_zone.main.id
  name    = "app"
  value   = module.eks_aws_primary.cluster_endpoint
  type    = "CNAME"
  proxied = true
}
```

## Multi-Cloud Architecture

### Multi-Cloud Patterns

**1. Replication Pattern:**
- Deploy same application across multiple clouds
- Active-active or active-passive configuration
- DNS-based traffic routing (Route 53, Azure Traffic Manager, Cloud DNS)
- Use for disaster recovery with automated failover

**2. Distribution Pattern:**
- Distribute services across clouds based on strengths
- GCP for analytics (BigQuery), AWS for compute (Lambda/EC2), Azure for enterprise ( Entra ID, Office 365)
- API gateway for cross-cloud communication
- Increased complexity — validate cost savings vs operational overhead

**3. Migration Pattern:**
- Gradual migration from one cloud to another
- Hybrid approach during transition
- Minimize downtime with blue/green deployment
- Migrate stateless services first, databases last

### Multi-Cloud Challenges

**Increased Complexity:**
- Different APIs and services per provider
- Fragmented monitoring and logging (use unified tool like Datadog, New Relic, or OpenTelemetry)
- Higher operational overhead
- Skills gap (need expertise in multiple clouds)

**Higher Costs:**
- No volume discounts across providers
- Data egress fees between clouds ($50-100/GB typical)
- Duplicate infrastructure
- Complex billing and cost allocation

### When to Avoid Multi-Cloud

- Startups and small teams (< 5 engineers)
- Cost-sensitive applications
- Simple workloads (single cloud is cheaper)
- Limited DevOps resources

### When to Consider Multi-Cloud

- Regulatory requirements (data sovereignty, geographic compliance)
- Disaster recovery with automated cross-cloud failover
- Avoiding vendor lock-in for negotiating leverage
- Mergers and acquisitions requiring integration of different cloud estates

## Edge Computing Architecture (2026)

### Edge Computing Convergence

In 2026, edge computing has converged with traditional CDN. Modern edge platforms provide:

- Static asset delivery (legacy CDN)
- Compute at edge (Cloudflare Workers, Deno Deploy, AWS CloudFront Functions)
- AI inference at edge (Cloudflare AI Workers, Fastly AI)
- Key-value store at edge (Cloudflare KV)
- Durable objects for stateful edge workloads

### Edge Architecture

```
User Request
     ↓
CDN/Edge POP (200+ locations globally)
     ├── Cache HIT → Static content served (< 5ms)
     ├── Edge Function (Cloudflare Workers, Deno Deploy)
     │      ├── Auth/JWT validation
     │      ├── A/B testing
     │      ├── Request routing/rewriting
     │      └── AI inference (LLM or embedding)
     └── Cache MISS → Origin Regional Cloud
            ├── Application servers (containerized or serverless)
            ├── API gateway
            └── Microservices
                    ↓
              Core Cloud / Multi-cloud
                    ├── Databases (primary)
                    ├── Data warehouses
                    └── Analytics
```

### Edge Services by Provider (2026)

| Provider | Edge Compute | Edge AI | Edge Storage | Max Execution |
|----------|-------------|---------|--------------|--------------|
| **Cloudflare** | Workers (V8 isolates) | AI Workers | KV, D1 | 50ms CPU / 30s wall |
| **Fastly** | Compute@Edge (Wasm) | N/A | KV Store | 50ms CPU |
| **AWS** | Lambda@Edge, CloudFront Functions | SageMaker Edge | S3 | 5s (CF Functions) |
| **Azure** | Azure Front Door | AI Builder | Blob Storage | 230s |
| **GCP** | Cloud Run edge | Vertex AI | Cloud Storage | 3600s (Cloud Run) |

## Cost Optimization (FinOps)

### FinOps Maturity Model

| Level | Characteristics | Practices |
|-------|----------------|-----------|
| **Crawl** | Cost visibility, tagging standards | Resource tagging, cost allocation |
| **Walk** | Rightsizing, commitment discounts | Reserved instances, Savings Plans |
| **Run** | Automated optimization, real-time governance | Scheduled scaling, FinOps policies |

### Cost Optimization Strategies (Detailed)

**1. Right-Sizing:**
- Use provider cost optimization recommendations (AWS Compute Optimizer, Azure Advisor, GCP Recommender)
- Review rightsizing monthly — utilization data shows actual vs allocated
- Common overprovisioning: 2-4x actual usage for databases and caches

**2. Reserved Instances and Savings Plans:**
```
AWS Savings Plans (Compute):
- 1-year No Upfront: ~30% savings vs on-demand
- 3-year No Upfront: ~60% savings vs on-demand
- All Upfront: additional ~10% vs No Upfront

GCP Committed Use:
- 1-year: up to 57% savings vs on-demand
- 3-year: up to 70% savings vs on-demand

Azure Reserved VM:
- 1-year: up to 40% savings vs pay-as-you-go
- 3-year: up to 72% savings vs pay-as-you-go
```

**3. Spot Instances / Preemptible VMs:**
- Up to 90% discount vs on-demand
- Use for: batch processing, CI/CD, ML training, stateless microservices
- Never use for: databases, primary application servers without checkpointing
- Use instance fleet/smixed instance types to reduce interruption frequency

**4. Serverless for Sporadic Workloads:**
- Pay per invocation, not per idle hour
- Compare Lambda cost vs always-on EC2/ASG at various traffic levels
- Set maximum concurrent invocations to prevent cost overruns

**5. Storage Tiering:**
```
Hot: S3 Standard / Blob Hot / Cloud Storage Standard — $0.02-0.025/GB
Warm: S3 IA / Blob Cool / Cloud Storage Nearline — $0.01/GB
Cold: S3 Glacier / Blob Archive / Cloud Storage Coldline — $0.004/GB
Archive: S3 Glacier Deep Archive — $0.00099/GB
```

### FinOps Implementation

```hcl
# Terraform cost monitoring example (AWS)
resource "aws_cloudwatch_metric_alarm" "monthly_estimate" {
  alarm_name          = "monthly-cost-estimate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "EstimatedCharges"
  namespace           = "AWS/Billing"
  period              = 21600  # 6 hours
  statistic           = "Maximum"
  threshold           = 10000  # Alert at $10,000
  alarm_description   = "This metric monitors estimated monthly charges"
}

# Azure Cost Management budgets
resource "azurerm_cost_management_budget_resource_group" "example" {
  name            = "example-budget"
  resource_group  = azurerm_resource_group.example.name
  amount          = 10000
  time_grain      = "Monthly"
  time_period {
    from = "2026-01-01"
    to   = "2027-12-31"
  }
  notification {
    operator  = "GreaterThan"
    threshold  = 80
    threshold_type = "Actual"
    recipient_email = ["finance@example.com"]
  }
}

# GCP Budget alert
resource "google_billing_budget" "example" {
  billing_account = "123456-123456-123456"
  display_name    = "example-budget"
  budget {
    amount {
      specified_amount {
        currency_code = "USD"
        units         = 10000
      }
    }
    threshold_rules {
      threshold_percent = 0.5
    }
    threshold_rules {
      threshold_percent = 0.9
    }
  }
}
```

### Cost Optimization Checklist

- [ ] All resources have cost allocation tags (minimum: environment, team, service)
- [ ] Rightsizing recommendations reviewed monthly
- [ ] Reserved instances/Savings Plans purchased for steady-state workloads
- [ ] Spot/preemptible instances used for fault-tolerant workloads
- [ ] Storage lifecycle policies configured (< 30 days for unnecessary hot data)
- [ ] Budget alerts set at 80% and 100% thresholds
- [ ] Unused resources (orphaned volumes, old snapshots) cleaned up monthly
- [ ] Data egress costs evaluated before cross-cloud integrations
- [ ] Serverless evaluated for sporadic workloads before committing to VMs
- [ ] IaC used for all infrastructure to prevent drift and forgotten resources

## Cloud Security Architecture

### Shared Responsibility Model

| Responsibility | Customer | Provider |
|----------------|----------|----------|
| **Physical** | | ✓ |
| **Network** | VPC config | Network infrastructure |
| **Application** | ✓ | |
| **Data** | ✓ | |
| **OS** | ✓ | (for managed services) |
| **Identity** | ✓ | IAM infrastructure |

### Security Best Practices (2026)

**1. Identity and Access Management (IAM):**
- Principle of least privilege (grant minimum required permissions)
- Multi-factor authentication (MFA) mandatory for all users
- Role-based access control (RBAC) with regular access reviews
- Use workload identity federation instead of service account keys
- Enable credential expiration for service accounts (90-day max)

**2. Network Security:**
- VPC with private subnets for all compute (no public IPs for application tiers)
- Security groups as firewalls (stateful, default deny)
- Network ACLs for subnet-level controls
- Web Application Firewall (WAF) for HTTP/S endpoints
- DDoS protection (AWS Shield, Azure DDoS Protection, Cloud Armor)

**3. Data Encryption:**
- Encryption at rest (provider-managed KMS by default, customer-managed for compliance)
- Encryption in transit (TLS 1.2 minimum, TLS 1.3 preferred)
- Customer-managed keys (CMK) for regulated workloads
- Key rotation policies (annual rotation minimum)

**4. Compliance:**
- SOC 2 Type II, ISO 27001, PCI DSS Level 1, HIPAA, FedRAMP
- Use compliance-ready managed services where available
- Regular security assessments and penetration testing
- Audit logging with immutable storage (CloudTrail, Azure Monitor, Cloud Audit Logs)

## Disaster Recovery and High Availability

### DR Strategy Selection

Choose DR strategy based on RTO (Recovery Time Objective) and RPO (Recovery Point Objective):

| Pattern | RTO | RPO | Cost | Complexity | When to Use |
|---------|-----|-----|------|------------|------------|
| **Backup/Restore** | Hours | Daily | Low | Low | Dev/test, non-critical data |
| **Pilot Light** | 15-60 min | Hours | Low-Medium | Medium | Critical workloads, budget-constrained |
| **Warm Standby** | 5-15 min | Minutes | Medium-High | Medium | Production workloads needing faster recovery |
| **Multi-Site Active-Active** | Zero | Zero | Very High | High | Zero tolerance for downtime, global apps |

### DR Decision Tree

```
What is your RTO requirement?
│
├── > 4 hours (batch system, analytics)
│   └── Backup/Restore is sufficient
│
├── 1-4 hours (internal tools, non-customer-facing)
│   └── Pilot Light — minimal replica, scale up on disaster
│
├── 5-60 minutes (customer-facing, revenue-impacting)
│   ├── Warm Standby in secondary region
│   └── Test failover quarterly minimum
│
└── Zero (revenue-critical, SLA-bound)
    └── Multi-Site Active-Active (expensive)
        └── Consider: Is the SLA actually enforceable?
```

### DR Automation with Terraform

```hcl
# DR: Cross-region RDS read replica for PostgreSQL
resource "aws_db_instance" "primary" {
  identifier           = "postgres-primary"
  multi_az            = true
  engine              = "postgres"
  engine_version      = "16.3"
  instance_class      = "db.r8g.large"
  allocated_storage   = 100
  storage_encrypted   = true
  backup_retention_period = 30
  preferred_backup_window = "03:00-04:00"
  preferred_maintenance_window = "mon:04:00-mon:05:00"
}

resource "aws_db_instance" "dr_replica" {
  identifier        = "postgres-dr"
  multi_az         = false
  engine           = "postgres"
  engine_version   = "16.3"
  instance_class   = "db.r8g.large"
  source_db_instance_identifier = aws_db_instance.primary.identifier
  # Failover: promote replica to primary, update DNS
  deletion_protection = false  # Allow promotion
}

# Automated failover via Route 53 health check
resource "aws_route53_health_check" "primary" {
  fqdn              = "db-primary.example.com"
  port              = 5432
  type              = "TCP"
  resource_path     = "/"
  failure_threshold = 3
  request_interval  = 10
}

resource "aws_route53_record" "db" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "db.example.com"
  type    = "CNAME"
  ttl     = 60
  records = [aws_db_instance.primary.address]
  health_check_id = aws_route53_health_check.primary.id
  failover_routing_policy {
    type = "PRIMARY"
  }
}
```

### High Availability Patterns

```yaml
# Multi-region deployment
regions:
  - us-east-1:
      availability_zones: 3
      instances: 3
      database: primary (Multi-AZ)
  - us-west-2:
      availability_zones: 3
      instances: 3
      database: standby (read replica, promote on failover)

# Health checks and failover
health_check:
  interval: 30
  timeout: 5
  healthy_threshold: 2
  unhealthy_threshold: 3
  path: /health/ready
  port: 8080

# Database high availability (PostgreSQL example)
ha_config:
  multi_az: true
  automated_backup:
    retention_period: 30
    backup_window: 03:00-04:00
  failover_priority:
    zone_1: primary
    zone_2: standby
```

## Infrastructure as Code

### IaC Tools Comparison

| Tool | Best For | Multi-Cloud | Learning Curve | State Management |
|------|----------|-------------|---------------|------------------|
| **Terraform** | Multi-cloud, complex environments | Excellent | Medium | Built-in (remote) |
| **AWS CDK** | AWS-only, developer experience | Poor | Medium | CloudFormation stacks |
| **Pulumi** | Multi-cloud, real languages | Good | Low | Built-in (remote) |
| **ARM/Bicep** | Azure-only | Poor | Low | Built-in (Azure) |
| **CloudFormation** | AWS-only, compliance-required | None | Medium | Built-in (S3) |

### Terraform Best Practices (2026)

```hcl
# Standard module structure
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "app-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["${var.region}a", "${var.region}b", "${var.region}c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway     = true
  enable_vpn_gateway    = false
  enable_dns_hostnames  = true
  enable_dns_support     = true

  tags = {
    Environment = var.environment
    ManagedBy    = "Terraform"
    Team         = var.team
  }
}

# Remote state with locking
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "app/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  required_version = ">= 1.6.0"
}
```

### IaC Best Practices

- **State management**: Always use remote state with state locking (S3 + DynamoDB, GCS + Cloud SQL, Azure Blob + Table)
- **Modularization**: Build reusable modules for common patterns (VPC, EKS, RDS)
- **Version control**: All IaC in Git with review process (no direct apply to production)
- **Testing**: Validate and plan (`terraform validate`, `terraform plan`) before apply; use Terratest for integration tests
- **Documentation**: Every module should have inputs, outputs, and usage examples documented
- **Secrets**: Never store secrets in state files; use provider secret managers (AWS Secrets Manager, Azure Key Vault, GCP Secret Manager)
- **Drift detection**: Run `terraform plan` regularly to detect manual changes

## Architecture Decision Records (ADRs)

```markdown
# ADR-001: Use AWS Serverless for Event Processing Pipeline

## Context
Building event-driven data processing pipeline with sporadic workload and cost optimization requirement.

## Decision
Use AWS Lambda serverless architecture with S3, SQS, and DynamoDB.

## Consequences

### Positive
- Pay-per-use pricing (lowest cost for sporadic workload)
- Auto-scaling without configuration
- No infrastructure management
- Fast development cycle

### Negative
- Cold start latency (100-200ms with Node.js runtime)
- 15-minute execution limit (need to chunk long processing)
- Vendor lock-in (AWS-specific Lambda + SQS)
- Monitoring complexity (X-Ray costs and noise)

### Alternatives Considered
- **Kubernetes (EKS)**: Rejected due to higher cost ($150+/month for minimum cluster) and complexity for the team's current maturity
- **EC2**: Rejected due to manual scaling and higher baseline cost for sporadic workloads
- **Azure Functions**: Rejected due to team AWS expertise

## Status
Accepted

## Date
2026-01-15
```

## Quick Reference

### Cloud Provider Quick Selection

| Requirement | Recommended Provider |
|-------------|---------------------|
| Existing team expertise | Match the team's strongest platform unless requirements force otherwise |
| Microsoft-centric environment | Azure |
| Data/analytics-heavy backend | Compare GCP first, then validate regional and compliance fit |
| Managed Kubernetes priority | Compare EKS, AKS, and GKE against team skills and operational constraints |
| Simplest initial operations | Prefer the provider already used by the surrounding estate |
| Strict compliance or residency needs | Start with the provider and region that satisfy those controls |
| Best serverless maturity | AWS Lambda (but Cloudflare Workers for global edge) |
| Best for startups (pricing) | GCP (simpler pricing, sustained use discounts) |

### Compute Architecture Selection

| Workload Type | Recommended Architecture |
|---------------|------------------------|
| Event-driven, bursty | Serverless (Lambda/Cloud Functions) |
| Microservices, consistent load | Kubernetes (EKS/AKS/GKE) |
| Legacy apps, lift-and-shift | VMs (EC2/Azure VM/Compute Engine) |
| Batch processing, fault-tolerant | Spot instances + serverless |
| Real-time, globally distributed | Edge computing (Cloudflare Workers) |
| AI/ML training | Spot instances + serverless (Lambda for inference) |

### Cost Optimization Checklist

- [ ] All resources have cost allocation tags (minimum: environment, team, service)
- [ ] Rightsizing recommendations reviewed monthly
- [ ] Reserved instances/Savings Plans purchased for steady-state workloads
- [ ] Spot/preemptible instances used for fault-tolerant workloads
- [ ] Storage lifecycle policies configured (< 30 days for unnecessary hot data)
- [ ] Budget alerts set at 80% and 100% thresholds
- [ ] Unused resources (orphaned volumes, old snapshots) cleaned up monthly
- [ ] Data egress costs evaluated before cross-cloud integrations
- [ ] Serverless evaluated for sporadic workloads before committing to VMs
- [ ] IaC used for all infrastructure to prevent drift and forgotten resources

## Sources

- Official provider documentation: AWS (https://docs.aws.amazon.com/), Azure (https://learn.microsoft.com/en-us/azure/), GCP (https://cloud.google.com/docs/)
- Cloud cost data: AWS Pricing Calculator, Azure Pricing Calculator, GCP Pricing Calculator
- FinOps Foundation (https://www.finops.org/) for FinOps framework and maturity model
- CNCF Cloud Native Landscape (https://landscape.cncf.io/) for cloud-native technology selection
- Validate any provider-specific claim at decision time — cloud platform behavior changes frequently
