import { afterEach, beforeAll, describe, test, expect } from 'bun:test';
import { setGlobalSilent } from '../../../scripts/logger';
import { main, validateFeature, parseFeature, type ParsedFeature } from '../scripts/validate-feature';

beforeAll(() => {
    setGlobalSilent(true);
});

const originalExit = process.exit;

afterEach(() => {
    process.exit = originalExit;
});

function stubExit(): void {
    process.exit = ((code?: number) => {
        throw new Error(`EXIT:${code ?? 0}`);
    }) as typeof process.exit;
}

/** Narrow ParsedFeature | null and fail the test if null */
function assertParsed(result: ParsedFeature | null): ParsedFeature {
    expect(result).not.toBeNull();
    return result as ParsedFeature;
}

// ============================================================
// validateFeature tests
// ============================================================
describe('validateFeature', () => {
    // --- basic valid cases ---

    test('minimal valid feature', () => {
        const result = validateFeature(
            `Feature: Minimal
  Scenario: Happy path
    Given something
    When action
    Then result`,
        );
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    test('feature with background', () => {
        const result = validateFeature(
            `Feature: With Background

  Background:
    Given the database is seeded
    And the server is running

  Scenario: Test
    Given setup
    When action
    Then result`,
        );
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    test('feature with doc strings', () => {
        const result = validateFeature(
            `Feature: Doc strings

  Scenario: JSON payload
    Given the request body is:
      """
      { "name": "Test", "value": 42 }
      """
    When I send a POST request
    Then the response should be 200`,
        );
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.warnings).toHaveLength(0);
    });

    test('feature with scenario outline and examples', () => {
        const result = validateFeature(
            `Feature: Parametrized

  Scenario Outline: Add numbers
    Given I have a calculator
    When I add <a> and <b>
    Then the result should be <sum>

    Examples:
      | a | b | sum |
      | 1 | 2 | 3   |
      | 5 | 7 | 12  |`,
        );
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    test('feature with tags', () => {
        const result = validateFeature(
            `@smoke @regression
Feature: Tagged

  @wip
  Scenario: Test
    Given setup
    When action
    Then result`,
        );
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    test('feature with comments', () => {
        const result = validateFeature(
            `# This is a comment
Feature: Commented
  # Another comment
  Scenario: Test
    Given setup
    When action
    Then result`,
        );
        expect(result.valid).toBe(true);
    });

    test('feature and scenario descriptions are valid and do not warn', () => {
        const result = validateFeature(
            `Feature: Described feature
  This feature description is valid Gherkin prose.

  Scenario: Described scenario
    This scenario description is also valid.
    Given setup
    When action
    Then result`,
        );
        expect(result.valid).toBe(true);
        expect(result.warnings.some((w) => w.message.includes('Unrecognized syntax'))).toBe(false);
    });

    // --- error cases ---

    test('no feature declaration', () => {
        const result = validateFeature(
            `Scenario: Orphan
    Given something`,
        );
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('No Feature'))).toBe(true);
    });

    test('multiple feature declarations', () => {
        const result = validateFeature(
            `Feature: First
Feature: Second
  Scenario: Test
    Given something
    When action
    Then result`,
        );
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('Multiple Feature'))).toBe(true);
    });

    test('empty feature name', () => {
        const result = validateFeature(
            `Feature:
  Scenario: Test
    Given something
    When action
    Then result`,
        );
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('Feature name is empty'))).toBe(true);
    });

    test('empty scenario name', () => {
        const result = validateFeature(
            `Feature: Test
  Scenario:
    Given something
    When action
    Then result`,
        );
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('Scenario name is empty'))).toBe(true);
    });

    test('empty scenario outline name', () => {
        const result = validateFeature(
            `Feature: Test
  Scenario Outline:
    Given something
    When action
    Then result`,
        );
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('Scenario Outline name is empty'))).toBe(true);
    });

    test('duplicate scenario names', () => {
        const result = validateFeature(
            `Feature: Test
  Scenario: Same Name
    Given something
    When action
    Then result
  Scenario: Same Name
    Given something else
    When other action
    Then other result`,
        );
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('Duplicate scenario name'))).toBe(true);
    });

    test('duplicate between Scenario and Scenario Outline (2.1 fix)', () => {
        const result = validateFeature(
            `Feature: Test
  Scenario: Shared Name
    Given something
    When action
    Then result
  Scenario Outline: Shared Name
    Given <thing>
    When <action>
    Then <result>
    Examples:
      | thing | action | result |
      | a     | b      | c      |`,
        );
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('Duplicate scenario name: "Shared Name"'))).toBe(true);
    });

    test('And/But as first step', () => {
        const result = validateFeature(
            `Feature: Test
  Scenario: Bad first step
    And something`,
        );
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('cannot be the first step'))).toBe(true);
    });

    test('step outside scenario or background', () => {
        const result = validateFeature(
            `Feature: Test
  Given orphan step`,
        );
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('outside of any Scenario'))).toBe(true);
    });

    test('background after scenario', () => {
        const result = validateFeature(
            `Feature: Test
  Scenario: First
    Given something
    When action
    Then result
  Background:
    Given too late`,
        );
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('Background must come before'))).toBe(true);
    });

    test('data table outside scenario', () => {
        const result = validateFeature(
            `Feature: Test
  | orphan | table |`,
        );
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('Data table outside of any Scenario'))).toBe(true);
    });

    test('bare keyword without text triggers unrecognized syntax warning', () => {
        // "Given " becomes "Given" after trim — regex requires \s+ after keyword,
        // so it doesn't match as a step. It falls through to unrecognized syntax.
        const result = validateFeature(
            `Feature: Test
  Scenario: Empty step
    Given `,
        );
        expect(result.valid).toBe(true);
        expect(result.warnings.some((w) => w.message.includes('Unrecognized syntax'))).toBe(true);
    });

    test('unclosed doc string', () => {
        const result = validateFeature(
            `Feature: Test
  Scenario: Unclosed
    Given the body is:
      """
      { "unclosed": true }`,
        );
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('Unclosed doc string'))).toBe(true);
    });

    // --- (1.3 fix) background steps should NOT be errors ---

    test('steps inside Background are valid (1.3 fix)', () => {
        const result = validateFeature(
            `Feature: Background steps
  Background:
    Given the database is seeded
    And the server is running
  Scenario: Test
    When action
    Then result`,
        );
        expect(result.valid).toBe(true);
        expect(result.errors.some((e) => e.message.includes('outside of any Scenario'))).toBe(false);
    });

    // --- (3.3 fix) doc string content should not trigger warnings ---

    test('doc string content does not trigger unrecognized syntax (3.3 fix)', () => {
        const result = validateFeature(
            `Feature: Doc string content
  Scenario: JSON payload
    Given the body is:
      """
      { "name": "Test", "value": 42 }
      """
    When I send a request
    Then the response is 200`,
        );
        expect(result.warnings).toHaveLength(0);
    });

    // --- warning cases ---

    test('no scenario found is a warning', () => {
        const result = validateFeature(`Feature: Empty`);
        expect(result.valid).toBe(true);
        expect(result.warnings.some((w) => w.message.includes('No Scenario found'))).toBe(true);
    });

    test('unrecognized syntax is a warning', () => {
        const result = validateFeature(
            `Feature: Test
  Scenario: Test
    Given something
    When action
    Then result
  random text here`,
        );
        expect(result.valid).toBe(true);
        expect(result.warnings.some((w) => w.message.includes('Unrecognized syntax'))).toBe(true);
    });

    // --- (2.2 fix) step ordering ---

    test('Then without When warns (2.2 fix)', () => {
        const result = validateFeature(
            `Feature: Test
  Scenario: Skip When
    Given setup
    Then result`,
        );
        expect(result.valid).toBe(true);
        expect(result.warnings.some((w) => w.message.includes('without a preceding "When"'))).toBe(true);
    });

    test('Given -> And -> Then warns about missing When (2.2 fix)', () => {
        const result = validateFeature(
            `Feature: Test
  Scenario: And before Then
    Given setup
    And more setup
    Then result`,
        );
        expect(result.valid).toBe(true);
        expect(result.warnings.some((w) => w.message.includes('without a preceding "When"'))).toBe(true);
    });

    test('When after Then warns', () => {
        const result = validateFeature(
            `Feature: Test
  Scenario: Reverse
    Given setup
    When first action
    Then first result
    When second action`,
        );
        expect(result.valid).toBe(true);
        expect(result.warnings.some((w) => w.message.includes('consider splitting into separate scenario'))).toBe(true);
    });

    test('Given -> When -> And -> Then does not warn (2.2 fix)', () => {
        const result = validateFeature(
            `Feature: Test
  Scenario: Normal flow
    Given setup
    When action
    And more action
    Then result`,
        );
        expect(result.valid).toBe(true);
        expect(result.warnings).toHaveLength(0);
    });

    test('Then -> And -> Then does not warn', () => {
        const result = validateFeature(
            `Feature: Test
  Scenario: Multiple assertions
    Given setup
    When action
    Then result one
    And result two
    Then result three`,
        );
        expect(result.valid).toBe(true);
        expect(result.warnings).toHaveLength(0);
    });
});

