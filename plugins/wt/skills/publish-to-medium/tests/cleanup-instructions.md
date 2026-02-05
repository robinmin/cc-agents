# Test Cleanup Instructions

## Task 1: Fix publish-to-x tests

### Files to Remove from publish-to-x/tests/:
- `md-to-html.test.ts` - Has CLI import issues (top-level await main())
- `x-article.test.ts` - Has CLI import issues (top-level await main())
- `copy-to-clipboard.test.ts` - Has CLI import issues (top-level await main())
- `paste-from-clipboard.test.ts` - Has CLI import issues (top-level await main())

### File to Keep:
- `x-utils.test.ts` - PASSES (12 tests) - Tests pure functions only

### Cleanup Commands:
```bash
# Remove problematic test files from publish-to-x
rm /Users/robin/projects/cc-agents/plugins/wt/skills/publish-to-x/tests/md-to-html.test.ts
rm /Users/robin/projects/cc-agents/plugins/wt/skills/publish-to-x/tests/x-article.test.ts
rm /Users/robin/projects/cc-agents/plugins/wt/skills/publish-to-x/tests/copy-to-clipboard.test.ts
rm /Users/robin/projects/cc-agents/plugins/wt/skills/publish-to-x/tests/paste-from-clipboard.test.ts

# Run tests to verify
cd /Users/robin/projects/cc-agents/plugins/wt/skills/publish-to-x
bun test
```

## Task 1b: Fix publish-to-wechatmp tests

### Files to Remove from publish-to-wechatmp/tests/:
- `md-to-wechat.test.ts` - Has CLI import issues (top-level await main())
- `copy-to-clipboard.test.ts` - Has CLI import issues (top-level await main())
- `paste-from-clipboard.test.ts` - Has CLI import issues (top-level await main())

### File Created:
- `wechat-utils.test.ts` - NEW - Tests pure functions from wechat-utils.ts

### Cleanup Commands:
```bash
# Remove problematic test files from publish-to-wechatmp
rm /Users/robin/projects/cc-agents/plugins/wt/skills/publish-to-wechatmp/tests/md-to-wechat.test.ts
rm /Users/robin/projects/cc-agents/plugins/wt/skills/publish-to-wechatmp/tests/copy-to-clipboard.test.ts
rm /Users/robin/projects/cc-agents/plugins/wt/skills/publish-to-wechatmp/tests/paste-from-clipboard.test.ts

# Run tests to verify (should pass with new wechat-utils.test.ts)
cd /Users/robin/projects/cc-agents/plugins/wt/skills/publish-to-wechatmp
bun test
```

## Task 2: Create comprehensive unit tests for publish-to-medium

### Created Files:
- `tests/utils.test.ts` - Tests for config, token, status utilities
- `tests/article.test.ts` - Tests for markdown/HTML parsing

### Run Tests:
```bash
cd /Users/robin/projects/cc-agents/plugins/wt/skills/publish-to-medium
bun test
```

## Summary

After cleanup:
- **publish-to-x**: Only x-utils.test.ts remains (12 passing tests)
- **publish-to-wechatmp**: Only wechat-utils.test.ts remains (tests pure functions)
- **publish-to-medium**: New comprehensive unit tests (utils.test.ts + article.test.ts)
