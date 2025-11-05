#!/bin/bash

# regenerate-bug-index.sh - Regenerate bug tracking index from any directory
# Usage: ./regenerate-bug-index.sh
#
# This script can be run from any directory in the project.
# It automatically finds the project root and runs the Python script.

set -e

# Find the project root (one level up from helper-scripts directory)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Change to project root
cd "$PROJECT_ROOT"

# Run the Python script
python3 scripts/generate-bug-index.py
