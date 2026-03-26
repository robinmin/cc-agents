---
name: backend-architect
description: "Backend system architecture and distributed systems design for 2026: service decomposition, microservices topology, event-driven architecture (CQRS/Event Sourcing/Saga), distributed systems resilience (circuit breakers, bulkheads), scalability patterns, cloud-native architecture (serverless, Kubernetes, FinOps, DR/HA, IaC), emerging patterns (MCP, Temporal, eBPF). Trigger when: planning service boundaries, designing distributed systems, making cloud infrastructure decisions, or evaluating scalability strategies."
license: Apache-2.0
version: 2.0.0
created_at: 2026-03-23
updated_at: 2026-03-26
type: technique
tags: [backend, architecture, microservices, event-driven, distributed-systems, scalability, cloud-native, serverless, kubernetes, finops, iac, disaster-recovery, ebpf, temporal, mcp]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: architecture-design
  interactions:
    - knowledge-only
see_also:
  - rd3:backend-design
  - rd3:sys-developing
  - rd3:pl-typescript
  - rd3:sys-debugging
---

# rd3:backend-architect — Backend System Architecture

Backend system architecture and distributed systems design guidance for building scalable, resilient systems using 2026 best practices.

## Overview

This skill provides system-level architectural guidance: service decomposition, distributed systems topology, event-driven architecture, scalability strategies, cloud-native patterns, and emerging architectural paradigms.

For implementation-level design (API endpoint design, database schemas, caching layers, auth flows, observability instrumentation), use `rd3:backend-design` instead.

## Quick Start

Use this skill to frame the architecture decision first, then dive into the matching reference file:

- "Plan the service boundaries, event flow, and saga strategy for e-commerce checkout."
- "Choose between monolith, modular monolith, and microservices for a team of 8 engineers."
- "Design the runtime model for webhook ingestion — serverless vs Kubernetes."
- "Evaluate multi-cloud vs single-cloud for a fintech platform with strict DR requirements."
- "Design an MCP (Model Context Protocol) integration layer for LLM agents."

## When to Use

Use this skill when:

- Planning service decomposition and boundaries
- Designing distributed systems topology
- Choosing between monolith, modular monolith, and microservices
- Designing event-driven architecture (Event Sourcing, CQRS, Saga)
- Planning scalability and resilience strategies
- Making cloud infrastructure decisions (serverless vs Kubernetes, multi-cloud)
- Evaluating emerging architectural patterns (MCP, Temporal, eBPF)
- Planning disaster recovery and high availability
- Making FinOps and cost optimization decisions
- Designing Infrastructure as Code strategies

This skill is not the right fit when:

- Designing API endpoints, database schemas, or caching layers (use `rd3:backend-design` instead)
- Implementing auth flows or observability instrumentation (use `rd3:backend-design` instead)
- Debugging existing backend code (use `rd3:sys-debugging` instead)
- Writing backend implementation code (use `rd3:sys-developing` instead)
- Frontend architecture decisions (use `rd3:frontend-architect` instead)

## Workflow

1. Identify the architectural decision that is actually open: service boundaries, distributed systems topology, consistency model, scaling strategy, cloud infrastructure, or resilience approach.
2. Start with the relevant section in this file to set direction, then open the matching reference for depth:
   - `references/microservices-patterns.md` — Decomposition, Event Sourcing, CQRS, Saga, service mesh, resilience
   - `references/cloud-native-patterns.md` — Serverless, Kubernetes, multi-cloud, FinOps, DR/HA, IaC
3. Compare at least two viable options and document the tradeoff in terms of correctness, operability, latency, cost, and team complexity.
4. Verify any framework-, vendor-, or version-specific claim before recommending it.
5. End with an explicit recommendation, key risks, and an ADR-style rationale when the decision is material.

## Example

Use a small decision note before going deep into a reference:

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

## Core Principles

### Verification Before Design

- **Search first**: Always verify current framework capabilities
- **Cite sources**: Every decision should reference documentation
- **Version awareness**: Framework/database behavior changes between versions
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

MCP is an emerging standard for AI/LLM integration that provides structured, context-aware outputs between AI agents and external systems. Use MCP when building integrations that need to share context with LLM-powered tools or when designing AI-native API surfaces.

### Temporal APIs

Temporal APIs (persistent workflows) provide durable execution of multi-step business processes. Unlike simple queues, temporal workflows survive process restarts, machine failures, and network partitions. Key differentiators:

- Built-in retry with backoff at the activity level
- Workflow state persistence across failures
- Activity timeouts and heartbeat for long-running tasks
- Distributed saga with compensating transactions built-in

Use when you need reliable execution of workflows that span minutes to days, such as order fulfillment, onboarding sequences, or data pipeline orchestration.

### Push-Based Webhooks

Event-driven notification patterns have evolved toward push-based webhooks with delivery guarantees:

- Idempotency keys for safe retries
- Sequential delivery ordering for dependent events
- Signature verification (HMAC-SHA256) for security
- Automatic retry with exponential backoff

### eBPF-Based Observability

