---
name: backend-architect
description: "Backend system architecture and distributed systems design: service decomposition, event-driven architecture (CQRS/Event Sourcing/Saga), distributed systems resilience, scalability patterns, cloud-native patterns (serverless, Kubernetes, FinOps), and emerging 2026 patterns (MCP, Temporal, eBPF). Trigger when: planning service boundaries, designing distributed systems, making cloud infrastructure decisions, or evaluating scalability strategies."
license: Apache-2.0
version: 2.0.0
created_at: 2026-02-27
updated_at: 2026-03-26
type: pattern
tags: [backend, architecture, microservices, event-driven, distributed-systems, scalability, cloud-native, serverless, kubernetes, finops, ebpf, temporal, mcp]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: architecture-design
  interactions:
    - knowledge-only
see_also:
  - rd3:backend-design
  - rd3:sys-developing
  - rd3:sys-debugging
---

# rd3:backend-architect — Backend System Architecture

## Overview

This skill provides system-level architectural guidance for backend systems: service decomposition, distributed systems topology, event-driven architecture, scalability strategies, cloud-native patterns, and emerging 2026 paradigms.

Use this skill for system-level decisions. Use `rd3:backend-design` for implementation-level design: API endpoints, database schemas, caching layers, auth flows, observability instrumentation.

## Quick Start

Frame the architecture decision first, then dive into the matching reference file:

- "Plan the service boundaries and saga strategy for e-commerce checkout."
- "Choose between monolith, modular monolith, and microservices for a team of 8 engineers."
- "Design the runtime model for webhook ingestion — serverless vs Kubernetes."
- "Evaluate multi-cloud vs single-cloud for a fintech platform with strict DR requirements."
- "Design an MCP (Model Context Protocol) integration layer for LLM agents."

## When to Use

- Planning service decomposition and boundaries
- Designing distributed systems topology
- Choosing between monolith, modular monolith, and microservices
- Designing event-driven architecture (Event Sourcing, CQRS, Saga)
- Planning scalability and resilience strategies
- Making cloud infrastructure decisions (serverless vs Kubernetes, multi-cloud)
- Evaluating emerging patterns (MCP, Temporal, eBPF)
- Planning disaster recovery and high availability
- Making FinOps and cost optimization decisions
- Designing Infrastructure as Code strategies

## When Not to Use

Skip this skill when: debugging existing backend code (`rd3:sys-debugging`), writing implementation code (`rd3:sys-developing`), designing API endpoints or database schemas (`rd3:backend-design`), or making frontend architecture decisions (`rd3:frontend-architect`).

## Workflow

1. Identify the open architectural decision: service boundaries, topology, consistency model, scaling strategy, cloud infrastructure, or resilience approach.
2. Start with the relevant section to set direction, then open the matching reference for depth:
   - `references/microservices-patterns.md` — Decomposition, Event Sourcing, CQRS, Saga, service mesh, resilience
   - `references/cloud-native-patterns.md` — Serverless, Kubernetes, multi-cloud, FinOps, DR/HA, IaC
3. Compare at least two viable options; document tradeoffs (correctness, operability, latency, cost, team complexity).
4. Verify any framework-, vendor-, or version-specific claim before recommending.
5. End with an explicit recommendation, key risks, and an ADR-style rationale when the decision is material.

## Examples

### Example 1: Cloud Infrastructure Decision

```markdown
Decision: Choose the runtime model for webhook ingestion.

Options considered:
- Serverless functions behind an API gateway
- Containerized service on managed Kubernetes

Recommendation:
- Start with serverless if traffic is bursty and handlers are short-lived.
- Prefer Kubernetes when workloads need long-running processing, custom networking, or tighter runtime control.

Key checks before finalizing:
- Current provider timeout, concurrency, and pricing limits
- Team operational maturity for Kubernetes
- DR and observability requirements
```

### Example 2: Service Decomposition Decision

