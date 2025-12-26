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
# Note: This script copies files (using rsync) instead of symlinking
# because Next.js Turbopack doesn't support symlinks outside the 
# project root. The content/ directory is in .gitignore so this
# doesn't affect git tracking.
# ============================================================

set -e

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Project root is one level up
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Default content path (use templates if no argument)
CONTENT_PATH="${1:-$PROJECT_ROOT/templates/content}"
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

# Detect if content has proper frontmatter (for fumadocs-mdx) or is raw markdown (for compat-engine)
# Check a few markdown files to see if they have YAML frontmatter
detect_content_type() {
    local sample_count=0
    local frontmatter_count=0
    
    # Find up to 5 markdown files to sample
    while IFS= read -r -d '' file; do
        sample_count=$((sample_count + 1))
        # Check if file starts with YAML frontmatter (---)
        if head -n 1 "$file" | grep -q "^---$"; then
            frontmatter_count=$((frontmatter_count + 1))
        fi
        [ $sample_count -ge 5 ] && break
    done < <(find "$DOCS_PATH" -name "*.md" -o -name "*.mdx" 2>/dev/null | head -5 | tr '\n' '\0')
    
    # If less than half have frontmatter, treat as raw markdown
    if [ $sample_count -gt 0 ] && [ $frontmatter_count -lt $((sample_count / 2 + 1)) ]; then
        echo "raw"
    else
        echo "structured"
    fi
}

CONTENT_TYPE=$(detect_content_type)

# If raw mode, we'll use compat-engine instead of fumadocs-mdx
if [ "$CONTENT_TYPE" = "raw" ]; then
    RAW_MODE="yes"
    # Export the source path for compat-engine
    export COMPAT_SOURCE_DIR="$CONTENT_PATH"
else
    RAW_MODE="no"
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
if [ "$RAW_MODE" = "yes" ]; then
    echo ""
    echo "📝 Mode:      RAW MARKDOWN (compat-engine)"
    echo "🔗 Browse:    http://localhost:$PORT/raw-notes"
    echo ""
    echo "   ℹ️  Detected raw markdown files (no YAML frontmatter)."
    echo "   ℹ️  Using compat-engine for flexible rendering."
else
    echo ""
    echo "📝 Mode:      STRUCTURED DOCS (fumadocs-mdx)"
    echo "🔗 Browse:    http://localhost:$PORT/docs"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Change to project root
cd "$PROJECT_ROOT"

CONTENT_DIR="$PROJECT_ROOT/content"

# Remove existing content (it's in .gitignore, so safe to delete)
if [ -d "$CONTENT_DIR" ] || [ -L "$CONTENT_DIR" ]; then
    rm -rf "$CONTENT_DIR"
fi

# Function to sync content (copy files)
sync_content() {
    echo "📋 Syncing content from source..."
    
    # In raw mode, compat-engine reads directly from source
    # We only need a minimal content/docs for fumadocs-mdx to not fail
    if [ "$RAW_MODE" = "yes" ]; then
        mkdir -p "$CONTENT_DIR/docs"
        # Create a placeholder so fumadocs-mdx has something to build
        # The actual content is served via /raw-notes using compat-engine
        if [ ! -f "$CONTENT_DIR/docs/index.mdx" ]; then
            cat > "$CONTENT_DIR/docs/index.mdx" << 'EOF'
---
title: Documentation
description: Welcome to the documentation
---

# Documentation

This content is served via the **Raw Notes** route.

→ **[Browse Raw Notes](/raw-notes)** to view your markdown files.

---

The compat-engine is handling your raw markdown files without requiring YAML frontmatter.
EOF
            echo "📄 Created placeholder for /docs"
        fi
        echo "📁 Raw mode: compat-engine reading from $CONTENT_PATH"
        return
    fi
    
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
        echo "📁 Synced content: $CONTENT_PATH -> $CONTENT_DIR"
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
        echo "📁 Synced docs: $DOCS_PATH -> $CONTENT_DIR/docs"
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
    
    # Remove copied content (it's in .gitignore)
    if [ -d "$CONTENT_DIR" ]; then
        rm -rf "$CONTENT_DIR"
        echo "📦 Removed preview content"
    fi
}

# Register cleanup on exit
trap cleanup EXIT

# Install dependencies if needed
if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install
fi

# Clear caches to ensure fresh build with new content
echo "🧹 Clearing build caches..."
rm -rf .next .source

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
if [ "$RAW_MODE" = "yes" ]; then
    # In raw mode, pass COMPAT_SOURCE_DIR so compat-engine can find the source
    PORT=$PORT COMPAT_SOURCE_DIR="$CONTENT_PATH" pnpm dev
else
    PORT=$PORT pnpm dev
fi
