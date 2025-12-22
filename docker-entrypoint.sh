#!/bin/sh
# Fumadocs Engine - Development Entrypoint
# Waits for docs to be mounted, then starts the dev server

echo "📚 Fumadocs Engine Starting..."

# Check if docs are mounted
if [ -z "$(ls -A /app/content/docs 2>/dev/null)" ]; then
    echo "⚠️  Warning: No docs found in /app/content/docs"
    echo "    Make sure to mount your docs directory:"
    echo "    docker run -v /path/to/docs:/app/content/docs ..."
fi

# List mounted docs for debugging
echo "📂 Found docs:"
ls -la /app/content/docs 2>/dev/null || echo "   (empty)"
echo ""

# Regenerate fumadocs-mdx index
echo "🔄 Regenerating MDX index..."
pnpm fumadocs-mdx

# Start the dev server
echo "🚀 Starting dev server..."
exec pnpm dev
