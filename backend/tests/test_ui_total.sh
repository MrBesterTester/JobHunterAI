#!/bin/bash
# Test to verify UI Total display matches intake logic: Total = Filtered + Duplicates + Failed

set -e

echo "🧪 Testing UI Total Display"
echo "=================================="
echo ""

# Get stats from API
echo "1. Fetching stats from backend API..."
STATS=$(curl -s http://localhost:8080/api/jobs/stats)
echo "   Stats: $STATS"
echo ""

# Parse values
FILTERED=$(echo "$STATS" | grep -o '"filtered":[0-9]*' | sed 's/[^0-9]//g')
DUPLICATED=$(echo "$STATS" | grep -o '"duplicated":[0-9]*' | sed 's/[^0-9]//g')
FAILED=$(echo "$STATS" | grep -o '"failed":[0-9]*' | sed 's/[^0-9]//g')

# Default to 0 if not found
FILTERED=${FILTERED:-0}
DUPLICATED=${DUPLICATED:-0}
FAILED=${FAILED:-0}

EXPECTED_TOTAL=$((FILTERED + DUPLICATED + FAILED))

echo "2. API values:"
echo "   Filtered: $FILTERED"
echo "   Duplicates: $DUPLICATED"
echo "   Failed: $FAILED"
echo "   Expected Total: $EXPECTED_TOTAL"
echo ""

# Verify against database
echo "3. Verifying against database..."
DB_DISCOVERED=$(psql -U jobhunter_user -d jobhunter_personal -t -c "SELECT COALESCE(SUM(jobs_discovered), 0) FROM job_intake_logs WHERE sync_status = 'completed';" | xargs)
DB_CREATED=$(psql -U jobhunter_user -d jobhunter_personal -t -c "SELECT COALESCE(SUM(jobs_created), 0) FROM job_intake_logs WHERE sync_status = 'completed';" | xargs)
DB_DUPED=$(psql -U jobhunter_user -d jobhunter_personal -t -c "SELECT COALESCE(SUM(jobs_duplicated), 0) FROM job_intake_logs WHERE sync_status = 'completed';" | xargs)
DB_FAILED=$(psql -U jobhunter_user -d jobhunter_personal -t -c "SELECT COALESCE(SUM(jobs_failed_processing), 0) FROM job_intake_logs WHERE sync_status = 'completed';" | xargs)

echo "   Database discovered: $DB_DISCOVERED"
echo "   Database created: $DB_CREATED (filtered)"
echo "   Database duplicated: $DB_DUPED"
echo "   Database failed: $DB_FAILED"
echo ""

# Verify arithmetic
DB_CALC=$((DB_CREATED + DB_DUPED + DB_FAILED))
echo "4. Verification:"
echo "   Created + Duped + Failed = $DB_CREATED + $DB_DUPED + $DB_FAILED = $DB_CALC"

if [ "$DB_CALC" -eq "$DB_DISCOVERED" ]; then
    echo "   ✅ PASS: Calculation ($DB_CALC) matches discovered ($DB_DISCOVERED)"
else
    echo "   ❌ FAIL: Calculation ($DB_CALC) does not match discovered ($DB_DISCOVERED)"
    exit 1
fi

if [ "$EXPECTED_TOTAL" -eq "$DB_DISCOVERED" ]; then
    echo "   ✅ PASS: Expected total ($EXPECTED_TOTAL) matches database ($DB_DISCOVERED)"
else
    echo "   ❌ FAIL: Expected total ($EXPECTED_TOTAL) does not match database ($DB_DISCOVERED)"
    exit 1
fi

echo ""
echo "=================================="
echo "✅ All tests passed!"
echo ""
echo "Summary:"
echo "  The UI should display:"
echo "    Filtered: $FILTERED"
echo "    Duplicates: $DUPLICATED"
echo "    Failed: $FAILED"
echo "    Total: $EXPECTED_TOTAL"
echo ""
echo "  This matches the intake logic:"
echo "    Discovered ($DB_DISCOVERED) = Created ($DB_CREATED) + Duplicated ($DB_DUPED) + Failed ($DB_FAILED)"
