# Frontend Guide

The Next.js frontend is a modern React application built with the App Router, Server Components, and Server Actions.

## Overview

- **Framework:** Next.js 16
- **UI Library:** React 19
- **Styling:** Tailwind CSS
- **Location:** `src/web/`

## Architecture

### App Router Structure

```
src/web/app/
├── layout.tsx      # Root layout wrapping all pages
├── page.tsx        # Homepage (task manager UI)
├── actions.ts      # Server Actions for data fetching and mutations
├── globals.css     # Tailwind CSS and global styles
└── favicon.ico     # App icon
```

### Key Technologies

- **Next.js App Router** — File-based routing (modern, recommended)
- **React Server Components** — Default for improved performance
- **Server Actions** — Form submissions and mutations without API routes
- **Tailwind CSS** — Utility-first CSS framework
- **TypeScript** — Type safety

## Pages

### Homepage (`app/page.tsx`)

The main task manager interface with:

- **Task creation form** — Input field and "Add" button
- **Task list** — Displays all tasks with completion checkboxes
- **Progress indicator** — Shows completed/total task count
- **Dark mode support** — Responsive dark/light styling

#### UI Components

**Add Task Form**

- Text input with placeholder "Add a new task..."
- Uses `createTask` Server Action on form submission
- Input is required

**Task List Items**

Each task displays:

- **Checkbox** — Toggles completion status
- **Title text** — Task description, styled differently for completed tasks
- **Visual feedback** — Strikethrough and color change when completed
- **Submit on click** — Inline form using `toggleTask` Server Action

**Progress Counter**

Shows "X / Y completed" when tasks exist.

## Server Actions

Server Actions in `app/actions.ts` handle all data operations. They run on the server and automatically revalidate the page cache.

### getTasks()

Fetches all tasks from the API.

```typescript
export async function getTasks(): Promise<Task[]>
```

- **Returns:** Array of Task objects
- **Caching:** Disabled (`cache: 'no-store'`)
- **Called by:** `page.tsx` at render time
- **Throws:** Error if API is unreachable

### createTask(formData)

Creates a new task with a title.

```typescript
export async function createTask(formData: FormData): Promise<void>
```

- **Input:** FormData with `title` field
- **API call:** POST `/tasks`
- **Revalidation:** `revalidatePath('/')` updates the page
- **Called by:** Add task form

### toggleTask(id, completed)

Updates a task's completion status.

```typescript
export async function toggleTask(id: number, completed: boolean): Promise<void>
```

- **Input:** Task ID and new completion state
- **API call:** PATCH `/tasks/:id` with `{ completed }`
- **Revalidation:** `revalidatePath('/')` updates the page
- **Called by:** Inline forms on task list items

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `API_URL` | Base URL for API requests | `http://localhost:3001` |
| `PORT` | Server listening port | `3000` |

In development, these are set in `docker-compose.yml`. In production (GCP), they are passed via Cloud Run environment variables.

### Next.js Config

The project uses default Next.js configuration with minimal overrides:

- **TypeScript:** Enabled
- **ESLint:** Configured
- **PostCSS:** Configured for Tailwind CSS

## Styling

### Tailwind CSS

The app uses Tailwind's utility classes for all styling. Key design tokens:

- **Color palette:** Zinc (grays) with dark mode support
- **Spacing:** Standard Tailwind scale
- **Typography:** Responsive font sizes and weights
- **Borders and shadows:** Minimal, clean design

### Dark Mode

Dark mode is supported automatically:

```tsx
className="bg-zinc-50 dark:bg-zinc-900 ..."
```

The browser/OS preference is respected and can be overridden in browser settings.

## Type Definitions

### Task Type

```typescript
export type Task = {
  id: number;
  title: string;
  completed: boolean;
  created_at: string;
};
```

All task data from the API is typed with this interface.

## Development

### Run in Development Mode

```bash
cd src/web
npm install
npm run dev
```

Starts the Next.js dev server on `http://localhost:3000` with hot reloading.

### Build for Production

```bash
npm run build
npm start
```

Compiles the app and starts the production server.

### Linting

```bash
npm run lint
```

Checks code with ESLint.

## Deployment

The frontend is containerized in `Dockerfile` and deployed to Cloud Run as part of the Terraform infrastructure.

### Docker Build

```bash
docker build -t example-app-web .
```

### Environment Variables (Cloud Run)

- `API_URL` — Internal Cloud Run service URL
- `PORT` — 3000 (default)

The frontend needs network access to the API through a VPC Access Connector.

## Performance Notes

- **Server-side rendering** — All pages render on the server by default
- **No client-side JavaScript for data fetching** — Server Actions eliminate the need for `useEffect` and fetch hooks
- **Cache invalidation** — `revalidatePath` re-renders only the affected page
- **Static assets** — CSS and JavaScript are minified and optimized

## Common Tasks

### Add a New Page

Create a new file in `app/`:

```tsx
// app/about.tsx
export default function About() {
  return <h1>About</h1>;
}
```

It's automatically available at `/about`.

### Create a New Server Action

Add a function to `app/actions.ts`:

```typescript
'use server';

export async function myAction(data: any) {
  // Server-only logic
  revalidatePath('/');
}
```

Then call it from a form:

```tsx
<form action={myAction}>
  {/* form inputs */}
</form>
```

### Style a Component

Use Tailwind classes:

```tsx
<div className="bg-white dark:bg-zinc-800 p-4 rounded-lg shadow">
  Content
</div>
```

Refer to [Tailwind CSS docs](https://tailwindcss.com/docs) for available utilities.
