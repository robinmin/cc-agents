---
name: backend-development-workflow
description: "Orchestrate end-to-end backend feature development from requirements to deployment. Covers development methodologies (traditional, TDD, BDD, DDD), feature complexity levels, and deployment strategies."
license: Apache-2.0
version: 1.0.0
created_at: 2026-03-26
updated_at: 2026-03-26
type: technique
tags: [backend, workflow, feature-development, deployment, tdd, bdd, ddd]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: workflow
  interactions:
    - pipeline
see_also:
  - rd3:backend-design
  - rd3:tdd-workflow
  - rd3:sys-debugging
---

# Backend Development Workflow

Orchestrate end-to-end feature development from requirements to production deployment.

## Use this skill when

- Coordinating end-to-end feature delivery across backend, frontend, and data
- Managing requirements, architecture, implementation, testing, and rollout
- Planning multi-service changes with deployment and monitoring needs
- Building REST APIs or GraphQL servers
- Creating microservices with Node.js
- Implementing authentication and authorization
- Designing scalable backend architectures

## Do not use this skill when

- The task is a small, isolated backend change or bug fix
- You only need a single specialist task, not a full workflow
- There is no deployment or cross-team coordination involved

## Development Methodology

| Methodology | When to Use |
|------------|-------------|
| **traditional** | Sequential development with testing after implementation |
| **tdd** | Test-Driven Development with red-green-refactor cycles |
| **bdd** | Behavior-Driven Development with scenario-based testing |
| **ddd** | Domain-Driven Design with bounded contexts and aggregates |

## Feature Complexity

| Level | Scope | Duration |
|-------|-------|----------|
| **simple** | Single service, minimal integration | 1-2 days |
| **medium** | Multiple services, moderate integration | 3-5 days |
| **complex** | Cross-domain, extensive integration | 1-2 weeks |
| **epic** | Major architectural changes, multiple teams | 2+ weeks |

## Deployment Strategy

| Strategy | Use When |
|----------|---------|
| **direct** | Immediate rollout to all users |
| **canary** | Gradual rollout starting with 5% of traffic |
| **feature-flag** | Controlled activation via feature toggles |
| **blue-green** | Zero-downtime deployment with instant rollback |
| **a-b-test** | Split traffic for experimentation and metrics |

---

## Phase 1: Discovery & Requirements Planning

### 1. Business Analysis & Requirements
- Define user stories, acceptance criteria, success metrics, and business value
- Identify stakeholders, dependencies, and risks
- Create feature specification document with clear scope boundaries

### 2. Technical Architecture Design
- Define service boundaries, API contracts, data models, integration points
- Consider scalability, performance, and security requirements
- Document architecture diagrams and API specifications

### 3. Feasibility & Risk Assessment
- Identify security requirements, compliance needs, data privacy concerns
- Assess technical risks and mitigation strategies
- Review regulatory requirements

---

## Phase 2: Implementation & Development

### 4. Backend Services Implementation
- Build RESTful/GraphQL APIs
- Implement business logic in services (not controllers)
- Integrate with data layer via repositories
- Add resilience patterns (circuit breakers, retries)
- Implement caching strategies
- Include feature flags for gradual rollout

### 5. Frontend Implementation
- Integrate with backend APIs
- Implement responsive UI, state management, error handling
- Add feature flag integration for A/B testing

### 6. Data Pipeline & Integration
- Design ETL/ELT processes
- Implement data validation
- Create analytics events
- Set up data quality monitoring

---

## Phase 3: Testing & Quality Assurance

### 7. Automated Test Suite
- **Unit tests** for backend services
- **Integration tests** for API endpoints
- **E2E tests** for critical user journeys
- **Performance tests** for scalability validation
- Minimum 80% code coverage

### 8. Security Validation
- Run OWASP checks
- Perform penetration testing
- Dependency scanning
- Verify data encryption, authentication, and authorization

### 9. Performance Optimization
- Profile code and optimize queries
- Implement caching
- Reduce bundle sizes, improve load times
- Set up performance budgets and monitoring

---

## Phase 4: Deployment & Monitoring

### 10. Deployment Strategy & Pipeline
- Create CI/CD pipeline with automated tests
- Configure feature flags for gradual rollout
- Implement blue-green deployment
- Set up rollback procedures
- Create deployment runbook

### 11. Observability & Monitoring
- Implement distributed tracing
- Custom metrics and error tracking
- Dashboards for feature usage, performance metrics, error rates
- Set up SLOs/SLIs with automated alerts

### 12. Documentation & Knowledge Transfer
- API documentation
- User guides and deployment guides
- Troubleshooting runbooks
- Architecture diagrams and integration guides

---

## Success Criteria

- All acceptance criteria from business requirements are met
- Test coverage exceeds minimum threshold (80% default)
- Security scan shows no critical vulnerabilities
- Performance meets defined budgets and SLOs
- Feature flags configured for controlled rollout
- Monitoring and alerting fully operational
- Documentation complete and approved
- Successful deployment to production with rollback capability

## Rollback Strategy

1. Immediate feature flag disable (< 1 minute)
2. Blue-green traffic switch (< 5 minutes)
3. Full deployment rollback via CI/CD (< 15 minutes)
4. Database migration rollback if needed (coordinate with data team)
5. Incident post-mortem and fixes before re-deployment

---

**See also:**
- [implementation-playbook.md](implementation-playbook.md) — Detailed implementation patterns
- [api-and-patterns.md](api-and-patterns.md) — API design and backend patterns
