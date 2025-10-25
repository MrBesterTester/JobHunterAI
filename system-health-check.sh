#!/bin/bash

# system-health-check.sh
# Consolidated system health monitoring and cleanup script for macOS
# Created for ISSUE-019: Prevent system overload during Claude Code sessions
#
# Usage:
#   ./system-health-check.sh           # Quick health check
#   ./system-health-check.sh --help    # Show help
#   ./system-health-check.sh --full    # Full diagnostic with hardware checks
#   ./system-health-check.sh --cleanup # Cleanup orphaned processes (with confirmation)
#   ./system-health-check.sh --monitor # Monitor during long sessions

set -e

# Color codes for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Thresholds
WARN_MEMORY_PERCENT=80
CRITICAL_MEMORY_PERCENT=90
WARN_PROCESS_COUNT=50
CRITICAL_PROCESS_COUNT=100
WARN_CPU_TEMP=75
CRITICAL_CPU_TEMP=85

# Helper functions
print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Help text
show_help() {
    cat << EOF
System Health Check Script for Claude Code Sessions

Usage:
  ./system-health-check.sh           Quick health check (default)
  ./system-health-check.sh --help    Show this help message
  ./system-health-check.sh --full    Full diagnostic with hardware checks
  ./system-health-check.sh --cleanup Cleanup orphaned processes (with confirmation)
  ./system-health-check.sh --monitor Monitor during long sessions (runs continuously)

Purpose:
  Monitors system resources to prevent issues like those in ISSUE-019 where
  system became unresponsive during intensive test sessions.

What it checks:
  - Memory usage and pressure
  - CPU load and process counts
  - Node.js, Vitest, and Claude Code background processes
  - Thermal status (--full mode)
  - SSD health and free space (--full mode)

Examples:
  # Before starting a long Claude Code session
  ./system-health-check.sh

  # During intensive test runs
  ./system-health-check.sh --monitor

  # After completing work
  ./system-health-check.sh --cleanup

EOF
}

# Quick health check
quick_health_check() {
    print_header "Quick Health Check"
    echo ""

    # Memory usage
    memory_info=$(vm_stat | perl -ne '/page size of (\d+)/ and $size=$1; /Pages\s+([^:]+)[^\d]+(\d+)/ and printf("%-16s % 16.2f MB\n", "$1:", $2 * $size / 1048576);')
    total_memory=$(sysctl -n hw.memsize)
    total_memory_gb=$(echo "scale=2; $total_memory / 1073741824" | bc)

    # Calculate memory usage percentage
    mem_used=$(echo "$memory_info" | grep -E "(active|wired down|occupied)" | awk '{sum += $2} END {print sum}')
    mem_used_mb=$(printf "%.0f" "$mem_used")
    mem_percent=$(echo "scale=1; ($mem_used_mb * 100) / ($total_memory_gb * 1024)" | bc)

    echo "Memory: ${mem_used_mb} MB / ${total_memory_gb} GB (${mem_percent}%)"

    if (( $(echo "$mem_percent > $CRITICAL_MEMORY_PERCENT" | bc -l) )); then
        print_error "CRITICAL: Memory usage above ${CRITICAL_MEMORY_PERCENT}%"
    elif (( $(echo "$mem_percent > $WARN_MEMORY_PERCENT" | bc -l) )); then
        print_warning "WARNING: Memory usage above ${WARN_MEMORY_PERCENT}%"
    else
        print_success "Memory usage normal"
    fi
    echo ""

    # Process counts
    print_header "Process Counts"
    node_processes=$(pgrep -f "node" | wc -l | xargs)
    vitest_processes=$(pgrep -f "vitest" | wc -l | xargs)
    claude_processes=$(pgrep -f "claude" | wc -l | xargs)
    total_processes=$(ps aux | wc -l | xargs)

    echo "Node.js processes:  $node_processes"
    echo "Vitest processes:   $vitest_processes"
    echo "Claude processes:   $claude_processes"
    echo "Total processes:    $total_processes"

    if [ "$node_processes" -gt "$CRITICAL_PROCESS_COUNT" ]; then
        print_error "CRITICAL: Node.js process count exceeds $CRITICAL_PROCESS_COUNT"
    elif [ "$node_processes" -gt "$WARN_PROCESS_COUNT" ]; then
        print_warning "WARNING: Node.js process count exceeds $WARN_PROCESS_COUNT"
    else
        print_success "Process counts normal"
    fi
    echo ""

    # CPU load
    print_header "CPU Load"
    cpu_cores=$(sysctl -n hw.ncpu)
    load_avg=$(uptime | awk -F'load averages:' '{print $2}' | xargs)
    echo "CPU cores: $cpu_cores"
    echo "Load average: $load_avg"

    load_1min=$(echo "$load_avg" | awk '{print $1}')
    load_threshold=$(echo "$cpu_cores * 0.8" | bc)

    if (( $(echo "$load_1min > $load_threshold" | bc -l) )); then
        print_warning "WARNING: High CPU load (${load_1min} vs ${cpu_cores} cores)"
    else
        print_success "CPU load normal"
    fi
    echo ""
}

