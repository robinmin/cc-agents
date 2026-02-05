# Technical Details: Substack Browser Automation

## Editor Technology

- **Editor**: ProseMirror-based rich text editor (similar to WeChat MP)
- **Content Format**: HTML/Markdown converted to ProseMirror document format
- **DOM Selectors**: Auto-discovery with fallback to known patterns

## Browser Automation

- **Protocol**: Chrome DevTools Protocol (CDP)
- **Browser**: Chrome/Chromium with persistent profile
- **Authentication**: Cookie-based session (persists in profile)
- **Page Load**: Waits for editor initialization before interaction

## DOM Selectors

The script uses these selectors (with auto-discovery fallback):

| Element | Selector |
|---------|----------|
| Title input | `input[placeholder*="Title"]`, `input[type="text"]` |
| Content editor | `.ProseMirror`, `[contenteditable="true"]` |
| Tags input | `input[placeholder*="tags"]`, `input[placeholder*="Tags"]` |
| Publish button | `button[type="submit"]`, `button:has-text("Publish")` |
| Draft button | `button:has-text("Save as draft")` |

## CDP Implementation Details

### Connection

```typescript
// Chrome starts with remote debugging port
chrome --remote-debugging-port=9222 --user-data-dir=<profile>
```

### Page Interaction Flow

1. Navigate to `https://substack.com/pub/<publication>/write`
2. Wait for editor initialization (ProseMirror ready)
3. Fill title field
4. Fill content (convert markdown to HTML for ProseMirror)
5. Set tags
6. Click publish/draft button
7. Extract post URL from response

### Content Conversion

Markdown is converted to HTML for ProseMirror compatibility:

```typescript
// Simple markdown-to-HTML for code blocks, links, formatting
// Preserves Substack-compatible formatting
```

## Platform Support

| Platform | Status | Notes |
|----------|--------|-------|
| macOS | Fully supported | Chrome default location |
| Linux | Fully supported | Chrome default location |
| Windows | Fully supported | Chrome default location |

## Related Technologies

- [ProseMirror - Editor framework](https://prosemirror.net/)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
