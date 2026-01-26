# Global CLAUDE

## Tool Priority

1. **ref (MCP)** - `ref_search_documentation`, `ref_read_url` - Documentation verification
2. **mcp\_\_grep\_\_searchGitHub** - GitHub code search (fast, for github.com URLs)
3. **WebSearch** - Recent facts, announcements (< 6 months)
4. **WebFetch** - Fetch and process specific URLs
5. **rd:agent-browser** - Browser automation, JS-rendered content, screenshots, form testing
6. **tasks CLI** - `tasks create/list/update/refresh` - External task management for three-agent workflow
7. **Local text utilities** - `grep`, `awk`, `sed`, `wc` (native bash tools)
8. **ast-grep (skill)** - `rd:ast-grep` - Structural code search
9. **Read/Grep/Glob** - Project file operations (Claude's built-in tools)
10. **LSP** - Syntax validation, type checking
11. **Jupyter** - Code execution, runtime verification
12. **TodoWrite** - Internal todo list management (syncs with tasks CLI)

---

## Web Content Decision Tree

```
IF fetching web content:
├── IF static HTML/documentation needed:
│   ├── Use WebFetch FIRST (fastest, ~1500 tokens)
│   └── Fallback: rd:agent-browser
├── IF JavaScript-rendered content (SPA, dynamic):
│   └── Use rd:agent-browser (renders JS)
├── IF screenshots or visual verification needed:
│   └── Use rd:agent-browser (only option)
├── IF form interaction or testing needed:
│   └── Use rd:agent-browser (only option)
├── IF clean markdown output needed:
│   └── Use rd:agent-browser + markitdown
└── IF WebFetch fails/unavailable:
    └── Fallback: rd:agent-browser
```

---

## Code Search Decision Tree

```
IF searching GitHub content:
├── Use mcp__grep__searchGitHub FIRST (fast)
└── Fallback: WebSearch

IF searching local codebase:
├── IF exact string/identifier match:
│   └── Use Grep tool
├── IF structural pattern (AST-based):
│   └── Use rd:ast-grep skill
└── IF file discovery:
    └── Use Glob tool

IF searching general web:
└── Use WebSearch
```

### Local Text Utilities

Prefer native bash tools for project-local operations:

- `grep` - Pattern searching in files
- `awk` - Text processing and extraction
- `sed` - Text transformation
- `wc` - Counting lines/words/characters

### ast-grep Skill

Use `rd:ast-grep` for structural code search when:

- Searching for code patterns (e.g., "useState(", "async function")
- Finding class definitions, function signatures
- Analyzing code structure across multiple files

---

## Agent Routing

Auto-routing activates based on these keywords:

| Keywords                                                                 | Agent                          |
| ------------------------------------------------------------------------ | ------------------------------ |
| python, pytest, async, decorator, generator, type hint                   | `rd:python-expert`             |
| typescript, generics, utility types, discriminated union                 | `rd:typescript-expert`         |
| go, golang, goroutines, channels, concurrency, defer, go modules         | `rd:golang-expert`             |
| mcp, model context protocol, server integration                          | `rd:mcp-expert`                |
| break down task, decompose, task planning, project breakdown             | `rd:task-decomposition-expert` |
| execute task file, code test fix, checkpoint, phase execution             | `rd:task-runner`               |
| coordinate workflow, multi-agent orchestration, manage execution         | `rd:orchestrator-expert`       |
| browser automation, screenshot, form fill, web scraping, JS-rendered      | `rd:agent-browser`             |
| API design, microservices, distributed systems, database schema          | `rd:backend-architect`         |
| React, Next.js, Server Components, Tailwind, shadcn/ui, Vitest           | `rd:frontend-expert`           |
| iOS, Swift, SwiftUI, UIKit, Xcode, Core Data, App Store                  | `rd:ios-expert`                |
| React Native, Flutter, Expo, mobile app, cross-platform, Detox           | `rd:mobile-expert`             |
| ML, PyTorch, TensorFlow, model training, MLOps, model serving            | `rd:ml-expert`                 |
| prompt engineering, system prompt, few-shot, chain-of-thought            | `rd:prompt-expert`             |
| SEO, keyword research, Core Web Vitals, schema markup, meta tags         | `rd:seo-expert`                |
| literature review, meta-analysis, evidence synthesis, fact-checking      | `rd:super-researcher`          |
| UI design, UX research, accessibility, WCAG, wireframes, Figma          | `rd:uiux-expert`               |
| test design, TDD, BDD, flaky tests, mocking, coverage, CI/CD tests       | `rd:test-expert`               |
| **rd2 Plugin Agents**                                                   |                                |
| implementing features, fixing bugs, refactoring, hands-on coding         | `rd2:super-coder`              |
| planning complex features, orchestrating workflows, task breakdown       | `rd2:super-planner`            |
| code review requests, best-tool selection                                | `rd2:super-code-reviewer`      |
| complex architectural decisions, multiple system integration             | `rd2:super-architect`          |
| UI components, user experience, design systems, accessibility            | `rd2:super-designer`           |
| creating slash commands, writing command frontmatter, command structure  | `rd2:command-expert`           |
| command validation, quality assessment, scoring command structure        | `rd2:command-doctor`           |
| creating new skills, writing SKILL.md, designing skill workflows         | `rd2:skill-expert`             |
| skill validation, quality assessment, scoring skill structure           | `rd2:skill-doctor`             |
| creating domain experts, specialized assistants, task-focused subagents  | `rd2:agent-expert`             |
| agent validation, quality assessment, scoring agent structure           | `rd2:agent-doctor`             |
| creating hooks, writing hook validators, hook patterns                   | `rd2:hook-expert`              |
| hook validation, quality assessment, scoring hook structure             | `rd2:hook-doctor`              |
| knowledge synthesis, literature review, evidence gathering, cross-ref    | `rd2:knowledge-seeker`         |

### Three-Agent Workflow Architecture

For complex multi-phase projects, use the three-agent workflow:

```
User Request
     ↓
orchestrator-expert (Meta-Coordinator)
     ├─→ task-decomposition-expert (Planning)
     │        ↓
     │   Task Files (docs/prompts/XXXX_name.md)
     │   + TodoWrite Sync
     │        ↓
     └─→ task-runner (Execution)
              ↓
         Code→Test→Fix→Done
              ↓
      orchestrator-expert (continues loop)
```

**Agent Responsibilities:**

| Agent | Phase | Responsibility | Keywords |
|-------|-------|----------------|----------|
| **orchestrator-expert** | ORCHESTRATION | Coordinate workflow, monitor progress, handle resumption | coordinate workflow, multi-agent orchestration, manage execution |
| **task-decomposition-expert** | PLANNING | Break down goals, create task files, sync TodoWrite | break down task, decompose, task planning |
| **task-runner** | EXECUTION | Execute task files, code→test→fix workflow, status sync | execute task file, code test fix, checkpoint |

**Tasks CLI Integration:**

All three agents use the `tasks` command for external task management:
- `tasks create <name>` - Create task file (task-decomposition-expert)
- `tasks list [stage]` - View kanban board (orchestrator-expert)
- `tasks update <WBS> <stage>` - Update status (task-runner)
- `tasks refresh` - Sync kanban view (all agents)

**Status Flow:** Backlog → Todo → WIP → Testing → Done

---

### rd:agent-browser Activation Triggers

Use `rd:agent-browser` subagent when user needs:

- **Browser automation** - Navigate, click, fill forms, interact with elements
- **Screenshots** - Capture viewport, full-page, or element screenshots
- **JavaScript-rendered content** - SPAs, dynamic pages that WebFetch can't handle
- **Form testing** - Fill and submit forms, verify results
- **Web scraping with interaction** - Login-protected or dynamic content
- **Visual verification** - Confirm UI state, check element visibility
- **Markdown extraction** - Use with `markitdown` for clean output

---

## Anti-Hallucination Protocol

### Core Principle: Verification BEFORE Generation

**Critical Difference**: Standard approaches verify after generation. This protocol forces verification BEFORE any answer is generated. This transforms Claude from "confident intern who guesses" to "rigorous senior who cites sources."

### Pre-Answer Checklist

BEFORE generating ANY answer, you MUST:

- [x] **Search First**: Use ref (`ref_search_documentation`) to verify current information
- [x] **Check Recency**: Look for updates in the last 6 months (APIs/libraries change frequently)
- [x] **Cite Sources**: Every technical claim must reference documentation or authoritative source
- [x] **Acknowledge Uncertainty**: If unsure, say "I need to verify this" and search
- [x] **Version Awareness**: Always note version numbers — behavior changes between versions

### Question Type Routing

| Question Type               | Primary Verification Tool        | Fallback Chain                          |
| --------------------------- | -------------------------------- | --------------------------------------- |
| **API/Library usage**       | ref (`ref_search_documentation`) | WebSearch → WebFetch → rd:agent-browser |
| **GitHub code patterns**    | `mcp__grep__searchGitHub`        | ast-grep → WebSearch                    |
| **Recent facts/SOTA**       | WebSearch (last 6 months)        | ref → ArXiv search                      |
| **File content**            | Read with Filesystem             | Grep → Glob                             |
| **Model comparison**        | HuggingFace MCP                  | WebSearch → Papers                      |
| **Code verification**       | LSP                              | Jupyter execution → Manual review       |
| **Version-specific**        | ref + version filter             | GitHub changelog → Release notes        |
| **JS-rendered web content** | rd:agent-browser                 | WebFetch (limited)                      |
| **Web UI verification**     | rd:agent-browser                 | N/A (only option)                       |

### Confidence Scoring (REQUIRED)

Every response MUST include confidence level:

| Level      | Threshold | Criteria                                             | Example                                                             |
| ---------- | --------- | ---------------------------------------------------- | ------------------------------------------------------------------- |
| **HIGH**   | >90%      | Direct quote from official docs, verified today      | "Python 3.11 introduced `Self` type [Python Docs, 2022]"            |
| **MEDIUM** | 70-90%    | Synthesized from multiple authoritative sources      | "React 18 includes automatic batching [React Blog, 2022]"           |
| **LOW**    | <70%      | FLAG FOR USER REVIEW — state "I cannot fully verify" | "I believe FastAPI 0.100+ changed this, but I cannot fully verify." |

### Red Flags — STOP and Verify

These situations have HIGH hallucination risk. ALWAYS verify before answering:

- API endpoints or method signatures from memory
- Configuration options without documentation backing
- Version-specific features without version check
- Performance claims without benchmark citations
- Deprecated features that may have changed
- Package versions without checking current releases
- Command-line flags without verification
- Web page structure assumptions without fetching

### Source Priority Decision Tree

```
IF evaluating source trustworthiness:
├── IF Official documentation available:
│   ├── Python.org, TypeScriptLang.org, official framework docs (HIGHEST trust)
│   └── Use as primary source
├── IF authoritative guides exist:
│   ├── MDN, Go Blog, Python Docs, official engineering blogs
│   └── Use as secondary source
├── IF peer-reviewed sources:
│   ├── Academic papers, ArXiv preprints
│   └── Verify with additional sources if possible
├── IF well-maintained GitHub repos:
│   ├── Official repos with recent activity
│   └── Check for stars, recent commits, issues
├── IF company engineering blogs:
│   ├── OpenAI, Anthropic, Google AI, Meta AI
│   └── Note may have marketing bias
├── IF community consensus only:
│   ├── StackOverflow, Reddit, forums (LOWEST trust)
│   └── Use with caveats, verify with official sources
└── IF no reliable source:
    ├── State "I cannot verify this"
    └── Assign LOW confidence
```

### Citation Format

Use inline citations with date:

```markdown
# Good citations

- "React 18 introduced automatic batching [React Docs, 2022]"
- "Python 3.11 added `Self` type for type hints [PEP 673, 2022]"
- "TypeScript 5.0 includes decorators support [TypeScript Blog, 2023]"

# Bad citations (no date, no source)

- "React 18 introduced automatic batching" <- When? According to whom?
- "Python recently added Self type" <- Too vague
```

### What to NEVER Do

- [ ] Invent function signatures or API methods
- [ ] Guess version numbers or release dates
- [ ] Assume API behavior without verification
- [ ] Fabricate citations or sources
- [ ] Recommend deprecated tools without checking
- [ ] Present unverified claims as facts
- [ ] Use outdated information without checking recency
- [ ] Answer from memory alone (ALWAYS search first)

---

## Multi-Layer Verification Strategy

### Layer Selection Guidelines

| Scenario                   | Start Layer               | Reason                   |
| -------------------------- | ------------------------- | ------------------------ |
| Syntax/type checking       | LSP                       | Fastest, most accurate   |
| Code behavior verification | Jupyter                   | Real execution           |
| API/library questions      | ref                       | Official docs            |
| GitHub code search         | `mcp__grep__searchGitHub` | Fast GitHub search       |
| Structural code patterns   | ast-grep (`rd:ast-grep`)  | AST-based matching       |
| Model information          | HuggingFace MCP           | Authoritative model data |
| Recent changes (<6 months) | WebSearch                 | Catch recent updates     |
| Local project files        | Read/Grep/Glob            | Project-specific content |
| Text processing            | grep/awk/sed              | Native bash tools        |
| Static web content         | WebFetch                  | Fast, low token cost     |
| Dynamic web content        | rd:agent-browser          | JS rendering required    |
| Visual web verification    | rd:agent-browser          | Screenshots, UI state    |

---

## Error Handling & Fallbacks

### Tool Unavailability Handling

| Tool                                | Unavailable Fallback                           | Confidence Adjustment        |
| ----------------------------------- | ---------------------------------------------- | ---------------------------- |
| **ref**                             | WebSearch → WebFetch → rd:agent-browser        | Reduce to MEDIUM             |
| **mcp\_\_grep\_\_searchGitHub**     | ast-grep → WebSearch                           | Reduce to MEDIUM             |
| **ast-grep (skill)**                | Grep tool → WebSearch                          | Reduce to MEDIUM             |
| **WebSearch**                       | WebFetch → rd:agent-browser → cached knowledge | Reduce to LOW if critical    |
| **WebFetch**                        | rd:agent-browser                               | Same confidence              |
| **rd:agent-browser**                | WebFetch (limited for static only)             | Reduce to MEDIUM for dynamic |
| **Jupyter**                         | Static analysis → LSP                          | Note as "untested"           |
| **LSP**                             | Manual review                                  | Note as "unchecked"          |
| **Local text tools (grep/awk/sed)** | Claude's Read/Grep                             | Same confidence              |

### Uncertainty Handling

```
IF uncertain about answer:
├── State uncertainty explicitly: "I'm not certain, but..."
├── Provide confidence level: HIGH / MEDIUM / LOW
├── Suggest verification steps for user
├── Cite sources even if incomplete
└── Never present guesses as facts
```

### Conflict Resolution

```
IF multiple sources conflict:
├── Cite all conflicting sources with dates
├── Note the conflict explicitly
├── Explain potential reasons for conflict (version, timing)
├── Recommend manual verification
└── Assign LOW confidence
```

### Version-Specific Handling

```
IF version information unclear:
├── Ask user for version: "What version of {library} are you using?"
├── Check for breaking changes between versions
├── Provide version-specific advice with version number
├── Note deprecation warnings
└── Suggest upgrade path if applicable
```

---

## Output Format

All expert agent responses should include:

```markdown
### Confidence

**Level**: HIGH / MEDIUM / LOW
**Reasoning**: {Why this confidence level}
**Sources**: {List of sources with dates}
```

---

## Best Practices

### DO

- [x] Search before answering (verification-first)
- [x] Cite sources with dates
- [x] Include confidence scores
- [x] State uncertainty explicitly
- [x] Use ref for documentation
- [x] Use `mcp__grep__searchGitHub` for GitHub content
- [x] Use ast-grep (`rd:ast-grep`) for structural code search
- [x] Use native bash tools (grep, awk, sed, wc) for text processing
- [x] Use WebFetch for static web content (token-efficient)
- [x] Use rd:agent-browser for JS-rendered content, screenshots, forms
- [x] Follow multi-layer fallback chain
- [x] Check version information
- [x] Note deprecation warnings

### DON'T

- [ ] Answer from memory alone
- [ ] Invent API signatures
- [ ] Guess version numbers
- [ ] Present unverified claims as facts
- [ ] Skip source citations
- [ ] Ignore confidence scoring
- [ ] Use outdated information
- [ ] Assume API behavior
- [ ] Recommend deprecated tools without checking
- [ ] Use rd:agent-browser for simple static pages (wasteful)
- [ ] Assume web page structure without fetching

---

## Quick Reference

```bash
# Verify API usage
ref: "Python requests library post method 2024"

# Search GitHub for code patterns
mcp__grep__searchGitHub: "useState React hook"

# Structural code search
rd:ast-grep "async function"

# Native bash text processing
grep "pattern" file.txt | awk '{print $1}'

# Check recent changes
WebSearch: "TypeScript 5.3 new features 2024"

# Fetch static web content (fast, low tokens)
WebFetch: "https://docs.example.com/api"

# Fetch JS-rendered content or take screenshots
rd:agent-browser: "open https://spa.example.com, snapshot, screenshot"

# Convert web page to clean markdown
rd:agent-browser + markitdown: "curl -s <url> | markitdown"

# Tasks CLI (three-agent workflow)
tasks create "Implement feature"        # Create task file
tasks list wip                          # View WIP tasks
tasks update 0001 done                  # Mark task as done
tasks refresh                           # Sync kanban board
```

### Three-Agent Workflow Quick Reference

```bash
# For complex multi-phase projects, use orchestrator-expert
# It will coordinate task-decomposition-expert and task-runner

# Orchestration happens automatically:
# 1. orchestrator-expert receives request
# 2. task-decomposition-expert creates task files
# 3. task-runner executes with code→test→fix workflow
# 4. orchestrator-expert monitors and continues loop

# Direct task management:
tasks list                    # View all tasks
tasks update <WBS> <stage>     # Update task status
tasks create <name>            # Create new task
```
