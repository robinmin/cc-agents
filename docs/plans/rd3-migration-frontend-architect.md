# rd3:frontend-architect Migration Report

**Date**: 2026-03-24
**Goal**: Port the frontend system architecture skill into rd3 and correct migration drift against the rd2 -> rd3 plan
**Invocation**: `--from frontend-architect --to frontend-architect "Port the frontend system architecture skill into rd3"`

---

## 1. Scope

- Source: `plugins/rd2/skills/frontend-architect/SKILL.md`
- Target: `plugins/rd3/skills/frontend-architect/`
- Category: `architecture-design`
- Interaction model: `knowledge-only`

This migration preserves the intended Wave 3 scope from `docs/rd2_migration_plan.md`: high-level frontend architecture guidance covering rendering strategy, microfrontends, build/deploy, edge delivery, security, and observability.

---

## 2. Issues Corrected

- Corrected the App Router rendering guidance so the skill no longer claims “no directive = SSR by default”.
- Replaced the stale `middleware.ts` example with a current `proxy.ts` pattern using `NextRequest` and `NextResponse`.
- Removed the invalid `request.geo` usage and the broken multi-zones `rewrites()` shape.
- Updated RUM guidance from FID to INP and switched to Next.js `useReportWebVitals`.
- Aligned skill metadata with peer rd3 architecture/design skills by marking the skill `knowledge-only`.
- Added `metadata.openclaw` to frontmatter and corrected `agents/openai.yaml` to `architecture-design`.
- Replaced blog-heavy resource links with primary documentation.

---

## 3. Verification

### Local validation

Command:

```bash
bun run plugins/rd3/skills/cc-skills/scripts/validate.ts plugins/rd3/skills/frontend-architect
```

Result:

- Passes with no errors
- Remaining warning: body length only

### Local evaluation

Command:

```bash
bun run plugins/rd3/skills/cc-skills/scripts/evaluate.ts plugins/rd3/skills/frontend-architect --scope full
```

Result:

- Score: **90/90 (100%)**
- Status: **PASS**

This uses the same `cc-skills` evaluation logic that the migration plan calls out as the standards gate behind `rd3:expert-skill`.

---

## 4. Outcome

`frontend-architect` now:

- matches the rd3 architecture-design taxonomy
- uses a knowledge-only interaction model consistent with peer skills
- avoids stale Next.js and Web Vitals guidance
- includes companion metadata that is internally consistent across platforms
- has a documented post-migration validation/evaluation record under `docs/plans/`

No blocking migration issues remain in the skill artifact itself.
