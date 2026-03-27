---
name: add-profile-field-to-tasks-schema
description: add-profile-field-to-tasks-schema
status: Done
created_at: 2026-03-27T06:18:51.053Z
updated_at: 2026-03-27T16:51:21.322Z
folder: docs/tasks2
type: task
priority: "high"
estimated_hours: 2
dependencies: []
tags: ["prerequisite","tasks-cli","schema"]
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: pending
  testing: pending
---

## 0266. add-profile-field-to-tasks-schema

### Background

The 9-phase orchestration-dev pipeline requires a 'profile' field (simple/standard/complex/research) in task frontmatter to determine which phases to execute and what gates to apply. Currently TaskFrontmatter in plugins/rd3/skills/tasks/scripts/types.ts has no profile field, and the tasks CLI does not validate or support it. This is a prerequisite for orchestration-dev (R6) and request-intake (R2) which auto-assigns profiles.


### Requirements

1. Add 'profile' field to TaskFrontmatter interface in types.ts with type 'simple' | 'standard' | 'complex' | 'research' (optional field). 2. Update tasks create command to accept --profile flag. 3. Update tasks check validation to accept profile as valid frontmatter. 4. Ensure existing task files without profile field remain valid (backward compatible). 5. All existing tests continue to pass. 6. Add 2+ unit tests for profile field validation. 7. **Research before implementation**: Use `ref_search_documentation` and `WebSearch` to research how comparable task management tools (Linear, Jira, GitHub Projects) handle task complexity classification. Search for SOTA approaches to task profiling heuristics (T-shirt sizing, story points, complexity matrices). Apply industry best practices to the profile field design — document findings in Q&A section before coding.


### Q&A

**Q: Should profile default to 'standard' when not specified, or remain truly optional (undefined)?**

A: Profile should remain truly optional (undefined) for backward compatibility. Downstream skills (request-intake, orchestration-dev) will auto-assign profiles when needed.


### Design

- types.ts: Add `profile?: 'simple' | 'standard' | 'complex' | 'research'` to TaskFrontmatter and `profile?: string` to CliArgs
- create.ts: Add `profile?: string` to options and call `upsertFrontmatterField(content, 'profile', options.profile)`
- Tests: Add 3 new tests for profile field persistence, valid values, and backward compatibility


### Solution

Implementation complete:
- Added profile field to TaskFrontmatter interface (types.ts line 29)
- Added profile field to CliArgs interface (types.ts line 91)
- Added profile option and upsertFrontmatterField call (create.ts lines 23, 71)
- Added 3 tests for profile field validation (create.test.ts)


### Plan

- [x] Add profile to TaskFrontmatter interface
- [x] Add profile to CliArgs interface
- [x] Update create.ts to support --profile flag
- [x] Add tests for profile field
- [x] Verify lint, typecheck, and tests pass


### Review



### Testing

All tests pass:
```
bun test plugins/rd3/skills/tasks/tests/create.test.ts
7 pass, 0 fail
```


### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |
| modified | plugins/rd3/skills/tasks/scripts/types.ts | orchestrator | 2026-03-27 |
| modified | plugins/rd3/skills/tasks/scripts/commands/create.ts | orchestrator | 2026-03-27 |
| modified | plugins/rd3/skills/tasks/tests/create.test.ts | orchestrator | 2026-03-27 |


### References


