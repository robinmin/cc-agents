# Red Flags Checklist

Red flags in main agent configurations require **immediate verification** before proceeding. When a red flag is detected, STOP and verify before continuing.

## Red Flag Categories

### 1. Safety Rule Violations

| Red Flag | Why | Verification |
|----------|-----|--------------|
| Missing `[CRITICAL]` markers on destructive guards | Safety rules may be auto-evolved | Search for `rm -rf`, `force push`, `reset --hard` without CRITICAL markers |
| Overly permissive `bypassPermissions` | Agent can run any tool without confirmation | Check permission boundaries are properly scoped |
| No safety/security section | Basic guardrails missing | Check for Safety, Security, or Constraints sections |

### 2. Configuration Quality

| Red Flag | Why | Verification |
|----------|-----|--------------|
| Empty or near-empty config (<50 lines) | Insufficient guidance for agent | Check line count and section coverage |
| No identity/role section | Agent has no context about purpose | Check for Identity, Role, or Purpose section |
| No tech stack section | Agent cannot make appropriate tool choices | Check for Tech Stack or Tools section |
| Contradictory rules | Agent receives conflicting instructions | Review rules for logical consistency |

### 3. Platform-Specific Issues

| Red Flag | Why | Verification |
|----------|-----|--------------|
| Claude-specific hooks in non-Claude config | Hooks not portable | Check for `hooks:` in non-CLAUDE.md files |
| Memory patterns in portable configs | Memory features are platform-specific | Check for memory references in .cursorrules, AGENTS.md |
| MCP server references in non-Claude targets | MCP not universally supported | Verify target platform supports MCP |

### 4. Evolution Safety

| Red Flag | Why | Verification |
|----------|-----|--------------|
| Evolution proposal modifies CRITICAL sections | Protected sections must not change | Verify proposal scope excludes CRITICAL markers |
| Proposal lacks verification plan | Cannot confirm change is safe | Check for matching test or validation step |
| Deletion-heavy proposal (>30% content removed) | May remove essential guidance | Review deleted content for safety rules |
| Multi-file proposal across skill boundaries | Scope creep risk | Verify all files are within declared target |

### 5. Content Quality

| Red Flag | Why | Verification |
|----------|-----|--------------|
| TODO markers in production config | Incomplete guidance | Search for `TODO`, `FIXME`, `HACK` |
| Second-person language ("you should") | Agents respond better to imperative form | Search for `you should`, `you can`, `you need` |
| Generic persona ("helpful assistant") | No domain specificity | Check for unique identity and constraints |
| No version or maintenance metadata | Cannot track config drift | Check for version number or effective date |
