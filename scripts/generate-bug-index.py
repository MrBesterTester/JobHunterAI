#!/usr/bin/env python3
"""
Bug Tracking System Index Generator

Scans bugs/{open,mitigated,fixed,duplicate}/*.md files, parses YAML frontmatter,
and generates bugs/README.md with organized tables by status.

Usage:
    python3 scripts/generate-bug-index.py
    # or
    ./scripts/generate-bug-index.py
"""

import os
import re
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional
from collections import defaultdict

# YAML frontmatter parser (simple, no dependencies)
def parse_frontmatter(content: str) -> Optional[Dict[str, any]]:
    """
    Parse YAML frontmatter from markdown file.

    Returns dict of frontmatter fields, or None if no frontmatter found.
    Handles files with TOC sections at the beginning.
    """
    # Match content between --- delimiters (may not be at very start due to TOC)
    match = re.search(r'^---\s*\n(.*?)\n---\s*\n', content, re.MULTILINE | re.DOTALL)
    if not match:
        return None

    yaml_content = match.group(1)
    frontmatter = {}

    # Parse simple YAML (key: value format)
    for line in yaml_content.split('\n'):
        line = line.strip()
        if not line or line.startswith('#'):
            continue

        if ':' in line:
            key, value = line.split(':', 1)
            key = key.strip()
            value = value.strip()

            # Remove quotes from strings
            if value.startswith('"') and value.endswith('"'):
                value = value[1:-1]
            elif value.startswith("'") and value.endswith("'"):
                value = value[1:-1]

            # Parse lists [item1, item2]
            if value.startswith('[') and value.endswith(']'):
                value = [item.strip() for item in value[1:-1].split(',') if item.strip()]

            # Parse comments (value after #)
            if '#' in value:
                value = value.split('#')[0].strip()

            frontmatter[key] = value

    return frontmatter


def scan_bug_files(bugs_dir: Path) -> Dict[str, List[Dict]]:
    """
    Scan bugs directory and organize bugs by status.

    Returns: {'open': [...], 'mitigated': [...], 'fixed': [...], 'duplicate': [...]}
    """
    bugs_by_status = {
        'open': [],
        'mitigated': [],
        'fixed': [],
        'duplicate': []
    }

    for status in ['open', 'mitigated', 'fixed', 'duplicate']:
        status_dir = bugs_dir / status
        if not status_dir.exists():
            continue

        for bug_file in status_dir.glob('*.md'):
            if bug_file.name == 'README.md':
                continue

            try:
                content = bug_file.read_text(encoding='utf-8')
                frontmatter = parse_frontmatter(content)

                if not frontmatter:
                    print(f"Warning: No frontmatter in {bug_file}")
                    continue

                # Add file path for linking
                frontmatter['file_path'] = f"{status}/{bug_file.name}"
                frontmatter['status_dir'] = status

                bugs_by_status[status].append(frontmatter)

            except Exception as e:
                print(f"Error reading {bug_file}: {e}")

    # Sort bugs by ID within each status
    for status in bugs_by_status:
        bugs_by_status[status].sort(key=lambda b: b.get('id', ''))

    return bugs_by_status


def generate_summary_stats(bugs_by_status: Dict[str, List[Dict]]) -> str:
    """Generate summary statistics section."""
    total = sum(len(bugs) for bugs in bugs_by_status.values())
    open_count = len(bugs_by_status['open'])
    mitigated_count = len(bugs_by_status['mitigated'])
    fixed_count = len(bugs_by_status['fixed'])
    duplicate_count = len(bugs_by_status['duplicate'])

    return f"""## Summary

**Total Bugs**: {total}
- **Open**: {open_count}
- **Mitigated**: {mitigated_count}
- **Fixed**: {fixed_count}
- **Duplicate**: {duplicate_count}

**Last Updated**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
"""


def generate_table(bugs: List[Dict], status: str) -> str:
    """Generate markdown table for bugs of a given status."""
    if not bugs:
        return f"No {status} bugs.\n"

    table = f"""### {status.capitalize()} ({len(bugs)})

| ID | Title | Priority | Component | Created | Updated |
|----|-------|----------|-----------|---------|---------|
"""

    for bug in bugs:
        bug_id = bug.get('id', 'N/A')
        title = bug.get('title', 'Untitled')
        priority = bug.get('priority', 'N/A')
        component = bug.get('component', 'N/A')
        created = bug.get('created', 'N/A')
        updated = bug.get('updated', 'N/A')
        file_path = bug.get('file_path', '')

        # Create link to bug file
        title_link = f"[{title}]({file_path})"

        table += f"| {bug_id} | {title_link} | {priority} | {component} | {created} | {updated} |\n"

    return table


