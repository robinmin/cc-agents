/**
 * Shared helpers for platform adapters.
 *
 * Contains utilities used by multiple adapters to avoid code duplication.
 */

import { parseYaml } from '../../../../scripts/markdown-frontmatter';

/**
 * Parse simple YAML key-value text into a JS object.
 *
 * Uses the shared `parseYaml` wrapper around the `yaml` package.
 * Handles booleans, numbers, quoted strings, and nested structures.
 *
 * @param text - Raw YAML text (without --- delimiters)
 * @returns Parsed key-value pairs
 */
export function parseSimpleYaml(text: string): Record<string, unknown> {
    return parseYaml(text);
}
