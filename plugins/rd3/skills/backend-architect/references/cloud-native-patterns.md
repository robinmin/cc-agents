---
name: cloud-native-patterns
description: "Cloud-native architecture patterns: serverless, Kubernetes, multi-cloud, FinOps, disaster recovery, and Infrastructure as Code."
license: Apache-2.0
version: 1.0.1
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

Detailed guidance for cloud infrastructure decisions, serverless architecture, Kubernetes orchestration, cost optimization, and disaster recovery.

Verify current provider limits, pricing, regional availability, and managed-service behavior against official documentation before using this reference to make a final recommendation.

## Cloud Provider Selection

| Provider | Prefer When | Strengths to Validate | Tradeoffs to Validate |
|----------|-------------|-----------------------|----------------------|
| **AWS** | You need broad managed-service coverage or the team already operates on AWS | Service fit, IAM model, regional support, ecosystem integration | Pricing complexity, quota management, operational sprawl |
| **Azure** | You need tight Microsoft ecosystem integration or enterprise governance alignment | Entra ID integration, hybrid options, enterprise controls | Regional feature parity, pricing model, service ergonomics |
| **GCP** | You prioritize data, analytics, or Kubernetes-oriented workflows | Data platform fit, GKE posture, networking model | Product fit outside the core stack, regional support, org familiarity |

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

## Serverless Architecture

### When to Use Serverless

- Event-driven workloads (file processing, webhooks)
- API endpoints with sporadic traffic
- Scheduled tasks and cron jobs
- Real-time data processing
- Chatbots and voice assistants

### Serverless Patterns

```yaml
# AWS Lambda example
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

# Azure Functions example
functions:
  processImage:
    handler: src/images/process.handler
    bindings:
      - type: httpTrigger
        direction: in
    timeout: 00:05:00

# Google Cloud Functions example
gcf:
  function:
    handler: helloWorld
    timeout: 540s
    memory: 512MB
```

### Serverless Considerations

- **Cold starts**: Vary by runtime, package size, region, and provider features; measure rather than guess
- **Execution limits**: Timeout, memory, and concurrency limits differ by provider and change over time; verify current docs before choosing a platform
- **State processing**: Use external storage (S3, Blob Storage, Cloud Storage)
- **Monitoring**: Essential for cost management — serverless can accumulate costs silently
- **Vendor lock-in**: Minimize with portable patterns (e.g., use common event schemas)

## Kubernetes Architecture

### When to Use Kubernetes

- Microservices architecture
- Need consistent runtime across environments
- Complex orchestration requirements
- Hybrid cloud deployment
- Auto-scaling based on metrics

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

### Horizontal Pod Autoscaler

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
```

### Managed Kubernetes Services

- **EKS** (AWS): Managed Kubernetes, integrates with VPC, IAM
- **AKS** (Azure): Managed Kubernetes, integrates with AAD, Monitor
- **GKE** (GCP): Most mature, auto-upgrade, node auto-provisioning

### Multi-Cloud Kubernetes via Terraform

```hcl
provider "aws" {
  region = "us-east-1"
}

provider "google" {
  project = "my-project"
  region  = "us-central1"
}

module "eks" {
  source = "terraform-aws-modules/eks/aws"
  cluster_name    = "my-cluster"
  cluster_version = "1.29"
  vpc_id         = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnets
}

