#!/bin/bash
#
# addskill.sh - Add a new Claude Code Agent Skill
#
# Usage: addskill.sh <plugin-name> <skill-name> [template-type]
#
# Arguments:
#   plugin-name    - Name of the plugin (e.g., "rd", "hello")
#   skill-name     - Name of the new skill (lowercase, hyphens allowed)
#   template-type  - Optional template: basic, complete, workflow, analysis (default: basic)
#
# Examples:
#   addskill.sh rd code-review complete
#   addskill.sh rd api-docs basic
#   addskill.sh hello my-skill

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Print functions
error() {
    echo -e "${RED}ERROR: $1${NC}" >&2
}

success() {
    echo -e "${GREEN}✓ $1${NC}"
}

info() {
    echo -e "${YELLOW}→ $1${NC}"
}

# Validate arguments
if [ $# -lt 2 ]; then
    error "Missing required arguments"
    echo "Usage: $0 <plugin-name> <skill-name> [template-type]"
    echo ""
    echo "Template types: basic, complete, workflow, analysis"
    echo "Default: basic"
    exit 1
fi

PLUGIN_NAME="$1"
SKILL_NAME="$2"
TEMPLATE_TYPE="${3:-basic}"

# Validate skill name format
if ! echo "$SKILL_NAME" | grep -qE '^[a-z0-9-]+$'; then
    error "Invalid skill name: $SKILL_NAME"
    echo "Skill names must be lowercase letters, numbers, and hyphens only"
    exit 1
fi

# Validate skill name length
if [ ${#SKILL_NAME} -gt 64 ]; then
    error "Skill name too long: ${#SKILL_NAME} characters (max 64)"
    exit 1
fi

# Check for reserved words
if echo "$SKILL_NAME" | grep -qE 'anthropic|claude'; then
    error "Skill name cannot contain reserved words: anthropic, claude"
    exit 1
fi

# Validate template type
case "$TEMPLATE_TYPE" in
    basic|complete|workflow|analysis)
        ;;
    *)
        error "Invalid template type: $TEMPLATE_TYPE"
        echo "Valid types: basic, complete, workflow, analysis"
        exit 1
        ;;
esac

# Determine project root (assuming script is in plugins/<plugin>/scripts/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
PLUGIN_DIR="$PROJECT_ROOT/plugins/$PLUGIN_NAME"
SKILLS_DIR="$PLUGIN_DIR/skills"
SKILL_DIR="$SKILLS_DIR/$SKILL_NAME"

# Validate plugin directory exists
if [ ! -d "$PLUGIN_DIR" ]; then
    error "Plugin directory not found: $PLUGIN_DIR"
    echo "Available plugins:"
    ls -1 "$PROJECT_ROOT/plugins" 2>/dev/null || echo "  (none)"
    exit 1
fi

# Check if skill already exists
if [ -d "$SKILL_DIR" ]; then
    error "Skill already exists: $SKILL_DIR"
    echo "Use a different skill name or remove the existing skill first"
    exit 1
fi

# Create skill directory
info "Creating skill directory: $SKILL_DIR"
mkdir -p "$SKILL_DIR"

# Generate skill description prompt
DESCRIPTION_PROMPT="Brief description of what this skill does and when to use it"

# Create SKILL.md based on template
info "Creating SKILL.md with $TEMPLATE_TYPE template"

case "$TEMPLATE_TYPE" in
    basic)
        cat > "$SKILL_DIR/SKILL.md" <<'EOF'
---
name: SKILL_NAME_PLACEHOLDER
description: DESCRIPTION_PLACEHOLDER
---

# SKILL_TITLE_PLACEHOLDER

Brief introduction to what this skill does.

## Workflow

1. **Step 1 Title**
   - Action detail
   - Action detail

2. **Step 2 Title**
   - Action detail
   - Action detail

3. **Step 3 Title**
   - Action detail
   - Action detail

## Quick Reference

**Key Points:**
- Important consideration 1
- Important consideration 2
- Important consideration 3

## Example

**Input:**
```
Example input
```

**Output:**
```
Example output
```

## Validation

- [ ] Check 1
- [ ] Check 2
- [ ] Check 3
EOF
        ;;

    complete)
        cat > "$SKILL_DIR/SKILL.md" <<'EOF'
