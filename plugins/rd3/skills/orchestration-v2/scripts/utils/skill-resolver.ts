/**
 * orchestration-v2 — Skill Script Resolver
 *
 * Maps skill names (e.g. "rd3:request-intake") to their scripts/run.ts path.
 *
 * Naming convention:
 *   - Skill names use the format "namespace:name" (colon separator)
 *   - The namespace maps to a subdirectory under the skills root
 *   - For "rd3:request-intake":  plugins/rd3/skills/request-intake/scripts/run.ts
 *   - For "wt:image-generator":  plugins/wt/skills/image-generator/scripts/run.ts
 *
 * The skills root is resolved relative to the project root:
 *   - Primary:   <cwd>/plugins/{namespace}/skills/{name}/scripts/run.ts
 *   - Fallback:  <cwd>/plugins/{namespace}/{name}/scripts/run.ts  (flat layout)
 *
 * Returns undefined if no scripts/run.ts exists for the given skill.
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/** Split a skill name into namespace and name parts. */
export function parseSkillName(skillName: string): { namespace: string; name: string } | null {
    const colonIdx = skillName.indexOf(':');
    if (colonIdx <= 0 || colonIdx === skillName.length - 1) {
        return null;
    }
    return {
        namespace: skillName.slice(0, colonIdx),
        name: skillName.slice(colonIdx + 1),
    };
}

/**
 * Resolve the scripts/run.ts path for a skill.
 *
 * @param skillName - Skill name with namespace (e.g. "rd3:request-intake")
 * @returns Absolute path to scripts/run.ts, or undefined if not found
 */
export function resolveSkillScript(skillName: string): string | undefined {
    const parsed = parseSkillName(skillName);
    if (!parsed) {
        return undefined;
    }

    const { namespace, name } = parsed;
    const cwd = process.cwd();

    // Layout A: plugins/{namespace}/skills/{name}/scripts/run.ts
    const layoutA = resolve(cwd, 'plugins', namespace, 'skills', name, 'scripts', 'run.ts');
    if (existsSync(layoutA)) {
        return layoutA;
    }

    // Layout B: plugins/{namespace}/{name}/scripts/run.ts  (flat layout)
    const layoutB = resolve(cwd, 'plugins', namespace, name, 'scripts', 'run.ts');
    if (existsSync(layoutB)) {
        return layoutB;
    }

    return undefined;
}

/**
 * Check whether a skill has a runnable scripts/run.ts.
 */
export function skillHasScript(skillName: string): boolean {
    return resolveSkillScript(skillName) !== undefined;
}
