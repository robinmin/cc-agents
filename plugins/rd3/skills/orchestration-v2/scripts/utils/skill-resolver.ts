/**
 * orchestration-v2 — Skill Script Resolver
 *
 * Maps skill names (e.g. "rd3:request-intake") to their directory or scripts/run.ts path.
 *
 * Naming convention:
 *   - Skill names use the format "namespace:name" (colon separator)
 *   - The namespace maps to a subdirectory under the skills root
 *   - For "rd3:request-intake":  plugins/rd3/skills/request-intake/
 *   - For "wt:image-generator":  plugins/wt/skills/image-generator/
 *
 * Resolution strategies:
 *   - resolveSkillDirectory: resolves from script location (import.meta.dir) for config validation
 *   - resolveSkillScript: resolves from working directory (cwd) for runtime execution
 *
 * Returns undefined/null if no matching path exists.
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

/**
 * Resolve the skill directory path from a starting directory.
 * Walks up the directory tree to find the skill directory.
 *
 * @param skillRef - Skill reference with namespace (e.g. "rd3:request-intake")
 * @param startDir - Directory to start walking from (defaults to script location)
 * @returns Absolute path to the skill directory, or null if not found
 */
export function resolveSkillDirectory(
    skillRef: string,
    startDir: string = import.meta.dir,
): string | null {
    const colonIdx = skillRef.indexOf(':');
    if (colonIdx === -1) return null;

    const plugin = skillRef.slice(0, colonIdx);
    const skillName = skillRef.slice(colonIdx + 1);
    if (!plugin || !skillName) return null;

    let dir = startDir;
    for (let i = 0; i < 10; i++) {
        // Check if current dir matches plugin root (has skills subdir)
        const pluginRootCandidate = resolve(dir).split('/').pop() === plugin && existsSync(resolve(dir, 'skills'));
        if (pluginRootCandidate) {
            const candidate = resolve(dir, 'skills', skillName);
            if (existsSync(candidate)) {
                return candidate;
            }
        }

        // Check workspace plugins layout: plugins/{plugin}/skills/{skillName}
        const workspaceCandidate = resolve(dir, 'plugins', plugin, 'skills', skillName);
        if (existsSync(workspaceCandidate)) {
            return workspaceCandidate;
        }

        const parent = resolve(dir, '..');
        if (parent === dir) break;
        dir = parent;
    }

    return null;
}
