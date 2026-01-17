---
name: super-coder
description: Methodology to build software reliably and efficiently. Use when building software. Emphasizes correctness, simplicity, testability, maintainability, and performance.
---

# Software Engineering Protocol

## Decision Priority

- 1. **Correctness & invariants** - Code must work; invalid states are impossible
- 2. **Simplicity (KISS > DRY)** - Manage complexity; simple changes should be simple
- 3. **Testability / verifiability** - Every change must be verifiable
- 4. **Maintainability (ETC)** - Design to be easier to change (low coupling, high cohesion)
- 5. **Performance** - Measure first; optimize last

**Rationale:** From "A Philosophy of Software Design" - complexity is the enemy. From "The Pragmatic Programmer" - ETC (Easier To Change) is the guiding value.

## Working Loop

**Clarify** → **Map impact** (topology) → **Plan minimal diff** → **Implement** → **Validate** → **Refactor** (only related) → **Report**

### The Two Hats Rule
Never add features and refactor simultaneously. Wear one hat at a time:
- **Feature hat:** Adding new behavior (tests drive implementation)
- **Refactor hat:** Changing structure (tests preserve behavior)

**Rationale:** From "Refactoring" - mixing both risks breaking behavior without tests catching it.

## Stop & Ask When

- Requirements are ambiguous/conflicting
- Public API / data contract / dependency direction must change
- The change triggers cross-module ripple (shotgun surgery risk)
- Security/privacy risk exists
- No credible validation path exists
- **Cognitive load exceeds capacity** - if you can't hold it all in your head, simplify

**Rationale:** From "Code Complete" - when complexity exceeds mental capacity, defects are inevitable.

## Change Rules

### Core Principles

- **Minimal diff:** No unrelated churn (refactor/rename/format/deps)
- **Domain language:** Names use ubiquitous language from problem space
- **One abstraction level:** Functions do one thing at one level of detail
- **Patterns judiciously:** Only with 3rd use; prefer composition over inheritance
- **Model-first:** Think in data structures before code
- **Explicit failures:** Never swallow errors; handle "impossible" cases defensively

### Interface Design

- **Deep modules:** Simple interface, powerful functionality (avoid shallow modules)
- **Information hiding:** Modules hide internals completely
- **Dependency inversion:** Depend on abstractions, not concretions

**Rationale:** From "Philosophy of Software Design" - deep modules maximize complexity hidden behind simple interfaces.

### Examples

**Domain Language (Good vs Bad):**
```diff
- function process(data) { ... }
+ function validateUserCredentials(credentials) { ... }
```

**One Abstraction Level:**
```diff
- function handleRequest() {
-   const db = connectDatabase();
-   const user = db.findUser(id);
-   sendEmail(user.email, welcomeTemplate);
- }
+ function handleRequest() {
+   const user = findUser(id);
+   sendWelcomeEmail(user);
+ }
```

**Explicit Failure Handling:**
```diff
- function parseConfig(path) {
-   return JSON.parse(fs.readFileSync(path));
- }
+ function parseConfig(path) {
+   if (!fs.existsSync(path)) {
+     throw new ConfigError(`Config file not found: ${path}`);
+   }
+   const content = fs.readFileSync(path, 'utf-8');
+   try {
+     return JSON.parse(content);
+   } catch (e) {
+     throw new ConfigError(`Invalid JSON in ${path}: ${e.message}`);
+   }
+ }
```

**Deep Module (Simple Interface, Powerful Behavior):**
```diff
// Shallow: Complex interface, little benefit
- class UserValidator {
-   setName(name)
-   setEmail(email)
-   setAge(age)
-   validate()
-   getErrors()
- }

// Deep: Simple interface, powerful functionality
+ class UserValidator {
+   validate(user) // Single method, comprehensive validation
+ }
```

## Verification Guardrail

### When Tests Are Required

- Changes to logic, data structures, or observable behavior
- Bug fixes (prevent regression)
- Refactoring (preserve behavior)
- Legacy code modifications (add characterization tests first)

### When Tests May Be Skipped

- Pure UI/presentation changes with no logic changes
- Documentation updates
- Variable renames (when tool-supported)
- If skipped: state verification steps + residual risk assessment

### Legacy Code Protocol

**Definition:** Legacy code = code without tests

**Before changing legacy code:**
1. Add characterization tests to document current behavior (bugs and all)
2. Identify seams to break dependencies
3. Use sprout (new code) or wrap (existing) techniques
4. Never edit the messy core without test coverage

**Rationale:** From "Working Effectively with Legacy Code" - characterization tests ensure refactoring doesn't accidentally change established behavior.

## Anti-Patterns

### Complexity Anti-Patterns

- **Premature optimization** - Measure first; optimize when data proves it's needed
- **Abstraction before 3rd use** - YAGNI (You Aren't Gonna Need It)
- **Shallow modules** - Complex interfaces with little functionality
- **Tactical programming** - Rushing features creates debt; invest in strategic design

### Coupling Anti-Patterns

- **Hidden coupling** - Unclear ownership across modules
- **Shotgun surgery** - Single change requires touching many files
- **Feature envy** - Method more interested in another object's data than its own

### Error Handling Anti-Patterns

- **Swallowing errors** - Silent failures hide bugs
- **Ignoring "impossible" cases** - Defensive programming means handling them anyway
- **Generic error types** - Use specific, actionable error types

**Rationale:** From "Clean Code" - broken windows theory: fix bad code immediately or rot accelerates.

## Output Format

After completing work, report:

1. **What changed** (files) + **why** (business value)
2. **How to verify** (tests run or manual verification steps)
3. **Risks / breaking changes** (if any)
4. **Residual risk** (if tests were skipped)

---

**See REFERENCE.md** for detailed principles from classic software engineering texts including Code Complete, Refactoring, Working Effectively with Legacy Code, A Philosophy of Software Design, Design Patterns, Domain-Driven Design, The Pragmatic Programmer, Clean Code, Clean Architecture, and Designing Data-Intensive Applications.
