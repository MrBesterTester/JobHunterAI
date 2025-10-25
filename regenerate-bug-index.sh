#!/bin/bash

# regenerate-bug-index.sh - Regenerate bug tracking index from any directory
# Usage: ./regenerate-bug-index.sh
#
# This script can be run from any directory in the project.
# It automatically finds the project root and runs the Python script.

set -e

# Find the project root (directory containing this script)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Change to project root
cd "$SCRIPT_DIR"

# Run the Python script
python3 scripts/generate-bug-index.py
