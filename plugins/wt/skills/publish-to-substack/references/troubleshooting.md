# Troubleshooting: Substack Publishing

## Common Issues and Solutions

### "Chrome not found"

**Problem**: Chrome browser not installed or not in default location

**Symptoms**:
- Error: "Chrome executable not found"
- Script exits immediately

**Solutions**:
1. Install Google Chrome: https://www.google.com/chrome/
2. Or set `SUBSTACK_BROWSER_CHROME_PATH` environment variable:
   ```bash
   export SUBSTACK_BROWSER_CHROME_PATH="/path/to/chrome"
   ```

---

### "Page not found: substack.com"

**Problem**: Navigation failed or page structure changed

**Symptoms**:
- Error: "Navigation timeout" or "Page not found"
- Chrome opens but doesn't reach Substack

**Solutions**:
1. Check internet connection
2. Verify Substack.com is accessible: `curl -I https://substack.com`
3. Check for DNS issues
4. Report issue if Substack changed their URL structure

---

### "Element not found: selector"

**Problem**: DOM selector doesn't match current Substack page structure

**Symptoms**:
- Error: "Element not found: <selector>"
- Chrome opens to Substack but script fails

**Solutions**:
1. Substack may have updated their UI
2. Run with `--debug` flag to see page structure
3. Manually inspect page in browser DevTools
4. Report issue for DOM selector updates

**Debug mode**:
```bash
# Enable debug output
DEBUG=substack:* bun substack-article.ts --markdown article.md
```

---

### "CDP connection timeout"

**Problem**: Chrome failed to start or connect to debug port

**Symptoms**:
- Error: "CDP connection timeout"
- Script hangs then exits

**Solutions**:
1. Check if Chrome is already running (close it first)
2. Verify Chrome executable path
3. Check if port 9222 is available
4. Try deleting profile directory and re-authenticating:
   ```bash
   rm -rf ~/.local/share/substack-browser-profile
   ```

---

### "Title is required"

**Problem**: No title found in markdown or via --title flag

**Symptoms**:
- Error: "Title is required but not provided"
- Script exits without publishing

**Solutions**:
1. Add `title: Your Title` to markdown frontmatter:
   ```markdown
   ---
   title: Your Article Title
   ---
   ```
2. Or use `--title` flag:
   ```bash
   bun substack-article.ts --title "Your Title" --content "..."
   ```

---

## Getting Help

If issues persist:

1. Check GitHub Issues for similar problems
2. Enable debug mode: `DEBUG=substack:*`
3. Include error messages and debug output in issue reports
4. Specify Chrome version and OS platform

## Debug Commands

```bash
# Check Chrome version
google-chrome --version

# Test CDP connection manually
curl http://localhost:9222/json/version

# Verify profile directory exists
ls -la ~/.local/share/substack-browser-profile

# Test Substack accessibility
curl -I https://substack.com
```
