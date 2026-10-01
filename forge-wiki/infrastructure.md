# Infrastructure and Deployment

Deploy the application to Google Cloud Platform using Terraform.

## Overview

The Terraform configuration in `src/infrastructure/` provisions a complete three-tier application stack on GCP:

- **Network:** VPC with private subnets
- **Database:** Cloud SQL PostgreSQL 17 (private IP)
- **API:** Cloud Run service (internal only)
- **Frontend:** Cloud Run service (public)
- **Migrations:** Cloud Run Job for database setup
- **Security:** Service accounts, IAM roles, secrets

## Architecture

```
┌─────────────────────────────────────────┐
│         Google Cloud Platform           │
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────────────────────────────┐  │
│  │      Public Internet              │  │
│  │    (Cloud Load Balancer)          │  │
│  └──────────────┬────────────────────┘  │
│                 │                        │
│  ┌──────────────▼────────────────────┐  │
│  │  Cloud Run: Web Frontend          │  │
│  │  (Public, Ingress: All)           │  │
│  └──────────────┬────────────────────┘  │
│                 │                        │
│  ┌──────────────┴────────────────────┐  │
│  │    VPC Access Connector            │  │
│  │  (Private traffic bridge)          │  │
│  └──────────────┬────────────────────┘  │
│                 │                        │
│  ┌─────────────────────────────────┐    │
│  │         VPC Network             │    │
│  │  ┌─────────────────────────────┐│    │
│  │  │ Cloud Run: API (Private)    ││    │
│  │  │ Ingress: Internal LB        ││    │
│  │  └──────────────┬──────────────┘│    │
│  │                 │               │    │
│  │  ┌──────────────▼─────────────┐ │    │
│  │  │ Cloud SQL: PostgreSQL      │ │    │
│  │  │ (Private IP Only)          │ │    │
│  │  └────────────────────────────┘ │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ Secret Manager: DATABASE_URL    │    │
│  └─────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

## Prerequisites

- GCP account with billing enabled
- `terraform` CLI (>= 1.5)
- `gcloud` CLI configured
- Container images pushed to Container Registry or Artifact Registry

## Configuration Files

### main.tf

Defines all resources:

- VPC and networking
- Cloud SQL instance and database
- Secret Manager secret
- Service account and IAM roles
- Cloud Run services (API and web)
- Cloud Run Job for migrations
- IAM bindings for service-to-service communication

### variables.tf

Configuration parameters with defaults:

| Variable | Default | Description |
|----------|---------|-------------|
| `project_id` | — | GCP project ID (required) |
| `region` | `us-central1` | GCP region |
| `app_name` | `todo` | Resource name prefix |
| `environment` | `dev` | Deployment environment (dev/staging/prod) |
| `subnet_cidr` | `10.0.0.0/24` | VPC subnet CIDR |
| `connector_cidr` | `10.0.1.0/28` | VPC Access Connector CIDR (/28 only) |
| `db_tier` | `db-f1-micro` | Cloud SQL machine tier |
| `api_image` | — | API container image URI (required) |
| `web_image` | — | Web container image URI (required) |
| `api_max_instances` | 10 | Cloud Run max instances (API) |
| `web_max_instances` | 10 | Cloud Run max instances (web) |

### outputs.tf

Exposes useful information after deployment:

- `web_url` — Public URL of the frontend
- `api_url` — Internal URL of the API
- `db_private_ip` — Private IP of Cloud SQL
- `db_instance_name` — Cloud SQL connection name
- `vpc_name` — VPC network name
- `service_account_email` — Service account for Cloud Run
- `db_url_secret_id` — Secret Manager secret ID

### migration.tf

Defines a Cloud Run Job for running database migrations before API deployment.

## Deployment Steps

### 1. Build and Push Container Images

Build the API, web, and database migration images and push to Container Registry:

```bash
# Build images
docker build -t gcr.io/PROJECT_ID/api:latest ./src/api
docker build -t gcr.io/PROJECT_ID/web:latest ./src/web
docker build -t gcr.io/PROJECT_ID/db:latest ./src/db

