# API Documentation

The Express REST API provides task management endpoints.

## Overview

- **Base URL:** `http://localhost:3001` (local development)
- **Protocol:** HTTP/JSON
- **Authentication:** None (reference implementation)

## Endpoints

### Health Check

```
GET /health
```

Returns the health status of the API.

**Response (200 OK):**

```json
{
  "status": "ok"
}
```

**Example:**

```bash
curl http://localhost:3001/health
```

### List All Tasks

```
GET /tasks
```

Retrieve all tasks, ordered by creation time (oldest first).

**Response (200 OK):**

```json
[
  {
    "id": 1,
    "title": "Buy groceries",
    "completed": false,
    "created_at": "2024-06-15T12:34:56.789Z"
  },
  {
    "id": 2,
    "title": "Write documentation",
    "completed": true,
    "created_at": "2024-06-15T12:35:10.123Z"
  }
]
```

**Example:**

```bash
curl http://localhost:3001/tasks
```

### Create a Task

```
POST /tasks
```

Create a new task with a title.

**Request Body:**

```json
{
  "title": "Buy groceries"
}
```

**Response (201 Created):**

```json
{
  "id": 1,
  "title": "Buy groceries",
  "completed": false,
  "created_at": "2024-06-15T12:34:56.789Z"
}
```

**Validation:**

- `title` is required
- `title` must be a non-empty string (after trimming whitespace)

**Error responses:**

```json
HTTP/1.1 400 Bad Request
{
  "error": "title is required"
}
```

**Example:**

```bash
curl -X POST http://localhost:3001/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Buy groceries"}'
```

### Update a Task

```
PATCH /tasks/:id
```

Update a task's completion status or title (or both).

**URL Parameters:**

- `id` — Task ID (integer)

**Request Body:**

Either or both of the following fields:

```json
{
  "completed": true,
  "title": "Buy milk and bread"
}
```

**Response (200 OK):**

```json
{
  "id": 1,
  "title": "Buy milk and bread",
  "completed": true,
  "created_at": "2024-06-15T12:34:56.789Z"
}
```

**Validation:**

- If `title` is provided, it is trimmed; empty strings after trimming are rejected
- If a field is not provided, the current value is preserved

**Error responses:**

```json
HTTP/1.1 404 Not Found
{
  "error": "Not found"
}
```

**Examples:**

Toggle completion:

```bash
curl -X PATCH http://localhost:3001/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"completed":true}'
```

Rename:

```bash
curl -X PATCH http://localhost:3001/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"title":"New title"}'
```

## Data Types

### Task Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Unique task identifier |
| `title` | string | Task description (max 500 chars) |
| `completed` | boolean | Whether the task is completed |
| `created_at` | ISO 8601 timestamp | When the task was created |

## Implementation Details

### Connection Pooling

The API uses a PostgreSQL connection pool (`pg` library) with configurable limits. The pool is initialized in `src/api/db.js`:

```javascript
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
module.exports = pool;
```

### Error Handling

The API returns appropriate HTTP status codes:

- `200` — Success (GET, PATCH)
- `201` — Created (POST)
- `400` — Bad Request (invalid input)
- `404` — Not Found (task doesn't exist)
- `5xx` — Server errors (database connection issues, etc.)

All errors are returned as JSON with an `error` field.

### Middleware

- **JSON parsing** — `express.json()` for request body parsing
- **CORS** — Not configured (internal communication in deployed setup)