def generate_priority_breakdown(bugs_by_status: Dict[str, List[Dict]]) -> str:
    """Generate priority breakdown across all bugs."""
    priority_counts = defaultdict(int)

    for bugs in bugs_by_status.values():
        for bug in bugs:
            priority = bug.get('priority', 'unknown')
            priority_counts[priority] += 1

    if not priority_counts:
        return ""

    breakdown = "\n## Priority Breakdown\n\n"
    for priority in ['critical', 'high', 'medium', 'low', 'unknown']:
        if priority in priority_counts:
            breakdown += f"- **{priority.capitalize()}**: {priority_counts[priority]}\n"

    return breakdown


def generate_component_breakdown(bugs_by_status: Dict[str, List[Dict]]) -> str:
    """Generate component breakdown across all bugs."""
    component_counts = defaultdict(int)

    for bugs in bugs_by_status.values():
        for bug in bugs:
            component = bug.get('component', 'unknown')
            component_counts[component] += 1

    if not component_counts:
        return ""

    breakdown = "\n## Component Breakdown\n\n"
    for component in sorted(component_counts.keys()):
        breakdown += f"- **{component}**: {component_counts[component]}\n"

    return breakdown


def generate_readme(bugs_by_status: Dict[str, List[Dict]]) -> str:
    """Generate complete bugs/README.md content."""
    readme = """# Bug Tracking Index

This directory contains the project's bug tracking system with individual files per bug.

"""

    # Summary stats
    readme += generate_summary_stats(bugs_by_status)

    # Priority breakdown
    readme += generate_priority_breakdown(bugs_by_status)

    # Component breakdown
    readme += generate_component_breakdown(bugs_by_status)

    readme += "\n---\n\n"

    # Tables by status
    readme += "## Open Bugs\n\n"
    readme += generate_table(bugs_by_status['open'], 'open')

    readme += "\n## Mitigated Bugs\n\n"
    readme += generate_table(bugs_by_status['mitigated'], 'mitigated')

    readme += "\n## Fixed Bugs\n\n"
    readme += generate_table(bugs_by_status['fixed'], 'fixed')

    readme += "\n## Duplicate Bugs\n\n"
    readme += generate_table(bugs_by_status['duplicate'], 'duplicate')

    # Footer
    readme += """
---

## How to Use This System

### Reporting a New Bug

1. Copy `BUG-TEMPLATE.md` to `bugs/open/BUG-XXXX-short-description.md`
2. Increment the bug ID (check existing bugs for next number)
3. Fill out all sections of the template
4. Run `./scripts/generate-bug-index.py` to update this index
5. Commit the new bug file and updated README.md

### Moving a Bug Between States

- **Open → Mitigated**: Move file from `bugs/open/` to `bugs/mitigated/`, update `status: mitigated` in frontmatter
- **Mitigated → Fixed**: Move file from `bugs/mitigated/` to `bugs/fixed/`, update `status: fixed` and add `fixed: YYYY-MM-DD`
- **Open → Fixed**: Move file from `bugs/open/` to `bugs/fixed/`, update `status: fixed` and add `fixed: YYYY-MM-DD`

After moving, run `./scripts/generate-bug-index.py` to update this index.

### Regenerating This Index

```bash
./scripts/generate-bug-index.py
# or
python3 scripts/generate-bug-index.py
```

---

**Auto-generated by**: `scripts/generate-bug-index.py`
**Generated on**: """ + datetime.now().strftime('%Y-%m-%d %H:%M:%S') + "\n"

    return readme


def main():
    """Main entry point."""
    # Determine project root (parent of scripts/)
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    bugs_dir = project_root / 'bugs'

    if not bugs_dir.exists():
        print(f"Error: bugs/ directory not found at {bugs_dir}")
        return 1

    print(f"Scanning bugs directory: {bugs_dir}")

    # Scan bug files
    bugs_by_status = scan_bug_files(bugs_dir)

    # Print summary
    total = sum(len(bugs) for bugs in bugs_by_status.values())
    print(f"Found {total} bugs:")
    print(f"  - Open: {len(bugs_by_status['open'])}")
    print(f"  - Mitigated: {len(bugs_by_status['mitigated'])}")
    print(f"  - Fixed: {len(bugs_by_status['fixed'])}")
    print(f"  - Duplicate: {len(bugs_by_status['duplicate'])}")

    # Generate README
    readme_content = generate_readme(bugs_by_status)

    # Write to bugs/README.md
    readme_path = bugs_dir / 'README.md'
    readme_path.write_text(readme_content, encoding='utf-8')

    print(f"\nGenerated: {readme_path}")
    print("Bug index updated successfully!")

    return 0


if __name__ == '__main__':
    exit(main())