# Push to Container Registry
docker push gcr.io/PROJECT_ID/api:latest
docker push gcr.io/PROJECT_ID/web:latest
docker push gcr.io/PROJECT_ID/db:latest
```

Replace `PROJECT_ID` with your GCP project ID.

### 2. Initialize Terraform Backend

Set up a GCS bucket for Terraform state:

```bash
# Create state bucket
gsutil mb gs://PROJECT_ID-terraform-state

# Enable versioning
gsutil versioning set on gs://PROJECT_ID-terraform-state
```

### 3. Initialize Terraform

```bash
cd src/infrastructure
terraform init \
  -backend-config="bucket=PROJECT_ID-terraform-state" \
  -backend-config="prefix=todo/prod"
```

The prefix can vary (e.g., `todo/dev`, `todo/staging`).

### 4. Plan Deployment

```bash
terraform plan \
  -var="project_id=PROJECT_ID" \
  -var="api_image=gcr.io/PROJECT_ID/api:latest" \
  -var="web_image=gcr.io/PROJECT_ID/web:latest" \
  -var="environment=prod"
```

Review the resource changes.

### 5. Apply Configuration

```bash
terraform apply \
  -var="project_id=PROJECT_ID" \
  -var="api_image=gcr.io/PROJECT_ID/api:latest" \
  -var="web_image=gcr.io/PROJECT_ID/web:latest" \
  -var="environment=prod"
```

Terraform will prompt for confirmation before creating resources.

### 6. Run Database Migrations

After `apply` completes, run the migration job:

```bash
gcloud run jobs execute todo-prod-migrate --region us-central1
```

Wait for the job to complete:

```bash
gcloud run jobs describe todo-prod-migrate --region us-central1
```

### 7. Get Application URL

```bash
terraform output web_url
```

Open the URL in a browser to access the deployed application.

## Resource Details

### VPC and Networking

**VPC Network:**

- Isolates resources from the public internet
- No external IPs unless explicitly configured
- Private services access enabled for Cloud SQL

**Subnet:**

- CIDR: `10.0.0.0/24` (configurable)
- Private IP Google Access enabled for GCP service APIs

**VPC Access Connector:**

- Bridges Cloud Run to VPC-private resources
- CIDR: `10.0.1.0/28` (must be /28, not overlap subnet)
- Min instances: 2, max instances: 10

### Cloud SQL

**Instance:**

- Engine: PostgreSQL 17
- Tier: `db-f1-micro` (configurable, e.g., `db-custom-2-7680` for more power)
- Storage: SSD, auto-resize enabled
- Backups: Enabled for production environments (daily, 7-day retention)
- Availability:
  - **dev:** Zonal (single zone)
  - **prod:** Regional (multi-zone for HA)

**Database:**

- Name: `app`
- Encoding: UTF-8

**User:**

- Username: `app`
- Password: Generated randomly, stored in Secret Manager

**Network:**

- Private IP only (no public IP)
- Connected via VPC peering with private services

### Secret Manager

**Secret:** `DATABASE_URL`

Contains the PostgreSQL connection string:

```
postgres://app:[password]@[private-ip]:5432/app
```

Accessible only by the Cloud Run service account via IAM role `roles/secretmanager.secretAccessor`.

### Service Account

**Account:** `todo-prod-run@PROJECT_ID.iam.gserviceaccount.com`

**Roles:**

- `roles/cloudsql.client` — Access to Cloud SQL
- `roles/secretmanager.secretAccessor` — Read `DATABASE_URL` secret

Both Cloud Run services (API and web) use this account.

### Cloud Run: API

**Service:** `todo-prod-api`

- **Image:** Specified in `var.api_image`
- **Port:** 3001
- **Ingress:** Internal Load Balancer (internal traffic only)
- **VPC Access:** All egress traffic routed through VPC
- **Scaling:**
  - **dev:** Min 0 instances (scales to 0 when idle)
  - **prod:** Min 1 instance (always running)
  - Max: Configurable (default 10)

**Environment Variables:**

- `DATABASE_URL` — From Secret Manager
- `PORT` — 3001

**Health Checks:**

- **Startup probe** — `/health` endpoint, max 50 seconds
- **Liveness probe** — `/health` endpoint, every 30 seconds

### Cloud Run: Web

**Service:** `todo-prod-web`

- **Image:** Specified in `var.web_image`
- **Port:** 3000
- **Ingress:** All traffic (public)
- **VPC Access:** Private ranges only (reaches API and database)
- **Scaling:** Same as API

**Environment Variables:**

- `PORT` — 3000
- `API_URL` — Dynamically set to the API service URI

**Health Checks:**

- **Startup probe** — `/` endpoint, max 50 seconds

### Cloud Run Job: Migrations

**Job:** `todo-prod-migrate`

Runs on-demand to apply database migrations.

```bash
gcloud run jobs execute todo-prod-migrate --region us-central1
```

- **Image:** Specified in `var.db_image`
- **Command:** Runs `node-pg-migrate up` via Dockerfile
- **VPC Access:** All egress through VPC
- **Max retries:** 3

## Updates and Changes

### Update Application Code

1. Build new image:

   ```bash
   docker build -t gcr.io/PROJECT_ID/api:v2 ./src/api
   docker push gcr.io/PROJECT_ID/api:v2
   ```

2. Plan Terraform changes:

   ```bash
   terraform plan -var="api_image=gcr.io/PROJECT_ID/api:v2" ...
   ```

3. Apply:

   ```bash
   terraform apply -var="api_image=gcr.io/PROJECT_ID/api:v2" ...
   ```

Cloud Run automatically redeploys with the new image.

### Scale Application

Adjust instance counts:

```bash
terraform apply \
  -var="api_max_instances=20" \
  -var="web_max_instances=20" \
  ...
