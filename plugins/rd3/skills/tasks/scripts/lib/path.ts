// Path safety helpers — all user-supplied paths must pass through these validators

import { isAbsolute, relative } from 'node:path';

/**
 * Returns true if `targetPath` resolves to a location inside `projectRoot`.
 * Guards against path-traversal attacks (e.g. `../../../etc/passwd`).
 */
export function isPathWithinRoot(projectRoot: string, targetPath: string): boolean {
    const relativePath = relative(projectRoot, targetPath);
    return relativePath === '' || (!relativePath.startsWith('..') && !isAbsolute(relativePath));
}
