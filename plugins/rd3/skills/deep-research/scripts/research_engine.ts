#!/usr/bin/env bun
/**
 * Deep Research Engine for Claude Code
 * Orchestrates comprehensive research across multiple sources with verification and synthesis
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { logger } from '../../../scripts/logger';
import { parseCli } from '../../../scripts/libs/cli-args';
import { ensureDir, readFile, writeFile } from '../../../scripts/utils';

enum ResearchPhase {
    SCOPE = 'scope',
    PLAN = 'plan',
    RETRIEVE = 'retrieve',
    TRIANGULATE = 'triangulate',
    SYNTHESIZE = 'synthesize',
    CRITIQUE = 'critique',
    REFINE = 'refine',
    PACKAGE = 'package',
}

enum ResearchMode {
    QUICK = 'quick', // 3 phases: scope, retrieve, package
    STANDARD = 'standard', // 6 phases: skip refine and critique
    DEEP = 'deep', // Full 8 phases
    ULTRADEEP = 'ultradeep', // 8 phases + extended iterations
}

interface Source {
    url: string;
    title: string;
    snippet: string;
    retrievedAt: string;
    credibilityScore: number;
    sourceType: string;
    verificationStatus: string;
}

interface ResearchState {
    query: string;
    mode: ResearchMode;
    phase: ResearchPhase;
    scope: Record<string, unknown>;
    plan: Record<string, unknown>;
    sources: Source[];
    findings: Record<string, unknown>[];
    synthesis: Record<string, unknown>;
    critique: Record<string, unknown>;
    report: string;
    metadata: Record<string, unknown>;
}

class ResearchEngine {
    private mode: ResearchMode;
    private state: ResearchState | null = null;
    private outputDir: string;

    constructor(mode: ResearchMode = ResearchMode.STANDARD) {
        this.mode = mode;
        this.outputDir = join(process.env.HOME || '', '.claude', 'research_output');
        ensureDir(this.outputDir);
    }

    initializeResearch(query: string): ResearchState {
        this.state = {
            query,
            mode: this.mode,
            phase: ResearchPhase.SCOPE,
            scope: {},
            plan: {},
            sources: [],
            findings: [],
            synthesis: {},
            critique: {},
            report: '',
            metadata: {
                startedAt: new Date().toISOString(),
                version: '1.0',
            },
        };
        return this.state;
    }

    restoreState(savedState: ResearchState): void {
        this.state = savedState;
        this.mode = savedState.mode;
    }

    getPhaseInstructions(phase: ResearchPhase): string {
        const instructions: Record<ResearchPhase, string> = {
            [ResearchPhase.SCOPE]: `
# Phase 1: SCOPE

Your task: Define research boundaries and success criteria

## Execute:
1. Decompose the question into 3-5 core components
2. Identify 2-4 key stakeholder perspectives
3. Define what's IN scope and what's OUT of scope
4. List 3-5 success criteria for this research
5. Document 3-5 assumptions that need validation

## Output Format:
\`\`\`json
{
  "core_components": ["component1", "component2", ...],
  "stakeholder_perspectives": ["perspective1", "perspective2", ...],
  "in_scope": ["item1", "item2", ...],
  "out_of_scope": ["item1", "item2", ...],
  "success_criteria": ["criteria1", "criteria2", ...],
  "assumptions": ["assumption1", "assumption2", ...]
}
\`\`\`

Use extended reasoning to explore multiple framings before finalizing scope.
`,
            [ResearchPhase.PLAN]: `
# Phase 2: PLAN

Your task: Create intelligent research roadmap

## Execute:
1. Identify 5-10 primary sources to investigate
2. List 5-10 secondary/backup sources
3. Map knowledge dependencies (what must be understood first)
4. Create 10-15 search query variations
5. Plan triangulation approach (how to verify claims)
6. Define 3-5 quality gates

## Output Format:
\`\`\`json
{
  "primary_sources": ["source_type1", "source_type2", ...],
  "secondary_sources": ["source_type1", "source_type2", ...],
  "knowledge_dependencies": {"concept1": ["prerequisite1", "prerequisite2"], ...},
  "search_queries": ["query1", "query2", ...],
  "triangulation_strategy": "description of verification approach",
  "quality_gates": ["gate1", "gate2", ...]
}
\`\`\`

Use Graph-of-Thoughts: branch into 3-4 potential research paths, evaluate, then converge on optimal strategy.
`,
            [ResearchPhase.RETRIEVE]: `
# Phase 3: RETRIEVE

Your task: Systematically collect information from multiple sources

## Execute:
1. Use WebSearch with iterative query refinement (minimum 10 searches)
2. Use WebFetch to deep-dive into 5-10 most promising sources
3. Extract key passages with metadata
4. Track information gaps
5. Follow 2-3 promising tangents
6. Ensure source diversity (different domains, perspectives)

## Tools to Use:
- WebSearch: For current information and broad coverage
- WebFetch: For detailed extraction from specific URLs
- Grep/Read: For local documentation if relevant
- Task: Spawn 2-3 parallel retrieval agents for efficiency

## Output:
Store all sources with metadata. Each source should include:
- URL/location
- Title
- Key excerpts
- Relevance score
- Source type
- Retrieved timestamp

Aim for 15-30 distinct sources minimum.
`,
            [ResearchPhase.TRIANGULATE]: `
# Phase 4: TRIANGULATE

Your task: Validate information across multiple independent sources

## Execute:
1. List all major claims from retrieved information
2. For each claim, find 3+ independent confirmatory sources
3. Flag any contradictions or uncertainties
4. Assess source credibility (domain expertise, recency, bias)
5. Document consensus areas vs. debate areas
6. Mark verification status for each claim

## Quality Standards:
- Core claims MUST have 3+ independent sources
- Flag any single-source claims as "unverified"
- Note information recency
- Identify potential biases

## Output Format:
\`\`\`json
{
  "verified_claims": [
    {
      "claim": "statement",
      "sources": ["source1", "source2", "source3"],
      "confidence": "high|medium|low"
    }
  ],
  "unverified_claims": [...],
  "contradictions": [
    {
      "topic": "what's contradicted",
      "viewpoint1": {"claim": "...", "sources": [...]},
      "viewpoint2": {"claim": "...", "sources": [...]}
    }
  ]
}
\`\`\`
`,
            [ResearchPhase.SYNTHESIZE]: `
# Phase 5: SYNTHESIZE

Your task: Connect insights and generate novel understanding

## Execute:
1. Identify 5-10 key patterns across sources
2. Map relationships between concepts
3. Generate 3-5 insights that go beyond source material
4. Create conceptual frameworks or mental models
5. Build argument structures
6. Develop evidence hierarchies

## Use Extended Reasoning:
- Explore non-obvious connections
- Consider second-order implications
- Think about what sources might be missing
- Generate novel hypotheses

## Output Format:
\`\`\`json
{
  "patterns": ["pattern1", "pattern2", ...],
  "concept_relationships": {"concept1": ["related_to1", "related_to2"], ...},
  "novel_insights": ["insight1", "insight2", ...],
  "frameworks": ["framework_description1", ...],
  "key_arguments": [
    {
      "argument": "main claim",
      "supporting_evidence": ["evidence1", "evidence2"],
      "strength": "strong|moderate|weak"
    }
  ]
}
\`\`\`
`,
            [ResearchPhase.CRITIQUE]: `
# Phase 6: CRITIQUE

Your task: Rigorously evaluate research quality

## Execute Red Team Analysis:
1. Check logical consistency
2. Verify citation completeness
3. Identify gaps or weaknesses
4. Assess balance and objectivity
5. Test alternative interpretations
6. Challenge assumptions

## Red Team Questions:
- What's missing from this research?
- What could be wrong?
- What alternative explanations exist?
- What biases might be present?
- What counterfactuals should be considered?
- What would a skeptic say?

## Output Format:
\`\`\`json
{
  "strengths": ["strength1", "strength2", ...],
  "weaknesses": ["weakness1", "weakness2", ...],
  "gaps": ["gap1", "gap2", ...],
  "biases": ["bias1", "bias2", ...],
  "improvements_needed": [
    {
      "issue": "description",
      "recommendation": "how to fix",
      "priority": "high|medium|low"
    }
  ]
}
\`\`\`
`,
            [ResearchPhase.REFINE]: `
# Phase 7: REFINE

Your task: Address gaps and strengthen weak areas

## Execute:
1. Conduct additional research for identified gaps
2. Strengthen weak arguments with more evidence
3. Add missing perspectives
4. Resolve contradictions where possible
5. Enhance clarity and structure
6. Verify all revised content

## Focus On:
- High priority improvements from critique
- Missing stakeholder perspectives
- Weak evidence chains
- Unclear explanations

## Output:
Updated findings, sources, and synthesis with improvements documented.
`,
            [ResearchPhase.PACKAGE]: `
# Phase 8: PACKAGE

Your task: Deliver professional, actionable research report

## Generate Complete Report:

\`\`\`markdown
# Research Report: [Topic]

## Executive Summary
[3-5 key findings bullets]
[Primary recommendation]
[Confidence level: High/Medium/Low]

## Introduction
### Research Question
[Original question]

### Scope & Methodology
[What was investigated and how]

### Key Assumptions
[Important assumptions made]

## Main Analysis

### Finding 1: [Title]
[Detailed explanation with evidence]
[Citations: [1], [2], [3]]

### Finding 2: [Title]
[Detailed explanation with evidence]
[Citations: [4], [5], [6]]

[Continue for all findings...]

## Synthesis & Insights
[Patterns and connections]
[Novel insights]
[Implications]

## Limitations & Caveats
[Known gaps]
[Assumptions]
[Areas of uncertainty]

## Recommendations
[Action items]
[Next steps]
[Further research needs]

## Bibliography
[1] Source 1 full citation
[2] Source 2 full citation
...

## Appendix: Methodology
[Research process]
[Sources consulted]
[Verification approach]
\`\`\`

Save report to file with timestamp.
`,
        };

        return instructions[phase] || 'No instructions available for this phase';
    }

    executePhase(phase: ResearchPhase): Record<string, unknown> {
        logger.log(`\n${'='.repeat(80)}`);
        logger.log(`PHASE ${phase.toUpperCase()}: Starting...`);
        logger.log(`${'='.repeat(80)}\n`);

        const instructions = this.getPhaseInstructions(phase);
        logger.log(instructions);

        // In real usage, Claude will execute these instructions
        // This returns a structured result that Claude should populate
        const result = {
            phase: phase,
            status: 'instructions_displayed',
            timestamp: new Date().toISOString(),
        };

        return result;
    }

    private getPhasesForMode(): ResearchPhase[] {
        if (this.mode === ResearchMode.QUICK) {
            return [ResearchPhase.SCOPE, ResearchPhase.RETRIEVE, ResearchPhase.PACKAGE];
        }
        if (this.mode === ResearchMode.STANDARD) {
            return [
                ResearchPhase.SCOPE,
                ResearchPhase.PLAN,
                ResearchPhase.RETRIEVE,
                ResearchPhase.TRIANGULATE,
                ResearchPhase.SYNTHESIZE,
                ResearchPhase.PACKAGE,
            ];
        }
        if (this.mode === ResearchMode.DEEP || this.mode === ResearchMode.ULTRADEEP) {
            return [
                ResearchPhase.SCOPE,
                ResearchPhase.PLAN,
                ResearchPhase.RETRIEVE,
                ResearchPhase.TRIANGULATE,
                ResearchPhase.SYNTHESIZE,
                ResearchPhase.CRITIQUE,
                ResearchPhase.REFINE,
                ResearchPhase.PACKAGE,
            ];
        }
        return Object.values(ResearchPhase);
    }

    runPipeline(query: string): string {
        logger.log(`\n${'#'.repeat(80)}`);
        logger.log(`# DEEP RESEARCH ENGINE`);
        logger.log(`# Query: ${query}`);
        logger.log(`# Mode: ${this.mode}`);
        logger.log(`${'#'.repeat(80)}\n`);

        // Initialize research
        this.initializeResearch(query);

        // Determine phases based on mode
        const phases = this.getPhasesForMode();

        // Execute each phase
        for (const phase of phases) {
            if (this.state) {
                this.state.phase = phase;
            }
            this.executePhase(phase);

            // Save state after each phase
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const stateFile = join(this.outputDir, `research_state_${timestamp}.json`);
            if (this.state) {
                try {
                    writeFile(stateFile, JSON.stringify(this.state, null, 2));
                } catch {
                    // Ignore write errors
                }
            }
            logger.log(`\n✅ Phase ${phase} complete. State saved to: ${stateFile}\n`);
        }

        // Generate report path
        const reportTimestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const reportFile = join(this.outputDir, `research_report_${reportTimestamp}.md`);

        logger.log(`\n${'='.repeat(80)}`);
        logger.log('RESEARCH PIPELINE COMPLETE');
        logger.log(`Report will be saved to: ${reportFile}`);
        logger.log(`${'='.repeat(80)}\n`);

        return reportFile;
    }
}

function main(): void {
    const { values } = parseCli({
        name: 'research_engine.ts',
        description: 'Deep research engine for Claude Code - orchestrates multi-phase research',
        options: {
            query: { type: 'string', short: 'q', required: true },
            mode: { type: 'string', short: 'm', default: 'standard' },
            resume: { type: 'string' },
        },
        examples: [
            "bun research_engine.ts --query 'state of quantum computing 2025' --mode deep",
            "bun research_engine.ts -q 'PostgreSQL vs Supabase comparison' -m standard",
        ],
    });

    const query = values.query as string;
    const modeArg = (values.mode as string).toLowerCase();
    const resumePath = values.resume as string | undefined;

    let mode = ResearchMode.STANDARD;
    if (modeArg === 'quick') mode = ResearchMode.QUICK;
    else if (modeArg === 'deep') mode = ResearchMode.DEEP;
    else if (modeArg === 'ultradeep') mode = ResearchMode.ULTRADEEP;

    const engine = new ResearchEngine(mode);

    if (resumePath) {
        if (!existsSync(resumePath)) {
            logger.error(`Error: State file not found: ${resumePath}`);
            process.exit(1);
        }
        try {
            const stateData = readFile(resumePath);
            const savedState = JSON.parse(stateData) as ResearchState;
            engine.restoreState(savedState);
            logger.log(`Resumed research from: ${resumePath} (phase: ${savedState.phase})`);
        } catch (e) {
            logger.error(`Error loading state file: ${e}`);
            process.exit(1);
        }
    }

    const reportPath = engine.runPipeline(query);

    logger.log(`\nResearch complete! Report path: ${reportPath}`);
    logger.log(`\nNow Claude should execute each phase using the displayed instructions.`);
}

if (import.meta.main) {
    main();
}
