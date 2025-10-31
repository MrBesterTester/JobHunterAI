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

**Note on Automation**: There is NO setting to automatically lock all markdown previews. VS Code/Cursor does not provide a way to automatically create locked previews - you MUST manually lock each preview using the commands above. This is by design to give users control over which previews remain visible.

**Pros**:
- Built-in feature, no installation required
- Works immediately in Cursor
- Stable and well-supported
- Can have unlimited locked previews
- Only way to achieve multiple simultaneous previews

**Cons**:
- Requires manual locking for each preview (cannot be automated)
- Not obvious/discoverable feature
- Need to remember keyboard shortcut or command palette command

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
5. To edit: Double-click the preview content in the preview pane (not in file explorer)

**IMPORTANT LIMITATION**: This option makes files open in preview mode by default, BUT you still only get ONE preview at a time. Opening a second markdown file will replace the first preview. To have multiple previews visible simultaneously, you MUST also use Option 1 to manually lock each preview.

**Recommended Workflow**: Combine Option 2 with Option 1
- Configure Option 2 so markdown files open as previews automatically
- When you want to keep a preview visible, use Option 1 to lock it
- Open next markdown file (opens as preview due to Option 2)
- Lock that preview too if you want to keep it visible
- Repeat for as many simultaneous previews as needed

**Pros**:
- Files open directly in preview mode (convenient)
- Set once and forget (for the preview default behavior)
- Can still use Option 1 to lock previews when needed

**Cons**:
- Changes default markdown file opening behavior
- May not want preview mode by default for all workflows
- Still requires manual locking (Option 1) to have multiple previews simultaneously
- Need to double-click in preview pane to edit

**Implementation Effort**: 2 minutes

**Maintenance**: None - configuration persists

## Decision

**Recommendation**: Combine Option 1 + Option 2 for Best Workflow

**Rationale:**
- Option 2 alone does NOT give multiple previews (still only one at a time)
- Option 1 is the ONLY way to have multiple previews simultaneously
- Combining both provides the best user experience:
  - Option 2: Markdown files open as previews automatically (convenience)
  - Option 1: Manually lock previews you want to keep visible (control)

**Optimal Workflow:**
1. **One-time setup**: Configure Option 2 (editor associations in settings.json)
   - Markdown files will open in preview mode by default
2. **Daily workflow**: Use Option 1 as needed
   - When you want to keep a preview visible, lock it with `Cmd+Shift+P` → "Markdown: Toggle Preview Locking"
   - Open next markdown file (opens as preview automatically)
   - Lock that one too if you want multiple visible
   - Close unlocked previews when done

**Important**: Option 1 cannot be automated. You must manually lock each preview you want to keep. This is by VS Code/Cursor design.

**Result**: Efficient markdown review workflow with previews opening automatically and manual control over which previews stay visible

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
- 2025-10-31 (settings.json): settings.json access instructions clarified for Cursor v2.0.43
- 2025-10-31 (user feedback): Updated based on real-world testing
  - Clarified Option 2's limitation: still only one preview at a time without manual locking
  - Added note that Option 1 cannot be automated
  - Documented double-click editing requirement (must be in preview pane)
  - Updated recommendation to combine both options for best workflow
  - Added web research confirming no automatic locking setting exists

## Notes

**Key Findings:**

1. **Cursor Multiple Markdown Previews**: Built-in feature exists but not widely known
   - "Markdown: Open Locked Preview to the Side" command
   - Can also use "Markdown: Toggle Preview Locking" on existing previews
   - No installation or configuration required
   - Feature inherited from VS Code base
   - **CRITICAL**: This is the ONLY way to have multiple previews simultaneously
   - **Cannot be automated** - must manually lock each preview you want to keep

2. **Editor Associations Limitation Discovered**: Option 2 alone is insufficient
   - Configure `workbench.editorAssociations` makes files open as previews automatically
   - **BUT still only one preview at a time** - opening a new file replaces the previous preview
   - Must combine with Option 1 (manual locking) to have multiple simultaneous previews
   - Useful for convenience but doesn't solve the multiple preview problem by itself

3. **Accessing settings.json in Cursor**: Not obvious in UI
   - Use Command Palette (`Cmd+Shift+P`)
   - Type "settings json"
   - Select "Preferences: Open User Settings (JSON)"

4. **Double-Click Editing**: Must be done in preview pane
   - When using Option 2, markdown files open in preview mode
   - To edit: Double-click the preview content in the preview pane itself
   - Don't double-click in file explorer - that just opens another preview

5. **Recommended Combined Workflow**: Best user experience
   - Configure Option 2 once (files open as previews automatically)
   - Use Option 1 manually to lock each preview you want to keep visible
   - Provides convenience + control over multiple simultaneous previews

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
