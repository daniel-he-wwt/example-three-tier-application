# Development Setup

Get the application running locally with Docker Compose.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Compose plugin)
- Git

## Starting the Stack

Clone the repository and start all services:

```bash
git clone https://github.com/daniel-he-wwt/example-three-tier-application.git
cd example-three-tier-application
docker compose up --build
```

This command starts four services in order:

1. **postgres** — PostgreSQL 17 database, waits until healthy
2. **migrate** — runs database schema migrations, then exits
3. **api** — Express API on port 3001 (internal only)
4. **web** — Next.js frontend on port 3000 (exposed to host)

Once all services are running and healthy, open [http://localhost:3000](http://localhost:3000) in your browser.

## Stopping and Cleaning Up

### Stop containers (keeps data)

```bash
docker compose down
```

The `postgres_data` volume persists, so data is retained.

### Stop and delete all data

```bash
docker compose down -v
```

## Rebuilding After Code Changes

```bash
docker compose up --build
```

Docker Compose will rebuild modified images and restart services.

## Troubleshooting

### Containers won't start

Check logs for each service:

```bash
docker compose logs postgres
docker compose logs migrate
docker compose logs api
docker compose logs web
```

### Database migrations fail

Verify the migrate service logs:

```bash
docker compose logs migrate
```

If the issue persists, rebuild and start fresh:

```bash
docker compose down -v
docker compose up --build
```

### Port conflicts

If ports 3000 or 3001 are already in use on your machine, modify `docker-compose.yml`:

```yaml
web:
  ports:
    - "3001:3000"  # Maps host:3001 to container:3000
```

Then access the app at `http://localhost:3001`.

## Project Structure

```
src/
├── api/            # Express REST API
│   ├── index.js    # Route handlers
│   ├── db.js       # PostgreSQL connection pool
│   └── Dockerfile
├── db/             # Database migrations
│   ├── migrations/ # node-pg-migrate migration files
│   └── Dockerfile
├── web/            # Next.js frontend
│   ├── app/        # App Router pages and components
│   └── Dockerfile
└── infrastructure/ # Terraform for GCP deployment
    ├── main.tf
    ├── variables.tf
    └── outputs.tf
```

## Docker Compose Services

### postgres

- **Image:** `postgres:17-alpine`
- **Ports:** 5432 (internal only)
- **Database:** `app`
- **User:** `app` / Password: `app`
- **Health check:** `pg_isready` every 5 seconds

### migrate

- **Context:** `src/db/`
- **Runs:** `node-pg-migrate up` to apply all pending migrations
- **Depends on:** postgres (healthy)
- **Restart policy:** on-failure

### api

- **Context:** `src/api/`
- **Port:** 3001 (internal only, use web to access)
- **Environment:** `DATABASE_URL`, `PORT`
- **Depends on:** migrate (completed successfully)

### web

- **Context:** `src/web/`
- **Port:** 3000 (exposed to host)
- **Environment:** `API_URL` (set to `http://api:3001`)
- **Depends on:** api

## Environment Variables

### Local Development (docker-compose.yml)

- `DATABASE_URL` — Connection string for PostgreSQL
- `PORT` — Server listening port
- `API_URL` — URL for the API (web service only)

These are already configured in `docker-compose.yml` and typically don't need to be changed.
