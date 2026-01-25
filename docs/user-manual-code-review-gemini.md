# Code Review Gemini - User Manual

**Version:** 1.0
**Last Updated:** 2026-01-22
**For:** Claude Code Users

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Quick Start Guide](#quick-start-guide)
3. [Commands](#commands)
4. [Common Use Cases](#common-use-cases)
5. [Tips & Best Practices](#tips--best-practices)
6. [Troubleshooting](#troubleshooting)
7. [FAQ](#faq)

---

## Getting Started

### What is Code Review Gemini?

Code Review Gemini is a Claude Code skill that lets you get a **second opinion** from Google's Gemini AI on your code. Think of it as having a senior developer review your work before you commit it.

**What it can do:**

- 🔍 **Review your code** for bugs, security issues, and performance problems
- 🏗️ **Plan architecture** for new features before you start coding
- 💡 **Answer technical questions** about design patterns and best practices
- ✅ **Create task files** from review results for tracking fixes

**What it cannot do:**

- ❌ Write or implement code for you (it only reviews and advises)
- ❌ Modify your files directly (it's read-only and safe)
- ❌ Replace human code review (it's a helpful second opinion)

### Prerequisites

Before you can use Code Review Gemini, you need:

1. **Claude Code** installed and working
2. **Google Gemini CLI** installed

**Installing Gemini CLI:**

```bash
# Option 1: Using npm (recommended)
npm install -g @google/gemini-cli

# Option 2: Using Homebrew (macOS)
brew install gemini-cli

# Verify installation
gemini --version
```

**Quick Check:**

```bash
# In Claude Code, ask:
"Check if Gemini is available"

# Or run directly:
python3 ~/.claude/plugins/cache/cc-agents/rd2/skills/code-review-gemini/scripts/code-review-gemini.py check
```

---

## Quick Start Guide

### Your First Review

**Step 1: Ask Claude to review your code**

```
You: "Have Gemini review my authentication code in src/auth/ for security issues"
```

**Step 2: Claude will:**

- Activate the Gemini skill automatically
- Send your code to Gemini for analysis
- Present the results to you with findings organized by priority

**Step 3: Review the results**

You'll get a structured report with:

- **Critical Issues** - Must fix before deploying
- **High Priority Issues** - Should fix soon
- **Medium Priority Issues** - Consider fixing
- **Low Priority Issues** - Nice to have

**Step 4: (Optional) Convert issues to tasks**

```
You: "Import the critical issues as task files"
```

This creates individual task files in `docs/prompts/` that you can track.

### Example Interaction

```
You: "Use Gemini to review src/utils.py for code quality"

Claude: I'll use the code-review-gemini skill to review src/utils.py.

[Claude runs Gemini review]

Claude: Gemini has completed the review. Here are the findings:

**Critical Issues (0)**
None found.

**High Priority Issues (2)**
- Line 45: Function `process_data` lacks error handling for empty input
- Line 78: Using deprecated `os.popen()` instead of `subprocess.run()`

**Medium Priority Issues (3)**
- Missing type hints on several functions
- Inconsistent naming conventions (camelCase vs snake_case)
- No docstrings for public functions

**Overall Quality Score: 7/10**
Recommendation: Request Changes

The review has been saved to docs/plans/review-utils-py.md
```

---

## Commands

### 1. Check - Verify Setup

**When to use:** First time setup, troubleshooting

**How to ask Claude:**

- "Check if Gemini is available"
- "Verify Gemini setup"
- "Is Gemini working?"

**What it does:**

- Checks if Gemini CLI is installed
- Verifies it's working correctly
- Shows version information

**Example:**

```
You: "Check if Gemini is available"

Claude: ✓ Gemini CLI is available
Version: 0.2.5
Ready to use!
```

---

### 2. Run - Quick Questions

**When to use:** Quick technical consultations, architecture questions

**How to ask Claude:**

- "Ask Gemini: [your question]"
- "Get Gemini's opinion on [topic]"
- "Gemini, what's the difference between [A] and [B]?"

**What it does:**

- Sends your question to Gemini
- Gets back a focused answer
- Great for design decisions

**Examples:**

```
You: "Ask Gemini: Should I use Redis or Memcached for session caching?"

Claude: [Sends question to Gemini and presents answer]
```

```
You: "Get Gemini's opinion on microservices vs monolith for a 10-person team"

Claude: [Gets comprehensive comparison from Gemini]
```

---

### 3. Review - Code Analysis

**When to use:** Before commits, pre-release checks, security audits

**How to ask Claude:**

- "Have Gemini review [path/to/code]"
- "Gemini code review on [directory]"
- "Review [file] for [security/performance/quality]"

**What it does:**

- Analyzes your code files
- Looks for bugs, security issues, performance problems
- Provides structured feedback with severity ratings
- Saves detailed report to `docs/plans/`

**Focus Areas:**

You can ask Gemini to focus on specific aspects:

| Focus Area       | What It Checks                                            |
| ---------------- | --------------------------------------------------------- |
| **security**     | Vulnerabilities, SQL injection, XSS, authentication flaws |
| **performance**  | Slow algorithms, memory leaks, N+1 queries                |
| **testing**      | Missing tests, edge cases, coverage gaps                  |
| **quality**      | Readability, maintainability, code smells                 |
| **architecture** | Design patterns, coupling, cohesion                       |

**Examples:**

```
You: "Have Gemini review src/auth/ for security issues"

Claude: [Reviews authentication code with security focus]
Result saved to: docs/plans/review-auth-security.md
```

```
You: "Gemini review src/api/ focusing on performance and testing"

Claude: [Analyzes API code for performance and test coverage]
```

```
You: "Review my entire codebase with Gemini"

Claude: [Comprehensive review of all code files]
Warning: This may take 10-15 minutes for large codebases
```

---

### 4. Planning Mode

**When to use:** Before implementing new features, refactoring planning

**How to ask Claude:**

- "Ask Gemini to plan how to implement [feature]"
- "Get an implementation plan for [task]"
- "Gemini, how should I architect [component]?"

**What it does:**

- Analyzes your existing code structure
- Suggests implementation steps
- Highlights architectural decisions
- Provides trade-offs for different approaches
- **Does NOT write code** - only plans and advises

**Examples:**

```
You: "Ask Gemini to plan how to add user authentication to this app"

Claude: [Gemini analyzes codebase and provides implementation plan]

Plan includes:
1. Files to create/modify
2. Implementation sequence with dependencies
3. Trade-offs (JWT vs sessions, OAuth providers)
4. Risks and blockers
5. Testing strategy
```

```
You: "Get an implementation plan for adding real-time notifications"

Claude: [Detailed architecture plan for WebSocket integration]
```

---

### 5. Import - Create Task Files

**When to use:** After getting review results, to track fixes

**How to ask Claude:**

- "Import the critical issues from the review as tasks"
- "Create task files for the high priority issues"
- "Convert review results to tasks"

**What it does:**

- Reads a Gemini review file
- Extracts individual issues
- Creates separate task files in `docs/prompts/`
- Updates each task with:
  - Issue description and location
  - Impact and severity
  - Recommended fix
  - Review context

**Priority Filtering:**

You can import only certain priority levels:

- **critical** - Blocking issues, must fix ASAP
- **high** - Important, should fix soon
- **medium** - Consider fixing
- **low** - Nice to have

**Examples:**

```
You: "Import all the issues from the auth review as tasks"

Claude: [Creates task files for all issues found]
Created 8 tasks:
- CRITICAL-001: SQL Injection vulnerability
- HIGH-001: Missing rate limiting
- HIGH-002: Weak password policy
[... etc ...]
```

```
You: "Import only the critical issues as tasks"

Claude: [Creates tasks only for critical priority]
Created 2 tasks:
- CRITICAL-001: SQL Injection vulnerability
- CRITICAL-002: Authentication bypass
```

---

## Common Use Cases

### Pre-Commit Review

**Scenario:** You've finished a feature and want to check it before committing.

**Workflow:**

```
You: "Review my changes in src/features/ before I commit"

Claude: [Gemini reviews your code]

# If issues found:
You: "Import the critical and high priority issues as tasks"

Claude: [Creates task files]

# Fix issues, then:
You: "Review the code again"

Claude: [Verifies fixes]
All critical issues resolved! ✓
```

---

### Security Audit

**Scenario:** You need to audit authentication/authorization code.

**Workflow:**

```
You: "Have Gemini do a security review of src/auth/ and src/middleware/"

Claude: [Comprehensive security analysis]

# Review findings:
Critical Issues (2):
- SQL injection in login form
- JWT tokens not verified

High Priority (3):
- Missing CSRF protection
- Passwords not salted
- Session timeout too long

# Create tasks for tracking:
You: "Import all security issues as tasks, starting with critical"

Claude: [Creates prioritized task list]
```

---

### Architecture Planning

**Scenario:** You need to add a new feature and want guidance on the approach.

**Workflow:**

```
You: "Ask Gemini to plan how to add payment processing to this e-commerce app"

Claude: [Gemini analyzes codebase and provides plan]

Plan Overview:
1. Choose payment provider (Stripe vs PayPal comparison)
2. Create payment models and database schema
3. Implement payment service layer
4. Add webhook handlers for payment events
5. Update order processing flow
6. Implement refund handling
7. Add payment-related tests

Trade-offs:
- Stripe: Better API, higher fees
- PayPal: More payment methods, more complex

Risks:
- PCI compliance requirements
- Handling payment failures
- Testing with sandbox

# Now you can implement based on the plan!
```

---

### Quick Technical Questions

**Scenario:** You need quick advice on a technical decision.

**Workflow:**

```
You: "Ask Gemini: Should I use GraphQL or REST for my API?"

Claude: [Gemini provides comparison]

# Or:
You: "Gemini, what's the best way to handle background jobs in Python?"

Claude: [Options: Celery, RQ, asyncio comparison]

# Or:
You: "Get Gemini's opinion on state management for React - Redux vs Context?"

Claude: [Trade-offs for your specific use case]
```

---

### Pre-Release Checklist

**Scenario:** Before deploying to production.

**Workflow:**

```
# Step 1: Security review
You: "Gemini review for security issues"
Claude: [Security audit]

# Step 2: Performance review
You: "Gemini review for performance issues"
Claude: [Performance analysis]

# Step 3: Import critical and high issues
You: "Import critical and high priority issues as tasks"
Claude: [Creates task list]

# Step 4: Fix all tasks
You: "Show me the task list"
Claude: [Displays tasks in WIP]

# Step 5: Final check
You: "Review again after fixes"
Claude: [Verification review]
All critical issues resolved! ✓
Ready for deployment.
```

---

## Tips & Best Practices

### 1. Be Specific with Your Requests

**Good:**

```
"Have Gemini review src/auth/ for security vulnerabilities,
specifically SQL injection, XSS, and authentication bypass"
```

**Less Effective:**

```
"Review my code"
```

**Why:** Specific requests get more focused, actionable results.

---

### 2. Use the Right Model

Gemini has different models for different needs:

| Situation                | Ask Claude To Use                                   |
| ------------------------ | --------------------------------------------------- |
| **Default (most cases)** | Nothing - uses gemini-3-flash-preview automatically |
| **Quick question**       | "Use Gemini flash model"                            |
| **Deep analysis**        | "Use Gemini pro model"                              |
| **Complex architecture** | "Use Gemini 3 pro model"                            |

**Example:**

```
You: "Use Gemini pro to review this complex authentication system"
```

---

### 3. Review Small Chunks

**Good Approach:**

```
Day 1: "Review src/auth/"
Day 2: "Review src/api/"
Day 3: "Review src/database/"
```

**Less Effective:**

```
"Review entire codebase" (may timeout or be overwhelming)
```

**Why:** Smaller reviews are faster, more focused, and easier to act on.

---

### 4. Combine Review + Import

**Efficient Workflow:**

```
1. "Review src/auth/ for security"
2. "Import critical issues as tasks"
3. [Fix issues]
4. "Review again to verify fixes"
```

---

### 5. Use Focus Areas

**For Targeted Reviews:**

```
"Review src/api/ focusing on performance and testing"
"Review src/ for security and code quality"
"Review database/ for performance only"
```

---

### 6. Save Important Reviews

Claude automatically saves reviews to `docs/plans/`, but you can specify names:

```
"Review src/auth/ and save as 'pre-release-security-audit'"
```

Later:

```
"Show me the pre-release-security-audit review"
"Import issues from pre-release-security-audit"
```

---

## Troubleshooting

### "Gemini CLI not found"

**Problem:** Gemini CLI is not installed or not in PATH

**Solution:**

```bash
# Install Gemini CLI
npm install -g @google/gemini-cli

# Or with Homebrew
brew install gemini-cli

# Verify
gemini --version

# Then ask Claude:
"Check if Gemini is available"
```

---

### "Review timed out"

**Problem:** Code review took longer than the timeout limit

**Solutions:**

1. **Review smaller chunks:**

   ```
   Instead of: "Review src/"
   Try: "Review src/auth/" then "Review src/api/"
   ```

2. **Use faster model:**

   ```
   "Use Gemini flash model to quickly review src/utils/"
   ```

3. **Increase timeout (if needed):**
   ```
   "Review src/ with a longer timeout"
   ```

---

### "No issues found in review file"

**Problem:** Import command can't find issues in the review

**Check:**

1. Review file exists in `docs/plans/`
2. Review has priority sections (Critical, High, Medium, Low)
3. Sections have actual issues listed

**Solution:**

```
# Ask Claude to show the review first
"Show me the contents of the last review"

# If review is empty or malformed:
"Run the review again"
```

---

### "Task creation failed"

**Problem:** Import command can't create task files

**Check:**

1. `tasks` CLI is installed
2. `docs/prompts/` directory exists
3. You have write permissions

**Solution:**

```bash
# Verify tasks CLI
which tasks

# Create directory if missing
mkdir -p docs/prompts

# Then try import again
```

---

### Review results seem off or incomplete

**Problem:** Gemini's analysis doesn't seem thorough

**Possible Causes & Solutions:**

1. **Code too large:**
   - Break into smaller reviews

2. **Not enough context:**
   - Be more specific: "Review for SQL injection vulnerabilities"

3. **Wrong model for task:**
   - Try: "Use Gemini pro model for deeper analysis"

4. **Files not found:**
   - Verify paths exist: "List files in src/auth/"

---

## FAQ

### Q: Is my code sent to Google?

**A:** Yes, when you use Gemini for review, your code is sent to Google's Gemini API for analysis. The code is processed according to Google's privacy policy. If you have sensitive code, consider:

- Reviewing only non-sensitive portions
- Using Gemini for architecture planning instead of code review
- Asking Claude (not Gemini) to review sensitive code

---

### Q: Can Gemini modify my files?

**A:** No. Gemini runs in `--sandbox` mode, which means:

- ✓ It can read your code
- ✓ It can analyze and suggest improvements
- ✗ It cannot modify your files
- ✗ It cannot execute code
- ✗ It cannot delete anything

Your code is safe.

---

### Q: How long do reviews take?

**A:** Typical times:

| Code Size                   | Timeout | Typical Time  |
| --------------------------- | ------- | ------------- |
| Single file                 | 5 min   | 30-60 seconds |
| Small project (1-3 files)   | 5 min   | 1-2 minutes   |
| Medium project (4-10 files) | 10 min  | 2-5 minutes   |
| Large project (10+ files)   | 15 min  | 5-10 minutes  |

For very large codebases, consider reviewing in chunks.

---

### Q: Which model should I use?

**A:**

**Default (gemini-3-flash-preview):** Use for most reviews

- Fast and capable
- Good balance of speed and quality
- Best for daily code reviews

**Gemini Flash (gemini-2.5-flash):** Use for quick checks

- Fastest option
- Good for single files
- Lower cost

**Gemini Pro (gemini-2.5-pro):** Use for deep analysis

- Most thorough
- Best for security audits
- Best for complex architecture

**Gemini 3 Pro (gemini-3-pro-preview):** Use for cutting-edge

- Latest and most capable
- Best for complex reasoning
- Slower but highest quality

---

### Q: Can I review code in any language?

**A:** Yes! Gemini supports:

- Python, JavaScript, TypeScript, Java, C++, C#, Go, Rust, PHP, Ruby, Swift, Kotlin
- HTML, CSS, SQL
- And many more

Just ask Claude to review your file, regardless of language.

---

### Q: What's the difference between "review" and "planning"?

**A:**

**Review mode (default):**

- Analyzes existing code
- Finds bugs and issues
- Gives feedback on what's already written
- Example: "Review src/auth/ for bugs"

**Planning mode:**

- Helps design new features
- Suggests implementation approach
- Doesn't review existing code
- Example: "Plan how to add authentication"

---

### Q: How do I track fixes from reviews?

**A:** Use the import command:

```
1. Get review: "Review src/auth/ for security"
2. Import issues: "Import critical issues as tasks"
3. Track tasks: "Show my tasks"
4. Mark complete: "Mark task 0001 as done"
```

---

### Q: Can I re-review code after fixes?

**A:** Absolutely! Recommended workflow:

```
1. Initial review: "Review src/auth/"
2. Fix issues
3. Verify fixes: "Review src/auth/ again"
4. Compare: "Did the security issues get fixed?"
```

---

### Q: How much does this cost?

**A:**

- **Gemini CLI:** Free tier available, with paid plans for heavy usage
- **Claude Code:** Subscription-based (check anthropic.com)
- **This skill:** Free (part of Claude Code)

Check [Google AI pricing](https://ai.google.dev/pricing) for Gemini costs.

---

### Q: Can I use this offline?

**A:** No, both Claude and Gemini require internet connections:

- Claude needs to communicate with Anthropic's servers
- Gemini needs to communicate with Google's servers

---

### Q: What if I disagree with Gemini's suggestions?

**A:** Gemini provides recommendations, not requirements:

- ✓ Use it as a second opinion
- ✓ Apply your judgment and context
- ✓ Ignore suggestions that don't fit your situation
- ✓ Ask Claude for clarification if something seems off

**Example:**

```
"Gemini suggested using microservices, but that seems overkill for my small project. What do you think, Claude?"
```

---

## Getting Help

### Documentation

- **Skill Documentation:** `plugins/rd2/skills/code-review-gemini/SKILL.md`
- **Usage Examples:** `plugins/rd2/skills/code-review-gemini/references/usage-examples.md`
- **Import Format:** `plugins/rd2/skills/code-review-gemini/references/import-format.md`
- **Developer Spec:** `docs/spec-code-review-gemini.md`

### Support

- **Ask Claude:** Just describe your issue in plain language
- **Check Logs:** `.claude/logs/` for error details
- **Community:** [Claude Code Discord/Forum]
- **Issues:** [GitHub Issues]

---

## Quick Reference

### Common Commands

```
# Setup
"Check if Gemini is available"

# Quick questions
"Ask Gemini: [your question]"

# Code review
"Review [path] for [focus areas]"
"Have Gemini review [path] for security"

# Planning
"Ask Gemini to plan [feature]"
"Get implementation plan for [task]"

# Task management
"Import [priority] issues as tasks"
"Import all issues from [review-name]"

# Verification
"Review [path] again after fixes"
```

### Focus Areas Quick Reference

- `security` - Vulnerabilities, auth, data exposure
- `performance` - Speed, memory, algorithms
- `testing` - Coverage, edge cases
- `quality` - Readability, maintainability
- `architecture` - Design patterns, structure

### Priority Levels

- **Critical** - Must fix immediately
- **High** - Should fix soon
- **Medium** - Consider fixing
- **Low** - Nice to have

---

**Document Version:** 1.0
**Last Updated:** 2026-01-22
**For Questions:** Ask Claude!

---

## Appendix: Example Reviews

### Example 1: Security Review

**Request:**

```
"Have Gemini review src/auth/ for security vulnerabilities"
```

**Gemini's Response:**

```
Security Review: src/auth/

Quality Score: 6/10
Recommendation: Request Changes

Critical Issues (2):
1. SQL Injection in login.py:45
   - User input directly concatenated into SQL query
   - Fix: Use parameterized queries

2. Password Storage in users.py:89
   - Passwords stored in plain text
   - Fix: Use bcrypt or argon2 hashing

High Priority (3):
- Missing rate limiting on login attempts
- JWT tokens don't expire
- No CSRF protection on password change

Medium Priority (2):
- Session cookies not marked as HttpOnly
- Missing security headers (HSTS, CSP)

Recommendation: Address critical issues before deployment.
```

**Next Steps:**

```
"Import critical and high priority issues as tasks"
```

---

### Example 2: Architecture Planning

**Request:**

```
"Ask Gemini to plan how to add real-time chat to this app"
```

**Gemini's Response:**

```
Implementation Plan: Real-time Chat

Current Architecture Analysis:
- Django REST API
- React frontend
- PostgreSQL database
- No existing WebSocket support

Recommended Approach: WebSocket + Redis

Implementation Steps:
1. Add Django Channels (WebSocket support)
2. Set up Redis for message brokering
3. Create chat models (Room, Message)
4. Implement WebSocket consumers
5. Add React WebSocket client
6. Implement message persistence
7. Add typing indicators
8. Implement read receipts

Trade-offs:
- WebSocket vs HTTP polling: WebSocket is real-time but more complex
- Redis vs Postgres for pub/sub: Redis is faster for real-time

Estimated Complexity: 3-5 days for basic chat
Testing Considerations: WebSocket testing, concurrent users

Files to Create:
- chat/consumers.py (WebSocket handler)
- chat/models.py (database models)
- chat/routing.py (WebSocket routing)
- frontend/ChatComponent.jsx
```

---

**End of User Manual**

For developer documentation, see `docs/spec-code-review-gemini.md`