```markdown
Decision: Choose service boundaries for an order management system.

Options considered:
- Monolith with module boundaries (team of 6, single deployment)
- Microservices: Order, Inventory, Payment, Notification (independent deployment)
- Modular monolith with event bus (module isolation, single deployment)

Recommendation:
- Start with modular monolith. The team is too small for microservices overhead.
- Use an internal event bus so modules communicate via events, not direct calls.
- Extract to microservices later if a module needs independent scaling or a different tech stack.

Key checks before finalizing:
- Are bounded contexts well-defined? (DDD context mapping)
- Does any module have fundamentally different scaling needs?
- Team experience with distributed systems debugging
```

## Core Principles

### Verification Before Design
- **Search first**: Verify current framework capabilities with official docs
- **Cite sources**: Every decision should reference documentation
- **Version awareness**: Behavior changes between versions
- **Benchmark claims**: Performance assertions require data

### Boring Technology Wins
- Proven > novel (PostgreSQL over NewHotDB)
- Simplicity > cleverness
- Operations cost matters
- Team expertise matters

### Design for Failure
- Every distributed call will fail
- Timeouts, retries, circuit breakers mandatory
- Graceful degradation
- Failure modes documented

### Data-Driven Decisions
- Benchmarks > intuition
- SLOs define architecture
- Cost-per-request guides scaling
- Load test before launch

### Security by Design
- Auth at every boundary (API Gateway + service-level)
- Zero-trust network architecture
- Defense in depth
- Secrets management (Vault, KMS)

## Emerging Patterns (2026)

### MCP (Model Context Protocol)
MCP is an emerging standard for AI/LLM integration providing structured, context-aware outputs between AI agents and external systems. Use when building integrations that need to share context with LLM-powered tools or designing AI-native API surfaces.

### Temporal APIs
Persistent workflows providing durable execution of multi-step business processes. Unlike simple queues, Temporal workflows survive process restarts, machine failures, and network partitions:
- Built-in retry with backoff at the activity level
- Workflow state persistence across failures
- Activity timeouts and heartbeat for long-running tasks
- Distributed saga with compensating transactions built-in

Use when reliable execution of workflows spanning minutes to days is needed: order fulfillment, onboarding sequences, data pipeline orchestration.

### Push-Based Webhooks
Event-driven notification patterns with delivery guarantees:
- Idempotency keys for safe retries
- Sequential delivery ordering for dependent events
- Signature verification (HMAC-SHA256)
- Automatic retry with exponential backoff

### eBPF-Based Observability
Extended Berkeley Packet Filter enables kernel-level instrumentation without application changes. In 2026, eBPF-based distributed tracing is SOTA for:
- Zero-instrumentation trace collection (no SDK required)
- Network-level latency attribution
- Sidecar-free service mesh observability
- Continuous profiling with minimal overhead

Evaluate eBPF-based tools (Cilium Tetragon, Pixie) as an alternative to OpenTelemetry SDK instrumentation.

## Capabilities

### API Design & Patterns
RESTful APIs, GraphQL (schema design, DataLoader), gRPC (Protocol Buffers, streaming), WebSockets, Server-Sent Events, webhooks (retry, idempotency, signature verification), API versioning, pagination (cursor, keyset), batch operations, HATEOAS.

### Microservices & Distributed Systems
Domain-Driven Design (bounded contexts), service decomposition strategies (strangler fig, modular monolith), API Gateway, service mesh (Istio, Linkerd), Backend-for-Frontend (BFF), Saga (orchestration vs choreography), CQRS, circuit breakers, bulkhead isolation. See `references/microservices-patterns.md` for depth.

### Event-Driven Architecture
Message queues (RabbitMQ, SQS, Pub/Sub), event streaming (Kafka, Kinesis), event sourcing, event schema evolution, exactly-once delivery, dead letter queues, event routing. See `references/microservices-patterns.md` for depth.

### Authentication & Authorization
OAuth 2.0, OpenID Connect, JWT (token structure, refresh tokens), API keys, mTLS, RBAC/ABAC, session management, SSO (SAML, OAuth), zero-trust security.

### Security Patterns
Input validation, rate limiting (token bucket, sliding window), CORS, CSRF protection, SQL injection prevention, secrets management (Vault, KMS), API throttling, DDoS protection (CloudFlare, AWS Shield).

### Resilience & Fault Tolerance
Circuit breaker (state machine: CLOSED → OPEN → HALF-OPEN), retry with exponential backoff and jitter, timeout management, bulkhead pattern, graceful degradation, health checks (liveness, readiness), chaos engineering, backpressure, idempotency.

