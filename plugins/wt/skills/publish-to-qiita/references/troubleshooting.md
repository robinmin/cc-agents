# Troubleshooting Guide

Common issues and solutions for Qiita publishing automation.

## CLI Method Issues

### Node.js Version Error

**Error**:
```
Error: Node.js version 20 or higher is required
```

**Solutions**:

1. **Check Node.js version**:
   ```bash
   node --version
   # Must be 20.0.0 or higher
   ```

2. **Install Node.js 20+ using nvm**:
   ```bash
   nvm install 20
   nvm use 20
   ```

3. **Use npx with correct Node.js**:
   ```bash
   # Use Node.js 20 directly
   node20 npx qiita <command>
   ```

### Qiita CLI Not Found

**Error**:
```
Error: Command failed: npx qiita
qiita: command not found
```

**Solutions**:

1. **Install Qiita CLI**:
   ```bash
   npm install @qiita/qiita-cli --save-dev
   ```

2. **Use full path**:
   ```bash
   npx @qiita/qiita-cli <command>
   ```

3. **Verify installation**:
   ```bash
   npm list @qiita/qiita-cli
   ```

### Login Error

**Error**:
```
Error: Failed to login
```

**Solutions**:

1. **Verify token scopes**:
   - Go to: https://qiita.com/settings/tokens
   - Ensure `read_qiita` and `write_qiita` are checked

2. **Regenerate token**:
   - Revoke old token
   - Generate new token with correct scopes

3. **Check network connection**:
   ```bash
   curl -I https://qiita.com
   ```

### Init Error

**Error**:
```
Error: qiita.config.json already exists
```

**Solution**:
```bash
# Existing initialization detected
# Use existing config or remove to reinitialize
rm qiita.config.json
npx qiita init
```

## API Method Issues

### Token Not Found

**Error**:
```
Error: Qiita access token not found
```

**Solutions**:

1. **Set environment variable**:
   ```bash
   export QIITA_TOKEN="your_access_token_here"
   ```

2. **Add to config file** (`~/.claude/wt/config.jsonc`):
   ```jsonc
   {
     "publish-to-qiita": {
       "access_token": "your_access_token_here"
     }
   }
   ```

3. **Use --token flag**:
   ```bash
   npx bun qiita-api.ts --markdown article.md --token YOUR_TOKEN
   ```

### 401 Unauthorized

**Error**:
```
Error: API request failed: 401 Unauthorized
```

**Solutions**:

1. **Verify token is valid**:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://qiita.com/api/v2/authenticated_user
   ```

2. **Check token scopes**:
   - Must have `read_qiita` and `write_qiita`

3. **Regenerate token**:
   - Old token may have been revoked
   - Generate new token at https://qiita.com/settings/tokens/new

### 400 Bad Request

**Error**:
```
Error: API request failed: 400 Bad Request
```

**Common Causes**:

1. **Missing required fields**:
   ```json
   {
     "title": "Required",
     "body": "Required",
     "tags": "Required"
   }
   ```

2. **Invalid tag format**:
   ```json
   {
     "tags": [{"name": "JavaScript"}]  // Correct
   }
   ```

3. **Invalid boolean**:
   ```json
   {
     "private": false  // boolean, not string
   }
   ```

### 403 Forbidden

**Error**:
```
Error: API request failed: 403 Forbidden
```

**Cause**: Token lacks required permissions

**Solution**:
- Ensure token has `write_qiita` scope
- Regenerate token with correct scopes

### 429 Too Many Requests

**Error**:
```
Error: API request failed: 429 Too Many Requests
```

**Solution**:
- Wait for rate limit reset
- Check `X-RateLimit-Reset` header in response
- Implement request queuing

## Article Content Issues

### Tags Required Error

**Error**:
```
Error: Tags are required
```

**Solutions**:

1. **Add tags to frontmatter**:
   ```yaml
   ---
   tags:
     - "JavaScript"
     - "React"
   ---
   ```

2. **Use --tags flag**:
   ```bash
   npx bun qiita-article.ts --markdown article.md --tags "javascript,react"
   ```

### Title Required Error

**Error**:
```
Error: Title is required
```

**Solutions**:

1. **Add title to frontmatter**:
   ```yaml
   ---
   title: "Article Title"
   ---
   ```

2. **Use --title flag**:
   ```bash
   npx bun qiita-article.ts --title "Article Title" --content "# Content" --tags "tag"
   ```

### Invalid Tag Format

**Error**:
```
Error: Invalid tag format
```

**Solution**: Use YAML block style:
```yaml
tags:
  - "JavaScript"
  - "React"
