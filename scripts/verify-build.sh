#!/bin/bash
# Local build verification script for PDCA cycle
# This script helps catch build errors before pushing to GitHub

set -e

echo "🔍 Starting local build verification (PDCA Cycle - Check phase)"
echo "================================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check build
check_build() {
    local app_dir=$1
    local app_name=$2
    
    echo -e "\n${YELLOW}Checking ${app_name}...${NC}"
    cd "${app_dir}" || exit 1
    
    # Install dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        echo "Installing dependencies..."
        npm ci
    fi
    
    # Run build:export
    echo "Running build:export..."
    if npm run build:export; then
        echo -e "${GREEN}✓ ${app_name} build successful${NC}"
        return 0
    else
        echo -e "${RED}✗ ${app_name} build failed${NC}"
        return 1
    fi
}

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Check Prover
if ! check_build "${REPO_ROOT}/prover" "Prover"; then
    echo -e "\n${RED}❌ Build verification failed for Prover${NC}"
    exit 1
fi

# Check Verifier UI
if ! check_build "${REPO_ROOT}/verifier-ui" "Verifier UI"; then
    echo -e "\n${RED}❌ Build verification failed for Verifier UI${NC}"
    exit 1
fi

echo -e "\n${GREEN}✅ All builds verified successfully!${NC}"
echo "You can safely push to GitHub."
exit 0

