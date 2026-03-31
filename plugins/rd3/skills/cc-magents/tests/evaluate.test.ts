import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdtempSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setGlobalSilent } from '../../../scripts/logger';
import {
    evaluateMagentConfig,
    formatEvaluateReport,
    getEvaluateHelp,
    handleEvaluateCLI,
    parseEvaluateArgs,
    runEvaluate,
} from '../scripts/evaluate';
import { MAGENT_EVALUATION_CONFIG } from '../scripts/evaluation.config';
import type { MagentValidationResult } from '../scripts/types';

let TEST_DIR = '';

function createTestDir(): string {
    return mkdtempSync(join(tmpdir(), 'cc-magents-evaluate-'));
}

function createTestFile(name: string, content: string): string {
    const filePath = join(TEST_DIR, name);
    writeFileSync(filePath, content, 'utf-8');
    return filePath;
}

function createValidationResult(overrides: Partial<MagentValidationResult> = {}): MagentValidationResult {
    return {
        valid: true,
        errors: [],
        warnings: [],
        suggestions: [],
        findings: [],
        filePath: '/test.md',
        detectedPlatform: 'agents-md',
        fileSize: 0,
        estimatedTokens: 0,
        sectionCount: 0,
        timestamp: '2024-01-01T00:00:00.000Z',
        ...overrides,
    };
}

