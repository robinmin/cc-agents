# Agent Color Coding Guide

Documentation of color assignments for rd2 plugin agents, including color meanings, selection criteria, and conventions.

## Overview

Agent colors are specified in the frontmatter of agent files (`plugins/rd2/agents/*.md`) using the `color` field. Colors serve both aesthetic and functional purposes in the UI.

## Current Color Assignments

| Agent | Color | Hex Code | Purpose |
|-------|-------|----------|---------|
| super-coder | blue | #0000FF | Code generation and implementation |
| super-planner | purple | #800080 | Task decomposition and planning |
| super-code-reviewer | crimson | #DC143C | Code review and validation |
| super-architect | orange | #FFA500 | Solution architecture |
| super-designer | teal | #008080 | UI/UX design |

## Color Meanings

### Functional Categories

**Code Generation (Blue shades)**
- Represents creation, building, implementation
- Associated with productivity and technical work
- Example: `super-coder: blue`

**Planning & Coordination (Purple shades)**
- Represents orchestration, management, structure
- Associated with meta-level activities
- Example: `super-planner: purple`

**Review & Validation (Red shades)**
- Represents critical examination, quality gates
- Associated with attention, caution, importance
- Example: `super-code-reviewer: crimson`

**Architecture (Orange/Yellow shades)**
- Represents structural thinking, foundations
- Associated with high-level design
- Example: `super-architect: orange`

**Design (Green/Teal shades)**
- Represents user-facing work, aesthetics
- Associated with creativity and user experience
- Example: `super-designer: teal`

## Color Selection Criteria

When creating a new agent, follow these criteria for color selection:

### 1. Functional Category

Determine the agent's primary function:

| Function | Color Family | Examples |
|----------|--------------|----------|
| Code generation | Blue | blue, cyan, navy, skyblue |
| Planning/coordination | Purple | purple, violet, orchid, magenta |
| Review/audit | Red | red, crimson, coral, tomato |
| Architecture | Orange | orange, gold, amber, yellow |
| Design | Green/Teal | teal, turquoise, green, emerald |
| Documentation | Gray | gray, silver, slate |
| Testing | Yellow | yellow, lemon, khaki |

### 2. Visual Distinction

Ensure colors are visually distinct from existing agents:

**Avoid:**
- Colors too similar to existing agents
- Colors that are hard to distinguish in the UI
- Very light colors (poor visibility on light backgrounds)

**Prefer:**
- Colors with clear visual separation
- Colors with good contrast
- Standard CSS color names (browser compatibility)

### 3. Semantic Meaning

Choose colors with semantic relevance:

| Semantic | Color | When to Use |
|----------|-------|-------------|
| Critical, urgent | red, crimson | Code review, security audit |
| Safe, standard | blue, green | Code generation, testing |
| Creative | purple, pink | Design, brainstorming |
| Structural | orange, yellow | Architecture, planning |
| Neutral | gray, silver | Documentation, utilities |

### 4. Consistency with Conventions

Follow existing conventions where applicable:

- **Code-related**: Blue (industry standard)
- **Review/audit**: Red (signals attention)
- **Design**: Teal/purple (creative associations)
- **Planning**: Orange/yellow (structural associations)

## Standard Color Palette

### Recommended Colors

Use these standard CSS colors for consistency:

| Color Name | Hex Code | Usage |
|------------|----------|-------|
| **Blue shades** |
| blue | #0000FF | Primary code generation |
| cyan | #00FFFF | Multi-model code gen |
| navy | #000080 | Deep implementation |
| skyblue | #87CEEB | Light code tasks |
| **Purple shades** |
| purple | #800080 | Planning and coordination |
| violet | #EE82EE | Light orchestration |
| orchid | #DA70D6 | Meta-coordination |
| magenta | #FF00FF | Multi-agent coordination |
| **Red shades** |
| red | #FF0000 | Critical review |
| crimson | #DC143C | Code review |
| coral | #FF7F50 | Light review |
| tomato | #FF6347 | Quality assurance |
| **Orange shades** |
| orange | #FFA500 | Architecture |
| gold | #FFD700 | Solution design |
| amber | #FFBF00 | High-level planning |
| yellow | #FFFF00 | Quick architecture |
| **Green/Teal shades** |
| teal | #008080 | UI/UX design |
| turquoise | #40E0D0 | Frontend design |
| green | #008000 | Testing |
| emerald | #50C878 | Test coverage |
| **Neutral shades** |
| gray | #808080 | Documentation |
| silver | #C0C0C0 | Utilities |
| slate | #708090 | Infrastructure |

