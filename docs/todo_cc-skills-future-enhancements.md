# cc-skills Future Enhancements (Deferred)

These improvements were identified from Anthropic's article "Lessons from Building Claude Code: How We Use Skills" but deferred due to lower priority or needing more ecosystem maturity.

**Source**: `docs/reasearch/Lessons_from_Building_Claude_Code_How_We_Use_Skills.md`
**Date**: 2026-03-18
**Target**: `plugins/rd3/skills/cc-skills`

---

## #6 On-Demand Hooks Guidance

**What Anthropic says**: Skills can include hooks that are only activated when the skill is called, and last for the duration of the session. Examples: `/careful` (blocks `rm -rf`, `DROP TABLE`, force-push via PreToolUse matcher on Bash), `/freeze` (blocks Edit/Write outside a specific directory).

**Current state**: `rd3:cc-skills` mentions `hooks:` in Platform Notes for Claude Code but doesn't teach the pattern or provide examples.

**What to add**:
- Dedicated section in `references/best-practices.md` or new `references/on-demand-hooks.md`
- Pattern: how to declare hooks in SKILL.md frontmatter
- Examples: safety guards, write-freeze, mode enforcement
- When to use on-demand hooks vs always-on hooks
- Testing guidance for hook-based skills

**Why deferred**: Powerful but niche. Most skill authors won't need session-scoped hooks yet. Revisit when hook-based skills become more common in the ecosystem.

---

## #8 Skill Composition & Dependencies

**What Anthropic says**: "You may want to have skills that depend on each other... you can just reference other skills by name, and the model will invoke them if they are installed." Dependency management is not natively built into marketplaces or skills yet.

**Current state**: No guidance on skill-to-skill dependencies or composition in `rd3:cc-skills`.

**What to add**:
- Section in `references/skill-patterns.md` or `references/best-practices.md`
- How to reference another skill by name in instructions
- Graceful fallback when a dependency skill is not installed
- Avoiding circular dependencies between skills
- Pattern: "orchestrator skill" that composes multiple specialist skills
- Convention for documenting skill dependencies (e.g., `metadata.requires` field)

**Why deferred**: The plugin ecosystem isn't mature enough to have strong composition patterns yet. Premature standardization could lock in wrong patterns. Revisit when multi-skill workflows become common.

---

## #9 Measuring Skill Effectiveness

**What Anthropic says**: "We use a PreToolUse hook that lets us log skill usage within the company." This helps find skills that are popular or under-triggering compared to expectations. ([Example code](https://gist.github.com/ThariqS/24defad423d701746e23dc19aace4de5))

**Current state**: Evaluation framework focuses on structural quality scoring. No guidance on runtime measurement or usage analytics.

**What to add**:
- Section in `references/best-practices.md` on measuring skills post-deployment
- PreToolUse hook pattern for logging skill invocations
- Key metrics to track:
  - **Trigger rate**: How often the skill fires vs. how often it should
  - **Success rate**: Does the skill complete without errors?
  - **User override rate**: How often users reject or modify skill output?
  - **Under-triggering detection**: Skills that should fire but don't
- Integration with CI/CD for skill quality monitoring
- Dashboard/reporting patterns for skill usage across a team

**Why deferred**: Valuable for organizations at scale, but our current users are mostly individual developers or small teams. Revisit when plugin marketplace adoption grows.

---

## #10 Distribution Strategy Guidance

**What Anthropic says**: Two paths — check skills into your repo (under `./.claude/skills`) for small teams, or use a plugin marketplace for scale. Every checked-in skill adds to model context. Warns about bad/redundant skills and recommends curation before marketplace release.

**Current state**: Package workflow creates distributable bundles but doesn't advise on which distribution path to choose or how to curate.

**What to add**:
- Decision framework: repo-checked-in vs. marketplace
  - Small team, few repos → check into `./.claude/skills`
  - Large org, many repos → plugin marketplace
- Context budget awareness: each checked-in skill adds metadata tokens
- Quality gates before marketplace promotion:
  - Sandbox/trial period in a shared folder
  - Traction threshold (skill owner decides)
  - PR-based promotion to marketplace
- Curation process to prevent bad/redundant skills
- Versioning strategy for distributed skills

**Why deferred**: Already partially covered by the Package workflow. Low urgency since most users distribute skills via repo commit. Revisit when marketplace features mature.

---

## Implementation Priority (when ready)

| # | Enhancement | Trigger to Revisit |
|---|-------------|-------------------|
| 6 | On-demand hooks | When hook-based skills become common |
| 8 | Skill composition | When multi-skill workflows emerge |
| 9 | Measuring effectiveness | When marketplace adoption grows |
| 10 | Distribution strategy | When marketplace features mature |
