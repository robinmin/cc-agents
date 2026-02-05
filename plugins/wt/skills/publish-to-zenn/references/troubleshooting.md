# Troubleshooting Guide

Common issues and solutions for Zenn publishing automation.

## CLI Method Issues

### Zenn CLI Not Found

**Error**:
```
Error: Command failed: npx zenn init
zenn: command not found
```

**Solutions**:

1. **Install Zenn CLI**:
   ```bash
   npm install zenn-cli
   ```

2. **Use npx with -y flag**:
   ```bash
   npx -y zenn init
   ```

3. **Install globally**:
   ```bash
   npm install -g zenn-cli
   ```

### Git Repository Not Configured

**Error**:
```
Error: GitHub repository path not specified.
```

**Solutions**:

1. **Add to config** (`~/.claude/wt/config.jsonc`):
   ```jsonc
   {
     "publish-to-zenn": {
       "github_repo": "~/repos/zenn-articles"
     }
   }
   ```

2. **Use `--repo` flag**:
   ```bash
   npx bun zenn-article.ts --markdown article.md --repo ~/repos/zenn-articles
   ```

### Invalid Slug Format

**Error**:
```
Error: Invalid slug: "my-slug". Must be lowercase letters, numbers, hyphens, underscores only (min 12 chars)
```

**Solutions**:

1. **Use longer title**:
   ```yaml
   ---
   title: "A Very Comprehensive Guide to React Hooks for Beginners" # Will generate longer slug
   ---
   ```

2. **Specify custom slug**:
   ```bash
   npx bun zenn-article.ts --markdown article.md --slug my-custom-very-long-slug
   ```

3. **Add to frontmatter**:
   ```yaml
   ---
   slug: "my-custom-very-long-slug-that-meets-requirements"
   ---
   ```

### Article Not Deploying After Push

**Symptoms**: Article pushed to GitHub but not appearing on Zenn

**Solutions**:

1. **Check `published` status**:
   ```bash
   grep "published:" articles/your-article.md
   ```
   Should be `published: true` for public articles.

2. **Check GitHub connection**:
   - Go to https://zenn.dev/settings/github
   - Verify repository is connected
   - Check for error messages

3. **Wait longer**:
   - Initial deployment: 2-3 minutes
   - Updates: 1-2 minutes

4. **Check article file location**:
   - Must be in `articles/` directory
   - Must have `.md` extension

### Permission Denied Errors

**Error**:
```
Error: EACCES: permission denied
```

**Solutions**:

1. **Check file permissions**:
   ```bash
   ls -la articles/
   ```

2. **Fix permissions**:
   ```bash
   chmod 644 articles/*.md
   ```

3. **Check directory ownership**:
   ```bash
   ls -ld ~/repos/zenn-articles
   ```

### NPM Install Fails

**Error**:
```
Error: npm install failed
```

**Solutions**:

1. **Check Node.js version** (requires 14+):
   ```bash
   node --version
   ```

2. **Clear npm cache**:
   ```bash
   npm cache clean --force
   ```

3. **Use alternative package manager**:
   ```bash
   bun install zenn-cli
   ```

## Browser Automation Issues

### Chrome Not Found

**Error**:
```
Error: Chrome not found. Set ZENN_BROWSER_CHROME_PATH env var.
```

**Solutions**:

1. **Install Chrome**:
   - macOS: Download from https://www.google.com/chrome/
   - Linux: `sudo apt-get install google-chrome-stable`
   - Windows: Download from https://www.google.com/chrome/

2. **Set custom path**:
   ```bash
   export ZENN_BROWSER_CHROME_PATH="/path/to/chrome"
   ```

3. **Use Chromium** (Linux):
   ```bash
   sudo apt-get install chromium-browser
   ```

### Login Timeout

**Error**:
```
Error: Login timeout. Please run the script again after logging in.
```

**Solutions**:

1. **Reset browser profile**:
   ```bash
   rm -rf ~/.local/share/zenn-browser-profile
   ```

2. **Increase timeout** (edit script):
   ```typescript
   const loginTimeoutMs = 600_000; // 10 minutes
   ```

3. **Manual login process**:
   - Wait for Chrome to open
   - Complete login manually
   - Wait for script to detect login

### Elements Not Found

**Error**:
```
Error: Element not found. Tried selectors: input[placeholder*="title"], ...
```

**Solutions**:

1. **Zenn DOM may have changed** - update selectors in `zenn-browser.ts`:
   ```typescript
   const ZENN_SELECTORS = {
     titleInput: [
       // Add new selectors here
       'new-selector-here',
       // ... existing selectors
     ],
   };
   ```

2. **Use browser DevTools to find current selectors**:
   - Open Zenn article editor
   - Inspect element
   - Copy selector

3. **Report the issue** for selector update

### Content Not Inserting

**Symptoms**: Script runs but article content is empty

**Solutions**:

1. **Check editor detection**:
   ```typescript
   // Ensure editor API is detected
   if (window.editor && window.editor.setValue) {
     window.editor.setValue(textContent);
   }
   ```

2. **Increase wait time**:
   ```typescript
   await sleep(2000); // Wait longer for editor to load
   ```

3. **Check content encoding**:
   ```typescript
   // Ensure proper escaping
   el.textContent = ${sanitizeForJavaScript(content)};
   ```

## Session Management

### Session Expired

**Symptoms**: Previously logged in, but now asked to log in again

**Solutions**:

1. **Reset profile**:
   ```bash
   rm -rf ~/.local/share/zenn-browser-profile
   ```

