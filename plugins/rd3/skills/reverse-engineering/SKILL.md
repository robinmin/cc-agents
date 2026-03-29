---
name: reverse-engineering
description: "Codebase reverse-engineering, High-Level Design (HLD) generation, and critical issue audit. Use when analyzing unfamiliar codebases, generating architecture documentation, auditing code quality, onboarding new developers, or assessing technical debt. Triggers on: analyze codebase, explain architecture, generate HLD, audit code quality, technical debt assessment, reverse engineer."
license: Apache-2.0
version: 1.0.0
created_at: 2026-03-28
updated_at: 2026-03-29
tags: [analysis-core, reverse-engineering, hld, audit, codebase-analysis]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,openclaw,opencode,antigravity,pi"
  category: analysis-core
  interactions:
    - pipeline
    - reviewer
  severity_levels:
    - critical
    - high
    - medium
  pipeline_steps:
    - reconnaissance
    - component-mapping
    - quality-audit
    - synthesis
  openclaw:
    emoji: "🔍"
see_also:
  - rd3:quick-grep
  - rd3:knowledge-extraction
  - rd3:anti-hallucination
---

# rd3:reverse-engineering — Codebase Reverse Engineering

System archeology: analyze undocumented codebases to extract architectural intent, generate High-Level Design documents, and produce prioritized critical issue audits.

## When to Use

**Use PROACTIVELY when:**
- User shares an unfamiliar codebase or repo URL
- User asks "explain this architecture", "how does this work", or "what does this codebase do"
- User requests HLD generation, architecture docs, or system design documents
- User needs a code quality audit, technical debt assessment, or security review
- New team member onboarding — generate docs for knowledge transfer
- Pre-refactoring analysis — understand current state before changing

**Do NOT use for:**
- Implementing code changes (use `rd3:code-implement-common`)
- Debugging specific bugs (use `rd3:sys-debugging`)
- Writing tests (use `rd3:tdd-workflow`)
- Quick file lookups (use `rd3:quick-grep`)

## Quick Start

```
# Analyze the current project
"Analyze this codebase and generate an HLD"

# Focus on specific concerns
"Audit this project for security issues"

# Target a subdirectory
"Generate architecture docs for the payments module"
```

## Overview

**What it does:** Produces two deliverables from any codebase:
1. **High-Level Design (HLD)** document for system understanding
2. **Critical Audit Report** with prioritized issues and file evidence

## Workflows

### Analysis Workflow

Execute these phases sequentially. Each phase builds on the previous.

### Phase 1: Reconnaissance

1. **Scan** project structure via dependency files (`package.json`, `go.mod`, `requirements.txt`, `Cargo.toml`, `bun.lockb`)
2. **Identify** infrastructure files (Dockerfile, docker-compose, K8s manifests, CI configs)
3. **Classify** architecture type:
   - Monolith / Microservices / Serverless
   - Frontend SPA / Backend API / Fullstack
   - CLI Tool / Library / Framework
4. **Locate** entry points and core business logic

### Phase 2: Component Mapping

1. **Trace** request lifecycle: Entry -> Router -> Business Logic -> Data Layer
2. **Group** files into logical domains (Auth, Payments, Users, etc.)
3. **Map** external dependencies and integrations
4. **Identify** data models and storage patterns

### Phase 3: Quality Audit

Evaluate each category and cite specific evidence:

| Category | What to Find | Evidence Required |
|----------|-------------|-------------------|
| **Security** | Hardcoded secrets, SQL injection, missing input validation, exposed endpoints | File path + line number |
| **Performance** | N+1 queries, missing indexes, blocking I/O, no caching | File path + code pattern |
| **Maintainability** | Files >500 lines, circular dependencies, dead code, deprecated APIs | File path + metrics |
| **Architecture** | Missing abstractions, tight coupling, unclear boundaries | File paths + explanation |

### Phase 4: Synthesis

1. **Prioritize** top 3-5 issues by severity
2. **Generate** appropriate diagrams based on application type
3. **Write** actionable recommendations

## Severity Definitions

