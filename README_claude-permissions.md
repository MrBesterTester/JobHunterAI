# Claude Code Permissions Guide - JobHunter Project

## Overview

This document explains how to safely configure Claude Code's permission system to balance productivity with security. Claude Code uses a permission-based architecture where you can explicitly control what actions the AI can take.

**Key Principle**: Claude Code already restricts write access to the project folder, so allowing file operations within the project is inherently safe.

## Permission System Structure

Permissions are configured in `.claude/settings.local.json` using three lists:

```json
{
  "permissions": {
    "allow": [],   // Explicitly permit without asking
    "deny": [],    // Block completely
    "ask": []      // Require confirmation (default behavior)
  }
}
```

**Precedence**: `deny` > `ask` > `allow`

## How It Works

### 1. Allow List
Actions in the `allow` list execute **without asking for permission**. Use this for:
- Routine development tasks
- Safe, reversible operations
- Actions within the project folder

### 2. Deny List
Actions in the `deny` list are **completely blocked**. Use this for:
- Destructive operations
- Network requests to sensitive endpoints
- Access to files containing secrets

### 3. Ask List
Actions in the `ask` list **require confirmation**. Use this for:
- Operations with system-wide effects
- Remote operations (git push, network requests)
- Changes to global configuration

### Default Behavior
If an action isn't in any list, Claude Code will **ask for approval** by default.

## Pattern Matching

### Bash Command Patterns
Format: `"Bash(command:pattern)"`

**Examples**:
```json
"Bash(git diff:*)"        // All git diff commands
"Bash(npm run test:*)"    // All npm test scripts
"Bash(cargo build)"       // Specific cargo build (no args)
"Bash(ls:*)"              // ls with any arguments
```

**Important**: Patterns use **prefix matching**, not full regex.

### File Operation Patterns
Format: `"ToolName(path_pattern)"`

**Examples**:
```json
"Read(./.env)"            // Specific file
"Read(./secrets/**)"      // All files in secrets/
"Write(./src/**)"         // All files in src/
"Edit(**/test/**)"        // Test files anywhere
```

### Tool Names
- `Read` - Read files
- `Write` - Create new files
- `Edit` - Modify existing files
- `Glob` - File pattern matching
- `Grep` - Search file contents
- `Bash` - Shell commands
- `WebFetch` - Network requests
- `NotebookEdit` - Jupyter notebook edits

## Built-in Safety Features

Claude Code provides these protections **automatically**:

✅ **Write Access Restricted to Project Folder**
- Cannot write outside `/Users/sam/Projects/JobHuntAI`
- No need to worry about system files

✅ **Command Blocklisting**
- Dangerous commands like `curl` and `wget` blocked by default
- Network operations require approval

✅ **Prompt Injection Detection**
- Analyzes requests for potentially harmful instructions
- Prevents malicious prompt manipulation

✅ **Input Sanitization**
- Validates and sanitizes all inputs before execution

## Recommended Configurations

### Configuration 1: Full Development Freedom (Project-Only)

**Use Case**: Solo developer, working only on this project, want maximum productivity

```json
{
  "permissions": {
    "allow": [
      // All file operations (automatically restricted to project folder)
      "Read",
      "Write",
      "Edit",
      "Glob",
      "Grep",
      "NotebookEdit",

      // Local git operations
      "Bash(git add:*)",
      "Bash(git commit:*)",
      "Bash(git status:*)",
      "Bash(git diff:*)",
      "Bash(git log:*)",
      "Bash(git stash:*)",
      "Bash(git restore:*)",
      "Bash(git checkout:*)",
      "Bash(git branch:*)",

      // Development commands
      "Bash(cargo build:*)",
      "Bash(cargo test:*)",
      "Bash(cargo run:*)",
      "Bash(cargo check:*)",
      "Bash(npm install:*)",
      "Bash(npm run:*)",
      "Bash(npm test:*)",
      "Bash(npm start)",

      // Database operations (local)
      "Bash(psql:*)",
      "Bash(createdb:*)",

      // Safe shell commands
      "Bash(ls:*)",
      "Bash(cat:*)",
      "Bash(grep:*)",
      "Bash(find:*)",
      "Bash(wc:*)",
      "Bash(head:*)",
      "Bash(tail:*)"
    ],
    "ask": [
      // Remote git operations
      "Bash(git push:*)",
      "Bash(git pull:*)",
      "Bash(git fetch:*)",

      // History rewriting
      "Bash(git rebase:*)",
      "Bash(git filter-branch:*)",

      // Global configuration
      "Bash(git config --global:*)",

      // Network operations
      "WebFetch",
      "Bash(curl:*)",
      "Bash(wget:*)"
    ],
    "deny": [
      // No explicit denials needed (built-in protections cover this)
    ]
  }
}
```

### Configuration 2: Balanced (Recommended)

**Use Case**: Want productivity but cautious about git operations

