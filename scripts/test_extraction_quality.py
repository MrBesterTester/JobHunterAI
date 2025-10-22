#!/usr/bin/env python3
"""
Quality Assurance Test for LLM Extraction Method Change (html2text → dom_smoothie)

Tests whether the dom_smoothie HTML preprocessing maintains or improves extraction
quality compared to the old html2text method.

Usage:
    python3 scripts/test_extraction_quality.py

Related: bugs/fixed/ISSUE-001-html-preprocessing-llm-extraction.md
"""

import json
import os
import sys
import time
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
import urllib.request
import urllib.error

# Database connection (using psycopg2 which is commonly available)
try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    print("ERROR: psycopg2 not installed. Install with: pip3 install psycopg2-binary")
    sys.exit(1)


# Configuration
DB_CONFIG = {
    'dbname': 'jobhunter_personal',
    'user': 'jobhunter_user',
    'password': 'jobhunter_dev_password',
    'host': 'localhost',
    'port': 5432
}

API_BASE_URL = 'http://localhost:8080'
BACKUP_DIR = 'scripts'
TIMESTAMP = datetime.now().strftime('%Y-%m-%d_%H%M%S')


def get_db_connection():
    """Create database connection."""
    return psycopg2.connect(**DB_CONFIG)


def fetch_filtered_jobs(conn) -> List[Dict[str, Any]]:
    """Fetch all filtered jobs with their current extraction data."""
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("""
        SELECT
            job_id,
            title,
            company,
            location,
            salary,
            description,
            extraction_method,
            raw_data,
            created_at,
            updated_at
        FROM jobs
        WHERE status = 'filtered'
        ORDER BY created_at DESC
    """)
    jobs = cursor.fetchall()
    cursor.close()

    # Convert to regular dict and handle JSON
    result = []
    for job in jobs:
        job_dict = dict(job)
        job_dict['job_id'] = str(job_dict['job_id'])
        job_dict['created_at'] = job_dict['created_at'].isoformat() if job_dict['created_at'] else None
        job_dict['updated_at'] = job_dict['updated_at'].isoformat() if job_dict['updated_at'] else None
        result.append(job_dict)

    return result


def save_backup(jobs: List[Dict[str, Any]], filename: str):
    """Save jobs data to JSON backup file."""
    filepath = os.path.join(BACKUP_DIR, filename)
    with open(filepath, 'w') as f:
        json.dump(jobs, f, indent=2, default=str)
    print(f"✓ Backup saved: {filepath}")
    return filepath


def reextract_job(job_id: str) -> bool:
    """Call re-extraction API for a single job."""
    url = f"{API_BASE_URL}/api/intake/reextract-job/{job_id}"
    req = urllib.request.Request(url, method='POST')

    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            data = json.loads(response.read().decode())
            return data.get('success', False)
    except urllib.error.URLError as e:
        print(f"  ERROR: API call failed - {e}")
        return False
    except Exception as e:
        print(f"  ERROR: {e}")
        return False


def calculate_field_completeness(raw_data: Optional[Dict]) -> Tuple[int, int, float]:
    """
    Calculate how many fields are populated in raw_data.
    Returns: (filled_fields, total_fields, percentage)
    """
    if not raw_data:
        return (0, 0, 0.0)

    def count_filled(obj, parent_key=''):
        """Recursively count filled vs total fields."""
        filled = 0
        total = 0

        if isinstance(obj, dict):
            for key, value in obj.items():
                if isinstance(value, dict):
                    f, t = count_filled(value, f"{parent_key}.{key}")
                    filled += f
                    total += t
                elif isinstance(value, list):
                    total += 1
                    if value:  # Non-empty list counts as filled
                        filled += 1
                else:
                    total += 1
                    if value is not None and value != '':
                        filled += 1

        return filled, total

    filled, total = count_filled(raw_data)
    percentage = (filled / total * 100) if total > 0 else 0.0
    return (filled, total, percentage)


def get_tech_stack_size(raw_data: Optional[Dict]) -> int:
    """Count technologies in tech_stack array."""
    if not raw_data:
        return 0
    job_domain = raw_data.get('job_domain')
    if not job_domain or not isinstance(job_domain, dict):
        return 0
    tech_stack = job_domain.get('tech_stack', [])
    return len(tech_stack) if isinstance(tech_stack, list) else 0


def get_confidence(raw_data: Optional[Dict]) -> Optional[float]:
    """Extract confidence score from raw_data."""
    if not raw_data:
        return None
    confidence = raw_data.get('confidence')
    if confidence is not None:
        try:
            return float(confidence)
        except (ValueError, TypeError):
            return None
    return None


