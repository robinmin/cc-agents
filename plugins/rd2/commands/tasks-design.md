---
description: Architecture and design phase coordination with specialist delegation
skills:
  - rd2:tasks
argument-hint: "<task-file.md>" [--architect] [--design] [--skip-assessment]
---

# Tasks Design

Coordinate architecture and design phases by delegating to specialists (super-architect, super-designer). Performs scale assessment, delegates to appropriate specialists, and updates task file with architecture and design outputs.

**IMPORTANT:** This command handles the planning phase before implementation. It focuses on solution architecture and UI/UX design, NOT code generation.

## Quick Start

```bash
# Design with automatic scale assessment
/rd2:tasks-design docs/prompts/0047_feature.md

# Force architect involvement
/rd2:tasks-design --architect docs/prompts/0047_microservices.md

# Force designer involvement for UI-heavy features
/rd2:tasks-design --design docs/prompts/0047_dashboard.md

# Both architect and designer
/rd2:tasks-design --architect --design docs/prompts/0047_full.md

# Skip assessment, delegate directly
/rd2:tasks-design --skip-assessment docs/prompts/0047.md
```

## When to Use

**Activate this command when:**

- **Architecture needed:**
  - Database schema changes
  - API design and contract definition
  - Cross-system integration
  - Performance/caching strategies
  - Security architecture
  - Deployment architecture
  - Microservices design
  - New architecture patterns

- **Design needed:**
  - UI-heavy features (dashboards, admin panels)
  - User workflow design
  - Component architecture
  - Design system changes
  - Accessibility requirements
  - Responsive design needs
  - UX improvements

**Do NOT use for:**

- Simple features with no architectural/design complexity
- Tasks that only need code changes (use `/rd2:code-generate` instead)
- Tasks already have complete architecture/design in Solutions section

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `task-file.md` | No* | Path to task file |
| `--task <WBS>` | No* | WBS number as alternative |
| `--architect` | No | Force architecture review involvement |
| `--design` | No | Force UI/UX design specialist involvement |
| `--skip-assessment` | No | Skip scale assessment, delegate directly |

**Note:** Either file path or WBS must be provided.

## Scale Assessment

When `--skip-assessment` is NOT used, the command performs automatic scale assessment:

### Complexity Indicators

| Scale | Task Count | Architect | Designer | Example |
|-------|------------|-----------|----------|----------|
| **Low** | 1-3 files | No | No | Add single function |
| **Medium** | 3-7 files | Maybe | Maybe | Add feature with UI |
| **High** | 7+ files | Yes | No | API with database |
| **Very High** | Cross-system | Yes | Maybe | Microservices architecture |
| **UI-Heavy** | Any | No | Yes | Dashboard, admin panel |
| **Full Stack** | Any | Yes | Yes | Full-stack application |

### Assessment Criteria

**Triggers Architect:**
- Database schema changes
- API design or contract definition
- Cross-system integration points
- Performance/caching requirements
- Security architecture needs
- Deployment infrastructure
- New technology patterns

**Triggers Designer:**
- UI component creation
- User workflow design
- Design system changes
- Accessibility (WCAG) requirements
- Responsive design needs
- UX improvements

## Workflow

This command delegates to the **super-planner** agent using the Task tool:

```python
Task(
  subagent_type="rd2:super-planner",
  prompt="""Design task file: {task_file}

Mode: design-only
Flags: {architect}, {design}, {skip_assessment}

Steps:
1. Load task file and parse content
2. Scale assessment (unless --skip-assessment):
   - Analyze task name and description
   - Determine complexity level (Low/Medium/High)
   - Identify specialist needs
3. Delegate to specialists (based on assessment or flags):
   - IF architect needed OR --architect → Delegate to super-architect
   - IF designer needed OR --design → Delegate to super-designer
4. Update task file with specialist outputs (Solutions section)
5. Report completion with specialist attribution
""",
  description="Design phase coordination"
)
```

### Detailed Workflow Steps

1. **Load task** - Parse frontmatter and current content
2. **Scale assessment** (unless `--skip-assessment`):
   - Analyze task name, description, requirements
   - Determine complexity level
   - Identify specialist needs
3. **Delegate to specialists** (based on assessment or flags):
   - **Super-architect**: Solution architecture → Add to Solutions section
   - **Super-designer**: UI/UX design → Add to Solutions section
4. **Update task file** - Append specialist outputs to task file
5. **Report completion** - Show what was added and by whom

## Output

### Success Output

```markdown
## Design Phase Complete

**Task:** docs/prompts/0047_api_redesign.md
**Scale:** High (7+ expected tasks)

### Specialist Work Completed

**🟦 Architecture:** super-architect
- Added solution architecture to Solutions section
- Documented API contracts and data models
- Specified caching strategy

**🩷 Design:** Not needed (non-UI feature)

### Next Steps

- Run decomposition: `rd2:tasks create "Subtask: Implement API endpoints"`
- Or use full planning: `/rd2:tasks-plan --task 0047`
- Start implementation: `/rd2:code-generate --task 0047`
```

### No Specialist Work Output

