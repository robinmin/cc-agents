# Gherkin Syntax Reference

This document provides a quick reference for Gherkin syntax used in bdd-workflow.

## Basic Structure

```gherkin
Feature: Name of the feature

  Scenario: Name of the scenario
    Given context or preconditions
    When action or trigger
    Then expected outcome
```

## Keywords

| Keyword | Purpose | Occurrences |
|---------|---------|-------------|
| `Feature` | Groups related scenarios | 1 per file |
| `Background` | Setup before all scenarios | 0-1 per file |
| `Scenario` | Single test case | 1+ per file |
| `Scenario Outline` | Parametrized scenario | 0+ per file |
| `Examples` | Parameters for scenario outline | 0+ per outline |
| `Given` | Setup preconditions | 0+ per scenario |
| `When` | Action or trigger | 1+ per scenario |
| `Then` | Expected outcome | 1+ per scenario |
| `And` | Continuation of previous step | 0+ per scenario |
| `But` | Continuation with contrast | 0+ per scenario |

## Step Patterns

### Given Steps (Setup)

```gherkin
Given a file named "input.json" exists
Given the database is empty
Given the user is authenticated as "admin"
Given the cache is cleared
```

### When Steps (Action)

```gherkin
When I run the command "npm test"
When I create a file "output.txt" with content "hello"
When the API receives a POST request to "/users"
When I delete the directory "temp"
```

### Then Steps (Verification)

```gherkin
Then the command should exit with code 0
Then the file "output.txt" should contain "hello"
Then the API should return status 200
Then the database should have 1 record
```

## Scenario Outline

For parametrized testing:

```gherkin
Scenario Outline: Add two numbers
  Given I have a calculator
  When I add <a> and <b>
  Then the result should be <sum>

  Examples:
    | a | b | sum |
    | 1 | 2 | 3   |
    | 5 | 7 | 12  |
    | 0 | 0 | 0   |
```

## Background

Shared setup for all scenarios:

```gherkin
Feature: User management

  Background:
    Given the database is seeded with test users
    And the API server is running

  Scenario: Create new user
    When I send a POST request to "/users"
    Then the user should be created

  Scenario: Delete user
    When I send a DELETE request to "/users/1"
    Then the user should be deleted
```

## Data Tables

For complex parameters:

```gherkin
Scenario: Create users from data table
  Given the following users exist:
    | name  | email            | role    |
    | Alice | alice@example.com | admin   |
    | Bob   | bob@example.com   | user    |
  When I create a user "Charlie" with email "charlie@example.com"
  Then the user should be in the database
```

## Doc Strings

For multi-line content:

```gherkin
Scenario: Process JSON payload
  Given the request body is:
    """
    {
      "name": "Test",
      "value": 42
    }
    """
  When I send a POST request to "/api"
  Then the response should be successful
```

## Best Practices

### DO
- Use Given-When-Then order
- Keep scenarios focused (single behavior per scenario)
- Use descriptive step text (not "Given I do step 1")
- Keep step count between 3-8 per scenario
- Make scenario names unique and descriptive

### DON'T
- Don't use "And" as the first step (always start with Given/When/Then)
- Don't put assertions in Given steps (that's what Then is for)
- Don't create scenarios with more than 10 steps
- Don't use vague language ("should work", "might fail")

## Validation

Use `scripts/validate-feature.ts` to validate Gherkin syntax before execution.
