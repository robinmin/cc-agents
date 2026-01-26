---
name: task-review
description: Comprehensive code review for frontend (React/Vue/TS) and backend (Node.js/TS) projects with business logic, security, performance, and accessibility checks
argument-hint: "[--scope frontend|backend|fullstack] [--mode quick|standard|detailed] [--domain web3]"
---

# Code Review Command

Perform a comprehensive white-box code review focusing on business logic correctness, technical quality, and user experience. This command applies industry best practices from Google, Microsoft, and OWASP guidelines.

## Arguments

| Argument   | Values                             | Default     | Description                            |
| ---------- | ---------------------------------- | ----------- | -------------------------------------- |
| `--scope`  | `frontend`, `backend`, `fullstack` | Auto-detect | Focus review on specific layer         |
| `--mode`   | `quick`, `standard`, `detailed`    | `standard`  | Review depth level                     |
| `--domain` | `web3`, `fintech`, `healthcare`    | None        | Enable domain-specific security checks |

**Auto-detection**: If `--scope` not specified, detect from project structure:

- `frontend`: Has `src/components/`, `*.tsx`, `tailwind.config.*`, `next.config.*`
- `backend`: Has `src/routes/`, `src/controllers/`, `prisma/`, `drizzle/`
- `fullstack`: Both patterns present

## Review Dimensions

### Severity Levels

| Level        | Meaning                       | Action                  |
| ------------ | ----------------------------- | ----------------------- |
| **BLOCKING** | Must fix before merge         | Review fails if present |
| **WARNING**  | Should fix, creates tech debt | Document if deferred    |
| **INFO**     | Improvement opportunity       | Optional enhancement    |

---

## 1. Business Logic Review (BLOCKING)

> **Principle**: Code must implement actual requirements, not assumed requirements.

### 1.1 Requirement Verification

- [ ] **Requirement Source Located**: Find the actual requirement (ticket, PRD, user story)
- [ ] **Implementation Complete**: Code implements 100% of stated requirements
- [ ] **No Gold-Plating**: No unrequested features added
- [ ] **Acceptance Criteria Met**: All acceptance criteria verifiable

**Verification Method**:

```bash
# Find requirement references in commits/comments
git log --oneline -20 | grep -E "(feat|fix|close|resolve)"
grep -r "TODO\|FIXME\|XXX" src/ --include="*.ts" --include="*.tsx"
```

### 1.2 Logic Correctness

- [ ] **State Transitions**: All state changes follow valid business rules
- [ ] **Data Flow**: Input → Processing → Output chain is correct
- [ ] **Conditional Logic**: All branches handle expected cases
- [ ] **Edge Cases**: Boundary conditions explicitly handled

### 1.3 Data Integrity

- [ ] **Model Definitions**: Fields match business domain (types, constraints, nullability)
- [ ] **Validation Rules**: Business rules enforced at appropriate layer
- [ ] **Referential Integrity**: Relationships maintained correctly

---

## 2. Technical Quality Review (WARNING)

### 2.1 Architecture

