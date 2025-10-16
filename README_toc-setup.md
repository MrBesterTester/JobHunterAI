# Automatic Table of Contents (TOC) Setup

This project uses automatic TOC generation for all markdown files.

## Overview

A git pre-commit hook automatically generates and updates TOCs in all markdown files whenever they are committed. This ensures documentation always has up-to-date navigation.

## How It Works

1. **Tool**: Uses [doctoc](https://github.com/thlorenz/doctoc) to generate TOCs
2. **Trigger**: Git pre-commit hook runs before each commit
3. **Target**: All `.md` files staged for commit
4. **Process**:
   - Detects staged markdown files
   - Runs doctoc on each file
   - Adds updated files back to staging
   - Commits proceed with TOCs included

## Configuration

### .doctocrc
Project-wide doctoc configuration:
```json
{
  "title": "## Table of Contents",
  "mode": "github",
  "maxlevel": 4,
  "notitle": false,
  "entryPrefix": "-"
}
```

### Pre-commit Hook
Located at `.git/hooks/pre-commit`:
- Automatically finds staged `.md` files
- Runs doctoc with GitHub-flavored markdown mode
- Silent operation (no console spam)

## Manual Usage

To manually update TOCs in all markdown files:

```bash
# Update all markdown files
npx doctoc . --all --github

# Update specific file
npx doctoc README.md --github

# Update files in a directory
npx doctoc docs/ --github
```

## TOC Format

Generated TOCs include:
- Special comment markers for auto-update detection
- Links to all headings (up to 4 levels deep)
- Proper indentation matching heading hierarchy
- GitHub-compatible anchor links

Example:
```markdown
<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

  - [Reinstalling the hook](#reinstalling-the-hook)
  - [Disabling TOC generation](#disabling-toc-generation)
- [Benefits](#benefits)
- [Troubleshooting](#troubleshooting)
  - [TOC not updating](#toc-not-updating)
  - [Wrong TOC format](#wrong-toc-format)
  - [Commit failing](#commit-failing)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->
```

## Maintenance

### Installing doctoc (if needed)
```bash
npm install --save-dev doctoc
```

### Reinstalling the hook
If the pre-commit hook is missing:
```bash
# Copy from project template if available
cp .git/hooks/pre-commit.sample .git/hooks/pre-commit

# Or recreate from scratch (see .git/hooks/pre-commit)
```

### Disabling TOC generation
To skip TOC generation for a specific commit:
```bash
git commit --no-verify -m "message"
```

## Benefits

- **Always current**: TOCs update automatically with content changes
- **Zero effort**: No manual TOC maintenance needed
- **Consistent**: Same TOC format across all markdown files
- **Discoverable**: Easy navigation in long documentation
- **GitHub compatible**: Works perfectly with GitHub's markdown renderer

## Troubleshooting

### TOC not updating
1. Check if pre-commit hook exists: `ls -la .git/hooks/pre-commit`
2. Verify it's executable: `chmod +x .git/hooks/pre-commit`
3. Ensure doctoc is installed: `npx doctoc --version`

### Wrong TOC format
1. Check `.doctocrc` configuration
2. Manually run: `npx doctoc yourfile.md --github` to test

### Commit failing
If pre-commit hook causes issues:
```bash
# Skip the hook temporarily
git commit --no-verify

# Or check hook output for errors
bash .git/hooks/pre-commit
```
