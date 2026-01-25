---
name: code-review-common
agent: Plan
context: fork
user-invocable: false
description: |
  Unified code review coordinator with comprehensive two-level review process.
  Follows "fat skills, thin wrappers" pattern - delegates to code-review-* skills for actual review work.
  This skill provides the coordination logic, review criteria, and workflow integration.
  Trigger when user wants code review with auto-selection or specifies code-review.
---

# Code Review

Comprehensive code review coordination skill that implements the "fat" review logic behind the code-review agent and command wrappers.

**Critical**: This skill handles CODE REVIEW (implementation quality at Step 9-10), not SOLUTION REVIEW (architecture/design at Step 3 - handled by super-architect).

## Quick Start

```bash
# Validate review skills availability
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-common/scripts/code-review.py check

# Execute auto-selected review
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-common/scripts/code-review.py review src/auth/

# Execute review with specific tool
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-common/scripts/code-review.py review src/api/ --tool gemini

# Execute review with focus areas
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-common/scripts/code-review.py review src/ --focus security,performance
```

## Available Commands

| Command    | Purpose                          | Use Case                                  |
| ---------- | -------------------------------- | ----------------------------------------- |
| `check`    | Validate review skills availability | Run before any review operation          |
| `review`   | Execute code review with auto-selection | Full code analysis with tool delegation  |
| `analyze`  | Analyze code characteristics for tool selection | Determine optimal review tool |

## Two-Level Review Process

### Solution Review vs Code Review

**Solution Review** (Architecture & Design Level - Step 3, Optional):
- Validates the overall approach and architecture decisions
- Checks if the solution addresses the actual requirements
- Evaluates design patterns, system architecture, scalability
- Reviews integration points and system boundaries
- Assesses security, performance, maintainability at design level
- **Owner**: super-architect (when invoked by super-planner)
- **When**: During design phase (Step 3 in workflow)

**Code Review** (Implementation Quality Level - Step 9-10, Mandatory):
- Validates code quality, style, and best practices
- Checks for bugs, edge cases, error handling
- Reviews test coverage and test quality
- Verifies adherence to coding standards
- Assesses documentation and code comments
- **Owner**: code-review (this skill)
- **When**: After implementation complete (Step 9-10 in workflow)

### Workflow Integration

```
Step 3: Solution Review (optional, if complex)
        ↓
super-architect validates architecture/design
        ↓
Step 7: Implementation (super-coder)
        ↓
Step 9-10: Code Review (mandatory) ← YOU ARE HERE
        ↓
code-review validates implementation
        ↓
Step 10: Mark as Done
```

## Review Coordination Logic

### Auto-Selection Decision Tree

```
IF --tool specified:
├── Use specified tool (skip auto-selection)
└── Validate tool availability, notify if unavailable

ELSE (auto mode):
├── Analyze target (size, complexity, patterns)
├── IF size < 500 LOC AND simple structure → claude
├── ELIF size >= 500 AND size <= 2000 → gemini (flash)
├── ELIF size > 2000 OR high complexity → gemini (pro)
├── ELIF semantic codebase understanding needed → auggie
├── ELIF security focus → gemini (pro)
├── ELIF multi-model access needed → opencode
├── ELSE → gemini (flash) [default balanced]
└── Report selection to user with rationale
```

### Tool Selection Heuristics

| Code Characteristic | Recommended Tool | Rationale |
|---------------------|------------------|-----------|
| < 500 LOC, simple | claude | Fast, no external setup |
| 500-2000 LOC | gemini (flash) | Balanced speed/capability |
| > 2000 LOC, complex | gemini (pro) | Comprehensive analysis |
| Needs semantic context | auggie | Codebase-aware indexing |
| Security audit | gemini (pro) | Thorough security analysis |
| Multi-model access | opencode | External AI perspective |
| Quick PR review | claude or gemini-flash | Speed priority |
| Unknown complexity | gemini (flash) | Safe default |

## Review Checklist and Criteria

### Code Quality (All Reviews)

- **Correctness**: Logic is sound, no bugs or edge cases
- **Readability**: Code is clear, self-documenting, well-named
- **Maintainability**: Easy to understand and modify
- **Testability**: Code can be tested effectively
- **Performance**: No obvious performance issues
- **Security**: No security vulnerabilities
- **Standards**: Follows language/framework conventions

### Focus Area Criteria

**Security**:
- Injection vulnerabilities (SQL, XSS, command, path traversal)
- Authentication and authorization flaws
- Sensitive data exposure
- Cryptographic failures
- Insecure dependencies

