#!/bin/bash
# Security Audit Script for Tri-CertFramework
# Run this script to check for known vulnerabilities in dependencies
#
# Usage: ./scripts/security-audit.sh
#
# This script performs:
# 1. npm audit for JavaScript/TypeScript projects
# 2. govulncheck for Go projects (if installed)
# 3. cargo audit for Rust projects (if installed)

set -e

echo "======================================"
echo "Tri-CertFramework Security Audit"
echo "======================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

AUDIT_FAILED=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    local status=$1
    local message=$2
    if [ "$status" = "ok" ]; then
        echo -e "${GREEN}✓${NC} $message"
    elif [ "$status" = "warn" ]; then
        echo -e "${YELLOW}⚠${NC} $message"
    else
        echo -e "${RED}✗${NC} $message"
    fi
}

# Function to run npm audit
run_npm_audit() {
    local dir=$1
    local name=$2
    
    if [ -f "$dir/package.json" ]; then
        echo ""
        echo "Auditing $name..."
        cd "$dir"
        
        # Check if node_modules exists
        if [ ! -d "node_modules" ]; then
            echo "  Installing dependencies first..."
            npm ci --silent 2>/dev/null || npm install --silent 2>/dev/null || true
        fi
        
        # Run audit
        if npm audit --audit-level=high 2>/dev/null; then
            print_status "ok" "$name: No high/critical vulnerabilities"
        else
            print_status "fail" "$name: Vulnerabilities found"
            AUDIT_FAILED=1
        fi
        cd "$PROJECT_ROOT"
    fi
}

# Audit Node.js projects
echo "--- Node.js Projects ---"

run_npm_audit "$PROJECT_ROOT/prover" "prover"
run_npm_audit "$PROJECT_ROOT/verifier-ui" "verifier-ui"
run_npm_audit "$PROJECT_ROOT/executive-console" "executive-console"
run_npm_audit "$PROJECT_ROOT/registrar-console/frontend" "registrar-console/frontend"
run_npm_audit "$PROJECT_ROOT/scripts" "scripts"
run_npm_audit "$PROJECT_ROOT/circuits" "circuits"

# Audit Go projects
echo ""
echo "--- Go Projects ---"

if command -v govulncheck &> /dev/null; then
    if [ -f "$PROJECT_ROOT/registrar-console/go.mod" ]; then
        echo ""
        echo "Auditing registrar-console (Go)..."
        cd "$PROJECT_ROOT/registrar-console"
        
        if govulncheck ./... 2>/dev/null; then
            print_status "ok" "registrar-console (Go): No vulnerabilities"
        else
            print_status "fail" "registrar-console (Go): Vulnerabilities found"
            AUDIT_FAILED=1
        fi
        cd "$PROJECT_ROOT"
    fi
else
    print_status "warn" "govulncheck not installed. Install with: go install golang.org/x/vuln/cmd/govulncheck@latest"
fi

# Audit Rust projects (if circom is being built)
echo ""
echo "--- Rust Projects ---"

if command -v cargo-audit &> /dev/null; then
    if [ -f "$PROJECT_ROOT/circuits/circom/Cargo.toml" ]; then
        echo ""
        echo "Auditing circuits/circom (Rust)..."
        cd "$PROJECT_ROOT/circuits/circom"
        
        if cargo audit 2>/dev/null; then
            print_status "ok" "circuits/circom (Rust): No vulnerabilities"
        else
            print_status "warn" "circuits/circom (Rust): Advisory found (may not be critical)"
        fi
        cd "$PROJECT_ROOT"
    fi
else
    print_status "warn" "cargo-audit not installed. Install with: cargo install cargo-audit"
fi

echo ""
echo "======================================"
if [ $AUDIT_FAILED -eq 0 ]; then
    print_status "ok" "Security audit completed successfully"
    exit 0
else
    print_status "fail" "Security audit found issues"
    echo ""
    echo "Run 'npm audit fix' in affected directories to attempt automatic fixes."
    echo "For manual review, run 'npm audit' in each directory."
    exit 1
fi

