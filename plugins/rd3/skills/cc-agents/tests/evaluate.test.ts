#!/usr/bin/env bun
import { afterEach, describe, expect, it } from 'bun:test';
import { rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { evaluateAgent, renderBar, parseCliArgs, printUsage, printTextReport } from '../scripts/evaluate';
import { validateWeightProfile } from '../scripts/evaluation.config';
import type { AgentDimensionWeights } from '../scripts/evaluation.config';
import type { AgentEvaluationReport } from '../scripts/types';

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

    it('should evaluate agent with non-string name', async () => {
        const agentPath = resolve(FIXTURES_DIR, 'nonstring-name-agent.md');
        const content = `---
name: 12345
description: Test
model: inherit
---

# Body`;
        writeFileSync(agentPath, content);
        try {
            const result = await evaluateAgent(agentPath, 'full');
            expect(result.dimensions.length).toBe(10);
            const fmDim = result.dimensions.find((d) => d.name === 'frontmatter-quality');
            expect(fmDim?.findings.join(' ')).toContain('Field name must be a string');
        } finally {
            rmSync(agentPath);
        }
    });

    it('should evaluate agent with empty tools array', async () => {
        const agentPath = resolve(FIXTURES_DIR, 'empty-tools-agent.md');
        const content = `---
name: empty-tools-agent
description: Test agent with empty tools array
model: inherit
tools: []
---

# Agent Body

This agent has an empty tools array.
`;
        writeFileSync(agentPath, content);
        try {
            const result = await evaluateAgent(agentPath, 'full');
            expect(result.dimensions.length).toBe(10);
            const toolDim = result.dimensions.find((d) => d.name === 'tool-restriction');
            expect(toolDim?.findings.join(' ')).toContain('tools array is empty');
        } finally {
            rmSync(agentPath);
        }
    });

    it('should evaluate agent with large tools list (>20)', async () => {
        const agentPath = resolve(FIXTURES_DIR, 'large-tools-agent.md');
        const content = `---
name: large-tools-agent
description: Test agent with many tools
model: inherit
tools: ["Tool0", "Tool1", "Tool2", "Tool3", "Tool4", "Tool5", "Tool6", "Tool7", "Tool8", "Tool9", "Tool10", "Tool11", "Tool12", "Tool13", "Tool14", "Tool15", "Tool16", "Tool17", "Tool18", "Tool19", "Tool20", "Tool21", "Tool22", "Tool23", "Tool24"]
---

# Agent Body

This agent has many tools listed.
`;
        writeFileSync(agentPath, content);
        try {
            const result = await evaluateAgent(agentPath, 'full');
            expect(result.dimensions.length).toBe(10);
            const toolDim = result.dimensions.find((d) => d.name === 'tool-restriction');
            expect(toolDim?.findings.join(' ')).toContain('Large tools list');
        } finally {
            rmSync(agentPath);
        }
    });

    it('should evaluate agent with disallowedTools', async () => {
        const agentPath = resolve(FIXTURES_DIR, 'disallowed-tools-agent.md');
        const content = `---
name: disallowed-tools-agent
description: Test agent with disallowed tools
model: inherit
tools: ["Read", "Grep"]
disallowedTools: ["Bash", "Write"]
---

# Agent Body

This agent has disallowed tools specified.
`;
        writeFileSync(agentPath, content);
        try {
            const result = await evaluateAgent(agentPath, 'full');
            expect(result.dimensions.length).toBe(10);
            const toolDim = result.dimensions.find((d) => d.name === 'tool-restriction');
            expect(toolDim?.findings.join(' ')).toContain('2 tool(s) blacklisted');
        } finally {
            rmSync(agentPath);
        }
    });

    it('should evaluate agent with strong delegation language', async () => {
        const agentPath = resolve(FIXTURES_DIR, 'strong-delegation-agent.md');
        // Need enough body lines (>50) to avoid "short body" warning
        const bodyLines = [
            'This agent uses delegation patterns.',
            'It will delegate to the skill for complex tasks.',
            'It can invoke skill for implementation.',
            'It may run skill for execution.',
            'The skill handles the work.',
            'We use the skill approach.',
        ];
        const content = `---
name: strong-delegation-agent
description: Test agent with strong delegation patterns
model: inherit
---

# Agent Body

${bodyLines.join('\n')}

We also have delegation patterns here.
The agent can delegate to another agent.
`;
        writeFileSync(agentPath, content);
        try {
            const result = await evaluateAgent(agentPath, 'full');
            expect(result.dimensions.length).toBe(10);
            const twDim = result.dimensions.find((d) => d.name === 'thin-wrapper-compliance');
            expect(twDim?.findings.join(' ')).toContain('Strong delegation language present');
        } finally {
            rmSync(agentPath);
        }
    });

    it('should evaluate agent with empty body', async () => {
        const agentPath = resolve(FIXTURES_DIR, 'empty-body-agent.md');
        // Body must be whitespace-only after frontmatter to trigger "Agent body is empty"
        const content = `---
name: empty-body-agent
description: Test agent with empty body
model: inherit
---

   `;
        writeFileSync(agentPath, content);
        try {
            const result = await evaluateAgent(agentPath, 'full');
            expect(result.dimensions.length).toBe(10);
            const bodyDim = result.dimensions.find((d) => d.name === 'body-quality');
            expect(bodyDim?.findings.join(' ')).toContain('Agent body is empty');
        } finally {
            rmSync(agentPath);
        }
    });

    it('should detect Claude-specific syntax in body', async () => {
        const agentPath = resolve(FIXTURES_DIR, 'claude-syntax-agent.md');
        // Body with Claude-specific syntax to trigger platform syntax detection
        const content = `---
name: claude-syntax-agent
description: Test agent with Claude syntax
model: inherit
---

# Agent Body

Use the \`!ls\` command to list files.
The $ARGUMENTS variable is available.
Use context: fork for parallel execution.
`;
        writeFileSync(agentPath, content);
        try {
            const result = await evaluateAgent(agentPath, 'full');
            expect(result.dimensions.length).toBe(10);
            const platDim = result.dimensions.find((d) => d.name === 'platform-compatibility');
            expect(platDim?.findings.join(' ')).toContain('Platform-specific syntax detected');
        } finally {
            rmSync(agentPath);
        }
    });

    it('should detect Platform Notes section', async () => {
        const agentPath = resolve(FIXTURES_DIR, 'platform-notes-agent.md');
        // Body with Platform Notes section
        const content = `---
name: platform-notes-agent
description: Test agent with platform notes
model: inherit
---

# Agent Body

This agent works on Claude Code.

## Platform Notes

This agent is optimized for Claude Code.
`;
        writeFileSync(agentPath, content);
        try {
            const result = await evaluateAgent(agentPath, 'full');
            expect(result.dimensions.length).toBe(10);
            const platDim = result.dimensions.find((d) => d.name === 'platform-compatibility');
            expect(platDim?.findings.join(' ')).toContain('Platform notes section found');
        } finally {
            rmSync(agentPath);
        }
    });

    it('should recommend Platform Notes for large body without it', async () => {
        const agentPath = resolve(FIXTURES_DIR, 'large-no-platform-agent.md');
        // Body > 500 chars without Platform Notes section
        const longBody = 'A'.repeat(600);
        const content = `---
name: large-no-platform-agent
description: Test agent with large body
model: inherit
---

# Agent Body

${longBody}
`;
        writeFileSync(agentPath, content);
        try {
            const result = await evaluateAgent(agentPath, 'full');
            expect(result.dimensions.length).toBe(10);
            const platDim = result.dimensions.find((d) => d.name === 'platform-compatibility');
            expect(platDim?.recommendations.join(' ')).toContain('Add Platform Notes section');
        } finally {
            rmSync(agentPath);
        }
    });

    it('should detect greylist security patterns', async () => {
        const agentPath = resolve(FIXTURES_DIR, 'greylist-agent.md');
        // Greylist patterns like sudo without -n, chmod 777, etc.
        const content = `---
name: greylist-agent
description: Test agent with greylist patterns
model: inherit
---

# Agent Body

You can use sudo to install packages.
Run chmod 777 on the file.
Use chown -R root: on the directory.
`;
        writeFileSync(agentPath, content);
        try {
            const result = await evaluateAgent(agentPath, 'full');
            expect(result.dimensions.length).toBe(10);
            const secDim = result.dimensions.find((d) => d.name === 'security-posture');
            expect(secDim?.findings.join(' ')).toContain('Greylist patterns found');
        } finally {
            rmSync(agentPath);
        }
    });

    it('should detect TODO markers', async () => {
        const agentPath = resolve(FIXTURES_DIR, 'todo-agent.md');
        const content = `---
name: todo-agent
description: Test agent with TODO
model: inherit
---

# Agent Body

This agent has TODO items:
- TODO: implement feature X
- TODO: fix bug Y
`;
        writeFileSync(agentPath, content);
        try {
            const result = await evaluateAgent(agentPath, 'full');
            expect(result.dimensions.length).toBe(10);
            const opDim = result.dimensions.find((d) => d.name === 'operational-readiness');
            expect(opDim?.findings.join(' ')).toContain('TODO marker');
        } finally {
            rmSync(agentPath);
        }
    });

    it('should detect incomplete error handling', async () => {
        const agentPath = resolve(FIXTURES_DIR, 'no-error-agent.md');
        // Create agent without error handling mentions in body > 200 lines
        // Avoid words like error, fail, fallback, recovery, troubleshoot
        let body = 'This agent performs data processing.\n';
        body += 'It can process inputs and generate outputs.\n'.repeat(250);
        const content = `---
name: no-error-agent
description: Test agent without error handling
model: inherit
---

# Agent Body

${body}
`;
        writeFileSync(agentPath, content);
        try {
            const result = await evaluateAgent(agentPath, 'full');
            expect(result.dimensions.length).toBe(10);
            const opDim = result.dimensions.find((d) => d.name === 'operational-readiness');
            expect(opDim?.recommendations.join(' ')).toContain('Add error handling or fallback guidance');
        } finally {
            rmSync(agentPath);
        }
    });

    it('should detect excessive vague language', async () => {
        const agentPath = resolve(FIXTURES_DIR, 'vague-agent.md');
        // Need more than 2 instances of vague language patterns
        const content = `---
name: vague-agent
description: Test agent with vague language
model: inherit
---

# Agent Body

You can use this and that and etc for everything.
And so on and so forth with whatever you need.
And so on, etc, and whatever.
`;
        writeFileSync(agentPath, content);
        try {
            const result = await evaluateAgent(agentPath, 'full');
            expect(result.dimensions.length).toBe(10);
            const clarityDim = result.dimensions.find((d) => d.name === 'instruction-clarity');
            expect(clarityDim?.findings.join(' ')).toContain('instances of');
        } finally {
            rmSync(agentPath);
        }
    });

    it('should evaluate agent with no frontmatter', async () => {
        const agentPath = resolve(FIXTURES_DIR, 'no-frontmatter-agent.md');
        // No frontmatter delimiters at all
        const content = `# Agent Body

This agent has no frontmatter.
`;
        writeFileSync(agentPath, content);
        try {
            const result = await evaluateAgent(agentPath, 'full');
            expect(result.dimensions.length).toBe(10);
            const fmDim = result.dimensions.find((d) => d.name === 'frontmatter-quality');
            expect(fmDim?.findings.join(' ')).toContain('No frontmatter found');
        } finally {
            rmSync(agentPath);
        }
    });

    it('should evaluate agent with name too short', async () => {
        const agentPath = resolve(FIXTURES_DIR, 'short-name-agent.md');
        const content = `---
name: ab
description: Test agent with short name
model: inherit
---

# Agent Body

Short name test.
`;
        writeFileSync(agentPath, content);
        try {
            const result = await evaluateAgent(agentPath, 'full');
            expect(result.dimensions.length).toBe(10);
            const namingDim = result.dimensions.find((d) => d.name === 'naming-convention');
            expect(namingDim?.findings.join(' ')).toContain('Name too short');
        } finally {
            rmSync(agentPath);
        }
    });

    it('should evaluate agent with name too long', async () => {
        const agentPath = resolve(FIXTURES_DIR, 'long-name-agent.md');
        const longName = 'a'.repeat(55);
        const content = `---
name: ${longName}
description: Test agent with long name
model: inherit
---

# Agent Body

Long name test.
`;
        writeFileSync(agentPath, content);
        try {
            const result = await evaluateAgent(agentPath, 'full');
            expect(result.dimensions.length).toBe(10);
            const namingDim = result.dimensions.find((d) => d.name === 'naming-convention');
            expect(namingDim?.findings.join(' ')).toContain('Name too long');
        } finally {
            rmSync(agentPath);
        }
    });

    it('should evaluate agent with underscore in name', async () => {
        const agentPath = resolve(FIXTURES_DIR, 'underscore-name-agent.md');
        const content = `---
name: test_agent
description: Test agent with underscore name
model: inherit
---

# Agent Body

Underscore name test.
`;
        writeFileSync(agentPath, content);
        try {
            const result = await evaluateAgent(agentPath, 'full');
            expect(result.dimensions.length).toBe(10);
            const namingDim = result.dimensions.find((d) => d.name === 'naming-convention');
            expect(namingDim?.findings.join(' ')).toContain('Name contains underscores');
        } finally {
            rmSync(agentPath);
        }
    });

    it('should detect examples section in body', async () => {
        const agentPath = resolve(FIXTURES_DIR, 'examples-agent.md');
        const content = `---
name: examples-agent
description: Test agent with examples
model: inherit
---

# Agent Body

This agent has examples.

## Example

Example usage:
1. First step
2. Second step
`;
        writeFileSync(agentPath, content);
        try {
            const result = await evaluateAgent(agentPath, 'full');
            expect(result.dimensions.length).toBe(10);
            const opDim = result.dimensions.find((d) => d.name === 'operational-readiness');
            expect(opDim?.findings.join(' ')).toContain('Examples present');
        } finally {
            rmSync(agentPath);
        }
    });
});

