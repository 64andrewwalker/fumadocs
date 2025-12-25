# Fumadocs Scripts

This directory contains utility scripts for the Fumadocs engine.

## Scripts

### preview-local.sh

Run the documentation preview server locally without Docker.

```bash
# Default: use templates/content/ directory
./scripts/preview-local.sh

# Custom content directory
./scripts/preview-local.sh ../my-docs

# Custom content directory and port
./scripts/preview-local.sh ../my-docs 3001
```

**Features:**
- Uses `rsync` to copy content files to the project's `content/` directory
- Supports any external directory (not limited to project subdirectories)
- Auto-finds available port if preferred port is busy
- Cleans up copied content on exit
- Does NOT affect git status (`content/` is in `.gitignore`)
- Optional: live file sync with `fswatch` (install with `brew install fswatch`)

**Technical Notes:**
- The `content/` directory is in `.gitignore` and not tracked by git
- Default content template is stored in `templates/content/` (tracked by git)
- Uses rsync instead of symlinks because Next.js Turbopack doesn't support symlinks pointing outside the project root

### preview-docker.sh

Run the documentation preview server using Docker.

```bash
# Default: use ./content directory
./scripts/preview-docker.sh

# Custom content directory
./scripts/preview-docker.sh ../my-docs

# Custom content directory and port
./scripts/preview-docker.sh ../my-docs 3001
```

**Features:**
- Uses Docker for isolated environment
- Mounts content directory as read-only volume
- Hot reload enabled via WATCHPACK_POLLING

### docker-entrypoint.sh

Docker container entrypoint script. Not meant to be run directly.

- Regenerates MDX index on container start
- Runs the Next.js development server

## Content Directory Structure

Both preview scripts support two directory structures:

### New Structure (Recommended)

```
content/
├── _home.mdx      # Optional: custom homepage
└── docs/          # Required: documentation
    ├── index.mdx
    └── ...
```

### Legacy Structure

```
docs-site/
├── index.mdx
└── ...
```

## Environment Variables

### Compat Engine Configuration

The Compat Engine (for rendering non-standard markdown files) can be configured via environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `COMPAT_SOURCE_DIR` | Directory path for compat source | `DocEngineering` |
| `COMPAT_SOURCE_ENABLED` | Enable/disable compat engine | `true` |

**Examples:**

```bash
# Disable compat engine entirely
COMPAT_SOURCE_ENABLED=false ./scripts/preview-local.sh ../my-docs

# Use custom compat source directory
COMPAT_SOURCE_DIR=/path/to/my-notes ./scripts/preview-local.sh ../my-docs

# Combined with other options
COMPAT_SOURCE_DIR=./my-notes ./scripts/preview-local.sh ../my-docs 3001
```

**Note:** If the `COMPAT_SOURCE_DIR` directory doesn't exist, the Compat Engine will gracefully return an empty source (no `/raw-notes` pages will be available).

## Requirements

### preview-local.sh
- Node.js 18+
- pnpm
- rsync (pre-installed on macOS and most Linux)
- (Optional) fswatch for live file sync: `brew install fswatch`

### preview-docker.sh
- Docker
- docker-compose

## Troubleshooting

### "Symlink points out of the filesystem root" Error

This error occurs when using symlinks with Next.js Turbopack. The `preview-local.sh` script avoids this by using `rsync` to copy files instead of creating symlinks.

If you see this error, make sure you're using the latest version of `preview-local.sh`.

### Content Changes Not Reflecting

1. **With fswatch installed:** Changes should sync automatically within a few seconds
2. **Without fswatch:** Restart the preview script to see content changes

To install fswatch on macOS:
```bash
brew install fswatch
```

### Port Already in Use

The script automatically finds an available port. If port 3000 is busy, it will try 3001, 3002, etc.

