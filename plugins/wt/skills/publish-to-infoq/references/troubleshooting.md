# InfoQ Browser Automation - Troubleshooting

## Common Issues and Solutions

### Chrome Not Found

**Error:**
```
Error: Chrome not found. Set INFOQ_BROWSER_CHROME_PATH env var.
```

**Solutions:**

1. **Install Chrome/Chromium:**
   - macOS: Download from [google.com/chrome](https://google.com/chrome)
   - Linux: `sudo apt install google-chrome-stable`
   - Windows: Download from [google.com/chrome](https://google.com/chrome)

2. **Set custom Chrome path:**
   ```bash
   export INFOQ_BROWSER_CHROME_PATH="/path/to/chrome"
   ```

3. **Verify installation:**
   ```bash
   # macOS
   ls -la /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome

   # Linux
   which google-chrome

   # Windows
   where chrome
   ```

---

### Page Navigation Errors

**Error:**
```
Error: Page not found: xie.infoq.cn
```

**Solutions:**

1. **Check internet connection:**
   ```bash
   ping xie.infoq.cn
   curl -I https://xie.infoq.cn
   ```

2. **Verify InfoQ site is accessible:**
   - Open https://xie.infoq.cn in a regular browser
   - Check if site is down (https://status.infoq.cn if available)

3. **Try launching Chrome manually:**
   ```bash
   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
     --remote-debugging-port=9222 \
     --user-data-dir=/tmp/test-profile \
     https://xie.infoq.cn
   ```

---

### DOM Selector Issues

**Error:**
```
Error: Element not found. Tried selectors: input[placeholder*="标题" i], ...
```

**Solutions:**

1. **InfoQ updated their UI:**
   - Open https://xie.infoq.cn/article/create in Chrome DevTools
   - Inspect element and find actual selectors
   - Update `INFOQ_SELECTORS` in `scripts/infoq-article.ts`

2. **Page not fully loaded:**
   - Increase timeout in `waitForPageReady()`:
   ```typescript
   await waitForPageReady(session, 30000); // 30 seconds instead of 20
   ```

3. **Login required:**
   - Check if you're being redirected to login page
   - Log in manually in the opened Chrome window

4. **Debug current DOM:**
   ```bash
   # Pause script after page load
   # Open chrome://inspect to inspect the page
   # Check actual DOM structure
   ```

---

### CDP Connection Timeout

**Error:**
```
Error: Chrome debug port not ready
```

**Solutions:**

1. **Port already in use:**
   ```bash
   # Kill existing Chrome processes
   pkill -f "remote-debugging-port"

   # Or use different port (script auto-selects free port)
   ```

2. **Chrome crashed on startup:**
   - Check Chrome version (requires Chrome 60+)
   - Try launching Chrome manually with debug flags:
   ```bash
   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
     --remote-debugging-port=9222
   ```
   - Verify with: `curl http://127.0.0.1:9222/json/version`

3. **Profile corruption:**
   ```bash
   # Remove corrupted profile
   rm -rf ~/.local/share/infoq-browser-profile
   # Script will recreate it
   ```

---

### Missing Title Errors

**Error:**
```
Error: Title is required. Add "title: Your Title" to frontmatter or use --title flag.
```

**Solutions:**

1. **Add frontmatter to markdown:**
   ```markdown
   ---
   title: Your Article Title
   ---

   # Article Content
   ```

2. **Use --title flag:**
   ```bash
   npx -y bun infoq-article.ts --title "My Title" --content "..."
   ```

3. **Check markdown file encoding:**
   ```bash
   file article.md
   # Should be: UTF-8 Unicode text
   ```

---

### Login Session Persistence

**Issue:** Script asks for login every time

**Solutions:**

1. **Verify profile directory:**
   ```bash
   ls -la ~/.local/share/infoq-browser-profile/Default/
   # Should contain: Cookies, Local Storage, etc.
   ```

2. **Check if login persisted:**
   - Log in manually in the Chrome window
   - Close the script
   - Run again - should stay logged in

3. **Clear and re-login:**
   ```bash
   rm -rf ~/.local/share/infoq-browser-profile
   # Run script again and log in fresh
   ```

---

### Content Not Appearing

**Issue:** Content filled but not visible in editor

**Solutions:**

1. **Vue.js reactivity issue:**
   - Ensure `input` event is triggered:
   ```typescript
   const event = new Event('input', { bubbles: true });
   el.dispatchEvent(event);
   ```

2. **Editor not focused:**
   - Add `el.focus()` before setting value
   - Wait for focus to complete

3. **Content too long:**
   - InfoQ may have content length limits
   - Try with shorter content first

4. **Wrong editor selector:**
   - InfoQ may use different editor for different article types
   - Inspect actual DOM and update selector

---

### Submit Button Not Found

**Error:**
```
Error: Element not found. Tried selectors: button[type="submit"], ...
```

**Solutions:**

1. **Required fields missing:**
   - Fill all required fields (title, content, category)
   - Submit button may be disabled until valid

2. **Button text different:**
   - Inspect actual button text in DevTools
   - Update selector:
   ```typescript
   'button:has-text("Actual Button Text")'
   ```

3. **Validation errors:**
   - Check for error messages in the page
   - Screenshot the page for debugging

---

### Word Count Warnings

**Issue:** Article rejected for being too short

**Solutions:**

1. **Check word count:**
   ```bash
   wc -w article.md
   # Should be 3000-4000 words for InfoQ
   ```

2. **Add more content:**
   - InfoQ requires depth articles
   - Expand with examples, code, diagrams

3. **Submit as draft first:**
   - Use `--draft` flag to save without review
   - Edit in InfoQ editor before final submission

---

## Debug Mode

### Enable Verbose Logging

Add console.log statements in `scripts/infoq-article.ts`:

```typescript
console.log('[DEBUG] Current URL:', await evaluate(session, 'window.location.href'));
console.log('[DEBUG] Page HTML:', await evaluate(session, 'document.body.innerHTML'));
```

### Take Screenshots

Add screenshot capture after page load:

```typescript
// In cdp.ts
export async function captureScreenshot(session: ChromeSession): Promise<void> {
  await session.cdp.send('Page.captureScreenshot', {}, { sessionId: session.sessionId });
  // Save base64 image to file
}
```

### Pause for Manual Inspection

```typescript
console.log('[DEBUG] Pausing for 60 seconds. Inspect Chrome at chrome://inspect');
await sleep(60_000);
```

---

## Getting Help

### Collect Debug Information

```bash
# Script version
npx -y bun infoq-article.ts --version

# Chrome version
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --version

# OS version
uname -a

# Node/bun version
bun --version

# Profile contents
ls -la ~/.local/share/infoq-browser-profile/
```

### Report Issues

Include in your issue report:

1. Full error message
2. Command used
3. Markdown file (redacted if needed)
4. Chrome version
5. OS/platform
6. Screenshot of the Chrome window (if applicable)

### Useful Resources

- [InfoQ Contribution Guide](https://www.infoq.cn/article/2012/02/how-to-contribute)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- [Vue.js Reactivity Documentation](https://v2.vuejs.org/v2/guide/reactivity.html)
