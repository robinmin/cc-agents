/**
 * Shared helpers for platform adapters.
 *
 * Contains utilities used by multiple adapters to avoid code duplication.
 */

/**
 * Simple YAML-like key: value parser for frontmatter.
 *
 * Handles basic YAML frontmatter found in .cursorrules, .windsurfrules,
 * and similar formats. Supports booleans, integers, and quoted strings.
 *
 * @param text - Raw YAML text (without --- delimiters)
 * @returns Parsed key-value pairs
 */
export function parseSimpleYaml(text: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const lines = text.split('\n');

    for (const line of lines) {
        const match = line.match(/^\s*([a-zA-Z_-]+)\s*:\s*(.*?)\s*$/);
        if (match) {
            const key = match[1];
            let value: unknown = match[2];

            // Parse booleans
            if (value === 'true') value = true;
            else if (value === 'false') value = false;
            // Parse numbers
            else if (/^\d+$/.test(value as string)) value = Number.parseInt(value as string, 10);
            // Strip quotes
            else if (typeof value === 'string' && /^['"](.*)['"$]/.test(value)) {
                value = value.slice(1, -1);
            }

            result[key] = value;
        }
    }

    return result;
}