## Adding New Agents

### Step 1: Determine Category

Identify the agent's primary function:

```
New agent: super-tester
Function: Test coordination and quality assurance
Category: Testing
→ Color family: Yellow/Green shades
```

### Step 2: Select Specific Color

Choose a specific color from the palette:

```
Options:
- yellow (standard testing)
- gold (premium testing)
- lemon (light testing)
- green (quality assurance)

Selection: green (semantic match to "quality")
```

### Step 3: Verify Uniqueness

Check against existing agents:

```
Existing: blue, purple, crimson, orange, teal
New: green
→ No conflicts, visually distinct
```

### Step 4: Update Agent File

Add color to agent frontmatter:

```yaml
---
name: super-tester
description: Unified test coordination
color: green
---
```

### Step 5: Document

Add to this guide's color assignment table:

| Agent | Color | Hex Code | Purpose |
|-------|-------|----------|---------|
| super-tester | green | #008000 | Test coordination |

## Color Accessibility

### Visibility Guidelines

Ensure colors are visible in both light and dark modes:

**Good visibility:**
- blue (#0000FF)
- crimson (#DC143C)
- teal (#008080)
- purple (#800080)

**Poor visibility (avoid):**
- Very light colors: lemon, lightyellow, aliceblue
- Very dark colors: darkblue, darkred (on dark backgrounds)

### Contrast Ratios

Aim for WCAG AA contrast ratios (4.5:1 for text):

**Test your color:**
```javascript
// Check contrast ratio
function getContrastRatio(foreground, background) {
    const fgLum = getLuminance(foreground);
    const bgLum = getLuminance(background);
    return (Math.max(fgLum, bgLum) + 0.05) / (Math.min(fgLum, bgLum) + 0.05);
}
```

## Agent Color Reference

### Quick Reference Card

```
┌─────────────────────────────────────────────┐
│            AGENT COLOR REFERENCE             │
├─────────────────────────────────────────────┤
│ 🟦 blue       - super-coder (code gen)      │
│ 🟪 purple     - super-planner (planning)    │
│ 🟥 crimson    - super-code-reviewer (review)│
│ 🟧 orange     - super-architect (arch)      │
│ 🟩 teal       - super-designer (design)     │
└─────────────────────────────────────────────┘
```

### By Function

```
CODE GENERATION:
  🟦 blue  - super-coder
  🟦 cyan  - (future: multi-model coder)

PLANNING & COORDINATION:
  🟪 purple   - super-planner
  🟪 violet  - (future: project manager)

REVIEW & VALIDATION:
  🟥 crimson  - super-code-reviewer
  🟥 red     - (future: security auditor)

ARCHITECTURE:
  🟧 orange   - super-architect
  🟧 gold    - (future: cloud architect)

DESIGN:
  🟩 teal     - super-designer
  🟩 green   - (future: super-tester)
```

## Best Practices

### DO ✅

- [ ] Use standard CSS color names
- [ ] Ensure visual distinction from existing agents
- [ ] Consider semantic meaning
- [ ] Test in both light and dark modes
- [ ] Document new color assignments
- [ ] Follow functional category conventions

### DON'T ❌

- [ ] Use non-standard color values (e.g., #A3F2B1)
- [ ] Duplicate colors from similar agents
- [ ] Use very light or very dark colors
- [ ] Choose colors randomly
- [ ] Skip documentation updates
- [ ] Ignore functional conventions

## Troubleshooting

### Issue: Color Not Showing in UI

**Cause:** Color name not recognized

**Solution:**
1. Verify color is a standard CSS name
2. Check spelling in agent frontmatter
3. Test color in browser: `document.body.style.color = "yourcolor"`

### Issue: Colors Too Similar

**Cause:** Two agents have visually similar colors

**Solution:**
1. Compare hex codes
2. Adjust one color to a different shade
3. Ensure minimum contrast difference of 30%

### Issue: Poor Visibility in Dark Mode

**Cause:** Color too dark for dark background

**Solution:**
1. Choose lighter variant of color
2. Test in both light and dark modes
3. Consider using gray for neutral agents

## Related Documentation

- **Architecture**: `docs/rd2-architecture.md`
- **Workflow**: `docs/rd2-workflow.md`
- **Agent Creation**: `plugins/rd2/agents/agent-expert.md`
