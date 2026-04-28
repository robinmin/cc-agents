---
name: bug-memory-buglog-json
description: "Extracted section: Bug Memory — buglog.json"
see_also:
  - rd3:indexed-context
---

# Bug Memory — buglog.json

Bug encounter history that prevents re-discovering the same issues.

### Structure

```json
{
  "version": 1,
  "bugs": [
    {
      "id": "bug-001",
      "timestamp": "2026-04-28T10:00:00Z",
      "error_message": "TypeError: Cannot read property 'map' of undefined",
      "file": "src/components/UserList.tsx",
      "root_cause": "API response shape changed, users field renamed to data",
      "fix": "Added optional chaining: response?.data?.users ?? []",
      "tags": ["typescript", "api", "null-safety"],
      "related_bugs": [],
      "occurrences": 2,
      "last_seen": "2026-04-28T10:00:00Z"
    }
  ]
}
```

### When to Log

Log a bug when ANY of these happen:
- User reports an error, bug, or problem
- A test fails or command produces an error
- Fixing something that was broken
- Editing a file more than twice to get it right
- Import/module/dependency is missing or wrong
- Runtime error, type error, or syntax error occurs
- Build or lint command fails

### Bug Search

```bash
openwolf bug search "TypeError"
openwolf bug search "auth"
```
