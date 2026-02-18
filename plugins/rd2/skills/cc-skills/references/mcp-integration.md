# MCP Integration Guide

This guide covers building skills that enhance MCP (Model Context Protocol) tool access with workflow guidance.

## Overview

MCP Enhancement skills help users get more value from MCP servers by providing:
- Workflow orchestration for multi-step processes
- Domain expertise for the service
- Context users would otherwise need to specify
- Error handling for common MCP issues

**Kitchen Analogy:**
- MCP = Kitchen tools/ingredients
- Skills = Recipes (how to use the tools together)

---

## When to Create MCP Enhancement Skills

Create an MCP Enhancement skill when:

1. **Users don't know what to do after connecting MCP**
   - The MCP works but users need guidance on workflows

2. **Each conversation starts from scratch**
   - No persistent context between sessions

3. **Inconsistent results across users**
   - Users discover different workflows

4. **Complex multi-step processes**
   - Multiple MCP calls need ordering

### Examples

| MCP Server | Enhancement Skill |
|------------|-------------------|
| Sentry | sentry-code-review |
| Linear | linear-sprint-planning |
| GitHub | github-code-review |
| Database | db-schema-design |

---

## MCP Enhancement Skill Structure

```markdown
---
name: mcp-enhancement-example
description: "This skill enhances [MCP Server] with workflow guidance..."
---

## MCP Tools Used
- [List MCP tools this skill coordinates]

## Workflows

### Workflow 1: [Name]
1. [Step 1 - MCP call]
2. [Step 2 - MCP call]
3. [Step 3 - Process results]

### Workflow 2: [Name]
[Another workflow...]
```

---

## Multi-MCP Coordination Patterns

### Phase Separation

```markdown
## User Onboarding Workflow

### Phase 1: Data Fetch (Service A MCP)
- Fetch user profile
- Fetch account details
- Fetch preferences

### Phase 2: Processing (Local)
- Merge data
- Apply business rules

### Phase 3: Action (Service B MCP)
- Create workspace
- Invite team members
- Send welcome notification
```

### Data Passing

```python
# Phase 1: Fetch
user_id = "123"
user_data = mcp.call("service_a", "get_user", {"id": user_id})

# Phase 2: Process
workspace_name = f"{user_data['company']}-workspace"

# Phase 3: Pass to next MCP
result = mcp.call("service_b", "create_workspace", {
    "name": workspace_name,
    "owner": user_id
})
```

### Centralized Error Handling

```python
def execute_workflow(user_id):
    try:
        # Step 1
        user = mcp.call("service_a", "get_user", {"id": user_id})
    except ConnectionError:
        return {"error": "Service A unavailable"}
    except AuthError:
        return {"error": "Service A auth failed"}

    try:
        # Step 2
        workspace = mcp.call("service_b", "create_workspace", {...})
    except RateLimitError:
        return {"error": "Service B rate limited, try again later"}
    except ValidationError as e:
        return {"error": f"Validation failed: {e}"}

    return {"success": True, "workspace": workspace}
```

---

## Error Handling for MCP Issues

### Connection Refused

```markdown
## Error: Connection Refused
**Symptoms:** "Connection to [service] failed"
**Solutions:**
1. Check MCP server is running
2. Verify port configuration
3. Restart Claude Code

**Diagnostic:**
```bash
# Check server status
ps aux | grep mcp-server
```
```

### Authentication Failures

```markdown
## Error: Authentication Failed
**Symptoms:** "Invalid API key" / "Unauthorized"
**Solutions:**
1. Verify API key in environment
2. Check key has required permissions
3. Confirm subscription status
```

### Tool Name Validation

```markdown
## Error: Tool Not Found
**Symptoms:** "[Tool] is not a valid tool"
**Solutions:**
1. Check MCP server is connected: `/mcp servers`
2. Verify tool name spelling
3. List available tools: `available_tools`
```

---

## MCP Enhancement Best Practices

### 1. Provide Context Enrichment

```yaml
# Instead of requiring user to specify:
"Create a Linear issue"

# The skill enriches with:
- Project ID from workspace config
- Labels based on issue type
- Assignee from team roster
- Priority based on keywords
```

### 2. Handle Missing Data Gracefully

```python
# Check required data before MCP calls
if not user.get("email"):
    raise ValidationError("User email required")

# Provide sensible defaults
priority = user.get("priority", "medium")
```

### 3. Log for Debugging

```python
def create_issue(issue_data, context):
    logger.info(f"Creating issue in project {context['project_id']}")
    logger.debug(f"Issue data: {issue_data}")

    result = mcp.call("linear", "create_issue", issue_data)

    logger.info(f"Created issue {result['id']}")
    return result
```

### 4. Validate Before MCP Calls

```python
def validate_inputs(issue_data):
    errors = []

    if not issue_data.get("title"):
        errors.append("Title is required")

    if len(issue_data.get("title", "")) > 200:
        errors.append("Title must be under 200 chars")

    if issue_data.get("priority") not in ["low", "medium", "high", "urgent"]:
        errors.append("Invalid priority")

    if errors:
        raise ValidationError("; ".join(errors))
```

---

## MCP Integration Checklist

- [ ] List all MCP tools used
- [ ] Define clear workflows with phases
- [ ] Implement data passing between phases
- [ ] Add error handling for each MCP call
- [ ] Handle connection failures gracefully
- [ ] Validate inputs before MCP calls
- [ ] Add logging for debugging
- [ ] Provide sensible defaults
- [ ] Document required MCP servers
- [ ] Test with disconnected MCP (error message)

---

## See Also

- [Skill Patterns](skill-patterns.md) - Multi-MCP Coordination pattern
- [Best Practices](best-practices.md) - General skill guidance
- [Troubleshooting](troubleshooting.md) - MCP connection issues
- [Common Mistakes](common-mistakes.md) - Anti-patterns to avoid