| Severity | Criteria | Examples |
|----------|----------|----------|
| **Critical** | Security risk, data loss potential, blocking bugs | SQL injection, hardcoded credentials, race conditions |
| **High** | Performance degradation, maintainability debt | N+1 queries, 1000+ line files, deprecated libraries |
| **Medium** | Code style, minor improvements | Naming conventions, missing comments |

## Edge Cases

| Scenario | Handling |
|----------|----------|
| **Empty/minimal codebase** | Report as "Insufficient code for analysis" with recommendations |
| **Monorepo** | Ask user which project to analyze, or analyze each separately |
| **No clear entry point** | Identify by file naming conventions, exports, or ask user |
| **Binary-heavy repo** | Focus on configuration and scripting files |

## Output Rules

- **Evidence-based:** Every component and issue MUST cite `file/path:line_number`
- **Architectural focus:** Describe intent, not syntax
- **Valid Mermaid:** All diagrams must be syntactically correct
- **Actionable:** Every issue includes specific remediation steps

## Output Template

```markdown
# High-Level Design & Audit: [Project Name]

| Metadata | Details |
|----------|---------|
| **Analysis Date** | YYYY-MM-DD |
| **Tech Stack** | [Languages, Frameworks, Infrastructure] |
| **Type** | Backend / Frontend / Fullstack / CLI / Library |
| **Entry Point** | `path/to/entry` |

## 1. Executive Summary

[3-5 sentences: system purpose, current state, primary business value]

## 2. System Architecture

### 2.1 Architectural Pattern

[Pattern name and brief description]

### 2.2 System Context Diagram

[Mermaid graph showing actors, system, external dependencies]

## 3. Key Components

### 3.1 Core Modules

| Module | Responsibility | Location |
|--------|---------------|----------|
| [Name] | [What it does] | `path/to/module` |

### 3.2 Interface Overview

**For Backend:**

| Method | Endpoint | Description | File |
|--------|----------|-------------|------|
| GET | /api/resource | [Description] | `path:line` |

**For Frontend:**

| Page | Route | Description | File |
|------|-------|-------------|------|
| Home | / | [Description] | `path:line` |

## 4. Data Design

### 4.1 Entity Relationships

[Mermaid ER diagram]

### 4.2 Storage Strategy

| Type | Technology | Usage |
|------|-----------|-------|
| Primary DB | [Type] | [What it stores] |
| Cache | [Type] | [What it caches] |

## 5. Critical Business Flows

### 5.1 [Flow Name]

[Step-by-step walkthrough of most complex flow]

[Mermaid sequence diagram]

## 6. Cross-Cutting Concerns

| Concern | Implementation | Evidence |
|---------|---------------|----------|
| Authentication | [Method] | `path:line` |
| Logging | [Tool/Pattern] | `path:line` |
| Configuration | [How managed] | `path:line` |

## 7. Critical Issues & Recommendations

### 7.1 Security & Stability

| Severity | Issue | Location | Impact | Fix |
|----------|-------|----------|--------|-----|
| Critical | [Issue] | `file:line` | [Impact] | [Specific fix] |
| High | [Issue] | `file:line` | [Impact] | [Specific fix] |

### 7.2 Code Quality

- **[Issue Name]:** [Description]
  - _Evidence:_ `file/path:line`
  - _Fix:_ [Specific refactoring suggestion]

### 7.3 Modernization Roadmap

| Priority | Action | Effort | Impact |
|----------|--------|--------|--------|
| 1 | [Action] | [S/M/L] | [Benefit] |
```

## Additional Resources

- **Code search**: `rd3:quick-grep` — Strategic code search and rewrite
- **Knowledge extraction**: `rd3:knowledge-extraction` — Extract and synthesize knowledge from sources
- **Anti-hallucination**: `rd3:anti-hallucination` — Verification-first protocol for claims

## Platform Notes

### Claude Code
- Use forked context mode to run Phase 1 (Reconnaissance) and Phase 3 (Quality Audit) in parallel for large codebases
- Use `Glob` and `Grep` tools for project scanning; use `Read` for detailed file inspection
- Use `LSP` for symbol navigation and type verification when tracing request lifecycles

### Codex / OpenClaw / OpenCode / Antigravity
- Run file scanning via standard shell commands (`find`, `grep`, `cat`)
- Use `ast-grep` or equivalent for structural code pattern matching
