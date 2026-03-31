/**
 * Shared test helpers for rd3 plugin tests.
 *
 * Provides a canonical test data directory under plugins/rd3/tests/data/
 * so all test artifacts land in one gitignored location instead of
 * polluting the project root or leaking into system temp.
 */

import { existsSync, mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = join(fileURLToPath(import.meta.url), "..");

/** Base directory for all test artifacts — gitignored via .gitignore */
export const TEST_DATA_DIR = join(__dirname, "data");

/**
 * Create a unique test directory under plugins/rd3/tests/data/.
 *
 * Falls back to system tmpdir if the test-data base directory cannot be created
 * (e.g. read-only filesystem in CI).
 */
export function createTestDataDir(prefix: string): string {
	mkdirSync(TEST_DATA_DIR, { recursive: true });
	return mkdtempSync(join(TEST_DATA_DIR, prefix));
}

/**
 * Safely remove a test directory. No-op if path is empty or does not exist.
 */
export function cleanupTestDir(dir: string): void {
	if (dir && existsSync(dir)) {
		rmSync(dir, { recursive: true, force: true });
	}
}
