---
name: tool-selection
description: General-purpose tool/skill selection framework with heuristics, availability checking, fallback strategies, and confidence scoring. Applicable to any agent choosing between multiple implementation options.
---

# Tool Selection Framework

## Overview

General-purpose tool/skill selection framework for rd2 agents. Provides a systematic approach to choosing between multiple implementation options based on task characteristics, availability, and user preferences.

**Key features:**

- Generic selection process and heuristics template
- Availability verification methods
- Fallback protocol with decision tree
- Confidence scoring framework
- Selection report formats
- Agent-specific customization guidance

**Used by:** `super-coder`, `super-code-reviewer`, `super-planner`, `super-designer`, any agent with multiple tool/skill options

## Core Principles

1. **Smart Auto-Selection** — Analyze task characteristics and select optimal tool
2. **Explicit User Choice** — Always respect manual `--tool` override
3. **Graceful Degradation** — Fallback to next best option on failure
4. **Transparent Rationale** — Explain selection choices to user
5. **Availability First** — Verify tool exists before selection

## Selection Process

```
1. Check for explicit user choice (--tool flag)
2. If no explicit choice, run auto-selection
3. Analyze task characteristics (complexity, context, requirements)
4. Apply heuristics to select optimal tool
5. Verify tool availability
6. Report selection with rationale
7. Handle fallback if needed
```

### Selection Flow Diagram

```
Start
  ↓
User specified --tool?
  ↓ Yes                    ↓ No
Notify user              Run auto-selection
  ↓                            ↓
Check availability        Analyze characteristics
  ↓                            ↓
Available?               Apply heuristics
  ↓ Yes    ↓ No                  ↓
Use tool   Suggest          Select tool
          alternatives            ↓
                              Availability?
                              ↓ Yes    ↓ No
                             Use tool  Try next best
                                       ↓
                                    Any tools?
                                    ↓ No      ↓ Yes
                                 Escalate   Use it
```

## Generic Selection Heuristics Template

**Template for tool/skill selection decisions:**

| Task Characteristic  | Recommended Option   | Rationale                           |
| -------------------- | -------------------- | ----------------------------------- |
| Simple/quick         | Fast/default option  | Speed priority, minimal setup       |
| Multi-file/complex   | Thorough option      | Handles complexity, deep analysis   |
| Needs context        | Context-aware option | Semantic understanding, indexing    |
| Security-sensitive   | Pro/advanced option  | Deep analysis, security review      |
| External perspective | Multi-model option   | Diverse approaches, external input  |
| Privacy-sensitive    | Local option         | Data stays local, no external calls |
| Test-driven          | Any (with TDD)       | All options support TDD workflow    |

### Customization per Agent

**Replace placeholders with actual tools/skills:**

- "Option" → Actual tool/skill names
- Adjust rationales per domain
- Add domain-specific characteristics
- Remove irrelevant rows

**Example for super-coder:**

- "Fast/default option" → "claude"
- "Thorough option" → "gemini"
- "Context-aware option" → "auggie"
- "Multi-model option" → "opencode"

## Availability Verification

### Verification Methods

```python
# Generic check pattern (adapt per tool)
def check_tool_availability(tool_name: str) -> bool:
    """Verify tool/skill is available before selection."""
    try:
        # Method 1: Check if skill file exists
        skill_path = Path(f"plugins/rd2/skills/{tool_name}/SKILL.md")
        if skill_path.exists():
            return True

        # Method 2: Run tool-specific check command
        result = subprocess.run(
            [tool_check_command],
            capture_output=True,
            timeout=5
        )
        return result.returncode == 0

    except (subprocess.TimeoutExpired, FileNotFoundError):
        return False
```

### Availability Table Template

| Tool     | Check Method                             | Fallback |
| -------- | ---------------------------------------- | -------- |
| option-a | `check-script-a.sh` or skill file exists | option-b |
| option-b | `check-script-b.sh` or skill file exists | option-c |
| option-c | `check-script-c.sh` or skill file exists | option-a |

