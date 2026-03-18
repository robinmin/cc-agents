#!/usr/bin/env bun
import { describe, expect, it } from 'bun:test';
import { rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { evaluateAgent } from '../scripts/evaluate';

const FIXTURES_DIR = resolve(import.meta.dir, 'fixtures');

describe('evaluateAgent', () => {
    it('should pass a well-structured specialist agent', async () => {
        const result = await evaluateAgent(resolve(FIXTURES_DIR, 'specialist-agent.md'), 'full');
        expect(result.passed).toBe(true);
        expect(result.grade).not.toBe('F');
        expect(result.percentage).toBeGreaterThan(0);
        expect(result.dimensions.length).toBe(10);
    });

    it('should score a minimal agent lower than specialist', async () => {
        const minimal = await evaluateAgent(resolve(FIXTURES_DIR, 'minimal-agent.md'), 'full');
        const specialist = await evaluateAgent(resolve(FIXTURES_DIR, 'specialist-agent.md'), 'full');
        expect(specialist.percentage).toBeGreaterThanOrEqual(minimal.percentage);
    });

    it('should reject agent with invalid frontmatter gracefully', async () => {
        const result = await evaluateAgent(resolve(FIXTURES_DIR, 'invalid-frontmatter.md'), 'full');
        expect(result.percentage).toBeLessThan(75);
    });

    it('should auto-detect weight profile', async () => {
        const minimal = await evaluateAgent(resolve(FIXTURES_DIR, 'minimal-agent.md'), 'full');
        expect(minimal.weightProfile).toBe('thin-wrapper');

        const specialist = await evaluateAgent(resolve(FIXTURES_DIR, 'specialist-agent.md'), 'full');
        expect(specialist.weightProfile).toBe('specialist');
    });

    it('should use correct grade boundaries', async () => {
        // Grade boundaries: A(90-100), B(80-89), C(70-79), D(60-69), F(<60)
        const result = await evaluateAgent(resolve(FIXTURES_DIR, 'specialist-agent.md'), 'full');
        if (result.percentage >= 90) expect(result.grade).toBe('A');
        else if (result.percentage >= 80) expect(result.grade).toBe('B');
        else if (result.percentage >= 70) expect(result.grade).toBe('C');
        else if (result.percentage >= 60) expect(result.grade).toBe('D');
        else expect(result.grade).toBe('F');
    });

    it('should mark agents below 75% as not passed', async () => {
        const result = await evaluateAgent(resolve(FIXTURES_DIR, 'invalid-frontmatter.md'), 'full');
        if (result.percentage < 75) {
            expect(result.passed).toBe(false);
        }
    });

    it('should return 10 dimensions in full scope', async () => {
        const result = await evaluateAgent(resolve(FIXTURES_DIR, 'standard-agent.md'), 'full');
        expect(result.dimensions.length).toBe(10);
        const names = result.dimensions.map((d) => d.name);
        expect(names).toContain('frontmatter-quality');
        expect(names).toContain('description-effectiveness');
        expect(names).toContain('body-quality');
        expect(names).toContain('tool-restriction');
        expect(names).toContain('thin-wrapper-compliance');
        expect(names).toContain('platform-compatibility');
        expect(names).toContain('naming-convention');
        expect(names).toContain('operational-readiness');
        expect(names).toContain('security-posture');
        expect(names).toContain('instruction-clarity');
    });

    it('should handle non-existent file', async () => {
        const result = await evaluateAgent('/non/existent/agent.md', 'full');
        expect(result.passed).toBe(false);
        expect(result.percentage).toBe(0);
    });

    it('should evaluate claude-only features', async () => {
        const result = await evaluateAgent(resolve(FIXTURES_DIR, 'claude-only-features.md'), 'full');
        expect(result.percentage).toBeGreaterThan(0);
    });

    it('should return weight profile for standard agent', async () => {
        const result = await evaluateAgent(resolve(FIXTURES_DIR, 'standard-agent.md'), 'full');
        expect(result.weightProfile).toBeDefined();
    });

    it('should detect security blacklist patterns', async () => {
        const result = await evaluateAgent(resolve(FIXTURES_DIR, 'security-test-agent.md'), 'full');
        // Security blacklist causes rejection (gatekeeper behavior)
        expect(result.rejected).toBe(true);
        expect(result.percentage).toBe(0);
        expect(result.rejectReason).toContain('Security blacklist violation');
    });

    it('should evaluate with basic scope', async () => {
        const result = await evaluateAgent(resolve(FIXTURES_DIR, 'minimal-agent.md'), 'basic');
        // Basic scope should return fewer dimensions
        expect(result.dimensions.length).toBeGreaterThan(0);
        expect(result.scope).toBe('basic');
    });

    it('should evaluate with full scope', async () => {
        const result = await evaluateAgent(resolve(FIXTURES_DIR, 'standard-agent.md'), 'full');
        expect(result.dimensions.length).toBeGreaterThan(0);
        expect(result.scope).toBe('full');
    });

    it('should handle agent with delegation language', async () => {
        // Create temp agent with delegation language
        const agentPath = resolve(FIXTURES_DIR, 'delegation-agent.md');
        const content = `---
name: delegation-agent
description: A test agent with delegation patterns
model: inherit
---

# Agent Body

This agent delegates to skills like rd2:super-coder and invokes the skill for implementation.
`;
        writeFileSync(agentPath, content);
        try {
            const result = await evaluateAgent(agentPath, 'full');
            expect(result.dimensions.length).toBe(10);
            const twDim = result.dimensions.find((d) => d.name === 'thin-wrapper-compliance');
            expect(twDim).toBeDefined();
            expect(twDim?.findings.join(' ')).toContain('delegation');
        } finally {
            rmSync(agentPath);
        }
    });

    it('should handle agent with implementation patterns', async () => {
        // Create temp agent with implementation patterns
        const agentPath = resolve(FIXTURES_DIR, 'impl-agent.md');
        const content = `---
name: impl-agent
description: A test agent with implementation patterns
model: inherit
---

# Agent Body

Here is a function I wrote:

\`\`\`typescript
function processData(input: string): void {
    console.log(input);
}
\`\`\`

And a class definition:
\`\`\`python
class DataProcessor:
    pass
\`\`\`
`;
        writeFileSync(agentPath, content);
        try {
            const result = await evaluateAgent(agentPath, 'full');
            expect(result.dimensions.length).toBe(10);
            const twDim = result.dimensions.find((d) => d.name === 'thin-wrapper-compliance');
            expect(twDim).toBeDefined();
            expect(twDim?.findings.join(' ')).toContain('Direct implementation patterns');
        } finally {
            rmSync(agentPath);
        }
    });

    it('should detect claude-only features', async () => {
        const result = await evaluateAgent(resolve(FIXTURES_DIR, 'claude-only-features.md'), 'full');
        expect(result.dimensions.length).toBe(10);
    });

    it('should evaluate agent body quality with missing sections', async () => {
        // Create agent with body > 50 lines but no rules or output format
        const agentPath = resolve(FIXTURES_DIR, 'no-rules-agent.md');
        let body = '# Agent Body\n\n';
        for (let i = 0; i < 60; i++) {
            body += `This is line ${i} of the agent body. It provides instructions.\n`;
        }
        const content = `---
name: no-rules-agent
description: A test agent without rules
model: inherit
---

${body}`;
        writeFileSync(agentPath, content);
        try {
            const result = await evaluateAgent(agentPath, 'full');
            expect(result.dimensions.length).toBe(10);
            const bodyDim = result.dimensions.find((d) => d.name === 'body-quality');
            expect(bodyDim).toBeDefined();
            // Should have recommendations for missing sections
            expect(bodyDim?.recommendations.join(' ')).toContain("DO/DON'T");
        } finally {
            rmSync(agentPath);
        }
    });

    it('should evaluate agent with YAML parse error', async () => {
        const agentPath = resolve(FIXTURES_DIR, 'parse-error-agent.md');
        const content = `---
name: parse-error-agent
description: Test
model: inherit
invalid: yaml: content: here

---

# Body`;
        writeFileSync(agentPath, content);
        try {
            const result = await evaluateAgent(agentPath, 'full');
            expect(result.dimensions.length).toBe(10);
            const fmDim = result.dimensions.find((d) => d.name === 'frontmatter-quality');
            expect(fmDim?.findings.join(' ')).toContain('YAML parse error');
        } finally {
            rmSync(agentPath);
        }
    });

    it('should evaluate agent with missing name', async () => {
        const agentPath = resolve(FIXTURES_DIR, 'no-name-agent.md');
        const content = `---
description: Test
model: inherit
---

# Body`;
        writeFileSync(agentPath, content);
        try {
            const result = await evaluateAgent(agentPath, 'full');
            expect(result.dimensions.length).toBe(10);
            const fmDim = result.dimensions.find((d) => d.name === 'frontmatter-quality');
            expect(fmDim?.findings.join(' ')).toContain('Missing required field: name');
        } finally {
            rmSync(agentPath);
        }
    });

    it('should evaluate agent with missing description', async () => {
        const agentPath = resolve(FIXTURES_DIR, 'no-desc-agent.md');
        const content = `---
name: test-agent
model: inherit
---

# Body`;
        writeFileSync(agentPath, content);
        try {
            const result = await evaluateAgent(agentPath, 'full');
            expect(result.dimensions.length).toBe(10);
            const fmDim = result.dimensions.find((d) => d.name === 'frontmatter-quality');
            expect(fmDim?.findings.join(' ')).toContain('Missing required field: description');
        } finally {
            rmSync(agentPath);
        }
    });

    it('should evaluate agent with non-string description', async () => {
        const agentPath = resolve(FIXTURES_DIR, 'nonstring-desc-agent.md');
        const content = `---
name: test-agent
description: 12345
model: inherit
---

# Body`;
        writeFileSync(agentPath, content);
        try {
            const result = await evaluateAgent(agentPath, 'full');
            expect(result.dimensions.length).toBe(10);
            const fmDim = result.dimensions.find((d) => d.name === 'frontmatter-quality');
            expect(fmDim?.findings.join(' ')).toContain('description must be a string');
        } finally {
            rmSync(agentPath);
        }
    });

    it('should evaluate agent with non-array tools', async () => {
        const agentPath = resolve(FIXTURES_DIR, 'bad-tools-agent.md');
        const content = `---
name: test-agent
description: Test
tools: not-an-array
---

# Body`;
        writeFileSync(agentPath, content);
        try {
            const result = await evaluateAgent(agentPath, 'full');
            expect(result.dimensions.length).toBe(10);
            const fmDim = result.dimensions.find((d) => d.name === 'frontmatter-quality');
            expect(fmDim?.findings.join(' ')).toContain('tools field must be an array');
        } finally {
            rmSync(agentPath);
        }
    });
});
