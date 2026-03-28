# Assessment Rubric — Requirements Traceability

This document defines how to judge whether a requirement is met, unmet, or partial.

## Status Definitions

| Status | Definition | Criteria |
|--------|------------|----------|
| **met** | Requirement is fully satisfied | All sub-requirements implemented AND verified |
| **unmet** | Requirement is not satisfied | No implementation OR critical gaps |
| **partial** | Requirement is partially satisfied | Some sub-requirements met, some missing |

## Judging Met

### Criteria for "met" Status

A requirement is **met** when:

1. **Complete implementation:** All aspects of the requirement are implemented
2. **Correct behavior:** Implementation matches requirement specification
3. **Verification exists:** Tests or checks confirm the implementation
4. **No known gaps:** No obvious missing functionality

### Evidence Requirements for "met"

| Requirement Type | Minimum Evidence |
|------------------|------------------|
| Functional | 1+ implementation location + 1+ test |
| API endpoint | Handler function + route definition + test |
| Data model | Type/class definition + validation |
| Integration | Implementation + integration test |
| Performance | Implementation + benchmark result |

### Met Examples

**Requirement:** "The API must support JSON request/response format"

**Verdict: met**
```
Evidence:
- `src/api/parser.ts:15` - `parseJSON()` handles JSON parsing
- `src/api/serializer.ts:22` - `serializeJSON()` handles JSON serialization
- `tests/api/parser.test.ts:10-25` - Unit tests verify JSON parsing/serialization
```

**Requirement:** "Users can reset their password via email"

**Verdict: met**
```
Evidence:
- `src/api/auth.ts:42` - `resetPassword()` endpoint handler
- `src/services/email.ts:15` - `sendPasswordReset()` email service
- `src/services/email.ts:18` - Email template with reset link
- `tests/auth.test.ts:50-65` - Integration test verifies email sending
```

## Judging Unmet

### Criteria for "unmet" Status

A requirement is **unmet** when:

1. **No implementation:** No code exists for the requirement
2. **Critical gap:** Core functionality is missing
3. **Wrong direction:** Implementation contradicts the requirement
4. **Stubs only:** Only placeholder/todo code exists

### Evidence Requirements for "unmet"

| Requirement Type | Evidence Pattern |
|------------------|------------------|
| Any | NO IMPLEMENTATION FOUND |
| Any | Only TODO comments exist |
| Any | Implementation is commented out |
| Any | "Not implemented yet" in code |

### Unmet Examples

**Requirement:** "The system must send push notifications to mobile devices"

**Verdict: unmet**
```
Evidence:
- NO IMPLEMENTATION FOUND for push notification functionality
- Searched: src/notifications/, src/mobile/, src/push/
- No references to FCM, APNs, or push services
```

**Requirement:** "Support OAuth2 authentication with Google"

**Verdict: unmet**
```
Evidence:
- `src/auth/oauth.ts:1-5` - Only OAuth interface defined (stub)
- No Google OAuth2 client implementation
- No OAuth2 callback handler
- Missing: google-auth-library dependency
```

## Judging Partial

### Criteria for "partial" Status

A requirement is **partial** when:

1. **Partial implementation:** Some aspects implemented, others missing
2. **Incomplete feature:** Core is there but edge cases missing
3. **Known limitations:** Implementation exists but with known gaps
4. **Missing verification:** Implementation exists but no tests

### Evidence Requirements for "partial"

| Requirement Type | Evidence Pattern |
|------------------|------------------|
| Functional | Some sub-requirements implemented, others missing |
| API | Endpoint exists but missing error handling |
| Data model | Type defined but missing validation |

### Partial Examples

**Requirement:** "Users can upload profile photos (JPEG, PNG, GIF up to 5MB)"

**Verdict: partial**
```
Evidence:
- `src/api/upload.ts:20` - `uploadPhoto()` endpoint handler
- `src/api/upload.ts:25` - File type validation (JPEG, PNG, GIF)
- `src/api/upload.ts:30` - File size validation (5MB limit)
- MISSING: No validation for corrupted image files
- MISSING: No thumbnail generation
```

**Requirement:** "The dashboard displays real-time data with auto-refresh"

**Verdict: partial**
```
Evidence:
- `src/dashboard/DataTable.tsx:42` - Auto-refresh hook implemented
- `src/dashboard/DataTable.tsx:45` - 30-second refresh interval configured
- `src/dashboard/DataTable.tsx:50` - Loading state handling
- MISSING: No WebSocket implementation for true real-time
- MISSING: Manual refresh button not implemented
```

## Multi-Part Requirements

Many requirements have multiple parts. Use this decision tree:

```
For each sub-requirement:
    Is it implemented? → No → Mark partial, continue
    Is it tested? → No → Mark partial (add warning)
    Is it correct? → No → Mark partial (add warning)

If ALL sub-requirements are met → Overall: met
If ANY sub-requirement is unmet → Overall: partial or unmet
If ALL sub-requirements are met but untested → Overall: partial
```

## Severity Mapping

| Missing Severity | Overall Status |
|-----------------|----------------|
| Critical (core functionality) | unmet |
| High (important feature) | partial |
| Medium (enhancement) | partial |
| Low (nice-to-have) | met (with warning) |

## Review Depth Impact

### Quick Review
- Check 1-2 key files per requirement
- Trust BDD coverage if available
- Mark uncertain as "partial"
- Skip deep evidence verification

### Thorough Review
- Check all relevant files
- Verify line numbers are accurate
- Cross-reference tests with implementation
- Mark uncertain as "unmet" if no clear evidence

## Verdict Assignment Rules

1. **When in doubt, mark partial** — Don't force met/unmet if unclear
2. **Evidence must be specific** — Vague evidence is not evidence
3. **Missing tests is partial** — Implementation without tests is incomplete
4. **Stubs are not implementations** — Only interface, no code
5. **Comments are not code** — TODO comments don't count as implementation