### Verification Commands

```bash
# For skill-based tools (rd2 pattern)
test -f "plugins/rd2/skills/{skill_name}/SKILL.md"

# For external CLI tools
which {tool_name}
# OR
command -v {tool_name}

# For Python-based tools
python3 -c "import {module_name}"

# For Node-based tools
npm list -g {package_name}
```

## Fallback Protocol

### Fallback Strategy

```
IF selected tool unavailable:
├── User specified tool → Notify + suggest alternatives
├── Auto-selected tool → Try next best option
├── All tools unavailable → Escalate to user
└── Never silently fail without explanation
```

### Fallback Decision Tree

```
Primary Tool Unavailable
        ↓
    User specified?
        ↓
    Yes    No
     ↓      ↓
  Notify  Try next best
  user    option
     ↓      ↓
  Suggest  Available?
  alts      ↓
           No   Yes
            ↓    ↓
          Try  Use
          next it
          best
            ↓
         All unavailable?
            ↓
         Yes    No
          ↓      ↓
      Escalate Use it
```

## Confidence Scoring

### Confidence Levels

| Level  | Threshold | Criteria                                                |
| ------ | --------- | ------------------------------------------------------- |
| HIGH   | >90%      | Tool matches task, available, requirements clear        |
| MEDIUM | 70-90%    | Tool based on partial info, available, some assumptions |
| LOW    | <70%      | Tool unavailable, uncertain, requirements unclear       |

### Confidence Assessment Checklist

```
[ ] Task requirements clearly understood
[ ] Tool availability confirmed
[ ] Heuristics applied correctly
[ ] User preferences respected (if --tool specified)
[ ] Fallback options identified
[ ] External APIs verified (if applicable)

[ ] Overall confidence: ___ %
```

## Selection Report Format

### Auto-Selection Report

```markdown
## Tool Selection Analysis

**Requirements:** {requirements_summary}
**Complexity:** {simple/medium/high}
**Context:** {context_needed/not_needed}
**Selected Tool:** {tool_name}
**Rationale:** {reasoning}

**Availability Check:**

- {tool_1}: {available ✓ / unavailable ✗}
- {tool_2}: {available ✓ / unavailable ✗}
- {tool_3}: {available ✓ / unavailable ✗}

**Confidence:** HIGH/MEDIUM/LOW
**Reasoning:** {detailed_explanation}

**Characteristics analyzed:**

- File count: {single_file / multi_file}
- Codebase context: {needed / not_needed}
- Security: {sensitive / standard}
- Privacy: {local_ok / external_ok}
```

### Error Report (Tool Unavailable)

````markdown
## Tool Selection Failed

**Requested Tool:** {tool_name}
**Availability:** {unavailable_reason}

**Alternatives:**

1. {alternative_1} - {reason_for_recommendation}
2. {alternative_2} - {reason_for_recommendation}
3. {alternative_3} - {reason_for_recommendation}

**Suggestion:** {actionable_next_step}

**Example usage:**

```bash
# Try alternative
/command --tool {alternative_1}

# Or let us auto-select
/command (no --tool flag)
```

## Agent-Specific Customization

### For super-coder (Coder Tool Selection)

**Options:** `gemini`, `claude`, `auggie`, `opencode`

**Characteristics:**

| Task Characteristic    | Recommended Tool | Rationale               |
| ---------------------- | ---------------- | ----------------------- |
| Simple function/class  | claude           | Fast, no external setup |
| Multi-file feature     | gemini           | Handles complexity well |
| Needs codebase context | auggie           | Semantic indexing       |
| Security-sensitive     | gemini (pro)     | Thorough analysis       |
| External perspective   | opencode         | Multi-model access      |
| Quick prototype        | claude           | Speed priority          |
| Complex architecture   | gemini (pro)     | Deep reasoning          |
| Privacy-sensitive      | opencode (local) | Local model option      |

