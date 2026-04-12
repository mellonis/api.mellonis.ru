# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (hot-reload, loads .env)
npm run dev

# Build TypeScript to build/
npm run build

# Run tests
npm test

# Lint
npm run lint

# Run production build
node build/index.js
```

## Environment

Requires a `.env` file with:
```
CONNECTION_STRING=mysql://user:password@host:port/schema
```

The server listens on `0.0.0.0:3000` (port overridable via `PORT` env var). The `CONNECTION_STRING` variable is validated on startup and will exit if missing.

## Architecture

Fastify app using a plugin-based structure under `src/plugins/`:

- **`database/`** — registers the MySQL connection pool on the Fastify instance via `@fastify/mysql`
- **`swagger/`** — mounts OpenAPI docs at `/docs` via `@fastify/swagger` + `@fastify/swagger-ui`
- **`sections/`** — routes prefixed `/sections`
- **`thingsOfTheDay/`** — routes prefixed `/things-of-the-day`

Each route plugin is split into: `*.ts` (handler), `schemas.ts`, `queries.ts`, `databaseHelpers.ts`.

Shared utilities live in `src/lib/`: `schemas.ts` (Zod schemas), `queries.ts` (SQL fragments), `mappers.ts` (row mappers), `databaseHelpers.ts` (`withConnection`). Plugin schemas extend or re-export from `src/lib/schemas.ts`.

Validation and serialization use `fastify-type-provider-zod`. All Fastify route schemas reference Zod objects.

## Key Patterns

**Types are derived from Zod schemas** — never write standalone TypeScript interfaces for data that already has a Zod schema. Use `z.infer<typeof Schema>`. All type names use PascalCase.

**Type-only imports** use `import type` (or inline `type` for mixed imports).

**Notes aggregation** uses a correlated subquery with `GROUP_CONCAT(JSON_QUOTE(text) ORDER BY id SEPARATOR ',')` wrapped in `CONCAT('[', ..., ']')` — not `JSON_ARRAYAGG(...ORDER BY...)`, which requires MySQL 8.0.14+.

**`things-of-the-day` selection** — primary query matches by `MM-DD` ignoring year via `SUBSTRING(thing_finish_date, 6)`, also handles partial dates (`YYYY-MM-00`, `YYYY-00-00`), ordered newest year first. Fallback uses `RAND(TO_DAYS(CURDATE()))` seeded by date for stable daily randomness. Results are grouped by `thing_id` in the app to collect `sections: [{id, position}]`.

**`withConnection(mysql, fn)`** in `src/lib/databaseHelpers.ts` — shared helper for all DB access; handles pool acquire/release via try/finally.

**Logging** uses `pino-pretty` only when `NODE_ENV !== 'production'`; raw Pino otherwise.

**Deployment** is via Docker (multi-stage build targeting `node:24-alpine`) and a GitHub Actions workflow that triggers on merged PRs to `master`, builds the image, and deploys to the remote server over SSH. When upgrading Node.js, keep the version in sync across: `Dockerfile`, `.github/workflows/deploy.yml` (`node-version`), `tsconfig.json` (`@tsconfig/nodeXX`), and `package.json` (`@tsconfig/nodeXX` and `@types/node` devDependencies — both should match the Node.js major version).
