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
#   ├── site.config.json (optional: site configuration)
#   └── docs/          (required: documentation)
#       ├── index.mdx
#       └── ...
#
# Examples:
#   ./preview-docs.sh ../calvin/docs-content      # Full content dir
#   ./preview-docs.sh ../calvin/docs-site         # Just docs (legacy)
#   ./preview-docs.sh ./content 3001              # Force specific port
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
DOCS_PATH=""
HOME_PATH=""

if [ -d "$CONTENT_PATH/docs" ]; then
    # New structure: content/_home.mdx + content/docs/
    DOCS_PATH="$CONTENT_PATH/docs"
    if [ -f "$CONTENT_PATH/_home.mdx" ]; then
        HOME_PATH="$CONTENT_PATH/_home.mdx"
    fi
    if [ -f "$CONTENT_PATH/site.config.json" ]; then
        SITE_CONFIG_PATH="$CONTENT_PATH/site.config.json"
    fi
else
    # Legacy: just docs directory (docs-site/)
    DOCS_PATH="$CONTENT_PATH"
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
if [ -n "$HOME_PATH" ]; then
    echo "🏠 Homepage:  $HOME_PATH"
fi
echo "🌐 Server:    http://localhost:$PORT"
if [ "$PORT" != "$PREFERRED_PORT" ]; then
    echo "ℹ️  Port $PREFERRED_PORT was busy, using $PORT instead"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Build volume mounts
VOLUME_MOUNTS="- ${DOCS_PATH}:/app/content/docs:ro"
if [ -n "$HOME_PATH" ]; then
    VOLUME_MOUNTS="$VOLUME_MOUNTS
      - ${HOME_PATH}:/app/content/_home.mdx:ro"
fi
if [ -n "$SITE_CONFIG_PATH" ]; then
    VOLUME_MOUNTS="$VOLUME_MOUNTS
      - ${SITE_CONFIG_PATH}:/app/content/docs/site.config.json:ro"
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
      - "${PORT}:3000"
    volumes:
      ${VOLUME_MOUNTS}
      - ./src:/app/src:ro
    environment:
      - NODE_ENV=development
      - WATCHPACK_POLLING=true
EOF