```markdown
## Design Phase Complete

**Task:** docs/prompts/0047_simple_feature.md
**Scale:** Low (1-2 expected tasks)

### Assessment Result

**No specialist work needed** - Task is straightforward enough to implement directly.

### Next Steps

- Start implementation: `/rd2:code-generate --task 0047`
- Or create subtasks manually: `rd2:tasks create "Implementation subtask"`
```

## Examples

### Example 1: Automatic assessment

```bash
/rd2:tasks-design docs/prompts/0047_oauth_integration.md

# Output:
# → Loading task 0047...
# → Scale assessment in progress...
# → Task name: "OAuth integration"
# → Requirements mentions: "database", "API", "security"
# → **Scale Assessment: High**
# → Architect: Yes (security-sensitive, database changes)
# → Designer: No (backend feature)
#
# → Delegating to super-architect...
# ✓ Architecture decisions added to Solutions section
#
# → Design phase complete
```

### Example 2: Force both specialists

```bash
/rd2:tasks-design --architect --design docs/prompts/0047_admin_dashboard.md

# Output:
# → Loading task 0047...
# → --architect and --design flags: skipping assessment
# → Delegating to super-architect...
# ✓ Backend architecture documented
# → Delegating to super-designer...
# ✓ UI/UX design specifications added
#
# → Design phase complete
```

### Example 3: UI-heavy feature

```bash
/rd2:tasks-design --design docs/prompts/0047_user_onboarding.md

# Output:
# → Loading task 0047...
# → Scale assessment: Medium (3-5 tasks)
# → Architect: Not needed (no architecture changes)
# → Designer: Yes (UI-heavy, user workflow)
#
# → Delegating to super-designer...
# ✓ User flow diagrams added
# ✓ Component architecture documented
# ✓ Accessibility considerations noted
#
# → Design phase complete
```

### Example 4: Skip assessment for direct delegation

```bash
rd2:tasks-design --skip-assessment --architect docs/prompts/0047.md

# Output:
# → Loading task 0047...
# → --skip-assessment: skipping quality check
# → Delegating to super-architect...
# ✓ Architecture decisions added
#
# → Design phase complete
```

## Specialist Output Format

Specialists add structured, attributed outputs to task files. This ensures traceability and links all work together.

### Output Structure

Each specialist adds their work to the **Solutions / Goals** section with:

1. **Attribution header** — Specialist name and completion date
2. **Content** — Architecture decisions, design specs, etc.
3. **Artifacts list** — Links to any generated files
4. **References update** — Links to artifacts in References section

### Architecture Output (added to Solutions section)

```markdown
### Solutions / Goals

#### Architecture
**Specialist:** super-architect | **Completed:** 2026-01-24

**System Architecture:**

```markdown
### Solutions / Goals

#### Architecture

**System Architecture:**

```
┌─────────────┐      ┌──────────────┐
│   Client    │──────│  API Gateway  │
└─────────────┘      └──────────────┘
                            │
                ┌───────────▼────────────┐
                │  Auth Service       │
                │  - OAuth2         │
                │  - JWT validation │
                └──────────────────────┘
                            │
                ┌───────────▼────────────┐
                │   Database          │
                │   - Users table     │
                │   - Sessions table   │
                └──────────────────────┘
```

**Technology Stack:**
- Backend: Node.js, Express
- Database: PostgreSQL with Prisma ORM
- Auth: Passport.js with OAuth2 strategies
- Cache: Redis for session storage

**Security Considerations:**
- HTTPS only for OAuth callbacks
- JWT secrets in environment variables
- Password hashing with bcrypt
- Rate limiting on auth endpoints

**API Contracts:**
- POST /auth/google - Google OAuth2 callback
- POST /auth/github - GitHub OAuth2 callback
- GET /auth/me - Get current user
- POST /auth/logout - Invalidate session

**Artifacts Generated:**
- `docs/architecture/0047_auth-system.md` - Complete architecture specification
- `docs/diagrams/0047_sequence.yaml` - Sequence diagram for OAuth flow
- `docs/diagrams/0047_erdiagram.yaml` - Entity-relationship diagram
```

### Design Output (added to Solutions section)

```markdown
#### UI/UX Design

**User Flow:**

```
Login Page → Google Button → Auth → Dashboard → Profile
```

**Component Hierarchy:**

```
LoginPage
├── OAuthButtonGroup
│   ├── GoogleOAuthButton
│   └── GitHubOAuthButton
├── ErrorMessage
└── LoadingSpinner

DashboardPage
├── Sidebar
├── UserAvatar
├── StatsCards
└── QuickActions
```

**Accessibility:**
- All interactive elements keyboard accessible
- ARIA labels for OAuth buttons
- Focus management after login
- Screen reader announcements for state changes

**Responsive Design:**
- Mobile-first approach
- Breakpoints: 640px, 768px, 1024px, 1280px
- Touch targets minimum 44x44px

**Artifacts Generated:**
- `docs/design/0047_login-flow.md` - User flow documentation
- `docs/design/0047_components.md` - Component hierarchy and specs
- `docs/design/0047_mockups/` - UI mockups and prototypes
```

## Artifacts Tracking (New Section)

Specialists also populate the **Artifacts** section in the task file:

```markdown
### Artifacts

