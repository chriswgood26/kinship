<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Key docs for this project

This is a multi-tenant SaaS EHR with subscription tiers, org-scoped data, and a landing/pricing page. Before writing code, consult:

- **Route handlers:** `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/`
- **Middleware (proxy.ts):** `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/`
- **Authentication patterns:** `node_modules/next/dist/docs/01-app/02-guides/authentication.md`
- **Multi-tenant patterns:** `node_modules/next/dist/docs/01-app/02-guides/multi-tenant.md`
- **Forms & mutations:** `node_modules/next/dist/docs/01-app/02-guides/forms.md`
- **Server vs client components:** `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`

## Sibling project

DrCloud Neo (`~/projects/drcloud-neo`) is the original codebase this was built from. Patterns and fixes here may apply there too.