- [ ] **Single Responsibility**: Each module/function has one clear purpose
- [ ] **Dependency Direction**: Dependencies flow inward (domain doesn't depend on infra)
- [ ] **KISS Compliance**: No over-engineering or premature abstraction
- [ ] **Pattern Consistency**: Follows existing codebase patterns (not ad-hoc solutions)

### 2.2 Type Safety (TypeScript)

- [ ] **No `any` Escape Hatches**: Zero `any` types without documented justification
- [ ] **No Type Assertions Abuse**: `as` only used with proper narrowing
- [ ] **Strict Mode Enabled**: `tsconfig.json` has `strict: true`
- [ ] **No Suppression Comments**: No `@ts-ignore`, `@ts-expect-error` without reason

**Verification Method**:

```bash
# Find type safety violations
grep -r "as any\|: any\|@ts-ignore\|@ts-expect-error" src/ --include="*.ts" --include="*.tsx" -n
```

### 2.3 Error Handling

- [ ] **No Empty Catch Blocks**: All errors handled or re-thrown with context
- [ ] **Error Boundaries**: React components have error boundaries where needed
- [ ] **Async Error Handling**: All promises have `.catch()` or try/catch
- [ ] **User-Friendly Messages**: Errors shown to users are actionable

### 2.4 Testing

- [ ] **Test Coverage**: Critical paths have test coverage (target: 80%+)
- [ ] **Test Quality**: Tests verify behavior, not implementation
- [ ] **Edge Cases Tested**: Boundary conditions have explicit tests
- [ ] **No Flaky Tests**: Tests are deterministic and isolated

**Verification Method**:

```bash
# Run tests with coverage
npm run test -- --coverage
# or
pnpm test -- --coverage
```

---

## 3. API Contract Review (BLOCKING)

> **Principle**: Frontend and backend must agree on exact API shape.

### 3.1 Endpoint Consistency

| Check  | Frontend                         | Backend                    | Match?     |
| ------ | -------------------------------- | -------------------------- | ---------- |
| Path   | `/api/users/:id`                 | `router.get('/users/:id')` | Must match |
| Method | `fetch(..., { method: 'POST' })` | `router.post(...)`         | Must match |
| Auth   | `Authorization: Bearer`          | `requireAuth` middleware   | Must match |

- [ ] **No Hardcoded URLs**: All endpoints from centralized config/constants
- [ ] **Path Parameters Match**: Dynamic segments identical (`:id` vs `[id]`)
- [ ] **HTTP Methods Semantic**: GET=read, POST=create, PUT=update, DELETE=remove
- [ ] **Trailing Slashes Consistent**: `/users` vs `/users/` - pick one

### 3.2 Request/Response Schema

- [ ] **Field Names Match**: `camelCase` on both sides (or documented transformation)
- [ ] **Types Match**: `number` vs `string`, `Date` vs ISO string
- [ ] **Required/Optional Match**: Frontend expects same fields backend provides
- [ ] **Pagination Contract**: Page/limit/offset/cursor aligned

### 3.3 Authentication Flow

- [ ] **Token Handling**: Frontend sends token where backend expects it
- [ ] **CORS Configuration**: Backend allows frontend origin
- [ ] **Cookie Settings**: `credentials: 'include'` if using cookies
- [ ] **Refresh Flow**: Token refresh mechanism consistent

### 3.4 Error Response Contract

- [ ] **Error Shape Consistent**: `{ error: string, code?: string, details?: object }`
- [ ] **Status Codes Meaningful**: 400=validation, 401=auth, 403=permission, 404=not found
- [ ] **Frontend Handles All Codes**: Error UI for each error type

**Contract Crosswalk Template**:

```markdown
| Parameter | Frontend (file:line) | Backend (file:line) | Storage  | Match |
| --------- | -------------------- | ------------------- | -------- | ----- |
| userId    | src/api/users.ts:15  | routes/users.ts:32  | users.id | ✅    |
```

---

## 4. Security Review (BLOCKING)

> **Based on OWASP Top 10 and industry standards**

### 4.1 Input Validation

- [ ] **All User Input Validated**: Forms, query params, headers, body
- [ ] **Validation at Boundary**: Validate at API entry, not deep in code
- [ ] **Schema Validation**: Use Zod/Yup/Joi, not manual checks
- [ ] **No SQL/NoSQL Injection**: Parameterized queries only

**Verification Method**:

```bash
# Find potential injection points
grep -r "\.query\|\.exec\|eval(" src/ --include="*.ts" -n
grep -r "\$\{.*\}" src/ --include="*.ts" -n | grep -i "query\|sql"
```

### 4.2 Authentication & Authorization

- [ ] **Auth on All Protected Routes**: No route accidentally public
- [ ] **Authorization Checks**: User can only access their own resources
- [ ] **Session Management**: Secure cookies, proper expiration
- [ ] **No Secrets in Code**: API keys, tokens in env vars only

**Verification Method**:

```bash
# Find potential secrets
grep -rE "(api_key|apikey|secret|password|token).*=.*['\"][^'\"]+['\"]" src/ --include="*.ts" -n
```

### 4.3 XSS Prevention

- [ ] **No `dangerouslySetInnerHTML`**: Unless sanitized with DOMPurify
- [ ] **No `innerHTML`**: Use textContent or React's JSX
- [ ] **URL Validation**: User-provided URLs validated before use
- [ ] **CSP Headers**: Content Security Policy configured

### 4.4 CSRF Protection

- [ ] **CSRF Tokens**: State-changing requests have CSRF protection
- [ ] **SameSite Cookies**: `SameSite=Strict` or `Lax` on auth cookies
- [ ] **Origin Validation**: Backend validates request origin

---

## 5. Performance Review (WARNING)

### 5.1 Frontend Performance

- [ ] **Bundle Size**: No unnecessary dependencies imported
- [ ] **Code Splitting**: Large routes/components lazy loaded
- [ ] **Image Optimization**: Next/Image or proper srcset/lazy loading
- [ ] **Memoization**: `useMemo`/`useCallback` for expensive operations
- [ ] **No N+1 Renders**: Lists use proper keys, no unnecessary re-renders

**Verification Method**:

```bash
# Analyze bundle
npm run build -- --analyze
# or check for large imports
grep -r "import.*from ['\"]lodash['\"]" src/ --include="*.ts" --include="*.tsx"
```

### 5.2 Backend Performance

- [ ] **No N+1 Queries**: Use joins or batch fetching
- [ ] **Database Indexes**: Queries on indexed columns
- [ ] **Connection Pooling**: Database connections pooled
- [ ] **Caching Strategy**: Appropriate caching for read-heavy data
- [ ] **Pagination**: Large lists paginated, not fetched entirely

**Verification Method**:

```bash
# Find potential N+1 patterns
grep -r "\.findMany\|\.find(" src/ --include="*.ts" -n -A 5 | grep -i "for\|map\|forEach"
```

### 5.3 Core Web Vitals (Frontend)

- [ ] **LCP < 2.5s**: Largest Contentful Paint optimized
- [ ] **FID < 100ms**: First Input Delay minimized
- [ ] **CLS < 0.1**: Cumulative Layout Shift prevented

---

## 6. Accessibility Review (WARNING)

> **Based on WCAG 2.1 AA standards**

### 6.1 Semantic HTML

- [ ] **Proper Headings**: h1-h6 in logical order, one h1 per page
- [ ] **Landmarks**: `<main>`, `<nav>`, `<header>`, `<footer>` used correctly
- [ ] **Lists**: `<ul>`/`<ol>` for lists, not styled divs
- [ ] **Buttons vs Links**: `<button>` for actions, `<a>` for navigation

### 6.2 ARIA Usage

- [ ] **ARIA Labels**: Interactive elements have accessible names
- [ ] **ARIA Roles**: Custom components have appropriate roles
- [ ] **No ARIA Misuse**: Native HTML preferred over ARIA when possible
- [ ] **Live Regions**: Dynamic content announces changes

**Verification Method**:

```bash
# Find accessibility issues
grep -r "onClick" src/ --include="*.tsx" -n | grep -v "button\|Button\|<a\|Link"
grep -r "role=" src/ --include="*.tsx" -n
```

### 6.3 Keyboard Navigation

- [ ] **Tab Order Logical**: Focus moves in expected order
- [ ] **Focus Visible**: `:focus` styles present and visible
- [ ] **No Keyboard Traps**: User can always escape modals/dropdowns
- [ ] **Skip Links**: Skip to main content link present

### 6.4 Visual Accessibility

- [ ] **Color Contrast**: 4.5:1 minimum for text
- [ ] **No Color-Only Information**: Status indicated by more than color
- [ ] **Text Resizable**: Layout works at 200% zoom
- [ ] **Motion Reduced**: Respects `prefers-reduced-motion`

---

## 7. User Flow Verification (BLOCKING)

> **Principle**: "Code compiles" ≠ "Feature works"

### 7.1 Click-to-Completion Tracing

For each user interaction in the changed code:

1. **What happens on click?**

   - Handler function identified (file:line)
   - All called functions traced

2. **Where does navigation go?**

   - Target route exists in router config
   - Route component handles all expected params

3. **What does user see?**
   - Success state renders correctly
   - Error state has recovery path
   - Loading state shown during async operations

### 7.2 Navigation Verification

- [ ] **All `navigate()` targets exist**: Route defined in router
- [ ] **URL params handled**: Target component extracts params correctly
- [ ] **Query params preserved**: Filters/state not lost on navigation
- [ ] **Back button works**: History state correct

**Verification Method**:

```bash
# Find all navigation calls
grep -r "navigate(\|router\.push\|Link.*to=" src/ --include="*.tsx" --include="*.ts" -n

# Find all route definitions
grep -r "path=\|Route.*path" src/ --include="*.tsx" -n
```

### 7.3 State Consistency

- [ ] **Optimistic updates match server**: UI reflects actual saved state
- [ ] **Loading states clear**: User knows when action is pending
- [ ] **Error recovery**: User can retry failed actions
- [ ] **Stale data handled**: Cache invalidated on mutations

---

## 8. Common Issues Checklist (Quick Scan)

### 8.1 Naming Consistency

| Issue                      | Example                          | Fix                     |
| -------------------------- | -------------------------------- | ----------------------- |
| Case mismatch              | `userId` (FE) vs `user_id` (BE)  | Align on one convention |
| Abbreviation inconsistency | `btn` vs `button`                | Use full words          |
| Domain term drift          | `customer` vs `user` vs `client` | Single term per concept |

### 8.2 Path Issues

| Issue                   | Example                       | Fix                     |
| ----------------------- | ----------------------------- | ----------------------- |
| Trailing slash mismatch | `/api/users` vs `/api/users/` | Pick one, be consistent |
| Dynamic segment format  | `:id` vs `[id]` vs `{id}`     | Framework-specific      |
| Case sensitivity        | `/Users` vs `/users`          | Lowercase paths         |

### 8.3 Type Drift

| Issue            | Example                           | Fix                |
| ---------------- | --------------------------------- | ------------------ |
| Number as string | `"123"` vs `123`                  | Parse at boundary  |
| Date formats     | `Date` vs ISO string vs timestamp | Standardize on ISO |
| Boolean encoding | `"true"` vs `true` vs `1`         | Use actual boolean |

---

## 9. Domain-Specific Security (Optional)

> Enable with `--domain web3|fintech|healthcare`

### 9.1 Web3/Crypto (--domain web3)

<details>
<summary>Click to expand Web3-specific checks</summary>

#### Private Key Management (CRITICAL)

- [ ] **No keys in code/logs**: grep for `private_key`, `mnemonic`, `seed`
- [ ] **Encrypted storage**: Keys encrypted at rest
- [ ] **HSM/KMS usage**: Production uses hardware security

#### Transaction Security

- [ ] **Signature verification**: All transactions signed and verified
- [ ] **Nonce management**: Replay attacks prevented
- [ ] **Amount limits**: Transaction limits enforced
- [ ] **Slippage protection**: Price impact limits set

#### Smart Contract Interaction

- [ ] **No infinite approvals**: `approve()` with exact amounts only
- [ ] **Contract whitelist**: Only interact with audited contracts
- [ ] **Simulation before execution**: Dry-run transactions

</details>

### 9.2 Fintech (--domain fintech)

<details>
<summary>Click to expand Fintech-specific checks</summary>

#### PCI-DSS Compliance

- [ ] **No PAN storage**: Card numbers never stored raw
- [ ] **Tokenization**: Use payment processor tokens
- [ ] **Audit logging**: All financial operations logged

#### Transaction Integrity

- [ ] **Idempotency keys**: Duplicate requests handled
- [ ] **Double-entry**: Balanced ledger entries
- [ ] **Reconciliation**: Automated balance verification

</details>

### 9.3 Healthcare (--domain healthcare)

<details>
<summary>Click to expand Healthcare-specific checks</summary>

#### HIPAA Compliance

- [ ] **PHI encryption**: Patient data encrypted
- [ ] **Access logging**: All PHI access logged
- [ ] **Minimum necessary**: Only required data exposed

</details>

---

## Review Output Format

### Quick Mode (--mode quick)

```markdown
## Code Review Summary

**Result**: ✅ PASS | ❌ FAIL | ⚠️ NEEDS FIXES

### Blockers (must fix)

- [ ] [Issue description] - `file:line`

### Warnings (should fix)

- [ ] [Issue description] - `file:line`
```

### Standard Mode (--mode standard)

```markdown
## Code Review Report

**Reviewed**: [files/commits]
**Result**: ✅ PASS | ❌ FAIL | ⚠️ NEEDS FIXES

### 1. Business Logic

[Assessment and issues]

### 2. Technical Quality

[Assessment and issues]

### 3. API Contracts

[Contract crosswalk table]

### 4. Security

[Assessment and issues]

### 5. Performance

[Assessment and issues]

### 6. Accessibility

[Assessment and issues]

### 7. User Flows

[Verification results]

---

## Action Items

### Blockers (MUST fix before merge)

| Issue   | Location    | Fix             |
| ------- | ----------- | --------------- |
| [Issue] | `file:line` | [Suggested fix] |

### Warnings (SHOULD fix)

| Issue   | Location    | Fix             |
| ------- | ----------- | --------------- |
| [Issue] | `file:line` | [Suggested fix] |

### Recommended Follow-ups

- [ ] Run `/task-fixall` for auto-fixable issues
- [ ] Add tests for [specific scenario]
```

### Detailed Mode (--mode detailed)

Includes all of Standard plus:

- Code snippets for each issue
- Diff suggestions for fixes
- Full contract crosswalk matrix
- Performance metrics if available

---

## Verification Commands Reference

```bash
# Type safety
grep -r "as any\|: any\|@ts-ignore" src/ --include="*.ts" --include="*.tsx" -n

# Security - secrets
grep -rE "(api_key|secret|password|token).*=.*['\"]" src/ --include="*.ts" -n

# Security - injection
grep -r "eval\|innerHTML\|dangerouslySetInnerHTML" src/ --include="*.ts" --include="*.tsx" -n

# Accessibility - click handlers on non-buttons
grep -r "onClick" src/ --include="*.tsx" -n | grep -v "button\|Button"

# Navigation targets
grep -r "navigate(\|router\.push\|Link.*to=" src/ --include="*.tsx" -n

# Route definitions
grep -r "path=\|Route.*element=" src/ --include="*.tsx" -n

# API endpoints (frontend)
grep -r "fetch\|axios\|useSWR\|useQuery" src/ --include="*.ts" --include="*.tsx" -n

# Route handlers (backend)
grep -r "router\.\(get\|post\|put\|delete\|patch\)" src/ --include="*.ts" -n
```

---

## Review Principles

1. **Evidence Over Assumption**: Every claim must cite `file:line`
2. **Requirements First**: Business logic errors are more critical than style issues
3. **User Perspective**: Test actual user flows, not just code structure
4. **Minimal Fix**: Suggest smallest change that fixes the issue
5. **No Gold-Plating**: Review scope is the changed code, not the entire codebase

---

## Integration with Other Commands

After review completes:

- **Auto-fix issues**: `/task-fixall npm run check`
- **Update spec**: `/task-spec --diff` if API contracts changed
- **Generate tests**: For uncovered critical paths identified

---

## References

- [Google Engineering Practices - Code Review](https://google.github.io/eng-practices/review/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [TypeScript ESLint Rules](https://typescript-eslint.io/rules/)
- [React Accessibility](https://react.dev/reference/react-dom/components#form-components)