describe('renderBar', () => {
    it('should render full bar at 100%', () => {
        const bar = renderBar(10, 10, 20);
        expect(bar).toContain('####################');
        expect(bar).toContain('100%');
    });

    it('should render empty bar at 0%', () => {
        const bar = renderBar(0, 10, 20);
        expect(bar).toContain('--------------------');
        expect(bar).toContain('0%');
    });

    it('should render half bar at 50%', () => {
        const bar = renderBar(5, 10, 20);
        expect(bar).toContain('##########----------');
        expect(bar).toContain('50%');
    });

    it('should handle maxScore of 0', () => {
        const bar = renderBar(0, 0, 20);
        expect(bar).toContain('--------------------');
        expect(bar).toContain('0%');
    });

    it('should use default width', () => {
        const bar = renderBar(10, 10);
        expect(bar).toContain('100%');
    });
});

describe('printTextReport', () => {
    const mockReport: AgentEvaluationReport = {
        agentPath: '/tmp/test-agent.md',
        agentName: 'test-agent',
        scope: 'full',
        weightProfile: 'thin-wrapper',
        overallScore: 80,
        maxScore: 100,
        percentage: 80,
        grade: 'B',
        dimensions: [
            {
                name: 'frontmatter-quality',
                displayName: 'Frontmatter Quality',
                weight: 10,
                score: 8,
                maxScore: 10,
                findings: ['Finding 1'],
                recommendations: ['Rec 1'],
            },
            {
                name: 'body-quality',
                displayName: 'Body Quality',
                weight: 15,
                score: 5,
                maxScore: 15,
                findings: ['Body finding'],
                recommendations: ['Body rec 1', 'Body rec 2'],
            },
        ],
        timestamp: new Date().toISOString(),
        passed: true,
        rejected: false,
    };

    it('should print report without error', () => {
        const logs: string[] = [];
        const origLog = console.log;
        console.log = (...args: unknown[]) => logs.push(args.join(' '));
        try {
            printTextReport(mockReport, false);
            const output = logs.join('\n');
            expect(output).toContain('test-agent');
            expect(output).toContain('PASS');
            expect(output).toContain('80%');
        } finally {
            console.log = origLog;
        }
    });

    it('should print verbose report with findings and recommendations', () => {
        const logs: string[] = [];
        const origLog = console.log;
        console.log = (...args: unknown[]) => logs.push(args.join(' '));
        try {
            printTextReport(mockReport, true);
            const output = logs.join('\n');
            expect(output).toContain('Finding 1');
            expect(output).toContain('Rec 1');
        } finally {
            console.log = origLog;
        }
    });

    it('should print rejection message for rejected report', () => {
        const rejectedReport = {
            ...mockReport,
            rejected: true,
            rejectReason: 'Security violation',
            passed: false,
            percentage: 0,
        };
        const logs: string[] = [];
        const origLog = console.log;
        console.log = (...args: unknown[]) => logs.push(args.join(' '));
        try {
            printTextReport(rejectedReport, false);
            const output = logs.join('\n');
            expect(output).toContain('REJECTED');
            expect(output).toContain('Security violation');
        } finally {
            console.log = origLog;
        }
    });

    it('should print FAIL status for non-passing report', () => {
        const failReport = { ...mockReport, passed: false, percentage: 50, grade: 'F' as const };
        const logs: string[] = [];
        const origLog = console.log;
        console.log = (...args: unknown[]) => logs.push(args.join(' '));
        try {
            printTextReport(failReport, false);
            const output = logs.join('\n');
            expect(output).toContain('FAIL');
        } finally {
            console.log = origLog;
        }
    });

    it('should truncate recommendations to 5 in non-verbose mode', () => {
        const manyRecsReport: AgentEvaluationReport = {
            ...mockReport,
            dimensions: [
                {
                    name: 'frontmatter-quality',
                    displayName: 'Test',
                    weight: 10,
                    score: 2,
                    maxScore: 10,
                    findings: [],
                    recommendations: ['Rec 1', 'Rec 2', 'Rec 3', 'Rec 4', 'Rec 5', 'Rec 6', 'Rec 7'],
                },
            ],
        };
        const logs: string[] = [];
        const origLog = console.log;
        console.log = (...args: unknown[]) => logs.push(args.join(' '));
        try {
            printTextReport(manyRecsReport, false);
            const output = logs.join('\n');
            expect(output).toContain('and 2 more');
        } finally {
            console.log = origLog;
        }
    });
});

