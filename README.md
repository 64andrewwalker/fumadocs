# Fumadocs Engine

A reusable documentation engine powered by [Fumadocs](https://fumadocs.dev) and Next.js.

## Features

- 📚 **Markdown/MDX Support** - Write docs in Markdown or MDX
- 🐳 **Docker Ready** - Preview docs via Docker container
- 🔄 **Hot Reload** - Live preview with file watching
- 🎨 **Beautiful UI** - Powered by Fumadocs UI
- 🔧 **Compat Engine** - Render raw markdown without strict frontmatter

## Quick Start

### Local Development

```bash
pnpm install
pnpm dev
```

Open <http://localhost:3000>

### Preview External Docs

Preview any docs directory locally:

```bash
./scripts/preview-local.sh /path/to/your/docs
```

Or via Docker:

```bash
./scripts/preview-docker.sh /path/to/your/docs
```

### Use with Another Project (e.g., Calvin)

1. Copy `docs-compose.calvin.yml` to your project
2. Rename to `docs-compose.yml`
3. Run:

```bash
docker compose -f docs-compose.yml up
```

## Documentation Format

Each `.md` or `.mdx` file can include YAML frontmatter:

```yaml
---
title: Page Title (optional - extracted from H1 if not provided)
description: Page description (optional)
---

# Your content here...
```

**Note**: Title is optional. If not provided in frontmatter, it will be automatically extracted from the first `# Heading` or the filename.

## Project Structure

| Path | Description |
|------|-------------|
| `templates/content/` | Default content template (tracked by git) |
| `content/` | Documentation content for preview (in .gitignore) |
| `src/app/` | Next.js app routes |
| `src/lib/compat-engine/` | Compatibility engine for raw markdown |
| `scripts/` | Preview and utility scripts |
| `Dockerfile` | Multi-stage build (dev & prod targets) |

## Scripts

See [scripts/README.md](scripts/README.md) for detailed documentation.

| Script | Purpose |
|--------|---------|
| `scripts/preview-local.sh` | Preview docs locally (no Docker) |
| `scripts/preview-docker.sh` | Preview docs via Docker |

## Advanced Features

### Compat Engine (Raw Notes)

For rendering non-standard markdown files (without proper frontmatter), the engine includes a compatibility layer accessible at `/raw-notes`.

Configure via environment variables:
- `COMPAT_SOURCE_DIR`: Source directory (default: `DocEngineering`)
- `COMPAT_SOURCE_ENABLED`: Enable/disable (default: `true`)

## Docker Images

### Build Development Image

```bash
docker build -t fumadocs-engine:dev --target dev .
```

### Build Production Image

```bash
docker build -t fumadocs-engine:latest --target runner .
```

## Learn More

- [Fumadocs Documentation](https://fumadocs.dev)
- [Next.js Documentation](https://nextjs.org/docs)
