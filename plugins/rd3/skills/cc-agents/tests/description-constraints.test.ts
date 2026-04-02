#!/usr/bin/env bun
import { describe, expect, it } from 'bun:test';
import {
    CODEX_AGENT_DESCRIPTION_MAX_LENGTH,
    normalizeAgentDescription,
    replaceDescriptionInMarkdownFrontmatter,
    truncateAgentDescriptionForCodex,
} from '../scripts/description-constraints';

describe('agent description constraints', () => {
    it('normalizes CRLF line endings and trims surrounding whitespace', () => {
        const result = truncateAgentDescriptionForCodex('\r\n  Use PROACTIVELY for refinement.\r\n\r\n');

        expect(normalizeAgentDescription('\r\n  Keep this.\r\n')).toBe('Keep this.');
        expect(result.truncated).toBe(false);
        expect(result.changed).toBe(true);
        expect(result.value).toBe('Use PROACTIVELY for refinement.');
        expect(result.preservedExample).toBe(false);
    });

    it('preserves the first example block when truncating long descriptions', () => {
        const description = `Use PROACTIVELY for routing work across multiple platforms. ${'a'.repeat(600)}

<example>
user: "Create a new agent for code review"
assistant: "Route to the scaffold workflow, generate the wrapper, and explain the next validation steps."
<commentary>Preserve one concrete example so the model understands when to delegate.</commentary>
</example>

<example>
user: "Evaluate this agent"
assistant: "Run evaluation, summarize issues, then refine if needed."
<commentary>This second example may be dropped if needed.</commentary>
</example>

${'b'.repeat(600)}`;

        const result = truncateAgentDescriptionForCodex(description);

        expect(result.truncated).toBe(true);
        expect(result.value.length).toBeLessThanOrEqual(CODEX_AGENT_DESCRIPTION_MAX_LENGTH);
        expect(result.preservedExample).toBe(true);
        expect(result.value).toContain('<example>');
        expect(result.value).toContain('Create a new agent for code review');
    });

    it('truncates plain text descriptions without examples', () => {
        const description = `Use this agent for systematic work. ${'word '.repeat(400)}`;
        const result = truncateAgentDescriptionForCodex(description);

        expect(result.truncated).toBe(true);
        expect(result.value.length).toBeLessThanOrEqual(CODEX_AGENT_DESCRIPTION_MAX_LENGTH);
        expect(result.preservedExample).toBe(false);
        expect(result.value.endsWith('...')).toBe(true);
    });

    it('compacts oversized example blocks while preserving one example', () => {
        const description = `Use PROACTIVELY for specialist routing. ${'intro '.repeat(120)}

<example>
user: "${'request '.repeat(120)}"
assistant: "${'response '.repeat(120)}"
<commentary>${'why '.repeat(120)}</commentary>
</example>

${'tail '.repeat(240)}`;

        const result = truncateAgentDescriptionForCodex(description);

        expect(result.truncated).toBe(true);
        expect(result.preservedExample).toBe(true);
        expect(result.value.length).toBeLessThanOrEqual(CODEX_AGENT_DESCRIPTION_MAX_LENGTH);
        expect(result.value).toContain('<example>');
        expect(result.value).toContain('user:');
        expect(result.value).toContain('request');
    });

    it('replaces markdown frontmatter descriptions with readable block scalars', () => {
        const updated = replaceDescriptionInMarkdownFrontmatter(
            `---
name: test-agent
description: "Old description"
tools: [Read]
---

# Body`,
            `Use PROACTIVELY for agent work.

<example>
user: "Evaluate this agent"
assistant: "Run evaluation first."
</example>`,
        );

        expect(updated).toContain('description: |');
        expect(updated).toContain('  <example>');
        expect(updated).toContain('tools: [Read]');
    });

    it('leaves content unchanged when frontmatter is missing or description is absent', () => {
        const noFrontmatter = '# Body only';
        const missingDescription = `---
name: test-agent
tools: [Read]
---

# Body`;

        expect(replaceDescriptionInMarkdownFrontmatter(noFrontmatter, 'Updated')).toBe(noFrontmatter);
        expect(replaceDescriptionInMarkdownFrontmatter(missingDescription, 'Updated')).toBe(missingDescription);
    });

    it('replaces existing block scalar descriptions without swallowing later top-level fields', () => {
        const updated = replaceDescriptionInMarkdownFrontmatter(
            `---
name: test-agent
description: |
  Old line 1

  Old line 2
tools: [Read]
model: gpt-5.4
---

# Body`,
            `New intro line

<example>
user: "Refine this agent"
assistant: "Trim the description but keep one example."
</example>`,
        );

        expect(updated).toContain('description: |');
        expect(updated).toContain('  New intro line');
        expect(updated).toContain('tools: [Read]');
        expect(updated).toContain('model: gpt-5.4');
        expect(updated).not.toContain('Old line 1');
    });
});