module "gke" {
  source  = "terraform-google-modules/kubernetes-engine/google"
  project_id = "my-project"
  name       = "my-cluster"
  region      = "us-central1"
  network     = google_compute_network.vnet.name
  subnetwork  = google_compute_subnetwork.subnet.name
}
```

## Multi-Cloud Architecture

### Multi-Cloud Patterns

**1. Replication Pattern:**
- Deploy same application across multiple clouds
- Active-active or active-passive configuration
- DNS-based traffic routing
- Use for disaster recovery

**2. Distribution Pattern:**
- Distribute services across clouds based on strengths
- GCP for analytics, AWS for compute, Azure for enterprise
- API gateway for cross-cloud communication
- Increased complexity

**3. Migration Pattern:**
- Gradual migration from one cloud to another
- Hybrid approach during transition
- Minimize downtime with blue/green deployment

### Multi-Cloud Challenges

**Increased Complexity:**
- Different APIs and services per provider
- Fragmented monitoring and logging
- Higher operational overhead
- Skills gap (need expertise in multiple clouds)

**Higher Costs:**
- No volume discounts across providers
- Data egress fees between clouds
- Duplicate infrastructure
- Complex billing and cost allocation

### When to Avoid Multi-Cloud

- Startups and small teams
- Cost-sensitive applications
- Simple workloads
- Limited DevOps resources

### When to Consider Multi-Cloud

- Regulatory requirements (data sovereignty)
- Disaster recovery needs
- Avoid vendor lock-in
- Mergers and acquisitions

## Edge Computing Architecture

### Edge Computing Use Cases

**1. Content Delivery:**
- Static assets (images, videos, CSS, JS)
- CDN caching (CloudFront, Azure CDN, Cloud CDN)
- Edge caching for dynamic content

**2. Edge Functions:**
- Lambda@Edge (AWS CloudFront)
- Azure Front Door Functions
- Cloud Run (GCP edge locations)
- Use for: A/B testing, authentication, routing

**3. IoT Edge:**
- Local processing for IoT devices
- Reduced latency for real-time decisions
- Filter and aggregate data before sending to cloud

### Edge Architecture

```
User
  ↓
Edge POP (200+ locations globally)
  ├── Static content (CDN)
  ├── Edge functions (Lambda@Edge)
  └── IoT edge processing
  ↓
Regional Cloud
  ├── Application servers
  ├── API gateway
  └── Microservices
  ↓
Core Cloud
  ├── Databases
  ├── Data warehouses
  └── Analytics
```

### Edge Services by Provider

- **AWS**: CloudFront, Lambda@Edge, Global Accelerator, IoT Greengrass
- **Azure**: Front Door, Edge Zones, IoT Edge
- **GCP**: Cloud CDN, Cloud Run, Cloud Functions, Edge Container

## Cost Optimization (FinOps)

### Cost Optimization Strategies

**1. Right-Sizing:**
- Monitor actual resource usage
- Downsize over-provisioned resources
- Use appropriate instance types
- Automated rightsizing tools

**2. Reserved Instances and Savings Plans:**
- Commit to 1-3 years for significant savings (up to 70%)
- Use for steady-state workloads
- Combine with on-demand for variable workloads

**3. Spot Instances:**
- Up to 90% discount for interruptible workloads
- Use for batch processing, CI/CD, testing
- Handle interruptions gracefully

**4. Serverless for Sporadic Workloads:**
- Pay only when code runs
- Ideal for event-driven architecture
- Monitor for cost anomalies

**5. Storage Optimization:**
- Use appropriate storage class (S3 Standard, IA, Glacier)
- Lifecycle policies for data archiving
- Delete unused data

### Cost Monitoring

```yaml
# AWS Cost Explorer budgets
budgets:
  - name: monthly-budget
    amount: 10000
    unit: USD
    alerts:
      - type: actual
        threshold: 80
      - type: forecasted
        threshold: 90
```

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

### Security Best Practices

**1. Identity and Access Management (IAM):**
- Principle of least privilege
- Multi-factor authentication (MFA)
- Role-based access control (RBAC)
- Regular access reviews

**2. Network Security:**
- VPC with private subnets
- Security groups and network ACLs
- Web Application Firewall (WAF)
- DDoS protection

**3. Data Encryption:**
- Encryption at rest (KMS, Key Vault)
- Encryption in transit (TLS/SSL)
- Customer-managed keys
- Key rotation policies

**4. Compliance:**
- SOC 2, ISO 27001, PCI DSS, HIPAA
- Use compliance-ready services
- Regular security assessments
- Audit logging

## Disaster Recovery and High Availability

### DR Strategies

| Pattern | RTO | RPO | Cost |
|---------|-----|-----|------|
| Backup/Restore | Hours | Daily | Low |
| Pilot Light | Minutes | Hours | Low-Medium |
| Warm Standby | Minutes | Minutes | Medium-High |
| Multi-Site Active-Active | Zero | Zero | High |

**1. Backup and Restore:**
- Regular automated backups
- Cross-region replication
- Point-in-time recovery
- Test restore procedures

**2. Pilot Light:**
- Minimal version of application always running
- Rapidly scale up after disaster
- Cost-effective for critical workloads

**3. Warm Standby:**
- Scaled-down version running
- Quick activation (minutes)
- Moderate cost

**4. Multi-Site Active-Active:**
- Full application running in multiple regions
- Zero downtime for failover
- Highest cost

### High Availability Patterns

```yaml
# Multi-region deployment
regions:
  - us-east-1:
      availability_zones: 3
      instances: 3
      database: primary
  - us-west-2:
      availability_zones: 3
      instances: 3
      database: standby (read replica)

