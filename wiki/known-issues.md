# Known Issues

Problems, risks and gaps found by reviewing the code. The repository is **deprecated** (see `README.md`), so many of these may never be fixed. They are recorded so readers who reuse this code know what to watch for.

Severity: **High**: likely to break a deployment or lose data. **Medium**: wrong behaviour or a security weakness. **Low**: cleanup or documentation.

## Summary

| # | Area | Issue | Severity |
|---|------|-------|----------|
| 1 | Infra | Web → API calls in GCP are probably blocked (ingress, egress and auth mismatch) | High |
| 2 | API | Invalid PATCH input causes unhandled 500s | Medium |
| 3 | API | No error handler, and no `pool.on('error')` listener | Medium |
| 4 | Web | Server Actions ignore API failures | Medium |
| 5 | CI/CD | Migrations run after the new API revision is live | Medium |
| 6 | CI/CD | Container Registry (`gcr.io`) is deprecated | Medium |
| 7 | Infra | One service account shared by web, API and migrations | Medium |
| 8 | Infra | DB password stored in Terraform state | Medium |
| 9 | CI/CD | `apply -auto-approve` with no review step, including prod | Medium |
| 10 | Testing | No automated tests; `npm test` exits 1 | Medium |
| 11 | Docs | README Terraform command leaves out the required `db_image` | Low |
| 12 | DB | `users` table unused; timestamps lack a time zone | Low |
| 13 | Infra | Connection-limit and cost points | Low |
| 14 | API | Missing features: no DELETE, no pagination, no auth | Low |

## Details

### 1. Web → API calls in GCP are probably blocked (High, not verified)
In `main.tf`, the API service has `ingress = "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"`, but no internal load balancer is set up. Web calls `google_cloud_run_v2_service.api.uri` (a public `*.run.app` URL) with VPC egress `PRIVATE_RANGES_ONLY`, so that traffic leaves through the public internet rather than the VPC and should be rejected by the ingress setting. The API also has no `allUsers` invoker, and `actions.ts` sends no Google ID token, so requests would get a 403 even if ingress allowed them.
**Fix ideas:** use `INGRESS_TRAFFIC_INTERNAL_ONLY` with web egress `ALL_TRAFFIC`, and add ID-token auth to the web's `fetch` calls (or put an internal load balancer in front of the API).

### 2. Invalid PATCH input causes unhandled 500s (Medium)
`PATCH /tasks/:id` in `src/api/index.js`:
- A non-numeric `:id` becomes `NaN`, and Postgres raises an "invalid input syntax" error, so the client gets a 500 instead of 400 or 404.
- `title` is not type-checked. A non-string value throws on `.trim()`, which gives a 500.
- An empty or whitespace-only `title` is accepted and saved as `""`. POST rejects this.
- Titles over 500 characters (`varchar(500)`) fail in the database with a 500 instead of a 400 or 422. This also affects POST.
- The handler reads and then writes in two queries, which is not atomic. A single `UPDATE … SET col = COALESCE($n, col) … RETURNING *` would fix this.

### 3. No error handler, and no `pool.on('error')` listener (Medium)
Express 5 sends rejected async handlers to its default error handler, which returns an HTML 500 rather than the JSON `{ error }` format the API uses elsewhere. `db.js` attaches no `'error'` listener to the `Pool`, so an error on an idle client (for example, the database restarting) can crash the process. There is also no SIGTERM handling for graceful shutdown on Cloud Run.

### 4. Server Actions ignore API failures (Medium)
`createTask` and `toggleTask` in `src/web/app/actions.ts` never check `res.ok`, so failed creates or updates fail silently and the UI just re-renders. `getTasks` throws, and there is no `error.tsx` boundary to catch it, so an API outage shows the default Next.js error page.

### 5. Migrations run after the new API revision is live (Medium)
In `deploy.yml`, `terraform apply`, which rolls out the new API and web images, runs **before** the `migrate` job. New code can briefly run against the old schema, and if the migration fails, the new code stays live anyway. Either run the migration job before the services roll out, or keep each migration backward-compatible (expand, then contract).

### 6. Container Registry (`gcr.io`) is deprecated (Medium)
The workflow pushes to `gcr.io/<project>/…`. Google has deprecated Container Registry in favour of Artifact Registry, so new projects may be unable to push there. The workflow also pushes a moving `:latest` tag alongside the `:<sha>` tag. Terraform uses the SHA tag, which is correct.

### 7. One service account shared by web, API and migrations (Medium)
`google_service_account.cloud_run` is used by all three. As a result, the public web service has `cloudsql.client` and access to the `DATABASE_URL` secret, which it does not need. Giving each workload its own service account would enforce least privilege.

### 8. DB password stored in Terraform state (Medium)
`random_password.db` and the full connection string in `google_secret_manager_secret_version.db_url` are stored in plaintext in the GCS state. Restrict access to the state bucket (`TF_STATE_BUCKET`) and turn on versioning for it. The local Compose credentials (`app/app`) are for development only.

### 9. `apply -auto-approve` with no review step, including prod (Medium)
Every push to `main` deploys to `dev` automatically, and a manual dispatch can apply to `prod` with no plan review. Add GitHub Environment protection rules (required reviewers) for `staging` and `prod`.

### 10. No automated tests (Medium)
`src/api` and `src/db` keep the npm placeholder `"test": "echo \"Error: no test specified\" && exit 1"`, and `src/web` has no test script. CI doesn't run lint or tests before deploying.

### 11. README Terraform command leaves out the required `db_image` (Low)
`migration.tf` declares `variable "db_image"` with no default, but the README's "Required variables" table and its `terraform apply` example leave it out. Run as written, the command prompts for the value or fails. The README's project-structure tree also omits `migration.tf` and `terraform.tfvars.example`.

### 12. `users` table unused; timestamps lack a time zone (Low)
`1718500000000_initial-schema.js` creates `users`, but no code reads it and `tasks` has no `user_id`. `created_at` uses `timestamp` (without time zone), and `timestamptz` is usually the safer choice. Because migrations are append-only, fixing either one needs a new migration.

### 13. Connection-limit and cost points (Low)
- Cloud SQL `max_connections = 100`, and `pg.Pool` defaults to 10 connections per instance. With `api_max_instances = 10`, the API alone can reach the limit, before migrations take any connections.
- `db-f1-micro` is a shared-core tier that isn't covered by the Cloud SQL SLA.
- The VPC Access connector keeps at least 2 instances running all the time, so `dev` still costs money even when Cloud Run scales to zero.

### 14. Missing features: no DELETE, no pagination, no auth (Low)
There is no endpoint for deleting tasks. `GET /tasks` returns every row, and there is no authentication or authorization of any kind. `agents.md` lists these as example exercises.