describe('printUsage', () => {
    it('should print usage information', () => {
        const logs: string[] = [];
        const origLog = console.log;
        console.log = (...args: unknown[]) => logs.push(args.join(' '));
        try {
            printUsage();
            const output = logs.join('\n');
            expect(output).toContain('Usage:');
            expect(output).toContain('agent-path');
            expect(output).toContain('--scope');
            expect(output).toContain('--profile');
            expect(output).toContain('--output');
            expect(output).toContain('--verbose');
        } finally {
            console.log = origLog;
        }
    });
});

describe('parseCliArgs', () => {
    const origArgv = process.argv;

    afterEach(() => {
        process.argv = origArgv;
    });

    it('should parse valid arguments', () => {
        process.argv = [
            'bun',
            'evaluate.ts',
            'test.md',
            '--scope',
            'basic',
            '--profile',
            'specialist',
            '--output',
            'json',
            '--verbose',
        ];
        const result = parseCliArgs();
        expect(result.path).toBe('test.md');
        expect(result.scope).toBe('basic');
        expect(result.profile).toBe('specialist');
        expect(result.output).toBe('json');
        expect(result.verbose).toBe(true);
    });

    it('should use defaults for missing options', () => {
        process.argv = ['bun', 'evaluate.ts', 'test.md'];
        const result = parseCliArgs();
        expect(result.path).toBe('test.md');
        expect(result.scope).toBe('full');
        expect(result.profile).toBeUndefined();
        expect(result.output).toBe('text');
        expect(result.verbose).toBe(false);
    });

    it('should handle auto profile as undefined', () => {
        process.argv = ['bun', 'evaluate.ts', 'test.md', '--profile', 'auto'];
        const result = parseCliArgs();
        expect(result.profile).toBeUndefined();
    });

    it('should handle thin-wrapper profile', () => {
        process.argv = ['bun', 'evaluate.ts', 'test.md', '--profile', 'thin-wrapper'];
        const result = parseCliArgs();
        expect(result.profile).toBe('thin-wrapper');
    });

    it('should exit on missing path', () => {
        process.argv = ['bun', 'evaluate.ts'];
        const origExit = process.exit;
        let exitCode: number | undefined;
        process.exit = ((code?: number) => {
            exitCode = code;
            throw new Error('exit');
        }) as (code?: number) => never;
        try {
            parseCliArgs();
        } catch (e: unknown) {
            if (!(e instanceof Error) || e.message !== 'exit') throw e;
        } finally {
            process.exit = origExit;
        }
        expect(exitCode).toBe(1);
    });

    it('should exit on invalid scope', () => {
        process.argv = ['bun', 'evaluate.ts', 'test.md', '--scope', 'invalid'];
        const origExit = process.exit;
        let exitCode: number | undefined;
        process.exit = ((code?: number) => {
            exitCode = code;
            throw new Error('exit');
        }) as (code?: number) => never;
        try {
            parseCliArgs();
        } catch (e: unknown) {
            if (!(e instanceof Error) || e.message !== 'exit') throw e;
        } finally {
            process.exit = origExit;
        }
        expect(exitCode).toBe(1);
    });

    it('should exit on invalid profile', () => {
        process.argv = ['bun', 'evaluate.ts', 'test.md', '--profile', 'invalid'];
        const origExit = process.exit;
        let exitCode: number | undefined;
        process.exit = ((code?: number) => {
            exitCode = code;
            throw new Error('exit');
        }) as (code?: number) => never;
        try {
            parseCliArgs();
        } catch (e: unknown) {
            if (!(e instanceof Error) || e.message !== 'exit') throw e;
        } finally {
            process.exit = origExit;
        }
        expect(exitCode).toBe(1);
    });

    it('should exit on invalid output format', () => {
        process.argv = ['bun', 'evaluate.ts', 'test.md', '--output', 'invalid'];
        const origExit = process.exit;
        let exitCode: number | undefined;
        process.exit = ((code?: number) => {
            exitCode = code;
            throw new Error('exit');
        }) as (code?: number) => never;
        try {
            parseCliArgs();
        } catch (e: unknown) {
            if (!(e instanceof Error) || e.message !== 'exit') throw e;
        } finally {
            process.exit = origExit;
        }
        expect(exitCode).toBe(1);
    });

    it('should exit on --help', () => {
        process.argv = ['bun', 'evaluate.ts', '--help'];
        const origExit = process.exit;
        let exitCode: number | undefined;
        process.exit = ((code?: number) => {
            exitCode = code;
            throw new Error('exit');
        }) as (code?: number) => never;
        try {
            parseCliArgs();
        } catch (e: unknown) {
            if (!(e instanceof Error) || e.message !== 'exit') throw e;
        } finally {
            process.exit = origExit;
        }
        expect(exitCode).toBe(0);
    });
});

