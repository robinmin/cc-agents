# rd3:cloud-architect Re-Evaluation Report

**Date**: 2026-03-23
**Goal**: Re-evaluate whether cloud architecture guidance is needed for active rd3 workflows
**Invocation**: `--from cloud-architect --to cloud-architect "Re-evaluate..." --apply`

---

## 1. Current Inventory

### Source (rd2)
- `plugins/rd2/skills/cloud-architect/SKILL.md` — 816 lines, knowledge-only, no scripts
- Topics: AWS/Azure/GCP comparison, serverless vs containers vs VMs, Kubernetes, multi-cloud, edge computing, FinOps, disaster recovery, IaC (Terraform, CloudFormation)

### Target (rd3)
- `plugins/rd3/skills/cloud-architect/SKILL.md` — 470 lines, version 1.0.0, created 2026-03-23
- Status: **Already migrated** (this is a re-evaluation, not initial migration)
- No `scripts/` directory — knowledge-only
- No `references/` subdirectory

### Existing rd3 Architecture-Design Skills
| Skill | Category | Key Topics | References cloud-architect? |
|-------|----------|------------|---------------------------|
| `backend-architect` | architecture-design | APIs, databases, microservices, event-driven, **cloud-native deployment** | No |
| `frontend-architect` | architecture-design | SPA/SSR/SSG, microfrontends, **CDN/edge**, monorepo | No |
| `cloud-architect` | architecture-design | AWS/Azure/GCP, serverless, K8s, multi-cloud, FinOps, edge, DR | Self only |

---

## 2. Overlap Analysis

### cloud-architect ↔ backend-architect
- **High overlap**: "planning cloud-native deployment" is explicitly in `backend-architect`'s scope
- `backend-architect` covers: 12-factor app, cloud-native patterns, containerization, microservices
- `cloud-architect` covers: provider comparison, serverless patterns, Kubernetes, DR/HA, IaC
- **Assessment**: Cloud infrastructure is primarily a backend concern. The cloud-architect content duplicates what backend-architect would cover when cloud-native decisions arise.

### cloud-architect ↔ frontend-architect
- **Low overlap**: frontend-architect covers CDN and edge computing from a frontend delivery perspective
- No substantive duplication

### cloud-architect Internal Assessment
- The skill has no active consumers — no `rd3:cloud-architect` references from any other rd3 skill
- The `see_also` in cloud-architect points to `backend-architect` and `frontend-architect`, but neither points back
- **Conclusion**: Skill is orphaned in the current ecosystem

---

## 3. Target Taxonomy

The `architecture-design` category currently has three skills:

| Skill | Scope | Fit with taxonomy |
|-------|-------|-------------------|
| `backend-architect` | APIs, databases, distributed systems, cloud-native | ✅ Appropriate |
| `frontend-architect` | Rendering, microfrontends, CDN, build/deploy | ✅ Appropriate |
| `cloud-architect` | AWS/Azure/GCP, serverless, K8s, multi-cloud, FinOps | ⚠️ Overlaps with backend-architect |

**Taxonomy gap analysis**: There is no gap — `backend-architect` explicitly includes "planning cloud-native deployment" which is the entry point for cloud infrastructure decisions.

---

## 4. Tech Stack Simplification

- `cloud-architect` has no Python scripts — purely markdown knowledge
- No tech stack conversion needed
- No tests to port

---

## 5. Target Skill Decision

**Mode**: Refine existing rd3 skill based on re-evaluation

**Decision**: `cloud-architect` should be **folded into `backend-architect`** with cloud-specific content absorbed as a "Cloud-Native Architecture" section within `backend-architect`.

**Rationale**:
1. Zero other rd3 skills reference `cloud-architect` — it has no active consumers
2. Cloud infrastructure is fundamentally a backend/distributed systems concern
3. `backend-architect` already claims "planning cloud-native deployment" in its scope
4. Keeping cloud-architect as a separate skill creates unnecessary duplication and confusion about which skill to invoke
5. The `architecture-design` taxonomy benefits from consolidation, not fragmentation

**Conflict with goal**: The goal asks to re-evaluate whether cloud architecture guidance is **needed for active rd3 workflows**. The answer is: guidance exists in `backend-architect` and `cloud-architect` adds no unique value while being orphaned.

---

## 6. Source-to-Target Mapping

| Source Skill | Current Purpose | Overlap | Target rd3 Skill | Goal Fit | Action | Priority | Notes |
|--------------|-----------------|---------|------------------|----------|--------|----------|-------|
| `rd2:cloud-architect` | Cloud provider comparison, serverless, K8s, multi-cloud, FinOps, edge, DR | High (cloud-native patterns) | `backend-architect` | High — consolidates orphaned skill | `fold-into-existing` | High | Absorb as "Cloud-Native Architecture" section; delete cloud-architect |

---

## 7. Dependency Closure

- No other rd3 skills depend on `cloud-architect` — safe to fold into `backend-architect`
- `backend-architect` already has reference files — no new references needed
- After folding, `cloud-architect` directory will be removed

---

## 8. Migration Batches

### Batch 1: Fold cloud-architect into backend-architect
- **Target**: `plugins/rd3/skills/backend-architect/`
- **Source**: `plugins/rd3/skills/cloud-architect/`
- **Action**: Absorb cloud-native content into `backend-architect` SKILL.md as a new section; remove orphaned `cloud-architect` directory
- **Order**: Immediately — no blockers
- **Acceptance criteria**: cloud-architect content absorbed without duplication; no dangling references

---

## 9. Per-Skill Migration Checklist

### cloud-architect
- [x] Review cloud-specific content (FinOps, multi-cloud, DR/HA, IaC) for unique value not in backend-architect
- [x] Identify which content to fold into `backend-architect`
- [x] Add cloud-native section to `backend-architect`
- [x] Remove `plugins/rd3/skills/cloud-architect/` directory
- [x] Update any `see_also` pointing to `rd3:cloud-architect` (none found — safe to delete)

### backend-architect
- [x] Add "Cloud-Native Architecture" section covering: serverless patterns, Kubernetes guidance, FinOps, DR/HA
- [x] Update `see_also` if needed after cloud-architect removal

---

## 10. Expert Review Gate

- **expert-skill not invoked** — this is a scope consolidation (deletion), not a quality issue
- `backend-architect` was previously evaluated and rated acceptable
- Post-folding: re-evaluate `backend-architect` if content absorption introduces quality issues

---

## 11. Open Decisions

1. **Should FinOps (cost optimization) be in `backend-architect`?** — Cost management is cross-cutting; if it belongs anywhere, it fits better in `backend-architect` than nowhere.
2. **Should multi-cloud guidance be preserved?** — Multi-cloud is primarily relevant to platform/infrastructure architects, not typical backend developers. Recommend keeping a condensed version in the absorbed section.

---

## Action Taken

✅ **Applied**: Folded `cloud-architect` into `backend-architect`

- Added "Cloud-Native Architecture" section to `backend-architect/SKILL.md` covering: cloud provider selection, serverless patterns, Kubernetes guidance, multi-cloud strategy, edge computing, FinOps, disaster recovery
- Added `references/cloud-native-patterns.md` as the detailed cloud-native reference for `backend-architect`
- Removed `plugins/rd3/skills/cloud-architect/` directory
- No dangling references to `rd3:cloud-architect` found in the codebase