def compare_jobs(old_job: Dict, new_job: Dict) -> Dict[str, Any]:
    """
    Compare old vs new extraction for a single job.
    Returns comparison metrics.
    """
    comparison = {
        'job_id': old_job['job_id'],
        'title': old_job['title'],
        'old_extraction_method': old_job['extraction_method'],
        'new_extraction_method': new_job['extraction_method'],
        'fields_changed': [],
        'quality_metrics': {}
    }

    # Compare core fields
    core_fields = ['title', 'company', 'location', 'salary', 'description']
    for field in core_fields:
        old_val = old_job.get(field)
        new_val = new_job.get(field)
        if old_val != new_val:
            comparison['fields_changed'].append({
                'field': field,
                'old': old_val,
                'new': new_val
            })

    # Description quality
    old_desc_len = len(old_job.get('description') or '')
    new_desc_len = len(new_job.get('description') or '')
    old_desc_words = len((old_job.get('description') or '').split())
    new_desc_words = len((new_job.get('description') or '').split())

    comparison['quality_metrics']['description'] = {
        'old_length': old_desc_len,
        'new_length': new_desc_len,
        'old_words': old_desc_words,
        'new_words': new_desc_words,
        'length_change_pct': ((new_desc_len - old_desc_len) / old_desc_len * 100) if old_desc_len > 0 else 0
    }

    # Field completeness
    old_filled, old_total, old_pct = calculate_field_completeness(old_job.get('raw_data'))
    new_filled, new_total, new_pct = calculate_field_completeness(new_job.get('raw_data'))

    comparison['quality_metrics']['completeness'] = {
        'old_filled': old_filled,
        'old_total': old_total,
        'old_percentage': old_pct,
        'new_filled': new_filled,
        'new_total': new_total,
        'new_percentage': new_pct,
        'change_pct': new_pct - old_pct
    }

    # Tech stack
    old_tech = get_tech_stack_size(old_job.get('raw_data'))
    new_tech = get_tech_stack_size(new_job.get('raw_data'))

    comparison['quality_metrics']['tech_stack'] = {
        'old_count': old_tech,
        'new_count': new_tech,
        'change': new_tech - old_tech
    }

    # Confidence
    old_conf = get_confidence(old_job.get('raw_data'))
    new_conf = get_confidence(new_job.get('raw_data'))

    comparison['quality_metrics']['confidence'] = {
        'old': old_conf,
        'new': new_conf,
        'change': (new_conf - old_conf) if (old_conf and new_conf) else None
    }

    # Overall assessment
    regression_score = 0
    improvement_score = 0

    # Check for regressions
    if new_desc_len < old_desc_len * 0.5:  # Description >50% shorter
        regression_score += 2
    if new_pct < old_pct - 10:  # Field completeness dropped >10%
        regression_score += 2
    if new_tech < old_tech - 3:  # Lost >3 technologies
        regression_score += 1

    # Check for improvements
    if new_desc_len > old_desc_len * 1.2:  # Description >20% longer
        improvement_score += 1
    if new_pct > old_pct + 10:  # Field completeness improved >10%
        improvement_score += 2
    if new_tech > old_tech + 3:  # Gained >3 technologies
        improvement_score += 1

    if regression_score >= 3:
        comparison['assessment'] = 'REGRESSION'
    elif improvement_score >= 2:
        comparison['assessment'] = 'IMPROVED'
    else:
        comparison['assessment'] = 'SIMILAR'

    return comparison


