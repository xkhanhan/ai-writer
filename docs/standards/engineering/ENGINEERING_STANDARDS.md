# Engineering Standards

## Core Rules

This repository follows a single active structure:

- `app/` for frontend application code and route composition
- `server/` for backend logic and persistence
- `shared/` for cross-layer contracts

Do not introduce a second parallel structure.

## Placement Rules

### Put code in `app/` when it is:

- a page
- a page component
- a frontend hook
- a frontend API wrapper
- a route-facing UI utility

### Put code in `server/` when it is:

- database access
- file access
- service logic
- AI provider integration
- backend-only utilities

### Put code in `shared/` when it is:

- a request/response contract
- a type shared by both app and server

## Dependency Rules

Allowed:

```text
app -> server
app -> shared
server -> shared
```

Disallowed:

```text
server -> app
shared -> app
shared -> server implementation details
```

## Naming Rules

- Component files: `kebab-case.tsx`
- Utility files: `kebab-case.ts`
- Route handlers: `route.ts`
- Page entry files: `page.tsx`
- Types: `PascalCase`
- Functions and variables: `camelCase`

## Cleanup Rules

- Remove dead duplicate implementations instead of keeping “backup” folders.
- Do not keep both an old `features/` version and a live `app/` version of the same module.
- If a directory is no longer part of the active structure, migrate what is needed and delete the rest.