---
name: SKILL_NAME_PLACEHOLDER
description: DESCRIPTION_PLACEHOLDER
---

# SKILL_TITLE_PLACEHOLDER

## Purpose

1-2 sentence purpose statement

## Workflow

1. **Preparation Phase**
   - Action 1
   - Action 2
   - Validation: What to check

2. **Execution Phase**
   - Action 1
   - Action 2
   - Validation: What to check

3. **Verification Phase**
   - Action 1
   - Action 2
   - Validation: What to check

## Quick Reference

**When to Use:**
- Scenario 1
- Scenario 2
- Scenario 3

**Prerequisites:**
- Requirement 1
- Requirement 2

**Output Format:**
```
Expected output structure
```

## Quality Checklist

- [ ] Quality criterion 1
- [ ] Quality criterion 2
- [ ] Quality criterion 3

## Common Issues

**Issue:** Problem description
**Solution:** How to resolve

## See Also

- REFERENCE.md for detailed specifications
- EXAMPLES.md for complete examples
EOF

        # Create supporting files for complete template
        cat > "$SKILL_DIR/REFERENCE.md" <<'EOF'
# SKILL_TITLE_PLACEHOLDER Reference

Detailed technical documentation.

## Specifications

### Topic 1

Detailed information

**Examples:**
```
Code or configuration examples
```

## Advanced Usage

### Advanced Topic 1

Detailed guidance

## Troubleshooting

### Problem Category

**Symptom:** What the issue looks like
**Cause:** Why it happens
**Solution:** How to fix it
EOF

        cat > "$SKILL_DIR/EXAMPLES.md" <<'EOF'
# SKILL_TITLE_PLACEHOLDER Examples

## Example 1: Scenario Name

**Context:** When you'd use this

**Input:**
```
Complete input example
```

**Process:**
1. Step with specific values
2. Step with specific values

**Output:**
```
Complete output example
```
EOF

        mkdir -p "$SKILL_DIR/scripts"
        success "Created supporting files: REFERENCE.md, EXAMPLES.md, scripts/"
        ;;

    workflow)
        cat > "$SKILL_DIR/SKILL.md" <<'EOF'
---
name: SKILL_NAME_PLACEHOLDER
description: DESCRIPTION_PLACEHOLDER
---

# SKILL_TITLE_PLACEHOLDER

## Overview

Brief description of the workflow

## Prerequisites

Before starting:
- [ ] Prerequisite 1
- [ ] Prerequisite 2
- [ ] Prerequisite 3

## Stage 1: Stage Name

### Steps

1. Action 1
2. Action 2
3. Action 3

### Validation

Check that:
- [ ] Validation criterion 1
- [ ] Validation criterion 2

If validation fails:
1. Recovery action 1
2. Return to stage start

### Output

What this stage produces

## Stage 2: Stage Name

### Steps

1. Action 1
2. Action 2

### Validation

Check that:
- [ ] Validation criterion 1
- [ ] Validation criterion 2

If validation fails:
1. Recovery action 1
2. Return to stage start or previous stage

### Output

What this stage produces

## Complete Example

**Starting State:**
```
Initial state description
```

**Stage 1 → Stage 2:**
```
Step-by-step progression
```

**Final State:**
```
End state description
```
EOF
        ;;

    analysis)
        cat > "$SKILL_DIR/SKILL.md" <<'EOF'
---
name: SKILL_NAME_PLACEHOLDER
description: Analyzes [subject] for [purpose]. Use when [condition].
---

# SKILL_TITLE_PLACEHOLDER

## Analysis Framework

### 1. Initial Assessment

**Gather Information:**
- Data point 1
- Data point 2
- Data point 3

**Classify Scope:**
- Size: [Small/Medium/Large]
- Complexity: [Low/Medium/High]
- Risk: [Low/Medium/High]

### 2. Detailed Analysis

**Category 1: Analysis Area**
- [ ] Check aspect 1
- [ ] Check aspect 2

**Category 2: Analysis Area**
- [ ] Check aspect 1
- [ ] Check aspect 2

### 3. Generate Findings

For each issue found:
- **Location:** Where the issue exists
- **Severity:** Critical/High/Medium/Low
- **Description:** What the issue is
- **Impact:** Why it matters
- **Recommendation:** How to address it