```json
{
  "permissions": {
    "allow": [
      // All file operations
      "Read",
      "Write",
      "Edit",
      "Glob",
      "Grep",

      // Safe git operations
      "Bash(git status:*)",
      "Bash(git diff:*)",
      "Bash(git log:*)",

      // Build and test
      "Bash(cargo build:*)",
      "Bash(cargo test:*)",
      "Bash(npm run build)",
      "Bash(npm run test:*)",

      // Safe shell commands
      "Bash(ls:*)",
      "Bash(cat:*)",
      "Bash(grep:*)"
    ],
    "ask": [
      // All git write operations
      "Bash(git add:*)",
      "Bash(git commit:*)",
      "Bash(git push:*)",
      "Bash(git stash:*)",

      // Package management
      "Bash(npm install:*)",
      "Bash(cargo add:*)",

      // Network
      "WebFetch"
    ],
    "deny": []
  }
}
```

### Configuration 3: Maximum Safety (Paranoid Mode)

**Use Case**: Working with sensitive data, want explicit approval for everything

```json
{
  "permissions": {
    "allow": [
      // Read-only operations only
      "Read",
      "Glob",
      "Grep",
      "Bash(git status:*)",
      "Bash(git diff:*)",
      "Bash(git log:*)",
      "Bash(ls:*)",
      "Bash(cat:*)"
    ],
    "ask": [
      // Everything else requires approval
      "Write",
      "Edit",
      "Bash(git:*)",
      "Bash(cargo:*)",
      "Bash(npm:*)"
    ],
    "deny": [
      // Block network operations completely
      "WebFetch",
      "Bash(curl:*)",
      "Bash(wget:*)",

      // Block access to sensitive files
      "Read(./.env)",
      "Read(./secrets/**)",
      "Edit(./.env)"
    ]
  }
}
```

## Current Configuration (JobHunter Project)

As of September 30, 2025, this project uses a **hybrid approach** that has evolved organically during development:

```json
{
  "permissions": {
    "allow": [
      "Bash(brew services start:*)",
      "Bash(sudo xcodebuild:*)",
      "Bash(cargo:*)",
      "Bash(createdb:*)",
      "Bash(psql:*)",
      "Bash(curl:*)",
      "Bash(npm start)",
      "Bash(timeout 10s cargo run)",
      "Bash(gtimeout:*)",
      "Bash(git log:*)",
      "Bash(git for-each-ref:*)",
      "Bash(git update-ref:*)",
      "Bash(git reflog:*)",
      "Bash(git gc:*)",
      "Bash(git config:*)"
    ],
    "deny": [],
    "ask": []
  }
}
```

**Note**: This configuration grew through approving commands as needed. Consider upgrading to **Configuration 1 (Full Development Freedom)** for better productivity.

## Common Scenarios

### Scenario 1: Allow All File Operations in Project

**Goal**: Never be asked about reading, writing, or editing project files

```json
"allow": [
  "Read",
  "Write",
  "Edit",
  "Glob",
  "Grep"
]
```

**Safety**: ✅ Safe - All file operations are automatically restricted to the project folder.

### Scenario 2: Allow Git Commits But Ask for Pushes

**Goal**: Fast local development, careful about remote operations

```json
"allow": [
  "Bash(git add:*)",
  "Bash(git commit:*)",
  "Bash(git status:*)",
  "Bash(git diff:*)"
],
"ask": [
  "Bash(git push:*)",
  "Bash(git pull:*)"
]
```

**Safety**: ✅ Safe - Local git operations are reversible; remote operations still require approval.

### Scenario 3: Allow Running Tests Without Approval

**Goal**: Fast test iteration during development

```json
"allow": [
  "Bash(cargo test:*)",
  "Bash(npm test:*)",
  "Bash(npm run test:*)",
  "Bash(npx playwright test:*)"
]
```

**Safety**: ✅ Safe - Running tests doesn't modify source code or system state.

### Scenario 4: Block Network Operations

**Goal**: Working offline or with sensitive data

```json
"deny": [
  "WebFetch",
  "Bash(curl:*)",
  "Bash(wget:*)"
]
```

**Safety**: ✅ Maximum safety - Prevents all network operations.

### Scenario 5: Allow Database Operations (Local Development)

**Goal**: Fast database testing and development

```json
"allow": [
  "Bash(psql:*)",
  "Bash(createdb:*)",
  "Bash(dropdb:*)"
]
```

**Safety**: ⚠️ Use caution - Only use if you're sure you're on a local development database.

## Security Best Practices

### ✅ DO:

1. **Start Conservative, Expand as Needed**
   - Begin with minimal permissions
   - Add to `allow` list as you identify safe, repetitive operations

2. **Use Pattern Matching Wisely**
   - `"Bash(git:*)"` allows ALL git commands
   - `"Bash(git status:*)"` only allows git status
   - Be specific when possible

3. **Review Periodically**
   - Audit your `allow` list every few months
   - Remove permissions you no longer need

4. **Keep Sensitive Files Protected**
   - Add `.env`, `secrets/`, `credentials.json` to `deny` list if working with real secrets
   - In this project, we're using test/development data only

5. **Document Your Configuration**
   - Comment why you allowed specific operations
   - Share configuration with team members

