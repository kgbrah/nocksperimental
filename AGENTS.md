# PROJECT KNOWLEDGE BASE

**Generated:** 2026-06-05T18:59:56-04:00
**Commit:** ec45a61
**Branch:** main

## OVERVIEW

Nocksperimental is a Next.js App Router product lab for NockApp launch evidence:
fixtures, invariant checks, fakenet diagnostics, receipts, trust surfaces,
Nockchain atlases, x402 metering, and Cloudflare Worker deployment.

## STRUCTURE

```
nocksperimental/
|-- src/app/       # Next pages and API route handlers
|-- src/lib/       # evidence, receipt, trust, registry, x402, Nockchain logic
|-- scripts/       # nocklab CLI, custom Node test shards, deploy smoke checks
|-- docs/          # strategy, deployment, research, specs, work plans
|-- fixtures/      # lab fixture inputs
|-- schemas/       # JSON contracts for fixtures, reports, trust/workspaces
|-- packs/         # reusable invariant packs
`-- src/data/      # static public registry/history/trust/workspace data
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Public/API route behavior | `src/app` | Route handlers should stay thin and delegate to `src/lib`. |
| Evidence and receipts | `src/lib/*evidence*`, `src/lib/*receipt*` | KV in production, memory fallback in local tests. |
| Nockchain context | `src/lib/nockchain-*`, `docs/research`, `docs/nockchain-watch.md` | Watch board is monitoring, not protocol authority. |
| Lab runner | `scripts/run-lab.mjs`, `fixtures`, `packs`, `schemas` | Writes ignored `.nocklab/` artifacts. |
| Product direction | `docs/strategy.md`, `docs/superpowers/specs` | Launch Evidence is the first product lane. |
| Cloudflare deploy | `wrangler.jsonc`, `open-next.config.ts`, `docs/deployment.md` | OpenNext Workers target. |

## LAUNCH EVIDENCE DIRECTION

Before changing Launch Evidence, workspaces, receipts, trust badges, registry
signals, fakenet evidence, VESL evidence, or revenue-related surfaces, read:

- `docs/superpowers/specs/2026-06-05-launch-evidence-design.md`
- `docs/superpowers/specs/2026-06-05-vesl-evidence-bridge-design.md`
- `docs/strategy.md`

The product direction is Launch Evidence first: private evidence workspaces,
signed receipts, launch-readiness reports, optional public badges. Operator and
integrator lanes reuse the same evidence primitives instead of becoming separate
products.

## COORDINATION GATE

This repo may be worked on by multiple agents. Before editing files, check:

- `git fetch --all --prune`
- `git status --short --branch`
- `git branch --all --verbose --no-abbrev`
- `gh pr list -R kgbrah/nocksperimental --state all --limit 30`
- `gh issue list -R kgbrah/nocksperimental --state all --limit 30`

If another branch, PR, issue, or dirty file is already covering the same scope,
coordinate with that work instead of redoing it.

## CODEGRAPH

Use CodeGraph on this repo and any relevant local Nockchain-adjacent repo before
structural work.

- Use `codegraph_status` first to confirm the index is ready.
- Use `codegraph_context` for architecture, feature, and bug-context questions.
- Use `codegraph_files` for structure and file discovery.
- Use `codegraph_search`, `codegraph_callers`, `codegraph_callees`, and
  `codegraph_impact` for symbol-level work.

Use native text search only for literal strings, docs, generated artifacts, or
when CodeGraph does not cover the file type needed. If CodeGraph is unavailable,
state that in the handoff and keep discovery evidence concrete.

## COMMANDS

```bash
npm install
npm run dev
npm run lint
npm test
npm run lab:ci
npm run verify:6-18
npm run smoke:cloudflare
```

Key focused suites: `npm run test:x402`, `npm run test:bazaar`,
`npm run test:nockchain-watch`. CI currently runs `npm run lab:ci` only.

## CONVENTIONS

- npm is the package manager; keep `package-lock.json` authoritative.
- Tests are custom `node scripts/test-*.mjs` scripts, not Jest/Vitest.
- API route tests commonly import `GET`/`POST` handlers directly and stub
  `next/server` or Cloudflare context.
- Keep generated `.nocklab/` output out of Git.
- When invariant behavior changes, update schema, runner evaluator, API catalog,
  docs, and tests together.

## ANTI-PATTERNS

- Do not store or echo private keys, seed phrases, wallet exports, raw payment
  material, API keys, unredacted env dumps, raw PMA slabs, checkpoints, state
  jams, or event logs.
- Do not present mock lab or stub x402 behavior as live-chain truth.
- Do not use old READMEs, old Zorp repos, or remembered CLI behavior as
  Nockchain protocol authority without current Tier 0/Tier 1 support.
- Do not let x402 facilitator failures silently fall back to stub mode.
- Do not turn the Nockchain watch board into protocol authority; it is a weekly
  monitoring surface that complements docs/upstream/operations atlases.
