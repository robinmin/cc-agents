# Workflow Templates Reference

Detailed examples and edge cases for each workflow template.

## Template Selection Examples

### Example 1: "Add OAuth2 authentication with Google and GitHub"

**Analysis:**
- Keywords: "add" (implement), "authentication" (backend/service)
- No UI keywords detected
- **Selected: W1 (coding)**

**Execution:**
1. super-architect: Design auth architecture (token storage, refresh flow, provider abstraction)
2. super-coder: Implement OAuth2 providers, callbacks, token management
3. super-code-reviewer: Review security, token handling, error flows
4. super-coder: Fix any review issues

### Example 2: "Build a user dashboard with charts and filters"

**Analysis:**
- Keywords: "build" (implement), "dashboard" (UI), "charts" (component), "filters" (component)
- UI keywords detected: dashboard, charts, filters
- **Selected: W2 (coding-with-design)**

**Execution:**
1. super-architect: Design data flow (API endpoints, data aggregation)
2. super-designer: Design dashboard layout, chart components, filter UX, accessibility
3. super-coder: Implement dashboard components and data integration
4. super-code-reviewer: Review implementation
5. super-coder: Fix any review issues

### Example 3: "Research best practices for microservice communication"

**Analysis:**
- Keywords: "research" (investigate), "best practices" (analyze)
- No implementation keywords
- **Selected: W3 (research)**

**Execution:**
1. knowledge-seeker: Research patterns (sync vs async, gRPC vs REST, event-driven)
2. super-brain: Synthesize findings into structured comparison
3. knowledge-seeker: Verify claims and cross-reference sources

### Example 4: "Fix the login form not submitting on Safari"

**Analysis:**
- Keywords: "fix" (bug), "not submitting" (broken behavior)
- Bug-related language dominates
- **Selected: W4 (bugfix)**

**Execution:**
1. super-coder: Reproduce in Safari, isolate root cause, implement fix
2. super-code-reviewer: Verify fix, check cross-browser compatibility
3. super-coder: Address any review feedback

### Example 5: "Refactor the authentication module to use strategy pattern"

**Analysis:**
- Keywords: "refactor" (restructure), "strategy pattern" (architecture)
- Clear refactoring intent
- **Selected: W5 (refactor)**

**Execution:**
1. super-architect: Analyze current auth module, plan strategy pattern migration
2. super-coder: Refactor incrementally, maintain test coverage
3. super-code-reviewer: Verify no regressions, check pattern correctness
4. super-coder: Fix any review issues

### Example 6: "Write a tutorial on setting up CI/CD with GitHub Actions"

**Analysis:**
- Keywords: "write" (content), "tutorial" (documentation)
- Content creation intent
- **Selected: W6 (content)**

**Execution:**
1. knowledge-seeker: Research current GitHub Actions best practices
2. wt:tc-writer: Write tutorial with code examples
3. knowledge-seeker: Fact-check technical claims

### Example 7: "What are our options for real-time notifications?"

**Analysis:**
- Keywords: "options" (explore), "what are" (brainstorm)
- No implementation intent
- **Selected: W7 (planning-only)**

**Execution:**
1. super-brain: Brainstorm approaches (WebSockets, SSE, polling, push notifications)
2. super-planner: Save brainstorm output

## Edge Cases

### Mixed Intent: "Research and then implement caching"

**Resolution:** W1 (coding) with knowledge-seeker added to Pre-production.
- The "implement" keyword signals coding workflow
- The "research" keyword adds a research Pre-production phase

**Modified W1:**
| Role | Agent |
|------|-------|
| Pre-production | knowledge-seeker + super-architect |
| Maker | super-coder |
| Post-production | super-code-reviewer |

### Ambiguous: "Update the user profile page"

**Resolution:** Depends on context.
- If primarily backend changes: W1 (coding)
- If UI redesign: W2 (coding-with-design)
- If just fixing a bug: W4 (bugfix)

**Action:** In --semi mode, ask user to disambiguate.

### No Match: "Deploy to production"

**Resolution:** No workflow template matches deployment tasks directly.
- Default to W1 (coding) if there is implementation involved
- Or suggest custom workflow if deployment-specific

**Action:** Ask user to clarify scope.
