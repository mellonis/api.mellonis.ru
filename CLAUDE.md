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

# Smoke tests (require running server + DB)
./smoke-test-v1.sh [base_url]   # public endpoints only
./smoke-test.sh [base_url]      # full auth flow (creates/deletes a test user)
```

## Environment

Requires a `.env` file with:
```
CONNECTION_STRING=mysql://user:password@host:port/schema
JWT_SECRET=<min-32-characters>
JWT_ACCESS_TOKEN_TTL=900            # required, seconds (15min recommended)
JWT_REFRESH_TOKEN_TTL=2592000       # required, seconds (30 days recommended)
ACTIVATION_KEY_TTL=86400         # required, seconds (see ../CLAUDE.md → Verification Key TTLs)
RESET_KEY_TTL=3600               # required, seconds (see ../CLAUDE.md → Verification Key TTLs)
SMTP_HOST=smtp.protonmail.ch
SMTP_PORT=587
SMTP_LOGIN=notifier@mellonis.ru
SMTP_PASSWORD=<password>
SMTP_FROM_NAME=Система оповещений        # required, display name for From header
SMTP_FROM_ADDRESS=notifier@mellonis.ru   # required, email address for From header (no fallback to SMTP_LOGIN — would leak credentials)
ALLOWED_ORIGINS=https://poetry.mellonis.ru,https://poetry-old2.mellonis.ru  # required, comma-separated whitelist of client origins (CORS + email links)
WEBAUTHN_RP_ID=mellonis.ru       # optional, WebAuthn Relying Party ID (default: mellonis.ru, use "localhost" for local dev)
ADMIN_NOTIFY_EMAIL=admin@mellonis.ru  # optional, receives notifications on votes, registrations, account deletions
```

See `.env.example` for a template. The server listens on `0.0.0.0:3000` (port overridable via `PORT` env var). `CONNECTION_STRING`, `JWT_SECRET`, and `ALLOWED_ORIGINS` are validated on startup. SMTP vars are required only in production (`NODE_ENV=production`); in dev mode, notifications are logged to the console instead.

## Architecture

**CORS** is handled by `@fastify/cors`, registered in `src/index.ts` with origins from the `ALLOWED_ORIGINS` env var. Allows `GET`, `POST`, `PUT`, `PATCH`, `DELETE` methods and `Content-Type` + `Authorization` headers.

Fastify app using a plugin-based structure under `src/plugins/`:

- **`database/`** — registers the MySQL connection pool on the Fastify instance via `@fastify/mysql`
- **`auth/`** — `auth.ts` is a `fastify-plugin` decorator (`verifyJwt`, `requireRight`) visible to all plugins
  - `authRoutes.ts` — routes prefixed `/auth` (register, activate, login, refresh, logout, password reset). Sends `ADMIN_NOTIFY_EMAIL` on new registration
  - Pure utilities: `password.ts`, `jwt.ts`, `rights.ts`, `issueTokens.ts`
  - `passkey/` — WebAuthn passkey routes (`/auth/passkey/*` for registration/login, `/auth/passkeys` for listing/deleting). RP ID configurable via `WEBAUTHN_RP_ID` env var
- **`authNotifier/`** — `fastify-plugin` that decorates `fastify.authNotifier` with an `AuthNotifier` implementation
  - Production (`NODE_ENV=production`): `EmailAuthNotifier` sends via SMTP
  - Dev: `ConsoleAuthNotifier` logs keys to pino
- **`swagger/`** — mounts OpenAPI docs at `/docs` via `@fastify/swagger` + `@fastify/swagger-ui`
- **`sections/`** — routes prefixed `/sections`
- **`thingsOfTheDay/`** — routes prefixed `/things-of-the-day`
- **`users/`** — routes prefixed `/users` (change password, delete account). Sends `ADMIN_NOTIFY_EMAIL` on account deletion
- **`votes/`** — routes prefixed `/things` for voting (`GET/PUT /:thingId/vote`)
  - Requires auth + `canVote` right. `PUT` with `vote: 0` removes the vote
  - Returns updated `{ plus, minus }` counts
  - Sends `ADMIN_NOTIFY_EMAIL` on every vote action including removal (fire-and-forget, includes thing title)
- **`author/`** — routes prefixed `/author`. `GET /` returns author biography text, date, and optional SEO fields. Sourced from `news` table (id=1). No auth required
- **`cms/`** — routes prefixed `/cms`. Two-layer auth: all routes require `verifyJwt` + editor role (`isEditor`); mutations require `canEditContent` right (bit 12). Shared hook in `hooks.ts`. Sub-plugins:
  - `authorRoutes.ts` — GET + PUT `/cms/author` for about page editing
  - `sectionRoutes.ts` — section types, section statuses, sections CRUD + reorder
  - `sectionThingRoutes.ts` — `GET /things` lists all things for the picker + things within sections CRUD + reorder
  - `thingRoutes.ts` — thing CRUD: GET/POST/PUT/DELETE `/cms/things/:thingId` with notes, SEO, info sync + thing statuses/categories reference data
  - Sections: `statusId` (1=Preparing, 2=Published, 3=Editing, 4=Withdrawn); public API filters `WHERE section_status_id IN (2, 3)`
  - Reorder endpoints accept plain array body `[id1, id2, ...]`
  - Section settings: API `{ showAll, reverseOrder }` ↔ DB `{ show_all, things_order }`; stored as `NULL` when all defaults
  - Reordering things: two-phase UPDATE with high offset to avoid unique constraint conflicts
  - DELETE section: cascades thing_identifiers, refuses if external redirects point in
  - DELETE thing: refuses if thing is in any section

Each route plugin is split into: `*.ts` (handler), `schemas.ts`, `queries.ts`, `databaseHelpers.ts`.

Shared utilities in `src/lib/`:
- `schemas.ts` — Zod schemas (shared `thingSchema`, `errorResponse`)
- `queries.ts` — SQL fragments (thing fields, user vote field)
- `mappers.ts` — row mappers (`mapThingBaseRow`, `splitLines`, `parseJSON`, `thingDisplayTitle`)
- `databaseHelpers.ts` — `withConnection` (pool acquire/release)
- `email.ts` — SMTP transport via nodemailer
- `emailTemplates.ts` — email templates (auth + admin notifications: `thingVotedEmail`, `accountRegisteredEmail`, `accountDeletedEmail`)
- `maskEmail.ts` — masks emails for logging
- `authNotifier/` — `AuthNotifier` interface, `EmailAuthNotifier` (production), `ConsoleAuthNotifier` (dev)

Plugin schemas extend or re-export from `src/lib/schemas.ts`. Auth notifications use `fastify.authNotifier`; admin notifications use `sendEmail` directly (fire-and-forget).

Validation and serialization use `fastify-type-provider-zod`. All Fastify route schemas reference Zod objects.

## Key Patterns

**Types are derived from Zod schemas** — never write standalone TypeScript interfaces for data that already has a Zod schema. Use `z.infer<typeof Schema>`. All type names use PascalCase.

**Type-only imports** use `import type` (or inline `type` for mixed imports).

**Audio attachments** in `thingSchema` (`src/lib/schemas.ts`) — each audio item has `preload?: 'none'`, `title?: string`, and `sources` (array of `{src, type: 'audio/mpeg'}`). The `title` field is optional and used by the frontend audio player as the track display name.

**Notes aggregation** uses a correlated subquery with `GROUP_CONCAT(JSON_QUOTE(text) ORDER BY id SEPARATOR ',')` wrapped in `CONCAT('[', ..., ']')` (legacy pattern — `JSON_ARRAYAGG` is available on the current MySQL 8.4.8 if refactored).

**`things-of-the-day` selection** — primary query matches by `MM-DD` ignoring year via `SUBSTRING(thing_finish_date, 6)`, also handles partial dates (`YYYY-MM-00`, `YYYY-00-00`), ordered newest year first. Fallback uses `RAND(TO_DAYS(CURDATE()))` seeded by date for stable daily randomness. Results are grouped by `thing_id` in the app to collect `sections: [{id, position}]`.

**`withConnection(mysql, fn)`** in `src/lib/databaseHelpers.ts` — shared helper for all DB access; handles pool acquire/release via try/finally. MySQL server timezone is set to `+03:00` (Moscow) via `default-time-zone` in `mysql.cnf` — all `NOW()`, `CURDATE()`, and timestamp comparisons run in Moscow time. Verification key TTL checks use `Date.now()` (Node.js clock, UTC epoch) against the key's embedded timestamp (also `Date.now()` at generation) — self-consistent regardless of server timezone. These two clocks (DB server vs Node.js) don't cross.

**Logging** uses `pino-pretty` only when `NODE_ENV !== 'production'`; raw Pino otherwise.

**Deployment** is via Docker (multi-stage build targeting `node:24-alpine`) and a GitHub Actions workflow. On merge to `master`, CI builds the image, pushes it to GHCR (`ghcr.io/mellonis/api.mellonis.ru:<sha>` and `:latest`), then SSHs to the VPS and runs `run-poetry.api.sh` (lives on the VPS only, not in the repo) with `IMAGE` set to the SHA-tagged image. The workflow can also be triggered manually via `workflow_dispatch` (useful for redeploying without a new commit). Add the `skip-deploy` label to a PR to prevent deployment on merge. PRs touching only `.md` files, `api.http`, or `smoke-test*.sh` skip the workflow entirely. When upgrading Node.js, keep the version in sync across: `Dockerfile`, `.github/workflows/deploy.yml` (`node-version`), `tsconfig.json` (`@tsconfig/nodeXX`), and `package.json` (`@tsconfig/nodeXX` and `@types/node` devDependencies — both should match the Node.js major version).