```

### Change Database Tier

```bash
terraform apply -var="db_tier=db-custom-2-7680" ...
```

Causes brief downtime during upgrade.

## Troubleshooting

### Terraform state lock

If Terraform hangs on state lock:

```bash
terraform force-unlock <LOCK_ID>
```

Get the lock ID from the error message.

### Cloud Run service won't start

Check logs:

```bash
gcloud run services describe todo-prod-api --region us-central1
gcloud logging read "resource.type=cloud_run_revision AND labels.service_name=todo-prod-api" --limit 50
```

### Database connection fails

Verify:

```bash
# Secret exists
gcloud secrets versions access latest --secret="todo-prod-db-url"

# Service account has permissions
gcloud projects get-iam-policy PROJECT_ID --flatten="bindings[].members" --filter="bindings.members:serviceAccount:*"
```

### VPC Access Connector issues

Check status:

```bash
gcloud compute networks vpc-access connectors describe todo-prod-connector --region us-central1
```

Wait for it to reach "READY" state (takes ~5 minutes to provision).

## Cleanup

Destroy all resources:

```bash
terraform destroy \
  -var="project_id=PROJECT_ID" \
  -var="api_image=gcr.io/PROJECT_ID/api:latest" \
  -var="web_image=gcr.io/PROJECT_ID/web:latest"
```

This deletes:

- Cloud Run services and jobs
- Cloud SQL instance (with deletion protection in prod)
- VPC, subnets, and connectors
- Service account and IAM bindings
- Secrets (backups exist in Secret Manager recovery window)

## Security Best Practices

1. **Network isolation** — Database and API are private, only web is public
2. **Service account separation** — Use service account for Cloud Run (not default compute account)
3. **Secret management** — Credentials stored in Secret Manager, not in code
4. **IAM least privilege** — Each service only has necessary permissions
5. **Deletion protection** — Enabled for production Cloud SQL
6. **Backup automation** — Daily backups for production
7. **VPC peering** — Secure private connection between Cloud SQL and Cloud Run

## Cost Considerations

**Typical monthly costs (dev environment):**

- Cloud Run (web): $0.50 (variable, based on requests)
- Cloud Run (API): $1.00 (always running)
- Cloud SQL (db-f1-micro): ~$9
- Storage: ~$0.10
- **Total: ~$10/month**

**Production environment (regional SQL, min 1 instance):**

- Cloud Run services: $2–10
- Cloud SQL (regional): ~$20–50
- **Total: ~$30–70/month**

Prices vary by region. See [GCP pricing calculator](https://cloud.google.com/products/calculator).

## Example: Multi-Environment Setup

Deploy dev and prod in the same project:

```bash
# Dev environment
terraform workspace new dev
terraform apply -var="environment=dev" -var="api_image=..." ...

# Prod environment
terraform workspace new prod
terraform apply -var="environment=prod" -var="api_image=..." ...
```

Each workspace maintains separate state and resources.
