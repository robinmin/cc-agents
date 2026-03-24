---
name: backend-architect
description: "Backend architecture patterns and systems design: API design (REST/GraphQL/gRPC), database architecture (PostgreSQL/MongoDB/Redis), microservices, event-driven architecture, CQRS, saga patterns, caching strategies, scalability, security, observability, and cloud-native architecture (serverless, Kubernetes, FinOps, DR/HA, IaC). Trigger when: designing APIs, database schemas, microservices, event-driven systems, planning backend scalability, or making cloud infrastructure decisions."
license: Apache-2.0
version: 1.1.1
created_at: 2026-03-23
updated_at: 2026-03-24
type: technique
tags: [backend, architecture, api-design, database, microservices, event-driven, scalability, security, architecture-design, cloud-native, serverless, kubernetes, finops, iac, disaster-recovery]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: architecture-design
  interactions:
    - knowledge-only
see_also:
  - rd3:sys-developing
  - rd3:pl-typescript
  - rd3:sys-debugging
---

# rd3:backend-architect — Backend Architecture Patterns

Backend architecture patterns and systems design guidance for building scalable, resilient distributed systems.

## Overview

This skill provides architectural guidance for backend development, covering API design, database architecture, distributed systems, scalability patterns, security, observability, and cloud-native practices.

## Quick Start

Use this skill to frame the architecture decision first, then dive into the matching reference file:

- "Design a versioned REST API for multi-tenant billing with rate limits, idempotency, and webhook delivery."
- "Choose between PostgreSQL, MongoDB, and Redis for an order-processing system with high write volume and strict consistency requirements."
- "Plan the service boundaries, event flow, and saga strategy for e-commerce checkout."

## When to Use

Use this skill when:

- Designing API endpoints (REST, GraphQL, gRPC)
- Designing database schemas and relationships
- Planning microservices architecture
- Designing event-driven systems
- Planning scalability and performance
- Designing distributed transactions
- Planning caching strategies
- Designing observability and monitoring
- Planning cloud-native deployment

This skill is not the right fit when:

- Debugging existing backend code (use `rd3:sys-debugging` instead)
- Writing backend implementation code (use `rd3:sys-developing` instead)
- Frontend architecture decisions (use `rd3:frontend-architect` instead)
- Pure implementation work such as writing Terraform, deployment scripts, or operational runbooks when the architecture decision is already settled

## Workflow

1. Identify the architectural decision that is actually open: API contract, data model, service boundaries, consistency model, scaling pattern, or observability target.
2. Start with the relevant section in this file to set direction, then open the matching reference for depth:
   - `references/api-design.md`
   - `references/database-patterns.md`
   - `references/microservices-patterns.md`
   - `references/caching-patterns.md`
   - `references/cloud-native-patterns.md`
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

### Contract-First API Design

- Define API contracts before implementation
- Use OpenAPI/Swagger for REST specification
- Design service boundaries using Domain-Driven Design (DDD)
- Document versioning strategy from day one
- Generate client SDKs from specifications

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
- Token-based authentication (JWT + refresh tokens)
- Encryption in transit (TLS/mTLS) and at rest

## API Design

API design covers contract-first design, REST/GraphQL/gRPC patterns, versioning strategies, and API Gateway architecture.

See [API Design Reference](references/api-design.md) for detailed guidance on REST resource naming, HTTP status codes, versioning strategies, GraphQL schema design, N+1 prevention, gRPC service definitions, and API Gateway responsibilities.

## Database Architecture

Database architecture covers PostgreSQL indexing and partitioning, MongoDB and Redis technology selection, connection pooling, and data modeling trade-offs.

See [Database Patterns Reference](references/database-patterns.md) for detailed PostgreSQL indexing examples (B-tree, GIN, composite, partial), range partitioning, PgBouncer configuration, MongoDB schema design, and technology selection criteria.

## Caching Strategies

Caching strategies determine how data is stored and retrieved to reduce database load.

See [Caching Patterns Reference](references/caching-patterns.md) for detailed guidance on Cache-Aside, Write-Through, Write-Behind patterns, TTL strategies, distributed caching, and invalidation approaches.

## Distributed Systems

Distributed systems architecture covers microservices decomposition, event-driven patterns, saga coordination, and resilience mechanisms.

See [Microservices Patterns Reference](references/microservices-patterns.md) for detailed guidance on service decomposition strategies, Event Sourcing patterns and schema evolution, CQRS read/write model separation, saga orchestrator implementation, and circuit breaker configuration.

### Circuit Breaker Summary

Circuit breaker states: **CLOSED** (normal) → **OPEN** (fail-fast) → **HALF-OPEN** (probe recovery). Configure failure threshold, timeout, and reset timeout based on service SLAs.

## Scalability Patterns

Scalability patterns cover horizontal scaling strategies, load balancing algorithms, and health check design for stateless services.

