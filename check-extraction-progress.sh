#!/bin/bash
# Quick script to check re-extraction progress

echo "=== Extraction Progress ==="
echo ""

# Check if extraction is running
RUNNING=$(ps aux | grep "curl.*reextract-all" | grep -v grep | wc -l)
if [ "$RUNNING" -gt 0 ]; then
    echo "✅ Re-extraction is RUNNING ($RUNNING process(es))"
else
    echo "❌ No re-extraction running"
fi

echo ""

# Check how many jobs have the new fields
JOBS_WITH_INDUSTRY=$(psql -U jobhunter_user -d jobhunter_personal -tAc "SELECT COUNT(*) FROM jobs WHERE raw_data->>'company_industry' IS NOT NULL;")
JOBS_WITH_EMPLOYMENT=$(psql -U jobhunter_user -d jobhunter_personal -tAc "SELECT COUNT(*) FROM jobs WHERE raw_data->'employment'->>'employment_type' IS NOT NULL;")
TOTAL_JOBS=$(psql -U jobhunter_user -d jobhunter_personal -tAc "SELECT COUNT(*) FROM jobs;")

echo "📊 Progress:"
echo "  • Jobs with Company Industry: $JOBS_WITH_INDUSTRY / $TOTAL_JOBS"
echo "  • Jobs with Employment Type:  $JOBS_WITH_EMPLOYMENT / $TOTAL_JOBS"

# Check result file if it exists
if [ -f /tmp/reextract_result.json ]; then
    echo ""
    echo "📄 Latest result:"
    cat /tmp/reextract_result.json | head -5
fi
