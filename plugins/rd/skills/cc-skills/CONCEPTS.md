# Agent Skills - Core Concepts

Understanding the fundamental concepts behind Agent Skills helps you build more effective skills.

## What is Context Engineering?

> "Context engineering refers to the set of strategies for curating and maintaining the optimal set of tokens during LLM inference." — Anthropic Engineering, 2025

While prompt engineering focuses on writing effective instructions, **context engineering** is the broader discipline of managing all information that enters the model's attention budget—including system prompts, tools, message history, and external data.

### Why Context Engineering Matters

LLMs have a finite "attention budget." As more tokens are added:

- **Context rot**: The model's ability to recall information decreases
- **Attention scarcity**: More tokens means less attention per token
- **Diminishing returns**: Each additional token provides less value

**The goal**: Find the smallest set of high-signal tokens that maximize the likelihood of desired outcomes.

## Progressive Disclosure

Progressive disclosure is the core design principle that makes Agent Skills scalable.

### Three-Level Architecture

```
Level 1: Metadata (Always Loaded)
├── name: skill-name
└── description: What it does + when to use it
    (~100 tokens - enables discovery)

Level 2: Instructions (Loaded When Triggered)
└── SKILL.md body
    (~5k tokens - procedural knowledge)

Level 3: Resources (Loaded As Needed)
├── REFERENCE.md
├── EXAMPLES.md
├── scripts/
└── templates/
    (unbounded - retrieved on demand)
```

### Why This Works

This pattern mirrors human cognition:

- We don't memorize entire manuals
- We use tables of contents to find relevant sections
- We look up details when needed
- We maintain mental "indexes" to information

Similarly, Claude uses skill metadata to discover when a skill is relevant, loads the main instructions when triggered, and explores additional files only when specific questions arise.

## Just-in-Time Retrieval vs. Naive Loading

### Naive Loading (Old Pattern)

```python
# Load everything upfront
context = read_all_files()  # 50k tokens
process(context)  # Model overwhelmed
```

**Problems:**
- Wastes attention budget on irrelevant information
- Doesn't scale beyond ~100k tokens
- Forces context window limits

### Just-in-Time Retrieval (2025 Pattern)

```python
# Load identifiers, retrieve full content on demand
identifiers = list_files()  # 500 tokens
# Later, when needed:
content = read_file(identifiers[0])  # Targeted retrieval
```

**Benefits:**
- Token-efficient exploration
- Scales to arbitrarily large contexts
- Mirrors human navigation patterns

### Hybrid Approach (Recommended)

```python
# Load critical context upfront
critical = load_core_knowledge()  # 5k tokens

# Use JIT for the rest
identifiers = list_additional_files()
# Explore as needed based on task
```

Claude Code uses this hybrid: CLAUDE.md files load immediately, while glob/grep enable file discovery on demand.

## The Diátaxis Framework

Diátaxis is a systematic approach to technical documentation based on **user needs**.

### Four Quadrants

```
                    Study-oriented                Application-oriented
                 ┌─────────────────────────────────────────────────┐
                 │                                                  │
Practical        │   How-to Guides          Tutorials              │
                 │   (goal-oriented)        (learning-oriented)    │
                 │   BEST_PRACTICES.md      GETTING_STARTED.md    │
                 │   EXAMPLES.md            (step-by-step)          │
                 │                                                  │
Theoretical      │   Reference               Explanation            │
                 │   (information-oriented)  (understanding-oriented)│
                 │   REFERENCE.md           CONCEPTS.md             │
                 │   (technical specs)      (this file)             │
                 └─────────────────────────────────────────────────┘
```

### Why Diátaxis Matters

**Before Diátaxis:**
- Documentation mixed different purposes
- Users couldn't find what they needed
- Authors didn't know what to write where

**After Diátaxis:**
- Each content type has a clear purpose and audience
- Users find information based on their intent
- Authors have clear guidance on structure

### Applied to Agent Skills

| Content Type | Purpose | Example |
|--------------|---------|---------|
| **Tutorials** | Learning by doing | "Create your first skill in 10 minutes" |
| **How-to guides** | Achieving specific goals | "Add error handling to skill scripts" |
| **Reference** | Looking up details | "SKILL.md frontmatter specification" |
| **Explanation** | Understanding why | "Why progressive disclosure matters" |

## Token Efficiency Patterns

### 1. Canonical Examples

Instead of enumerating every edge case:

```markdown
❌ Bad: Lists 20 edge cases
1. When X happens, do Y
2. When A happens, do B
... (18 more)

✓ Good: Representative examples
Key patterns:
- Pattern A: [example]
- Pattern B: [example]
- Pattern C: [example]

Claude will generalize from these.
```

### 2. External State Files

For long-running tasks:

```bash
# Instead of keeping everything in context
echo "# Progress" > NOTES.md
echo "- [x] Step 1 complete" >> NOTES.md
echo "- [ ] Step 2 in progress" >> NOTES.md

# Later, resume from notes
cat NOTES.md
```