See [Microservices Patterns Reference](references/microservices-patterns.md) for detailed horizontal scaling patterns, load balancing algorithm trade-offs, and auto-scaling configuration.

## Security Architecture

Security architecture covers authentication flows, token-based auth, secrets management, and defense-in-depth strategies.

See [API Design Reference](references/api-design.md) for detailed OAuth2 authorization code flow, JWT structure and best practices (RS256, short-lived tokens, httpOnly cookies), and API security patterns.

## Observability

Observability covers metrics (RED method), structured logging with trace context, distributed tracing (OpenTelemetry), and SLO/SLI error budget calculations.

See [Microservices Patterns Reference](references/microservices-patterns.md) for detailed observability patterns including three-pillar implementation (metrics, logs, traces), SLO/SLI design, and error budget calculations.

## Cloud-Native Patterns

### 12-Factor App

Cloud-native applications follow 12 key principles: single codebase, explicit dependencies, config via environment variables, backing services as attached resources, strict build/release/run separation, stateless processes, port binding via self-contained services, concurrency via scaling, fast startup/shutdown, dev/prod parity, treating logs as event streams, and one-off admin processes for maintenance tasks.

Cloud-specific architecture decisions remain in scope here when they affect backend system design, especially provider selection, serverless vs Kubernetes, resilience, cost controls, and IaC boundaries. Verify current provider limits, pricing, and regional capabilities before making a final recommendation.

See [Cloud-Native Patterns Reference](references/cloud-native-patterns.md) for detailed serverless, Kubernetes, multi-cloud, FinOps, DR, and IaC guidance.

## Architecture Decision Records (ADRs)

Document significant architectural decisions with: **Context** (why the decision is needed), **Decision** (what was chosen), **Consequences** (positive/negative), and **Alternatives Considered** (why alternatives were rejected). See reference files for pattern ADRs covering API design, database selection, and cloud-native decisions.

## Platform Notes

- **Claude Code**: Use `/rd3:skill-refine` to self-improve this skill after architectural changes. Reference files use `see_also` frontmatter for cross-navigation.
- **All platforms**: Skill is `knowledge-only` — it provides guidance but does not generate code or create files directly. Delegates to `rd3:sys-developing` for implementation.

## Quick Reference

### Common API Patterns

| Pattern | Use Case | HTTP Method |
|---------|----------|-------------|
| CRUD | Standard resource operations | GET, POST, PUT, DELETE |
| RPC | Action-oriented | POST |
| Collection | Bulk operations | POST |
| Sub-resource | Nested resources | /parent/{id}/child |

### Database Selection

| Database | Best For | Consistency |
|----------|----------|-------------|
| PostgreSQL | Complex transactions, relational data | Strong |
| MongoDB | Flexible schema, document storage | Eventual |
| Redis | Caching, sessions, real-time | N/A |
| TimescaleDB | Time-series data, metrics | Strong |
| Cassandra | High write throughput, wide columns | Eventual |

### Message Queue Selection

| Queue | Throughput | Ordering | Use Case |
|-------|-----------|----------|----------|
| Kafka | 1M+ msgs/sec | Per partition | Event streaming, logs |
| RabbitMQ | 10K-100K/sec | Per queue | Task queues, RPC |
| Redis Streams | 10K-100K/sec | Per stream | Real-time, Pub/Sub |
| SQS | 10K+ msgs/sec | FIFO option | AWS integration, simple |

### Emerging API Styles

| Style | Use Case | Pros | Cons |
|-------|----------|------|------|
| **REST** | General-purpose APIs | Simple, cacheable, stateless | Over-fetching, under-fetching |
| **GraphQL** | Complex data requirements | Single query, flexible | Complexity, caching challenges |
| **gRPC** | Internal microservices | High-performance, type-safe | Browser support, debugging |
| **Webhooks** | Event-driven notifications | Real-time, decoupled | Delivery reliability |
| **MCP** (Model Context Protocol) | AI/LLM integration | Structured AI outputs, context-aware | Emerging standard |

## Additional Resources

- [API Design Reference](references/api-design.md) for REST, GraphQL, gRPC, versioning, and API security patterns.
- [Database Patterns Reference](references/database-patterns.md) for PostgreSQL, MongoDB, Redis, partitioning, indexing, and technology selection.
- [Microservices Patterns Reference](references/microservices-patterns.md) for service decomposition, event sourcing, CQRS, saga patterns, and service communication.
- [Caching Patterns Reference](references/caching-patterns.md) for cache-aside, write-through, write-behind, refresh-ahead, TTL, and invalidation strategies.
- [Cloud-Native Patterns Reference](references/cloud-native-patterns.md) for serverless, Kubernetes, multi-cloud, edge computing, FinOps, DR/HA, and IaC patterns.
