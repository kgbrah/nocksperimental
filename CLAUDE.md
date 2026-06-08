# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

The canonical agent guidance for this repo is **`AGENTS.md`** (imported below) — it
is the single source of truth, so edit it rather than duplicating rules here.
Before structural work, honor its Coordination Gate (`git fetch`, check branches/PRs/
issues on `kgbrah/nocksperimental`) and prefer CodeGraph over text search.

Commands are not restated here to avoid drift — read them from the authoritative
sources: `package.json` scripts and `README.md`. The essentials:

- `npm run dev` — Next.js dev server (Turbopack)
- `npm run lint` — ESLint
- `npm run build` — production build (deployed to Cloudflare via OpenNext; see
  `open-next.config.ts` / `wrangler.jsonc`)
- `npm test` — full suite (a large fan-out of `node scripts/test-*.mjs` checks)
- Run a single test: `npm run test:<name>` or `node scripts/test-<name>.mjs`
  (the `scripts/` dir is the test catalog; each `test-*.mjs` is one check)

@AGENTS.md