# Health checks and failover
health_check:
  interval: 30
  timeout: 5
  healthy_threshold: 2
  unhealthy_threshold: 3
```

## Infrastructure as Code

### IaC Tools

**Terraform (Recommended for Multi-Cloud):**
```hcl
provider "aws" {
  region = "us-east-1"
}

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  tags = {
    Name = "main-vpc"
  }
}

resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
  tags = {
    Name = "web-server"
  }
}
```

**AWS CloudFormation (AWS-specific):**
```yaml
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyVPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.0.0.0/16
      EnableDnsHostnames: true
```

**Azure Resource Manager (Azure-specific):**
```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "resources": [
    {
      "type": "Microsoft.Network/virtualNetworks",
      "apiVersion": "2020-04-01",
      "name": "myVNet",
      "location": "[resourceGroup().location]"
    }
  ]
}
```

### IaC Best Practices

- **State management**: Remote state with locking
- **Modularization**: Reusable modules
- **Version control**: Git with proper branching
- **Testing**: Validate and plan before apply
- **Documentation**: Code comments and diagrams

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
- Cold start latency (100-500ms)
- 15-minute execution limit
- Vendor lock-in (AWS-specific)
- Monitoring complexity

### Alternatives Considered
- **Kubernetes (EKS)**: Rejected due to higher cost and complexity
- **EC2**: Rejected due to manual scaling and higher cost
- **Azure Functions**: Rejected due to team AWS expertise

## Status
Accepted

## Date
2025-01-24
```

## Quick Reference

### Cloud Provider Quick Selection

| Requirement | Recommended Provider |
|-------------|---------------------|
| Existing team expertise | Match the team’s strongest platform unless requirements force otherwise |
| Microsoft-centric environment | Azure |
| Data/analytics-heavy backend | Compare GCP first, then validate regional and compliance fit |
| Managed Kubernetes priority | Compare EKS, AKS, and GKE against team skills and operational constraints |
| Simplest initial operations | Prefer the provider already used by the surrounding estate |
| Strict compliance or residency needs | Start with the provider and region that satisfy those controls |

### Compute Architecture Selection

| Workload Type | Recommended Architecture |
|---------------|------------------------|
| Event-driven | Serverless |
| Microservices | Kubernetes |
| Legacy apps | VMs |
| Batch processing | Serverless or Spot VMs |
| Real-time | Edge computing |

## Sources

- Official provider documentation should be treated as the authority for pricing, service limits, quotas, regional availability, and managed-service capabilities.
- Validate any provider-specific claim at decision time because cloud platform behavior changes frequently.

### High Availability Patterns

| Pattern | RTO | RPO | Cost |
|---------|-----|-----|------|
| Backup/Restore | Hours | Daily | Low |
| Pilot Light | Minutes | Hours | Low-Medium |
| Warm Standby | Minutes | Minutes | Medium-High |
| Multi-Site Active-Active | Zero | Zero | High |

### Cost Optimization Checklist

- [ ] Right-size resources based on actual usage
- [ ] Use reserved instances for steady-state workloads
- [ ] Use spot instances for fault-tolerant workloads
- [ ] Implement lifecycle policies for storage
- [ ] Set up budget alerts
- [ ] Review and clean up unused resources monthly
- [ ] Use cost allocation tags
- [ ] Monitor for cost anomalies
