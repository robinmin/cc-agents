# Qiita Access Token Setup Guide

Complete guide for generating and managing Qiita access tokens for API and CLI usage.

## Overview

Qiita uses access tokens to authenticate API requests and CLI operations. This guide covers token generation, management, and security best practices.

## Generate Access Token

### Step 1: Navigate to Token Settings

1. Go to: https://qiita.com/settings/tokens/new
2. You must be logged in to your Qiita account

### Step 2: Configure Token Scopes

Check the boxes for required permissions:

| Scope | Description | Required For |
|-------|-------------|---------------|
| `read_qiita` (読み取り) | Read access to your data | CLI, API read operations |
| `write_qiita` (書き込み) | Write access to publish articles | CLI, API write operations |

**For publishing articles, you need both scopes checked.**

### Step 3: Generate Token

1. Click "発行する" (Generate/Issue)
2. Copy the generated token
3. **Important**: Store this token securely - you won't be able to see it again!

## Token Storage

### Environment Variable (Recommended)

```bash
# Set token in current shell
export QIITA_TOKEN="your_access_token_here"

# Add to shell profile (~/.bashrc, ~/.zshrc)
echo 'export QIITA_TOKEN="your_access_token_here"' >> ~/.bashrc
source ~/.bashrc
```

### WT Plugin Configuration

Add to `~/.claude/wt/config.jsonc`:

```jsonc
{
  "publish-to-qiita": {
    "access_token": "your_access_token_here"
  }
}
```

### CLI Login

For Qiita CLI:

```bash
npx qiita login

# Paste token when prompted
```

Token is stored in: `$XDG_CONFIG_HOME/qiita-cli` or `$HOME/.config/qiita-cli`

## Token Security

### Best Practices

1. **Never commit tokens to version control**
   - Add `qiita.config.json` to `.gitignore`
   - Never include token in public repositories

2. **Use environment variables in production**
   ```bash
   export QIITA_TOKEN="your_token"
   ```

3. **Rotate tokens periodically**
   - Generate new tokens
   - Delete old tokens
   - Update your applications

4. **Limit token scopes**
   - Only grant necessary permissions
   - Use separate tokens for different applications

5. **Monitor token usage**
   - Review active tokens periodically
   - Revoke unused tokens

### Git Ignore

Add to `.gitignore`:

```gitignore
# Qiita CLI config (contains token)
qiita.config.json
```

## Token Management

### View Active Tokens

1. Go to: https://qiita.com/settings/tokens
2. See all active tokens with:
   - Token description (if set)
   - Scopes granted
   - Last used date
   - Revoke option

### Revoke Token

1. Go to: https://qiita.com/settings/tokens
2. Find the token to revoke
3. Click "削除する" (Delete)

### Update Token Description

When generating a token, you can add a description to identify its use:

```
Token Description: My Publishing Script - Production
```

## Troubleshooting

### Token Not Working

**Symptoms**: 401 Unauthorized errors

**Solutions**:

1. **Verify token is correct**
   - Regenerate token
   - Copy without extra spaces
   - Check for trailing/leading whitespace

2. **Check token scopes**
   - Ensure `read_qiita` and `write_qiita` are checked
   - Generate new token with correct scopes

3. **Check token expiration**
   - Qiita tokens don't expire automatically
   - But they may be revoked manually

### Token in CI/CD

#### GitHub Actions

```yaml
name: Publish to Qiita
on: [push]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Publish article
        env:
          QIITA_TOKEN: ${{ secrets.QIITA_TOKEN }}
        run: npx qiita publish
```

**Setup**:
1. Go to repository Settings
2. Secrets and variables → Actions
3. New repository secret
4. Name: `QIITA_TOKEN`
5. Paste token value
6. Add secret

#### Other CI Systems

**GitLab CI**:
```yaml
publish:
  script:
    - export QIITA_TOKEN="$QIITA_TOKEN"
    - npx qiita publish
  variables:
    QIITA_TOKEN: "${QIITA_TOKEN}"
```

**CircleCI**:
```yaml
version: 2.1
jobs:
  publish:
    docker:
      - image: node:20
    environment:
      QIITA_TOKEN: $QIITA_TOKEN
    steps:
      - run: npx qiita publish
```

## Token Scopes Explained

### read_qiita (読み取り)

Allows reading:
- Your user information
- Your articles
- Your stocks
- Your organizations

Required for:
- CLI preview
- CLI pull operations
- API GET requests

### write_qiita (書き込み)

Allows writing:
- Create new articles
- Update existing articles
- Delete articles
- Update user profile

Required for:
- CLI publish operations
- API POST/PATCH/DELETE requests

## Advanced Usage

### Multiple Tokens

Use different tokens for different purposes:

```bash
# Development token
export QIITA_TOKEN_DEV="dev_token_here"

# Production token
export QIITA_TOKEN_PROD="prod_token_here"
```

### Token Description Format

When generating a token, use descriptive names:

```
Development - Local Machine
Production - CI/CD Pipeline
Testing - Automated Tests
```

## Token Refresh

Qiita tokens don't expire automatically, but you should:

1. **Review quarterly** - Check active tokens and revoke unused
2. **Rotate annually** - Generate new tokens and update applications
3. **After security incident** - Immediately rotate all tokens

## See Also

- [Qiita CLI Guide](qiita-cli-guide.md)
- [API v2 Guide](api-v2-guide.md)
- [Troubleshooting Guide](troubleshooting.md)
- [Qiita Settings](https://qiita.com/settings)
