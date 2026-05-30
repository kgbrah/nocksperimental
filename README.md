# nocksperimental

Nocksperimental is a Nockchain product lab. The first product slice is a NockApp launchpad and registry: a place to discover app templates, publish experiments, and turn useful Nockchain infrastructure into revenue paid in NOCK.

## Product Direction

The least capital-intensive wedge is developer and app distribution tooling:

- Registry for NockApp templates, experiments, infrastructure, and app listings.
- Launchpad metadata for install commands, maturity, revenue model, and integration targets.
- API surface for explorers, wallets, CLIs, and future NockApp runtimes to discover projects.
- Later: paid verified listings, deploy automation, API keys, audits, and NOCK-denominated publishing.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Scripts

- `npm run dev` starts the Next.js app.
- `npm run build` checks a production build.
- `npm run lint` runs ESLint.

## Initial MVP

- Product dashboard for the top Nockchain product opportunities.
- Filterable NockApp template registry.
- Registry API at `/api/registry`.
- Structured data in `src/lib/registry.ts`.