### For super-code-reviewer (Reviewer Tool Selection)

**Options:** `claude`, `gemini`, `auggie`, `opencode`

**Characteristics:**

| Task Characteristic | Recommended Tool | Rationale              |
| ------------------- | ---------------- | ---------------------- |
| Quick review        | claude           | Fast feedback          |
| Security-focused    | gemini           | Thorough analysis      |
| Codebase-aware      | auggie           | Semantic understanding |
| Multi-model opinion | opencode         | Diverse perspectives   |
| Performance-focused | gemini (pro)     | Deep analysis          |
| Convention check    | claude           | Fast pattern matching  |

### For super-planner (Planning Approach Selection)

**Options:** `comprehensive`, `lean`, `agile`

**Characteristics:**

| Task Characteristic  | Recommended Approach | Rationale                  |
| -------------------- | -------------------- | -------------------------- |
| Complex project      | comprehensive        | Full breakdown, all phases |
| Time-sensitive       | lean                 | Essential steps only       |
| Iterative needed     | agile                | Incremental planning       |
| Unknown requirements | comprehensive        | Exploration included       |
| Well-defined scope   | lean                 | Direct to implementation   |

### For super-designer (Design Tool Selection)

**Options:** `rd2:ui-ux-design`, `rd2:frontend-design`

**Characteristics:**

| Task Characteristic | Recommended Tool    | Rationale                 |
| ------------------- | ------------------- | ------------------------- |
| UI/UX design        | rd2:ui-ux-design    | Accessibility, user flows |
| Component design    | rd2:frontend-design | React/Vue/Svelte patterns |
| Design system       | rd2:ui-ux-design    | Tokens, variants          |
| Single component    | rd2:frontend-design | Quick implementation      |

## Implementation Pattern

### Auto-Selection Logic (Pseudocode)

```python
def select_tool(requirements, user_choice=None):
    """Select optimal tool based on requirements and user preference."""

    # 1. Check for explicit user choice
    if user_choice:
        if check_availability(user_choice):
            return user_choice, "User specified"
        else:
            return suggest_alternative(user_choice), "User choice unavailable"

    # 2. Analyze requirements
    complexity = assess_complexity(requirements)
    needs_context = check_codebase_reference(requirements)
    security_sensitive = check_security_concerns(requirements)

    # 3. Apply heuristics
    if security_sensitive:
        return "gemini", "Security-sensitive task"
    elif complexity == "multi_file":
        if needs_context:
            return "auggie", "Multi-file with codebase context"
        else:
            return "gemini", "Multi-file complexity"
    elif complexity == "simple":
        return "claude", "Simple task, speed priority"

    # 4. Default fallback
    return "claude", "Default option"

def suggest_alternative(unavailable_tool):
    """Suggest available alternatives."""
    available_tools = ["claude", "gemini", "auggie", "opencode"]
    alternatives = [t for t in available_tools if t != unavailable_tool]
    return alternatives[0] if alternatives else None
```
````

## Quick Reference

### Selection Checklist

```
[ ] Check for --tool flag (user choice)
[ ] Analyze task characteristics
[ ] Apply domain-specific heuristics
[ ] Verify tool availability
[ ] Select optimal tool or use user choice
[ ] Report selection with rationale
[ ] Prepare fallback options
```

### Fallback Sequence

```
1. User choice → Use if available
2. Auto-select → Apply heuristics
3. Check availability → Verify tool exists
4. Fallback → Try next best option
5. Escalate → Notify user if all unavailable
```

### Common Mistakes to Avoid

- ❌ Ignoring user's `--tool` choice
- ❌ Not checking availability before selection
- ❌ Silently falling back without explanation
- ❌ Not providing rationale for auto-selection
- ❌ Forgetting to suggest alternatives on failure

## References

- `rd2:super-coder` agent - Coder tool selection implementation
- `rd2:super-code-reviewer` agent - Reviewer tool selection implementation
- Tool availability patterns in rd2 plugin
