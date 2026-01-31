# Fallback Patterns Reference

Guidance for graceful degradation when Google Stitch is unavailable. Use Layer 1 battle-tested patterns as fallback.

## Detection

### Stitch Unavailability Signals

| Signal | Detection | Severity |
|--------|-----------|----------|
| Connection error | MCP tool throws connection exception | High - likely extended outage |
| Authentication failure | 401/403 response | High - requires config fix |
| Rate limiting | 429 response | Medium - temporary, will recover |
| Service unavailable | 503 response | Medium - temporary outage |
| Timeout | Request exceeds 30s | Low - retry may succeed |
| Invalid response | Malformed JSON/data | Low - retry may succeed |

### Detection Code

```python
def check_stitch_availability() -> tuple[bool, str]:
    """
    Check if Stitch MCP is available.
    Returns (available: bool, reason: str)
    """
    try:
        result = mcp__stitch__list_projects()
        return True, "Stitch available"
    except ConnectionError:
        return False, "Connection error - Stitch service unreachable"
    except AuthenticationError:
        return False, "Authentication failed - check API credentials"
    except RateLimitError:
        return False, "Rate limited - try again in a few minutes"
    except TimeoutError:
        return False, "Timeout - Stitch service slow or unresponsive"
    except Exception as e:
        return False, f"Unknown error: {str(e)}"
```

## Fallback Flow

```
Stitch Request
      │
      ▼
┌─────────────────┐
│ Check Available │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
Available  Unavailable
    │         │
    ▼         ▼
┌───────┐  ┌──────────────────┐
│ Use   │  │ 1. Notify user   │
│Stitch │  │ 2. Log reason    │
└───────┘  │ 3. Use fallback  │
           │ 4. Offer recovery│
           └──────────────────┘
```

## Fallback Message Templates

### Connection Error

```markdown
## Stitch Unavailable - Connection Error

**Status:** Cannot reach Stitch service
**Likely cause:** Network issue or Stitch service is down

**Fallback Mode Active:** Using pattern-based design guidance.

For your request to generate "[user's request]", here's manual guidance:

### Recommended Pattern

[Pattern-specific guidance based on request type]

### Design Tokens

[Suggested token values from Layer 1 patterns]

### Component Structure

[HTML/CSS structure suggestion]

### Accessibility Requirements

[Relevant WCAG requirements]

---

**Recovery:** Run `mcp__stitch__list_projects` to check when Stitch is available.
**Alternative:** Provide design specifications for manual implementation.
```

### Authentication Error

```markdown
## Stitch Unavailable - Authentication Required

**Status:** Stitch API authentication failed
**Likely cause:** Missing or invalid API credentials

**Action Required:**
1. Check MCP configuration in `.claude/settings.json`
2. Verify Stitch API key is set correctly
3. Ensure MCP server is properly configured

**Fallback Mode Active:** Using pattern-based design guidance.

[Continue with pattern-based guidance...]
```

### Rate Limited

```markdown
## Stitch Temporarily Unavailable - Rate Limited

**Status:** Too many requests to Stitch API
**Recovery time:** Usually 1-5 minutes

**Fallback Mode Active:** Using pattern-based design guidance for now.

[Continue with pattern-based guidance...]

**Auto-recovery:** Will check Stitch availability before next generation request.
```

## Pattern-Based Fallback Guidance

When Stitch is unavailable, provide guidance based on request type:

### For Login/Auth Screens

```markdown
### Login Screen Pattern (Fallback)

**Layout:**
- Centered card on subtle background
- Max width: 400px
- Padding: 32px (desktop), 24px (mobile)

**Elements:**
1. Logo/brand (centered, top)
2. Heading: "Sign in to your account"
3. Email input (with label, required)
4. Password input (with label, required, show/hide toggle)
5. "Forgot password?" link (right-aligned)
6. Primary submit button (full width)
7. Divider with "or"
8. Social login buttons (Google, Apple)
9. "Create account" link (bottom)

**Design Tokens:**
```css
--card-bg: #ffffff;
--input-border: #e2e8f0;
--input-focus: #3b82f6;
--button-primary: #3b82f6;
--button-text: #ffffff;
--link-color: #3b82f6;
```

**Accessibility:**
- All inputs have visible labels
- Password field has toggle button with aria-label
- Focus states visible on all interactive elements
- Color contrast minimum 4.5:1
```

### For Dashboard Screens

