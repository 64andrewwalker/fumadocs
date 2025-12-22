#!/bin/bash
# ============================================================
# Fumadocs Engine - Preview Script
# 
# Usage:
#   ./preview-docs.sh [path-to-docs]
#
# Examples:
#   ./preview-docs.sh                    # Use ./docs as default
#   ./preview-docs.sh ../calvin/docs     # Preview Calvin docs
#   ./preview-docs.sh /path/to/my/docs   # Absolute path
# ============================================================

set -e

# Get the directory of this script (fumadocs root)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Default docs path
DOCS_PATH="${1:-./docs}"

# Convert to absolute path if relative
if [[ ! "$DOCS_PATH" = /* ]]; then
    DOCS_PATH="$(cd "$DOCS_PATH" 2>/dev/null && pwd)" || {
        echo "❌ Error: Directory not found: $1"
        exit 1
    }
fi

echo "📚 Fumadocs Engine"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📂 Docs path: $DOCS_PATH"
echo "🌐 Server:    http://localhost:3000"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if docs directory exists and has content
if [ ! -d "$DOCS_PATH" ]; then
    echo "❌ Error: Docs directory does not exist: $DOCS_PATH"
    exit 1
fi

# Run the container
cd "$SCRIPT_DIR"

docker compose -f - up --build <<EOF
services:
  docs:
    build:
      context: .
      dockerfile: Dockerfile
      target: dev
    container_name: fumadocs-preview
    ports:
      - "3000:3000"
    volumes:
      - ${DOCS_PATH}:/app/content/docs:ro
      - ./src:/app/src:ro
    environment:
      - NODE_ENV=development
      - WATCHPACK_POLLING=true
EOF
