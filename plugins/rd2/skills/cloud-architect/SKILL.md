---
name: cloud-architect
description: Cloud architecture patterns and infrastructure design for 2024-2025. Use when making cloud architecture decisions: cloud provider selection (AWS vs Azure vs GCP), multi-cloud strategies, serverless vs container vs VM architecture, Kubernetes and cloud-native design, edge computing, cost optimization (FinOps), cloud security architecture, disaster recovery, Infrastructure as Code, or cloud migration strategies. Use when cloud architecture decisions are needed.
---

# Cloud Architect

Cloud architecture patterns and infrastructure design for building scalable, cost-effective, and resilient cloud applications using 2024-2025 best practices.

## Overview

This skill provides architectural guidance for cloud infrastructure design, covering provider selection, multi-cloud strategies, serverless vs container architecture, Kubernetes orchestration, edge computing, cost optimization (FinOps), security architecture, disaster recovery, and Infrastructure as Code patterns. It complements `backend-architect` (backend-specific patterns) and `frontend-architect` (frontend-specific patterns).

**For comprehensive architecture analysis**, use `/rd2:super-architect` agent which provides detailed system design with ADRs, complete verification with benchmarks, and migration strategies.

## Quick Start

```bash
# Cloud provider selection
"Choose between AWS, Azure, and GCP for a SaaS application with 100K users"

# Serverless architecture
"Design serverless architecture for event-driven data processing pipeline"

# Multi-cloud strategy
"Design multi-cloud strategy for financial services with compliance requirements"

# Kubernetes architecture
"Design Kubernetes architecture for microservices with auto-scaling"

# Edge computing
"Design edge computing strategy for global real-time gaming platform"

# Cloud migration
"Plan migration strategy from on-premise to cloud for enterprise ERP system"
```

## When to Use

**Use this skill when:**

- Selecting cloud provider (AWS vs Azure vs GCP)
- Planning multi-cloud or hybrid cloud strategy
- Choosing between serverless, containers, or VMs
- Designing Kubernetes architecture
- Planning edge computing strategy
- Optimizing cloud costs (FinOps)
- Designing cloud security architecture
- Planning disaster recovery and high availability
- Implementing Infrastructure as Code
- Planning cloud migration strategy
- Designing cloud networking architecture
- Planning cloud data architecture

**For backend-specific patterns** (APIs, databases, distributed systems), use `/rd2:backend-architect` skill.

**For frontend-specific patterns** (rendering strategies, CDN, frontend deployment), use `/rd2:frontend-architect` skill.

## Core Principles (2024-2025)

### Verification Before Design

- **Search first**: Always verify current cloud provider capabilities
- **Cite sources**: Every decision should reference documentation
- **Version awareness**: Cloud services change frequently
- **Benchmark claims**: Performance assertions require data

### Cloud by Necessity

