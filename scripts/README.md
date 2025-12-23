# Fumadocs Scripts

This directory contains utility scripts for the Fumadocs engine.

## Scripts

### preview-local.sh

Run the documentation preview server locally without Docker.

```bash
# Default: use ./content directory
./scripts/preview-local.sh

# Custom content directory
./scripts/preview-local.sh ../my-docs

# Custom content directory and port
./scripts/preview-local.sh ../my-docs 3001
```

**Features:**
- Creates symlinks to external content directories
- Auto-finds available port if preferred port is busy
- Cleans up symlinks on exit
- Restores original content directory if backed up

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

## Requirements

### preview-local.sh
- Node.js 18+
- pnpm

### preview-docker.sh
- Docker
- docker-compose

