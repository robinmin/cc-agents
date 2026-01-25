---
name: customize and enhance code-revew-gemini
description: Customize and enhance the code-review-gemini skill to integrate Gemini CLI with Claude Code
status: Done
created_at: 2026-01-22 10:22:04
updated_at: 2026-01-22 11:45:00
---

## 0048. customize and enhance code-revew-gemini

### Background

To enable we can use Gemini CLI with Claude Code (majorly for code review), we need to build a new Agent Skill that can interact with Gemini CLI and Claude Code. That's @plugins/rd2/skills/code-review-gemini.

This is just a draft version and copied from the original place. We need to enhance it to adapt to our specific needs.

### Requirements / Objectives

#### Customize `plugins/rd2/skills/code-review-gemini/scripts/code-review-gemini.py`

- 1, To align with the project's technical stack, we need to implement a `check` command for code-review-gemini.py with the same logic in `plugins/rd2/skills/code-review-gemini/scripts/check-gemini.sh`. This bash script will be removed once we implement the `check` command in Python.

- 2, Add a new command `run` to code-review-gemini.py
  This new command `run` will be designed to run prompt via Gemini CLI as current version @plugins/rd2/skills/code-review-gemini/SKILL.md mentioned:

For short prompts, pass directly as a positional argument:

```bash
# Short prompt - direct positional argument
gemini -m gemini-2.5-pro --sandbox -o text "Your prompt here" 2>/dev/null
```

- 3, Add a new command `run-file` to code-review-gemini.py
  This new command `run-file` will be designed to run prompt via Gemini CLI as current version @plugins/rd2/skills/code-review-gemini/SKILL.md mentioned:

For long prompts, write to a temp file first, then use command substitution:

```bash
# Step 1: Generate unique temp file paths and write prompt
GEMINI_PROMPT="/tmp/gemini-${RANDOM}${RANDOM}.txt"
GEMINI_OUTPUT="/tmp/gemini-${RANDOM}${RANDOM}.txt"
cat > "$GEMINI_PROMPT" <<'EOF'
[constructed prompt with code context]
EOF

# Step 2: Execute Gemini with prompt from file
# Bash tool timeout: 300000-900000ms based on complexity
gemini \
  -m "${MODEL:-gemini-2.5-pro}" \
  --sandbox \
  -o text \
  "$(cat "$GEMINI_PROMPT")" \
  2>/dev/null > "$GEMINI_OUTPUT"
```

**Important flags:**

- `-m`: Model selection (gemini-2.5-pro or gemini-2.5-flash)
- `--sandbox`: Prevents any file modifications (non-negotiable)
- `-o text`: Plain text output (use `json` if user requests structured output)
- `2>/dev/null`: Suppresses error messages and stderr noise

Both of above two commands will be implemented with the same output format and mechanism (saved to 'docs/plans/[plan-name].md' insstead of `docs/plans/[plan-name].md`).

- 4, Fine tune the prompts for both "Planning prompt" and "Review prompt" and stored them into `plugins/rd2/skills/code-review-gemini/assets`. You need to use mcp ref, brave-search, huggingface and other tools to fine the best practices of code review with Gemini CLI and code review itself. Then fine tune the prompts for both "Planning prompt" and "Review prompt" and stored them.

- Combine above `run` and `run-file` with these prompts, to add a new command `review` to code-review-gemini.py. This is the comprehensive process to review code with Gemini CLI.

#### Fine Tune plugins/rd2/skills/code-review-gemini/SKILL.md

- Move details and deterministic things into `plugins/rd2/skills/code-review-gemini/scripts/code-review-gemini.py`, and move focus on how to make the code review process more efficient and effective with high-quality of code-reviewing.

- Current description to focus on `gemini-2.5-pro`, and it's already been obsolete. You should check with `https://ai.google.dev/gemini-api/docs/models` to see the most up-to-date information and update it.

#### Prepare reference information for code review with Gemini CLI into `plugins/rd2/skills/code-review-gemini/references`

### Solutions / Goals

**COMPLETED** - All requirements implemented:

#### 1. Python Script Implementation (`code-review-gemini.py`)

Implemented all four commands:

- **`check`**: Validates Gemini CLI availability (replaces check-gemini.sh)
- **`run`**: Executes short prompts directly via Gemini CLI
- **`run-file`**: Executes long prompts from file with temp file handling
- **`review`**: Comprehensive code review with planning/review modes

Features:

- Model selection (gemini-2.5-pro, gemini-2.5-flash, gemini-2.5-flash-lite, gemini-3-pro-preview, gemini-3-flash-preview)
- Timeout configuration based on complexity
- Output saved to `docs/plans/[name].md`
- Focus areas support (security, performance, testing, quality, architecture)
- Proper error handling and user feedback

#### 2. Prompt Templates (`assets/`)

Created fine-tuned prompt templates based on best practices research:

- **`planning_prompt.md`**: Architecture planning template with structured analysis
- **`review_prompt.md`**: Comprehensive code review template with severity ratings

#### 3. SKILL.md Update

Streamlined to focus on:

- Usage patterns and workflows
- Model selection guidance
- Best practices for effective reviews
- Moved deterministic details to Python script

#### 4. References Update (`references/gemini-flags.md`)

Updated with:

- Latest Gemini 3 models (preview)
- Model comparison and recommendations
- Timeout guidelines
- Troubleshooting section

### Files Modified

- `plugins/rd2/skills/code-review-gemini/scripts/code-review-gemini.py` - Complete rewrite with all commands
- `plugins/rd2/skills/code-review-gemini/scripts/check-gemini.sh` - Deprecated, now wrapper for Python
- `plugins/rd2/skills/code-review-gemini/SKILL.md` - Streamlined and updated
- `plugins/rd2/skills/code-review-gemini/references/gemini-flags.md` - Updated with latest models
- `plugins/rd2/skills/code-review-gemini/assets/planning_prompt.md` - NEW
- `plugins/rd2/skills/code-review-gemini/assets/review_prompt.md` - NEW

### References

- [Gemini API Models Documentation](https://ai.google.dev/gemini-api/docs/models)
- [Gemini Prompt Design Strategies](https://ai.google.dev/gemini-api/docs/prompting-strategies)
- [Gemini 3 Prompting Best Practices](https://www.philschmid.de/gemini-3-prompt-practices)
- [LLM Code Review Automation Research](https://www.sciencedirect.com/science/article/pii/S0950584924001289)
