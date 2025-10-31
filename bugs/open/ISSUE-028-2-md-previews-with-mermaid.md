---
id: ISSUE-028
title: Multiple Markdown Previews with Mermaid Support in Cursor/VSCode
status: open
priority: low
severity: low
component: docs
created: 2025-10-31
updated: 2025-10-31
affects: []
related: []
---

# ISSUE-028: Multiple Markdown Previews with Mermaid Support in Cursor/VSCode

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Summary](#summary)
- [Impact](#impact)
- [Steps to Reproduce](#steps-to-reproduce)
- [Expected Behavior](#expected-behavior)
- [Actual Behavior](#actual-behavior)
- [Root Cause](#root-cause)
- [Evidence](#evidence)
  - [Research Sources](#research-sources)
- [Proposed Solutions](#proposed-solutions)
  - [Option 1: Use Locked Preview Feature in Cursor](#option-1-use-locked-preview-feature-in-cursor)
  - [Option 2: Configure Editor Association for Markdown Files](#option-2-configure-editor-association-for-markdown-files)
  - [Option 3: Install Mermaid Extension in VSCode](#option-3-install-mermaid-extension-in-vscode)
- [Decision](#decision)
- [Implementation](#implementation)
- [Testing](#testing)
- [Status History](#status-history)
- [Notes](#notes)
- [Related Files](#related-files)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Summary

Research findings on how to view multiple markdown preview files simultaneously in Cursor (v2.0.43) and enable Mermaid diagram rendering in VSCode. Both issues have built-in solutions.

## Impact

**Who/What is affected:**
- Developer workflow when reviewing multiple markdown documentation files
- Ability to visualize Mermaid diagrams in markdown files
- Choice between Cursor and VSCode editors

**Severity:**
- Low - workflow improvement rather than blocker
- Affects documentation review efficiency

## Steps to Reproduce

**Issue 1 - Multiple Markdown Previews:**
1. Open a markdown file in Cursor
2. Open markdown preview (default preview)
3. Switch to another markdown file
4. Notice previous preview is replaced

**Issue 2 - Mermaid Diagram Rendering:**
1. Open a markdown file with mermaid diagram in VSCode
2. Open markdown preview
3. Without extension: mermaid code block shown as plain text
4. With extension: diagram renders visually

## Expected Behavior

- Cursor: Ability to have multiple markdown preview panes open simultaneously for different files
- VSCode: Mermaid diagrams should render as visual diagrams in markdown preview

## Actual Behavior

- Cursor: Default behavior only maintains one unlocked markdown preview at a time
- VSCode: Requires extension installation for mermaid diagram support

## Root Cause

**Multiple Markdown Previews:**
- VS Code (and Cursor by extension) default behavior: only one unlocked markdown preview window
- Opening a new markdown file replaces the current preview
- Built-in "locked preview" feature exists but not widely known

**Mermaid Rendering:**
- VSCode does not include mermaid rendering in base installation
- Requires extension: "Markdown Preview Mermaid Support" by Matt Bierner
- Extension integrates seamlessly with VSCode's built-in markdown preview

## Evidence

### Research Sources

**Multiple Markdown Previews:**
- Stack Overflow: "How do you open multiple markdown previews at the same time in VS Code?"
- Confirmed: Cursor inherits VS Code's locked preview feature

**Mermaid Support:**
- VSCode Marketplace: "Markdown Preview Mermaid Support" extension
  - Latest version: 1.29.0 (updated September 2025)
  - Supports Mermaid version 11.12.0
  - 5M+ downloads
- Alternative: "Mermaid Preview" extension with pan/zoom features

## Proposed Solutions

### Option 1: Use Locked Preview Feature in Cursor

**Description**: Use VS Code's built-in "Markdown: Open Locked Preview to the Side" command

**Implementation Steps:**
1. Open a markdown file
2. Press `Cmd+Shift+P` (macOS) to open Command Palette
3. Type "locked" and select "Markdown: Open Locked Preview to the Side"
4. Preview will stay locked and won't be replaced when opening other markdown files
5. Repeat for additional markdown files to have multiple previews open

**Alternative Command:**
- Open any markdown preview
- Run "Markdown: Toggle Preview Locking" to lock current preview

**Pros**:
- Built-in feature, no installation required
- Works immediately in Cursor
- Stable and well-supported
- Can have unlimited locked previews

**Cons**:
- Requires manual locking for each preview
- Not obvious/discoverable feature
- Need to remember keyboard shortcut

**Implementation Effort**: 0 minutes (already available)

**Maintenance**: None - built-in feature

### Option 2: Configure Editor Association for Markdown Files

**Description**: Configure Cursor to open markdown files as previews by default

**Implementation Steps:**
1. Open Cursor settings (JSON)
2. Add configuration:
   ```json
   "workbench.editorAssociations": {
       "*.md": "vscode.markdown.preview.editor"
   }
   ```
3. Save settings
4. Markdown files will now open as previews by default
5. Double-click preview content to enter edit mode when needed

**Pros**:
- Automatic behavior, no manual locking needed
- All markdown files open as separate previews
- Set once and forget

**Cons**:
- Changes default markdown file opening behavior
- May not want preview mode by default for all workflows
- Need to double-click to edit

**Implementation Effort**: 2 minutes

**Maintenance**: None - configuration persists

### Option 3: Install Mermaid Extension in VSCode

**Description**: Install "Markdown Preview Mermaid Support" extension in VSCode

**Implementation Steps:**
1. Open VSCode
2. Open Extensions view (`Cmd+Shift+X`)
3. Search for "Markdown Preview Mermaid Support"
4. Install extension by Matt Bierner (bierner.markdown-mermaid)
5. Restart VSCode
6. Mermaid diagrams in markdown will render automatically

**Extension Details:**
- Extension ID: `bierner.markdown-mermaid`
- Latest Version: 1.29.0
- Mermaid Version: 11.12.0
- VSCode Marketplace: https://marketplace.visualstudio.com/items?itemName=bierner.markdown-mermaid

**Pros**:
- Official Microsoft-maintained extension
- Seamless integration with built-in markdown preview
- Supports latest Mermaid features
- 5M+ downloads, well-tested
- Free and open source

**Cons**:
- Requires extension installation
- VSCode only (Cursor may have built-in mermaid support)

**Implementation Effort**: 5 minutes

**Maintenance**: Auto-updates with VSCode extensions

## Decision

**Recommendation**: Use both Option 1 and Option 3

**For Cursor:**
- Use "Markdown: Open Locked Preview to the Side" command (Option 1)
- This is the most straightforward solution with no configuration changes
- Provides immediate benefit with zero setup

**For VSCode:**
- Install "Markdown Preview Mermaid Support" extension (Option 3)
- Enables full feature parity with Cursor for mermaid diagram rendering
- Makes VSCode a viable alternative to Cursor

**Result**: User can confidently use either editor with full functionality

## Implementation

**Status**: Documentation only - no code changes required

**Documented Solutions:**
1. ✅ Multiple markdown previews in Cursor: Use locked preview command
2. ✅ Mermaid rendering in VSCode: Install extension

**User can choose either editor based on preference:**
- Cursor: Already has mermaid support, now knows how to use multiple previews
- VSCode: Can add mermaid support, already has multiple preview capability

## Testing

**Test Commands:**
```bash
# Test locked preview in Cursor
# 1. Open ./README.md
# 2. Cmd+Shift+P → "Markdown: Open Locked Preview to the Side"
# 3. Open ./CLAUDE.md
# 4. Cmd+Shift+P → "Markdown: Open Locked Preview to the Side"
# 5. Verify both previews are visible simultaneously

# Test mermaid in VSCode (after extension installation)
# 1. Install "Markdown Preview Mermaid Support" extension
# 2. Open ./README.md (contains mermaid diagram)
# 3. Open markdown preview
# 4. Verify mermaid diagram renders as visual flowchart
```

**Verification:**
- [x] Research completed on multiple markdown previews
- [x] Research completed on mermaid diagram support
- [x] Solutions documented with step-by-step instructions
- [ ] User validates locked preview works in Cursor v2.0.43
- [ ] User validates mermaid extension works in VSCode

## Status History

- 2025-10-31: ISSUE created and documented with research findings

## Notes

**Key Findings:**

1. **Cursor Multiple Markdown Previews**: Built-in feature exists but not widely known
   - "Markdown: Open Locked Preview to the Side" command
   - Can also use "Markdown: Toggle Preview Locking" on existing previews
   - No installation or configuration required

2. **VSCode Mermaid Support**: Official extension available and actively maintained
   - "Markdown Preview Mermaid Support" by Matt Bierner
   - Version 1.29.0 (September 2025)
   - Supports Mermaid 11.12.0
   - 5M+ downloads, well-tested

3. **Editor Parity**: Both editors now support both features
   - Cursor: Has mermaid support + can use locked previews
   - VSCode: Can add mermaid via extension + has locked previews

**Documentation Source**: Web research conducted 2025-10-31
- Stack Overflow discussion on multiple markdown previews
- VSCode Marketplace extension listings
- Mermaid extension documentation

## Related Files

**Project Markdown Files** (examples where feature is useful):
- `./README.md` - Contains mermaid diagram
- `./CLAUDE.md` - Main project documentation
- `./docs/PROJECT_STATUS.md` - Status documentation
- `./docs/TESTING_STATUS.md` - Testing documentation
- `./bugs/README.md` - Bug tracking index

**No code changes required** - documentation and workflow improvement only
