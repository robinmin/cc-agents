---
name: add new agent skill quick-grep
description: { { DESCRIPTION } }
status: Done
created_at: 2026-03-21 16:29:04
updated_at: 2026-03-21 19:48:46
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
---

## 0250. add new agent skill quick-grep

### Background
As I always see Claude Code searching, linting and rewriting the code in a very clumsy way. We'd better to use existing tool sets with strategy to accelerate the process. Majorly, I want to leverage ast-grep(sg) and ripgrep(rg) to do so.

**`ast-grep`** and **`ripgrep`** are both powerful, high-performance code search tools written in Rust, but they serve fundamentally different purposes: `ripgrep` is a fast **text-based search** utility, while `ast-grep` is a **structural search** and rewrite tool that understands code syntax.

#### Key Differences

| Feature | `ripgrep` (rg) | `ast-grep` (sg) |
| :-------------------- | :----------------------------------------------------------- | :----------------------------------------------------------- |
| **Search Basis**      | Plain text and regular expressions.                          | Code structure (Abstract Syntax Tree, or AST) via the [tree-sitter](https://tree-sitter.github.io/) library. |
| **Use Cases**         | Finding strings, variable names, `TODO` comments, or configuration values in files. | Refactoring code, enforcing style rules, performing complex code migrations, and locating specific code patterns (e.g., "all async functions without error handling"). |
| **Precision**         | Can produce false positives when a text string appears in different contexts (e.g., as a variable name and in a comment). | High precision; avoids false positives by matching only the intended code structure. |
| **Code Modification** | Requires external tools like `sed` or `awk` for risky, ad-hoc text replacement. | Natively supports safe, first-class code rewriting and refactoring capabilities. |
| **Speed**             | Extremely fast for raw text searching, often faster than traditional `grep` due to parallelism and smart defaults. | Fast for structural search, but the overhead of parsing code makes it generally slower than `ripgrep` for simple text searches. |

#### When to use which tool:

- **Use `ripgrep` when text is enough** and you need the fastest possible way to search for literal strings or regex patterns across files. It's ideal for quick reconnaissance and finding non-code assets.
- **Use `ast-grep` when structure matters** and you need to match specific syntax, ignore comments/strings, or safely rewrite code. It is useful for tasks that are difficult or impossible with text-based tools, such as distinguishing a variable name from the same string used as a prop or in a comment. !

Not only these tools, we also can use some traditional tools as their fallback, for example wc, awk, sed, grep and etc.



Here I also collected a lots of relevant things for reference:

- [llms.txt for ast-grep](https://ast-grep.github.io/llms.txt)
- [llms-full.txt for ast-grep](https://ast-grep.github.io/llms-full.txt)
- [ripgrep GUIDE](https://github.com/BurntSushi/ripgrep/blob/master/GUIDE.md)
- [ripgrep FAQ](https://github.com/BurntSushi/ripgrep/blob/master/FAQ.md)
- [Source code of sample agent skill](vendors/agent-skill/ast-grep/skills/ast-grep)

### Requirements
- Use subagent @"rd3:expert-skill (agent)" to create a tool-wrapper agent skill as the begining.
- Compose all materials into the new agent skill
- Create a decision tree as the tool selection policy to see which proper tool we can leverage can how we can deal with the issue.
- etc.

### Q&A

### Design

#### Tool Selection Decision Tree

```
Given a search/edit query:
┌─────────────────────────────────────────────────────────────────┐
│ 1. Is the query asking for code STRUCTURE (AST-based patterns)?  │
│    e.g., "find all async functions without try-catch"           │
│    e.g., "find method calls with 3 arguments"                   │
│    e.g., "find classes inheriting from BaseModel"               │
│    YES → Use ast-grep (sg)                                      │
│    NO  → Continue                                                │
├─────────────────────────────────────────────────────────────────┤
│ 2. Is the query asking for LITERAL STRING or REGEX match?       │
│    e.g., "find all occurrences of 'TODO'"                       │
│    e.g., "find variable names matching 'user.*'"                │
│    YES → Use ripgrep (rg)                                       │
│    NO  → Continue                                                │
├─────────────────────────────────────────────────────────────────┤
│ 3. Is the target file NON-CODE (JSON/YAML/MD/TOML)?             │
│    e.g., "find 'debug' in config files"                         │
│    YES → Use ripgrep (rg)                                       │
│    NO  → Continue                                                │
├─────────────────────────────────────────────────────────────────┤
│ 4. Is this a QUICK RECONNAISSANCE scan?                         │
│    e.g., "what files mention feature X"                         │
│    YES → Use ripgrep (rg) [fastest for broad scans]             │
│    NO  → Continue                                                │
├─────────────────────────────────────────────────────────────────┤
│ 5. Tool unavailable? Check: which rg && which sg                │
│    - rg missing  → fallback to native grep                      │
│    - sg missing  → fallback to rg with regex approximation      │
│    - both missing → native tools (grep/awk/sed/wc)            │
└─────────────────────────────────────────────────────────────────┘
```

#### Heuristic Signal Keywords

| Signal | Tool | Examples |
|--------|------|----------|
| **Structure keywords** | `sg` | "function", "class", "method", "async", "await", "try-catch", "import from", "inherit", "constructor", "interface", "type alias" |
| **Context keywords** | `sg` | "inside class", "before return", "after import", "nested in", "contains" |
| **Text keywords** | `rg` | "string", "comment", "TODO", "FIXME", "config", "variable name", "file containing" |
| **Quick scan** | `rg` | "grep for", "find all", "search", "list all", "count occurrences" |
| **Edit/rewrite** | `sg` | "replace", "refactor", "rename", "change to", "wrap with" |

#### Input Interface

**Natural Language (primary):**
```
"find all async functions without error handling"
"search for console.log calls in production code"
"find classes that inherit from BaseModel"
```

**Structured Input (optional):**
```typescript
interface SearchQuery {
  tool?: "rg" | "sg";           // Force tool selection
  pattern: string;              // The search pattern
  flags?: string[];            // Tool-specific flags
  files?: string[];             // Target files/directories
  language?: string;           // For sg: language hint (e.g., "javascript")
  edit?: RewriteRule;          // For sg: rewrite rule
}

interface RewriteRule {
  capture: string;             // Metavariable to replace
  replacement: string;         // New code
}
```

#### Tool Availability Check (on startup)

```bash
# Check which tools are available
TOOL_RG=$(which rg 2>/dev/null) || TOOL_RG=""
TOOL_SG=$(which sg 2>/dev/null) || TOOL_SG=""

# Set capability flags
CAP_RG=${TOOL_RG:+true}
CAP_SG=${TOOL_SG:+true}
CAP_NATIVE_GREP=${TOOL_RG:-true}  # Always have native grep fallback
```

### Solution

#### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    quick-grep Skill                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                         SKILL.md                       │ │
│  │  (Decision tree + guidance + rule references)          │ │
│  └───────────────────────────────────────────────────────┘ │
│                          │                                  │
│                          ▼                                  │
│  ┌───────────────────────────────────────────────────────┐ │
│  │              references/rules/*.yml                     │ │
│  │  (Pre-built rules: console-log, todo-no-error, etc.)   │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**How it works**: The skill is pure guidance. Claude Code reads SKILL.md, applies the decision tree to pick the right tool (rg, sg, or native grep), and executes directly. No wrapper script.

#### Tool Selection (Decision Tree)

```
Given a search/edit query:
1. Is the query asking for code STRUCTURE (AST-based patterns)?
   YES → Use ast-grep (sg)
   NO  → Continue
2. Is the query asking for LITERAL STRING or REGEX match?
   YES → Use ripgrep (rg)
   NO  → Continue
3. Is the target file NON-CODE (JSON/YAML/MD/TOML)?
   YES → Use ripgrep (rg)
   NO  → Continue
4. Is this a QUICK RECONNAISSANCE scan?
   YES → Use ripgrep (rg)
   NO  → Default to ripgrep (rg)

Fallback: rg → native grep | sg → rg (regex approximation)
```

#### Tool Command Reference

**ripgrep (rg):**
```bash
rg [OPTIONS] PATTERN [FILES...]
# Key flags: -g (glob), -t (type), -l (files-with-matches), -n (line-number), -C (context)
```

**ast-grep (sg):**
```bash
sg run --pattern 'PATTERN' --lang LANG [DIR]    # Simple pattern search
sg scan --rule RULE.yml [DIR]                    # Rule-based search
sg run --pattern 'A' --rewrite 'B' --lang LANG   # Pattern-based rewrite
sg scan --rule RULE.yml --update-all             # Rule-based rewrite all
```

#### Rewrite/Rollback Guidance

When using ast-grep rewrite:
- Prefer interactive mode: `sg scan --rule fix.yml --interactive [DIR]`
- After rewrite, validate with: `sg run --pattern 'any' --lang LANG [files]`
- On parse failure: `git checkout HEAD -- [files]`

#### Pre-built Rules Library

Located at `plugins/rd3/skills/quick-grep/references/rules/`:

```
references/rules/
  console-log.yml       # Find console.log/console.error calls
  todo-no-error.yml     # Find TODO without error handling
  async-no-trycatch.yml # Find async functions without try-catch
  impure-pipe.yml       # Find promise chains without error handling
  hardcoded-secret.yml  # Find potential hardcoded secrets
```

Example rule:
```yaml
id: console-log
language: javascript
message: "Avoid console.log in production code"
rule:
  pattern: console.log($$$ARGS)
```

### Plan

#### Phase 1: Skill Structure Setup
- [ ] Create `plugins/rd3/skills/quick-grep/` directory
- [ ] Create `SKILL.md` with skill metadata and decision tree
- [ ] Create `references/rules/` directory for pre-built rules
- [ ] Create `examples/` directory for working examples

#### Phase 2: Pre-built Rules
- [ ] Create `references/rules/` directory
- [ ] Create 5 common rules (console-log, todo-no-error, async-no-trycatch, impure-pipe, hardcoded-secret)
- [ ] Document rule format in `references/rules-format.md`

#### Phase 3: Documentation & Examples
- [ ] Write `references/decision-tree.md` - Tool selection heuristics
- [ ] Write `references/rule-reference.md` - Rule format (adapted from ast-grep reference)
- [ ] Add usage examples to `examples/` directory

### Artifacts

| Type | Path | Generated By | Date |
| ---- | ---- | ------------ | ---- |
| Skill | `plugins/rd3/skills/quick-grep/SKILL.md` | rd3:expert-skill (evaluate) | 2026-03-21 |
| Reference | `plugins/rd3/skills/quick-grep/references/best_practices.md` | rd3:expert-skill | 2026-03-21 |
| Reference | `plugins/rd3/skills/quick-grep/references/decision-tree.md` | rd3:expert-skill | 2026-03-21 |
| Reference | `plugins/rd3/skills/quick-grep/references/rule_reference.md` | rd3:expert-skill | 2026-03-21 |
| Reference | `plugins/rd3/skills/quick-grep/references/rules-format.md` | rd3:expert-skill | 2026-03-21 |
| Rule | `plugins/rd3/skills/quick-grep/references/rules/console-log.yml` | rd3:expert-skill | 2026-03-21 |
| Rule | `plugins/rd3/skills/quick-grep/references/rules/todo-no-error.yml` | rd3:expert-skill | 2026-03-21 |
| Rule | `plugins/rd3/skills/quick-grep/references/rules/async-no-trycatch.yml` | rd3:expert-skill | 2026-03-21 |
| Rule | `plugins/rd3/skills/quick-grep/references/rules/impure-pipe.yml` | rd3:expert-skill | 2026-03-21 |
| Rule | `plugins/rd3/skills/quick-grep/references/rules/hardcoded-secret.yml` | rd3:expert-skill | 2026-03-21 |
| Example | `plugins/rd3/skills/quick-grep/examples/usage-examples.md` | rd3:expert-skill | 2026-03-21 |

### References

