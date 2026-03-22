// write-guard command — PreToolUse hook integration
// Reads JSON from stdin: {"tool_name":"Edit","tool_input":{"file_path":"..."}}
// Exit codes: 0=allow, 1=warn, 2=block

import { readFileSync } from 'node:fs';
import type { ToolInput } from '../types';

const PROTECTED_PATTERNS = [
    /^docs\/tasks\/.+\.md$/, // task files in docs/tasks/
    /^docs\/prompts\/.+\.md$/, // task files in docs/prompts/
];

const EXEMPT_PATTERNS = [
    /^docs\/tasks\/\d{4}\/.+$/, // docs/tasks/<wbs>/ subdirectory files (managed by tasks put)
];

export function checkWriteGuard(
    toolName: string,
    filePath: string,
): { allowed: boolean; code: number; reason?: string } {
    // Only protect Edit and Write tool operations
    if (toolName !== 'Edit' && toolName !== 'Write') {
        return { allowed: true, code: 0 };
    }

    // Check exempt patterns first (subdirectories of docs/tasks/<wbs>/)
    for (const pattern of EXEMPT_PATTERNS) {
        if (pattern.test(filePath)) {
            return { allowed: true, code: 0 };
        }
    }

    // Check protected patterns
    for (const pattern of PROTECTED_PATTERNS) {
        if (pattern.test(filePath)) {
            return {
                allowed: false,
                code: 2,
                reason: `Write to ${filePath} is blocked — use 'tasks update' or 'tasks put' instead`,
            };
        }
    }

    return { allowed: true, code: 0 };
}

export function runWriteGuardStdin(): number {
    try {
        const input = readFileSync('/dev/stdin', 'utf-8');
        const toolInput: ToolInput = JSON.parse(input);
        const filePath = (toolInput.tool_input?.file_path as string) || '';
        const toolName = toolInput.tool_name || 'Unknown';

        const result = checkWriteGuard(toolName, filePath);

        if (result.reason) {
            console.error(`[GUARD] ${result.reason}`);
        }

        return result.code;
    } catch (e) {
        // If we can't parse input, allow by default
        console.error('[GUARD] Failed to parse stdin input, allowing by default');
        return 0;
    }
}
