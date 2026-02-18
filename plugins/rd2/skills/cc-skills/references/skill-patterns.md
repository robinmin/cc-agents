# Skill Patterns Guide

This guide documents the five proven patterns for building Claude Code skills. Each pattern addresses a specific category of use cases.

## Overview

The official Claude Skills Guide identifies five distinct patterns that represent best practices for different skill categories. Understanding these patterns helps skill creators choose the right approach.

| Pattern | Use Case | Key Technique |
| ------- |----------|---------------|
| Sequential Workflow | Multi-step processes | Explicit ordering, dependencies |
| Multi-MCP Coordination | Service handoffs | Phase separation, data passing |
| Iterative Refinement | Quality loops | Validation scripts, stop criteria |
| Context-Aware Tool Selection | Decision trees | Clear criteria, fallbacks |
| Domain-Specific Intelligence | Compliance/audit | Embedded expertise, checks |

---

## 1. Sequential Workflow Orchestration

**Best for:** Multi-step processes that must happen in a specific order.

### Characteristics
- Explicit ordering between steps
- Dependencies between stages
- Validation at each checkpoint
- Rollback instructions for failures

### Example Structure

```markdown
## Workflow: Customer Onboarding

### Step 1: Create Account
- Collect required fields
- Validate input format
- Store in database

### Step 2: Setup Payment
- Initialize payment gateway
- Create customer record
- Verify connection

### Step 3: Create Subscription
- Select plan tier
- Apply promotional codes
- Activate subscription

### Step 4: Send Welcome Email
- Generate email template
- Queue for delivery
- Log delivery status
```

### When to Use
- Customer onboarding flows
- Document generation pipelines
- Approval workflows
- Configuration setups

### When NOT to Use
- Independent tasks that don't need ordering
- Exploratory analysis (use Iterative Refinement)
- Simple lookups (use Reference type)

### Key Techniques Checklist
- [ ] Explicit step numbering
- [ ] Dependency declaration
- [ ] Validation at each stage
- [ ] Error handling with rollback
- [ ] Progress indicators

---

## 2. Multi-MCP Coordination

**Best for:** Workflows that span multiple services or MCP tools.

### Characteristics
- Clear phase separation between services
- Data passing between MCP calls
- Centralized error handling
- Context enrichment from multiple sources

### Example Structure

```markdown
## Design-to-Development Handoff

### Phase 1: Design (Figma MCP)
- Fetch component specs
- Extract design tokens
- Generate asset清单

### Phase 2: Documentation (Drive MCP)
- Create project folder
- Generate spec document
- Share with team

### Phase 3: Tracking (Linear MCP)
- Create project
- Add milestones
- Assign initial tasks

### Phase 4: Notifications (Slack MCP)
- Notify stakeholders
- Share links
- Schedule follow-up
```

### When to Use
- Cross-service integrations
- Design-to-development handoffs
- Multi-tool orchestration
- Data aggregation workflows

### When NOT to Use
- Single MCP tool usage
- Simple API calls
- Uncoordinated parallel tasks

### Key Techniques Checklist
- [ ] Phase separation
- [ ] Data passing between MCPs
- [ ] Centralized error handling
- [ ] Retry logic per service
- [ ] Status tracking

---

## 3. Iterative Refinement

**Best for:** Quality loops that require validation before proceeding.

### Characteristics
- Explicit quality criteria
- Validation scripts at each iteration
- Know when to stop (max iterations)
- Result scoring or grading

### Example Structure

```markdown
## Report Generation Pipeline

### Quality Criteria
- Accuracy: >95% facts verified
- Completeness: All required sections present
- Readability: Grade level <10

### Iteration 1: Draft
- Generate initial content
- Run fact-checking validation
- Score accuracy

### Iteration 2: Refine
- Fix accuracy issues
- Add missing sections
- Check completeness

### Iteration 3: Polish
- Simplify language
- Verify readability score
- Final review

### Stop Conditions
- Max 5 iterations
- All criteria met
- Timeout (30 seconds)
```

