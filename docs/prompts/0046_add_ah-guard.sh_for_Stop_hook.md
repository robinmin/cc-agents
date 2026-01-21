---
name: add ah-guard.sh for Stop hook
description: <prompt description>
status: WIP
created_at: 2026-01-21 00:01:28
updated_at: 2026-01-21 00:01:28
---

## 0046. add ah-guard.sh for Stop hook

### Background

In plugin `rd`, we configed a prompt type for Stop hook to enforce the anti-hallucination protocol are always followed.

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Evaluate if Claude should stop. Context: $ARGUMENTS\n\nCheck if:\n1. The anti-hallucination protocol was followed\n2. Sources were cited for API claims\n3. All requested tasks are complete\n\nRespond with JSON: `{\"ok\": true, \"reason\": \"Task is complete\"}` to allow stopping, or `{\"ok\": false, \"reason\": \"Add verification for [specific uncited claims]\"}` to continue working.",
            "timeout": 30
          }
        ]
      }
    ]
}
```

Unfortunately, this always does not work as expected. I always receive an error message like this:

```text
Ran 3 stop hooks
  ⎿  Stop hook error: JSON validation failed
```

Claude Code said the issue is the `prompt` hook is not very stable in current stage, and suggested to use `command` hook instead.

### Requirements / Objectives

So we need to write a script in @plugins/rd2/skills/anti-hallucination/scripts/ah-guard.py to do the same thing as the prompt hook or do more advanced verification with better quality.

### Solutions / Goals

### References
