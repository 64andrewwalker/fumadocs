#!/bin/bash
# ============================================================
# Fumadocs Engine - Preview Script
# 
# Usage:
#   ./preview-docs.sh [path-to-content] [port]
#
# The content directory should have this structure:
#   content/
#   ├── _home.mdx      (optional: custom homepage)
#   └── docs/          (required: documentation)
#       ├── index.mdx
#       └── ...
#
# Or legacy structure (just docs):
#   docs-site/
#   ├── index.mdx
#   └── ...
#
# Examples:
#   ./preview-docs.sh ../calvin/docs-content      # Full content dir
#   ./preview-docs.sh ../calvin/docs-site         # Just docs (legacy)
# ============================================================

set -e

# Get the directory of this script (fumadocs root)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Default content path
CONTENT_PATH="${1:-./content}"
PREFERRED_PORT="${2:-3000}"

# Convert to absolute path if relative
if [[ ! "$CONTENT_PATH" = /* ]]; then
    CONTENT_PATH="$(cd "$CONTENT_PATH" 2>/dev/null && pwd)" || {
        echo "❌ Error: Directory not found: $1"
        exit 1
    }
fi

# Check if content directory exists
if [ ! -d "$CONTENT_PATH" ]; then
    echo "❌ Error: Content directory does not exist: $CONTENT_PATH"
    exit 1
fi

# Determine mount strategy based on directory structure
if [ -d "$CONTENT_PATH/docs" ]; then
    # New structure: content/_home.mdx + content/docs/
    MOUNT_MODE="full"
    DOCS_PATH="$CONTENT_PATH/docs"
    HAS_HOME="no"
    if [ -f "$CONTENT_PATH/_home.mdx" ]; then
        HAS_HOME="yes"
    fi
else
    # Legacy: just docs directory
    MOUNT_MODE="legacy"
    DOCS_PATH="$CONTENT_PATH"
    HAS_HOME="no"
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
echo "📂 Content:   $CONTENT_PATH"
echo "📄 Docs:      $DOCS_PATH"
if [ "$HAS_HOME" = "yes" ]; then
    echo "🏠 Homepage:  $CONTENT_PATH/_home.mdx"
fi
echo "🌐 Server:    http://localhost:$PORT"
if [ "$PORT" != "$PREFERRED_PORT" ]; then
    echo "ℹ️  Port $PREFERRED_PORT was busy, using $PORT instead"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Run the container with appropriate mounts
cd "$SCRIPT_DIR"

if [ "$MOUNT_MODE" = "full" ]; then
    # Mount entire content directory
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
      - ${CONTENT_PATH}:/app/content:ro
      - ./src:/app/src:ro
    environment:
      - NODE_ENV=development
      - WATCHPACK_POLLING=true
EOF
else
    # Legacy: mount docs only
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
fi
