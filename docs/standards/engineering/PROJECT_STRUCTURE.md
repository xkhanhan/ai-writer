# Project Structure

## Current Source of Truth

The project now runs on one primary structure:

```text
app/
server/
shared/
data/
docs/
```

Older `features/` experiments are no longer part of the active architecture.

## Directory Roles

### `app/`

This is the application layer for Next.js.

- `app/page.tsx`: home route entry
- `app/books/[id]/`: book workspace route
- `app/settings/ai/`: AI settings route
- `app/api/`: HTTP route handlers
- `app/components/`: page and route-facing UI composition
- `app/hooks/`, `app/api-client/`, `app/utils/`, `app/constants/`, `app/types/`: frontend support modules used by active routes

Rule:

- `app/` owns frontend behavior and route composition.
- It may call `server/*`, but it should not own persistence logic.

### `server/`

Server-side business and persistence:

- `server/services/`: service layer
- `server/storage/`: database and file access
- `server/ai/`: AI config and provider calls
- `server/utils/`: backend helpers

Rule:

- Data access and model/provider integration stay here.

### `shared/`

Shared contracts and small reusable cross-cutting helpers.

Rule:

- Keep this small.
- Use it for contracts, not for page ownership.

### `data/`

Local runtime data and SQLite artifacts.

## Practical Rule

- If code is used by a route or UI flow, place it under `app/`.
- If code talks to storage, models, or providers, place it under `server/`.
- If code is only a cross-layer contract, place it under `shared/`.

## Current Cleanup Direction

The repository had overlapping structures (`app/`, `features/`, older shared layouts). The active goal is to keep only the `app + server + shared` model and remove dead duplicates as they are confirmed unused.
