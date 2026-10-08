# Working with AI Agents on this repo

This guide covers how to use [Claude Code](https://claude.ai/code) effectively with this codebase, and general patterns for AI-assisted development on three-tier applications.

## Getting started with Claude Code

Claude Code is a CLI tool that can read your codebase, run commands, edit files, and reason about multi-file changes. Install it and open this repo:

```bash
npm install -g @anthropic-ai/claude-code
cd example-three-tier-application
claude
```

Claude Code reads the project structure automatically. It works best when you give it specific, scoped tasks rather than broad ones.

## Custom slash commands

This repo ships a few project-specific slash commands under `.claude/commands/`.
They're available in any Claude Code session opened in this repo:

- `/todos` — scans the whole codebase for `TODO`, `FIXME`, `HACK`, and `XXX`
  markers and lists them grouped by file, so you can see outstanding work
  without leaving the terminal.

Add new ones by dropping a markdown file with the command's instructions into
`.claude/commands/<name>.md` — the filename becomes `/<name>`.

## Suggested prompts for common tasks

### Understanding the codebase

```
Explain how a task flows from the browser through the web tier, to the API, and into the database.
```

```
What tables exist in the database and what are their schemas?
```

```
Walk me through what happens when docker compose up runs, in order.
```

### Adding features

```
Add a DELETE /tasks/:id endpoint to the API and wire it up to a delete button in the frontend.
```

```
Add a due_date column to the tasks table. Create the migration, update the API to accept and return it, and show it in the UI.
```

```
Add input validation to the POST /tasks endpoint so that titles longer than 200 characters are rejected with a 422 status.
```

### Database migrations

```
Create a node-pg-migrate migration that adds a priority column (integer, default 0) to the tasks table.
```

```
Show me all the migrations that have been applied and what schema they created.
```

### Docker and infrastructure

```
The migrate service keeps restarting. Read the Dockerfile and docker-compose.yml and tell me why.
```

```
Add a .env.example file documenting all environment variables used across the three services.
```

```
Explain the Terraform in src/infrastructure/ and what GCP resources it creates.
```

### Code review and cleanup

```
Review the API's error handling. Are there cases where the server could crash or return an unhelpful error?
```

```
Is there any N+1 query risk in the API? Check all database calls.
```

## General AI-assisted development tips

### Give context, not just a command

Instead of:
> "Fix the bug"

Try:
> "The PATCH /tasks/:id endpoint returns 200 even when the id doesn't exist. Fix it to return 404."

Claude Code can find the relevant file, but telling it which endpoint and what the expected behavior is saves a round-trip.

### Scope changes to one tier at a time

Three-tier apps have a natural seam at each layer boundary. When adding a feature, ask Claude to do one layer at a time and verify each before moving on:

1. Migration first — get the schema right
2. API next — add the endpoint and test it with curl
3. Frontend last — wire up the UI

### Let Claude run the app

Claude Code can execute `docker compose up` and observe logs. If something breaks at runtime, you can ask:

```
Run docker compose up and tell me what errors appear in the logs.
```

### Use it to write one-off scripts

For tasks like seeding data or inspecting the database:

```
Write a script that seeds the tasks table with 10 sample tasks using the API's POST /tasks endpoint.
```

### Ask for explanations before changes

Before a risky change (schema migration, refactor), ask Claude to explain what it plans to do:

```
Before you make any changes, explain your plan for adding user authentication to this app.
```

## Project-specific conventions

- **Migrations are append-only** — never edit an existing migration file; create a new one.
- **The API is internal** — it's not exposed outside the Docker network; all external traffic goes through the web tier.
- **Environment variables are the config boundary** — connection strings, ports, and URLs are all passed via env vars. No hardcoded values.
- **Node 22 / PostgreSQL 17** — match these versions in any new Dockerfiles or dependencies.
