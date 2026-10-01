# Example Three-Tier Application

This is a reference implementation of a three-tier web application featuring a Next.js frontend, Express REST API, and PostgreSQL database. It demonstrates modern practices for full-stack development and cloud deployment.

> ⚠️ **DEPRECATED** — This repository is no longer maintained and is provided for reference only. Please do not use this for new projects.

## Overview

The application is a simple task manager (to-do list) that showcases how the three tiers communicate:

```
Browser → Web (Next.js :3000) → API (Express :3001) → PostgreSQL
```

## Architecture

| Layer | Technology | Location |
|-------|-----------|----------|
| Frontend | Next.js 16, React 19, Tailwind CSS | `src/web/` |
| API | Express 5, Node.js 22 | `src/api/` |
| Database | PostgreSQL 17 | managed by Docker / Cloud SQL |
| Migrations | node-pg-migrate | `src/db/` |
| Infrastructure | Terraform (GCP) | `src/infrastructure/` |

## Quick Links

- [Development Setup](./development.md) — Run the app locally with Docker Compose
- [API Documentation](./api.md) — REST endpoints and usage
- [Frontend Guide](./frontend.md) — Next.js app structure and server actions
- [Database Schema](./database.md) — Schema design and migrations
- [Infrastructure & Deployment](./infrastructure.md) — GCP Terraform configuration

## Key Features

- **Local development** — Full stack runs in Docker Compose with a single command
- **Database migrations** — Automated schema management with node-pg-migrate
- **Cloud deployment** — Terraform provisioning for GCP (Cloud Run + Cloud SQL)
- **Modern frontend** — Next.js App Router with React Server Components and Server Actions
- **RESTful API** — Express API with JSON responses and error handling