```

**Wrong**:
```yaml
tags: ["JavaScript", "React"]  # Flow style (not supported)
```

## Publishing Issues

### Article Not Appearing

**Symptoms**: Article published but not visible on profile

**Solutions**:

1. **Check `private` status**:
   ```yaml
   private: false  # Public articles appear in search
   private: true   # Limited-sharing (direct link only)
   ```

2. **Wait for propagation**:
   - Usually appears within 1-2 minutes
   - Check your Qiita profile directly

3. **Verify correct account**:
   - Ensure you're logged in as correct user
   - Check URL in response

### Force Publish Not Working

**Error**:
```
Error: Failed to force publish
```

**Solutions**:

1. **Article must exist**:
   ```bash
   # Publish first before using --force
   npx qiita publish my-article
   npx qiita publish my-article --force
   ```

2. **Check article ID**:
   ```yaml
   ---
   id: "abc123def456"  # Must exist for updates
   ---
   ```

## Preview Issues

### Preview Server Not Starting

**Error**:
```
Error: Port 8888 is already in use
```

**Solutions**:

1. **Kill process using port**:
   ```bash
   lsof -ti :8888 | xargs kill -9
   ```

2. **Use different port** (if supported):
   ```bash
   # Qiita CLI uses fixed port 8888
   # Kill existing process or use different machine
   ```

### Preview Not Showing Changes

**Solution**:
```bash
# Stop preview server (Ctrl+C)
# Restart preview
npx qiita preview
```

## Configuration Issues

### Config File Not Found

**Error**:
```
Error: qiita.config.json not found
```

**Solution**:
```bash
# Initialize Qiita CLI
npx qiita init
```

### Config Parse Error

**Error**:
```
Error: Failed to parse qiita.config.json
```

**Solutions**:

1. **Validate JSON format**:
   ```bash
   cat qiita.config.json | jq .
   ```

2. **Regenerate config**:
   ```bash
   rm qiita.config.json
   npx qiita init
   ```

## Network Issues

### Connection Timeout

**Error**:
```
Error: fetch failed - Connection timeout
```

**Solutions**:

1. **Check network connection**:
   ```bash
   ping qiita.com
   ```

2. **Check proxy settings**:
   ```bash
   export https_proxy=http://proxy.example.com:8080
   export http_proxy=http://proxy.example.com:8080
   ```

3. **Verify DNS resolution**:
   ```bash
   nslookup qiita.com
   ```

### SSL/TLS Errors

**Error**:
```
Error: certificate has expired
```

**Solutions**:

1. **Update system certificates**
2. **Check system time** (incorrect time can cause SSL issues)
3. **Verify Node.js certificate store**

## Debugging

### Enable Verbose Output

```bash
# CLI method
npx qiita publish --verbose

# API method - enable logging
DEBUG=1 npx bun qiita-api.ts --markdown article.md
```

### Check Token

```bash
# Verify token works
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://qiita.com/api/v2/authenticated_user
```

### Test API Request

```bash
# Test minimal payload
curl -X POST https://qiita.com/api/v2/items \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test",
    "body": "# Test",
    "tags": [{"name": "test"}],
    "private": true
  }'
```

### Check Article File

```bash
# Verify frontmatter format
head -20 public/your-article.md

# Validate YAML syntax
# Install yamllint if needed
npm install -g yamllint
yamllint public/your-article.md
```

## Getting Help

### Check Logs

```bash
# CLI logs
npx qiita publish 2>&1 | tee publish.log

# API logs (add logging to script)
```

### Useful Resources

- **Qiita Help**: https://qiita.com
- **Qiita CLI Issues**: https://github.com/increments/qiita-cli/issues
- **API Documentation**: https://qiita.com/api/v2/docs

### Report Issues

When reporting issues, include:
1. Error message
2. Command used
3. Node.js version
4. Token scopes (without including the token itself)
5. Article frontmatter
6. Steps to reproduce

## See Also

- [Qiita CLI Guide](qiita-cli-guide.md)
- [API v2 Guide](api-v2-guide.md)
- [Token Setup](token-setup.md)
