#!/bin/bash
# Bulk re-extract all Gmail jobs with updated LLM prompt and fixed backend
# This updates company_industry, employment_type_source, and other structured fields

set -e  # Exit on error

echo "═══════════════════════════════════════════"
echo "Bulk Job Re-extraction Tool"
echo "═══════════════════════════════════════════"
echo ""

# Check if backend is running
if ! lsof -i :8080 | grep -q LISTEN; then
    echo "❌ Error: Backend is not running on port 8080"
    echo "   Please start the backend first: cd backend && cargo run"
    exit 1
fi

# Get count of jobs to re-extract
JOB_COUNT=$(psql -U jobhunter_user -d jobhunter_personal -tAc "
    SELECT COUNT(*)
    FROM jobs j
    JOIN email_jobs e ON j.job_id = e.job_id
    WHERE j.source = 'gmail'
      AND e.body_text IS NOT NULL;
")

echo "📊 Found $JOB_COUNT Gmail jobs to re-extract"
echo ""

# Estimate time (10 seconds per job)
ESTIMATED_MINUTES=$(( (JOB_COUNT * 10) / 60 ))
echo "⏱️  Estimated time: ~${ESTIMATED_MINUTES} minutes"
echo ""

# Confirm before proceeding
read -p "🔄 Proceed with bulk re-extraction? [y/N] " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Re-extraction cancelled"
    exit 0
fi

echo ""
echo "🚀 Starting bulk re-extraction..."
echo "   Start time: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

START_TIME=$(date +%s)

# Trigger re-extraction
RESPONSE=$(curl -s -X POST http://localhost:8080/api/intake/reextract-all)

# Parse response
UPDATED=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('updated', 0))" 2>/dev/null || echo "0")
FAILED=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('failed', 0))" 2>/dev/null || echo "0")

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

echo ""
echo "═══════════════════════════════════════════"
echo "✅ Re-extraction Complete!"
echo "═══════════════════════════════════════════"
echo ""
echo "📈 Results:"
echo "   ✅ Updated: $UPDATED jobs"
echo "   ❌ Failed:  $FAILED jobs"
echo ""
echo "⏱️  Duration: ${MINUTES}m ${SECONDS}s"
echo "   End time: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

if [ "$FAILED" -gt 0 ]; then
    echo "⚠️  Some jobs failed to re-extract. Check backend logs for details."
    echo ""
fi

# Show sample of updated data
echo "📋 Sample of updated fields (first 5 jobs):"
psql -U jobhunter_user -d jobhunter_personal <<EOF
SELECT
  LEFT(job_id::text, 8) as job_id,
  LEFT(title, 30) as title,
  raw_data->>'company_industry' as industry,
  raw_data->'employment'->>'employment_type' as emp_type,
  raw_data->'employment'->>'employment_type_source' as source
FROM jobs
WHERE source = 'gmail'
  AND raw_data->>'company_industry' IS NOT NULL
ORDER BY updated_at DESC
LIMIT 5;
EOF

echo ""
echo "💡 Refresh your browser to see the updated job cards!"
echo ""
