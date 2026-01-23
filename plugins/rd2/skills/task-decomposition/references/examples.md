# Task Decomposition Examples

This document provides detailed, real-world examples of task decomposition across different complexity levels.

## Table of Contents

- [Example 1: Simple Feature](#example-1-simple-feature-password-reset)
- [Example 2: Complex Feature](#example-2-complex-feature-oauth2-authentication)
- [Example 3: Multi-System Integration](#example-3-multi-system-integration-crm-sync)

---

## Example 1: Simple Feature (Password Reset)

### Requirement

> "Add password reset feature to the application"

### Analysis

- **Complexity:** Low
- **Domain:** Authentication
- **Integration points:** Email service, user database, frontend UI
- **Risk level:** Medium (security-sensitive but well-understood)

### Task Breakdown

```
1. Design password reset flow
2. Implement password reset token generation
3. Add password reset endpoint
4. Create password reset email template
5. Implement frontend password reset form
6. Add password reset tests
```

### Detailed Task Specifications

#### Task 1: Design Password Reset Flow

**Background:**
Users need ability to reset forgotten passwords securely.

**Requirements:**
- Token-based reset mechanism
- Time-limited tokens (1 hour expiry)
- Single-use tokens
- Email delivery

**Solutions:**
- Generate secure random tokens
- Store tokens in database with expiry
- Send email with reset link
- Validate token on reset

**Estimated Effort:** 2-3 hours

**Dependencies:** None

#### Task 2: Implement Password Reset Token Generation

**Background:**
Need secure token generation and storage.

**Requirements:**
- Cryptographically secure random tokens
- Token storage with user association
- Expiry timestamp

**Solutions:**
```python
# Token generation
def generate_reset_token():
    return secrets.token_urlsafe(32)

# Token storage
reset_tokens = {
    'token': 'abc123...',
    'user_id': 123,
    'expires_at': datetime.now() + timedelta(hours=1)
}
```

**References:**
- Code: `/src/auth/tokens.py`
- Code: `/src/models/user.py`

**Estimated Effort:** 3-4 hours

**Dependencies:** Task 1

#### Task 3: Add Password Reset Endpoint

**Background:**
API endpoint to handle password reset requests and submissions.

**Requirements:**
- POST /api/auth/reset-request (initiate reset)
- POST /api/auth/reset (submit new password)
- Token validation
- Password update

**Solutions:**
- Validate email exists
- Generate and store token
- Send email with reset link
- On reset: validate token, update password, invalidate token

**Estimated Effort:** 4-5 hours

**Dependencies:** Task 2

#### Task 4: Create Password Reset Email Template

**Background:**
Users receive email with reset link.

**Requirements:**
- Clear instructions
- Reset link with token
- Professional design
- Security notice

**Solutions:**
- HTML email template
- Plain text version
- Reset link: `https://app.com/reset?token=xxx`
- Support contact info

**Estimated Effort:** 2-3 hours

**Dependencies:** None (can proceed in parallel with 2-3)

#### Task 5: Implement Frontend Password Reset Form

**Background:**
UI for users to reset password.

**Requirements:**
- Request form (email input)
- Reset form (new password, confirm)
- Token validation
- Success/error messages

**Solutions:**
- `/forgot-password` route (email form)
- `/reset-password` route (password form with token)
- Form validation
- API integration

**References:**
- Code: `/src/components/auth/ResetForm.tsx`
- Code: `/src/pages/ResetPassword.tsx`

**Estimated Effort:** 4-5 hours

**Dependencies:** Task 3

#### Task 6: Add Password Reset Tests

**Background:**
Ensure password reset functionality works correctly.

**Requirements:**
- Unit tests for token generation
- Integration tests for API endpoints
- E2E tests for user flow

**Solutions:**
- Test token generation and validation
- Test reset request flow
- Test password update flow
- Test expired token handling
- Test invalid token handling

**References:**
- Tests: `/tests/auth/test_reset.py`
- Tests: `/tests/e2e/test_password_reset.spec.ts`

**Estimated Effort:** 3-4 hours

**Dependencies:** Tasks 3, 5

### Dependency Diagram

```
Task 1 (Design)
    │
    ▼
Task 2 (Token Gen) ────── Task 4 (Email Template)
    │                        (parallel)
    ▼
Task 3 (API Endpoint)
    │
    ▼
Task 5 (Frontend Form)
    │
    ▼
Task 6 (Tests)
```

### Summary

| Metric | Value |
|--------|-------|
| Total Tasks | 6 |
| Estimated Effort | 16-24 hours (2-3 days) |
| Critical Path | 1 → 2 → 3 → 5 → 6 |
| Parallel Opportunities | (4 || 2-3) |
| Risk Level | Medium |

---

## Example 2: Complex Feature (OAuth2 Authentication)

### Requirement

> "Implement OAuth2 authentication with multiple providers (Google, GitHub)"

### Analysis

- **Complexity:** High
- **Domain:** Authentication, third-party integration
- **Integration points:** OAuth providers, user database, session management, frontend
- **Risk level:** High (external dependencies, security compliance)

### Task Breakdown

```
1. Design OAuth2 architecture (provider selection, token strategy)
2. Implement OAuth2 service layer
3. Create user identity linking system
4. Add Google OAuth provider
5. Add GitHub OAuth provider
6. Create OAuth endpoints (/auth/google, /auth/github)
7. Implement token refresh logic
8. Add OAuth error handling and edge cases
9. Create OAuth tests (mock providers)
10. Implement frontend OAuth integration
11. Add OAuth documentation
12. Set up OAuth monitoring and alerts
```

### Dependency Graph

```
                    ┌─────────────────┐
                    │     Task 1      │
                    │   Architecture  │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │     Task 2      │
                    │  Service Layer  │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │     Task 3      │
                    │ Identity Linking│
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
     ┌─────────────────┐          ┌─────────────────┐
     │     Task 4      │          │     Task 5      │
     │  Google OAuth   │──────────│  GitHub OAuth   │
     └────────┬────────┘          └────────┬────────┘
              │                            │
              └──────────────┬─────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   Tasks 6-8     │
                    │  Endpoints +    │
                    │  Refresh +      │
                    │  Error Handling │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
     ┌─────────────────┐          ┌─────────────────┐
     │    Task 9       │          │   Tasks 10-12   │
     │     Tests       │          │ Frontend + Docs │
     └─────────────────┘          │   + Monitoring  │
                                  └─────────────────┘
```

### Critical Path Analysis

**Critical Path:** 1 → 2 → 3 → 4 → 6 → 8 → 9

**Buffer:** 50% (due to external API dependencies and complexity)

**Parallel Opportunities:**
- (4 || 5) - Multiple providers can be implemented in parallel
- (10 || 11 || 12) - Frontend, docs, and monitoring can proceed in parallel

### Risk Factors

| Risk | Mitigation |
|------|------------|
| External API changes | Abstract provider interfaces, mock for testing |
| Security vulnerabilities | Security review, use proven libraries |
| User data migration | Identity linking system, graceful fallback |
| Token management complexity | Clear token lifecycle, proper expiry |

### Summary

| Metric | Value |
|--------|-------|
| Total Tasks | 12 |
| Estimated Effort | 60-80 hours (2-3 weeks) |
| Critical Path | 1 → 2 → 3 → 4 → 6 → 8 → 9 |
| Parallel Opportunities | (4 || 5), (10 || 11 || 12) |
| Risk Level | High |

---

## Example 3: Multi-System Integration (CRM Sync)

### Requirement

> "Connect CRM system to order processing pipeline for real-time customer data synchronization"

### Analysis

- **Complexity:** Very High
- **Domain:** System integration, data synchronization, external APIs
- **Integration points:** CRM API, order processing system, database, monitoring
- **Risk level:** High (data integrity, external dependencies, performance)

### Task Breakdown

```
1. Research CRM API capabilities and limitations
2. Design integration architecture (webhook vs polling)
3. Implement CRM API client
4. Create data mapping layer (CRM ↔ internal models)
5. Add order sync service
6. Implement error handling and retry logic
7. Create sync monitoring and alerts
8. Add integration tests (mock CRM)
9. Test with CRM sandbox environment
10. Deploy to production with feature flags
11. Monitor sync performance and errors
12. Optimize sync performance
```

### Detailed Dependency Flow

```
Task 1 (Research)
    │
    ▼ (validation gate)
Task 2 (Architecture Design)
    │
    ▼
Task 3 (CRM Client)
    │
    ▼
Task 4 (Data Mapping) ──────┐
    │                      │
    ▼                      │
Task 5 (Order Sync)        │
    │                      │
    ▼                      │
Task 6 (Error Handling)    │
    │                      │
    ├──────────────────────┘
    │
    ▼
┌─────────────────┐
│   Task 7, 8     │
│  Monitoring +   │
│     Tests       │
└────────┬────────┘
         │
         ▼ (testing gate)
Task 9 (Sandbox Testing)
    │
    ▼
Task 10 (Production Deploy)
    │
    ▼
Task 11 (Monitor)
    │
    ▼
Task 12 (Optimize)
```

### Task Specifications (Selected)

#### Task 1: Research CRM API

**Background:**
Must understand CRM capabilities before designing integration.

**Requirements:**
- Available API endpoints
- Rate limits and quotas
- Authentication method
- Webhook capabilities
- Data fields and formats

**Research Questions:**
- What events can trigger webhooks?
- What's the rate limit for API calls?
- How do we authenticate requests?
- What data can we sync?
- Are there any limitations?

**Deliverables:**
- API capabilities document
- Authentication guide
- Rate limit analysis
- Recommended integration approach

**Estimated Effort:** 4-6 hours

**Confidence:** HIGH after API documentation review

#### Task 2: Design Integration Architecture

**Background:**
Need to choose between webhook and polling approaches.

**Options:**

| Approach | Pros | Cons |
|----------|------|------|
| Webhooks | Real-time, efficient | Complex setup, requires public endpoint |
| Polling | Simple, reliable | Delayed, uses more API quota |
| Hybrid | Best of both | More complex |

**Decision Framework:**
```
IF CRM supports webhooks:
  → Use webhooks for real-time events
  → Add polling as fallback
ELSE:
  → Use polling with appropriate interval
```

**Deliverables:**
- Architecture diagram
- Data flow documentation
- Error handling strategy
- Fallback mechanism design

**Estimated Effort:** 6-8 hours

**Dependencies:** Task 1

#### Task 6: Error Handling and Retry Logic

**Background:**
External API calls fail regularly. Need robust error handling.

**Requirements:**
- Exponential backoff for retries
- Dead letter queue for failed syncs
- Alert on persistent failures
- Automatic recovery

**Retry Strategy:**
```python
def sync_with_retry(order, max_retries=3):
    for attempt in range(max_retries):
        try:
            result = crm_client.sync_order(order)
            log_success(result)
            return result
        except APIError as e:
            if attempt == max_retries - 1:
                dead_letter_queue.add(order)
                alert_persistent_failure(e)
            else:
                wait_time = 2 ** attempt  # exponential backoff
                time.sleep(wait_time)
```

**Error Categories:**
- Transient: Network errors, rate limits (retry)
- Permanent: Invalid data, deleted records (dead letter)
- Unknown: Log and alert for manual review

**Estimated Effort:** 4-6 hours

**Dependencies:** Task 5

### Risk Matrix

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| API rate limit exceeded | High | Medium | Implement queueing and throttling |
| Data inconsistency | High | Medium | Idempotent sync operations |
| CRM service outage | High | Low | Dead letter queue with replay |
| Performance degradation | Medium | Medium | Async processing, monitoring |
| Data mapping errors | High | Low | Comprehensive validation |

### Summary

| Metric | Value |
|--------|-------|
| Total Tasks | 12 |
| Estimated Effort | 80-120 hours (3-4 weeks) |
| Critical Path | 1 → 2 → 3 → 4 → 5 → 6 → 8 → 9 → 10 → 11 |
| Parallel Opportunities | (7 || 8), (11 || 12 partially) |
| Risk Level | High |

### References

- Code: `/src/crm/client.py`
- Code: `/src/orders/sync.py`
- Code: `/src/models/mapping.py`
- Docs: `/docs/crm-api.md`
- Tests: `/tests/integration/test_crm_sync.py`

---

## Comparison Summary

| Aspect | Simple (Password Reset) | Complex (OAuth2) | Very High (CRM Integration) |
|--------|------------------------|-----------------|----------------------------|
| Tasks | 6 | 12 | 12 |
| Effort | 16-24 hours | 60-80 hours | 80-120 hours |
| Dependencies | 5 sequential, 1 parallel | Complex web | Strict sequential chain |
| External Dependencies | 1 (email) | 2 (OAuth providers) | 1 (CRM API) |
| Risk Level | Medium | High | High |
| Buffer | 20% | 50% | 50% |
| Validation Gates | 0 | 1 (after design) | 2 (after research, after testing) |
