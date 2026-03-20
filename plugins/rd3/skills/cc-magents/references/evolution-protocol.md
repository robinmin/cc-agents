# Evolution Protocol

Self-evolution system for main agent configurations (AGENTS.md, CLAUDE.md, etc.) using pattern analysis and proposal generation.

## Overview

The evolution system analyzes interaction patterns, git history, CI results, and other data sources to generate improvement proposals for main agent configurations. The system operates on a **L1-first** safety model where all changes require human approval.

## Safety Model

### Evolution Levels

| Level | Description | Human Approval |
|-------|-------------|---------------|
| **L1** (default) | Suggest-only - all changes require approval | Required for all |
| **L2** | Semi-auto - low-risk changes auto-apply | Required for high-risk |
| **L3** | Auto - fully autonomous evolution | Monitoring only |

**Default is L1** - The system never auto-modifies anything without explicit approval.

### CRITICAL Rule Protection

These rules are **CRITICAL** and can **NEVER** be auto-evolved:

- Destructive action guards (git reset, rm -rf, force push)
- Secret handling rules
- Permission boundaries
- Safety-critical constraints
- Any section containing `[CRITICAL]` markers

#### CRITICAL Detection Patterns

```typescript
const CRITICAL_PATTERNS = [
    /\[CRITICAL\]/i,
    /\bCRITICAL\b/,
    /\bNEVER\b.*\b(rm\s+-rf|git\s+reset|force\s+push|destroy|delete\s+all)\b/i,
    /\bMUST\s+NOT\b.*\b(ignore|disregard|bypass)\b/i,
    /\bdestructive.*action.*guard\b/i,
    /\bsecret.*handling\b/i,
    /\bpermission.*boundary\b/i,
    /\b(rm\s+-rf|git\s+reset\s+--hard|git\s+push\s+--force)\b/,
];
```

Protected sections: `safety`, `security`, `permissions`, `rules`, `constraints`, `critical`

## Data Sources

The evolution system analyzes patterns from multiple data sources:

### Git History (`git-history`)
- Commit frequency and patterns
- Section modification frequency
- Change correlation analysis
- Conflict detection

### CI Results (`ci-results`)
- Test failure patterns
- Quality score trends
- Build success/failure rates
- Linter violation frequency

### User Feedback (`user-feedback`)
- Explicit ratings
- Feature requests
- Issue reports
-满意度 surveys

### Memory Files (`memory-md`)
- MEMORY.md analysis
- Context accumulation patterns
- Learned preferences
- Repeated context

### Interaction Logs (`interaction-logs`)
- Command usage patterns
- Success/failure rates
- Tool selection patterns
- Error frequency

## Pattern Types

| Type | Description | Proposal Generation |
|------|-------------|-------------------|
| `success` | Successful behavior patterns | Preserve |
| `failure` | Detected issues or violations | Fix proposal |
| `improvement` | Optimization opportunities | Enhancement proposal |
| `degradation` | Declining performance | Remediation proposal |
| `gap` | Missing sections or content | Addition proposal |

## Proposal Structure

```typescript
interface EvolutionProposal {
    id: string;              // Unique identifier (e.g., "p1abc2d")
    targetSection: string;   // Section to modify
    changeType: 'add' | 'modify' | 'remove' | 'reorder';
    description: string;      // Human-readable description
    rationale: string;       // Why this change is needed
    source: EvolutionDataSource;
    confidence: number;       // 0-1 confidence score
    affectsCritical: boolean; // Touches CRITICAL section
    diff?: {
        before: string;
        after: string;
    };
}
```

## Workflow

### Standard L1 Evolution (Suggest-Only)

```bash
# 1. Analyze patterns
bun evolve.ts AGENTS.md --analyze

# 2. Generate proposals
bun evolve.ts AGENTS.md --propose

# 3. Review proposals manually

# 4. Apply approved changes (requires --confirm)
bun evolve.ts AGENTS.md --apply p1abc2d --confirm
```

### Rollback Workflow

```bash
# View version history
bun evolve.ts AGENTS.md --history

# Rollback to previous version (requires --confirm)
bun evolve.ts AGENTS.md --rollback v2 --confirm
```

## Version History

Evolution creates snapshots stored in `.cc-magents/evolution/versions/`:

```typescript
interface VersionSnapshot {
    version: string;          // "v1", "v2", etc.
    timestamp: string;         // ISO timestamp
    content: string;          // Full file content
    grade: Grade;             // Evaluation grade at this point
    changeDescription: string; // What changed
    proposalsApplied: string[]; // IDs of applied proposals
}
```

### Backup System

Before any change:
1. Current content backed up to `.cc-magents/evolution/backups/`
2. Rollback backups stored in `.cc-magents/evolution/rollback-backups/`

## Evaluation Integration

The evolution system uses `evaluate.ts` for before/after quality scoring:

- **Current Grade**: Evaluated before changes
- **Predicted Grade**: Estimated after applying proposals
- **Post-Apply Grade**: Verified after changes applied

Grade improvement indicates successful evolution.

## Safety Checks

Before any proposal is applied:

1. **CRITICAL Section Check**: Proposals touching CRITICAL sections flagged
2. **Backup Verification**: Backup created before any modification
3. **Diff Preview**: Changes shown before application
4. **Confirmation Required**: `--confirm` flag required for all changes

## Output Files

| Path | Purpose |
|------|---------|
| `.cc-magents/evolution/` | Root evolution directory |
| `.cc-magents/evolution/backups/` | Pre-change backups |
| `.cc-magents/evolution/rollback-backups/` | Rollback backups |
| `.cc-magents/evolution/versions/` | Version snapshots |

## CLI Reference

```bash
# Analyze patterns
bun evolve.ts <config-path> --analyze

# Generate proposals
bun evolve.ts <config-path> --propose

# Apply proposal (safety flag required)
bun evolve.ts <config-path> --apply <proposal-id> --confirm

# Show history
bun evolve.ts <config-path> --history

# Rollback (safety flag required)
bun evolve.ts <config-path> --rollback <version-id> --confirm

# Options
--safety <level>   Safety level: L1, L2, L3 (default: L1)
--json             Output as JSON
--verbose, -v      Detailed output
```

## Confidence Scoring

Proposals include confidence scores (0-1) based on:

- Evidence strength from data sources
- Pattern consistency across sources
- Historical success of similar changes

| Confidence | Range | Action |
|------------|-------|--------|
| HIGH | >0.8 | Auto-apply (L2+ only) |
| MEDIUM | 0.5-0.8 | Manual review recommended |
| LOW | <0.5 | Manual review required |

## Limitations

- Git history analysis requires `.git` directory
- CI results require recognized CI config files
- User feedback requires `FEEDBACK.md` or `.feedback`
- Memory analysis requires `MEMORY.md` or `.memory`
- Interaction logs require `.logs` or `.interaction-logs`

Without data sources, system falls back to static analysis of the config file itself.

## Future Enhancements

- L2/L3 semi/autonomous modes (with appropriate safeguards)
- Cross-project pattern learning
- A/B testing for proposal validation
- Integration with external feedback systems
- ML-based proposal confidence scoring
