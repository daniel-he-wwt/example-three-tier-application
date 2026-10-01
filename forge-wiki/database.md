# Database Schema and Migrations

The PostgreSQL database is managed with node-pg-migrate for schema versioning.

## Overview

- **Database:** PostgreSQL 17
- **Migration tool:** node-pg-migrate
- **Migration files:** `src/db/migrations/`
- **Connection:** Uses `DATABASE_URL` environment variable

## Schema

### Users Table

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
```

**Columns:**

- `id` — Auto-incrementing primary key
- `email` — User email, unique constraint
- `created_at` — Timestamp, defaults to current time

**Status:** Defined but not used in the application (legacy from initial schema design).

### Tasks Table

```sql
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
```

**Columns:**

- `id` — Auto-incrementing primary key
- `title` — Task description, up to 500 characters
- `completed` — Boolean flag, defaults to `false`
- `created_at` — Timestamp, defaults to current time

**Usage:** Stores all tasks managed by the application.

## Migrations

Migrations are ordered by timestamp and applied sequentially using node-pg-migrate.

### Migration Files

#### `1718500000000_initial-schema.js`

Creates the `users` table.

- **Purpose:** Legacy schema setup
- **Status:** Applied but not used

#### `1718500001000_create-tasks.js`

Creates the `tasks` table.

- **Purpose:** Core application table
- **Status:** Active, used by the API

## Running Migrations

### Local Development

Migrations run automatically when the Docker Compose stack starts:

1. The `migrate` service runs `node-pg-migrate up`
2. All pending migrations are applied
3. The `api` service starts after migrations complete

### Manual Execution

Apply migrations:

```bash
cd src/db
DATABASE_URL=postgres://app:app@localhost:5432/app npx node-pg-migrate up
```

Roll back the last migration:

```bash
DATABASE_URL=postgres://app:app@localhost:5432/app npx node-pg-migrate down
```

Get migration status:

```bash
DATABASE_URL=postgres://app:app@localhost:5432/app npx node-pg-migrate status
```

### Cloud Deployment

A Cloud Run Job (`src/infrastructure/migration.tf`) runs migrations before deploying the API:

```bash
gcloud run jobs execute <job-name> --region <region>
```

The job has access to the Cloud SQL instance through a VPC Access Connector.

## Creating New Migrations

### Generate Migration File

```bash
cd src/db
DATABASE_URL=postgres://app:app@localhost:5432/app npx node-pg-migrate create <migration-name>
```

This creates a new file like `1718500002000_<migration-name>.js`.

### Edit Migration

Open the generated file and implement `up` and `down` functions:

```javascript
exports.up = (pgm) => {
  pgm.createTable('new_table', {
    id: { type: 'serial', primaryKey: true },
    name: { type: 'varchar(255)', notNull: true },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('new_table');
};
```

### Apply Migration

```bash
DATABASE_URL=postgres://app:app@localhost:5432/app npx node-pg-migrate up
```

## node-pg-migrate Basics

The `pgm` object provides helpers for common operations:

- `pgm.createTable(name, columns)` — Create a table
- `pgm.dropTable(name)` — Drop a table
- `pgm.addColumns(name, columns)` — Add columns
- `pgm.dropColumns(name, columns)` — Remove columns
- `pgm.addConstraint(name, constraint)` — Add constraint
- `pgm.createIndex(table, columns)` — Create index
- `pgm.renameTable(oldName, newName)` — Rename table

See [node-pg-migrate docs](https://salsita.github.io/node-pg-migrate/) for complete reference.

## Database Utilities

### Connection String

The format is:

```
postgres://[user]:[password]@[host]:[port]/[database]
```

**Local development:**

```
postgres://app:app@localhost:5432/app
```

**Cloud SQL (Cloud Run):**

```
postgres://app:[generated-password]@[private-ip]:5432/app
```

Accessed through VPC Access Connector.

### Connection Pool

The API uses a PostgreSQL connection pool (client library: `pg`):

```javascript
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
```

**Configuration in Terraform:**

- Max connections: 100 (set in Cloud SQL)
- Default pool size: 10
- Idle timeout: 30 seconds

## Backup and Recovery

### Local Development

Data persists in the `postgres_data` Docker volume.

Stop containers:

```bash
docker compose down
```

Start containers to recover data:

```bash
docker compose up
```

Delete data:

```bash
docker compose down -v
```

### Cloud SQL (Production)

Automated backups are configured in Terraform for production environments:

- **Enabled for:** `environment == "prod"`
- **Start time:** 03:00 UTC
- **Retention:** 7 days (GCP default)

To manually backup:

```bash
gcloud sql backups create --instance <instance-name>
```

Restore from backup:

```bash
gcloud sql backups restore <backup-id> --backup-instance <instance-name>
```

## Monitoring

### Check Table Structure

```sql
\d tasks
\d users
```

### View Data

```sql
SELECT * FROM tasks ORDER BY created_at DESC;
```

### Query Performance

```sql
EXPLAIN ANALYZE SELECT * FROM tasks WHERE completed = false;
```

## Constraints and Indexes

Current schema uses:

- **Primary key indexes** — Automatic on `id` columns
- **Unique constraint** — `users.email` is unique
- **Not null constraints** — All columns except where NULL is allowed

Consider adding indexes for frequent queries:

```sql
CREATE INDEX idx_tasks_completed ON tasks(completed);
```

## Testing

### Seed Test Data

```sql
INSERT INTO tasks (title, completed) VALUES
  ('Buy groceries', false),
  ('Write documentation', true),
  ('Deploy to production', false);
```

### Reset Database

```bash
docker compose down -v
docker compose up
```

This deletes all data and re-applies migrations.
