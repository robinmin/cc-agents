#!/usr/bin/env bun
import { PLATFORM_CAPABILITIES } from './capabilities';
import { parseCliArgs, printResult, writeJsonResult } from './io';

export interface EvolutionProposal {
    id: string;
    title: string;
    rationale: string;
}

export function proposeEvolution(): EvolutionProposal[] {
    const proposals: EvolutionProposal[] = [];
    const lowConfidence = Object.values(PLATFORM_CAPABILITIES).filter((capability) => capability.confidence !== 'high');
    if (lowConfidence.length > 0) {
        proposals.push({
            id: 'refresh-provisional-platforms',
            title: 'Refresh provisional platform evidence',
            rationale: `Verify official docs or product behavior for ${lowConfidence.map((capability) => capability.displayName).join(', ')}.`,
        });
    }
    proposals.push({
        id: 'add-fixture-from-real-workspace',
        title: 'Add real workspace fixture',
        rationale: 'Capture a representative AGENTS.md + platform rule set to prevent drift from real usage.',
    });
    return proposals;
}

export function runEvolveCli(args: string[]): EvolutionProposal[] {
    const options = parseCliArgs(args);
    const result = proposeEvolution();
    writeJsonResult(result, options.output);
    printResult(result, options.json);
    return result;
}

if (import.meta.main) {
    runEvolveCli(Bun.argv.slice(2));
}