Extended Berkeley Packet Filter (eBPF) enables kernel-level instrumentation without application changes. In 2026, eBPF-based distributed tracing is SOTA for:

- Zero-instrumentation trace collection (no SDK required)
- Network-level latency attribution
- Sidecar-free service mesh observability
- Continuous profiling with minimal overhead

When designing observability for new systems, evaluate eBPF-based tools (e.g., Cilium Tetragon, Pixie) as an alternative to OpenTelemetry SDK instrumentation.

## Service Decomposition

Service decomposition determines how to break a system into services. Key strategies:

- **Domain-Driven Design**: Bounded contexts define service boundaries
- **Strangler Fig**: Incrementally extract services from a monolith
- **Modular Monolith**: Internal module boundaries as a stepping stone

See [Microservices Patterns Reference](references/microservices-patterns.md) for detailed decomposition strategies, bounded context mapping, and team topology alignment.

## Distributed Systems

### Event-Driven Architecture

Event-driven patterns for decoupled, scalable systems:

- **Event Sourcing**: Store state as a sequence of events
- **CQRS**: Separate read and write models for different optimization
- **Saga**: Coordinate distributed transactions across services

See [Microservices Patterns Reference](references/microservices-patterns.md) for event sourcing schema evolution, CQRS read/write separation, saga orchestration vs choreography, and compensation strategies.

### Resilience Patterns

Circuit breaker states: **CLOSED** (normal) → **OPEN** (fail-fast) → **HALF-OPEN** (probe recovery). Configure failure threshold, timeout, and reset timeout based on service SLAs.

Additional resilience patterns: bulkhead isolation, retry with exponential backoff, timeout propagation, and graceful degradation.

See [Microservices Patterns Reference](references/microservices-patterns.md) for circuit breaker configuration, bulkhead isolation, and resilience testing.

## Scalability Patterns

- **Horizontal scaling**: Stateless services behind load balancers
- **Vertical scaling**: Larger instances for compute-bound workloads
- **Auto-scaling**: CPU/memory-based or custom metrics (queue depth, request latency)
- **Sharding**: Data partitioning for write-heavy workloads

See [Microservices Patterns Reference](references/microservices-patterns.md) for horizontal scaling patterns, load balancing algorithm trade-offs, and auto-scaling configuration.

## Cloud-Native Patterns

### 12-Factor App

Cloud-native applications follow 12 key principles: single codebase, explicit dependencies, config via environment variables, backing services as attached resources, strict build/release/run separation, stateless processes, port binding, concurrency via scaling, fast startup/shutdown, dev/prod parity, logs as event streams, and one-off admin processes.

### Infrastructure Decisions

Cloud-specific architecture decisions in scope: provider selection, serverless vs Kubernetes, resilience, cost controls, and IaC boundaries. Verify current provider limits, pricing, and regional capabilities before making a final recommendation.

See [Cloud-Native Patterns Reference](references/cloud-native-patterns.md) for serverless, Kubernetes, multi-cloud, FinOps, DR/HA, and IaC guidance.

## Architecture Decision Records (ADRs)

Document significant architectural decisions with: **Context** (why the decision is needed), **Decision** (what was chosen), **Consequences** (positive/negative), and **Alternatives Considered** (why alternatives were rejected).

## Quick Reference

### Service Architecture Selection

| Architecture | Team Size | Complexity | Use Case |
|-------------|-----------|-----------|----------|
| Monolith | 1-5 engineers | Low | MVP, early-stage product |
| Modular Monolith | 5-15 engineers | Medium | Growing product, clear domains |
| Microservices | 15+ engineers | High | Scaled product, independent deployment |

### Message Queue Selection

| Queue | Throughput | Ordering | Use Case |
|-------|-----------|----------|----------|
| Kafka | 1M+ msgs/sec | Per partition | Event streaming, logs |
| RabbitMQ | 10K-100K/sec | Per queue | Task queues, RPC |
| Redis Streams | 10K-100K/sec | Per stream | Real-time, Pub/Sub |
| SQS | 10K+ msgs/sec | FIFO option | AWS integration, simple |
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
| Serverless | Bursty traffic, low ops overhead | Cold starts, vendor lock-in |
| Kubernetes | Complex workloads, multi-cloud | Operational complexity |
| PaaS (Heroku/Railway) | Small teams, rapid iteration | Less control, higher unit cost |
| Bare Metal | Predictable high load, cost optimization | Full ops burden |

## Additional Resources

- [Microservices Patterns Reference](references/microservices-patterns.md) for service decomposition, event sourcing, CQRS, saga patterns, resilience, and service communication.
- [Cloud-Native Patterns Reference](references/cloud-native-patterns.md) for serverless, Kubernetes, multi-cloud, FinOps, DR/HA, and IaC patterns.

## Platform Notes

- **Claude Code**: This skill can be improved using `rd3:skill-refine` after significant architectural changes. Reference files use `see_also` frontmatter for cross-navigation.
- **All platforms**: Skill is `knowledge-only` — it provides guidance but does not generate code or create files directly. Delegates to `rd3:sys-developing` for implementation and `rd3:backend-design` for implementation-level design decisions.
