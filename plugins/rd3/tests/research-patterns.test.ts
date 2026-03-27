import { describe, expect, test } from "bun:test";
import {
  extractCitationNumbers,
  extractBibliographySection,
  extractBibliographyEntries,
  findPlaceholders,
  findTruncationPatterns,
  findBibliographyTruncationPatterns,
  CITATION_REF_PATTERN,
  BIBLIOGRAPHY_SECTION_PATTERN,
} from "../scripts/libs/research-patterns";

describe("extractCitationNumbers", () => {
  test("extracts sorted unique citation numbers", () => {
    const text = "See [1] and [3], also [1] and [10].";
    expect(extractCitationNumbers(text)).toEqual([1, 3, 10]);
  });

  test("returns empty array for no citations", () => {
    expect(extractCitationNumbers("No citations here.")).toEqual([]);
  });

  test("handles single citation", () => {
    expect(extractCitationNumbers("Reference [5].")).toEqual([5]);
  });

  test("handles adjacent citations", () => {
    expect(extractCitationNumbers("[1][2][3]")).toEqual([1, 2, 3]);
  });
});

describe("extractBibliographySection", () => {
  test("extracts bibliography content", () => {
    const text = "## Main\nSome content\n\n## Bibliography\n[1] Source one\n[2] Source two\n\n## Appendix\nMore";
    const result = extractBibliographySection(text);
    expect(result).toContain("[1] Source one");
    expect(result).toContain("[2] Source two");
    expect(result).not.toContain("Appendix");
  });

  test("returns empty string if no bibliography", () => {
    expect(extractBibliographySection("## Main\nContent only")).toBe("");
  });

  test("handles bibliography at end of document", () => {
    const text = "## Main\nContent\n\n## Bibliography\n[1] Final source";
    const result = extractBibliographySection(text);
    expect(result).toContain("[1] Final source");
  });
});

describe("extractBibliographyEntries", () => {
  test("parses numbered entries", () => {
    const bib = "[1] Author A. Title A.\n[2] Author B. Title B.";
    const entries = extractBibliographyEntries(bib);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual({ num: 1, raw: "Author A. Title A." });
    expect(entries[1]).toEqual({ num: 2, raw: "Author B. Title B." });
  });

  test("handles multi-line entries", () => {
    const bib = "[1] Author A. Title A.\n  Continued on next line.\n[2] Author B.";
    const entries = extractBibliographyEntries(bib);
    expect(entries).toHaveLength(2);
    expect(entries[0].raw).toContain("Continued on next line.");
  });

  test("returns empty array for empty input", () => {
    expect(extractBibliographyEntries("")).toEqual([]);
  });
});

describe("findPlaceholders", () => {
  test("detects TBD and TODO", () => {
    const text = "This is TBD and needs TODO work.";
    const found = findPlaceholders(text);
    expect(found).toContain("TBD");
    expect(found).toContain("TODO");
  });

  test("detects citation needed", () => {
    expect(findPlaceholders("Some claim [citation needed].")).toContain("[citation needed]");
  });

  test("returns empty for clean text", () => {
    expect(findPlaceholders("This is a complete sentence.")).toEqual([]);
  });
});

describe("findTruncationPatterns", () => {
  test("detects Content continues", () => {
    const found = findTruncationPatterns("Content continues in the next section.");
    expect(found.length).toBeGreaterThan(0);
  });

  test("detects Due to length", () => {
    const found = findTruncationPatterns("Due to length constraints, we omit...");
    expect(found.length).toBeGreaterThan(0);
  });

  test("returns empty for clean text", () => {
    expect(findTruncationPatterns("This is a normal paragraph.")).toEqual([]);
  });
});

describe("findBibliographyTruncationPatterns", () => {
  test("detects citation ranges", () => {
    const found = findBibliographyTruncationPatterns("[8-75] Additional references");
    expect(found.length).toBeGreaterThan(0);
  });

  test("detects and so on", () => {
    const found = findBibliographyTruncationPatterns("...and so on.");
    expect(found.length).toBeGreaterThan(0);
  });

  test("returns empty for clean bibliography", () => {
    expect(findBibliographyTruncationPatterns("[1] Author. Title.")).toEqual([]);
  });
});

describe("regex constants", () => {
  test("CITATION_REF_PATTERN matches citations", () => {
    const matches = "See [1] and [42]".match(CITATION_REF_PATTERN);
    expect(matches).toEqual(["[1]", "[42]"]);
  });

  test("BIBLIOGRAPHY_SECTION_PATTERN matches section", () => {
    const match = "## Bibliography\nContent here".match(BIBLIOGRAPHY_SECTION_PATTERN);
    expect(match).not.toBeNull();
  });
});
