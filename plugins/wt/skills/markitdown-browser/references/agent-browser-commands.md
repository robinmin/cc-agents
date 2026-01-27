# Agent-Browser Commands Reference

Complete reference for all agent-browser CLI commands.

## Navigation Commands

```bash
agent-browser open <url>      # Navigate to URL
agent-browser back            # Go back in history
agent-browser forward         # Go forward in history
agent-browser reload          # Reload current page
agent-browser close           # Close browser session
```

## Snapshot Commands (Page Analysis)

```bash
agent-browser snapshot        # Full accessibility tree dump
agent-browser snapshot -i     # Interactive elements only (recommended for most tasks)
agent-browser snapshot -c     # Compact output format
agent-browser snapshot -d 3   # Limit depth to 3 levels
```

**Usage Note:** Always snapshot before interacting to get element references. Re-snapshot after page changes or navigation.

## Interaction Commands

All interaction commands use `@eN` references from snapshot output.

### Click and Type

```bash
agent-browser click @e1           # Click element
agent-browser dblclick @e1        # Double-click element
agent-browser fill @e2 "text"     # Clear field and type text
agent-browser type @e2 "text"     # Type without clearing (append)
```

### Keyboard and Mouse

```bash
agent-browser press Enter         # Press single key
agent-browser press Control+a     # Key combination (modifiers)
agent-browser hover @e1           # Hover mouse over element
agent-browser scroll down 500     # Scroll viewport (pixels or direction)
```

### Form Elements

```bash
agent-browser check @e1           # Check checkbox
agent-browser uncheck @e1         # Uncheck checkbox
agent-browser select @e1 "value"  # Select dropdown option by value
```

## Information Retrieval

```bash
agent-browser get text @e1        # Get element text content
agent-browser get value @e1       # Get input field value
agent-browser get title           # Get page title
agent-browser get url             # Get current URL
```

## Screenshot Commands

```bash
agent-browser screenshot                    # Screenshot to stdout (base64)
agent-browser screenshot path.png           # Save screenshot to file
agent-browser screenshot --full             # Capture full page (scrolls)
agent-browser screenshot @e1                # Capture specific element
```

## Wait Commands

```bash
agent-browser wait @e1                     # Wait for element to appear
agent-browser wait 2000                    # Wait specific milliseconds
agent-browser wait --text "Success"        # Wait for text to appear
agent-browser wait --load networkidle      # Wait until network idle
agent-browser wait --load domcontentloaded # Wait for DOM ready
```

## Semantic Locators (Alternative to @refs)

When element references are unavailable, use semantic locators:

```bash
# By role
agent-browser find role button click --name "Submit"
agent-browser find role link click --name "Learn More"

# By text content
agent-browser find text "Sign In" click
agent-browser find text "Create account" click

# By label
agent-browser find label "Email" fill "user@test.com"
agent-browser find label "Password" fill "secret123"

# By test ID (if available)
agent-browser find testid submit-btn click
```

## State Management

```bash
agent-browser state save auth.json      # Save current session state
agent-browser state load auth.json      # Load saved session
```

## Debugging Commands

```bash
agent-browser open <url> --headed       # Show browser window (default: headless)
agent-browser console                   # Get browser console logs
agent-browser errors                    # Get browser errors
```

## Error Recovery Patterns

### Element Not Found

```bash
# Re-snapshot to get fresh references
agent-browser snapshot -i
# Then retry interaction with new refs
```

### Page Not Loaded

```bash
# Wait for network idle after navigation
agent-browser wait --load networkidle
agent-browser snapshot -i
```

### Dynamic Content

```bash
# Wait for specific element to appear
agent-browser wait @e15
agent-browser snapshot -i
```

## Common Patterns

### Form Submission Pattern

```bash
agent-browser open https://example.com/form
agent-browser snapshot -i
# Use refs from snapshot output
agent-browser fill @e1 "user@example.com"
agent-browser fill @e2 "password"
agent-browser click @e3
agent-browser wait --load networkidle
agent-browser snapshot -i  # Verify result
```

### Navigation and Extraction Pattern

```bash
agent-browser open https://example.com
agent-browser wait --load networkidle
agent-browser snapshot -i
agent-browser get text @e10  # Extract content
```

### Multi-Step Interaction Pattern

```bash
agent-browser open https://example.com
agent-browser snapshot -i
agent-browser click @e5
agent-browser wait --load networkidle
agent-browser snapshot -i  # New refs after navigation
agent-browser fill @e12 "search term"
agent-browser press Enter
agent-browser wait --load networkidle
```
