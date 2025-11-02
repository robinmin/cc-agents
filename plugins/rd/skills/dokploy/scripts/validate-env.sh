#!/bin/bash
#
# validate-env.sh - Validate DOKPLOY_URL environment variable
#
# This script is called at the start of dokploy skill activation
# to ensure the required environment variable is set.
#
# Usage: ./validate-env.sh
# Exit codes:
#   0 - DOKPLOY_URL is set and valid
#   1 - DOKPLOY_URL is not set or invalid

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if DOKPLOY_URL is set
if [ -z "${DOKPLOY_URL}" ]; then
    echo -e "${RED}✗ ERROR: DOKPLOY_URL environment variable is not set${NC}" >&2
    echo "" >&2
    echo "The Dokploy skill requires DOKPLOY_URL to be configured." >&2
    echo "" >&2
    echo "Please set it in your shell profile:" >&2
    echo "" >&2
    echo -e "${YELLOW}  export DOKPLOY_URL=\"https://your-dokploy-server.com\"${NC}" >&2
    echo "" >&2
    echo "Then reload your shell or run:" >&2
    echo -e "${YELLOW}  source ~/.bashrc${NC}  # or ~/.zshrc depending on your shell" >&2
    echo "" >&2
    exit 1
fi

# Validate URL format
if [[ ! "${DOKPLOY_URL}" =~ ^https?:// ]]; then
    echo -e "${RED}✗ ERROR: DOKPLOY_URL must start with http:// or https://${NC}" >&2
    echo "" >&2
    echo "Current value: ${DOKPLOY_URL}" >&2
    echo "" >&2
    echo "Please set it to a valid URL:" >&2
    echo -e "${YELLOW}  export DOKPLOY_URL=\"https://your-dokploy-server.com\"${NC}" >&2
    echo "" >&2
    exit 1
fi

# Remove trailing slash if present
DOKPLOY_URL_CLEAN="${DOKPLOY_URL%/}"

# Check if URL is accessible (optional, with timeout)
if command -v curl &> /dev/null; then
    if curl -s -o /dev/null -w "%{http_code}" --max-time 5 "${DOKPLOY_URL_CLEAN}" | grep -q "200\|301\|302\|401"; then
        echo -e "${GREEN}✓ DOKPLOY_URL is set and accessible: ${DOKPLOY_URL_CLEAN}${NC}"
    else
        echo -e "${YELLOW}⚠ WARNING: DOKPLOY_URL is set but may not be accessible${NC}" >&2
        echo "  URL: ${DOKPLOY_URL_CLEAN}" >&2
        echo "  This might be okay if you're not connected to the network" >&2
        echo "" >&2
    fi
else
    echo -e "${GREEN}✓ DOKPLOY_URL is set: ${DOKPLOY_URL_CLEAN}${NC}"
    echo "  (curl not found, skipping connectivity check)"
fi

exit 0
