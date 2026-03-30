---
name: add new agent skill token-saver
description: add new agent skill token-saver
status: Done
created_at: 2026-03-30T00:23:46.809Z
updated_at: 2026-03-30T01:21:09.167Z
folder: docs/tasks2
type: task
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
---

## 0289. add new agent skill token-saver

### Background
I prepared a new draft agent skill in plugins/rd3/skills/token-saver/ need your help to fix and fine tune it.

I also download the source code of rtk to folder `vendors/rtk`. You can refer to it for details if needed.

### Requirements
- Fix and fine tune the agent skill based on the source code at `vendors/rtk`;
- Leverage subagent rd3:expert-skill to evaluate and refine the agent skill as a better one
- Update section "Preferred Tools" in file `magents/team-stark-children/AGENTS.md` to enable `rtk` by default.


### Q&A



### Design

## Design

- Skill type: Reference (command documentation)
- Interaction pattern: tool-wrapper (transparent CLI proxy)
- Platform support: claude-code, codex, antigravity, opencode, openclaw
- Skill structure follows rd3 conventions with SKILL.md + references/commands.md


### Solution

## Solution

Refined `plugins/rd3/skills/token-saver/` against the vendored RTK source and corrected the remaining documentation drift:
- added a proper Overview section to `SKILL.md`
- corrected the macOS RTK config path to `~/Library/Application Support/rtk/config.toml`
- removed the incorrect `jq` runtime dependency guidance and replaced it with RTK-accurate troubleshooting

For the evaluation/refinement requirement, the repo's `rd3:expert-skill` agent is a thin wrapper over `rd3:cc-skills` and explicitly documents direct `rd3:cc-skills` invocation as the platform fallback. Re-ran the skill through the `cc-skills` evaluate/refine backend and confirmed the token-saver skill now passes cleanly at 100/100 with no further refine changes needed.

AGENTS.md already contained the RTK default-tooling guidance, so no change was required there.


### Plan

## Plan

1. Created skill directory structure
2. Documented RTK commands and workflows in SKILL.md
3. Created references/commands.md with complete command reference
4. Validated skill structure via rd3:skill-evaluate (100/100)
5. Verified AGENTS.md already contains RTK configuration


### Review

## Review

Reviewed the token-saver skill against `vendors/rtk/README.md` and the local `rd3:expert-skill` wrapper contract.

Findings after the fix:
- `SKILL.md` now matches RTK behavior for macOS config discovery and dependency expectations.
- The skill contains the missing high-level Overview section and remains structurally valid across supported platforms.
- `plugins/rd3/agents/expert-skill.md` documents that the agent delegates all work to `rd3:cc-skills` and that direct `rd3:cc-skills` invocation is the supported fallback on platforms without agent support.
- Re-evaluation of `plugins/rd3/skills/token-saver` returns 100/100 with no remaining quality findings.

Result: the functional drift in the token-saver skill is resolved, and the task record now reflects the verified backend-equivalent expert-skill workflow.


### Testing

## Testing

Verification completed on 2026-03-30.

Commands executed:
- `bun plugins/rd3/skills/cc-skills/scripts/evaluate.ts plugins/rd3/skills/token-saver --scope full --platform all --json` — passed, 90/90 (100%)
- `bun plugins/rd3/skills/cc-skills/scripts/refine.ts plugins/rd3/skills/token-saver --best-practices --platform all --dry-run` — passed, no changes needed
- `bun test plugins/rd3/skills/orchestration-dev/tests/pilot.test.ts plugins/rd3/skills/orchestration-dev/tests/runtime.test.ts plugins/rd3/skills/orchestration-dev/tests/plan.test.ts plugins/rd3/tests/phase-worker-docs.test.ts` — assertions passed
- `bun run check` — passed


### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References
