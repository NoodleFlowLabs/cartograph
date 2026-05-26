# Dead code detection

Used by the Dead Code analysis task. Detects five kinds of dead items by walking the import graph and matching against entry-point rules.

## Build the import map

For every non-generated file in the discover bundle, record which files import it. Resolve relative imports and `@/` path aliases.

## Always-live entry points

These never count as dead, even with zero importers:

- `app/**/page.{ts,tsx,js,jsx}`
- `app/**/layout.{ts,tsx,js,jsx}`
- `app/api/**/*.{ts,js}`
- Files containing a `"use server"` directive
- Config roots: `*.config.*`, `next.config.*`, `tailwind.config.*`, `postcss.config.*`, `tsconfig.*`, `package.json`, `.env*`, `middleware.ts`
- Root app entry files: `app/globals.css`, `app/manifest.ts`

## Finding kinds

### `dead-file`

A non-entry-point, non-generated file with zero importers. Affects the score.

### `test-only-file`

A non-entry-point, non-test file whose importers are all test files. **Informational** — doesn't affect the score, but worth surfacing because it usually means the underlying code is unreachable in production.

### `orphaned-surface`

A surface with no inbound navigation references. Search the codebase for:

- `<Link href="...">` and `<Link to="...">`
- `router.push(...)`, `router.replace(...)`
- `redirect(...)` calls in server code
- Navigation config arrays (`nav.ts`, `navigation.tsx`, sidebar configs)

Exempt: the root route (`/`), auth callback routes (`/api/auth/callback/*`), webhook-only or API-only routes (those aren't supposed to have navigation).

### `orphaned-feature`

A feature with either:

- `surfaceIds` is empty, or
- every referenced surface is itself orphaned.

When all of a feature's implementation files are also dead, include that as secondary evidence in the finding.

### `dead-entity`

A `db-model` or `dto` entity with no operation reference, no feature reference, and no Prisma query reference anywhere in the codebase. **Exempt enums** — enums can be deliberately defined for future use or for external consumers.

## Scoring

```
totalEvaluated = filesEvaluated + surfacesEvaluated + featuresEvaluated + entitiesEvaluated
deadItems = deadFiles + orphanedSurfaces + orphanedFeatures + deadEntities
score = ((totalEvaluated - deadItems) / totalEvaluated) * 100
```

Exclude `test-only-file` findings from both the numerator and the denominator.

## Finding shape

Each finding (including `test-only-file`) includes:

- `id`, `kind`, `severity`, `target`, `reason`, `evidence`, `recommendation`

The full shape per kind lives in `references/json-schema.md`.