**Performance**:
- Algorithm complexity issues (O(n^2) where O(n) possible)
- N+1 query problems
- Memory leaks or excessive allocations
- Unnecessary database calls
- Cache misses and optimization opportunities

**Testing**:
- Test coverage gaps (uncovered code paths)
- Missing edge case tests
- Brittle tests (timing dependencies, flaky assertions)
- Test organization and clarity
- Mock/stub quality

**Quality**:
- Code duplication (DRY violations)
- Overly complex logic (should be simplified)
- Poor naming or confusing abstractions
- Inconsistent style
- Missing or poor documentation

**Architecture**:
- Tight coupling between components
- Violation of SOLID principles
- Poor separation of concerns
- Missing abstractions where needed
- Over-engineering (YAGNI violations)

## Output Format

### Review Result Structure

```yaml
---
type: super-code-review
version: 1.0
tool: {gemini|claude|auggie|opencode}
model: {model_name}
target: {target_path}
focus_areas: {areas}
quality_score: {X}/10
recommendation: {Approve|Request Changes|Needs Review}
---
```

### Priority Sections

1. **Executive Summary** - High-level overview
2. **Critical Issues (Must Fix)** - Blocking issues that must be resolved
3. **High Priority Issues (Should Fix)** - Important improvements
4. **Medium Priority Issues (Consider Fixing)** - Suggested enhancements
5. **Low Priority Issues (Nice to Have)** - Optional improvements
6. **Detailed Analysis** - Security, Performance, Quality, Testing
7. **Overall Assessment** - Strengths, improvements, next steps

## Integration with code-review-* Skills

### Delegation Pattern

```python
# Delegation to underlying skills
def review_with_tool(target, tool, focus_areas):
    skill_script = f"${{CLAUDE_PLUGIN_ROOT}}/skills/code-review-{tool}/scripts/code-review-{tool}.py"
    return invoke_skill(skill_script, "review", target, focus=focus_areas)
```

### Result Synthesis

When multiple reviews are conducted (e.g., comprehensive mode):
1. Collect results from each tool
2. Deduplicate overlapping findings
3. Prioritize by severity
4. Present unified report with tool attribution

## Examples

### Example 1: Auto-Select Review

```bash
# Auto-selects gemini-flash for 800 LOC module
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-common/scripts/code-review.py review src/auth/

# Output:
# → Analyzing code characteristics...
# → Detected: 850 LOC, moderate complexity, authentication logic
# → Selected: gemini-flash (balanced capability/speed)
# → Invoking rd2:code-review-gemini...
```

### Example 2: Security-Focused Review

```bash
# Force gemini-pro for security audit
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-common/scripts/code-review.py review src/payment/ \
  --tool gemini \
  --focus security

# Output:
# → Tool: gemini (explicit selection)
# → Focus: security (injection, auth flaws, data exposure)
# → Invoking rd2:code-review-gemini with pro model...
```

### Example 3: Semantic Context Review

```bash
# Use auggie for codebase-aware review
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-common/scripts/code-review.py review src/ \
  --tool auggie \
  --focus architecture

# Output:
# → Tool: auggie (semantic indexing)
# → Focus: architecture (coupling, patterns, boundaries)
# → Invoking rd2:code-review-auggie...
```

## Error Handling

| Error                    | Response                                   |
| ------------------------ | ------------------------------------------ |
| All tools unavailable    | Show installation instructions for all tools |
| Specified tool unavailable | Suggest alternative tools, offer to switch  |
| Target invalid           | Show path error, suggest valid targets      |
| Invalid focus area       | Show valid focus options                    |
| Review timeout           | Suggest simpler query or different tool    |
| Empty results            | Verify target, try different focus         |

## Related Skills

- **code-review-gemini** - Gemini-based code review (comprehensive analysis)
- **code-review-claude** - Claude native code review (fast, no setup)
- **code-review-auggie** - Auggie semantic code review (codebase-aware)
- **code-review-opencode** - OpenCode multi-model code review (external AI)
- **super-coder** - Implementation coordination (pre-review)
- **super-architect** - Solution architecture/design review (Step 3)

## Fat Skills, Thin Wrappers

This skill implements the comprehensive review coordination logic:

**Fat (this skill):**
- Auto-selection heuristics
- Review criteria and checklists
- Two-level review process definition
- Result synthesis and formatting
- Tool fallback logic

**Thin (agent/command wrappers):**
- Parse user input
- Invoke this skill
- Present results
- Handle errors

## See Also

- **code-review agent**: `../../../agents/super-code-reviewer.md`
- **code-review command**: `../../../commands/code-review.md`
- **Task 0061 findings**: Two-level review process clarification
