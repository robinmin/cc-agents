# Troubleshooting: XHS Publishing

## Table of Contents

- [Common Issues and Solutions](#common-issues-and-solutions)
  - [Chrome Not Found](#chrome-not-found)
  - [Page Navigation Errors](#page-navigation-errors)
  - [DOM Selector Issues](#dom-selector-issues)
  - [CDP Connection Timeout](#cdp-connection-timeout)
  - [Login Session Persistence](#login-session-persistence)
  - [Article Save Failure](#article-save-failure)
  - [Content Parsing Errors](#content-parsing-errors)
  - [Character Encoding Issues](#character-encoding-issues)
  - [Network Timeout](#network-timeout)
  - [Memory Issues](#memory-issues)
  - [Getting Help](#getting-help)
- [Quick Reference](#quick-reference)
  - [Reset Profile](#reset-profile)
  - [Verify Chrome](#verify-chrome)
  - [Test Connection](#test-connection)
  - [Manual Test](#manual-test)

---

## Common Issues and Solutions

### Chrome Not Found

**Error:**
```
Error: Chrome not found. Set XHS_BROWSER_CHROME_PATH env var.
```

**Solutions:**

1. **Install Chrome/Chromium**
   ```bash
   # macOS
   brew install --cask google-chrome

   # Linux (Ubuntu/Debian)
   sudo apt-get install chromium-browser

   # Linux (Fedora)
   sudo dnf install chromium
   ```

2. **Set Chrome Path Environment Variable**
   ```bash
   export XHS_BROWSER_CHROME_PATH="/path/to/chrome"
   ```

3. **Verify Installation**
   ```bash
   which google-chrome
   which chromium-browser
   ls /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome
   ```

---

### Page Navigation Errors

**Error:**
```
Error: Page not found: xiaohongshu.com
```

**Causes:**
- Network connectivity issues
- XHS website blocked or unavailable
- Invalid URL

**Solutions:**

1. **Check Network Connection**
   ```bash
   ping xiaohongshu.com
   curl -I https://www.xiaohongshu.com
   ```

2. **Verify URL in xhs-utils.ts**
   ```typescript
   export const XHS_URLS = {
     postCreate: 'https://www.xiaohongshu.com/publish/publish',
   };
   ```

3. **Try Manual Browser Access**
   - Open Chrome manually
   - Navigate to https://www.xiaohongshu.com
   - Verify site loads correctly

---

### DOM Selector Issues

**Error:**
```
Error: Element not found. Tried selectors: ...
```

**Causes:**
- XHS changed their DOM structure
- Page not fully loaded
- Element rendered dynamically (late)

**Solutions:**

1. **Wait Longer for Page Load**
   ```typescript
   await waitForPageReady(session, 40000); // Increase timeout
   ```

2. **Inspect XHS Page Structure**
   - Open Chrome DevTools (F12)
   - Inspect element
   - Find actual selectors
   - Update XHS_SELECTORS in xhs-article.ts

3. **Check for Dynamic Rendering**
   ```javascript
   // Wait for specific element to appear
   await evaluate(session, `
     new Promise((resolve) => {
       const check = () => {
         if (document.querySelector('.editor-content')) {
           resolve();
         } else {
           setTimeout(check, 100);
         }
       };
       check();
     })
   `);
   ```

---

### CDP Connection Timeout

**Error:**
```
Error: CDP connection timeout.
Error: Chrome debug port not ready.
```

**Causes:**
- Chrome failed to launch
- Port already in use
- Firewall blocking connection

**Solutions:**

1. **Check Chrome Launch**
   ```bash
   # Try launching Chrome manually
   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
     --remote-debugging-port=9222 \
     --user-data-dir=/tmp/test-profile
   ```

2. **Verify Port Availability**
   ```bash
   lsof -i :9222
   netstat -an | grep 9222
   ```

3. **Check Firewall Settings**
   - macOS: System Preferences > Security & Privacy > Firewall
   - Linux: `sudo ufw status`

4. **Increase Timeout**
   ```typescript
   const wsUrl = await waitForChromeDebugPort(port, 60_000); // 60s timeout
   ```

---

### Login Session Persistence

**Issue:** Login session not saved between runs

**Solutions:**

1. **Verify Profile Directory**
   ```bash
   ls -la ~/.local/share/xhs-browser-profile/
   ```
   - Should contain Cookies, Local Storage, etc.
   - If empty, Chrome may not be saving correctly

2. **Check Profile Path**
   ```typescript
   const profileDir = options.profileDir ?? "~/.local/share/xhs-browser-profile";
   console.log(`Using profile: ${profileDir}`);
   ```

3. **Ensure Proper Chrome Shutdown**
   - Let Chrome close fully after script completes
   - Don't force-kill Chrome while script is running

4. **Re-login Manually**
   - Clear profile directory
   - Run script again
   - Complete manual login process

---

### Article Save Failure

**Error:**
```
Error: Button click failed, trying keyboard shortcut...
```

**Issue:** Publish/draft button click failed

**Solutions:**

1. **Wait for Button to Be Ready**
   ```typescript
   await sleep(5000); // Wait 5 seconds before clicking
   ```

2. **Try Manual Click**
   - Leave Chrome open after script runs
   - Manually click publish/draft button
   - Verify it works

3. **Use Keyboard Shortcut**
   - Script automatically tries Ctrl/Cmd + S
   - Can manually press these keys if script fails

4. **Check for Validation Errors**
   - Look for error messages in the browser
   - Verify all required fields are filled
   - Check for character limits

---

### Content Parsing Errors

**Error:**
```
Error: Title is required. Add "title: Your Title" to frontmatter...
```

**Solutions:**

1. **Verify Markdown Frontmatter**
   ```markdown
   ---
   title: Your Article Title
   category: 科技
   tags: [tag1, tag2]
   ---

   # Article Content

   Your content here...
   ```

2. **Use --title Flag**
   ```bash
   npx -y bun xhs-article.ts --title "My Title" --content "My content"
   ```

3. **Check for UTF-8 Encoding**
   ```bash
   file -I article.md
   # Should output: charset=utf-8
   ```

---

### Character Encoding Issues

**Issue:** Chinese characters appearing as garbled text

**Solutions:**

1. **Ensure UTF-8 Encoding**
   ```bash
   # Convert file to UTF-8
   iconv -f GBK -t UTF-8 input.md > output.md
   ```

2. **Set Locale**
   ```bash
   export LANG=zh_CN.UTF-8
   export LC_ALL=zh_CN.UTF-8
   ```

3. **Verify Terminal Encoding**
   ```bash
   echo $TERM
   locale
   ```

---

### Network Timeout

**Error:**
```
Error: Request failed: 504 Gateway Timeout
```

**Solutions:**

1. **Check Internet Connection**
   ```bash
   ping -c 4 xiaohongshu.com
   ```

2. **Use VPN (if in China)**
   - XHS may be slow or blocked outside China
   - Use VPN to connect to Chinese server

3. **Increase Request Timeout**
   ```bash
   export XHS_REQUEST_TIMEOUT=60000  # 60 seconds
   ```

---

### Memory Issues

**Issue:** Script crashes or becomes unresponsive

**Solutions:**

1. **Increase Node.js Memory**
   ```bash
   node --max-old-space-size=4096 $(which bun) xhs-article.ts --markdown article.md
   ```

2. **Close Unused Tabs**
   - Chrome with many tabs uses more memory
   - Close unused tabs before running script

3. **Restart Chrome**
   - Fully quit Chrome (Cmd+Q on Mac)
   - Run script again

---

### Getting Help

If you encounter issues not covered here:

1. **Enable Debug Logging**
   ```bash
   DEBUG=xhs:* npx -y bun xhs-article.ts --markdown article.md
   ```

2. **Check XHS Platform Status**
   - https://www.xiaohongshu.com
   - Verify site is operational

3. **Report Issue**
   - Include full error message
   - Include debug output
   - Include macOS/Linux/Windows version
   - Include Chrome version

---

## Quick Reference

### Reset Profile
```bash
rm -rf ~/.local/share/xhs-browser-profile
```

### Verify Chrome
```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --version
```

### Test Connection
```bash
curl -I https://www.xiaohongshu.com
```

### Manual Test
1. Open Chrome
2. Navigate to https://www.xiaohongshu.com/publish/publish
3. Log in manually
4. Verify editor loads
