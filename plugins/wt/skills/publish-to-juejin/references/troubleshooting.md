# Troubleshooting: publish-to-juejin

## Common Issues and Solutions

### Chrome Not Found

**Symptom**:
```
Error: Chrome not found. Set JUEJIN_BROWSER_CHROME_PATH env var.
```

**Solutions**:

1. **Install Chrome**:
   ```bash
   # macOS
   brew install --cask google-chrome

   # Ubuntu/Debian
   wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
   sudo dpkg -i google-chrome-stable_current_amd64.deb

   # Windows
   # Download from https://chrome.google.com/
   ```

2. **Set environment variable**:
   ```bash
   export JUEJIN_BROWSER_CHROME_PATH="/path/to/chrome"
   ```

3. **Use alternative browser**:
   - Chromium: `/usr/bin/chromium`
   - Microsoft Edge: `/Applications/Microsoft Edge.app` (macOS)

---

### Page Navigation Errors

**Symptom**:
```
Error: Page not found: juejin.cn
```

**Causes**:
- Network connectivity issues
- Juejin site is down
- DNS resolution problems

**Solutions**:

1. **Check network connectivity**:
   ```bash
   ping juejin.cn
   ```

2. **Try accessing manually**:
   - Open https://juejin.cn in regular browser
   - Verify site is accessible

3. **Check DNS**:
   ```bash
   nslookup juejin.cn
   ```

---

### DOM Selector Issues

**Symptom**:
```
Error: Element not found. Tried selectors: ...
```

**Causes**:
- Page structure changed
- Element not loaded yet
- Incorrect selector

**Solutions**:

1. **Increase timeout**:
   ```typescript
   const selector = await findElement(session, SELECTORS, 10000); // 10 seconds
   ```

2. **Add debug logging**:
   ```typescript
   console.log('[debug] Page HTML:', await evaluate(session, 'document.body.innerHTML'));
   ```

3. **Update selectors**:
   - Manually inspect page in Chrome DevTools
   - Add new selectors to `JUEJIN_SELECTORS`

---

### CDP Connection Timeout

**Symptom**:
```
Error: CDP connection timeout.
```

**Causes**:
- Chrome failed to launch
- Port already in use
- Debug port not ready

**Solutions**:

1. **Check for existing Chrome processes**:
   ```bash
   ps aux | grep chrome
   pkill -9 chrome  # Kill existing processes
   ```

2. **Use different port** (automatic):
   - Script automatically allocates free port

3. **Check profile directory permissions**:
   ```bash
   ls -la ~/.local/share/juejin-browser-profile
   chmod -R 755 ~/.local/share/juejin-browser-profile
   ```

---

### Login Session Persistence

**Symptom**:
```
[juejin] Not logged in. Please log in to your Juejin account.
[juejin] Still waiting for login...
```

**Causes**:
- First run (no saved session)
- Session expired
- Profile directory was deleted

**Solutions**:

1. **First time setup**:
   - Wait for Chrome to open
   - Enter phone number
   - Get SMS verification code
   - Complete login
   - Script will continue automatically

2. **Check if session was saved**:
   ```bash
   ls ~/.local/share/juejin-browser-profile/Default/Cookies
   ```

3. **Re-login**:
   - Delete profile directory: `rm -rf ~/.local/share/juejin-browser-profile`
   - Run script again
   - Login manually

---

### Element Not Found After Login

**Symptom**:
```
[juejin] Already logged in.
[juejin] Filling in title...
Error: Element not found. Tried selectors: input[placeholder*="请输入标题" i], ...
```

**Causes**:
- Editor page not fully loaded
- Redirected to different page
- DOM structure changed

**Solutions**:

1. **Wait longer for page load**:
   ```typescript
   await sleep(5000); // Wait 5 seconds
   ```

2. **Check current URL**:
   ```typescript
   const url = await evaluate<string>(session, 'window.location.href');
   console.log('Current URL:', url);
   ```

3. **Try manual navigation**:
   ```typescript
   await evaluate(session, 'window.location.href = "https://juejin.cn/post/create"');
   await sleep(3000);
   ```

---

### Article Content Not Inserting

**Symptom**:
```
[juejin] Filling in content...
[juejin] Content editor not found
```

**Causes**:
- Editor uses different selectors
- Editor not initialized yet
- Need to click editor first

**Solutions**:

1. **Click editor first**:
   ```typescript
   await clickElement(session, '.editor-trigger');
   await sleep(1000);
   ```

2. **Try alternative selector**:
   - Inspect editor in DevTools
   - Find actual selector used

3. **Use paste method**:
   ```typescript
   await evaluate(session, 'navigator.clipboard.writeText(' + JSON.stringify(content) + ')');
   await pasteFromClipboard(session);
   ```

---

### SMS Verification Not Arriving

**Symptom**:
```
[juejin] Still waiting for login...
[Timed out waiting for SMS code]
```

**Causes**:
- Network issues
- SMS provider delay
- Rate limiting

**Solutions**:

1. **Wait longer**:
   - Modify timeout in code: `const loginTimeoutMs = 600_000;` // 10 minutes

2. **Check phone number**:
   - Ensure correct format
   - Try without country code

3. **Use different login method**:
   - Juejin may support OAuth login (GitHub, etc.)

---

### Script Hangs After Submission

**Symptom**:
```
[juejin] Submitting...
[Hangs indefinitely]
```

**Causes**:
- Page navigation in progress
- Waiting for confirmation dialog
- Network delay

**Solutions**:

1. **Add explicit wait**:
   ```typescript
   await sleep(5000); // Wait for navigation
   ```

2. **Check for success indicators**:
   ```typescript
   const successMessage = await evaluate(session, 'document.body.innerText');
   if (successMessage.includes('发布成功')) {
     return articleUrl;
   }
   ```

3. **Force timeout**:
   - Script will eventually timeout and close Chrome

---

## Debug Mode

Enable verbose logging:

```typescript
// Add to script
const DEBUG = process.env.DEBUG === 'true';

if (DEBUG) {
  console.log('[debug] Current state:', { article, asDraft, profileDir });
  console.log('[debug] Page HTML snapshot:', await evaluate(session, 'document.documentElement.outerHTML'));
}
```

Run with debug:
```bash
DEBUG=1 npx -y bun juejin-article.ts --markdown article.md
```

---

## Getting Help

If issues persist:

1. **Check GitHub Issues**:
   - [juejin-api issues](https://github.com/chenzijia12300/juejin-api/issues)
   - [blog-auto-publishing-tools issues](https://github.com/Menci/blog-auto-publishing-tools/issues)

2. **Inspect manually**:
   - Open Chrome DevTools (F12)
   - Go to Network tab
   - Try publishing manually
   - Observe API calls and DOM structure

3. **Update selectors**:
   - If Juejin changed their UI
   - Update `JUEJIN_SELECTORS` in code
   - Consider contributing back to skill
