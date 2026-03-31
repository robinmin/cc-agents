import { access } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';
import type { FileExistsCheckerConfig, MethodResult, CheckerEvidence } from '../types';
import { logger } from '../../../../scripts/logger';

const F_OK = 0;

/**
 * Check that all specified file paths exist.
 * Result is 'pass' only if ALL paths are found.
 */
export async function runFileExistsCheck(config: FileExistsCheckerConfig, cwd?: string): Promise<MethodResult> {
    const evidence: CheckerEvidence = {
        method: 'file-exists',
        result: 'fail',
        timestamp: new Date().toISOString(),
    };

    const filePathsFound: string[] = [];
    const missingPaths: string[] = [];

    await Promise.all(
        config.paths.map(async (path) => {
            const fullPath = !cwd || isAbsolute(path) ? path : join(cwd, path);
            try {
                await access(fullPath, F_OK);
                filePathsFound.push(path);
                logger.debug(`File found: ${path}`);
            } catch {
                missingPaths.push(path);
                logger.debug(`File not found: ${path}`);
            }
        }),
    );

    evidence.file_paths_found = filePathsFound;

    if (missingPaths.length === 0) {
        evidence.result = 'pass';
        return {
            result: 'pass',
            evidence,
        };
    }

    evidence.error = `Missing paths: ${missingPaths.join(', ')}`;
    return {
        result: 'fail',
        evidence,
        error: evidence.error,
    };
}
