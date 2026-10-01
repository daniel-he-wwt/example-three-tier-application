# Coding Standards

> ⚠️ This repository is **deprecated** (see `README.md`) and kept for reference only. These standards describe the conventions the code follows today, so changes stay consistent with them.

## Scope

Applies to all code under `src/`: the API (`src/api`), the database migrations (`src/db`), the web frontend (`src/web`) and the Terraform (`src/infrastructure`), plus `docker-compose.yml` and `.github/workflows/deploy.yml`.

## General

- **Runtime versions are pinned project-wide:** Node.js 22 (`node:22-alpine`) and PostgreSQL 17 (`postgres:17-alpine` locally, `POSTGRES_17` on Cloud SQL). Use the same versions in any new Dockerfile or dependency (`agents.md`).
- **Environment variables are the config boundary.** Connection strings, ports and service URLs come from env vars (`DATABASE_URL`, `PORT`, `API_URL`). Do not hardcode them. The only defaults allowed are local-development fallbacks such as `PORT || 3001`.
- **One tier at a time.** For a feature that touches every layer, change the migration first, then the API (check it with curl), then the UI (`agents.md`).
- Every tier has its own `package.json`, `package-lock.json`, `Dockerfile` and `.dockerignore`. Commit lockfiles, and install with `npm ci` in Docker builds.

## API (`src/api`, Express 5, CommonJS)

- Plain JavaScript with `require` (`"type": "commonjs"`). Routes live in `index.js`. The shared `pg` `Pool` is exported from `db.js`, and all queries go through it.
- **Always use parameterised queries** (`$1, $2, …`). Never put request data into SQL strings.
- Route handlers are `async`. Express 5 sends rejected promises to the error handler, so you don't need a try/catch around each `await` just to stop crashes. Do add explicit handling where a specific status code is needed.
- Validate request bodies at the top of the handler and return `400` with `{ "error": "<message>" }`. Return `404` with `{ "error": "Not found" }` when a resource is missing.
- Status codes: `201` plus the created row for POST, `200` plus the row for GET and PATCH.
- Return database rows straight from `RETURNING *`. The JSON field names match the column names (snake_case, e.g. `created_at`).
- Keep `GET /health` cheap and free of dependencies. Cloud Run startup and liveness probes use it.
- Comment each route in the form `// METHOD /path — description`.

## Database migrations (`src/db`, node-pg-migrate)

- **Migrations are append-only.** Never edit a migration that has been merged. Add a new one instead.
- File name: `<unix-ms-timestamp>_<kebab-description>.js`, for example `1718500001000_create-tasks.js`.
- Each file exports both `up` and `down` (CommonJS `exports.up = (pgm) => {…}`), and `down` must fully reverse `up`.
- Column conventions used so far: `serial` primary key `id`, `notNull` on required columns, and `created_at timestamp NOT NULL DEFAULT now()`.
- Locally, the `migrate` Compose service runs migrations. In GCP, the `*-migrate` Cloud Run Job runs them.

## Web (`src/web`, Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4)

- **Read the bundled Next.js docs before writing code.** `src/web/AGENTS.md` warns that this Next.js version has breaking changes compared with older versions. Check `node_modules/next/dist/docs/` and heed deprecation notices.
- Data access goes through **Server Actions** in `app/actions.ts` (`'use server'`). The browser never calls the API directly. Only the Next.js server talks to `API_URL`.
- Call `revalidatePath('/')` after a mutation, and fetch reads with `cache: 'no-store'`.
- Define shared response types next to the actions (e.g. `type Task`) so they match the API's JSON shape.
- Style with Tailwind utility classes and support dark mode with `dark:` variants (zinc palette).
- Use forms with `action={serverAction}` for mutations, and give icon-only buttons an `aria-label`.
- Lint with `npm run lint` (ESLint 9 with `eslint-config-next`).
- Keep `output: "standalone"` in `next.config.ts`. The runtime Docker stage depends on `.next/standalone`.

## Infrastructure (`src/infrastructure`, Terraform ≥ 1.5, google provider ~> 5.0)

- Name resources `${app_name}-${environment}-<suffix>` (`local.name_prefix`). The deploy workflow depends on this pattern, e.g. for the `todo-dev-migrate` job name.
- `environment` must be `dev`, `staging` or `prod` (enforced by a validation block). Use `var.environment == "prod"` conditionals for prod-only behaviour (HA, backups, deletion protection, min instances).
- No hardcoded backend values. The GCS bucket and prefix are passed with `-backend-config` at `init` time.
- Secrets go in Secret Manager and reach containers through `secret_key_ref`. Never put them in plain `env` values.
- Group resources with `# ── Section ──` banner comments, and give every variable and output a `description`.

## Containers

- Base image `node:22-alpine`. Install production dependencies with `npm ci --omit=dev`, except the web builder stage, which needs dev dependencies to build.
- The web image is a multi-stage build (`deps` → `builder` → `runner`).
- Ports: web `3000` (the only port published to the host), API `3001` (`expose` only, internal).

## Testing

- No automated tests exist yet. `npm test` is the npm placeholder and exits 1 (see [known-issues.md](known-issues.md)). Until tests are added, check changes with `docker compose up --build` and curl or browser checks.
