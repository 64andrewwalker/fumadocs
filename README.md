# Fumadocs Engine

A reusable documentation engine powered by [Fumadocs](https://fumadocs.dev) and Next.js.

## Features

- 📚 **Markdown/MDX Support** - Write docs in Markdown or MDX
- 🐳 **Docker Ready** - Preview docs via Docker container
- 🔄 **Hot Reload** - Live preview with file watching
- 🎨 **Beautiful UI** - Powered by Fumadocs UI

## Quick Start

### Local Development

```bash
pnpm install
pnpm dev
```

Open <http://localhost:3000>

### Docker Preview

Preview any docs directory:

```bash
./preview-docs.sh /path/to/your/docs
```

### Use with Another Project (e.g., Calvin)

1. Copy `docs-compose.calvin.yml` to your project
2. Rename to `docs-compose.yml`
3. Run:

```bash
docker compose -f docs-compose.yml up
```

## Documentation Format

Each `.md` or `.mdx` file must include YAML frontmatter:

```yaml
---
title: Page Title (required)
description: Page description (required)
---

# Your content here...
```

## Project Structure

| Path | Description |
|------|-------------|
| `content/docs/` | Documentation content (mount point for external docs) |
| `src/app/` | Next.js app routes |
| `Dockerfile` | Multi-stage build (dev & prod targets) |
| `preview-docs.sh` | Script to preview external docs |

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