### Observability & Monitoring
Structured logging with correlation IDs, RED metrics (Rate, Errors, Duration), distributed tracing (OpenTelemetry, Jaeger, Zipkin), APM tools (DataDog, New Relic), alerting (threshold-based, anomaly detection), dashboards (Grafana, Kibana).

### Data Integration & Caching
Repository/DAO pattern, ORM integration, database-per-service, CQRS integration, change data capture, connection pooling. Cache-aside, read-through, write-through, write-behind; Redis, Memcached; HTTP caching (ETags, Cache-Control); cache invalidation (TTL, event-driven).

### Asynchronous Processing
Background job queues (Celery, Bull, Sidekiq), scheduled tasks, long-running operations (status polling, webhooks), batch processing, stream processing, job retry with dead letter queues, job prioritization.

### API Gateway & Load Balancing
Kong, Traefik, Envoy, AWS API Gateway; load balancing algorithms (round-robin, least connections, consistent hashing); canary deployments, blue-green deployment, traffic splitting; protocol translation (REST ↔ gRPC).

### Performance & Optimization
Query optimization (N+1 prevention, DataLoader), connection pooling, async operations, response compression (gzip, Brotli), CDN integration, horizontal/vertical scaling, stateless services.

### Testing Strategies
Unit testing, integration testing, contract testing (Pact), E2E testing, load/stress testing, security testing (OWASP Top 10), chaos testing, mocking strategies.

### Deployment & Operations
Docker, Kubernetes orchestration, rolling updates, CI/CD pipelines, feature flags, blue-green/canary releases, service versioning, database migrations, runbooks, ADRs.

## Quick Reference

### Service Architecture Selection

| Architecture | Team Size | Complexity | Use Case |
|-------------|-----------|-----------|----------|
| Monolith | 1-5 | Low | MVP, early-stage |
| Modular Monolith | 5-15 | Medium | Growing product, clear domains |
| Microservices | 15+ | High | Scaled product, independent deployment |

### Message Queue Selection

| Queue | Throughput | Ordering | Use Case |
|-------|-----------|----------|----------|
| Kafka | 1M+ msgs/sec | Per partition | Event streaming, logs |
| RabbitMQ | 10K-100K/sec | Per queue | Task queues, RPC |
| Redis Streams | 10K-100K/sec | Per stream | Real-time, Pub/Sub |
| SQS | 10K+ msgs/sec | FIFO option | AWS integration |
| Temporal | Workflow engine | Per workflow | Durable workflows, sagas |

### Distributed Systems Patterns

| Pattern | Problem Solved | Trade-off |
|---------|---------------|-----------|
| Event Sourcing | Audit trail, temporal queries | Storage cost, complexity |
| CQRS | Read/write optimization | Eventual consistency |
| Saga (Orchestration) | Distributed transactions | Central coordinator |
| Saga (Choreography) | Decoupled transactions | Harder to debug |
| Circuit Breaker | Cascading failures | Latency during recovery |
| Bulkhead | Fault isolation | Resource overhead |

### Cloud Infrastructure Selection

| Approach | Best For | Trade-off |
|----------|----------|-----------|
| Serverless | Bursty traffic, low ops | Cold starts, vendor lock-in |
| Kubernetes | Complex workloads, multi-cloud | Operational complexity |
| PaaS (Heroku/Railway) | Small teams, rapid iteration | Less control, higher unit cost |
| Bare Metal | Predictable high load | Full ops burden |

## Additional Resources

- [Microservices Patterns Reference](references/microservices-patterns.md) for decomposition, event sourcing, CQRS, saga, service mesh, resilience.
- [Cloud-Native Patterns Reference](references/cloud-native-patterns.md) for serverless, Kubernetes, multi-cloud, FinOps, DR/HA, IaC.

## Platform Notes

- **Claude Code**: This skill can be improved using `rd3:skill-refine` after significant architectural changes.
- **All platforms**: Skill is `knowledge-only` — provides guidance but does not generate code or create files. Delegates to `rd3:sys-developing` for implementation and `rd3:backend-design` for implementation-level design.