This provides persistent memory without bloating context.

### 3. Code Over Prose

```markdown
❌ Bad: Verbose description
To read a file, you should use the Read tool. The Read tool
takes a file_path parameter which specifies the location...

✓ Good: Direct reference
Use: Read tool with file_path parameter
See REFERENCE.md for complete API documentation
```

## Evaluation-First Development

> "Start with evaluation: Identify specific gaps in your agents' capabilities by running them on representative tasks." — Anthropic, 2025

### Traditional Approach (Inefficient)

1. Write comprehensive documentation
2. Test if it works
3. Revise what doesn't work

**Problem**: You write content Claude already knows, miss what it actually needs.

### Evaluation-First Approach (2025)

1. Run test scenarios without skill
2. Document where Claude struggles
3. Write ONLY what addresses those gaps
4. Iterate based on observed behavior

**Benefit**: Every token of content serves a verified purpose.

### Example Workflow

```
Scenario: Code review for SQL injection

Baseline (without skill):
✓ Finds 2/5 injection patterns
✗ Misses: ORM raw() calls, string concatenation, JSON queries

Write skill content:
"Common SQL injection patterns Claude misses:
1. ORM raw() methods with user input
2. String concatenation in queries
3. JSON-based SQL constructs"

Retest:
✓ Finds 5/5 injection patterns
✓ Content is minimal and targeted
```

## MCP Integration Patterns

Model Context Protocol (MCP) provides standardized tool access. Skills can orchestrate MCP servers.

### When to Use MCP

| Scenario | Use MCP? | Rationale |
|----------|----------|-----------|
| Query large database | ✓ | Token-efficient data retrieval |
| Call external API | ✓ | Skills have no network access |
| Process images | ✓ | Specialized tools are faster |
| Simple file read | ✗ | Built-in tools sufficient |
| String manipulation | ✗ | Claude handles this natively |

### Pattern: Skill as MCP Client

```markdown
## Workflow

1. Query external data via MCP:
   ```bash
   mcp-query postgres --sql "SELECT * FROM users LIMIT 1000"
   ```

2. Process results with built-in tools:
   - Filter/transform with Bash
   - Analyze patterns with Claude

3. Store findings externally:
   ```bash
   echo "Key findings: ..." > NOTES.md
   ```

4. Retrieve summary when needed:
   ```bash
   cat NOTES.md
   ```
```

### Separation of Concerns

- **Skills**: Workflow orchestration, domain knowledge
- **MCP Servers**: External tool access, data sources

This keeps skills focused on "what to do" while MCP handles "how to do it" externally.

## Long-Horizon Task Patterns

Tasks spanning multiple context windows require special techniques.

### Context Window Problem

```
Task: Large codebase migration (10,000 files)
Context limit: 200k tokens (~150 files)
Problem: Can't fit everything in context at once
```

### Pattern 1: Structured Note-Taking

```bash
# Create persistent progress tracking
echo "# Migration Progress" > MIGRATION_NOTES.md

# Update after each module
echo "- [x] Auth module: migrated to new framework" >> MIGRATION_NOTES.md
echo "- [ ] Database layer: pending" >> MIGRATION_NOTES.md
echo "- [ ] API routes: pending" >> MIGRATION_NOTES.md

# After context reset, resume
cat MIGRATION_NOTES.md
# Claude reads and continues from where it left off
```

### Pattern 2: Compaction Points

When approaching context limit:

1. **Summarize** key decisions, unresolved issues, next steps
2. **Preserve** recent context (last 5 files, current state)
3. **Clear** old tool outputs (already processed)

This maintains continuity while freeing space for continued work.

### Pattern 3: Sub-Agent Coordination

```
Main Agent (Orchestrator)
├── Plans overall migration
├── Delegates module-specific work to sub-agents
└── Synthesizes results

Sub-Agents (Specialists)
├── Each handles specific module
├── Returns summary (not full context)
└── Enables parallel work
```

Each sub-agent does deep work in isolation, returns only distilled findings to the main agent.

## Summary: Key Mental Models

| Concept | Mental Model | Key Insight |
|---------|--------------|-------------|
| **Progressive Disclosure** | Table of contents → Chapter → Appendix | Load only what's needed when it's needed |
| **Context Engineering** | Attention budget optimization | Every token must earn its place |
| **Diátaxis** | User intent quadrants | Organize by purpose, not convenience |
| **JIT Retrieval** | File system navigation | Use identifiers, retrieve full content on demand |
| **Evaluation-First** | Scientific method | Test before you build |
| **MCP Integration** | Orchestrator pattern | Skills coordinate, MCP executes |
| **Long-Horizon Tasks** | Note-taking + checkpoints | External state persists across context resets |

These concepts form the foundation for building effective, scalable Agent Skills in 2025.

---

**See also:**
- GETTING_STARTED.md for hands-on tutorials
- BEST_PRACTICES.md for actionable guidelines
- EVALUATION.md for testing frameworks
- REFERENCE.md for technical specifications