### When to Use
- Content generation with quality gates
- Code review automation
- Document refinement
- Testing and validation loops

### When NOT to Use
- Single-pass transformations
- Deterministic outputs
- Simple lookups

### Key Techniques Checklist
- [ ] Define quality metrics
- [ ] Implement validation functions
- [ ] Set iteration limits
- [ ] Track improvement scores
- [ ] Know when to stop

---

## 4. Context-Aware Tool Selection

**Best for:** Decision trees that choose the right tool or approach based on context.

### Characteristics
- Clear decision criteria
- Transparent reasoning
- Fallback options
- User can understand the logic

### Example Structure

```markdown
## Smart File Storage

### Decision Criteria
- File type (image, document, code)
- File size (<1MB, 1-10MB, >10MB)
- Access pattern (read-heavy, write-heavy)

### Decision Tree

IF file is image:
  → IF size <1MB: Store in S3, CDN URL
  → IF size 1-10MB: Store in S3, lazy load
  → IF size >10MB: Reject with size limit error

IF file is document:
  → IF team access: Store in Google Drive
  → IF public: Store in S3 with signed URL

IF file is code:
  → Store in GitHub repo
  → Return repo URL
```

### When to Use
- Conditional file handling
- Environment detection
- Service selection based on context
- Adaptive behavior

### When NOT to Use
- Always-use-single-tool scenarios
- Simple routing without context
- Deterministic one-path workflows

### Key Techniques Checklist
- [ ] Define decision inputs
- [ ] Document criteria clearly
- [ ] Provide fallbacks
- [ ] Log decision reasoning
- [ ] Make logic transparent

---

## 5. Domain-Specific Intelligence

**Best for:** Skills that embed expertise in a specific domain (compliance, finance, healthcare, etc.).

### Characteristics
- Domain expertise in logic
- Compliance checks before action
- Comprehensive audit trails
- Regulatory awareness

### Example Structure

```markdown
## Payment Processing Skill

### Compliance Checks (Before Any Action)
- [ ] PCI-DSS compliance verified
- [ ] Amount within limits
- [ ] Currency allowed for region
- [ ] Fraud score below threshold

### Domain Logic
- Apply correct fee structure
- Calculate taxes by region
- Handle currency conversion
- Generate compliant receipt

### Audit Trail
- Log all payment attempts
- Record decision rationale
- Timestamp with timezone
- Store for 7 years
```

### When to Use
- Regulated industries
- Financial transactions
- Healthcare data handling
- Legal document processing

### When NOT to Use
- General-purpose tasks
- Creative content generation
- Simple utility functions

### Key Techniques Checklist
- [ ] Embed domain rules in code
- [ ] Compliance checks before action
- [ ] Comprehensive logging
- [ ] Audit trail generation
- [ ] Error handling with domain context

---

## Choosing a Pattern

### Quick Decision Guide

```
Does the skill coordinate multiple services?
  YES → Multi-MCP Coordination
  NO ↓

Are steps strictly ordered?
  YES → Sequential Workflow
  NO ↓

Does it validate quality iteratively?
  YES → Iterative Refinement
  NO ↓

Does it make decisions based on context?
  YES → Context-Aware Tool Selection
  NO ↓

Does it embed domain expertise?
  YES → Domain-Specific Intelligence
  NO → Consider Technique or Reference type
```

### Pattern Combinations

Patterns can combine for more complex skills:

- **Sequential + Iterative**: Multi-step process with quality validation at each step
- **Multi-MCP + Context-Aware**: Service selection based on available tools
- **Domain-Specific + Sequential**: Regulated workflow with ordered compliance checks

---

## See Also

- [Skill Anatomy](anatomy.md) - Complete structure guide
- [Skill Types](skill-types.md) - Technique, Pattern, Reference types
- [Best Practices](best-practices.md) - Comprehensive guidance
- [Common Mistakes](common-mistakes.md) - Anti-patterns to avoid
