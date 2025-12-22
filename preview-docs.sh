#!/bin/bash
# ============================================================
# Fumadocs Engine - Preview Script
# 
# Usage:
#   ./preview-docs.sh [path-to-docs] [port]
#
# Examples:
#   ./preview-docs.sh                        # Use ./docs, auto-find port
#   ./preview-docs.sh ../calvin/docs-site    # Preview Calvin docs
#   ./preview-docs.sh ./docs 3001            # Force specific port
# ============================================================

set -e

# Get the directory of this script (fumadocs root)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Default docs path
DOCS_PATH="${1:-./docs}"
PREFERRED_PORT="${2:-3000}"

# Convert to absolute path if relative
if [[ ! "$DOCS_PATH" = /* ]]; then
    DOCS_PATH="$(cd "$DOCS_PATH" 2>/dev/null && pwd)" || {
        echo "❌ Error: Directory not found: $1"
        exit 1
    }
fi

# Check if docs directory exists
if [ ! -d "$DOCS_PATH" ]; then
    echo "❌ Error: Docs directory does not exist: $DOCS_PATH"
    exit 1
fi

# Function to check if port is available
is_port_available() {
    ! lsof -i ":$1" >/dev/null 2>&1
}

# Find available port starting from preferred port
find_available_port() {
    local port=$1
    local max_attempts=10
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if is_port_available $port; then
            echo $port
            return 0
        fi
        port=$((port + 1))
        attempt=$((attempt + 1))
    done
    
    echo "❌ Error: Could not find available port after $max_attempts attempts" >&2
    exit 1
}

# Stop any existing preview container (silently)
docker stop fumadocs-preview 2>/dev/null || true
docker rm fumadocs-preview 2>/dev/null || true

# Find available port
PORT=$(find_available_port $PREFERRED_PORT)

echo "📚 Fumadocs Engine"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📂 Docs path: $DOCS_PATH"
echo "🌐 Server:    http://localhost:$PORT"
if [ "$PORT" != "$PREFERRED_PORT" ]; then
    echo "ℹ️  Port $PREFERRED_PORT was busy, using $PORT instead"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

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
      - "${PORT}:3000"
    volumes:
      - ${DOCS_PATH}:/app/content/docs:ro
      - ./src:/app/src:ro
    environment:
      - NODE_ENV=development
      - WATCHPACK_POLLING=true
EOF