2. **Clear cookies manually**:
   - Open Chrome with profile
   - Clear cookies for zenn.dev
   - Log in again

### Multiple Chrome Instances

**Error**:
```
Error: Chrome debug port not ready
```

**Solutions**:

1. **Close all Chrome instances**:
   ```bash
   pkill Chrome
   pkill chrome
   ```

2. **Use different profile directory**:
   ```bash
   npx bun zenn-browser.ts --profile ~/.custom-profile
   ```

3. **Check for conflicting processes**:
   ```bash
   lsof -i :9222  # Check default debug port
   ```

## GitHub Integration Issues

### Repository Not Connected

**Symptoms**: GitHub repository not listed in Zenn settings

**Solutions**:

1. **Reconnect repository**:
   - Go to https://zenn.dev/settings/github
   - Disconnect and reconnect repository
   - Re-authorize Zenn

2. **Check repository permissions**:
   - Repository must be public or private with Zenn access
   - Your GitHub account must have write access

3. **Check GitHub personal access token**:
   - Go to https://github.com/settings/tokens
   - Verify Zenn token has necessary permissions

### Push Fails

**Error**:
```
Error: git push failed
```

**Solutions**:

1. **Check remote URL**:
   ```bash
   git remote -v
   ```

2. **Check authentication**:
   ```bash
   git config --global credential.helper
   ```

3. **Verify branch name**:
   ```bash
   git branch
   # Should be 'main' or configured deploy branch
   ```

## Article Content Issues

### Special Characters Not Displaying

**Symptoms**: Unicode or special characters appear as `?` or boxes

**Solutions**:

1. **Ensure UTF-8 encoding**:
   ```bash
   file -I articles/your-article.md
   ```

2. **Save with correct encoding**:
   ```bash
   vim -c "set fileencoding=utf-8" articles/your-article.md
   ```

### Code Blocks Not Rendering

**Symptoms**: Markdown code blocks not displaying correctly

**Solutions**:

1. **Check fence syntax**:
   ````markdown
   ```javascript
   const x = 1;
   ```
   ````

2. **Ensure proper indentation**:
   ```markdown
   - Item 1
     - Nested item
   ```

3. **Test in local preview**:
   ```bash
   npx zenn preview
   ```

## Configuration Issues

### Config File Not Found

**Error**:
```
[zenn] Failed to read WT config, using defaults
```

**Solutions**:

1. **Create config directory**:
   ```bash
   mkdir -p ~/.claude/wt
   ```

2. **Create config file** (`~/.claude/wt/config.jsonc`):
   ```jsonc
   {
     "publish-to-zenn": {
       "method": "cli",
       "github_repo": "~/repos/zenn-articles",
       "auto_publish": false
     }
   }
   ```

### Profile Directory Issues

**Error**:
```
Error: EACCES: permission denied, mkdir '~/.local/share/zenn-browser-profile'
```

**Solutions**:

1. **Create directory manually**:
   ```bash
   mkdir -p ~/.local/share/zenn-browser-profile
   ```

2. **Set custom profile**:
   ```bash
   npx bun zenn-browser.ts --profile ~/custom-profile
   ```

## Performance Issues

### Slow Article Creation

**Symptoms**: Script takes too long to complete

**Solutions**:

1. **Use CLI method instead** (faster):
   ```bash
   # CLI method: ~5 seconds
   npx bun zenn-article.ts --markdown article.md

   # Browser method: ~30 seconds
   npx bun zenn-browser.ts --markdown article.md
   ```

2. **Reduce wait times** (edit script):
   ```typescript
   await sleep(200);  // Reduce from 500
   ```

3. **Use auto-commit**:
   ```jsonc
   {
     "publish-to-zenn": {
       "auto_publish": true
     }
   }
   ```

### Memory Issues

**Symptoms**: Chrome using too much memory

**Solutions**:

1. **Close unnecessary tabs** in profile
2. **Reset profile** periodically:
   ```bash
   rm -rf ~/.local/share/zenn-browser-profile
   ```
3. **Use CLI method** (no browser overhead)

## Debugging

### Enable Verbose Output

```bash
# Bash
DEBUG=1 npx bun zenn-article.ts --markdown article.md

# Or enable console.log in script
```

### Check Article Files

```bash
# List all articles
ls -la articles/

# Check article metadata
head -20 articles/your-article.md

# Validate frontmatter
grep -A 10 "^---" articles/your-article.md
```

### Test Git Integration

```bash
# Test git connection
git remote -v
git branch
git status

# Test push (dry run)
git push --dry-run
```

### Test Browser Connection

```bash
# Launch Chrome manually
chrome --remote-debugging-port=9222 --user-data-dir=/tmp/test-profile

# Check debug port
curl http://127.0.0.1:9222/json/version
```

## Getting Help

### Check Logs

```bash
# Script output
npx bun zenn-article.ts --markdown article.md 2>&1 | tee script.log

# Git logs
cd ~/repos/zenn-articles
git log --oneline -10

# NPM logs
npm list zenn-cli
```

### Useful Resources

- **Zenn Help**: https://zenn.dev/zenn/articles/install-zenn-cli
- **GitHub Issues**: https://github.com/zenn-dev/zenn-editor/issues
- **CDP Docs**: https://chromedevtools.github.io/devtools-protocol/

### Report Issues

When reporting issues, include:
1. Error message
2. Command used
3. OS and Node.js version
4. Relevant log output
5. Steps to reproduce

## See Also

- [Zenn CLI Guide](zenn-cli-guide.md)
- [GitHub Integration](github-integration.md)
- [Browser Automation](zenn-browser.md)