| Type | Path | Generated By | Date | Purpose |
|------|------|--------------|------|---------|
| Architecture Spec | `docs/architecture/0047_auth-system.md` | super-architect | 2026-01-24 | System design decisions |
| Sequence Diagram | `docs/diagrams/0047_sequence.yaml` | super-architect | 2026-01-24 | OAuth flow visualization |
| Design Spec | `docs/design/0047_login-flow.md` | super-designer | 2026-01-24 | UI/UX specifications |
| Component Docs | `docs/design/0047_components.md` | super-designer | 2026-01-24 | Component hierarchy |
| Mockups | `docs/design/0047_mockups/` | super-designer | 2026-01-24 | Visual designs |
```

This ensures:
- **Traceability** — Each artifact links back to its creator
- **Discoverability** — All outputs in one place, easy to find
- **Continuity** — Future work can reference these artifacts
- **Audit trail** — Complete history of what was generated and when

## Integration with Task Files

All specialist work integrates into the task file through three sections:

### 1. Solutions Section (Primary Output)

```markdown
### Solutions / Goals

#### Architecture
**Specialist:** super-architect | **Completed:** 2026-01-24

[System architecture content with artifacts listed]

#### UI/UX Design
**Specialist:** super-designer | **Completed:** 2026-01-24

[Design specifications with artifacts listed]
```

### 2. Artifacts Section (File Tracking)

```markdown
### Artifacts

| Type | Path | Generated By | Date | Purpose |
|------|------|--------------|------|---------|
| Architecture Spec | `docs/architecture/0047_*.md` | super-architect | 2026-01-24 | Design decisions |
| Diagram | `docs/diagrams/0047_*.yaml` | super-architect | 2026-01-24 | Visualization |
| Design Spec | `docs/design/0047_*.md` | super-designer | 2026-01-24 | UX specifications |
```

### 3. References Section (Linking)

```markdown
### References

**External Documentation:**
- [OAuth2 RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)
- [Google OAuth2 docs](https://developers.google.com/identity/protocols/oauth2)

**Specialist Outputs:**
- [Architecture Specification](../architecture/0047_auth-system.md) - by super-architect
- [Design Specifications](../design/0047_login-flow.md) - by super-designer

**Related Code:**
- Existing auth module: `src/auth/README.md`
```

## Specialist Workflow (File Update Protocol)

When super-architect or super-designer completes work:

### Step 1: Add Content to Solutions Section

```markdown
#### [Architecture|UI/UX Design]
**Specialist:** [super-architect|super-designer] | **Completed:** YYYY-MM-DD

[Specialist content here]

**Artifacts Generated:**
- `path/to/artifact1` - Brief description
- `path/to/artifact2` - Brief description
```

### Step 2: Update Artifacts Table

Add row to the Artifacts table:

| Type | Path | Generated By | Date | Purpose |
|------|------|--------------|------|---------|
| [Type] | `[path]` | [specialist] | [date] | [purpose] |

### Step 3: Add Reference Links

Add links to specialist outputs in References section:

```markdown
**Specialist Outputs:**
- [Artifact Title](../relative/path) - by [specialist]
```

### Step 4: Update Frontmatter

Update the task file frontmatter:

```yaml
---
updated_at: YYYY-MM-DD  # Update timestamp
---
```

This ensures all specialist work is:
- ✅ **Attributed** — Clear who did what and when
- ✅ **Linked** — File paths connect work to artifacts
- ✅ **Traceable** — Complete audit trail
- ✅ **Discoverable** — Easy to find from task file

This ensures all specialist work is:
- Linked back to the task (single source of truth)
- Available for implementation phases
- Preserved for future reference

## Design Philosophy

**Right Specialist for the Job** - Different problems require different expertise. Architecture focuses on structural and technical concerns, while design focuses on user experience and visual presentation.

**Architecture Before Design** - Technical constraints and system architecture should inform UI/UX design, not the other way around.

**Design in Solutions, Not Separate** - All specialist work links back to the task file. No separate design documents floating around.

**Scalable Assessment** - Automatic scale assessment helps avoid over-engineering simple tasks while ensuring complex tasks get proper attention.

## Error Handling

| Error | Resolution |
|-------|------------|
| Task file not found | Check WBS number or file path. Use `tasks list` to see available tasks. |
| Specialist unavailable | Continue without specialist, note limitation in output |
| Task lacks requirements | Suggest running `/rd2:tasks-refine` first |
| rd2:tasks skill unavailable | Report error, suggest manual Solutions section updates |

## See Also

- **super-planner agent**: `../agents/super-planner.md` - Agent that handles design coordination
- **super-architect**: `../agents/super-architect.md` - Solution architecture specialist
- **super-designer**: `../agents/super-designer.md` - UI/UX design specialist
- **/rd2:tasks-refine**: Task quality improvement before design
- **/rd2:tasks-plan**: Full workflow orchestration (refine → design → decompose → orchestrate)
