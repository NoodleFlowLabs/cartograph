# Tech stack detection signals

Used by the Discover step. For each technology found, record:

- **Name and version** — from `package.json` dependency entries when available.
- **Category** — from the list in `references/json-schema.md` (language, framework, styling, database, auth, api, testing, deployment, ai, payments, monitoring, other).
- **Source** — where you found it (e.g., `"package.json"`, `"tailwind.config.ts"`).
- **Confidence** — high (explicit dependency + matching config file), medium (dependency only), low (inferred from import or file patterns).

## Primary signal: package.json

Always extract from `dependencies` and `devDependencies` first — this gives you the version. Most other signals upgrade the confidence on something already seen here, rather than discovering net-new entries.

## Config files (high confidence when paired with a dependency)

| File | Technology |
|---|---|
| `tsconfig.json` | TypeScript |
| `tailwind.config.*` | Tailwind CSS |
| `prisma/schema.prisma` | Prisma |
| `next.config.*` | Next.js |
| `drizzle.config.*` | Drizzle ORM |
| `.env*` | Service integrations (inspect keys) |
| `jest.config.*` / `vitest.config.*` | Jest / Vitest |
| `playwright.config.*` | Playwright |
| `Dockerfile` / `docker-compose.*` | Docker |
| `vercel.json` / `vercel.ts` | Vercel |
| `sentry.*.config.*` | Sentry |

## File patterns (low-to-medium confidence on their own)

| Pattern | Technology |
|---|---|
| `*.module.css` | CSS Modules |
| `*.scss` / `*.sass` | Sass |
| `*.graphql` / `*.gql` | GraphQL |

## Import patterns (medium confidence — confirms a dependency is actually used)

Common import prefixes that map to platforms:

| Import prefix | Technology |
|---|---|
| `@clerk/*` | Clerk |
| `@auth/*`, `next-auth` | Auth.js / NextAuth |
| `@stripe/*`, `stripe` | Stripe |
| `openai` | OpenAI |
| `@anthropic-ai/*` | Anthropic |
| `@supabase/*` | Supabase |
| `@vercel/*` | Vercel platform services |

## Confidence guidance

- **High** — dependency in `package.json` AND matching config file or import usage.
- **Medium** — dependency in `package.json` only; or import usage without a dependency (unusual, often worth investigating).
- **Low** — inferred purely from file patterns or directory structure with no dependency or import.

Prefer fewer high-confidence entries over many low-confidence guesses.
