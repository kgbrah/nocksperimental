# LIBRARY KNOWLEDGE

## OVERVIEW

`src/lib` is the domain core: lab reports, evidence submissions, receipt stores,
Nockchain atlases, trust/registry data, workspaces, Bazaar, and x402 metering.

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Lab reports | `lab-report.ts`, `generated-*` | Report hashes and provenance are public contracts. |
| Fakenet | `local-fakenet-*`, `fakenet-*` | Local adapter and persisted evidence receipts. |
| Nockchain | `nockchain-*`, `zorp-upstream.ts` | Docs/upstream/watch/operations/wallet/state-jam views. |
| VESL/Nockup | `vesl-*`, `nockup-*` | Evidence normalizers and receipt stores. |
| Trust | `trust-*`, `registry-*`, `verification-index.ts` | Badges, score history, updates, registry checkpoints. |
| Workspaces | `workspace-*` | Evidence, upload policy, upload token signing. |
| Bazaar | `bazaar/*` | Trust-filtered discovery; facilitator discovery is graceful. |
| x402 | `x402/*` | See nested `src/lib/x402/AGENTS.md`. |

## CONVENTIONS

- Keep validation/result builders deterministic and side-effect-light; route
  handlers own HTTP details.
- Static JSON data in `src/data` is read through typed helper functions here.
- KV-backed stores use Cloudflare binding in production and in-memory fallback
  for local tests unless docs explicitly say fail closed.
- Receipt/provenance objects should include enough source context to explain
  which Nockchain docs/build/fixture/fakenet context produced the result.
- When adding a public verifier, wire its API route, verification index, OpenAPI,
  registry/well-known discovery, docs, and focused script test together.

## ANTI-PATTERNS

- Do not store or echo secrets, seed material, private keys, wallet exports,
  raw payment payload secrets, raw PMA slabs, checkpoints, state jams, or raw
  event logs.
- Do not flatten upstream Nockchain ambiguity; carry doc consistency alerts and
  provenance into receipts where relevant.
- Do not treat mock fixture execution or stub x402 verification as live-chain
  proof.
- Do not hide production persistence requirements behind memory fallback.