```markdown
### Dashboard Pattern (Fallback)

**Layout:**
- Sidebar navigation (240px, collapsible on mobile)
- Top header (64px height, sticky)
- Main content area with grid

**Grid Structure:**
```css
display: grid;
grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
gap: 24px;
padding: 24px;
```

**Common Elements:**
1. Header with breadcrumb, search, user menu
2. Stat cards row (4 cards, key metrics)
3. Charts section (line/bar charts)
4. Recent activity/table
5. Quick actions panel

**Design Tokens:**
```css
--sidebar-bg: #1e293b;
--sidebar-text: #f1f5f9;
--content-bg: #f8fafc;
--card-bg: #ffffff;
--stat-up: #22c55e;
--stat-down: #ef4444;
```
```

### For Form Screens

```markdown
### Form Pattern (Fallback)

**Layout:**
- Single column for simple forms
- Two columns for complex forms (desktop)
- Stack to single column on mobile

**Input Groups:**
```html
<div class="form-group">
  <label for="fieldId">Field Label</label>
  <input type="text" id="fieldId" name="field" required>
  <span class="helper-text">Helper text here</span>
  <span class="error-text" hidden>Error message</span>
</div>
```

**Spacing:**
- Between groups: 24px
- Label to input: 8px
- Input to helper: 4px

**Button Placement:**
- Right-aligned for modals
- Full-width for mobile
- Primary action on right
```

### For Card/List Screens

```markdown
### Card Grid Pattern (Fallback)

**Grid:**
```css
display: grid;
grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
gap: 24px;
```

**Card Structure:**
```html
<article class="card">
  <img class="card-image" src="..." alt="...">
  <div class="card-content">
    <h3 class="card-title">Title</h3>
    <p class="card-description">Description...</p>
    <div class="card-meta">
      <span class="meta-item">Meta info</span>
    </div>
  </div>
  <div class="card-actions">
    <button class="btn-secondary">Action</button>
    <button class="btn-primary">Primary</button>
  </div>
</article>
```

**Card Tokens:**
```css
--card-radius: 8px;
--card-shadow: 0 1px 3px rgba(0,0,0,0.1);
--card-hover-shadow: 0 4px 12px rgba(0,0,0,0.15);
--card-padding: 16px;
```
```

## Recovery Detection

### Automatic Recovery Check

```python
class StitchAvailabilityMonitor:
    def __init__(self):
        self.last_check = None
        self.is_available = None
        self.check_interval = 60  # seconds

    def should_check(self) -> bool:
        if self.last_check is None:
            return True
        elapsed = time.time() - self.last_check
        return elapsed > self.check_interval

    def check_and_notify(self) -> bool:
        if not self.should_check():
            return self.is_available

        was_available = self.is_available
        self.is_available, reason = check_stitch_availability()
        self.last_check = time.time()

        # Notify on recovery
        if not was_available and self.is_available:
            print("Stitch is now available! AI generation enabled.")

        return self.is_available
```

### Manual Recovery Check

Provide user with command to check:

```markdown
**Check Stitch Status:**

Run this to verify Stitch availability:
```
mcp__stitch__list_projects
```

- **Success response** (empty array or project list): Stitch is available
- **Error response**: Still unavailable, continue with fallback patterns
```

## Logging

### Log Format

```python
def log_fallback_activation(reason: str, request_type: str):
    """Log when fallback mode is activated."""
    log_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "event": "stitch_fallback_activated",
        "reason": reason,
        "request_type": request_type,
        "fallback_pattern": get_fallback_pattern(request_type)
    }
    logger.warning(json.dumps(log_entry))
```

### Metrics to Track

- Fallback activation count (by reason)
- Time spent in fallback mode
- Recovery detection success rate
- User satisfaction with fallback guidance

## Best Practices

1. **Always notify user** - Never silently fall back
2. **Provide actionable guidance** - Pattern-based help, not just "unavailable"
3. **Offer recovery path** - Tell user how to check/retry
4. **Log for debugging** - Track fallback events
5. **Graceful degradation** - Partial functionality better than none
6. **Preserve user intent** - Capture request for retry when available

## Quick Reference

### Fallback Decision Tree

```
Request Type → Fallback Pattern
─────────────────────────────────
Login/Auth → Login Screen Pattern
Dashboard → Dashboard Pattern
Form/Input → Form Pattern
List/Grid → Card Grid Pattern
Settings → Form Pattern
Profile → Card + Form Pattern
Landing → Hero + Features Pattern
```

### Minimum Viable Response

When no specific pattern matches:

```markdown
## Stitch Unavailable

**Fallback guidance for "[request]":**

1. **Layout:** [desktop/mobile-first/responsive]
2. **Key elements:** [list main components]
3. **Design tokens:** Use Layer 1 defaults from SKILL.md
4. **Accessibility:** Follow WCAG 2.1 AA checklist

See SKILL.md sections:
- "Component Design Patterns" for element styling
- "Layout Patterns" for structure
- "Accessibility Checklist" for compliance

**Recovery:** Check Stitch with `mcp__stitch__list_projects`
```
