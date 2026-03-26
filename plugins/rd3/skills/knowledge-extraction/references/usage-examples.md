---
name: usage-examples
description: "Detailed usage examples for knowledge-extraction workflows including React Server Components research and Python type hinting"
see_also:
  - rd3:knowledge-extraction
---

# Usage Examples

### Example 1: React Server Components Research

**Scenario:** User asks "What's the difference between React Server Components and Client Components?"

```
**Step 1: EXTRACT**
- Primary source: React Docs - Server Components
- Extract key points: server vs client execution, hydration, bundle size

**Step 2: VERIFY**
- Source 2: React Team Blog (2023)
- Source 3: Next.js Documentation (App Router)
- Cross-verify: Execution context, use cases, limitations

**Step 3: CONSOLIDATE**
- Server Components: Run on server, zero client JS, cannot use hooks
- Client Components: Run on client, can use hooks, hydrates on client

**Step 4: CITE**
```

**Output:**
```markdown
## React Server Components vs Client Components

### Extracted Information

**Server Components:**
- Execute exclusively on the server during render
- Reduce client-side JavaScript bundle size
- Cannot use hooks or browser APIs
- Can read directly from database/filesystem

**Client Components:**
- Execute on client (with optional server pre-rendering)
- Full access to hooks and browser APIs
- Require hydration overhead

### Sources

- [React Docs - Server Components](https://react.dev/reference/react/server-components) | Verified: 2026-03-20
- [React Team Blog - RSC](https://react.dev/blog/2023/rsc) | Verified: 2026-03-20
- [Next.js App Router Docs](https://nextjs.org/docs/app/building-your-application/rendering) | Verified: 2026-03-20

### Confidence

**Level**: HIGH
**Reasoning**: Primary sources from official React documentation, cross-verified with Next.js implementation docs.

### Conflicts

None detected.
```

---

### Example 2: Python Type Hinting Research

**Scenario:** User asks "How do I use Python's Self type introduced in 3.11?"

```
**Step 1: EXTRACT**
- Primary source: PEP 673 - Self Type
- Extract: Usage in methods, return types, class methods

**Step 2: VERIFY**
- Source 2: Python 3.11 whatsnew documentation
- Source 3: Real Python tutorial on 3.11 features
- Cross-verify: Syntax, use cases, compatibility
```

**Output:**
```markdown
## Python Self Type (PEP 673)

### Extracted Information

**Self** is an explicit type annotation for methods returning the same class type.

```python
from typing import Self

class Builder:
    def set_name(self, name: str) -> Self:
        self.name = name
        return self
```

**Usage:**
- annotate return types of chainable methods
- works with classmethods (receives cls instead of self)
- available in Python 3.11+

### Sources

- [PEP 673 - Self Type](https://peps.python.org/pep-0673/) | Verified: 2026-03-23
- [Python 3.11 Whats New](https://docs.python.org/3.11/whatsnew/3.11.html) | Verified: 2026-03-23
- [Real Python - Python 3.11](https://realpython.com/python311-new-features/) | Verified: 2026-03-23

### Confidence

**Level**: HIGH
**Reasoning**: Direct quotes from PEP 673 and official Python 3.11 documentation, verified today.

### Conflicts

None detected.
```