describe('validate-feature CLI', () => {
    test('exits with code 1 when the feature file cannot be read', async () => {
        stubExit();

        await expect(main(['/tmp/does-not-exist.feature'])).rejects.toThrow('EXIT:1');
    });
});

// ============================================================
// parseFeature tests
// ============================================================
describe('parseFeature', () => {
    test('returns null for empty content', () => {
        const result = parseFeature('');
        expect(result).toBeNull();
    });

    test('parses minimal feature', () => {
        const f = assertParsed(
            parseFeature(
                `Feature: My Feature
  Scenario: My Scenario
    Given setup
    When action
    Then result`,
            ),
        );
        expect(f.name).toBe('My Feature');
        expect(f.scenarios).toHaveLength(1);
        expect(f.scenarios[0].name).toBe('My Scenario');
        expect(f.scenarios[0].steps).toHaveLength(3);
    });

    // --- (1.1 fix) correct line numbers ---

    test('step line numbers are correct (1.1 fix)', () => {
        const f = assertParsed(
            parseFeature(
                `Feature: Line Numbers
  Scenario: Test
    Given setup on line 3
    When action on line 4
    Then result on line 5`,
            ),
        );
        const steps = f.scenarios[0].steps;
        expect(steps[0].line).toBe(3);
        expect(steps[1].line).toBe(4);
        expect(steps[2].line).toBe(5);
    });

    test('step line numbers are never zero (1.1 fix)', () => {
        const f = assertParsed(
            parseFeature(
                `Feature: Test
  Scenario: Test
    Given first
    When second
    Then third`,
            ),
        );
        for (const step of f.scenarios[0].steps) {
            expect(step.line).toBeGreaterThan(0);
        }
    });

    // --- (1.2 fix) background parsing ---

    test('parses background steps (1.2 fix)', () => {
        const f = assertParsed(
            parseFeature(
                `Feature: With Background

  Background:
    Given the database is seeded
    And the server is running

  Scenario: Test
    When action
    Then result`,
            ),
        );
        expect(f.background).toBeDefined();
        expect(f.background?.steps).toHaveLength(2);
        expect(f.background?.steps[0].keyword).toBe('Given');
        expect(f.background?.steps[0].text).toBe('the database is seeded');
        expect(f.background?.steps[1].keyword).toBe('And');
        expect(f.background?.steps[1].text).toBe('the server is running');
    });

    test('background steps are separate from scenario steps', () => {
        const f = assertParsed(
            parseFeature(
                `Feature: Separation

  Background:
    Given shared setup

  Scenario: First
    When action one
    Then result one

  Scenario: Second
    When action two
    Then result two`,
            ),
        );
        expect(f.background?.steps).toHaveLength(1);
        expect(f.scenarios).toHaveLength(2);
        expect(f.scenarios[0].steps).toHaveLength(2);
        expect(f.scenarios[1].steps).toHaveLength(2);
    });

    // --- (3.4 fix) doc string parsing ---

    test('parses doc strings attached to steps (3.4 fix)', () => {
        const f = assertParsed(
            parseFeature(
                `Feature: Doc strings

  Scenario: JSON payload
    Given the body is:
      """
      { "name": "Test" }
      """
    When I send a request
    Then result`,
            ),
        );
        const givenStep = f.scenarios[0].steps[0];
        expect(givenStep.docString).toBe('{ "name": "Test" }');
    });

    // --- (3.4 fix) data table parsing ---

    test('parses data tables attached to steps (3.4 fix)', () => {
        const f = assertParsed(
            parseFeature(
                `Feature: Data tables

  Scenario: Users
    Given the following users exist:
      | name  | role  |
      | Alice | admin |
      | Bob   | user  |
    When I query users
    Then all users are found`,
            ),
        );
        const givenStep = f.scenarios[0].steps[0];
        expect(givenStep.dataTable).toBeDefined();
        expect(givenStep.dataTable).toHaveLength(3);
        expect(givenStep.dataTable?.[0]).toEqual(['name', 'role']);
        expect(givenStep.dataTable?.[1]).toEqual(['Alice', 'admin']);
        expect(givenStep.dataTable?.[2]).toEqual(['Bob', 'user']);
    });

    // --- (3.4 fix) scenario outline examples parsing ---

    test('parses scenario outline examples (3.4 fix)', () => {
        const f = assertParsed(
            parseFeature(
                `Feature: Outline

  Scenario Outline: Add numbers
    Given I have a calculator
    When I add <a> and <b>
    Then the result is <sum>

    Examples:
      | a | b | sum |
      | 1 | 2 | 3   |
      | 5 | 7 | 12  |`,
            ),
        );
        const scenario = f.scenarios[0];
        expect(scenario.outline).toBeDefined();
        expect(scenario.outline?.examples).toHaveLength(2);
        expect(scenario.outline?.examples[0]).toEqual({
            a: '1',
            b: '2',
            sum: '3',
        });
        expect(scenario.outline?.examples[1]).toEqual({
            a: '5',
            b: '7',
            sum: '12',
        });
    });

    // --- (3.5 fix) tag parsing ---

    test('parses feature-level tags (3.5 fix)', () => {
        const f = assertParsed(
            parseFeature(
                `@smoke @regression
Feature: Tagged

  Scenario: Test
    Given setup
    When action
    Then result`,
            ),
        );
        expect(f.tags).toEqual(['@smoke', '@regression']);
    });

    test('parses scenario-level tags (3.5 fix)', () => {
        const f = assertParsed(
            parseFeature(
                `Feature: Tagged Scenarios

  @wip
  Scenario: First
    Given setup
    When action
    Then result

  @slow @integration
  Scenario: Second
    Given setup
    When action
    Then result`,
            ),
        );
        expect(f.scenarios[0].tags).toEqual(['@wip']);
        expect(f.scenarios[1].tags).toEqual(['@slow', '@integration']);
    });

    test('scenario without tags has no tags property', () => {
        const f = assertParsed(
            parseFeature(
                `Feature: No Tags

  Scenario: Untagged
    Given setup
    When action
    Then result`,
            ),
        );
        expect(f.tags).toBeUndefined();
        expect(f.scenarios[0].tags).toBeUndefined();
    });

    // --- multiple scenarios ---

    test('parses multiple scenarios', () => {
        const f = assertParsed(
            parseFeature(
                `Feature: Multiple

  Scenario: First
    Given setup one
    When action one
    Then result one

  Scenario: Second
    Given setup two
    When action two
    Then result two`,
            ),
        );
        expect(f.scenarios).toHaveLength(2);
        expect(f.scenarios[0].name).toBe('First');
        expect(f.scenarios[1].name).toBe('Second');
    });

    // --- step keywords ---

    test('parses And and But keywords', () => {
        const f = assertParsed(
            parseFeature(
                `Feature: Keywords

  Scenario: All keywords
    Given setup
    And more setup
    But not this setup
    When action
    Then result
    And more result
    But not this result`,
            ),
        );
        const steps = f.scenarios[0].steps;
        expect(steps).toHaveLength(7);
        expect(steps[1].keyword).toBe('And');
        expect(steps[2].keyword).toBe('But');
        expect(steps[5].keyword).toBe('And');
        expect(steps[6].keyword).toBe('But');
    });
});
