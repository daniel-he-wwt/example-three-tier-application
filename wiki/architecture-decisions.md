# Architecture Decisions

Lightweight ADR-style record of the main design choices in this repository, reconstructed from the code. Status is "Accepted" unless noted. Note: the repository as a whole is **deprecated** and kept for reference only.

---

## ADR-001: Three-tier split (web → API → database)

- **Context:** The repo is a reference implementation that shows how the tiers of a typical web app talk to each other, using a simple to-do list as the domain.
- **Decision:** Three independently built and deployed units:
  `Browser → Web (Next.js :3000) → API (Express :3001) → PostgreSQL 17`, plus a separate migration unit (`src/db`).
- **Consequences:** Each tier has its own Dockerfile, dependencies and scaling. Features that cross tiers need coordinated changes (migration → API → UI).

## ADR-002: API is internal only; all external traffic goes through the web tier

- **Decision:** The browser never calls the API. Next.js Server Actions (`src/web/app/actions.ts`) call the API from the server using `API_URL`.
  - Locally: the API uses `expose: 3001` only, and only web publishes `3000:3000`.
  - GCP: API Cloud Run ingress is `INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER`, while web ingress is `INGRESS_TRAFFIC_ALL` with `allUsers` invoker.
- **Consequences:** No CORS setup is needed and the API's attack surface is smaller. On the other hand, every API call costs an extra server hop, and there is no public API for other clients.

## ADR-003: Express 5 + raw `pg` (no ORM)

- **Decision:** The API is a single `index.js` of Express routes using a shared `pg.Pool` (`db.js`) and hand-written, parameterised SQL.
- **Consequences:** Small and easy to read for a reference app. Validation, error handling and response shaping are written by hand in each route.

## ADR-004: Schema managed by node-pg-migrate in a dedicated migration container

- **Decision:** Migrations live in `src/db/migrations` and are packaged as their own image (`CMD npx node-pg-migrate up`).
  - Locally: the `migrate` Compose service waits for Postgres to be healthy, runs, and exits. The API starts only after `service_completed_successfully`.
  - GCP: a Cloud Run Job `${app_name}-${env}-migrate` (`migration.tf`, `max_retries = 3`) is executed by CI after `terraform apply`.
- **Consequences:** The API never changes the schema. Migrations are append-only, and each has a `down`.

## ADR-005: Next.js App Router with Server Actions and standalone output

- **Decision:** Next.js 16 / React 19 / TypeScript / Tailwind 4. The page (`app/page.tsx`) is an async Server Component, and mutations are Server Actions followed by `revalidatePath('/')`. `output: "standalone"` gives a small multi-stage runtime image (`node server.js`).
- **Consequences:** The UI works without client-side JavaScript state. Each mutation causes a full server re-render of `/`.

## ADR-006: Configuration through environment variables

- **Decision:** `DATABASE_URL`, `PORT` and `API_URL` are the only config inputs. In Compose they are set inline. In GCP, `DATABASE_URL` comes from Secret Manager and `API_URL` is wired from the API service's URI in Terraform.
- **Consequences:** The same images run in every environment, with no config files baked in.

## ADR-007: GCP deployment: Cloud Run + private Cloud SQL, provisioned by Terraform

- **Decision:** `src/infrastructure` provisions:
  - A custom VPC and subnet (`10.0.0.0/24`), a private services peering range, and a Serverless VPC Access connector (`10.0.1.0/28`, e2-micro, 2–10 instances).
  - A Cloud SQL Postgres 17 instance with a **private IP only** (`ipv4_enabled = false`), a `db-f1-micro` default tier, and a generated 32-character password.
  - A Secret Manager secret with the full `DATABASE_URL`.
  - One shared service account for both Cloud Run services and the migrate job (`cloudsql.client`, `secretAccessor`, `run.invoker` on the API).
  - Cloud Run v2 services for the API (egress `ALL_TRAFFIC`) and web (egress `PRIVATE_RANGES_ONLY`), each with a 1 CPU / 512Mi limit and probes.
- **Environment differences:** `prod` gets a REGIONAL (HA) database, automated backups at 03:00, deletion protection, and `min_instance_count = 1`. `dev` and `staging` are zonal, have no backups, and scale to zero.
- **State:** GCS backend. CI supplies the bucket and prefix (`terraform/<env>`).

## ADR-008: CI/CD with GitHub Actions and Workload Identity Federation

- **Decision:** `.github/workflows/deploy.yml` runs on push to `main` (deploys `dev`) or by manual dispatch (`dev`, `staging` or `prod`):
  1. **build:** builds and pushes the `api`, `web` and `db` images to `gcr.io/<project>/<name>`, tagged with `:<sha>` and `:latest`, using a registry build cache.
  2. **infrastructure:** `terraform init`, then `plan -out`, then `apply -auto-approve`.
  3. **migrate:** `gcloud run jobs execute <app>-<env>-migrate --wait`.
- Authentication uses OIDC Workload Identity (`GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_SERVICE_ACCOUNT`), so the workflow stores no long-lived keys. Other secrets: `GCP_PROJECT_ID`, `TF_STATE_BUCKET`. GitHub Environments limit each job to its target environment.
- **Consequences:** Migrations run **after** the new API revision is already deployed by `terraform apply` (see [known-issues.md](known-issues.md)).

## Data model

| Table | Columns | Migration |
|-------|---------|-----------|
| `users` | `id serial PK`, `email varchar(255) unique not null`, `created_at timestamp default now()` | `1718500000000_initial-schema.js` |
| `tasks` | `id serial PK`, `title varchar(500) not null`, `completed boolean default false`, `created_at timestamp default now()` | `1718500001000_create-tasks.js` |

`users` exists, but nothing uses it yet: tasks have no owner and there is no authentication.

## API surface

| Method | Path | Notes |
|--------|------|-------|
| GET | `/health` | `{ "status": "ok" }`; used by Cloud Run probes |
| GET | `/tasks` | All tasks, ordered by `created_at ASC` |
| POST | `/tasks` | `{ title }`, trimmed and required, otherwise 400; returns 201 |
| PATCH | `/tasks/:id` | `{ completed?, title? }`; 404 if the task is missing |