def generate_report(comparisons: List[Dict], output_file: str):
    """Generate detailed text report from comparisons."""

    report_lines = []
    report_lines.append("=" * 80)
    report_lines.append("EXTRACTION QUALITY ASSURANCE TEST REPORT")
    report_lines.append(f"Test Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    report_lines.append("=" * 80)
    report_lines.append("")
    report_lines.append("BACKGROUND:")
    report_lines.append("  Testing impact of HTML preprocessing change:")
    report_lines.append("  Old method: html2text crate (produced bloated output)")
    report_lines.append("  New method: dom_smoothie (Mozilla Readability algorithm)")
    report_lines.append("")
    report_lines.append(f"SAMPLE SIZE: {len(comparisons)} filtered jobs")
    report_lines.append("")

    # Aggregate statistics
    improved = sum(1 for c in comparisons if c['assessment'] == 'IMPROVED')
    similar = sum(1 for c in comparisons if c['assessment'] == 'SIMILAR')
    regressed = sum(1 for c in comparisons if c['assessment'] == 'REGRESSION')

    avg_old_completeness = sum(c['quality_metrics']['completeness']['old_percentage'] for c in comparisons) / len(comparisons)
    avg_new_completeness = sum(c['quality_metrics']['completeness']['new_percentage'] for c in comparisons) / len(comparisons)

    avg_old_desc = sum(c['quality_metrics']['description']['old_length'] for c in comparisons) / len(comparisons)
    avg_new_desc = sum(c['quality_metrics']['description']['new_length'] for c in comparisons) / len(comparisons)

    avg_old_tech = sum(c['quality_metrics']['tech_stack']['old_count'] for c in comparisons) / len(comparisons)
    avg_new_tech = sum(c['quality_metrics']['tech_stack']['new_count'] for c in comparisons) / len(comparisons)

    old_confidences = [c['quality_metrics']['confidence']['old'] for c in comparisons if c['quality_metrics']['confidence']['old']]
    new_confidences = [c['quality_metrics']['confidence']['new'] for c in comparisons if c['quality_metrics']['confidence']['new']]
    avg_old_conf = sum(old_confidences) / len(old_confidences) if old_confidences else 0
    avg_new_conf = sum(new_confidences) / len(new_confidences) if new_confidences else 0

    report_lines.append("AGGREGATE RESULTS:")
    report_lines.append(f"  Improved:        {improved}/{len(comparisons)} ({improved/len(comparisons)*100:.1f}%)")
    report_lines.append(f"  Similar:         {similar}/{len(comparisons)} ({similar/len(comparisons)*100:.1f}%)")
    report_lines.append(f"  Regressed:       {regressed}/{len(comparisons)} ({regressed/len(comparisons)*100:.1f}%)")
    report_lines.append("")
    report_lines.append("QUALITY METRICS (Average):")
    report_lines.append(f"  Field Completeness:  {avg_old_completeness:.1f}% → {avg_new_completeness:.1f}% ({avg_new_completeness-avg_old_completeness:+.1f}%)")
    report_lines.append(f"  Description Length:  {avg_old_desc:.0f} → {avg_new_desc:.0f} chars ({(avg_new_desc-avg_old_desc)/avg_old_desc*100:+.1f}%)")
    report_lines.append(f"  Tech Stack Size:     {avg_old_tech:.1f} → {avg_new_tech:.1f} items ({avg_new_tech-avg_old_tech:+.1f})")
    report_lines.append(f"  Confidence Score:    {avg_old_conf:.2f} → {avg_new_conf:.2f} ({avg_new_conf-avg_old_conf:+.2f})")
    report_lines.append("")

    # Overall assessment
    report_lines.append("OVERALL ASSESSMENT:")
    if regressed / len(comparisons) >= 0.10:  # ≥10% regressions
        result = "❌ FAIL - Significant quality regression detected"
    elif improved / len(comparisons) >= 0.30:  # ≥30% improvements
        result = "✅ PASS - Quality significantly improved"
    else:
        result = "✅ PASS - Quality maintained"
    report_lines.append(f"  {result}")
    report_lines.append("")

    # Per-job details
    report_lines.append("=" * 80)
    report_lines.append("PER-JOB ANALYSIS:")
    report_lines.append("=" * 80)
    report_lines.append("")

    for i, comp in enumerate(comparisons, 1):
        report_lines.append(f"[{i}/{len(comparisons)}] {comp['title']}")
        report_lines.append(f"  Job ID: {comp['job_id']}")
        report_lines.append(f"  Assessment: {comp['assessment']}")
        report_lines.append(f"  Extraction: {comp['old_extraction_method']} → {comp['new_extraction_method']}")
        report_lines.append("")

        # Metrics
        desc = comp['quality_metrics']['description']
        report_lines.append(f"  Description: {desc['old_length']} → {desc['new_length']} chars ({desc['length_change_pct']:+.1f}%)")

        complet = comp['quality_metrics']['completeness']
        report_lines.append(f"  Completeness: {complet['old_percentage']:.1f}% → {complet['new_percentage']:.1f}% ({complet['change_pct']:+.1f}%)")

        tech = comp['quality_metrics']['tech_stack']
        report_lines.append(f"  Tech Stack: {tech['old_count']} → {tech['new_count']} items ({tech['change']:+d})")

        conf = comp['quality_metrics']['confidence']
        if conf['old'] and conf['new']:
            report_lines.append(f"  Confidence: {conf['old']:.2f} → {conf['new']:.2f} ({conf['change']:+.2f})")

        # Changed fields
        if comp['fields_changed']:
            report_lines.append(f"  Changed Fields: {len(comp['fields_changed'])}")
            for change in comp['fields_changed'][:3]:  # Show first 3
                report_lines.append(f"    - {change['field']}: '{change['old']}' → '{change['new']}'")

        report_lines.append("")

    # Write report
    filepath = os.path.join(BACKUP_DIR, output_file)
    with open(filepath, 'w') as f:
        f.write('\n'.join(report_lines))

    print(f"✓ Report generated: {filepath}")
    return filepath


def main():
    """Main test execution."""
    print("=" * 80)
    print("EXTRACTION QUALITY ASSURANCE TEST")
    print("Testing: html2text → dom_smoothie")
    print("=" * 80)
    print("")

    # Step 1: Connect to database
    print("Step 1: Connecting to database...")
    try:
        conn = get_db_connection()
        print("✓ Connected to jobhunter_personal")
    except Exception as e:
        print(f"✗ Database connection failed: {e}")
        return 1

    # Step 2: Fetch current data
    print("\nStep 2: Fetching filtered jobs...")
    try:
        old_jobs = fetch_filtered_jobs(conn)
        print(f"✓ Found {len(old_jobs)} filtered jobs")
    except Exception as e:
        print(f"✗ Failed to fetch jobs: {e}")
        conn.close()
        return 1

    # Step 3: Create backup
    print("\nStep 3: Creating backup...")
    backup_file = f"extraction_backup_{TIMESTAMP}.json"
    try:
        save_backup(old_jobs, backup_file)
    except Exception as e:
        print(f"✗ Backup failed: {e}")
        conn.close()
        return 1

    # Step 4: Re-extract all jobs
    print("\nStep 4: Re-extracting jobs via API...")
    print("(This may take several minutes...)")
    success_count = 0
    failed_jobs = []

    for i, job in enumerate(old_jobs, 1):
        job_id = job['job_id']
        title = job['title'][:50]  # Truncate for display

        print(f"  [{i}/{len(old_jobs)}] Re-extracting: {title}...")

        if reextract_job(job_id):
            success_count += 1
            time.sleep(0.5)  # Rate limiting
        else:
            failed_jobs.append((job_id, title))
            print(f"    ✗ FAILED")

    print(f"\n✓ Re-extraction complete: {success_count}/{len(old_jobs)} successful")
    if failed_jobs:
        print(f"  Failed jobs: {len(failed_jobs)}")
        for job_id, title in failed_jobs[:5]:
            print(f"    - {title} ({job_id})")

    # Step 5: Fetch new data
    print("\nStep 5: Fetching updated job data...")
    try:
        new_jobs = fetch_filtered_jobs(conn)
        print(f"✓ Fetched {len(new_jobs)} jobs")
    except Exception as e:
        print(f"✗ Failed to fetch updated jobs: {e}")
        conn.close()
        return 1

    conn.close()

    # Step 6: Compare old vs new
    print("\nStep 6: Analyzing quality changes...")

    # Match jobs by ID
    old_jobs_dict = {job['job_id']: job for job in old_jobs}
    new_jobs_dict = {job['job_id']: job for job in new_jobs}

    comparisons = []
    for job_id in old_jobs_dict:
        if job_id in new_jobs_dict:
            comp = compare_jobs(old_jobs_dict[job_id], new_jobs_dict[job_id])
            comparisons.append(comp)

    print(f"✓ Analyzed {len(comparisons)} jobs")

    # Step 7: Generate report
    print("\nStep 7: Generating report...")
    report_file = f"extraction_qa_report_{TIMESTAMP}.txt"
    try:
        generate_report(comparisons, report_file)
    except Exception as e:
        print(f"✗ Report generation failed: {e}")
        return 1

    # Quick summary
    improved = sum(1 for c in comparisons if c['assessment'] == 'IMPROVED')
    similar = sum(1 for c in comparisons if c['assessment'] == 'SIMILAR')
    regressed = sum(1 for c in comparisons if c['assessment'] == 'REGRESSION')

    print("\n" + "=" * 80)
    print("QUICK SUMMARY:")
    print(f"  Improved:  {improved}/{len(comparisons)}")
    print(f"  Similar:   {similar}/{len(comparisons)}")
    print(f"  Regressed: {regressed}/{len(comparisons)}")

    if regressed / len(comparisons) >= 0.10:
        print(f"\n  Result: ❌ FAIL - {regressed} regressions (≥10% threshold)")
        print("=" * 80)
        return 1
    else:
        print(f"\n  Result: ✅ PASS - Quality maintained or improved")
        print("=" * 80)
        return 0


if __name__ == '__main__':
    sys.exit(main())
