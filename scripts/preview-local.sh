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
#
# Note: This script copies files instead of symlinking because
# Next.js Turbopack doesn't support symlinks outside the project root.
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

CONTENT_DIR="$PROJECT_ROOT/content"

# Backup existing content if it's not a symlink and not already backed up
if [ -d "$CONTENT_DIR" ] && [ ! -L "$CONTENT_DIR" ] && [ ! -d "$PROJECT_ROOT/content.bak" ]; then
    echo "📦 Backing up existing content to content.bak..."
    mv "$CONTENT_DIR" "$PROJECT_ROOT/content.bak"
fi

# Remove any existing symlink or directory
if [ -L "$CONTENT_DIR" ]; then
    rm "$CONTENT_DIR"
fi
if [ -d "$CONTENT_DIR" ]; then
    rm -rf "$CONTENT_DIR"
fi

# Function to sync content (copy files)
sync_content() {
    echo "📋 Syncing content from source..."
    
    if [ "$MOUNT_MODE" = "full" ]; then
        # Full mode: copy entire content directory
        mkdir -p "$CONTENT_DIR"
        # Use rsync to copy only content files, excluding hidden dirs like .git
        rsync -av --delete \
            --exclude='.git' \
            --exclude='.git/**' \
            --exclude='.gitignore' \
            --exclude='.DS_Store' \
            --exclude='node_modules' \
            --exclude='.cursor' \
            --exclude='.claude' \
            --exclude='.agent' \
            --include='*/' \
            --include='*.md' \
            --include='*.mdx' \
            --include='*.yaml' \
            --include='*.yml' \
            --include='*.json' \
            --include='*.png' \
            --include='*.jpg' \
            --include='*.jpeg' \
            --include='*.gif' \
            --include='*.svg' \
            --include='*.webp' \
            --include='*.ico' \
            --include='_home.mdx' \
            --exclude='*' \
            "$CONTENT_PATH/" "$CONTENT_DIR/"
        echo "📁 Copied content: $CONTENT_PATH -> $CONTENT_DIR"
    else
        # Legacy mode: create content/docs structure
        mkdir -p "$CONTENT_DIR/docs"
        rsync -av --delete \
            --exclude='.git' \
            --exclude='.git/**' \
            --exclude='.gitignore' \
            --exclude='.DS_Store' \
            --exclude='node_modules' \
            --exclude='.cursor' \
            --exclude='.claude' \
            --exclude='.agent' \
            --include='*/' \
            --include='*.md' \
            --include='*.mdx' \
            --include='*.yaml' \
            --include='*.yml' \
            --include='*.json' \
            --include='*.png' \
            --include='*.jpg' \
            --include='*.jpeg' \
            --include='*.gif' \
            --include='*.svg' \
            --include='*.webp' \
            --include='*.ico' \
            --exclude='*' \
            "$DOCS_PATH/" "$CONTENT_DIR/docs/"
        echo "📁 Copied docs: $DOCS_PATH -> $CONTENT_DIR/docs"
    fi
}

# Initial sync
sync_content

# Cleanup function
cleanup() {
    echo ""
    echo "🧹 Cleaning up..."
    
    # Kill file watcher if running
    if [ -n "$WATCHER_PID" ] && kill -0 "$WATCHER_PID" 2>/dev/null; then
        kill "$WATCHER_PID" 2>/dev/null || true
    fi
    
    # Remove copied content
    if [ -d "$CONTENT_DIR" ]; then
        rm -rf "$CONTENT_DIR"
    fi
    
    # Restore backup if exists
    if [ -d "$PROJECT_ROOT/content.bak" ]; then
        mv "$PROJECT_ROOT/content.bak" "$CONTENT_DIR"
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

# Start file watcher for live sync (if fswatch is available)
if command -v fswatch &> /dev/null; then
    echo "👁️  Starting file watcher for live sync..."
    (
        fswatch -o \
            --exclude='\.git' \
            --exclude='\.DS_Store' \
            --exclude='node_modules' \
            --include='\.md$' \
            --include='\.mdx$' \
            --include='\.yaml$' \
            --include='\.yml$' \
            --include='\.json$' \
            --include='\.png$' \
            --include='\.jpg$' \
            --include='\.jpeg$' \
            --include='\.gif$' \
            --include='\.svg$' \
            --include='\.webp$' \
            "$CONTENT_PATH" | while read -r event; do
            echo "📝 File change detected, syncing..."
            sync_content 2>/dev/null
        done
    ) &
    WATCHER_PID=$!
else
    echo "ℹ️  fswatch not found. Install with 'brew install fswatch' for live file sync."
    echo "   Without fswatch, restart the script to see content changes."
fi

# Run the dev server
echo "🚀 Starting development server on port $PORT..."
PORT=$PORT pnpm dev
