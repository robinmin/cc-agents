---
name: enhance new Agent Skills pl-golang
description: Task: enhance new Agent Skills pl-golang
status: Done
created_at: 2026-01-25 17:24:03
updated_at: 2026-01-26 21:19:59
impl_progress: {}
---

## 0074. enhance new Agent Skills pl-golang

### Background

For the information of golang, we already have the following files:

- plugins/rd/agents/golang-expert.md
- vendors/claude-code-subagents-collection/subagents/golang-expert.md

Despite they are in different formats and for different purposes, we still can extract relevant patterns, paradigms, best practices, techniques, and built-in libraries usage for golang programming.

Meanwhile, I also need your help to invoke subagent `rd:super-researcher` to find more relevant patterns, paradigms, best practices, techniques, and built-in libraries usage for golang programming for the web.

### Requirements / Objectives

- Use slash command `/rd2:skill-add rd2 pl-golang` to add a new Agent Skills in folder `plugins/rd2/skills/pl-golang`.

- Use subagent `rd2:knowledge-seeker` to extract relevant patterns, paradigms, best practices, techniques, and built-in libraries usage from above given files.

- Use `rd:super-researcher` to find more relevant patterns, paradigms, best practices, techniques, and built-in libraries usage for golang programming for the web.

- Consolidate these findings into one list, and then do cross verification the list, then filter out irrelevant information.

- Integrate the consolidated findings into file `plugins/rd2/skills/pl-golang/SKILL.md`

- Invoke slash commands `/rd2:skill-evaluate plugins/rd2/skills/pl-golang` and `/rd2:skill-refine plugins/rd2/skills/pl-golang` to evaluate and refine it to make it as a more powerful and reliable Agent Skills.

### Solutions / Goals

### Artifacts

### References
