---
id: ISSUE-028
title: Multiple Markdown Previews in Cursor
status: open
priority: low
severity: low
component: docs
created: 2025-10-31
updated: 2025-10-31
affects: []
related: [ISSUE-029]
---

# ISSUE-028: Multiple Markdown Previews in Cursor

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
- [Decision](#decision)
- [Implementation](#implementation)
- [Testing](#testing)
- [Status History](#status-history)
- [Notes](#notes)
- [Related Files](#related-files)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Summary

Research findings on how to view multiple markdown preview files simultaneously in Cursor (v2.0.43). Cursor has a built-in "locked preview" feature that solves this issue.

**Note**: VSCode mermaid diagram rendering is covered separately in ISSUE-029.

## Impact

**Who/What is affected:**
- Developer workflow when reviewing multiple markdown documentation files
- Efficiency when comparing or referencing multiple documentation files side-by-side

**Severity:**
- Low - workflow improvement rather than blocker
- Affects documentation review efficiency
- Not widely known feature in Cursor

## Steps to Reproduce

**Multiple Markdown Previews Issue:**
1. Open a markdown file in Cursor (e.g., `./README.md`)
2. Open markdown preview (default preview)
3. Switch to another markdown file (e.g., `./CLAUDE.md`)
4. Open preview for the second file
5. Notice previous preview is replaced by new preview
6. Cannot view both previews simultaneously

## Expected Behavior

Ability to have multiple markdown preview panes open simultaneously for different files, allowing side-by-side comparison of documentation.

## Actual Behavior

Cursor's default behavior only maintains one unlocked markdown preview at a time. Opening a new markdown preview replaces the existing preview.

## Root Cause

**Multiple Markdown Previews:**
- VS Code (and Cursor by extension) default behavior: only one unlocked markdown preview window
- Opening a new markdown file replaces the current preview
- Built-in "locked preview" feature exists but not widely known
- Design choice to prevent cluttering workspace with multiple preview panes

**Why This is Not a Bug:**
This is an intentional design decision. The locked preview feature provides the flexibility for users who need multiple previews while keeping the default behavior simple for most users.

## Evidence

### Research Sources

**Multiple Markdown Previews:**
- Stack Overflow: "How do you open multiple markdown previews at the same time in VS Code?"
  - Confirmed: Cursor inherits VS Code's locked preview feature
  - Two solutions documented: locked previews and editor associations
- Cursor Community Forum: Users requesting this feature unaware it already exists
- VS Code documentation: Locked preview feature available since early versions

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
1. Open Cursor settings JSON:
   - Press `Cmd+Shift+P` (macOS) to open Command Palette
   - Type "settings json"
   - Select "Preferences: Open User Settings (JSON)"
2. Add configuration:
   ```json
   "workbench.editorAssociations": {
       "*.md": "vscode.markdown.preview.editor"
   }
   ```
3. Save settings (`Cmd+S`)
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

## Decision

**Recommendation**: Option 1 - Use Locked Preview Feature

**Rationale:**
- Built-in feature, no configuration required
- Most straightforward solution
- Zero setup time, works immediately
- Provides maximum flexibility (unlimited locked previews)
- Option 2 is available if user prefers automatic behavior

**For Users Who Want Multiple Markdown Previews:**
1. Use "Markdown: Open Locked Preview to the Side" command (Option 1 - Recommended)
2. Or configure editor associations for automatic preview behavior (Option 2)

**Result**: Cursor users can efficiently view and compare multiple markdown documentation files side-by-side

## Implementation

**Status**: Documentation only - no code changes required

**Documented Solutions:**
1. ✅ Multiple markdown previews in Cursor: Use locked preview command
2. ✅ Alternative: Configure editor associations for automatic behavior

**Usage Instructions:**
- **Quick Method**: Use locked preview command when needed
- **Persistent Method**: Configure editor associations in settings.json

## Testing

**Test Commands:**
```bash
# Test Option 1: Locked Preview in Cursor
# 1. Open Cursor
# 2. Open ./README.md
# 3. Cmd+Shift+P → type "locked" → select "Markdown: Open Locked Preview to the Side"
# 4. Open ./CLAUDE.md (in a new editor tab)
# 5. Cmd+Shift+P → "Markdown: Open Locked Preview to the Side"
# 6. Open ./docs/PROJECT_STATUS.md
# 7. Cmd+Shift+P → "Markdown: Open Locked Preview to the Side"
# 8. Verify all three previews are visible simultaneously

# Test Option 2: Editor Associations (if configured)
# 1. Configure settings.json with workbench.editorAssociations
# 2. Open multiple markdown files
# 3. Verify each opens in preview mode automatically
# 4. Double-click preview to edit when needed
```

**Verification:**
- [x] Research completed on multiple markdown previews
- [x] Solutions documented with step-by-step instructions
- [x] Command Palette access instructions clarified for Cursor v2.0.43
- [ ] User validates locked preview works in Cursor v2.0.43
- [ ] User validates multiple previews can be open simultaneously

## Status History

- 2025-10-31 (initial): ISSUE created and documented with research findings for both multiple markdown previews and mermaid rendering
- 2025-10-31 (split): VSCode mermaid rendering content moved to ISSUE-029, this issue now focuses solely on multiple markdown previews in Cursor
- 2025-10-31: settings.json access instructions clarified for Cursor v2.0.43

## Notes

**Key Findings:**

1. **Cursor Multiple Markdown Previews**: Built-in feature exists but not widely known
   - "Markdown: Open Locked Preview to the Side" command
   - Can also use "Markdown: Toggle Preview Locking" on existing previews
   - No installation or configuration required
   - Feature inherited from VS Code base

2. **Alternative Configuration Method**: Editor associations
   - Configure `workbench.editorAssociations` in settings.json
   - Opens markdown files as previews by default
   - Requires one-time configuration

3. **Accessing settings.json in Cursor**: Not obvious in UI
   - Use Command Palette (`Cmd+Shift+P`)
   - Type "settings json"
   - Select "Preferences: Open User Settings (JSON)"

**Related Issues:**
- ISSUE-029: VSCode mermaid diagram rendering (split from this issue)

**Documentation Source**: Web research conducted 2025-10-31
- Stack Overflow discussion on multiple markdown previews
- VS Code documentation on locked preview feature
- Cursor Community Forum discussions

## Related Files

**Project Markdown Files** (examples where feature is useful):
- `./README.md` - Main project documentation
- `./CLAUDE.md` - Project instructions and conventions
- `./docs/PROJECT_STATUS.md` - Status documentation
- `./docs/TESTING_STATUS.md` - Testing documentation
- `./bugs/README.md` - Bug tracking index
- `./planning/*.md` - Feature planning documents

**No code changes required** - documentation and workflow improvement only
