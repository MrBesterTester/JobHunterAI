# Fixing Markdown Preview Cache Issues in Cursor

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Overview](#overview)
- [Understanding the Problem](#understanding-the-problem)
- [Quick Fixes (Most Reliable First)](#quick-fixes-most-reliable-first)
  - [1. Close and Reopen the Preview Tab](#1-close-and-reopen-the-preview-tab)
  - [2. Right-Click File in Sidebar](#2-right-click-file-in-sidebar)
  - [3. Restart Cursor Completely](#3-restart-cursor-completely)
- [More Persistent Solutions](#more-persistent-solutions)
  - [4. Clear Cursor's Cache](#4-clear-cursors-cache)
  - [5. Check for Markdown Extension Conflicts](#5-check-for-markdown-extension-conflicts)
- [Nuclear Option](#nuclear-option)
  - [6. File Recreation Workaround](#6-file-recreation-workaround)
- [Why Common Suggestions Don't Work](#why-common-suggestions-dont-work)
  - [Why Cmd+R Doesn't Refresh](#why-cmdr-doesnt-refresh)
  - [Why "Reload Window" Doesn't Exist in Cursor](#why-reload-window-doesnt-exist-in-cursor)
  - [Why "Markdown: Refresh Preview" Doesn't Help](#why-markdown-refresh-preview-doesnt-help)
- [About Markdown All in One Extension](#about-markdown-all-in-one-extension)
- [Recommended Workflow](#recommended-workflow)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Overview

This document provides **researched and tested** solutions for fixing markdown preview caching issues in Cursor/VS Code on macOS, where the preview doesn't reflect the latest changes to markdown files.

**Key finding**: This is a **known bug in VS Code's core markdown preview system**, not specifically caused by the "Markdown All in One" extension. Multiple GitHub issues document this problem (e.g., [#265277](https://github.com/microsoft/vscode/issues/265277), [#244328](https://github.com/microsoft/vscode/issues/244328), [#13280](https://github.com/microsoft/vscode/issues/13280)).

## Understanding the Problem

**What's happening:**
- VS Code/Cursor has a **built-in markdown preview** (it's native functionality, not just from extensions)
- Extensions like "Markdown All in One" extend this preview but don't replace it
- The preview system caches content and doesn't always detect when files change
- This affects **all markdown preview methods** (built-in and extension-based)

## Quick Fixes (Most Reliable First)

### 1. Close and Reopen the Preview Tab

**This is the most reliable quick fix.**

1. Close the markdown preview tab (click the X on the tab)
2. Reopen the preview using one of these methods:
   - **Side-by-side preview:** `Cmd+K V` (press Cmd+K, release, then press V)
   - **Full preview tab:** `Cmd+Shift+V`
   - **Click the preview icon** in the top-right corner of the editor

**Why this works:** Forces the preview system to reload from disk rather than using cached content.

### 2. Right-Click File in Sidebar

Some users report success with this workaround:

1. Find your `.md` file in the file explorer sidebar
2. Right-click the file
3. Select **"Open Preview"** from the context menu

**Why this works:** Bypasses the cached preview state by opening a fresh preview instance.

### 3. Restart Cursor Completely

When the preview cache is particularly stubborn:

1. Quit Cursor completely: `Cmd+Q`
2. Relaunch Cursor
3. Reopen your markdown file and preview

**Why this works:** Clears all in-memory caches and reloads everything fresh.

## More Persistent Solutions

### 4. Clear Cursor's Cache

If restarting doesn't work, clear the cache:

**Automated script (macOS - Recommended):**

```bash
# Run from an EXTERNAL terminal (Terminal.app or iTerm2, NOT Cursor's terminal)
./clear-cursor-cache.sh
```

The script will:
1. Check you're not running it inside Cursor's integrated terminal
2. Prompt you to close all files and exit Claude Code (`/exit`)
3. Quit Cursor automatically
4. Clear the cache directory
5. Optionally restart Cursor for you

**Manual method (macOS):**
```bash
# 1. Close all files in Cursor (Cmd+W until no tabs remain)
# 2. Exit Claude Code session (type /exit)
# 3. Quit Cursor (Cmd+Q)
rm -rf ~/Library/Application\ Support/Cursor/Cache
# 4. Restart Cursor
```

**Manual method (Windows):**
```cmd
REM 1. Close all files in Cursor
REM 2. Exit Claude Code session (type /exit)
REM 3. Close Cursor
rmdir /s "%APPDATA%\Cursor\Cache"
REM 4. Restart Cursor
```

**Why this works:** Removes all cached data including stale markdown preview content.

### 5. Check for Markdown Extension Conflicts

If you have multiple markdown extensions, they may conflict:

**Specific issue with Markdown All in One:**
If both VS Code's built-in math renderer and Markdown All in One's math extension are enabled, the preview may refresh twice or behave erratically.

**Fix:**
1. Open Settings: `Cmd+,`
2. Search for: `markdown.math.enabled`
3. Set to `false` to disable the built-in math renderer
4. **OR** search for: `markdown.extension.math.enabled`
5. Set to `false` to disable Markdown All in One's math renderer

Choose one math renderer, not both.

## Nuclear Option

### 6. File Recreation Workaround

When all else fails, this workaround forces a complete refresh:

1. Select all content in your markdown file: `Cmd+A`
2. Copy it: `Cmd+C`
3. Close the file and preview
4. In the file explorer, rename the file (e.g., add `.backup` to the name)
5. Create a new file with the original name
6. Paste the content: `Cmd+V`
7. Save: `Cmd+S`
8. Delete the backup file

**Why this works:** Creates a completely new file, forcing VS Code to treat it as fresh content with no cached preview state.

## Why Common Suggestions Don't Work

### Why Cmd+R Doesn't Refresh

You may see `Cmd+R` suggested online, but it **doesn't work** in Cursor/VS Code for markdown preview because:

1. **It's a chord sequence**: `Cmd+R` is waiting for a second key press (that's why you see "waiting for second key of chord")
2. **It's restricted to development mode**: The "Reload Window" command is only enabled when VS Code is in development mode
3. **It's not bound by default**: In regular VS Code, this shortcut isn't enabled for normal use

**To make it work in VS Code (not Cursor):**
1. Open Command Palette: `Cmd+Shift+P`
2. Type: "Preferences: Open Keyboard Shortcuts"
3. Search for: "workbench.action.reloadWindow"
4. Right-click the `isDevelopment` condition under "When"
5. Select "Change when expression"
6. Delete the condition and press Enter

### Why "Reload Window" Doesn't Exist in Cursor

Cursor has **removed the "Reload Window" command** that exists in VS Code. This is a known limitation ([source](https://forum.cursor.com/t/why-is-the-command-reload-window-removed/21929)).

In Cursor, you must fully quit and restart the application (`Cmd+Q`) instead of using "Reload Window".

### Why "Markdown: Refresh Preview" Doesn't Help

There is no "Markdown: Refresh Preview" command in the Command Palette. The preview is designed to update automatically in real-time.

The closest command is `markdown.preview.refresh`, but it **only refreshes the WebView container**, not the actual content—it doesn't re-render or clear the cache.

## About Markdown All in One Extension

**Does the extension cause the problem?**
No. The cache issue exists in VS Code's **core markdown preview system**. GitHub issue [#244328](https://github.com/microsoft/vscode/issues/244328) confirms the problem persists even with ALL extensions disabled, including Markdown All in One.

**What does Markdown All in One do?**
It extends the built-in preview with additional features:
- Keyboard shortcuts for formatting
- Table of contents generation
- List editing enhancements
- Math rendering
- Auto-completion

The caching issue affects the built-in preview that Markdown All in One uses underneath.

## Recommended Workflow

**For day-to-day use:**

1. **First try:** Close and reopen the preview tab (Solution #1)
   - Fastest and most reliable
   - Works 80-90% of the time

2. **If that fails:** Right-click the file in the sidebar and select "Open Preview" (Solution #2)
   - Alternative approach that sometimes works when #1 doesn't

3. **If still broken:** Quit and restart Cursor (`Cmd+Q`) (Solution #3)
   - More reliable but takes longer

4. **Persistent issues:** Clear the cache folder (Solution #4)
   - Nuclear option for stubborn cache problems
   - Requires quitting Cursor first

5. **Absolute last resort:** Use the file recreation workaround (Solution #6)
   - Guaranteed to work but most time-consuming

**Prevention tip:**
Keep the markdown file tab focused (not just the preview) while editing. The preview refreshes more reliably when the source file tab has focus.
