# Domain-Specific Breakdowns

This document provides detailed task breakdown patterns for common software development domains.

## Table of Contents

- [Authentication Features](#authentication-features)
- [API Development](#api-development)
- [Database Migrations](#database-migrations)
- [Frontend Features](#frontend-features)
- [CI/CD Pipeline](#cicd-pipeline)

---

## Authentication Features

### Standard Auth Breakdown

```
1. Design authentication architecture
2. Implement user model and schema
3. Create authentication service
4. Add authentication endpoints
5. Implement session management
6. Add authentication tests
7. Create frontend auth UI
8. Add password reset functionality
```

### Key Dependencies

| Dependency | Relationship | Notes |
|------------|--------------|-------|
| Tasks 2-3 → Task 4 | Blocking | Data layer must exist before endpoints |
| Task 4 → Task 7 | Blocking | Frontend needs API endpoints |
| Task 4 → Task 8 | Parallel | Password reset can proceed after endpoints |

### Risk Factors

- **Security-critical:** All tasks require security review
- **Compliance:** May need GDPR/privacy considerations
- **External dependencies:** Email service for password reset

### Variations

#### OAuth2 Integration

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

#### Multi-Factor Authentication (MFA)

```
1. Design MFA architecture (TOTP, SMS, backup codes)
2. Implement MFA service layer
3. Add TOTP generation and verification
4. Create backup code generation and validation
5. Add MFA setup endpoint
6. Implement MFA verification endpoint
7. Create frontend MFA setup UI
8. Add MFA enforcement policies
9. Create MFA tests
10. Add MFA documentation
```

---

## API Development

### REST API Breakdown

```
1. Design API specification (OpenAPI/Swagger)
2. Create data models and schemas
3. Implement database layer
4. Create service layer with business logic
5. Implement API endpoints
6. Add input validation and error handling
7. Write API tests (unit + integration)
8. Add API documentation
9. Set up API monitoring and logging
```

### Key Dependencies

| Dependency | Relationship | Notes |
|------------|--------------|-------|
| Sequential: 1 → 2 → 3 → 4 → 5 | Blocking | Each layer depends on previous |
| Parallel: 6-8 || 5 | Parallel | Can proceed with endpoint implementation |
| 9 || 5 | Parallel | Monitoring can be set up independently |

### Risk Factors

- **Version compatibility:** Breaking changes affect all clients
- **Performance:** Load testing required for public APIs
- **Documentation:** Must stay in sync with implementation

### GraphQL API Variation

```
1. Design GraphQL schema (types, queries, mutations)
2. Implement data models and schemas
3. Create resolver functions
4. Implement data loaders for batching
5. Add GraphQL endpoint
6. Implement query complexity analysis
7. Add authentication and authorization
8. Write GraphQL tests (queries + mutations)
9. Set up GraphQL playground/documentation
10. Add query logging and monitoring
```

---

## Database Migrations

### Schema Change Breakdown

```
1. Design new schema (forward + backward compatible)
2. Create migration script (dry-run mode)
3. Test migration in staging environment
4. Implement dual-write strategy (old + new)
5. Deploy migration to production (non-destructive)
6. Verify data integrity
7. Update application code to use new schema
8. Backfill historical data
9. Remove old schema columns
```

### Key Dependencies

| Dependency | Relationship | Notes |
|------------|--------------|-------|
| Strict sequential: 1-9 | Blocking | Safety requires step-by-step approach |
| Each step verified | Gatekeeper | Must validate before proceeding |

### Risk Factors

- **Data loss:** High risk - require backups and rollback plans
- **Downtime:** May require maintenance window
- **Rollback complexity:** Forward and backward migrations needed

### Migration Anti-Patterns

```
❌ Big Bang Migration:
   Change everything at once
   (High risk, hard to rollback)

❌ No Testing in Staging:
   Deploy directly to production
   (Dangerous for schema changes)

✅ Incremental Migration:
   Migrate gradually with dual-write
   (Safer, easier to rollback)
```

### Data Migration Variations

#### Large Dataset Migration

```
1. Analyze data volume and performance impact
2. Design batched migration strategy
3. Create migration script with batching
4. Implement progress tracking
5. Test with subset of data
6. Deploy migration with throttling
7. Monitor during migration
8. Verify data integrity post-migration
9. Create rollback procedure
```

#### Zero-Downtime Migration

```
1. Design backward-compatible schema changes
2. Add new columns/tables (non-destructive)
3. Implement dual-write logic
4. Deploy dual-write to production
5. Verify new schema data accuracy
6. Update application to read from new schema
7. Migrate historical data (background job)
8. Remove old schema after validation
9. Clean up dual-write logic
```

---

## Frontend Features

### Component-Based Breakdown

```
1. Design component architecture
2. Create component specification (props, state, events)
3. Implement component logic
4. Add component styling
5. Create component tests
6. Add accessibility features (ARIA)
7. Document component usage
8. Create component examples/storybook
```

### Key Dependencies

| Dependency | Relationship | Notes |
|------------|--------------|-------|
| Sequential: 1 → 2 → 3 → 4 → 5 | Blocking | Core implementation order |
| Parallel: 6-8 || 5 | Parallel | Accessibility and docs can proceed in parallel |

### Risk Factors

- **Browser compatibility:** Test across target browsers
- **Accessibility:** WCAG compliance required
- **Performance:** Bundle size and rendering performance

### React-Specific Breakdown

```
1. Design component hierarchy and state management
2. Create TypeScript interfaces for props
3. Implement component with hooks
4. Add context providers if needed
5. Create custom hooks for shared logic
6. Add error boundaries
7. Implement loading and error states
8. Add component tests (React Testing Library)
9. Add accessibility tests (jest-axe)
10. Create Storybook stories
11. Add performance optimization (memo, callback)
```

### State Management Variation

```
1. Design state architecture (local vs global)
2. Select state management solution (Redux, Zustand, etc.)
3. Define state shape and actions
4. Create store and reducers
5. Implement state providers
6. Add state selectors
7. Create state middleware (logging, persistence)
8. Add state tests
9. Document state patterns
```

---

## CI/CD Pipeline

### Infrastructure Breakdown

```
1. Design CI/CD pipeline architecture
2. Create build scripts and configurations
3. Set up automated testing stages
4. Configure deployment stages (dev/staging/prod)
5. Add environment variable management
6. Implement secrets management
7. Set up monitoring and alerts
8. Create rollback procedures
9. Document runbooks and troubleshooting
```

### Key Dependencies

| Dependency | Relationship | Notes |
|------------|--------------|-------|
| Sequential: 1 → 2 → 3 → 4 → 5 | Blocking | Foundation must be built first |
| Parallel: 6-9 || 5 | Parallel | Security and monitoring can proceed in parallel |

### Risk Factors

- **Secrets exposure:** Secure secrets management critical
- **Deployment failures:** Rollback procedures essential
- **Pipeline performance:** Long pipelines slow development

### Platform-Specific Variations

#### GitHub Actions

```
1. Design workflow structure
2. Create workflow YAML files
3. Set up build matrix (multiple OS/versions)
4. Configure caching for dependencies
5. Add artifact upload/download
6. Set up deployment secrets
7. Create environment-specific workflows
8. Add status badges and notifications
9. Document workflow usage
```

#### Docker-Based Pipeline

```
1. Design Docker image strategy
2. Create Dockerfile for application
3. Set up multi-stage builds
4. Configure Docker Compose for local dev
5. Create image tagging strategy
6. Set up container registry
7. Configure Kubernetes manifests
8. Add health checks and probes
9. Create deployment scripts
10. Document container architecture
```

### Pipeline Stages Detail

```
┌─────────────────────────────────────────────────────────────┐
│                     CI/CD Pipeline Stages                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Trigger → 2. Build → 3. Test → 4. Deploy → 5. Verify  │
│                                                             │
│     ┌─────┐    ┌─────┐    ┌─────┐    ┌─────┐    ┌─────┐  │
│     │Git  │    │Docker│    │Unit │    │K8s  │    │Smoke│  │
│     │Push │    │Build │    │Test │    │Deploy│   │Test │  │
│     └─────┘    └─────┘    └─────┘    └─────┘    └─────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Common Task Patterns Across Domains

### Research Tasks

```
1. Define research questions
2. Identify information sources
3. Conduct research/investigation
4. Document findings
5. Present recommendations
```

### Testing Tasks

```
1. Design test strategy
2. Create test plan
3. Write unit tests
4. Write integration tests
5. Write end-to-end tests
6. Set up test data fixtures
7. Configure test environment
8. Execute tests and report results
```

### Documentation Tasks

```
1. Plan documentation structure
2. Write technical documentation
3. Create user guides
4. Add code examples
5. Create diagrams and visuals
6. Review and proofread
7. Publish documentation
8. Set up documentation search
```

### Security Tasks

```
1. Conduct security assessment
2. Identify vulnerabilities
3. Design security controls
4. Implement security measures
5. Add security tests
6. Perform security review
7. Document security practices
8. Set up security monitoring
```
