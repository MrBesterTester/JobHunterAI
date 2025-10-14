#!/bin/bash
# Test to verify Total calculation matches intake logic: Total = Filtered + Duplicates + Failed

set -e

echo "🧪 Testing Total Calculation Logic"
echo "=================================="
echo ""

# Get stats from API
echo "Fetching stats from API..."
STATS=$(curl -s http://localhost:8080/api/jobs/stats)
echo "Raw stats: $STATS"
echo ""

# Parse values using grep and sed
FILTERED=$(echo "$STATS" | grep -o '"filtered":[0-9]*' | sed 's/[^0-9]//g')
DUPLICATED=$(echo "$STATS" | grep -o '"duplicated":[0-9]*' | sed 's/[^0-9]//g')
FAILED=$(echo "$STATS" | grep -o '"failed":[0-9]*' | sed 's/[^0-9]//g')

# Default to 0 if not found
FILTERED=${FILTERED:-0}
DUPLICATED=${DUPLICATED:-0}
FAILED=${FAILED:-0}

echo "Parsed values:"
echo "  Filtered: $FILTERED"
echo "  Duplicates: $DUPLICATED"
echo "  Failed: $FAILED"
echo ""

# Calculate expected total
EXPECTED_TOTAL=$((FILTERED + DUPLICATED + FAILED))
echo "Expected Total (Filtered + Duplicates + Failed): $EXPECTED_TOTAL"
echo ""

# Verify database matches
echo "Verifying database values..."
DB_FILTERED=$(psql -U jobhunter_user -d jobhunter_personal -t -c "SELECT COUNT(*) FROM jobs WHERE status = 'filtered';")
DB_TOTAL=$(psql -U jobhunter_user -d jobhunter_personal -t -c "SELECT SUM(jobs_discovered) FROM job_intake_logs WHERE sync_status = 'completed';")

# Trim whitespace
DB_FILTERED=$(echo "$DB_FILTERED" | xargs)
DB_TOTAL=$(echo "$DB_TOTAL" | xargs)

echo "Database verification:"
echo "  Filtered jobs in DB: $DB_FILTERED"
echo "  Total discovered in intake logs: $DB_TOTAL"
echo ""

# Verify logic
if [ "$EXPECTED_TOTAL" -eq "$DB_TOTAL" ]; then
    echo "✅ PASS: Expected total ($EXPECTED_TOTAL) matches database total discovered ($DB_TOTAL)"
else
    echo "❌ FAIL: Expected total ($EXPECTED_TOTAL) does not match database total discovered ($DB_TOTAL)"
    exit 1
fi

if [ "$FILTERED" -eq "$DB_FILTERED" ]; then
    echo "✅ PASS: API filtered count ($FILTERED) matches database ($DB_FILTERED)"
else
    echo "❌ FAIL: API filtered count ($FILTERED) does not match database ($DB_FILTERED)"
    exit 1
fi

echo ""
echo "=================================="
echo "Test Summary:"
echo "  Filtered: $FILTERED"
echo "  Duplicates: $DUPLICATED"
echo "  Failed: $FAILED"
echo "  Total: $EXPECTED_TOTAL"
echo "✅ All tests passed!"