### ❌ DON'T:

1. **Don't Allow Everything with Wildcards**
   ```json
   "allow": ["Bash(*:*)"]  // ❌ BAD - Allows any command
   ```

2. **Don't Mix Security Contexts**
   - If working with production credentials, use Maximum Safety configuration
   - If working with test data, Full Development Freedom is fine

3. **Don't Ignore Ask Prompts**
   - Read what Claude is trying to do
   - If you're constantly approving the same action, add it to `allow`
   - If you never approve an action, add it to `deny`

4. **Don't Disable Built-in Protections**
   - There's no way to expand write access beyond the project folder (by design)
   - Don't try to work around this - it's there for your safety

## Troubleshooting

### Issue: "I'm constantly approving the same action"

**Solution**: Add the pattern to your `allow` list.

Example: Always approving `git commit`?
```json
"allow": ["Bash(git commit:*)"]
```

### Issue: "Claude Code is asking about reading my own project files"

**Solution**: Add file operations to `allow` list:
```json
"allow": [
  "Read",
  "Write",
  "Edit",
  "Glob",
  "Grep"
]
```

### Issue: "I want to allow one git command but not others"

**Solution**: Be specific with patterns:
```json
"allow": [
  "Bash(git status:*)",  // Allowed
  "Bash(git diff:*)"     // Allowed
],
"ask": [
  "Bash(git push:*)"     // Requires approval
]
```

### Issue: "My configuration isn't working"

**Checklist**:
1. ✅ Check JSON syntax is valid (no trailing commas, proper quotes)
2. ✅ Restart Claude Code after changing permissions
3. ✅ Verify file path: `.claude/settings.local.json` (in project root)
4. ✅ Check precedence: `deny` overrides `ask` overrides `allow`
5. ✅ Pattern matching: `"Bash(git:*)"` not `"Bash(git *)"` (no space)

### Issue: "I accidentally denied something I need"

**Solution**: Remove from `deny` list or add to `allow` list:
```json
"deny": [
  // "Bash(npm install:*)"  // Remove this line
],
"allow": [
  "Bash(npm install:*)"  // Add here instead
]
```

## Examples from JobHunter Development

### What We've Allowed So Far

During Phase 5 development, we've allowed these operations:

1. **Cargo operations** - Building and testing Rust backend
2. **Database operations** - Creating/querying PostgreSQL test database
3. **Git read operations** - Checking status, viewing logs, analyzing history
4. **Git write operations** - Committing code, rewriting history (for email change)
5. **NPM operations** - Running frontend development server, installing packages
6. **Playwright testing** - Running browser-based E2E tests

### What We've Asked For

Operations that required approval during development:

1. **Git push** - Pushing to remote repository (intentionally kept as "ask")
2. **Git filter-branch** - Rewriting commit history (now in allow list after approval)
3. **Global git config** - Changing email address system-wide

### Lessons Learned

1. **Local git operations are safe** - `git add`, `git commit`, `git status`, `git diff` can all be allowed
2. **Build/test commands are safe** - `cargo test`, `npm test` are non-destructive
3. **File operations within project are safe** - Read/Write/Edit automatically restricted
4. **Network operations should require approval** - `curl`, `wget`, `WebFetch` should be conscious decisions

## Upgrading Your Configuration

### From Current → Full Development Freedom

If you want to stop being asked for approval for routine operations, replace your current configuration with **Configuration 1** from above.

**Benefits**:
- Faster iteration during development
- No interruptions for safe, reversible operations
- Still get prompted for git push and network requests

**Risks**:
- Claude can make more changes without asking
- Only suitable if you're comfortable with the AI making routine edits

**Recommendation**: ✅ **Good for this project** - We're working with test data and all changes are version controlled in git.

## Quick Reference

### Essential Patterns

```json
// Allow all file operations in project
"Read", "Write", "Edit", "Glob", "Grep"

// Allow local git operations
"Bash(git add:*)", "Bash(git commit:*)", "Bash(git status:*)"

// Allow build and test
"Bash(cargo test:*)", "Bash(npm test:*)"

// Ask for remote operations
"Bash(git push:*)", "WebFetch"

// Deny sensitive files (if needed)
"Read(./.env)", "Edit(./.env)"
```

### File Location

`.claude/settings.local.json` in project root:
```
/Users/sam/Projects/JobHuntAI/.claude/settings.local.json
```

### Applying Changes

Changes take effect **immediately** - no need to restart Claude Code (though a restart ensures the changes are fully loaded).

---

## Additional Resources

- [Claude Code Settings Documentation](https://docs.claude.com/en/docs/claude-code/settings.md)
- [Claude Code Security Model](https://docs.claude.com/en/docs/claude-code/security.md)
- [Claude Code IAM Documentation](https://docs.claude.com/en/docs/claude-code/iam.md)

---

**Last Updated**: September 30, 2025
**Project**: JobHunter
**Configuration Version**: Hybrid (Growing Organically)
**Recommended Next Step**: Upgrade to Configuration 1 (Full Development Freedom)
