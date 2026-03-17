# Command Evaluation Framework

10-dimension quality evaluation for slash commands with configurable weight profiles.

## Dimensions Overview

| # | Dimension | With Pseudocode | Without Pseudocode | What It Checks |
|---|-----------|-----------------|--------------------|----|
| 1 | Frontmatter Quality | 15 | 18 | Valid YAML, only allowed fields, no invalid fields |
| 2 | Description Effectiveness | 15 | 18 | Under 60 chars, starts with verb, specific |
| 3 | Content Quality | 12 | 15 | Imperative form, no second-person, writes FOR Claude |
| 4 | Structure & Brevity | 10 | 12 | Under 150 lines, progressive disclosure |
| 5 | Delegation Pattern | 12 | 5 | Uses Skill()/Task()/SlashCommand(), fat skills thin wrappers |
| 6 | Argument Design | 8 | 10 | argument-hint present when $N used, descriptive |
| 7 | Security | 10 | 8 | allowed-tools restrictive, no dangerous patterns |
| 8 | Naming Convention | 5 | 7 | noun-verb for grouped, verb-noun for simple |
| 9 | Platform Compatibility | 8 | 5 | Claude-specific features documented |
| 10 | Operational Readiness | 5 | 2 | Error handling, edge cases |
| | **Total** | **100** | **100** | |

## Weight Profiles

### With Pseudocode (workflow commands)

Commands using Task(), Skill(), SlashCommand(), or AskUserQuestion() are weighted toward delegation quality and platform compatibility.

### Without Pseudocode (simple commands)

Commands with direct instructions are weighted toward frontmatter quality, description clarity, and content quality.

## Dimension Details

### 1. Frontmatter Quality (15/18)

- YAML parses without errors
- Only valid fields present (description, allowed-tools, model, argument-hint, disable-model-invocation)
- No invalid fields (name, skills, subagents, version, etc.)
- Field values have correct types (model is string enum, allowed-tools is string/array, etc.)

### 2. Description Effectiveness (15/18)

- Under 60 characters
- Starts with a verb (Review, Deploy, Generate)
- Does not start with "This command"
- Specific enough to differentiate from other commands
- No redundant words ("command", "slash command")

### 3. Content Quality (12/15)

- Uses imperative form (not second-person "you should")
- Writes instructions FOR Claude (not messages TO user)
- Clear, actionable instructions
- No hallucinated tool names or non-existent APIs
- Proper markdown formatting

### 4. Structure & Brevity (10/12)

- Total lines under ~150 (thin wrapper principle)
- Progressive disclosure with sections
- Well-organized with clear headers
- No excessive boilerplate or redundant content

### 5. Delegation Pattern (12/5)

- Uses Skill(), Task(), SlashCommand() properly
- Follows fat skills, thin wrappers principle
- Delegates to skills (not agents) from commands
- Pseudocode is clear and structured

### 6. Argument Design (8/10)

- argument-hint present when body uses $1, $2, $ARGUMENTS
- Descriptive argument names (not arg1, arg2)
- Consistent with body usage
- Square brackets for each argument

### 7. Security (10/8)

- allowed-tools is as restrictive as possible
- Bash uses command filters (Bash(git:*) not Bash)
- No hardcoded secrets or credentials
- No dangerous shell patterns (rm -rf, sudo, etc.)
- Security blacklist/greylist scanning

### 8. Naming Convention (5/7)

- Grouped commands use noun-verb pattern (e.g., task-create, skill-evaluate)
- Simple commands use verb-noun pattern (e.g., review-code)
- Full namespace used (plugin-name:command-name)
- Hyphen-case, lowercase

### 9. Platform Compatibility (8/5)

- Claude-specific features documented (Task, Skill, $ARGUMENTS, etc.)
- Platform Notes section present if using non-portable features
- Portable alternatives suggested where possible
- Cross-platform adaptation feasibility assessed

### 10. Operational Readiness (5/2)

- Error handling instructions present
- Edge cases documented or handled
- Input validation described
- Graceful failure behavior specified

## Grading Scale

| Grade | Score Range | Description |
|-------|------------|-------------|
| A | 90-100 | Excellent: production-ready |
| B | 80-89 | Good: minor improvements needed |
| C | 70-79 | Acceptable: some issues to address |
| D | 60-69 | Below standard: significant issues |
| F | < 60 | Failing: major rework needed |

## Security Gatekeeper

Commands are automatically rejected (grade F, failed) if they contain:

**Blacklist (immediate rejection):**
- Hardcoded API keys, tokens, passwords
- Base64-encoded suspicious strings
- Known malicious patterns

**Greylist (score penalty):**
- Unrestricted Bash access
- Missing allowed-tools
- Overly broad tool permissions
- Shell injection patterns

## Passing Threshold

Default passing threshold: **80/100** (Grade B or above).

Configurable via `evaluation.config.ts`.
