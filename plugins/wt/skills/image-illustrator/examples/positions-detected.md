---
article: /Users/robin/projects/cc-agents/plugins/wt/skills/image-illustrator/examples/article-before.md
detected_at: 2026-01-30T10:00:00Z
total_positions: 8
selected_positions: 5
---

## Position 1

- **Line**: 23
- **Type**: abstract_concept
- **Section**: "## What Are Microservices?"
- **Score**: 12
- **Rationale**: Technical jargon density (3: "microservices architecture", "loosely coupled", "API gateway"), no images in section (2), complex concept requiring visualization (2)
- **Concept**: "Microservices architecture pattern with API gateway"
- **Keywords**: ["microservices architecture", "API gateway", "loosely coupled", "self-contained", "services", "message queues"]
- **Selected**: Yes

## Position 2

- **Line**: 45
- **Type**: abstract_concept
- **Section**: "## Service Discovery Mechanism"
- **Score**: 11
- **Rationale**: Technical jargon (2: "service discovery", "client-side discovery"), abstract concept (2), no visuals (2)
- **Concept**: "Service discovery patterns (client-side and server-side)"
- **Keywords**: ["service discovery", "client-side discovery", "server-side discovery", "service registry", "load balancer"]
- **Selected**: Yes

## Position 3

- **Line**: 62
- **Type**: information_dense
- **Section**: "## API Endpoints Reference"
- **Score**: 10
- **Rationale**: 7-column table (3), technical reference content (2), needs visual organization (1)
- **Concept**: "API endpoints reference table"
- **Keywords**: ["REST API", "endpoints", "HTTP methods", "authentication", "rate limiting", "user management"]
- **Selected**: Yes

## Position 4

- **Line**: 79
- **Type**: abstract_concept
- **Section**: "## Communication Patterns"
- **Score**: 10
- **Rationale**: Technical concepts list (5 patterns), abstract communication paradigms (2), no visual representation (2)
- **Concept**: "Service communication patterns"
- **Keywords**: ["synchronous communication", "asynchronous communication", "event-driven architecture", "gRPC", "GraphQL", "message brokers"]
- **Selected**: No (too close to position 3)

## Position 5

- **Line**: 92
- **Type**: information_dense
- **Section**: "## Configuration Options"
- **Score**: 11
- **Rationale**: 12-item list (2), technical configuration parameters (2), organized visualization needed (1)
- **Concept**: "Configuration options for microservices"
- **Keywords**: ["timeout", "retry", "backoff", "circuit breaker", "cache", "health check", "connection pool"]
- **Selected**: Yes

## Position 6

- **Line**: 112
- **Type**: emotional_transition
- **Section**: "## Best Practices"
- **Score**: 7
- **Rationale**: Major section break (## header) (2), transition from technical details to best practices (2), narrative shift (2)
- **Concept**: "Visual transition to best practices section"
- **Keywords**: ["best practices", "deployment", "production"]
- **Selected**: Yes

## Position 7

- **Line**: 118
- **Type**: abstract_concept
- **Section**: "### Design Principles"
- **Score**: 6
- **Rationale**: Abstract design principle (2), but section has low content density (1)
- **Concept**: "Service design principles"
- **Keywords**: ["single responsibility", "ownership", "cross-functional team"]
- **Selected**: No (lower priority, close to position 6)

## Position 8

- **Line**: 128
- **Type**: abstract_concept
- **Section**: "### Deployment Strategies"
- **Score**: 8
- **Rationale**: Technical deployment concepts (2), containerization and orchestration (2)
- **Concept**: "Deployment strategies and containerization"
- **Keywords**: ["Docker", "Kubernetes", "blue-green deployment", "canary deployment"]
- **Selected**: No (good candidate but reached max_positions limit)

---

## Selection Summary

**Total Detected**: 8 positions
**Selected**: 5 positions
**Skipped**: 3 positions (too close together, lower priority)

### Selected Positions Distribution

- **Abstract Concepts**: 2 (Positions 1, 2)
- **Information-Dense**: 2 (Positions 3, 5)
- **Emotional Transitions**: 1 (Position 6)

### Rationale for Selection

1. **Position 1**: High-priority abstract concept, article's main topic
2. **Position 2**: Key architectural concept (service discovery)
3. **Position 3**: Dense table requiring visual organization
4. **Position 5**: 12-item configuration list needs visualization
5. **Position 6**: Major section break benefits from visual transition

### Rationale for Skipping

- **Position 4**: Too close to Position 3 (line distance: 17, minimum required: 20)
- **Position 7**: Lower content density and priority
- **Position 8**: Good candidate but reached max_positions limit (5)
