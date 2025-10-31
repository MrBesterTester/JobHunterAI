---
id: ISSUE-029
title: VSCode Mermaid Diagram Rendering Support
status: open
priority: low
severity: low
component: docs
created: 2025-10-31
updated: 2025-10-31
affects: []
related: [ISSUE-028]
---

# ISSUE-029: VSCode Mermaid Diagram Rendering Support

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Summary](#summary)
- [Impact](#impact)
- [Steps to Reproduce](#steps-to-reproduce)
- [Expected Behavior](#expected-behavior)
- [Actual Behavior](#actual-behavior)
- [Root Cause](#root-cause)
- [Evidence](#evidence)
- [Proposed Solutions](#proposed-solutions)
  - [Option 1: Install "Markdown Preview Mermaid Support" Extension (Recommended)](#option-1-install-markdown-preview-mermaid-support-extension-recommended)
  - [Option 2: Install "Mermaid Preview" Extension (Alternative)](#option-2-install-mermaid-preview-extension-alternative)
- [Decision](#decision)
- [Implementation](#implementation)
- [Testing](#testing)
- [Status History](#status-history)
- [Notes](#notes)
- [Related Files](#related-files)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Summary

Enable mermaid diagram rendering in VSCode markdown preview by installing the official "Markdown Preview Mermaid Support" extension. VSCode does not include mermaid rendering in the base installation but has excellent support through an actively maintained Microsoft extension.

## Impact

**Who/What is affected:**
- Developers viewing project documentation with mermaid diagrams in VSCode
- README.md and other markdown files containing mermaid flowcharts
- Choice between VSCode and Cursor editors for documentation work

**Severity:**
- Low - mermaid diagrams still visible as code blocks without extension
- Affects visualization and documentation readability
- Can prevent switching from Cursor to VSCode

## Steps to Reproduce

**Current Behavior without Extension:**
1. Open VSCode (fresh install without mermaid extension)
2. Open `./README.md` (contains mermaid diagram)
3. Open markdown preview
4. Observe: Mermaid code block shown as plain text, not rendered as diagram

**Expected Behavior with Extension:**
1. Install "Markdown Preview Mermaid Support" extension
2. Open `./README.md`
3. Open markdown preview
4. Observe: Mermaid diagram renders as visual flowchart

## Expected Behavior

Mermaid diagrams should render as visual diagrams in markdown preview, similar to Cursor's built-in mermaid support.

## Actual Behavior

VSCode base installation shows mermaid code blocks as plain text. Extension required for diagram rendering.

## Root Cause

**Design Decision:**
- VSCode does not include mermaid rendering in base installation
- Keeps core editor lean by providing functionality through extensions
- Official Microsoft-maintained extension available on VSCode Marketplace

**Not a Bug:**
This is an intentional design choice, not a defect. Extensions provide flexibility and keep VSCode modular.

## Evidence

**Extension Details:**
- **Name**: Markdown Preview Mermaid Support
- **Author**: Matt Bierner (Microsoft)
- **Extension ID**: `bierner.markdown-mermaid`
- **Latest Version**: 1.29.0 (updated September 2025)
- **Mermaid Version Supported**: 11.12.0
- **Downloads**: 5M+
- **Marketplace URL**: https://marketplace.visualstudio.com/items?itemName=bierner.markdown-mermaid

**Alternative Extension:**
- **Name**: Mermaid Preview
- **Extension ID**: `vstirbu.vscode-mermaid-preview`
- **Features**: Pan/zoom, SVG/PNG export, syntax highlighting
- **Maintained By**: Mermaid.js creators

## Proposed Solutions

### Option 1: Install "Markdown Preview Mermaid Support" Extension (Recommended)

**Description**: Install the official Microsoft-maintained extension for mermaid rendering

**Implementation Steps:**
1. Open VSCode
2. Open Extensions view (`Cmd+Shift+X` on macOS, `Ctrl+Shift+X` on Windows/Linux)
3. Search for "Markdown Preview Mermaid Support"
4. Click Install on extension by Matt Bierner (`bierner.markdown-mermaid`)
5. Restart VSCode (if prompted)
6. Open any markdown file with mermaid diagrams
7. Mermaid diagrams will render automatically in preview

**Pros**:
- Official Microsoft-maintained extension
- Seamless integration with built-in markdown preview
- Supports latest Mermaid 11.12.0 features
- 5M+ downloads, well-tested and stable
- Free and open source
- Auto-updates with VSCode extensions

**Cons**:
- Requires one-time extension installation
- Adds ~2MB to VSCode installation size

**Implementation Effort**: 5 minutes

**Maintenance**: None - auto-updates with VSCode

### Option 2: Install "Mermaid Preview" Extension (Alternative)

**Description**: Install alternative extension with additional features

**Implementation Steps:**
1. Open VSCode
2. Open Extensions view (`Cmd+Shift+X`)
3. Search for "Mermaid Preview"
4. Install extension by vstirbu (`vstirbu.vscode-mermaid-preview`)
5. Restart VSCode

**Additional Features:**
- Pan and zoom support for large diagrams
- Export diagrams as SVG or PNG
- Syntax highlighting for mermaid code blocks
- Dedicated preview pane

**Pros**:
- More advanced features than Option 1
- Export capabilities useful for presentations
- Maintained by Mermaid.js creators

**Cons**:
- Larger extension size
- More features than needed for basic preview
- May have separate preview pane vs integrated preview

**Implementation Effort**: 5 minutes

**Maintenance**: None - auto-updates with VSCode

## Decision

**Recommendation**: Option 1 - Install "Markdown Preview Mermaid Support"

**Rationale:**
- Official Microsoft extension, best integration
- Simplest solution for basic mermaid rendering
- Most widely used (5M+ downloads)
- Lightweight and focused

**Result:** VSCode will have full mermaid diagram support, achieving feature parity with Cursor

## Implementation

**Status**: Documentation only - no code changes required

**Installation Command** (optional, for command-line installation):
```bash
code --install-extension bierner.markdown-mermaid
```

**Verification:**
```bash
# Check if extension is installed
code --list-extensions | grep markdown-mermaid
```

## Testing

**Test Commands:**
```bash
# 1. Install extension (GUI method)
#    - Open VSCode
#    - Cmd+Shift+X
#    - Search "Markdown Preview Mermaid Support"
#    - Install

# 2. Or install via command line
code --install-extension bierner.markdown-mermaid

# 3. Open markdown file with mermaid diagram
code ./README.md

# 4. Open markdown preview
#    - Cmd+Shift+V (macOS) or Ctrl+Shift+V (Windows/Linux)
#    - Or right-click in editor → "Open Preview"

# 5. Verify mermaid diagram renders as visual flowchart
```

**Verification Checklist:**
- [ ] Extension installed successfully
- [ ] VSCode restarted (if required)
- [ ] Open `./README.md` in VSCode
- [ ] Open markdown preview
- [ ] Mermaid diagram renders as visual flowchart (not code block)
- [ ] Diagram is interactive/zoomable
- [ ] Other markdown content still renders correctly

**Test Files in This Project:**
- `./README.md` - Contains mermaid diagram showing project workflow

## Status History

- 2025-10-31: ISSUE created, split from ISSUE-028 for focused documentation

## Notes

**Key Findings:**

1. **VSCode Has Excellent Mermaid Support**: The belief that "VSCode cannot render mermaid diagrams" is outdated
   - Official Microsoft extension available since 2020+
   - Latest version supports Mermaid 11.12.0
   - 5M+ downloads indicates wide adoption

2. **Extension-Based Architecture**: VSCode's modular design keeps core lean
   - Mermaid support available but not forced on all users
   - Easy to add functionality as needed
   - Better than bloating core editor

3. **Feature Parity with Cursor**: After extension installation
   - VSCode: Has locked previews + mermaid support (with extension)
   - Cursor: Has locked previews + mermaid support (built-in)
   - Both editors now fully capable for this project's documentation needs

**Migration Path:**
Users can confidently switch between Cursor and VSCode:
- Cursor: Mermaid works out-of-box
- VSCode: 5-minute extension install for mermaid support

**Documentation Source:**
- Web research conducted 2025-10-31
- VSCode Marketplace extension listings
- Mermaid extension documentation and GitHub repositories

## Related Files

**Project Files Using Mermaid Diagrams:**
- `./README.md` - Main project documentation with workflow diagram
- Any future markdown files with mermaid diagrams will also benefit

**No code changes required** - extension installation only