describe('evaluate', () => {
    beforeEach(() => {
        TEST_DIR = createTestDir();
        setGlobalSilent(true);
    });

    afterEach(() => {
        setGlobalSilent(false);
        rmSync(TEST_DIR, { recursive: true, force: true });
        TEST_DIR = '';
    });

    describe('evaluateMagentConfig', () => {
        it('should evaluate a well-formed AGENTS.md', async () => {
            const content = `# Identity

I am a helpful agent.

## Rules

- Be helpful
- Be honest

## Tools

Use Read and Write tools.

## Standards

Follow clean code principles.`;

            const filePath = createTestFile('AGENTS.md', content);
            const result = await evaluateMagentConfig(filePath, content);

            expect(result.filePath).toBe(filePath);
            expect(result.dimensions.length).toBe(5);
            expect(result.overallScore).toBeGreaterThan(0);
            expect(result.overallScore).toBeLessThanOrEqual(100);
            unlinkSync(filePath);
        });

        it('should evaluate with explicit platform', async () => {
            const content = `# Identity

I am Claude Code.`;

            const filePath = createTestFile('CLAUDE.md', content);
            const result = await evaluateMagentConfig(filePath, content, 'standard', 'claude-md');

            expect(result.platform).toBe('claude-md');
            expect(result.dimensions.length).toBe(5);
            unlinkSync(filePath);
        });

        it('should evaluate with different weight profiles', async () => {
            const content = `# Identity

I am a test agent.

## Rules

- Rule 1
- Rule 2

## Tools

Use Read.`;

            const filePath = createTestFile('test.md', content);

            const standardResult = await evaluateMagentConfig(filePath, content, 'standard');
            const minimalResult = await evaluateMagentConfig(filePath, content, 'minimal');
            const advancedResult = await evaluateMagentConfig(filePath, content, 'advanced');

            expect(standardResult.overallScore).toBeGreaterThan(0);
            expect(minimalResult.overallScore).toBeGreaterThan(0);
            expect(advancedResult.overallScore).toBeGreaterThan(0);
            // Different profiles should produce different scores
            expect(standardResult.overallScore).not.toBe(minimalResult.overallScore);
            unlinkSync(filePath);
        });

        it('should detect empty sections in evaluation', async () => {
            const content = `# Identity

I am a test.

## Empty Section


## Another Empty

### Deep Empty`;

            const filePath = createTestFile('empty.md', content);
            const result = await evaluateMagentConfig(filePath, content);

            // Should have findings about empty sections
            const completenessDim = result.dimensions.find((d) => d.dimension === 'coverage');
            expect(completenessDim).toBeDefined();
            expect(completenessDim?.findings.some((f) => f.includes('empty'))).toBe(true);
            unlinkSync(filePath);
        });

        it('should detect examples in content', async () => {
            const content = `# Identity

I am a test.

## Rules

For example, when doing X:
- Step 1
- Step 2

Another example:
- Case A
- Case B`;

            const filePath = createTestFile('examples.md', content);
            const result = await evaluateMagentConfig(filePath, content);

            const specificityDim = result.dimensions.find((d) => d.dimension === 'operability');
            expect(specificityDim).toBeDefined();
            // Should find example blocks
            expect(specificityDim?.findings.some((f) => f.includes('example'))).toBe(true);
            unlinkSync(filePath);
        });

        it('should detect version references', async () => {
            const content = `# Identity

I am a test.

## Rules

Version 1.0: Initial release
Updated in version 2.0
Version 3.0 added feature X`;

            const filePath = createTestFile('versions.md', content);
            const result = await evaluateMagentConfig(filePath, content);

            const specificityDim = result.dimensions.find((d) => d.dimension === 'operability');
            expect(specificityDim).toBeDefined();
            expect(specificityDim?.findings.some((f) => f.includes('version'))).toBe(true);
            unlinkSync(filePath);
        });

        it('should detect concrete thresholds', async () => {
            const content = `# Identity

I am a test.

## Rules

- Response time should be under 100ms
- Max file size: 50MB
- Timeout: 30s
- At least 80% coverage`;

            const filePath = createTestFile('thresholds.md', content);
            const result = await evaluateMagentConfig(filePath, content);

            const specificityDim = result.dimensions.find((d) => d.dimension === 'operability');
            expect(specificityDim).toBeDefined();
            expect(specificityDim?.findings.some((f) => f.includes('constraint'))).toBe(true);
            unlinkSync(filePath);
        });

        it('should detect output contract patterns in content', async () => {
            const content = `# Identity

I am a test.

## Output

Response format:
- Start with a short summary
- End with JSON
- Include file references in markdown`;

            const filePath = createTestFile('tables.md', content);
            const result = await evaluateMagentConfig(filePath, content);

            const specificityDim = result.dimensions.find((d) => d.dimension === 'operability');
            expect(specificityDim).toBeDefined();
            expect(specificityDim?.findings.some((f) => f.includes('output contract'))).toBe(true);
            unlinkSync(filePath);
        });

        it('should detect decision trees', async () => {
            const content = `# Identity

I am a test.

## Rules

When to Use:
- Use this for simple tasks

When NOT to Use:
- Don't use for complex multi-step operations`;

            const filePath = createTestFile('decisions.md', content);
            const result = await evaluateMagentConfig(filePath, content);

            const specificityDim = result.dimensions.find((d) => d.dimension === 'operability');
            expect(specificityDim).toBeDefined();
            // Decision tree findings say "Decision tree" or contain "When"
            expect(specificityDim?.findings.some((f) => f.includes('Decision') || f.includes('When'))).toBe(true);
            unlinkSync(filePath);
        });

        it('should detect IF-THEN decision tree patterns', async () => {
            const content = `# Identity

I am a test.

## Tools

IF error THEN retry with exponential backoff
- Check error type
- Log the error`;

            const filePath = createTestFile('ifthen.md', content);
            const result = await evaluateMagentConfig(filePath, content);

            const specificityDim = result.dimensions.find((d) => d.dimension === 'operability');
            expect(specificityDim).toBeDefined();
            // IF-THEN pattern should contribute to operability score
            expect(specificityDim?.percentage).toBeGreaterThan(0);
            unlinkSync(filePath);
        });

        it('should detect version patterns v1.0.0', async () => {
            const content = `# Identity

I am a test.

## Rules

Version 1.0.0: Initial release
Updated in version 2.0.1
Version 3.0.0 added feature X`;

            const filePath = createTestFile('versions.md', content);
            const result = await evaluateMagentConfig(filePath, content);

            const specificityDim = result.dimensions.find((d) => d.dimension === 'operability');
            expect(specificityDim).toBeDefined();
            // Version patterns should contribute to operability score
            expect(specificityDim?.percentage).toBeGreaterThan(0);
            unlinkSync(filePath);
        });

        it('should detect code block commands', async () => {
            const content = `# Identity

I am a test.

## Tools

\`\`\`bash
$ npm install
$ npm test
\`\`\``;

            const filePath = createTestFile('commands.md', content);
            const result = await evaluateMagentConfig(filePath, content);

            const specificityDim = result.dimensions.find((d) => d.dimension === 'operability');
            expect(specificityDim).toBeDefined();
            // Command patterns should contribute to operability score
            expect(specificityDim?.percentage).toBeGreaterThan(0);
            unlinkSync(filePath);
        });

        it('should detect anti-hallucination patterns', async () => {
            const content = `# Identity

I am a test.

## Rules

- Always verify facts before responding
- Cross-reference with documentation
- If uncertain, say you don't know`;

            const filePath = createTestFile('antihall.md', content);
            const result = await evaluateMagentConfig(filePath, content);

            const verifiabilityDim = result.dimensions.find((d) => d.dimension === 'grounding');
            expect(verifiabilityDim).toBeDefined();
            expect(
                verifiabilityDim?.findings.some((f) => f.includes('uncertainty') || f.includes('verification')),
            ).toBe(true);
            unlinkSync(filePath);
        });

        it('should detect anti-patterns', async () => {
            const content = `# Identity

I am a test.

## Rules

- Do not use eval()
- Never use shell: for commands
- Avoid hardcoded secrets`;

            const filePath = createTestFile('safety.md', content);
            const result = await evaluateMagentConfig(filePath, content);

            const safetyDim = result.dimensions.find((d) => d.dimension === 'safety');
            expect(safetyDim).toBeDefined();
            expect(safetyDim?.findings.some((f) => f.toLowerCase().includes('anti') || f.includes('pattern'))).toBe(
                true,
            );
            unlinkSync(filePath);
        });

        it('should calculate overall score and grade', async () => {
            const content = `# Identity

I am a comprehensive test agent that helps with development tasks.

## Rules

- Be helpful and honest
- Follow best practices
- Write clean code

## Tools

- Read: Read files from disk
- Write: Write files to disk
- Bash: Execute shell commands

## Standards

- Use TypeScript
- Follow ESLint rules
- Write unit tests

## Verification

Run: npm test`;

            const filePath = createTestFile('comprehensive.md', content);
            const result = await evaluateMagentConfig(filePath, content);

            expect(result.overallScore).toBeGreaterThan(0);
            expect(['A', 'B', 'C', 'D', 'F']).toContain(result.grade);
            expect(result.passed).toBeDefined();
            unlinkSync(filePath);
        });

        it('should include optional categories in scoring', async () => {
            const content = `# Identity

I am a test.

## Rules

Be helpful.

## Tools

Use Read.

## Memory

Remember previous interactions.

## Evolution

Update behavior based on feedback.

## Testing

Write tests before deployment.

## Planning

Plan before implementing.

## Error Handling

Handle errors gracefully.`;

            const filePath = createTestFile('optional-cats.md', content);
            const result = await evaluateMagentConfig(filePath, content);

            expect(result.overallScore).toBeGreaterThan(0);
            // Should have completeness dimension with optional category findings
            const completenessDim = result.dimensions.find((d) => d.dimension === 'coverage');
            expect(completenessDim).toBeDefined();
            // Should find optional categories
            const foundOptionalFindings = completenessDim?.findings.filter((f) => f.includes('optional')) ?? [];
            expect(foundOptionalFindings.length).toBeGreaterThan(0);
            unlinkSync(filePath);
        });

        it('should calculate coverage with multiple substance levels', async () => {
            const content = `# Identity

Short.

## Rules

x

## Tools

x

## Standards

x

## Workflow

x

## Memory

This section has more substantial content that goes beyond two hundred characters to ensure it scores at the highest substance level for section evaluation purposes. More content here makes it a robust and comprehensive section.

## Additional

Even more substantial content here that continues to build out the section with real examples of how this agent should behave in various situations throughout the development process.`;

            const filePath = createTestFile('substance.md', content);
            const result = await evaluateMagentConfig(filePath, content);

            expect(result.overallScore).toBeGreaterThan(0);
            const completenessDim = result.dimensions.find((d) => d.dimension === 'coverage');
            expect(completenessDim).toBeDefined();
            unlinkSync(filePath);
        });

        it('should detect steering/preferences patterns for maintainability', async () => {
            const content = `# Identity

I am a test.

## Rules

Be helpful.

## Tools

Use Read.

## Preferences

Default timeout: 30s
Default retries: 3
Prefer async operations.`;

            const filePath = createTestFile('preferences.md', content);
            const result = await evaluateMagentConfig(filePath, content);

            const evolutionDim = result.dimensions.find((d) => d.dimension === 'maintainability');
            expect(evolutionDim).toBeDefined();
            // Should have steering/preference findings
            expect(evolutionDim?.findings.some((f) => f.includes('steering') || f.includes('preference'))).toBe(true);
            unlinkSync(filePath);
        });

        it('should detect changelog/version history patterns', async () => {
            const content = `# Identity

I am a test.

## Rules

Be helpful.

## Tools

Use Read.

## Changelog

v1.0.0: Initial release
v1.1.0: Added feature X
v2.0.0: Major rewrite`;

            const filePath = createTestFile('changelog.md', content);
            const result = await evaluateMagentConfig(filePath, content);

            const evolutionDim = result.dimensions.find((d) => d.dimension === 'maintainability');
            expect(evolutionDim).toBeDefined();
            expect(evolutionDim?.findings.some((f) => f.includes('versioning') || f.includes('change-tracking'))).toBe(
                true,
            );
            unlinkSync(filePath);
        });

        it('should detect feedback patterns for maintainability', async () => {
            const content = `# Identity

I am a test.

## Rules

Be helpful.

## Tools

Use Read.

## Feedback

User feedback improves responses.
Collect metrics on task completion.
Iterate based on user ratings.`;

            const filePath = createTestFile('feedback.md', content);
            const result = await evaluateMagentConfig(filePath, content);

            const evolutionDim = result.dimensions.find((d) => d.dimension === 'maintainability');
            expect(evolutionDim).toBeDefined();
            expect(evolutionDim?.percentage).toBeGreaterThan(0);
            unlinkSync(filePath);
        });

        it('should detect destructive action warnings', async () => {
            const content = `# Identity

I am a test agent.

## Rules

- NEVER use force push
- MUST NOT delete production data
- DO NOT run rm -rf without backup
- Always create rollback points
- Use reversible operations when possible`;

            const filePath = createTestFile('destructive.md', content);
            const result = await evaluateMagentConfig(filePath, content);

            const safetyDim = result.dimensions.find((d) => d.dimension === 'safety');
            expect(safetyDim).toBeDefined();
            // Should have findings about destructive warnings
            expect(
                safetyDim?.findings.some((f) => f.toLowerCase().includes('destructive') || f.includes('warnings')),
            ).toBe(true);
            unlinkSync(filePath);
        });

        it('should detect permission boundary patterns', async () => {
            const content = `# Identity

I am a test agent.

## Rules

- Get user permission before executing shell commands
- Require approval for destructive operations
- Always ask before modifying system files
- Seek user consent for network operations`;

            const filePath = createTestFile('permissions.md', content);
            const result = await evaluateMagentConfig(filePath, content);

            const safetyDim = result.dimensions.find((d) => d.dimension === 'safety');
            expect(safetyDim).toBeDefined();
            // Should have findings about permission boundaries
            expect(safetyDim?.findings.some((f) => f.toLowerCase().includes('permission'))).toBe(true);
            unlinkSync(filePath);
        });

        it('should detect PII protection indicators', async () => {
            const content = `# Identity

I am a test agent.

## Rules

- Never expose user PII in logs
- Comply with GDPR data protection requirements
- Handle personally identifiable information securely
- Follow privacy best practices for customer data`;

            const filePath = createTestFile('pii.md', content);
            const result = await evaluateMagentConfig(filePath, content);

            const safetyDim = result.dimensions.find((d) => d.dimension === 'safety');
            expect(safetyDim).toBeDefined();
            // Should have findings about PII protection
            expect(
                safetyDim?.findings.some((f) => f.toLowerCase().includes('pii') || f.toLowerCase().includes('privacy')),
            ).toBe(true);
            unlinkSync(filePath);
        });

        it('should calculate safety score with multiple safety indicators', async () => {
            const content = `# Identity

I am a secure agent.

## Rules

[CRITICAL] Never leak secrets
- MUST NOT expose API keys
- NEVER force push to main
- Always use permission checks
- Backup before destructive operations
- Protect user credentials`;

            const filePath = createTestFile('multi-safety.md', content);
            const result = await evaluateMagentConfig(filePath, content);

            const safetyDim = result.dimensions.find((d) => d.dimension === 'safety');
            expect(safetyDim).toBeDefined();
            expect(safetyDim?.percentage).toBeGreaterThan(0);
            expect(safetyDim?.findings.length).toBeGreaterThan(0);
            unlinkSync(filePath);
        });

        it('should detect critical markers in sections', async () => {
            const content = `# Identity

I am a test.

## Critical Rules

[CRITICAL] This is a critical rule
ALWAYS verify before acting
MUST NOT proceed without validation`;

            const filePath = createTestFile('critical.md', content);
            const result = await evaluateMagentConfig(filePath, content);

            const safetyDim = result.dimensions.find((d) => d.dimension === 'safety');
            expect(safetyDim).toBeDefined();
            expect(safetyDim?.percentage).toBeGreaterThan(0);
            unlinkSync(filePath);
        });

        it('should detect secret protection patterns', async () => {
            const content = `# Identity

I am a test.

## Rules

Store API secrets securely
Use environment variables for credentials
Never hardcode .env files
Protect your API keys`;

            const filePath = createTestFile('secrets.md', content);
            const result = await evaluateMagentConfig(filePath, content);

            const safetyDim = result.dimensions.find((d) => d.dimension === 'safety');
            expect(safetyDim).toBeDefined();
            expect(safetyDim?.percentage).toBeGreaterThan(0);
            unlinkSync(filePath);
        });

        it('should detect backup and rollback patterns', async () => {
            const content = `# Identity

I am a test.

## Rules

Create rollback points before changes
Backup data before migrations
Enable undo functionality
Use reversible operations`;

            const filePath = createTestFile('backup.md', content);
            const result = await evaluateMagentConfig(filePath, content);

            const safetyDim = result.dimensions.find((d) => d.dimension === 'safety');
            expect(safetyDim).toBeDefined();
            // Backup/rollback patterns should contribute to safety
            expect(safetyDim?.percentage).toBeGreaterThan(0);
            unlinkSync(filePath);
        });

        it('should detect confidence scoring patterns', async () => {
            const content = `# Identity

I am a test agent.

## Rules

When responding, assign a confidence level:
- HIGH confidence: well-established facts
- MEDIUM confidence: probable but verify
- LOW confidence: uncertain, may be wrong

Always state your confidence when uncertain.`;

            const filePath = createTestFile('confidence.md', content);
            const result = await evaluateMagentConfig(filePath, content);

            const verifiabilityDim = result.dimensions.find((d) => d.dimension === 'grounding');
            expect(verifiabilityDim).toBeDefined();
            expect(verifiabilityDim?.percentage).toBeGreaterThan(0);
            unlinkSync(filePath);
        });

        it('should detect verify/cross-reference patterns', async () => {
            const content = `# Identity

I am a test agent.

## Rules

- Verify this information before responding
- Cross-ref with documentation
- Check that before proceeding
- Always verify facts`;

            const filePath = createTestFile('verify.md', content);
            const result = await evaluateMagentConfig(filePath, content);

            const verifiabilityDim = result.dimensions.find((d) => d.dimension === 'grounding');
            expect(verifiabilityDim).toBeDefined();
            expect(verifiabilityDim?.percentage).toBeGreaterThan(0);
            unlinkSync(filePath);
        });

        it('should detect source citations', async () => {
            const content = `# Identity

I am a test agent.

## Rules

Follow these sources:
- [Official Documentation](https://docs.example.com)
- **Reference**: [API Guide](https://api.example.com)

See also https://www.example.com for more info.
Sources: https://example.org`;

            const filePath = createTestFile('citations.md', content);
            const result = await evaluateMagentConfig(filePath, content);

            const verifiabilityDim = result.dimensions.find((d) => d.dimension === 'grounding');
            expect(verifiabilityDim).toBeDefined();
            expect(verifiabilityDim?.percentage).toBeGreaterThan(0);
            unlinkSync(filePath);
        });

        it('should calculate grounding score with multiple indicators', async () => {
            const content = `# Identity

I am a test agent.

## Rules

- HIGH confidence for basic facts
- Cross-ref this with official docs
- [Reference](https://example.com)
- Verify this before proceeding
- Always check your sources

## Verification

Run: npm test`;

            const filePath = createTestFile('multi-verify.md', content);
            const result = await evaluateMagentConfig(filePath, content);

            const verifiabilityDim = result.dimensions.find((d) => d.dimension === 'grounding');
            expect(verifiabilityDim).toBeDefined();
            expect(verifiabilityDim?.percentage).toBeGreaterThan(0);
            expect(verifiabilityDim?.findings.length).toBeGreaterThan(0);
            unlinkSync(filePath);
        });

        it('should detect uncertainty acknowledgment', async () => {
            const content = `# Identity

I am a test agent.

## Rules

- If uncertain, say you dont know
- Acknowledge when information is missing
- Dont guess at technical details
- Be honest about limitations
- Cite sources when making claims`;

            const filePath = createTestFile('uncertainty.md', content);
            const result = await evaluateMagentConfig(filePath, content);

            const verifiabilityDim = result.dimensions.find((d) => d.dimension === 'grounding');
            expect(verifiabilityDim).toBeDefined();
            expect(verifiabilityDim?.percentage).toBeGreaterThan(0);
            unlinkSync(filePath);
        });

        it('should score sections with grounding indicators', async () => {
            const content = `# Identity

I am a test agent.

## Verification

This section has verify patterns.
Check the official docs for more.
Cross-ref with reliable sources.`;

            const filePath = createTestFile('section-verify.md', content);
            const result = await evaluateMagentConfig(filePath, content);

            // Should have dimensions with grounding
            expect(result.dimensions).toBeDefined();
            expect(result.dimensions.length).toBeGreaterThan(0);
            const verifiabilityDim = result.dimensions.find((d) => d.dimension === 'grounding');
            expect(verifiabilityDim).toBeDefined();
            expect(verifiabilityDim?.percentage).toBeGreaterThan(0);
            unlinkSync(filePath);
        });

        it('should detect memory architecture patterns', async () => {
            const content = `# Identity

I am a test agent.

## Memory

Store conversation history in memory/
Use context from previous sessions.
Persist important facts across interactions.`;

            const filePath = createTestFile('memory.md', content);
            const result = await evaluateMagentConfig(filePath, content);

            const evolutionDim = result.dimensions.find((d) => d.dimension === 'maintainability');
            expect(evolutionDim).toBeDefined();
            expect(evolutionDim?.percentage).toBeGreaterThan(0);
            unlinkSync(filePath);
        });

        it('should detect context management patterns', async () => {
            const content = `# Identity

I am a test agent.

## Context

Maintain context across tool calls.
Share state between agents.
Update context after each operation.`;

            const filePath = createTestFile('context.md', content);
            const result = await evaluateMagentConfig(filePath, content);

            const evolutionDim = result.dimensions.find((d) => d.dimension === 'maintainability');
            expect(evolutionDim).toBeDefined();
            expect(evolutionDim?.percentage).toBeGreaterThan(0);
            unlinkSync(filePath);
        });

        it('should score evolution readiness with multiple indicators', async () => {
            const content = `# Identity

I am an advanced agent.

## Memory

Remember user preferences.
Store conversation history.

## Feedback

Collect user ratings.
Iterate based on feedback.

## Changelog

v1.0: Initial release
v2.0: Added memory
v3.0: Improved feedback`;

            const filePath = createTestFile('multi-evolution.md', content);
            const result = await evaluateMagentConfig(filePath, content);

            const evolutionDim = result.dimensions.find((d) => d.dimension === 'maintainability');
            expect(evolutionDim).toBeDefined();
            expect(evolutionDim?.percentage).toBeGreaterThan(0);
            expect(evolutionDim?.findings.length).toBeGreaterThan(0);
            unlinkSync(filePath);
        });

        it('should detect patterns with multiple evolution indicators', async () => {
            const content = `# Identity

I am a test agent.

## Rules

Be helpful.

## Memory

Use memory for persistence.
Store user preferences.

## Feedback

Collect metrics.
Iterate based on ratings.

## Preferences

Default timeout: 30s
Prefer async operations.

## Changelog

v1.0.0: Initial release`;

            const filePath = createTestFile('all-evolution.md', content);
            const result = await evaluateMagentConfig(filePath, content);

            const evolutionDim = result.dimensions.find((d) => d.dimension === 'maintainability');
            expect(evolutionDim).toBeDefined();
            expect(evolutionDim?.percentage).toBeGreaterThan(50);
            unlinkSync(filePath);
        });

        it('should handle empty optional categories', async () => {
            const content = `# Identity

I am a test agent.

## Rules

Be helpful.

## Tools

Use Read.

## Standards

Follow best practices.`;

            const filePath = createTestFile('minimal-optional.md', content);
            const result = await evaluateMagentConfig(filePath, content);

            // Should still produce valid results even with no optional categories
            expect(result.overallScore).toBeGreaterThan(0);
            expect(result.dimensions.length).toBe(5);
            unlinkSync(filePath);
        });

        it('should detect rules section patterns', async () => {
            const content = `# Identity

I am a test agent.

## Rules

Rule 1: Be helpful
Rule 2: Be honest
Rule 3: Follow best practices`;

            const filePath = createTestFile('rules-section.md', content);
            const result = await evaluateMagentConfig(filePath, content);

            const completenessDim = result.dimensions.find((d) => d.dimension === 'coverage');
            expect(completenessDim).toBeDefined();
            expect(completenessDim?.percentage).toBeGreaterThan(0);
            unlinkSync(filePath);
        });

        it('should detect tools section with specific tools', async () => {
            const content = `# Identity

I am a test agent.

## Tools

Read: Read files from disk
Write: Write files to disk
Bash: Execute shell commands
Grep: Search for patterns in files`;

            const filePath = createTestFile('tools-specific.md', content);
            const result = await evaluateMagentConfig(filePath, content);

            const completenessDim = result.dimensions.find((d) => d.dimension === 'coverage');
            expect(completenessDim).toBeDefined();
            expect(completenessDim?.percentage).toBeGreaterThan(0);
            unlinkSync(filePath);
        });

        it('should calculate weighted overall score correctly', async () => {
            const content = `# Identity

I am a comprehensive test agent that helps with development tasks.

## Rules

- Be helpful and honest
- Follow best practices
- Write clean code

## Tools

- Read: Read files from disk
- Write: Write files to disk
- Bash: Execute shell commands

## Standards

- Use TypeScript
- Follow ESLint rules
- Write unit tests

## Verification

Run: npm test

## Feedback

User feedback improves responses.
Collect metrics on task completion.`;

            const filePath = createTestFile('weighted-score.md', content);
            const result = await evaluateMagentConfig(filePath, content, 'standard');

            // Verify overall score is weighted average
            let expectedScore = 0;
            for (const dim of result.dimensions) {
                expectedScore += dim.percentage * (dim.weight / 100);
            }
            expect(result.overallScore).toBeGreaterThanOrEqual(Math.round(expectedScore) - 5);
            expect(result.overallScore).toBeLessThanOrEqual(Math.round(expectedScore) + 5);
            unlinkSync(filePath);
        });

        it('should handle advanced weight profile', async () => {
            const content = `# Identity

I am a test agent.

## Rules

Be helpful.

## Tools

Use Read.

## Standards

Follow best practices.

## Verification

Run tests.

## Evolution

Add memory.
Collect feedback.

## Changelog

v1.0: Initial release`;

            const filePath = createTestFile('advanced-profile.md', content);
            const result = await evaluateMagentConfig(filePath, content, 'advanced');

            expect(result.weightProfile).toBe('advanced');
            expect(result.overallScore).toBeGreaterThan(0);
            // Advanced profile should have higher grounding weight
            const verifiabilityDim = result.dimensions.find((d) => d.dimension === 'grounding');
            expect(verifiabilityDim?.weight).toBe(25);
            unlinkSync(filePath);
        });

        it('should handle minimal weight profile', async () => {
            const content = `# Identity

I am a test agent.

## Rules

Be helpful.
Never leak secrets.

## Tools

Use Read.`;

            const filePath = createTestFile('minimal-profile.md', content);
            const result = await evaluateMagentConfig(filePath, content, 'minimal');

            expect(result.weightProfile).toBe('minimal');
            // Minimal profile should have higher coverage weight
            const completenessDim = result.dimensions.find((d) => d.dimension === 'coverage');
            expect(completenessDim?.weight).toBe(30);
            unlinkSync(filePath);
        });

        it('should produce top recommendations', async () => {
            const content = `# Identity

Short content.`;

            const filePath = createTestFile('recommendations.md', content);
            const result = await evaluateMagentConfig(filePath, content);

            expect(result.topRecommendations).toBeDefined();
            expect(Array.isArray(result.topRecommendations)).toBe(true);
            unlinkSync(filePath);
        });

        it('should include scored sections in results', async () => {
            const content = `# Identity

I am a test.

## Rules

[CRITICAL] Be safe.
ALWAYS verify.`;

            const filePath = createTestFile('scored-sections.md', content);
            const result = await evaluateMagentConfig(filePath, content);

            // The function returns scoredSections in its internal processing
            // but it's not exposed in the public interface
            // This test verifies the dimensions are properly scored
            expect(result.dimensions.some((d) => d.percentage > 0)).toBe(true);
            unlinkSync(filePath);
        });

        it('should handle file with only identity section', async () => {
            const content = `# Identity

I am a minimal agent.`;

            const filePath = createTestFile('minimal.md', content);
            const result = await evaluateMagentConfig(filePath, content);

            expect(result.overallScore).toBeGreaterThan(0);
            expect(result.grade).toBeDefined();
            unlinkSync(filePath);
        });

        it('should handle file with very long content', async () => {
            const longContent = `# Identity\n\nI am a test agent.\n\n## Rules\n\n${'- Rule 1: '.repeat(100)}${'\n\n## Tools\n\nUse Read.\n\n'.repeat(50)}`;

            const filePath = createTestFile('long.md', longContent);
            const result = await evaluateMagentConfig(filePath, longContent);

            expect(result.overallScore).toBeGreaterThan(0);
            expect(result.dimensions.length).toBe(5);
            unlinkSync(filePath);
        });

        it('should detect version patterns with semantic versioning', async () => {
            const content = `# Identity

I am a test.

## Changelog

v1.0.0: Initial release
v1.1.0: Bug fixes
v2.0.0-beta: New features
v2.0.0: Stable release`;

            const filePath = createTestFile('semver.md', content);
            const result = await evaluateMagentConfig(filePath, content);

            const evolutionDim = result.dimensions.find((d) => d.dimension === 'maintainability');
            expect(evolutionDim).toBeDefined();
            expect(evolutionDim?.percentage).toBeGreaterThan(0);
            unlinkSync(filePath);
        });
    });

    describe('runEvaluate', () => {
        it('should run evaluation with default profile', async () => {
            const content = `# Identity

I am a test agent.

## Rules

Be helpful.
Be honest.

## Tools

Use Read and Write.`;
            const filePath = createTestFile('run-eval.md', content);
            const result = await runEvaluate({ configPath: filePath });

            expect(result.report).toBeDefined();
            expect(result.validation).toBeDefined();
            expect(result.report.dimensions.length).toBe(5);
            unlinkSync(filePath);
        });

        it('should run evaluation with custom profile', async () => {
            const content = `# Identity

I am a test agent.

## Rules

Be helpful.`;
            const filePath = createTestFile('run-eval-profile.md', content);
            const result = await runEvaluate({ configPath: filePath, profile: 'minimal' });

            expect(result.report.weightProfile).toBe('minimal');
            expect(result.report.dimensions.find((d) => d.dimension === 'coverage')?.weight).toBe(30);
            unlinkSync(filePath);
        });

        it('should throw error for invalid profile', async () => {
            const content = `# Identity

I am a test.`;
            const filePath = createTestFile('run-eval-invalid.md', content);

            await expect(
                runEvaluate({
                    configPath: filePath,
                    profile: 'invalid-profile' as unknown as NonNullable<Parameters<typeof runEvaluate>[0]['profile']>,
                }),
            ).rejects.toThrow();
            unlinkSync(filePath);
        });

        it('should validate before evaluation', async () => {
            const content = `# Identity

I am a test.`;
            const filePath = createTestFile('run-eval-validation.md', content);
            const result = await runEvaluate({ configPath: filePath });

            expect(result.validation).toBeDefined();
            expect(typeof result.validation.valid).toBe('boolean');
            unlinkSync(filePath);
        });

        it('should write output when outputPath is provided', async () => {
            const content = `# Identity

I am a test agent.

## Rules

Be helpful.`;
            const filePath = createTestFile('run-eval-output.md', content);
            const outputPath = join(TEST_DIR, 'output.json');
            const result = await runEvaluate({ configPath: filePath, outputPath });

            expect(result.outputWritten).toBeUndefined(); // runEvaluate doesn't return this
            // File should be written
            const { existsSync, readFileSync, unlinkSync: ul } = await import('node:fs');
            expect(existsSync(outputPath)).toBe(true);
            const written = JSON.parse(readFileSync(outputPath, 'utf-8'));
            expect(written.report.dimensions.length).toBe(5);
            ul(outputPath);
            unlinkSync(filePath);
        });
    });

    describe('parseEvaluateArgs', () => {
        it('should parse profile option', () => {
            const result = parseEvaluateArgs(['--profile', 'minimal', 'test.md']);

            expect(result.values.profile).toBe('minimal');
            expect(result.positionals[0]).toBe('test.md');
        });

        it('should parse json flag', () => {
            const result = parseEvaluateArgs(['--json', 'test.md']);

            expect(result.values.json).toBe(true);
        });

        it('should parse verbose flag', () => {
            const result = parseEvaluateArgs(['--verbose', 'test.md']);

            expect(result.values.verbose).toBe(true);
        });

        it('should parse output option', () => {
            const result = parseEvaluateArgs(['--output', 'report.json', 'test.md']);

            expect(result.values.output).toBe('report.json');
        });

        it('should parse platform option', () => {
            const result = parseEvaluateArgs(['--platform', 'claude-md', 'test.md']);

            expect(result.values.platform).toBe('claude-md');
        });

        it('should parse help flag', () => {
            const result = parseEvaluateArgs(['--help']);

            expect(result.values.help).toBe(true);
        });
    });

    describe('formatEvaluateReport', () => {
        it('should format report with validation passed', () => {
            const validation = createValidationResult();
            const report = {
                filePath: '/test.md',
                platform: 'agents-md' as const,
                weightProfile: 'standard' as const,
                dimensions: [
                    {
                        dimension: 'coverage' as const,
                        displayName: 'Coverage',
                        weight: 25,
                        score: 80,
                        maxScore: 100,
                        percentage: 80,
                        findings: ['Found required category: identity'],
                        recommendations: [],
                    },
                ],
                overallScore: 80,
                grade: 'B' as const,
                passed: true,
                topRecommendations: [],
                timestamp: '2024-01-01T00:00:00.000Z',
            };

            const result = formatEvaluateReport(validation, report, '/test.md');

            expect(result).toContain('EVALUATION REPORT');
            expect(result).toContain('Coverage');
            expect(result).toContain('80%');
            expect(result).toContain('B');
            expect(result).toContain('PASS');
            expect(result).toContain('Validation decision: PASS');
        });

        it('should format report with validation errors', () => {
            const validation = createValidationResult({
                valid: false,
                errors: ['Missing required section'],
            });
            const report = {
                filePath: '/test.md',
                platform: 'agents-md' as const,
                weightProfile: 'standard' as const,
                dimensions: [
                    {
                        dimension: 'coverage' as const,
                        displayName: 'Coverage',
                        weight: 25,
                        score: 50,
                        maxScore: 100,
                        percentage: 50,
                        findings: [],
                        recommendations: [],
                    },
                ],
                overallScore: 50,
                grade: 'D' as const,
                passed: false,
                topRecommendations: [],
                timestamp: '2024-01-01T00:00:00.000Z',
            };

            const result = formatEvaluateReport(validation, report, '/test.md');

            expect(result).toContain('Validation Errors');
            expect(result).toContain('Missing required section');
            expect(result).toContain('BLOCK');
        });

        it('should format report with verbose output', () => {
            const validation = createValidationResult();
            const report = {
                filePath: '/test.md',
                platform: 'agents-md' as const,
                weightProfile: 'standard' as const,
                dimensions: [
                    {
                        dimension: 'coverage' as const,
                        displayName: 'Coverage',
                        weight: 25,
                        score: 80,
                        maxScore: 100,
                        percentage: 80,
                        findings: ['Found identity section', 'Found tools section'],
                        recommendations: [],
                    },
                ],
                overallScore: 80,
                grade: 'B' as const,
                passed: true,
                topRecommendations: ['Add more tools'],
                timestamp: '2024-01-01T00:00:00.000Z',
            };

            const result = formatEvaluateReport(validation, report, '/test.md', true);

            expect(result).toContain('Detailed Findings');
            expect(result).toContain('Found identity section');
            expect(result).toContain('Top Recommendations');
        });

        it('should format report with grade colors', () => {
            const validation = createValidationResult();
            const report = {
                filePath: '/test.md',
                platform: 'agents-md' as const,
                weightProfile: 'standard' as const,
                dimensions: [],
                overallScore: 95,
                grade: 'A' as const,
                passed: true,
                topRecommendations: [],
                timestamp: '2024-01-01T00:00:00.000Z',
            };

            const result = formatEvaluateReport(validation, report, '/test.md');

            expect(result).toContain('A');
            expect(result).toContain('PASS');
        });
    });

    describe('getEvaluateHelp', () => {
        it('should return help text', () => {
            const result = getEvaluateHelp();

            expect(result).toContain('Usage: bun evaluate.ts');
            expect(result).toContain('--profile');
            expect(result).toContain('--json');
            expect(result).toContain('Weight Profiles');
            expect(result).toContain(`Pass threshold: ${MAGENT_EVALUATION_CONFIG.passThreshold}%`);
        });
    });

    describe('handleEvaluateCLI', () => {
        it('should return help when no args', async () => {
            const result = await handleEvaluateCLI({ args: ['--help'] });

            expect(result.exitCode).toBe(0);
            expect(result.output).toContain('Usage');
        });

        it('should return error for non-existent file', async () => {
            const result = await handleEvaluateCLI({ args: ['/non/existent/file.md'] });

            expect(result.exitCode).toBe(1);
            expect(result.error).toContain('File not found');
        });

        it('should return error for invalid profile', async () => {
            const content = `# Identity

I am a test.`;
            const filePath = createTestFile('invalid-profile.md', content);

            const result = await handleEvaluateCLI({ args: ['--profile', 'invalid', filePath] });

            expect(result.exitCode).toBe(1);
            expect(result.error).toContain('Invalid profile');
            unlinkSync(filePath);
        });

        it('should run evaluation successfully', async () => {
            const content = `# Identity

I am a test agent that helps with development tasks.

## Rules

- Be helpful and honest
- CRITICAL: Always verify assumptions before acting [Source: Internal guidelines v1.0]
- If uncertain, say you don't know
- WARNING: Be careful with destructive commands [Source: Safety docs]
- CRITICAL: Never expose secrets or API keys [Source: Security best practices]
- DO NOT say "I am an AI" [forbidden phrase]
- ALWAYS create backup before destructive operations

## Tools

- Read: Read files from disk [Source: Node.js fs docs]
  - IF file doesn't exist THEN report error and stop
  - IF file is too large THEN suggest head/tail or use offset
  - Example: Read package.json to understand dependencies
  - Example: Use Read with offset=0 for first lines

- Write: Write files to disk [Source: Node.js fs docs]
  - IF file exists THEN create backup first
  - IF directory doesn't exist THEN create it first
  - Example: Write updated config maintaining formatting

## Memory

- Remember user preferences across sessions
- Keep track of ongoing tasks
- Threshold: Store up to 1000 tokens of context

## Verification

- Check all assumptions before implementing
- IF unsure about something THEN ask for clarification
- Use confidence scoring: HIGH (>90%), MEDIUM (70-90%), LOW (<70%) [Source: Confidence guidelines]
- IF making technical claim THEN cite source
- ALWAYS acknowledge uncertainty when present
- Example: "I cannot fully verify this claim without checking documentation"

## Standards

- Write clean code with proper formatting
- Example: Follow ESLint v9.0 rules for TypeScript

## Output

- Provide clear, actionable output
- IF output is complex THEN use bullet points
- IF error occurred THEN explain what went wrong

## Evolution

- Track behavior changes over time
- IF pattern noticed THEN document it for future reference
- Use version history to understand changes
- Feedback: Use user corrections to improve future responses`;

            const filePath = createTestFile('cli-test.md', content);

            const result = await handleEvaluateCLI({ args: ['--profile', 'advanced', filePath] });

            expect(result.exitCode).toBe(0);
            expect(result.output).toContain('EVALUATION REPORT');
            unlinkSync(filePath);
        });

        it('should output JSON when requested', async () => {
            const content = `# Identity

I am a test agent that helps with development tasks.

## Rules

- Be helpful and honest
- CRITICAL: Always verify assumptions before acting [Source: Internal guidelines v1.0]
- If uncertain, say you don't know
- WARNING: Be careful with destructive commands [Source: Safety docs]
- CRITICAL: Never expose secrets or API keys [Source: Security best practices]
- DO NOT say "I am an AI" [forbidden phrase]
- ALWAYS create backup before destructive operations

## Tools

- Read: Read files from disk [Source: Node.js fs docs]
  - IF file doesn't exist THEN report error and stop
  - IF file is too large THEN suggest head/tail or use offset
  - Example: Read package.json to understand dependencies
  - Example: Use Read with offset=0 for first lines

- Write: Write files to disk [Source: Node.js fs docs]
  - IF file exists THEN create backup first
  - IF directory doesn't exist THEN create it first
  - Example: Write updated config maintaining formatting

## Memory

- Remember user preferences across sessions
- Keep track of ongoing tasks
- Threshold: Store up to 1000 tokens of context

## Verification

- Check all assumptions before implementing
- IF unsure about something THEN ask for clarification
- Use confidence scoring: HIGH (>90%), MEDIUM (70-90%), LOW (<70%) [Source: Confidence guidelines]
- IF making technical claim THEN cite source
- ALWAYS acknowledge uncertainty when present
- Example: "I cannot fully verify this claim without checking documentation"

## Standards

- Write clean code with proper formatting
- Example: Follow ESLint v9.0 rules for TypeScript

## Output

- Provide clear, actionable output
- IF output is complex THEN use bullet points
- IF error occurred THEN explain what went wrong

## Evolution

- Track behavior changes over time
- IF pattern noticed THEN document it for future reference
- Use version history to understand changes
- Feedback: Use user corrections to improve future responses`;

            const filePath = createTestFile('json-test.md', content);

            const result = await handleEvaluateCLI({ args: ['--profile', 'advanced', '--json', filePath] });

            expect(result.exitCode).toBe(0);
            expect(result.output).toBeDefined();
            expect(result.output).toBeDefined();
            const parsed = JSON.parse(result.output ?? '{}');
            expect(parsed.report).toBeDefined();
            expect(parsed.validation).toBeDefined();
            unlinkSync(filePath);
        });

        it('should output verbose details when requested', async () => {
            const content = `# Identity

I am a test agent that helps with development tasks.

## Rules

- Be helpful and honest
- CRITICAL: Always verify assumptions before acting [Source: Internal guidelines v1.0]
- If uncertain, say you don't know
- WARNING: Be careful with destructive commands [Source: Safety docs]
- CRITICAL: Never expose secrets or API keys [Source: Security best practices]
- DO NOT say "I am an AI" [forbidden phrase]
- ALWAYS create backup before destructive operations

## Tools

- Read: Read files from disk [Source: Node.js fs docs]
  - IF file doesn't exist THEN report error and stop
  - IF file is too large THEN suggest head/tail or use offset
  - Example: Read package.json to understand dependencies
  - Example: Use Read with offset=0 for first lines

- Write: Write files to disk [Source: Node.js fs docs]
  - IF file exists THEN create backup first
  - IF directory doesn't exist THEN create it first
  - Example: Write updated config maintaining formatting

## Memory

- Remember user preferences across sessions
- Keep track of ongoing tasks
- Threshold: Store up to 1000 tokens of context

## Verification

- Check all assumptions before implementing
- IF unsure about something THEN ask for clarification
- Use confidence scoring: HIGH (>90%), MEDIUM (70-90%), LOW (<70%) [Source: Confidence guidelines]
- IF making technical claim THEN cite source
- ALWAYS acknowledge uncertainty when present
- Example: "I cannot fully verify this claim without checking documentation"

## Standards

- Write clean code with proper formatting
- Example: Follow ESLint v9.0 rules for TypeScript

## Output

- Provide clear, actionable output
- IF output is complex THEN use bullet points
- IF error occurred THEN explain what went wrong

## Evolution

- Track behavior changes over time
- IF pattern noticed THEN document it for future reference
- Use version history to understand changes
- Feedback: Use user corrections to improve future responses`;

            const filePath = createTestFile('verbose-test.md', content);

            const result = await handleEvaluateCLI({ args: ['--profile', 'advanced', '--verbose', filePath] });

            expect(result.exitCode).toBe(0);
            expect(result.output).toContain('Detailed Findings');
            unlinkSync(filePath);
        });
    });
});