**Based on [6 Cloud Architecture Best Practices 2025](https://www.nops.io/blog/cloud-architecture-best-practices/):**

- Start simple, scale when needed
- YAGNI (You Aren't Gonna Need It) applies to cloud
- Over-engineering increases costs and complexity
- Match architecture to actual requirements

### Multi-Cloud Reality

**Based on [Multi-Cloud Strategies 2025](https://dev.to/yash_sonawane25/the-rise-of-multi-cloud-strategies-best-practices-for-2025-4goe):**

- Multi-cloud increases complexity and cost
- Single cloud preferred unless regulatory requirements
- Avoid vendor lock-in through portable architectures
- Multi-cloud for resilience, not cost savings

### Cost-First Design (FinOps)

**Based on [The Future of Cloud-Native FinOps](https://cloudnativenow.com/contributed-content/the-future-of-cloud-native-devops-dataops-finops-and-beyond/):**

- Cost is a first-class architectural concern
- Every architecture decision has cost implications
- Monitor and optimize continuously
- Use reserved instances and savings plans strategically

## Cloud Provider Selection

### Comparison Matrix

**Based on [Cloud Architecture Best Practices: AWS vs Azure vs GCP](https://www.snowlynxsoftware.net/blog/cloud-architecture-best-practices.html) and [2025 Trending Cloud Services](https://thenewstack.io/2025-trending-cloud-services-industry-specific-and-serverless/):**

| Criterion | AWS | Azure | GCP |
|-----------|-----|-------|-----|
| **Market Share** | 32% | 23% | 11% |
| **Service Breadth** | 200+ services | 200+ services | 100+ services |
| **Maturity** | Most mature | Mature | Growing fast |
| **Enterprise** | Strong | Strongest (Microsoft stack) | Growing |
| **AI/ML** | SageMaker | Azure ML | Vertex AI (best) |
| **Kubernetes** | EKS | AKS | GKE (best) |
| **Serverless** | Lambda (mature) | Functions | Cloud Functions |
| **Pricing** | Complex | Moderate | Simplest |
| **Free Tier** | 12 months | 12 months | $300 credit |

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
- Example: Enterprise integration, Microsoft-centric orgs

**Choose GCP when:**
- Data analytics and AI/ML focus
- Kubernetes-first strategy
- Simple pricing model preferred
- Big data processing (BigQuery)
- Example: Data platforms, ML workloads, startups

**Provider Services Specialization:**
- **AWS**: EC2, S3, Lambda, DynamoDB, RDS
- **Azure**: App Service, Blob Storage, Functions, Cosmos DB, SQL Database
- **GCP**: Compute Engine, Cloud Storage, Cloud Functions, Firestore, BigQuery

### 2025 Cloud Trends

**Based on [Cloud Computing in 2025](https://medium.com/@ismailkovvuru/cloud-computing-in-2025-service-models-deployment-types-top-providers-for-devops-teams-817f54616b91):**

```
2025 Cloud Computing Trends:
- Serverless momentum for cost optimization
- Industry-specific cloud services (vertical SaaS)
- Multi-cloud Kubernetes via Terraform
- Edge computing integration (CDN + compute)
- AI/ML-native services (Vertex AI, SageMaker)
- FinOps automation and cost governance
- Sustainability and carbon footprint tracking
```

## Compute Architecture

### Serverless vs Containers vs VMs

**Decision Matrix:**

| Approach | Best For | Cost | Complexity | Scalability | Cold Start |
|----------|----------|------|------------|-------------|------------|
| **Serverless** | Event-driven, sporadic workloads | Lowest (pay-per-use) | Low | Auto | Yes (100-500ms) |
| **Containers (K8s)** | Microservices, consistent runtime | Medium | High | Auto | No |
| **VMs** | Legacy apps, lift-and-shift | Highest | Medium | Manual | No |

### Serverless Architecture

**Based on [Serverless Architecture Patterns: AWS, Azure & GCP](https://americanchase.com/serverless-architecture-patterns/):**

**When to Use Serverless:**
- Event-driven workloads (file processing, webhooks)
- API endpoints with sporadic traffic
- Scheduled tasks and cron jobs
- Real-time data processing
- Chatbots and voice assistants

**Serverless Patterns:**

```yaml
# AWS Lambda (most mature)
service: api-gateway
functions:
  createUser:
    handler: src/users/create.handler
    events:
      - http:
          path: /users
          method: post
    timeout: 30  # Max 15 minutes
    memory: 512  # 128-10240 MB

# Azure Functions
functions:
  processImage:
    handler: src/images/process.handler
    bindings:
      - type: httpTrigger
        direction: in
    timeout: 00:05:00  # Max 10 minutes

# Google Cloud Functions
gcf:
  function:
    handler: helloWorld
    timeout: 540s  # Max 9 minutes
    memory: 512MB
```

**Serverless Considerations:**
- Cold starts: 100-500ms (optimize with provisioned concurrency)
- Execution limits: 15 minutes max (AWS), 10 minutes (Azure), 9 minutes (GCP)
- State processing: Use external storage (S3, Blob Storage, Cloud Storage)
- Monitoring: Essential for cost management

### Container Architecture (Kubernetes)

**Based on [Kubernetes and Cloud Native Architecture](https://kubegrade.com/kubernetes-cloud-native-native-architecture/):**

**When to Use Kubernetes:**
- Microservices architecture
- Need consistent runtime across environments
- Complex orchestration requirements
- Hybrid cloud deployment
- Auto-scaling based on metrics

**Kubernetes Deployment:**

```yaml
# Deployment configuration
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

---
# Horizontal Pod Autoscaler
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

**Kubernetes Services:**
- **EKS** (AWS): Managed Kubernetes, integrates with VPC, IAM
- **AKS** (Azure): Managed Kubernetes, integrates with AAD, Monitor
- **GKE** (GCP): Most mature, auto-upgrade, node auto-provisioning

### VM Architecture

**When to Use VMs:**
- Legacy application migration
- Full control over operating system
- Specialized hardware requirements (GPU, FPGA)
- Regulatory compliance (specific OS versions)
- Monolithic applications

**VM Services:**
- **EC2** (AWS): Broadest selection, on-demand, reserved, spot
- **Azure VMs**: Windows and Linux, hybrid integration
- **Compute Engine** (GCP): Custom machine types, sustained use discounts

## Cloud-Native Architecture

**Based on [Cloud-Native Architecture: 2025 Trends](https://www.wildnetedge.com/blogs/embracing-cloud-native-architecture-the-2025-guide):**

### Cloud-Native Principles

**1. Microservices Architecture:**
- Decompose into loosely coupled services
- Single responsibility per service
- Independent deployment and scaling
- API-first design

**2. Containerization:**
- Package application with dependencies
- Consistent runtime across environments
- Immutable infrastructure
- Resource isolation

**3. Dynamic Orchestration:**
- Kubernetes for container orchestration
- Automated scaling based on demand
- Self-healing and auto-recovery
- Resource optimization

**4. Service Mesh:**
- **Istio**: Traffic management, security, observability
- **Linkerd**: Lightweight, focused on performance
- **Consul**: Service discovery and configuration

**5. CI/CD Automation:**
- GitOps for infrastructure (ArgoCD, Flux)
- Automated testing and deployment
- Blue/green and canary deployments
- Rollback capabilities

### Hybrid Auto-Scaling

**Based on [Optimizing Microservices Scalability (2025)](https://www.iaras.org/iaras/filedownloads/ijoc/2025/005-0003(2025).pdf):**

**Horizontal Pod Autoscaler (HPA):**
```yaml
metrics:
- type: Resource
  resource:
    name: cpu
    target:
      type: Utilization
      averageUtilization: 70
- type: Pods
  pods:
    metric:
      name: requests-per-second
    target:
      type: AverageValue
      averageValue: 1000
```

**Vertical Pod Autoscaler (VPA):**
```yaml
updatePolicy:
  updateMode: Auto  # or Off or Recreate
resourcePolicy:
  containerPolicies:
  - containerName: app
    mode: Auto
    minAllowed:
      cpu: 100m
      memory: 128Mi
    maxAllowed:
      cpu: 1
      memory: 1Gi
```

**Cluster Autoscaler:**
```yaml
# Automatically scales node count based on pod requirements
# Scales up when pods are pending due to insufficient resources
# Scales down when nodes are underutilized
```

## Multi-Cloud Architecture

**Based on [The Rise of Multi-Cloud Strategies (2025)](https://dev.to/yash_sonawane25/the-rise-of-multi-cloud-strategies-best-practices-for-2025-4goe):**

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

**When to Avoid Multi-Cloud:**
- Startups and small teams
- Cost-sensitive applications
- Simple workloads
- Limited DevOps resources

**When to Consider Multi-Cloud:**
- Regulatory requirements (data sovereignty)
- Disaster recovery needs
- Avoid vendor lock-in
- Mergers and acquisitions

## Edge Computing Architecture

**Based on [Serverless vs Edge Computing 2025](https://enqcode.com/blog/serverless-vs-edge-computing-2025-best-architecture-for-global-scale-startups):**

### Edge Computing Use Cases

**1. Content Delivery:**
- Static assets (images, videos, CSS, JS)
- CDN caching (CloudFront, Azure CDN, Cloud CDN)
- Edge caching for dynamic content
- Example: Media streaming, e-commerce

**2. Edge Functions:**
- Lambda@Edge (AWS CloudFront)
- Azure Front Door Functions
- Cloud Run (GCP edge locations)
- Use for: A/B testing, authentication, routing

**3. IoT Edge:**
- Local processing for IoT devices
- Reduced latency for real-time decisions
- Filter and aggregate data before sending to cloud
- Example: Manufacturing, smart cities

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

**Edge Services:**
- **AWS**: CloudFront, Lambda@Edge, Global Accelerator, IoT Greengrass
- **Azure**: Front Door, Edge Zones, IoT Edge
- **GCP**: Cloud CDN, Cloud Run, Cloud Functions, Edge Container

## Cost Optimization (FinOps)

**Based on [The Future of Cloud-Native FinOps (2025)](https://cloudnativenow.com/contributed-content/the-future-of-cloud-native-devops-dataops-finops-and-beyond/):**

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
# AWS Cost Explorer
# Set up budgets and alerts
budgets:
  - name: monthly-budget
    amount: 10000
    unit: USD
    alerts:
      - type: actual
        threshold: 80
      - type: forecasted
        threshold: 90

# Azure Cost Management + Billing
# Cost analysis and budgets

# GCP Billing Budget
# Budget alerts and forecasts
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
# Provider configuration
provider "aws" {
  region = "us-east-1"
}

# VPC
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  tags = {
    Name = "main-vpc"
  }
}

# EC2 instance
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

**Based on vendor reference integration:**

- **State management**: Remote state with locking
- **Modularization**: Reusable modules
- **Version control**: Git with proper branching
- **Testing**: Validate and plan before apply
- **Documentation**: Code comments and diagrams

## Architecture Decision Records (ADRs)

**Based on [create-architecture-documentation command](https://github.com/claude-code-subagents-collection):**

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

## Progressive Disclosure

This SKILL.md provides architectural guidance for cloud infrastructure design.

**For backend-specific patterns:**
- Use `/rd2:backend-architect` for APIs, databases, distributed systems

**For frontend-specific patterns:**
- Use `/rd2:frontend-architect` for rendering strategies, CDN, deployment

**For comprehensive architecture analysis:**
- Use `/rd2:super-architect` agent for detailed system design with ADRs and migration strategies

## Sources

### Web Research Integration
- [Cloud Architecture Best Practices: AWS vs Azure vs GCP](https://www.snowlynxsoftware.net/blog/cloud-architecture-best-practices.html)
- [6 Cloud Architecture Best Practices To Follow in 2025](https://www.nops.io/blog/cloud-architecture-best-practices/)
- [Serverless Architecture Patterns: AWS, Azure & GCP Guide](https://americanchase.com/serverless-architecture-patterns/)
- [Serverless vs Edge Computing 2025](https://enqcode.com/blog/serverless-vs-edge-computing-2025-best-architecture-for-global-scale-startups)
- [The Rise of Multi-Cloud Strategies: Best Practices for 2025](https://dev.to/yash_sonawane25/the-rise-of-multi-cloud-strategies-best-practices-for-2025-4goe)
- [Cloud-Native Architecture: 2025 Trends and Insights](https://www.wildnetedge.com/blogs/embracing-cloud-native-architecture-the-2025-guide)
- [Building Scalable APIs with Kubernetes and Microservices (CNCF Blog, 2025)](https://www.cncf.io/blog/2025/03/18/building-scalable-agile-and-secure-apis-with-kubernetes-and-microservices/)
- [Kubernetes and Cloud Native Architecture](https://kubegrade.com/kubernetes-cloud-native-architecture/)
- [Optimizing Microservices Scalability with Kubernetes (2025)](https://www.iaras.org/iaras/filedownloads/ijoc/2025/005-0003(2025).pdf)
- [The Future of Cloud-Native DevOps, DataOps, FinOps](https://cloudnativenow.com/contributed-content/the-future-of-cloud-native-devops-dataops-finops-and-beyond/)
- [Cloud Computing in 2025: Service Models, Deployment...](https://medium.com/@ismailkovvuru/cloud-computing-in-2025-service-models-deployment-types-top-providers-for-devops-teams-817f54616b91)
- [2025 Trending Cloud Services: Industry-Specific and Serverless](https://thenewstack.io/2025-trending-cloud-services-industry-specific-and-serverless/)

## Quick Reference

### Cloud Provider Quick Selection

| Requirement | Recommended Provider |
|-------------|---------------------|
| Broadest services | AWS |
| Microsoft stack | Azure |
| AI/ML focus | GCP |
| Kubernetes | GCP (GKE) |
| Enterprise | Azure |
| Pricing simplicity | GCP |

### Compute Architecture Selection

| Workload Type | Recommended Architecture |
|---------------|------------------------|
| Event-driven | Serverless |
| Microservices | Kubernetes |
| Legacy apps | VMs |
| Batch processing | Serverless or Spot VMs |
| Real-time | Edge computing |

### Cost Optimization Checklist

- [ ] Right-size resources based on actual usage
- [ ] Use reserved instances for steady-state workloads
- [ ] Use spot instances for fault-tolerant workloads
- [ ] Implement lifecycle policies for storage
- [ ] Set up budget alerts
- [ ] Review and clean up unused resources monthly
- [ ] Use cost allocation tags
- [ ] Monitor for cost anomalies

### High Availability Patterns

| Pattern | RTO | RPO | Cost |
|---------|-----|-----|------|
| Backup/Restore | Hours | Daily | Low |
| Pilot Light | Minutes | Hours | Low-Medium |
| Warm Standby | Minutes | Minutes | Medium-High |
| Multi-Site Active-Active | Zero | Zero | High |
