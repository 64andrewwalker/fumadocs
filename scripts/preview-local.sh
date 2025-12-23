#!/bin/bash
# ============================================================
# Fumadocs Engine - Local Preview Script (No Docker)
# 
# Usage:
#   ./scripts/preview-local.sh [path-to-content] [port]
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
#   ./scripts/preview-local.sh ../calvin/docs-content
#   ./scripts/preview-local.sh ../calvin/docs-site 3001
# ============================================================

set -e

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Project root is one level up
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Default content path
CONTENT_PATH="${1:-$PROJECT_ROOT/content}"
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
    MOUNT_MODE="full"
    DOCS_PATH="$CONTENT_PATH/docs"
    HAS_HOME="no"
    if [ -f "$CONTENT_PATH/_home.mdx" ]; then
        HAS_HOME="yes"
    fi
else
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

# Find available port
PORT=$(find_available_port $PREFERRED_PORT)

echo ""
echo "📚 Fumadocs Engine - Local Preview"
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

# Change to project root
cd "$PROJECT_ROOT"

# Create symlinks to external content
CONTENT_LINK="$PROJECT_ROOT/content"

# Backup existing content if it's not a symlink
if [ -d "$CONTENT_LINK" ] && [ ! -L "$CONTENT_LINK" ]; then
    echo "📦 Backing up existing content to content.bak..."
    mv "$CONTENT_LINK" "$PROJECT_ROOT/content.bak"
fi

# Create symlink based on mount mode
if [ "$MOUNT_MODE" = "full" ]; then
    # Full mode: link entire content directory
    if [ -L "$CONTENT_LINK" ]; then
        rm "$CONTENT_LINK"
    fi
    ln -sf "$CONTENT_PATH" "$CONTENT_LINK"
    echo "🔗 Linked content: $CONTENT_PATH -> $CONTENT_LINK"
else
    # Legacy mode: create content/docs structure
    if [ -L "$CONTENT_LINK" ]; then
        rm "$CONTENT_LINK"
    fi
    mkdir -p "$CONTENT_LINK"
    
    # Link docs subdirectory
    if [ -L "$CONTENT_LINK/docs" ]; then
        rm "$CONTENT_LINK/docs"
    fi
    ln -sf "$DOCS_PATH" "$CONTENT_LINK/docs"
    echo "🔗 Linked docs: $DOCS_PATH -> $CONTENT_LINK/docs"
fi

# Cleanup function
cleanup() {
    echo ""
    echo "🧹 Cleaning up symlinks..."
    if [ -L "$CONTENT_LINK" ]; then
        rm "$CONTENT_LINK"
    fi
    if [ -L "$CONTENT_LINK/docs" ]; then
        rm -rf "$CONTENT_LINK"
    fi
    
    # Restore backup if exists
    if [ -d "$PROJECT_ROOT/content.bak" ]; then
        mv "$PROJECT_ROOT/content.bak" "$CONTENT_LINK"
        echo "📦 Restored original content directory"
    fi
}

# Register cleanup on exit
trap cleanup EXIT

# Install dependencies if needed
if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install
fi

# Run the dev server
echo "🚀 Starting development server on port $PORT..."
PORT=$PORT pnpm dev