# Full hardware diagnostic
full_diagnostic() {
    quick_health_check

    # Thermal status
    print_header "Thermal Status"
    if command -v powermetrics &> /dev/null; then
        echo "Checking CPU temperature (requires sudo, may prompt for password)..."
        cpu_temp=$(sudo powermetrics --samplers smc -i 1000 -n 1 2>/dev/null | grep -i "CPU die temperature" | awk '{print $4}' | head -1)

        if [ -n "$cpu_temp" ]; then
            echo "CPU temperature: ${cpu_temp}°C"

            if (( $(echo "$cpu_temp > $CRITICAL_CPU_TEMP" | bc -l) )); then
                print_error "CRITICAL: CPU temperature above ${CRITICAL_CPU_TEMP}°C"
                echo "  Consider: Using laptop cooling pad, reducing workload"
            elif (( $(echo "$cpu_temp > $WARN_CPU_TEMP" | bc -l) )); then
                print_warning "WARNING: CPU temperature above ${WARN_CPU_TEMP}°C"
                echo "  Monitor temperature if running intensive tasks"
            else
                print_success "CPU temperature normal"
            fi
        else
            print_warning "Could not read CPU temperature"
        fi
    else
        print_warning "powermetrics not available, skipping thermal check"
    fi
    echo ""

    # SSD health and free space
    print_header "Storage Health"
    disk_usage=$(df -H / | awk 'NR==2 {print $5}' | sed 's/%//')
    disk_free=$(df -H / | awk 'NR==2 {print $4}')

    echo "Disk usage: ${disk_usage}%"
    echo "Free space: $disk_free"

    if [ "$disk_usage" -gt 90 ]; then
        print_error "CRITICAL: Disk usage above 90%"
        echo "  Consider: Cleaning up old files, Time Machine snapshots"
    elif [ "$disk_usage" -gt 80 ]; then
        print_warning "WARNING: Disk usage above 80%"
    else
        print_success "Disk space adequate"
    fi
    echo ""

    # SMART status
    echo "SMART status:"
    if diskutil info / | grep -q "SMART Status"; then
        smart_status=$(diskutil info / | grep "SMART Status" | awk '{print $3}')
        echo "  SMART Status: $smart_status"
        if [ "$smart_status" = "Verified" ]; then
            print_success "SSD health good"
        else
            print_warning "SMART status: $smart_status"
        fi
    else
        echo "  SMART status not available for this disk"
    fi
    echo ""
}

# Cleanup orphaned processes
cleanup_processes() {
    print_header "Process Cleanup"
    echo ""

    # Find orphaned node/vitest processes
    orphaned_node=$(pgrep -f "node.*vitest|vitest.*node" | wc -l | xargs)
    orphaned_claude_bash=$(pgrep -f "claude.*bash|bash.*claude" | wc -l | xargs)

    echo "Found potential orphaned processes:"
    echo "  Node/Vitest processes: $orphaned_node"
    echo "  Claude bash shells: $orphaned_claude_bash"
    echo ""

    if [ "$orphaned_node" -eq 0 ] && [ "$orphaned_claude_bash" -eq 0 ]; then
        print_success "No orphaned processes found"
        return
    fi

    # Show the processes
    echo "Process details:"
    echo ""
    ps aux | grep -E "(node.*vitest|vitest.*node)" | grep -v grep || true
    echo ""

    # Confirmation prompt
    read -p "Do you want to kill these processes? (yes/no): " confirm

    if [ "$confirm" = "yes" ]; then
        echo "Killing orphaned processes..."
        pkill -f "node.*vitest|vitest.*node" 2>/dev/null || true
        sleep 2
        print_success "Cleanup complete"
    else
        echo "Cleanup cancelled"
    fi

    echo ""

    # Memory purge warning
    print_header "Memory Management"
    echo ""
    echo "⚠️  WARNING: Memory purge can be risky!"
    echo ""
    echo "The 'sudo purge' command clears system caches and can:"
    echo "  • Temporarily slow down the system"
    echo "  • Close some background processes"
    echo "  • Cause brief unresponsiveness"
    echo ""
    echo "Only use this if you're experiencing severe memory issues."
    echo ""
    read -p "Do you want to run 'sudo purge'? (yes/no): " purge_confirm

    if [ "$purge_confirm" = "yes" ]; then
        echo "Running memory purge (may prompt for password)..."
        sudo purge
        print_success "Memory purge complete"
    else
        echo "Memory purge skipped"
    fi
    echo ""
}

# Monitor mode (continuous)
monitor_mode() {
    print_header "Monitoring Mode (Ctrl+C to exit)"
    echo ""
    echo "Checking system health every 30 seconds..."
    echo ""

    while true; do
        timestamp=$(date "+%Y-%m-%d %H:%M:%S")
        echo "[$timestamp]"

        # Quick memory and process check
        mem_info=$(vm_stat | grep -E "Pages (active|wired)" | awk '{sum += $3} END {print sum}')
        node_procs=$(pgrep -f "node" | wc -l | xargs)
        load=$(uptime | awk -F'load averages:' '{print $2}' | awk '{print $1}')

        echo "  Memory: ${mem_info} pages, Node processes: ${node_procs}, Load: ${load}"

        # Alert on thresholds
        if [ "$node_procs" -gt "$WARN_PROCESS_COUNT" ]; then
            print_warning "Process count high: $node_procs"
        fi

        echo ""
        sleep 30
    done
}

# Main script
MODE="${1:---quick}"

case "$MODE" in
    --help|-h)
        show_help
        ;;
    --full|-f)
        full_diagnostic
        ;;
    --cleanup|-c)
        cleanup_processes
        ;;
    --monitor|-m)
        monitor_mode
        ;;
    --quick|-q|*)
        quick_health_check
        ;;
esac

exit 0
