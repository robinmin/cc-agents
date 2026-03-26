# rd3 Skill Migration Report: backend-architect + cloud-architect → rd3 backend-architect

**Date**: 2026-03-24
**Source**: `plugins/rd2/skills/backend-architect`, `plugins/rd2/skills/cloud-architect`
**Target**: `plugins/rd3/skills/backend-architect`
**Goal**: "Port the backend architecture planning skill into rd3 and improve it based on the industry best practices and SOTA techniques"
**Apply**: `--apply` present

---

## 1. Current Inventory

### rd2 Source Skills

| Skill | Lines | Type | Key Content |
|-------|-------|------|-------------|
| `rd2:backend-architect` | 906 | Knowledge | API design, PostgreSQL/MongoDB/Redis, caching, distributed systems, observability, cloud-native, ADRs |
| `rd2:cloud-architect` | 816 | Knowledge | Provider comparison (AWS/Azure/GCP), serverless, Kubernetes, multi-cloud, edge computing, FinOps, DR, IaC |

### rd3 Target Skill (Already Exists)

| File | Version | Status |
|------|---------|--------|
| `SKILL.md` | 1.1.1 (2026-03-24) | Well-structured, rd3 conventions |
| `references/api-design.md` | 1.0.0 | REST/GraphQL/gRPC, JWT, circuit breaker |
| `references/database-patterns.md` | 1.0.0 | PostgreSQL/MongoDB/Redis/connection pools |
| `references/microservices-patterns.md` | 1.0.0 | Decomposition, Event Sourcing, CQRS, Saga |
| `references/caching-patterns.md` | 1.0.0 | Cache-aside, write-through, refresh-ahead, distributed |
| `references/cloud-native-patterns.md` | 1.0.1 | Serverless, Kubernetes, multi-cloud, edge, DR, IaC |
| `agents/openai.yaml` | — | Platform variant for OpenAI Codex |
| `metadata.openclaw` | — | OpenClaw metadata |

---

## 2. Overlap Analysis

| Area | rd2 backend | rd2 cloud | rd3 backend-architect | Overlap Severity |
|------|-------------|-----------|----------------------|-----------------|
| API Gateway | Yes | No | Yes (api-design.md) | Medium — rd2 deeper on gateway options |
| PostgreSQL | Yes | No | Yes (database-patterns.md) | Medium — rd2 has more query optimization |
| Caching | Yes | No | Yes (caching-patterns.md) | Low — rd3 already comprehensive |
| Distributed systems | Yes | No | Yes (microservices-patterns.md) | Medium — rd2 has more saga patterns |
| Observability | Yes | No | Yes (microservices-patterns.md) | Medium — rd2 has structured logging depth |
| Cloud providers | No | Yes | Partial (cloud-native-patterns.md) | High — rd2 cloud has detailed provider matrix |
| Serverless | No | Yes | Yes (cloud-native-patterns.md) | Medium — rd2 cloud has more Lambda details |
| Kubernetes | No | Yes | Yes (cloud-native-patterns.md) | Low — rd3 already covers key patterns |
| Multi-cloud | No | Yes | Yes (cloud-native-patterns.md) | Medium — rd2 cloud has more patterns |
| Edge computing | No | Yes | Yes (cloud-native-patterns.md) | Low — rd3 already covers edge |
| FinOps | No | Yes | **Missing** | Critical gap |
| DR/HA | No | Yes | Yes (cloud-native-patterns.md) | Low — rd3 already covers DR strategies |
| IaC | No | Yes | Yes (cloud-native-patterns.md) | Medium — rd2 cloud has Terraform examples |

**Key findings:**
- No circular overlap within rd3 skills
- rd2 cloud-architect `cloud-native-patterns.md` reference is the most significant content source
- rd2 backend-architect's `cloud-native-patterns.md` is already superseded by rd3
- rd3 `cloud-native-patterns.md` already covers most cloud-architect content but is missing FinOps detail

---

## 3. Target Taxonomy

**Category**: `architecture-design`

**Target skill**: `rd3:backend-architect`

**Purpose**: Backend architecture patterns and systems design for building scalable, resilient distributed systems using 2026 SOTA techniques.

**Scope boundary**:
- IN scope: API design, database architecture, distributed systems, caching, cloud infrastructure decisions affecting backend design, security, observability
- OUT of scope: Frontend architecture (→ `rd3:frontend-architect`), pure IaC implementation, CI/CD pipelines, application deployment automation

**Critical gap identified**: FinOps and cloud cost optimization is absent from rd3 `cloud-native-patterns.md` despite being a core part of cloud architecture decisions that affect backend design choices.

---

## 4. Tech Stack Simplification

Both rd2 source skills are **knowledge-only** (no scripts). All implementation code examples are TypeScript or SQL in markdown — no Python conversion needed.

| Source | Has Python Examples | Action |
|--------|---------------------|--------|
| rd2 backend-architect | No | All TypeScript — keep as-is |
| rd2 cloud-architect | No | All YAML/HCL/JSON — keep as-is |

**No tech stack migration required.**

---

## 5. Target Skill Decision

**Mode**: **Refine existing rd3 skill**

`plugins/rd3/skills/backend-architect/` already exists with a solid rd3-native structure. The migration goal is to **enhance and update** rather than rebuild.

**Decision rationale**:
- rd3 SKILL.md already follows rd3 conventions (frontmatter, tags, see_also, progressive disclosure)
- rd3 reference files already split by concern (api-design, database, microservices, caching, cloud-native)
- rd2 cloud-architect content folds into existing `cloud-native-patterns.md` reference
- The `goal` of SOTA improvement is best served by targeted enhancements rather than wholesale replacement

