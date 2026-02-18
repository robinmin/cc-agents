# Validation Checklist

Comprehensive checklist for validating Agent skills before publication.

## Frontmatter

- [ ] YAML frontmatter is valid
- [ ] `name` field follows hyphen-case (max 64 chars)
- [ ] `description` field is 50-1024 chars, describes what AND when to use
- [ ] Uses third-person form ("This skill should be used when...")

## Content Quality

- [ ] SKILL.md body uses imperative/infinitive form
- [ ] Body is focused and lean (1,500-2,000 words ideal, <5k max)
- [ ] Detailed content moved to references/
- [ ] Examples are complete and working

## Trigger Design

- [ ] Includes specific trigger phrases in quotes ("...")
- [ ] Third-person description ("This skill should be used when...")
- [ ] Concrete "when to use" scenarios ("create X", "configure Y")
- [ ] Synonym coverage for key concepts (timeout vs hang vs freeze)
- [ ] No workflow summaries in description (CSO violation)

## Instruction Clarity

- [ ] Imperative form ratio > 70%
- [ ] No vague language ("might", "could", "maybe", "as needed")
- [ ] Specific action verbs (create, configure, validate)
- [ ] Conditional instructions have clear branching criteria

## Value-Add Assessment

- [ ] Domain-specific content beyond generic advice
- [ ] Unique workflows not covered by standard prompting
- [ ] Concrete artifacts (scripts, templates, schemas)
- [ ] No explaining well-known concepts (REST, SQL, HTTP basics)

## Behavioral Readiness

- [ ] Error handling guidance ("what to do when X fails")
- [ ] Edge case documentation (null inputs, empty collections)
- [ ] Fallback strategies when primary approach fails
- [ ] tests/scenarios.yaml with behavioral test cases

## Structure

- [ ] SKILL.md in root (required)
- [ ] scripts/, references/, assets/ directories present
- [ ] SKILL.md references auxiliary resources
- [ ] Progressive disclosure: Quick Start in SKILL.md, details in references/

## Testing

- [ ] Skill triggers on expected user queries
- [ ] Content is helpful for intended tasks
- [ ] No duplicated information across files
- [ ] References load when needed

## Efficiency

- [ ] Under 3000 tokens (strongly prefer under 1500)
- [ ] No duplicate lines over 20 characters
- [ ] No verbose lines over 30 words

## Scripts (if present)

- [ ] All scripts have proper error handling
- [ ] All scripts have `if __name__ == "__main__":` guards
- [ ] All scripts have type hints
- [ ] All scripts have docstrings
- [ ] Unit tests exist in tests/ directory
- [ ] All unit tests pass

## See Also

- [Scanner Criteria](scanner-criteria.md) - Detailed dimension definitions
- [Best Practices](best-practices.md) - Comprehensive guidance
- [Writing Style](writing-style.md) - Imperative form guidelines
