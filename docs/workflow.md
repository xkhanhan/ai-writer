# Git Workflow

## Branch Strategy

| Type | Pattern | Purpose |
|------|---------|---------|
| Main | `master` | Production — PR merge only |
| Feature | `feature/*` | New feature development |
| Fix | `fix/*` | Bug fixes |
| Docs | `docs/*` | Documentation only |

Naming: kebab-case lowercase, e.g. `feature/creation-zone`.

## Workflow

1. Branch from latest master: `git checkout -b feature/xxx master`
2. Commit per task (typecheck → lint → add → commit)
3. Push: `git push -u origin feature/xxx`
4. Create PR (title: module + summary)
5. Review → Squash and merge
6. Delete branch immediately after merge (local + remote)

## Commit Format

`type(scope): summary`

| Type | Use |
|------|-----|
| feat | New feature |
| fix | Bug fix |
| docs | Documentation |
| chore | Build/tool/dependency |
| refactor | Code restructuring |
| style | Style adjustments |

Rules:
- One commit = one logical change
- Must pass typecheck + lint before commit
- **Forbidden**: Committing `.env`, `node_modules`, `.next`, `data/` runtime files

## PR Requirements

Title: `feat(scope): brief description`

Description must include:
- Change summary
- Affected file paths
- UI screenshots (if applicable)
- Verification command results

## Prohibitions

- **No** direct push to master
- **No** file edits on master
- **No** skipping PR review
- **No** merging unverified code
