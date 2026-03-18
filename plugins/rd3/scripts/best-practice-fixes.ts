/**
 * Shared Best Practice Auto-Fix Functions for rd3 meta skills
 *
 * Used by both cc-agents and cc-skills refine pipelines.
 * Handles deterministic text fixes; fuzzy quality checks are
 * handled by the invoking LLM agent via checklist.
 */

// ============================================================================
// Types
// ============================================================================

export interface BestPracticeFixResult {
    success: boolean;
    actions: string[];
    content: string;
}

export interface BestPracticeFixOptions {
    /** Label for entity-specific replacements: "This skill helps" or "This agent helps" */
    entityLabel: string;
    /** Remove "Commands Reference" sections (cc-skills only) */
    removeCircularRefs?: boolean;
    /** Remove `/rd3:command-*` slash command references (cc-skills only) */
    removeSlashRefs?: boolean;
}

// ============================================================================
// Implementation
// ============================================================================

/**
 * Apply deterministic best-practice fixes to skill/agent content.
 *
 * Fixes applied:
 * 1. Normalize TODO markers (flag for manual review)
 * 2. Convert second-person to imperative form
 * 3. Convert Windows paths to forward slashes
 * 4. Remove circular references (optional, cc-skills)
 * 5. Remove slash command references (optional, cc-skills)
 * 6. Flag long content without section headers
 */
export function applyBestPracticeFixes(content: string, options: BestPracticeFixOptions): BestPracticeFixResult {
    const actions: string[] = [];
    let fixed = content;

    // Fix 1: Flag remaining TODO markers for manual review
    const todoMatches = fixed.match(/\bTODO\b/gi);
    if (todoMatches && todoMatches.length > 0) {
        actions.push(`Found ${todoMatches.length} TODO marker(s) — replace with actual content`);
        // Normalize TODO variants to a consistent format
        fixed = fixed.replace(/\bTODO\b:\s*/gi, 'TODO: ');
        fixed = fixed.replace(/\bTODO\b(?!:)/gi, 'TODO: FIX ME');
    }

    // Fix 2: Convert second-person to imperative form
    const secondPersonReplacements = [
        { pattern: /\bI can help you\b/gi, replacement: options.entityLabel },
        { pattern: /\bI will help you\b/gi, replacement: options.entityLabel },
        { pattern: /\byou can use\b/gi, replacement: 'Use' },
        { pattern: /\byou should\b/gi, replacement: 'Do' },
        { pattern: /\byou need to\b/gi, replacement: 'You must' },
    ];

    for (const { pattern, replacement } of secondPersonReplacements) {
        if (pattern.test(fixed)) {
            actions.push(`Fixed "${pattern.source}" → "${replacement}"`);
            fixed = fixed.replace(pattern, replacement);
        }
    }

    // Fix 3: Convert Windows paths to forward slashes
    const windowsPaths = fixed.match(/[a-zA-Z]:\\[\w\\]+\.?\w*/g);
    if (windowsPaths && windowsPaths.length > 0) {
        const uniquePaths = [...new Set(windowsPaths)];
        for (const path of uniquePaths) {
            const forwardPath = path.replace(/\\/g, '/');
            if (path !== forwardPath) {
                actions.push(`Fixed Windows path: ${path} → ${forwardPath}`);
                fixed = fixed.replace(new RegExp(path.replace(/\\/g, '\\\\'), 'g'), forwardPath);
            }
        }
    }

    // Fix 4: Remove circular references (Commands Reference sections)
    if (options.removeCircularRefs && /^## Commands Reference$/m.test(fixed)) {
        actions.push('Removed "Commands Reference" section');
        fixed = fixed.replace(/^## Commands Reference$\n[\s\S]*?(?=^## |\n## |```\n\n|\n\n---)/m, '\n');
    }

    // Fix 5: Remove slash command references
    if (options.removeSlashRefs && /\/(rd\d+):[a-z-]+\s+/g.test(fixed)) {
        actions.push('Removed slash command references');
        fixed = fixed.replace(/\/(rd\d+):[a-z-]+\s+[^\n]*\n/g, '');
    }

    // Fix 6: Add section headers if content is too long without structure
    if (fixed.length > 2000 && !fixed.includes('## ')) {
        actions.push('Content may need section headers for progressive disclosure (manual review needed)');
    }

    return {
        success: true,
        actions,
        content: fixed,
    };
}