---

## 6. Source-to-Target Mapping

| Source Skill | Current Purpose | Overlap | Target Reference | Goal Fit | Action | Priority |
|---|---|---|---|---|---|---|
| rd2 backend-architect | Full backend architecture | High | SKILL.md + references | High | **rewrite** | P1 |
| rd2 cloud-architect | Cloud infrastructure | Medium | cloud-native-patterns.md | High | **fold-into-existing** | P2 |

**Action: `rewrite` for rd2 backend-architect**
- Strengthen API design with MCP (Model Context Protocol) SOTA pattern
- Add emerging 2026 API styles (temporal APIs, Push-based Webhooks)
- Enhance observability section with eBPF-based distributed tracing
- Add performance benchmarking methodology (SLO/SLI/Error Budget deep dive)
- Update technology selection criteria for 2026 (vector databases, cloud-native databases)
- Preserve ADR patterns and progressive disclosure structure

**Action: `fold-into-existing` for rd2 cloud-architect**
- Fold FinOps/cost optimization into `cloud-native-patterns.md`
- Fold detailed AWS/Azure/GCP provider comparison matrix into `cloud-native-patterns.md`
- Fold Terraform multi-cloud examples into `cloud-native-patterns.md`
- Update serverless cold start data with 2026 measurements
- Add multi-cloud DR patterns with concrete RTO/RPO targets

---

## 7. Dependency Closure

**No new dependencies introduced.** The skill already references:
- `rd3:sys-developing` (correct)
- `rd3:pl-typescript` (correct)
- `rd3:sys-debugging` (correct)

**No circular references. No missing skills.**

---

## 8. Migration Batches

### Batch 1: Enhance rd3 backend-architect SKILL.md (P1)

**Goal**: Rewrite SKILL.md with SOTA 2026 improvements while preserving progressive disclosure structure.

**Changes**:
1. Update version to 1.2.0, updated_at to 2026-03-24
2. Expand "When to Use" with emerging trigger phrases (MCP, vector DBs, eBPF)
3. Add "Emerging Patterns" section (MCP, temporal APIs)
4. Enhance "Core Principles" with SOTA practices
5. Update "Observability" with eBPF/traces section
6. Remove stale rd2 slash-command references (`/rd2:tasks-plan --architect`)
7. Preserve ADR guidance and progressive disclosure

**Acceptance criteria**: SKILL.md is self-contained, references split correctly, no rd2 references remain.

### Batch 2: Enhance rd3 cloud-native-patterns.md (P2)

**Goal**: Fold missing cloud-architect content into the existing reference.

**Changes**:
1. Add FinOps section (right-sizing, reserved instances, spot, serverless cost management, budget alerts)
2. Add detailed cloud provider comparison table with 2026 market data
3. Update serverless cold start section with 2026 provisioned concurrency data
4. Add Terraform multi-cloud examples (currently only single-cloud shown)
5. Add edge computing architecture with 2026 CDN + compute convergence
6. Update DR patterns with eBPF-based health monitoring
7. Update sources with 2026 references

**Acceptance criteria**: No content from rd2 cloud-architect is orphaned; FinOps is now covered.

---

## 9. Per-Skill Migration Checklist

### rd2 backend-architect → rd3 backend-architect

- [x] Identify as knowledge-only (no scripts)
- [x] Identify all reference files that need updating
- [x] Verify no Python code requiring conversion
- [x] Verify rd2 source has no scripts (confirmed — knowledge-only)
- [x] Confirm goal alignment: SOTA improvements fit within existing scope
- [x] Confirm no platform companions needed (agents/openai.yaml already exists)
- [x] Mark stale references to `/rd2:tasks-plan --architect` for removal
- [x] Mark stale references to `/rd2:frontend-architect` and `/rd2:cloud-architect` for removal
- [x] Mark `backend-architect/SKILL.md` for rewrite with SOTA enhancements

### rd2 cloud-architect → rd3 backend-architect (fold-in)

- [x] Identify as knowledge-only (no scripts)
- [x] Confirm fold-in target: `references/cloud-native-patterns.md`
- [x] Verify no Python code requiring conversion
- [x] Verify no rd2 references to `/rd2:cloud-architect` elsewhere in rd3
- [x] Mark cloud-native-patterns.md for enhancement with FinOps, provider comparison, Terraform multi-cloud

---

## 10. Expert Review Gate

After applied migration:
1. Invoke `rd3:expert-skill` to evaluate the enhanced `plugins/rd3/skills/backend-architect/`
2. If issues found, invoke `rd3:expert-skill` refinement pass
3. Document evaluation outcome and any residual issues

---

## 11. Open Decisions

| Decision | Options | Recommended | Rationale |
|----------|---------|-------------|-----------|
| MCP reference depth | Shallow (quick reference) vs Deep (own section) | **Shallow** | MCP is emerging; reference in API Design reference is sufficient |
| FinOps section size | Expand DR+HA section vs new separate section | **Expand existing DR section** | DR and FinOps are related cost/resilience topics |
| Terraform examples | Keep as HCL only vs add Pulumi/ CDK | **HCL only** | rd3 uses portable patterns; Pulumi/CDK are provider-specific |
| Update sources | Keep existing 2024-2025 sources vs add 2026-only | **Add 2026 sources, keep significant older ones** | Some sources remain authoritative regardless of year |
