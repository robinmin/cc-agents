#!/bin/bash
# Test script for Phase 1 deliverables

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "========================================"
echo "Phase 1 Scripts - Test Suite"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}[PASS]${NC} $1"; }
fail() { echo -e "${RED}[FAIL]${NC} $1"; }
info() { echo -e "${YELLOW}[INFO]${NC} $1"; }

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

run_test() {
    local description="$1"
    local command="$2"

    echo "Testing: $description"
    if eval "$command" > /dev/null 2>&1; then
        pass "$description"
        ((TESTS_PASSED++))
    else
        fail "$description"
        ((TESTS_FAILED++))
    fi
}

# Make scripts executable
echo "Making scripts executable..."
chmod +x repo-config.py topic-init.py context-validator.py 2>/dev/null || true
chmod +x shared/config.py 2>/dev/null || true
echo ""

# Test 1: Check Python syntax
echo "Phase 1: Syntax Check"
echo "----------------------------------------"
run_test "shared/config.py syntax" "python3 -m py_compile shared/config.py"
run_test "repo-config.py syntax" "python3 -m py_compile repo-config.py"
run_test "topic-init.py syntax" "python3 -m py_compile topic-init.py"
run_test "context-validator.py syntax" "python3 -m py_compile context-validator.py"
echo ""

# Test 2: Import modules
echo "Phase 2: Module Import"
echo "----------------------------------------"
run_test "Import config module" "python3 -c 'from shared.config import get_tcc_config, get_wt_config, set_tcc_config'"
echo ""

# Test 3: Config module functionality
echo "Phase 3: Config Module"
echo "----------------------------------------"
run_test "get_wt_config() works" "python3 -c 'from shared.config import get_wt_config; get_wt_config()'"
run_test "get_tcc_config() works" "python3 -c 'from shared.config import get_tcc_config; get_tcc_config()'"
echo ""

# Test 4: CLI help messages
echo "Phase 4: CLI Help Messages"
echo "----------------------------------------"
run_test "repo-config.py --help" "python3 repo-config.py --help"
run_test "topic-init.py --help" "python3 topic-init.py --help"
run_test "context-validator.py --help" "python3 context-validator.py --help"
echo ""

# Summary
echo "========================================"
echo "Test Summary"
echo "========================================"
echo "Passed: $TESTS_PASSED"
echo "Failed: $TESTS_FAILED"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed${NC}"
    exit 1
fi
