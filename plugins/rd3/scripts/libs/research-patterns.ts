/**
 * Shared regex patterns and extraction functions for research report markdown.
 *
 * Used across deep-research scripts: validate_report, verify_citations, verify_html.
 */

// ============================================================================
// Regex Constants
// ============================================================================

/** Matches citation references like [1], [23] in text */
export const CITATION_REF_PATTERN = /\[(\d+)\]/g;

/** Extracts a markdown section: ## Title ... until next ## or EOF */
export const SECTION_HEADING_PATTERN = /^## (.+)$/gm;

/** Extracts bibliography section content */
export const BIBLIOGRAPHY_SECTION_PATTERN = /## Bibliography([\s\S]*?)(?=\n## |$)/i;

/** Matches URLs in text */
export const URL_PATTERN = /https?:\/\/[^\s)]+/g;

// ============================================================================
// Detection Data
// ============================================================================

/** Placeholder strings that indicate incomplete content */
export const PLACEHOLDER_STRINGS = [
  "TBD",
  "TODO",
  "FIXME",
  "XXX",
  "[citation needed]",
  "[needs citation]",
  "[placeholder]",
  "[TODO]",
  "[TBD]",
] as const;

/** Content truncation patterns with descriptions */
export const TRUNCATION_PATTERNS: ReadonlyArray<[RegExp, string]> = [
  [/Content continues/i, 'Phrase "Content continues"'],
  [/Due to length/i, 'Phrase "Due to length"'],
  [/would continue/i, 'Phrase "would continue"'],
  [/\[Sections \d+-\d+/i, 'Pattern "[Sections X-Y"'],
  [/Additional sections/i, 'Phrase "Additional sections"'],
  [/comprehensive.*word document that continues/i, 'Pattern "comprehensive...document that continues"'],
];

/** Bibliography-specific truncation patterns */
export const BIBLIOGRAPHY_TRUNCATION_PATTERNS: ReadonlyArray<[RegExp, string]> = [
  [/\[\d+-\d+\]/, "Citation range (e.g., [8-75])"],
  [/Additional.*citations/i, 'Phrase "Additional citations"'],
  [/would be included/i, 'Phrase "would be included"'],
  [/\[\.\.\.continue/i, 'Pattern "[...continue"'],
  [/\[Continue with/i, 'Pattern "[Continue with"'],
  [/(?<![\w&)])etc\.(?!\w)/, 'Standalone "etc."'],
  [/and so on/i, 'Phrase "and so on"'],
];

// ============================================================================
// Extraction Functions
// ============================================================================

/**
 * Extract unique, sorted citation numbers from text.
 * Matches [1], [2], [10] etc.
 */
export function extractCitationNumbers(text: string): number[] {
  const matches = text.match(CITATION_REF_PATTERN);
  if (!matches) return [];

  const nums = new Set(matches.map((m) => parseInt(m.replace(/\[|\]/g, ""), 10)));
  return [...nums].sort((a, b) => a - b);
}

/**
 * Extract the bibliography section content (without the heading).
 * Returns empty string if no bibliography found.
 */
export function extractBibliographySection(text: string): string {
  const match = text.match(BIBLIOGRAPHY_SECTION_PATTERN);
  return match ? match[1].trim() : "";
}

/**
 * Parse bibliography entries from a bibliography section string.
 * Each entry starts with [N] and contains the raw text.
 */
export function extractBibliographyEntries(
  bibSection: string,
): Array<{ num: number; raw: string }> {
  const entries: Array<{ num: number; raw: string }> = [];
  const lines = bibSection.split("\n").filter((l) => l.trim());

  let current: { num: number; raw: string } | null = null;

  for (const line of lines) {
    const match = line.trim().match(/^\[(\d+)\]\s+(.+)$/);
    if (match) {
      if (current) entries.push(current);
      current = { num: parseInt(match[1], 10), raw: match[2] };
    } else if (current) {
      current.raw += ` ${line.trim()}`;
    }
  }

  if (current) entries.push(current);
  return entries;
}

/**
 * Find placeholder strings present in text.
 * Returns array of found placeholder strings.
 */
export function findPlaceholders(text: string): string[] {
  return PLACEHOLDER_STRINGS.filter((p) => text.includes(p));
}

/**
 * Find truncation patterns in text.
 * Returns array of descriptions for matched patterns.
 */
export function findTruncationPatterns(text: string): string[] {
  return TRUNCATION_PATTERNS.filter(([regex]) => regex.test(text)).map(([, desc]) => desc);
}

/**
 * Find bibliography-specific truncation patterns.
 * Returns array of descriptions for matched patterns.
 */
export function findBibliographyTruncationPatterns(text: string): string[] {
  return BIBLIOGRAPHY_TRUNCATION_PATTERNS.filter(([regex]) => regex.test(text)).map(
    ([, desc]) => desc,
  );
}