describe('evaluateAgent - additional coverage', () => {
    it('should detect OpenAI API key pattern in body', async () => {
        const agentPath = resolve(FIXTURES_DIR, 'openai-key-agent.md');
        // Use sk- pattern which triggers scoreSecurityPosture credential check
        // but does NOT match the blacklist pattern (which requires password/api_key/secret followed by := "value")
        const content = `---
name: openai-key-agent
description: Test agent with OpenAI key pattern
model: inherit
---

# Agent Body

The key looks like sk-abcdefghijklmnopqrstuvwxyz1234567890abcdef for API access.
`;
        writeFileSync(agentPath, content);
        try {
            const result = await evaluateAgent(agentPath, 'full');
            expect(result.rejected).toBe(false);
            expect(result.dimensions.length).toBe(10);
            const secDim = result.dimensions.find((d) => d.name === 'security-posture');
            expect(secDim?.findings.join(' ')).toContain('Potential hardcoded credentials');
        } finally {
            rmSync(agentPath);
        }
    });

    it('should evaluate naming with no name and no filename fallback', async () => {
        // Agent with numeric name (YAML parses as number)
        const agentPath = resolve(FIXTURES_DIR, 'numeric-name-agent.md');
        const content = `---
name: 99999
description: Test agent with numeric name
model: inherit
---

# Agent Body

Numeric name test.
`;
        writeFileSync(agentPath, content);
        try {
            const result = await evaluateAgent(agentPath, 'full');
            const namingDim = result.dimensions.find((d) => d.name === 'naming-convention');
            expect(namingDim?.findings.join(' ')).toContain('must be a string');
        } finally {
            rmSync(agentPath);
        }
    });

    it('should evaluate with explicit weight profile override', async () => {
        const result = await evaluateAgent(resolve(FIXTURES_DIR, 'minimal-agent.md'), 'full', 'specialist');
        expect(result.weightProfile).toBe('specialist');
    });

    it('should evaluate with explicit thin-wrapper profile override', async () => {
        const result = await evaluateAgent(resolve(FIXTURES_DIR, 'specialist-agent.md'), 'full', 'thin-wrapper');
        expect(result.weightProfile).toBe('thin-wrapper');
    });

    it('should return rejected=false and weight profile for non-existent file', async () => {
        const result = await evaluateAgent('/non/existent/path.md', 'full');
        expect(result.rejected).toBe(false);
        expect(result.rejectReason).toContain('Agent file not found');
        expect(result.weightProfile).toBe('thin-wrapper');
    });

    it('should return rejected=false with explicit profile for non-existent file', async () => {
        const result = await evaluateAgent('/non/existent/path.md', 'full', 'specialist');
        expect(result.weightProfile).toBe('specialist');
    });

    it('should detect body referencing tools not in whitelist', async () => {
        const agentPath = resolve(FIXTURES_DIR, 'tool-mismatch-agent.md');
        const content = `---
name: tool-mismatch-agent
description: Test agent with tool mismatch
model: inherit
tools: ["Read"]
---

# Agent Body

Use Bash to run commands and WebSearch for finding info.
Also use Grep to search files.
`;
        writeFileSync(agentPath, content);
        try {
            const result = await evaluateAgent(agentPath, 'full');
            const toolDim = result.dimensions.find((d) => d.name === 'tool-restriction');
            expect(toolDim?.findings.join(' ')).toContain('Body references tools not in whitelist');
        } finally {
            rmSync(agentPath);
        }
    });

    it('should apply greylist penalty to overall score', async () => {
        const agentPath = resolve(FIXTURES_DIR, 'greylist-penalty-agent.md');
        const content = `---
name: greylist-penalty-agent
description: Use PROACTIVELY for test with greylist. Create, implement, build with examples.
tools: ["Read", "Grep"]
skills: ["rd2:test-skill"]
model: inherit
---

# Agent Body

This agent can sudo install packages.
Run chmod 777 on the file for permissions.
Delegate to the skill for the work.
Invoke skill rd2:test-skill for processing.

## Example

Here is an example of how to use this agent.

## Rules

### Do
- Ensure correct output

### Don't
- Skip validation

## Output Format

Return markdown output template.

## Role

This is a verification and error handling agent with fallback recovery.
`;
        writeFileSync(agentPath, content);
        try {
            const result = await evaluateAgent(agentPath, 'full');
            // Greylist findings should be attached to first dimension
            const firstDimFindings = result.dimensions[0].findings.join(' ');
            expect(firstDimFindings).toContain('GREYLIST');
        } finally {
            rmSync(agentPath);
        }
    });

    it('should score description with long description (>500 chars)', async () => {
        const agentPath = resolve(FIXTURES_DIR, 'long-desc-agent.md');
        const longDesc = `Use PROACTIVELY for ${'a'.repeat(500)}`;
        const content = `---
name: long-desc-agent
description: "${longDesc}"
model: inherit
---

# Agent Body

Content here.
`;
        writeFileSync(agentPath, content);
        try {
            const result = await evaluateAgent(agentPath, 'full');
            const descDim = result.dimensions.find((d) => d.name === 'description-effectiveness');
            expect(descDim?.findings.join(' ')).toContain('too long');
        } finally {
            rmSync(agentPath);
        }
    });

    it('should score description with short description (<20 chars)', async () => {
        const agentPath = resolve(FIXTURES_DIR, 'short-desc-agent.md');
        const content = `---
name: short-desc-agent
description: "Short"
model: inherit
---

# Agent Body

Content here.
`;
        writeFileSync(agentPath, content);
        try {
            const result = await evaluateAgent(agentPath, 'full');
            const descDim = result.dimensions.find((d) => d.name === 'description-effectiveness');
            expect(descDim?.findings.join(' ')).toContain('too short');
        } finally {
            rmSync(agentPath);
        }
    });

    it('should detect rich trigger vocabulary in description', async () => {
        const agentPath = resolve(FIXTURES_DIR, 'trigger-vocab-agent.md');
        const content = `---
name: trigger-vocab-agent
description: "Use PROACTIVELY to implement, create, and review code with <example> blocks"
model: inherit
---

# Agent Body

Content here.
`;
        writeFileSync(agentPath, content);
        try {
            const result = await evaluateAgent(agentPath, 'full');
            const descDim = result.dimensions.find((d) => d.name === 'description-effectiveness');
            expect(descDim?.findings.join(' ')).toContain('Rich trigger vocabulary');
        } finally {
            rmSync(agentPath);
        }
    });

    it('should detect agent with Claude-specific frontmatter fields', async () => {
        const agentPath = resolve(FIXTURES_DIR, 'claude-fm-fields-agent.md');
        const content = `---
name: claude-fm-fields-agent
description: Test agent with Claude-specific fields
model: inherit
permissionMode: bypassPermissions
isolation: worktree
background: true
---

# Agent Body

Content here.
`;
        writeFileSync(agentPath, content);
        try {
            const result = await evaluateAgent(agentPath, 'full');
            const platDim = result.dimensions.find((d) => d.name === 'platform-compatibility');
            expect(platDim?.findings.join(' ')).toContain('Claude-specific fields');
        } finally {
            rmSync(agentPath);
        }
    });

    it('should detect role-prefix naming pattern', async () => {
        const agentPath = resolve(FIXTURES_DIR, 'super-test-agent.md');
        const content = `---
name: super-test-agent
description: Test agent with role prefix
model: inherit
---

# Agent Body

Content here.
`;
        writeFileSync(agentPath, content);
        try {
            const result = await evaluateAgent(agentPath, 'full');
            const namingDim = result.dimensions.find((d) => d.name === 'naming-convention');
            expect(namingDim?.findings.join(' ')).toContain('role-prefix naming pattern');
        } finally {
            rmSync(agentPath, { force: true });
        }
    });

    it('should detect output format section in body', async () => {
        const agentPath = resolve(FIXTURES_DIR, 'output-format-agent.md');
        const content = `---
name: output-format-agent
description: Test agent with output format
model: inherit
---

# Agent Body

This agent produces structured output.

## Output Format

Return the result as JSON:

\`\`\`json
{"result": "value"}
\`\`\`

output template for consistent formatting.
`;
        writeFileSync(agentPath, content);
        try {
            const result = await evaluateAgent(agentPath, 'full');
            const opDim = result.dimensions.find((d) => d.name === 'operational-readiness');
            expect(opDim?.findings.join(' ')).toContain('Output format defined');
        } finally {
            rmSync(agentPath, { force: true });
        }
    });

    it('should detect verification guidance in body', async () => {
        const agentPath = resolve(FIXTURES_DIR, 'verification-agent.md');
        const content = `---
name: verification-agent
description: Test agent with verification
model: inherit
---

# Agent Body

Always verify the output before returning.
Check that all fields are present.
Validate the response format.
`;
        writeFileSync(agentPath, content);
        try {
            const result = await evaluateAgent(agentPath, 'full');
            const opDim = result.dimensions.find((d) => d.name === 'operational-readiness');
            expect(opDim?.findings.join(' ')).toContain('Verification guidance present');
        } finally {
            rmSync(agentPath, { force: true });
        }
    });
});

describe('validateWeightProfile', () => {
    const validWeights: AgentDimensionWeights = {
        frontmatterQuality: 10,
        descriptionEffectiveness: 10,
        bodyQuality: 15,
        toolRestriction: 10,
        thinWrapperCompliance: 10,
        platformCompatibility: 10,
        namingConvention: 10,
        operationalReadiness: 10,
        securityPosture: 10,
        instructionClarity: 5,
    };

    it('should return valid=true for weights summing to 100', () => {
        const result = validateWeightProfile(validWeights);
        expect(result.valid).toBe(true);
        expect(result.sum).toBe(100);
    });

    it('should return valid=false for weights summing to less than 100', () => {
        const weights = { ...validWeights, frontmatterQuality: 5 };
        const result = validateWeightProfile(weights);
        expect(result.valid).toBe(false);
        expect(result.sum).toBe(95);
    });

    it('should return valid=false for weights summing to more than 100', () => {
        const weights = { ...validWeights, frontmatterQuality: 15 };
        const result = validateWeightProfile(weights);
        expect(result.valid).toBe(false);
        expect(result.sum).toBe(105);
    });
});
