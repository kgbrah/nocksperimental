# Agent Instructions

## Launch Evidence Direction

Before changing Launch Evidence, workspaces, receipts, trust badges, registry
signals, fakenet evidence, VESL evidence, or revenue-related surfaces, read:

- `docs/superpowers/specs/2026-06-05-launch-evidence-design.md`
- `docs/superpowers/specs/2026-06-05-vesl-evidence-bridge-design.md`
- `docs/strategy.md`

The product direction is Launch Evidence first: serve NockApp builders and
auditors with private evidence workspaces, signed receipts, launch-readiness
reports, and optional public badges. Operator and integrator lanes should reuse
the same evidence primitives instead of becoming separate products.

## Coordination Gate

This repo may be worked on by multiple agents. Before editing files, check:

- `git fetch --all --prune`
- `git status --short --branch`
- `git branch --all --verbose --no-abbrev`
- `gh pr list -R kgbrah/nocksperimental --state all --limit 30`
- `gh issue list -R kgbrah/nocksperimental --state all --limit 30`

If another branch, PR, issue, or dirty file is already covering the same scope,
coordinate with that work instead of redoing it.

## CodeGraph

Use CodeGraph on this repo and any relevant local Nockchain-adjacent repo before
structural work.

- Use `codegraph_status` first to confirm the index is ready.
- Use `codegraph_context` for architecture, feature, and bug-context questions.
- Use `codegraph_files` for structure and file discovery.
- Use `codegraph_search`, `codegraph_callers`, `codegraph_callees`, and
  `codegraph_impact` for symbol-level work.

Use native text search only for literal strings, docs, generated artifacts, or
when CodeGraph does not cover the file type needed.
