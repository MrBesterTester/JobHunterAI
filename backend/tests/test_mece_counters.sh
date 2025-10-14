#!/bin/bash

# Test MECE Counter System
# Validates that the intake log counters are Mutually Exclusive and Collectively Exhaustive

set -e

echo "🧪 Testing MECE Counter System"
echo ""

API_URL="http://localhost:8080"

# Check if backend is running
if ! curl -sf "${API_URL}/api/intake/logs?limit=1" > /dev/null; then
    echo "❌ Backend is not running at ${API_URL}"
    echo "Start it with: cd backend && cargo run"
    exit 1
fi

echo "✅ Backend is running"
echo ""

# Fetch the most recent intake log
echo "📊 Fetching most recent intake log..."
RESPONSE=$(curl -s "${API_URL}/api/intake/logs?limit=1")

# Extract values using Python
RESULT=$(echo "$RESPONSE" | python3 -c "
import json, sys
data = json.load(sys.stdin)
if not data:
    print('ERROR:No logs found')
    sys.exit(1)

log = data[0]
discovered = log['jobs_discovered']
failed = log['jobs_failed_processing']
duplicated = log['jobs_duplicated']
created = log['jobs_created']
validation_error = log.get('validation_error')

print(f'DISCOVERED:{discovered}')
print(f'FAILED:{failed}')
print(f'DUPLICATED:{duplicated}')
print(f'CREATED:{created}')
print(f'VALIDATION_ERROR:{validation_error}')

# Calculate sum
total = failed + duplicated + created
print(f'SUM:{total}')

# Validate MECE property
if total == discovered:
    print('MECE:PASS')
else:
    print('MECE:FAIL')
")

# Check for errors
if echo "$RESULT" | grep -q "^ERROR:"; then
    ERROR_MSG=$(echo "$RESULT" | grep "^ERROR:" | cut -d':' -f2-)
    echo "❌ ${ERROR_MSG}"
    exit 1
fi

# Parse results
DISCOVERED=$(echo "$RESULT" | grep "^DISCOVERED:" | cut -d':' -f2)
FAILED=$(echo "$RESULT" | grep "^FAILED:" | cut -d':' -f2)
DUPLICATED=$(echo "$RESULT" | grep "^DUPLICATED:" | cut -d':' -f2)
CREATED=$(echo "$RESULT" | grep "^CREATED:" | cut -d':' -f2)
VALIDATION_ERROR=$(echo "$RESULT" | grep "^VALIDATION_ERROR:" | cut -d':' -f2-)
SUM=$(echo "$RESULT" | grep "^SUM:" | cut -d':' -f2)
MECE_STATUS=$(echo "$RESULT" | grep "^MECE:" | cut -d':' -f2)

echo "Counter Values:"
echo "  📧 Discovered:        ${DISCOVERED}"
echo "  ✗ Failed Processing:  ${FAILED}"
echo "  ⊕ Duplicated:         ${DUPLICATED}"
echo "  ✓ Created:            ${CREATED}"
echo ""
echo "Validation:"
echo "  Sum (F+D+C):          ${SUM}"
echo "  Expected:             ${DISCOVERED}"
echo ""

if [ "$MECE_STATUS" = "PASS" ]; then
    echo "✅ MECE Counter Test: PASSED"
    echo "   The counters are Mutually Exclusive and Collectively Exhaustive"
    echo "   Formula: Discovered (${DISCOVERED}) = Failed (${FAILED}) + Duplicated (${DUPLICATED}) + Created (${CREATED})"

    if [ "$VALIDATION_ERROR" != "None" ] && [ ! -z "$VALIDATION_ERROR" ]; then
        echo ""
        echo "⚠️  Warning: Backend reported a validation error:"
        echo "   ${VALIDATION_ERROR}"
        exit 1
    fi

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✨ All tests passed!"
    exit 0
else
    echo "❌ MECE Counter Test: FAILED"
    echo "   The counters do not add up correctly"
    echo "   Expected: ${DISCOVERED}"
    echo "   Got: ${SUM}"

    if [ "$VALIDATION_ERROR" != "None" ] && [ ! -z "$VALIDATION_ERROR" ]; then
        echo ""
        echo "Backend validation error:"
        echo "   ${VALIDATION_ERROR}"
    fi

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 1
fi
