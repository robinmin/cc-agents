import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface StepCheckerProfile {
    method: 'cli' | 'file-exists';
    config: Record<string, unknown>;
}

export interface VerificationStepProfile {
    name: string;
    skill: string;
    command: string;
    prompt: string;
    timeout_seconds?: number;
    checker?: StepCheckerProfile;
}

export interface VerificationProfile {
    id: string;
    label: string;
    phase6: {
        required_files: string[];
        steps: VerificationStepProfile[];
    };
}

export function getVerificationProfilePath(profileId: string): string {
    return join(import.meta.dir, '..', '..', 'verification-chain', 'references', 'profiles', profileId, 'profile.json');
}

export function loadVerificationProfile(profileId = 'typescript-bun-biome'): VerificationProfile {
    return JSON.parse(readFileSync(getVerificationProfilePath(profileId), 'utf-8')) as VerificationProfile;
}