## Report Format

```markdown
# Analysis Report: [Subject]

**Date:** [Analysis date]
**Scope:** [What was analyzed]

## Executive Summary

[1-2 paragraph overview]

## Findings

### Critical Issues
- Issue 1 with location reference

### Recommendations

1. **Immediate Actions:**
   - Action 1

2. **Short-term Improvements:**
   - Action 1

## Conclusion

[Summary and overall assessment]
```

## Analysis Checklist

- [ ] All relevant aspects examined
- [ ] Findings documented with locations
- [ ] Recommendations actionable
EOF
        ;;
esac

# Replace placeholders
SKILL_TITLE=$(echo "$SKILL_NAME" | sed 's/-/ /g' | sed 's/\b\(.\)/\u\1/g')

sed -i.bak "s/SKILL_NAME_PLACEHOLDER/$SKILL_NAME/g" "$SKILL_DIR/SKILL.md"
sed -i.bak "s/DESCRIPTION_PLACEHOLDER/$DESCRIPTION_PROMPT/g" "$SKILL_DIR/SKILL.md"
sed -i.bak "s/SKILL_TITLE_PLACEHOLDER/$SKILL_TITLE/g" "$SKILL_DIR/SKILL.md"
rm "$SKILL_DIR/SKILL.md.bak"

# Also update supporting files if they exist
if [ -f "$SKILL_DIR/REFERENCE.md" ]; then
    sed -i.bak "s/SKILL_TITLE_PLACEHOLDER/$SKILL_TITLE/g" "$SKILL_DIR/REFERENCE.md"
    rm "$SKILL_DIR/REFERENCE.md.bak"
fi

if [ -f "$SKILL_DIR/EXAMPLES.md" ]; then
    sed -i.bak "s/SKILL_TITLE_PLACEHOLDER/$SKILL_TITLE/g" "$SKILL_DIR/EXAMPLES.md"
    rm "$SKILL_DIR/EXAMPLES.md.bak"
fi

# Create README for guidance
cat > "$SKILL_DIR/README.md" <<EOF
# $SKILL_TITLE Skill

**Status:** Draft - Generated from $TEMPLATE_TYPE template

## Next Steps

1. **Edit SKILL.md:**
   - Update the description in the frontmatter
   - Fill in the workflow details
   - Add concrete examples
   - Remove placeholder text

2. **Validate:**
   - Check skill name is under 64 characters ✓
   - Check description is under 1024 characters
   - Verify no XML tags in frontmatter
   - Test with fresh Claude instance

3. **Refine:**
   - Use \`/rd:skill-refine $SKILL_NAME\` to improve quality
   - Add supporting files as needed (REFERENCE.md, EXAMPLES.md)
   - Create utility scripts if applicable

## Resources

- See \`plugins/rd/skills/cc-skills/\` for best practices
- Review \`TEMPLATES.md\` for structure guidance
- Check \`EXAMPLES.md\` for complete examples

## Template Used

$TEMPLATE_TYPE - $(case "$TEMPLATE_TYPE" in
    basic) echo "Simple, focused task" ;;
    complete) echo "Complex domain with detailed guidance" ;;
    workflow) echo "Multi-stage process with validation" ;;
    analysis) echo "Investigation or review task" ;;
esac)
EOF

success "Skill created successfully!"
echo ""
info "Location: $SKILL_DIR"
echo ""
echo "📝 Next steps:"
echo "  1. Edit $SKILL_DIR/SKILL.md"
echo "  2. Update description and add content"
echo "  3. Test with: Skill tool or restart Claude Code"
echo "  4. Refine with: /rd:skill-refine $SKILL_NAME"
echo ""
info "Files created:"
echo "  - SKILL.md (main skill file)"
if [ -f "$SKILL_DIR/REFERENCE.md" ]; then
    echo "  - REFERENCE.md (detailed documentation)"
fi
if [ -f "$SKILL_DIR/EXAMPLES.md" ]; then
    echo "  - EXAMPLES.md (usage examples)"
fi
if [ -d "$SKILL_DIR/scripts" ]; then
    echo "  - scripts/ (utility scripts directory)"
fi
echo "  - README.md (next steps guidance)"
echo ""
success "Skill '$SKILL_NAME' is ready for customization!"
