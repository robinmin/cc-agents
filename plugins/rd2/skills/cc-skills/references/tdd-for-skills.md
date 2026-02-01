# TDD for Skills (Advanced)

**Core principle:** Writing skills IS Test-Driven Development applied to process documentation.

## The Iron Law

**NO SKILL WITHOUT A FAILING TEST FIRST.**

If you did not watch an agent fail without the skill, you do not know if the skill teaches the right thing.

## TDD Mapping

| TDD Concept | Skill Creation |
|-------------|----------------|
| Test case | Pressure scenario with subagent |
| Production code | Skill document (SKILL.md) |
| Test fails (RED) | Agent violates rule without skill |
| Test passes (GREEN) | Agent complies with skill present |
| Refactor | Close loopholes while maintaining compliance |

## RED-GREEN-REFACTOR for Skills

### RED: Write Failing Test (Baseline)

Run pressure scenario with subagent WITHOUT the skill. Document:
- What choices did they make?
- What rationalizations did they use (verbatim)?
- Which pressures triggered violations?

**Example pressure scenarios:**
- "Quick fix needed, skip tests this time"
- "Just add the feature, we'll refactor later"
- "The user is waiting, no time for review"

### GREEN: Write Minimal Skill

Write skill addressing those specific rationalizations. Run same scenarios WITH skill.

**Key questions:**
- Does the agent now follow the guidance?
- Are the rationalizations explicitly countered?
- Is the skill minimal (no unnecessary content)?

### REFACTOR: Close Loopholes

Agent found new rationalization? Add explicit counter. Re-test until bulletproof.

**Common refinements:**
- Add "When NOT to use" section
- Counter specific edge case rationalizations
- Strengthen imperative language

## Testing by Skill Type

### Technique Skills
Test that agent follows the steps in order:
1. Run scenario requiring the technique
2. Verify each step is executed
3. Check for common shortcuts skipped

### Pattern Skills
Test that agent applies the mental model:
1. Present problem that pattern addresses
2. Verify agent uses pattern reasoning
3. Check for correct "when to apply" decisions

### Reference Skills
Test that agent finds and uses information:
1. Ask question requiring reference lookup
2. Verify correct information retrieved
3. Check for accurate citation/usage

## Common Rationalizations Table

| Rationalization | Reality | Skill Counter |
|-----------------|---------|---------------|
| "This is just a small change" | Small changes accumulate into technical debt | "Every change, regardless of size, requires..." |
| "The user needs it urgently" | Urgency does not excuse poor practice | "Time pressure is not a valid reason to skip..." |
| "I'll fix it later" | Later never comes | "Complete the implementation now, including..." |
| "This is temporary" | Temporary code becomes permanent | "Treat all code as production code..." |
| "Tests would slow me down" | Tests save time in the long run | "Tests are required before implementation is complete..." |

## When to Use TDD for Skills

**Use TDD when:**
- Skill addresses common violations
- Behavior change is critical
- Multiple agents need consistent behavior
- Rationalizations are predictable

**Skip TDD when:**
- Skill is purely informational (Reference type)
- Behavior is already correct without skill
- Time constraints prevent proper baseline testing

## Integration with Evaluation

TDD for skills complements the evaluation scripts:
- **Evaluation scripts** check structure and quality
- **TDD** tests actual agent behavior with the skill

Both are valuable; they serve different purposes.

## Quick Checklist

- [ ] Ran scenario WITHOUT skill (baseline)
- [ ] Documented specific failures/rationalizations
- [ ] Wrote minimal skill addressing failures
- [ ] Ran scenario WITH skill (verification)
- [ ] Iterated until agent behavior correct
- [ ] Closed any loopholes found during testing
