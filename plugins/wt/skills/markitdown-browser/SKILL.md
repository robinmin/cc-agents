---
name: markitdown-browser
description: This skill should be used when the user asks to "screenshot a webpage", "fill a form", "convert PDF to markdown", "convert document to markdown", "scrape web content", "automate browser interactions", "take screenshots", or any task requiring browser automation or document conversion. Provides agent-browser for browser control and MarkItDown for document-to-Markdown conversion.
version: 0.2.0
---

# MarkItDown Browser

Browser automation and document conversion specialist combining agent-browser (browser control) and MarkItDown (document conversion) for web interaction, form testing, screenshots, and converting documents to clean Markdown.

## Quick Start

```bash
# Browser automation
agent-browser open <url>        # Navigate to page
agent-browser snapshot -i       # Get interactive elements with refs
agent-browser click @e1         # Click element by ref
agent-browser fill @e2 "text"   # Fill input by ref
agent-browser screenshot        # Take screenshot
agent-browser close             # Close browser

# Document conversion
markitdown document.pdf > output.md                    # Convert to stdout
markitdown document.pdf -o output.md                   # Save to file
curl -s https://example.com | markitdown > content.md  # Convert web page
```

## When to Use

Activate this skill when:

- User mentions: "screenshot", "fill form", "browser automation", "web testing"
- User mentions: "convert to markdown", "markitdown", "document conversion"
- Task requires interacting with web pages, filling forms, taking screenshots
- Task requires converting PDFs, Office docs, or web pages to Markdown
- Task requires extracting data from JavaScript-rendered pages
- Task requires testing web functionality or UI interactions

Do NOT use for:

- Static web content fetching (use WebFetch - faster, no browser overhead)
- Simple HTTP requests (use curl or fetch tools)
- Local file operations (use file system tools directly)

## Core Workflows

### Browser Automation Workflow

1. **Navigate** - `agent-browser open <url>`
2. **Snapshot** - `agent-browser snapshot -i` (returns elements with refs like `@e1`, `@e2`)
3. **Interact** - Use refs from snapshot for click, fill, or other actions
4. **Re-snapshot** - Get fresh refs after navigation or DOM changes (refs invalidate after page changes)
5. **Verify** - Check outcomes with follow-up snapshots

**Key Pattern:** Always snapshot before interacting. Re-snapshot after page changes.

### Document Conversion Workflow

1. **Choose input** - Local file (PDF, DOCX, PPTX, XLSX, HTML) or web URL
2. **Convert** - Use `markitdown` CLI with appropriate options
3. **Output** - Markdown to stdout or save to file with `-o`

## Security Considerations

### Input Validation

- **Validate URLs** before opening in browser - check for suspicious domains, phishing attempts
- **Sanitize file paths** when converting documents - prevent path traversal attacks
- **Verify file types** before conversion - only process expected formats (PDF, DOCX, etc.)
- **Check file sizes** - reject extremely large files that could cause resource exhaustion

### Browser Automation Security

- **Avoid sensitive data in snapshots** - snapshots may contain passwords, tokens, PII
- **Clear browser state** - use `agent-browser close` after sensitive operations
- **Headless mode default** - agent-browser runs headless by default (good for security)
- **Limit screenshot scope** - capture specific elements rather than full pages when possible

### Document Conversion Security

- **Sandbox conversion** - convert untrusted documents in isolated environment when possible
- **Check for macros** - Office documents may contain macros (markitdown extracts content only)
- **Review OCR output** - image transcription may include unexpected text
- **Validate markdown output** - check for injected scripts or malicious content

### Red Flags

Stop and verify if:

- URL domain looks suspicious (typosquatting, unusual TLD)
- File size is unexpectedly large (>100MB for documents)
- File type doesn't match extension
- Conversion output contains executable code patterns
- Browser snapshot reveals authentication tokens or credentials

## Best Practices

### Browser Automation

- **Always snapshot before interacting** - Get refs before click/fill operations
- **Re-snapshot after page changes** - DOM changes invalidate element references
- **Use `snapshot -i`** - Interactive elements only provides cleaner output
- **Wait for page load** - Use `wait --load networkidle` after navigation
- **Verify outcomes** - Use follow-up snapshots to confirm success
- **Save authentication state** - Use `state save auth.json` after login for reuse

### Document Conversion

- **Use `-o` for files** - Save directly instead of shell redirection
- **Check supported formats** - Run `markitdown --list-plugins` to verify support
- **For web pages:** Use agent-browser for JS-rendered content, curl for static pages
- **Token efficiency:** MarkItDown reduces tokens by ~50% compared to raw HTML

## Error Handling

### Browser Automation Issues

```bash
# Element not found - re-snapshot for fresh refs
agent-browser snapshot -i

# Page not loaded - wait for network idle
agent-browser wait --load networkidle

# Debug mode - show browser window
agent-browser open url --headed
```

### Document Conversion Issues

```bash
# Check if format is supported
markitdown --list-plugins

# Try specific plugin explicitly
markitdown document.docx --plugin docx > output.md
```

## Supported Formats

MarkItDown supports conversion from:

- **Documents:** PDF, DOCX, PPTX, XLSX, XLS, HTML
- **Images:** PNG, JPG, GIF, BMP, WEBP (OCR extraction)
- **Audio:** MP3, WAV, M4A, AAC, OGG, FLAC (transcription)
- **Video:** MP4 (YouTube transcription)
- **Email:** MSG (Outlook), EML (standard format)

For detailed format documentation, see `references/markitdown-formats.md`.

## Prerequisites

Install required CLIs:

```bash
# agent-browser (from browser-use project)
pip install browser-use

# markitdown (with all plugins)
uv tool install 'markitdown[all]'
# or: pip install markitdown[all]
```

## See Also

- **`rd:agent-browser`** - Original agent-browser skill in rd plugin (migration source)
- **MarkItDown Documentation** - https://github.com/microsoft/markitdown
- **browser-use Documentation** - https://github.com/browser-use/browser-use

## Additional Resources

### Reference Documentation
- **`references/agent-browser-commands.md`** - Complete agent-browser command reference with all interaction patterns
- **`references/markitdown-formats.md`** - Detailed MarkItDown format support and conversion options

### Working Examples
- **`examples/form-submission.sh`** - Form filling and submission workflow
- **`examples/web-to-markdown.sh`** - Web page to markdown conversion
- **`examples/pdf-to-markdown.sh`** - PDF document conversion
- **`examples/screenshot-capture.sh`** - Full-page screenshot capture
- **`examples/web-scraping-workflow.sh`** - Combined browser + markdown workflow

### Token Efficiency

MarkItDown produces clean markdown output with:
- ~50% token reduction compared to raw HTML
- Better LLM comprehension with structured markdown
- Preserved formatting from original documents

This makes web content and documents significantly more efficient for LLM processing.
